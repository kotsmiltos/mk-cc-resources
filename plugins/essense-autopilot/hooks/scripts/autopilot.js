"use strict";

/**
 * essense-autopilot — Stop hook driving the essense-flow pipeline forward.
 *
 * Mechanism: when Claude finishes a turn, this hook reads the project's
 * .pipeline/state.yaml + .pipeline/config.yaml. If the pipeline is in a
 * non-terminal, non-blocked, non-human-gate phase AND has an auto-advance
 * command, the hook returns {decision: "block", reason: "...invoke /cmd..."}
 * which Claude Code interprets as "do not stop; act on this reason".
 *
 * Halts on any of:
 *   - autopilot disabled (default)
 *   - .pipeline/ missing
 *   - state.blocked_on set (a real blocker — needs human)
 *   - phase in human_gates (e.g. eliciting needs dialogue, verifying is gated)
 *   - phase in terminal (complete)
 *   - no flow entry for current phase
 *   - iteration cap exceeded (loop safety)
 *   - context usage above threshold (preserve context for human work)
 *
 * Fail-open: any error path falls through to "allow stop" — never blocks
 * stoppage on its own bug.
 */

const fs = require("fs");
const path = require("path");

let yaml;
try {
  yaml = require("js-yaml");
} catch (_e) {
  // No js-yaml available — autopilot can't read config; allow stop.
  process.exit(0);
}

// ---------- Defaults ----------

const DEFAULT_CONFIG = {
  enabled: false,
  human_gates: ["idle", "eliciting", "verifying"],
  terminal: ["complete"],
  max_iterations: 30,
  context_threshold_pct: 60,
  // Phase → command map. Mirrors essense-flow AUTO_ADVANCE_MAP but lives in
  // project config so any pipeline can override per project.
  flow: {
    research: "/triage",
    "requirements-ready": "/architect",
    architecture: "/build",
    sprinting: "/build",
    "sprint-complete": "/review",
    reviewing: "/triage",
  },
};

// Token estimate constants — used for context threshold check.
// 200K is the practical default Claude Code context budget; 4 chars/token is
// a conservative average across mixed code + prose. These are rough but
// directionally correct for "are we approaching the ceiling".
const TOKEN_BUDGET = 200_000;
const CHARS_PER_TOKEN = 4;

// ---------- Helpers ----------

function findPipelineDir(startCwd) {
  let dir = path.resolve(startCwd);
  // Walk up looking for .pipeline/
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, ".pipeline");
    try {
      const st = fs.statSync(candidate);
      if (st.isDirectory()) return candidate;
    } catch (_e) { /* continue walking up */ }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function readYamlSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return yaml.load(fs.readFileSync(filePath, "utf8")) || null;
  } catch (_e) {
    return null;
  }
}

function writeYamlSafe(filePath, obj) {
  try {
    fs.writeFileSync(filePath, yaml.dump(obj));
    return true;
  } catch (_e) {
    return false;
  }
}

function readPayload() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      if (!data.trim()) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (_e) { resolve({}); }
    });
    if (process.stdin.isTTY) resolve({});
  });
}

function estimateContextPct(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const stat = fs.statSync(transcriptPath);
    const tokens = stat.size / CHARS_PER_TOKEN;
    return (tokens / TOKEN_BUDGET) * 100;
  } catch (_e) {
    return null;
  }
}

function allowStop() {
  // Default action — exit cleanly, Claude proceeds with stop.
  process.exit(0);
}

function blockStop(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

// ---------- Main ----------

async function main() {
  const payload = await readPayload();
  const cwd = process.cwd();

  const pipelineDir = findPipelineDir(cwd);
  if (!pipelineDir) return allowStop();

  // Merge project config over defaults
  const projectConfig = readYamlSafe(path.join(pipelineDir, "config.yaml")) || {};
  const userAutopilot = projectConfig.autopilot || {};
  const cfg = {
    ...DEFAULT_CONFIG,
    ...userAutopilot,
    flow: { ...DEFAULT_CONFIG.flow, ...(userAutopilot.flow || {}) },
    human_gates: userAutopilot.human_gates || DEFAULT_CONFIG.human_gates,
    terminal: userAutopilot.terminal || DEFAULT_CONFIG.terminal,
  };

  if (!cfg.enabled) return allowStop();

  const statePath = path.join(pipelineDir, "state.yaml");
  const state = readYamlSafe(statePath);
  if (!state || !state.pipeline) return allowStop();

  const phase = state.pipeline.phase;
  const blocker = state.blocked_on;

  if (blocker) return allowStop();
  if (cfg.terminal.includes(phase)) return allowStop();
  if (cfg.human_gates.includes(phase)) return allowStop();

  const advanceCmd = cfg.flow[phase];
  if (!advanceCmd) return allowStop();

  // Iteration counter — reset when phase changes
  state.session = state.session || {};
  const lastPhase = state.session.autopilot_last_phase;
  let iters = state.session.autopilot_iterations || 0;
  if (lastPhase !== phase) {
    iters = 0;
  }
  iters += 1;

  if (iters > cfg.max_iterations) {
    process.stderr.write(
      `[essense-autopilot] iteration cap (${cfg.max_iterations}) reached at phase '${phase}'. Halting — investigate stuck pipeline.\n`
    );
    return allowStop();
  }

  // Context threshold check
  const ctxPct = estimateContextPct(payload.transcript_path);
  if (ctxPct !== null && ctxPct > cfg.context_threshold_pct) {
    process.stderr.write(
      `[essense-autopilot] context ~${ctxPct.toFixed(0)}% > ${cfg.context_threshold_pct}% threshold. Halting to preserve context for human work.\n`
    );
    return allowStop();
  }

  // Persist iteration counter (best-effort; failure non-fatal)
  state.session.autopilot_iterations = iters;
  state.session.autopilot_last_phase = phase;
  state.session.autopilot_last_advance_at = new Date().toISOString();
  writeYamlSafe(statePath, state);

  const ctxNote = ctxPct !== null ? `ctx ~${ctxPct.toFixed(0)}%` : "ctx unknown";
  const reason =
    `[essense-autopilot] Pipeline phase '${phase}'. Auto-advance: invoke ${advanceCmd} now. ` +
    `(iteration ${iters}/${cfg.max_iterations}, ${ctxNote})`;

  return blockStop(reason);
}

main().catch((err) => {
  process.stderr.write(`[essense-autopilot] error: ${err.message} — allowing stop\n`);
  process.exit(0);
});
