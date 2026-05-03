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
import { dirname } from "node:path";
import { writeState, readState, assertLegalTransition } from "./state.js";

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

  if (fromPhase !== null && fromPhase !== undefined) {
    const legal = await assertLegalTransition(fromPhase, nextState.phase);
    if (!legal.ok) {
      return { ok: false, reason: legal.reason, partial: false };
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
