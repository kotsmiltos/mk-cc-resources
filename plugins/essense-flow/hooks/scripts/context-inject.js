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

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "../..");
const STATE_LIB_URL = pathToFileURL(join(PLUGIN_ROOT, "lib/state.js")).href;

main().catch((err) => {
  // Top-level catch — last line of defense. Per Fail-Soft, exit 0 always.
  process.stderr.write(`[essense-flow context-inject] unexpected error: ${err && err.message}\n`);
  process.exit(0);
});

async function main() {
  const projectRoot = process.cwd();

  let state, libErr;
  try {
    const { readState } = await import(STATE_LIB_URL);
    state = await readState(projectRoot);
  } catch (err) {
    libErr = err;
  }

  // If the lib itself crashed (e.g. js-yaml missing), emit a warning and
  // bail with exit 0 — never block.
  if (libErr) {
    process.stderr.write(
      `[essense-flow context-inject] lib unavailable: ${libErr.message} — continuing\n`,
    );
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
    lines.push(`status: DEGRADED (${state.degraded})`);
    if (state.reason) lines.push(`reason: ${state.reason}`);
    if (state.path) lines.push(`state_file: ${state.path}`);
    lines.push(`recommendation: run /heal to reconcile prior state, or /init for a fresh start`);
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
