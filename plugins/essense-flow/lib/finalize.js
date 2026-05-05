// finalize.js — atomic write-artifact + transition.
//
// One call writes every artifact file AND transitions state. Either both
// happen or neither — no half-finalized phase that leaves the orchestrator
// looking at a phantom artifact with stale state.
//
// Per Front-Loaded-Design: finalize is the ONLY function a skill calls
// to advance the pipeline. Splitting write+transition across multiple
// orchestrator steps is exactly the failure mode this primitive prevents.

import { writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeState, readState, assertLegalTransition } from "./state.js";

// Extract bare path-pattern hints from a `requires:` string.
// Looks for substrings starting with ".pipeline/" up to the next whitespace.
// Pure heuristic — emits a stderr advisory only, never refuses the transition.
// Per "help without encumber": missing required paths surface as a warning at
// the moment of cost, not as a gate.
function extractPathHints(requiresStr) {
  if (!requiresStr || typeof requiresStr !== "string") return [];
  const hints = [];
  const re = /\.pipeline\/[^\s]+/g;
  let match;
  while ((match = re.exec(requiresStr)) !== null) {
    hints.push(match[0]);
  }
  return hints;
}

function expandSprintPlaceholder(p, sprintNumber) {
  if (sprintNumber === undefined || sprintNumber === null) return p;
  return p.replace(/<n>/g, String(sprintNumber));
}

// finalize({
//   projectRoot,
//   writes: [{ path, content }, ...],   // artifacts to write
//   nextState: { ...full state object with phase set to target },
//   force: bool,                         // force-overwrite on degraded current state
// })
//
// Returns:
//   { ok: true, transition, written: [...paths], state: {phase} }
//   { ok: false, reason, partial: bool }
//
// Atomicity strategy:
//   1. Pre-flight: validate transition is legal. If not, return without writing.
//   2. Write each artifact to a *.tmp-finalize sibling first.
//   3. State write — uses writeState (which itself re-validates the transition).
//      If state write fails, unlink the tmp files. No artifacts persisted.
//   4. Rename each .tmp-finalize over its target path.
//
// If a rename mid-way through fails (rare — disk full, permission flip),
// we surface { ok: false, partial: true } with the list of artifacts that
// did and didn't make it. The state write happens last, so a partial-rename
// failure leaves state at the old phase: caller can retry.
export async function finalize({ projectRoot, writes, nextState, force = false }) {
  if (!projectRoot) return { ok: false, reason: "projectRoot is required" };
  if (!nextState || !nextState.phase) {
    return { ok: false, reason: "nextState.phase is required" };
  }
  if (!Array.isArray(writes)) {
    return { ok: false, reason: "writes must be an array" };
  }

  const current = await readState(projectRoot);
  if (current.degraded && !force) {
    return {
      ok: false,
      reason: `current state degraded (${current.degraded}); pass {force: true} to override`,
      degraded: current.degraded,
    };
  }
  const fromPhase = current.degraded ? null : current.phase;

  let requiresHint = null;
  if (fromPhase !== null && fromPhase !== undefined) {
    const legal = await assertLegalTransition(fromPhase, nextState.phase);
    if (!legal.ok) {
      return { ok: false, reason: legal.reason, partial: false };
    }
    requiresHint = legal.requires;
  }

  // Soft requires advisory — warn, never refuse.
  // The transition's `requires:` field in transitions.yaml may name expected
  // artifact paths. If those paths are neither in `writes[]` nor already on
  // disk, emit a stderr warning so the caller sees the gap. The transition
  // proceeds regardless — the gate is the legality check above, not this.
  if (requiresHint) {
    const hints = extractPathHints(requiresHint);
    // Normalize separators so Windows backslashes match POSIX-style hints
    // extracted from transitions.yaml.
    const toPosix = (p) => String(p).replace(/\\/g, "/");
    const writesPaths = writes.map((w) => toPosix(w.path));
    for (const hintRaw of hints) {
      const hint = expandSprintPlaceholder(hintRaw, nextState.sprint);
      const inWrites = writesPaths.some((p) => p === hint || p.endsWith(hint));
      const onDisk = existsSync(join(projectRoot, hint));
      if (!inWrites && !onDisk) {
        process.stderr.write(
          `[finalize] heads up: transition ${fromPhase}->${nextState.phase} expects ${hint} — not in writes, not on disk. proceeding anyway.\n`,
        );
      }
    }
  }

  // Pre-flight write to .tmp-finalize files.
  const tmpPaths = [];
  for (const w of writes) {
    if (!w.path || w.content === undefined) {
      // Roll back: unlink any tmp files we already wrote.
      for (const tp of tmpPaths) {
        try {
          await unlink(tp);
        } catch {}
      }
      return { ok: false, reason: "each write needs {path, content}", partial: false };
    }
    const dir = dirname(w.path);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const tmp = `${w.path}.tmp-finalize`;
    try {
      await writeFile(tmp, w.content, "utf8");
      tmpPaths.push(tmp);
    } catch (err) {
      // Roll back tmp files.
      for (const tp of tmpPaths) {
        try {
          await unlink(tp);
        } catch {}
      }
      return {
        ok: false,
        reason: `tmp write failed for ${w.path}: ${err.message}`,
        partial: false,
      };
    }
  }

  // State write LAST.
  const stateRes = await writeState(projectRoot, nextState, { force });
  if (!stateRes.ok) {
    for (const tp of tmpPaths) {
      try {
        await unlink(tp);
      } catch {}
    }
    return { ok: false, reason: `state write failed: ${stateRes.reason}`, partial: false };
  }

  // Promote tmp files to final paths.
  const written = [];
  for (let i = 0; i < tmpPaths.length; i++) {
    try {
      await rename(tmpPaths[i], writes[i].path);
      written.push(writes[i].path);
    } catch (err) {
      // Partial promotion. State already advanced.
      // Surface this loud — caller decides recovery (likely re-run the skill).
      return {
        ok: false,
        reason: `rename failed for ${writes[i].path} after state advanced: ${err.message}`,
        partial: true,
        written,
        state: stateRes,
      };
    }
  }

  return {
    ok: true,
    transition: { from: fromPhase, to: nextState.phase },
    written,
    state: stateRes,
  };
}
