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
  // Phase → command map. Reflects essense-flow state-machine semantics
  // (references/transitions.yaml). Project config can override per project.
  //
  // Phases ending in `-ing` mean "skill mid-flight" — map to the same skill
  // to resume. Phases without that suffix are milestone-reached states that
  // advance to the next skill. Active phases that require dialogue
  // (eliciting, verifying) live in human_gates instead.
  flow: {
    research: "/triage",
    triaging: "/triage",
    "requirements-ready": "/architect",
    architecture: "/architect",
    decomposing: "/architect",
    sprinting: "/build",
    "sprint-complete": "/review",
    // reviewing → /triage is the post-review hand-off. Phase=reviewing
    // typically persists when /review wrote QA-REPORT.md but the orchestrator
    // stopped before firing the reviewing → triaging transition. Mapping to
    // /review would loop (QA-REPORT already exists). Mapping to /triage
    // advances correctly. The "no QA-REPORT yet" mid-flight case is handled
    // by the readiness gate below — phase=reviewing without QA-REPORT halts
    // with diagnostic instead of looping.
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

function allowStop(reason) {
  // Default action — exit cleanly, Claude proceeds with stop. When `reason`
  // is provided, log it to stderr so the user can diagnose silent halts.
  if (reason) {
    process.stderr.write(`[essense-autopilot] halt: ${reason}\n`);
  }
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
  if (!pipelineDir) {
    return allowStop(`no .pipeline/ directory found from cwd ${cwd}`);
  }

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

  if (!cfg.enabled) {
    return allowStop(`autopilot disabled (set autopilot.enabled: true in ${path.join(pipelineDir, "config.yaml")})`);
  }

  const statePath = path.join(pipelineDir, "state.yaml");
  const state = readYamlSafe(statePath);
  if (!state || !state.pipeline) {
    return allowStop(`state.yaml missing or has no pipeline block at ${statePath}`);
  }

  const phase = state.pipeline.phase;
  const blocker = state.blocked_on;

  if (blocker) {
    return allowStop(`pipeline blocked: ${typeof blocker === "string" ? blocker : JSON.stringify(blocker)}`);
  }
  if (cfg.terminal.includes(phase)) {
    return allowStop(`phase '${phase}' is terminal (${cfg.terminal.join(", ")}) — pipeline complete`);
  }
  if (cfg.human_gates.includes(phase)) {
    return allowStop(`phase '${phase}' is a human gate (${cfg.human_gates.join(", ")}) — needs dialogue`);
  }

  const advanceCmd = cfg.flow[phase];
  if (!advanceCmd) {
    const mapped = Object.keys(cfg.flow).join(", ");
    return allowStop(`phase '${phase}' has no flow mapping (mapped phases: ${mapped})`);
  }

  // Readiness gate for build-fires: phase=sprinting expects current sprint
  // to have task specs decomposed. If the sprint entry has empty tasks,
  // running /build will fail — halt and route the user to /architect.
  if (advanceCmd === "/build") {
    const sprintNum = state.pipeline.sprint;
    if (sprintNum != null) {
      const sprintKey = `sprint-${sprintNum}`;
      const sprintEntry = state.sprints && state.sprints[sprintKey];
      const tasks = (sprintEntry && sprintEntry.tasks) || [];
      const tasksTotal = (sprintEntry && sprintEntry.tasks_total) || tasks.length || 0;
      if (tasksTotal === 0) {
        return allowStop(
          `phase '${phase}' but ${sprintKey} has no tasks decomposed — run /architect first`
        );
      }
    }
  }

  // Readiness gate for reviewing: phase=reviewing maps to /triage on the
  // assumption that /review already wrote QA-REPORT.md and the orchestrator
  // stopped before firing the reviewing → triaging transition. If the QA
  // report does NOT exist, /triage has nothing to consume — the genuine
  // state is "review mid-flight" and the right action is /review (resume).
  // Halt here with a diagnostic so the user knows to run /review, rather
  // than letting autopilot fire /triage against a missing artifact.
  if (phase === "reviewing" && advanceCmd === "/triage") {
    const sprintNum = state.pipeline.sprint;
    if (sprintNum != null) {
      const qaPath = path.join(
        pipelineDir,
        "reviews",
        `sprint-${sprintNum}`,
        "QA-REPORT.md"
      );
      if (!fs.existsSync(qaPath)) {
        return allowStop(
          `phase 'reviewing' but QA-REPORT.md missing at ${qaPath} — run /review first to produce it`
        );
      }
    }
  }

  // Iteration counter — reset when phase changes
  state.session = state.session || {};
  const lastPhase = state.session.autopilot_last_phase;
  let iters = state.session.autopilot_iterations || 0;
  if (lastPhase !== phase) {
    iters = 0;
  }
  iters += 1;

  if (iters > cfg.max_iterations) {
    return allowStop(
      `iteration cap (${cfg.max_iterations}) reached at phase '${phase}' — investigate stuck pipeline`
    );
  }

  // Context threshold check
  const ctxPct = estimateContextPct(payload.transcript_path);
  if (ctxPct !== null && ctxPct > cfg.context_threshold_pct) {
    return allowStop(
      `context ~${ctxPct.toFixed(0)}% > ${cfg.context_threshold_pct}% threshold — preserving context for human work`
    );
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
