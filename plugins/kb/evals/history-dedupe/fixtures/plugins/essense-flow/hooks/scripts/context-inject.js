#!/usr/bin/env node
// context-inject.js — fires on UserPromptSubmit + SessionStart.
//
// Reads .pipeline/state.yaml. Emits a short structured block to user
// channel (stdout JSON, claude-code merges into prompt context). On any
// degraded state, names the file + failure but ALWAYS continues with
// exit 0. On any unexpected error, logs to stderr and exits 0.
//
// Per Fail-Soft: this hook NEVER blocks tool calls. There is no decision
// path that exits non-zero. Every code path that could throw is wrapped
// in try/catch with stderr-warning + exit 0.
//
// INJECTION ECONOMICS (measured 2026-09-11, audit over 196 sessions): the DEGRADED banner
// fired 535 times — the same eight lines re-injected on every prompt of every sitting in a
// repo carrying one dead .pipeline/ — while the pipeline's own skills were invoked 0 times.
// A degraded state is a SESSION-LEVEL fact: the owner needs it once, at the top. So the
// degraded banner is emitted on SessionStart ONLY, enforced by WHICH EVENT FIRED
// (payload.hook_event_name) — not by a counter, which would need state and could drift.
// The healthy phase block still injects on both events: it is small, and it changes as the
// pipeline advances, which is exactly what a per-prompt reminder is for.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { resolveProjectRoot } from "../../lib/project-root.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "../..");
const STATE_LIB_URL = pathToFileURL(join(PLUGIN_ROOT, "lib/state.js")).href;

// The one event allowed to print a degraded banner (see INJECTION ECONOMICS above).
const SESSION_START_EVENT = "SessionStart";

/**
 * The platform's hook payload, or {} when there is none (hand-run, TTY, unparseable).
 * Never throws and never hangs: a TTY stdin resolves immediately, since a hook that waits
 * for input a terminal will not send would freeze the session it is supposed to inform.
 */
function readPayload() {
  return new Promise((resolve_) => {
    if (process.stdin.isTTY) return resolve_({});
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("error", () => resolve_({}));
    process.stdin.on("end", () => {
      if (!data.trim()) return resolve_({});
      try { resolve_(JSON.parse(data)); } catch (_e) { resolve_({}); }
    });
  });
}

main().catch((err) => {
  // Top-level catch — last line of defense. Per Fail-Soft, exit 0 always.
  process.stderr.write(`[essense-flow context-inject] unexpected error: ${err && err.message}\n`);
  process.exit(0);
});

async function main() {
  const payload = await readPayload();
  const event = String(payload.hook_event_name || "");
  // Nearest .git ancestor, not the shell's position: a subdirectory shell used to read (and
  // banner about) a DIFFERENT project's .pipeline/. payload.cwd is the platform's own answer
  // for where the session is; process.cwd() is the fallback for a hand-run.
  const projectRoot = resolveProjectRoot(payload.cwd || process.cwd());

  // FAST stand-down before any library loads: a repo with no .pipeline/ is not a pipeline
  // project, and this hook fires on EVERY prompt and session start in EVERY repo. Measured
  // 2026-09-06: ~150 ms per fire spent loading lib/state.js + js-yaml only to say nothing —
  // 32 injections + ~430 spawns in projects that never ran the pipeline. Same predicate
  // readState uses for `pipeline_present`, so behaviour is unchanged; only the cost moves.
  if (!existsSync(join(projectRoot, ".pipeline"))) process.exit(0);

  let state, libErr;
  try {
    const { readState } = await import(STATE_LIB_URL);
    state = await readState(projectRoot);
  } catch (err) {
    // readState still THROWS ShapeValidationError for yaml-parse failures and
    // empty/non-object roots (CLI consumers rely on the throw). For the
    // session surface that throw must become a VISIBLE degraded banner, not a
    // stderr-only note — a silently-inherited corrupt state.yaml is the
    // failure this hook exists to surface.
    if (err && err.name === "ShapeValidationError") {
      state = {
        phase: "idle",
        degraded: "corrupt",
        reason: err.message,
        path: (err.details && err.details.path) || undefined,
      };
    } else {
      libErr = err;
    }
  }

  // If the lib itself crashed (e.g. js-yaml missing), emit a warning and
  // bail with exit 0 — never block.
  if (libErr) {
    process.stderr.write(
      `[essense-flow context-inject] lib unavailable: ${libErr.message} — continuing\n`,
    );
    process.exit(0);
  }

  // Never-initialized repo (no .pipeline/ at all): this project isn't running
  // the pipeline — say NOTHING. Bannering every prompt in non-pipeline repos
  // is the injection-economics inversion this probe closes.
  if (state.degraded === "missing" && state.pipeline_present === false) {
    process.exit(0);
  }

  // A degraded state is a session-level fact — say it once, at the top of the sitting, on the
  // event that happens once. On any other event (UserPromptSubmit) the banner is dropped
  // ENTIRELY: repeating it does not add information, and an unknown event is treated as "not
  // SessionStart" so a fire that cannot prove it is the once-per-session one stays quiet.
  if (state.degraded && event !== SESSION_START_EVENT) {
    process.exit(0);
  }

  const block = renderContext(state, projectRoot);
  // claude-code reads stdout JSON for prompt-context augmentation.
  // Falls back gracefully on simple text — claude-code accepts both forms.
  process.stdout.write(block);
  process.exit(0);
}

function renderContext(state, projectRoot) {
  const lines = [];
  lines.push(`<essense-flow-context>`);
  if (state.degraded) {
    // Degraded marker family includes 'corrupt' (post-parse shape-validation
    // failure) alongside 'missing' (state.yaml absent).
    // readState returns the marker shape directly — no shape-error throw to
    // catch here — so this branch handles all degraded variants uniformly.
    lines.push(`status: DEGRADED (${state.degraded})`);
    if (state.reason) lines.push(`reason: ${state.reason}`);
    if (state.shape_error) {
      lines.push(`shape_error: ${state.shape_error.message || state.shape_error.name || 'shape validation failed'}`);
    }
    if (state.path) lines.push(`state_file: ${state.path}`);
    lines.push(`recommendation: run 'essense-flow-tools state-reconcile' (rebuilds the state cache from artifacts), /heal for guided recovery, or /init for a fresh start`);
    lines.push(`hook posture: advisory only — tool calls are NOT blocked`);
  } else {
    lines.push(`phase: ${state.phase}`);
    if (state.sprint != null) lines.push(`sprint: ${state.sprint}`);
    if (state.wave != null) lines.push(`wave: ${state.wave}`);
    if (state.last_updated) lines.push(`last_updated: ${state.last_updated}`);
    const pathsBlock = canonicalPathsFor(state.phase, projectRoot);
    if (pathsBlock) {
      lines.push(`canonical artifacts:`);
      for (const p of pathsBlock) {
        const present = existsSync(p) ? "exists" : "missing";
        lines.push(`  - ${p} (${present})`);
      }
    }
  }
  lines.push(`</essense-flow-context>`);
  return lines.join("\n") + "\n";
}

function canonicalPathsFor(phase, projectRoot) {
  const map = {
    eliciting: [".pipeline/elicitation/SPEC.md"],
    research: [".pipeline/elicitation/SPEC.md", ".pipeline/requirements/REQ.md"],
    triaging: [
      ".pipeline/elicitation/SPEC.md",
      ".pipeline/requirements/REQ.md",
      ".pipeline/triage/TRIAGE-REPORT.md",
    ],
    "requirements-ready": [".pipeline/requirements/REQ.md"],
    architecture: [".pipeline/architecture/ARCH.md"],
    decomposing: [".pipeline/architecture/ARCH.md"],
    sprinting: [".pipeline/architecture/ARCH.md"],
    "sprint-complete": [".pipeline/build"],
    reviewing: [".pipeline/review"],
    verifying: [".pipeline/verify/VERIFICATION-REPORT.md"],
    complete: [".pipeline/state.yaml"],
  };
  const paths = map[phase];
  if (!paths) return null;
  return paths.map((p) => join(projectRoot, p));
}
