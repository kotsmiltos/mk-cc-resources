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
 *   - no progress since last fire (same phase + sprint + wave) — stuck pipeline
 *   - background Agent in-flight — orchestrator awaiting completion
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

// In-flight Agent stale threshold — unpaired tool_use entries older than
// this are treated as crashed agents (autopilot proceeds, stderr warning).
// 60 min is generous: heavyweight architect typically completes in 5–10 min;
// build waves with many tasks can run longer.
const AGENT_STALE_MINUTES = 60;

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

// Scan transcript JSONL for unpaired Agent tool_use entries. An Agent call
// is "in flight" when its `tool_use.id` has no matching `tool_result.tool_use_id`.
// Stale entries (older than staleMinutes) are split out so they don't block
// the autopilot indefinitely after an agent crashed without producing a result.
//
// JSONL schema (verified empirically against an active 4751-line transcript on
// 2026-04-28): each line is a JSON object with optional top-level `timestamp`
// and a `message.content` array (or `content` directly). Items in content can
// have `type: "tool_use"` with `name` + `id`, or `type: "tool_result"` with
// `tool_use_id`. The schema is undocumented; if it changes, this function
// returns count=0 (no false halts), degrading gracefully to pre-v0.2.3 behavior.
function countInFlightAgents(transcriptPath, opts) {
  const staleMinutes = (opts && opts.staleMinutes) || AGENT_STALE_MINUTES;
  const empty = { count: 0, oldest_age_minutes: null, stale_count: 0 };
  if (!transcriptPath) return empty;
  let raw;
  try {
    if (!fs.existsSync(transcriptPath)) return empty;
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch (_e) {
    return empty;
  }
  const pending = new Map(); // tool_use.id -> dispatch timestamp (ms)
  const lines = raw.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch (_e) { continue; }
    const msg = obj.message || obj;
    const content = msg && msg.content;
    if (!Array.isArray(content)) continue;
    const ts = obj.timestamp || msg.timestamp;
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      if (c.type === "tool_use" && c.name === "Agent" && c.id) {
        const tsMs = ts ? Date.parse(ts) : Date.now();
        if (!isNaN(tsMs)) pending.set(c.id, tsMs);
      } else if (c.type === "tool_result" && c.tool_use_id) {
        pending.delete(c.tool_use_id);
      }
    }
  }
  const now = Date.now();
  const staleCutoffMs = staleMinutes * 60_000;
  let count = 0;
  let staleCount = 0;
  let oldestMs = null;
  for (const tsMs of pending.values()) {
    const ageMs = now - tsMs;
    if (ageMs > staleCutoffMs) {
      staleCount++;
    } else {
      count++;
      if (oldestMs === null || tsMs < oldestMs) oldestMs = tsMs;
    }
  }
  const oldest_age_minutes = oldestMs === null ? null : (now - oldestMs) / 60_000;
  return { count, oldest_age_minutes, stale_count: staleCount };
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
  const sprint = state.pipeline.sprint != null ? state.pipeline.sprint : null;
  const wave = state.pipeline.wave != null ? state.pipeline.wave : null;
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
    if (sprint != null) {
      const sprintKey = `sprint-${sprint}`;
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
    if (sprint != null) {
      const qaPath = path.join(
        pipelineDir,
        "reviews",
        `sprint-${sprint}`,
        "QA-REPORT.md"
      );
      if (!fs.existsSync(qaPath)) {
        return allowStop(
          `phase 'reviewing' but QA-REPORT.md missing at ${qaPath} — run /review first to produce it`
        );
      }
    }
  }

  // Background-agent in-flight detection. Halt while unpaired `Agent`
  // tool_use entries exist in the transcript. The orchestrator dispatches
  // background Agent() calls that span turns; phase doesn't change while
  // they're running, but that's correct behavior, not a stuck pipeline.
  // Without this gate, perspective-dispatch turns would trip the
  // no-progress halt with a misleading /heal diagnostic.
  //
  // Stale entries (older than AGENT_STALE_MINUTES) are treated as crashed
  // agents — autopilot proceeds, prints a stderr warning. JSONL schema is
  // undocumented; degradation on schema change is "no halt" (count=0).
  const inflight = countInFlightAgents(payload.transcript_path);
  if (inflight.count > 0) {
    return allowStop(
      `${inflight.count} background agent(s) in flight ` +
      `(oldest ${inflight.oldest_age_minutes.toFixed(1)}m ago) — ` +
      `orchestrator awaiting completion. ` +
      `Reply with any prompt or wait for agents to finish.`
    );
  }
  if (inflight.stale_count > 0) {
    process.stderr.write(
      `[essense-autopilot] warning: ${inflight.stale_count} stale unpaired ` +
      `Agent tool_use entr${inflight.stale_count === 1 ? "y" : "ies"} ` +
      `(older than ${AGENT_STALE_MINUTES}m) — likely crashed ` +
      `agent(s), ignoring.\n`
    );
  }

  // Forward-detect (cheap fast-fail). Halts when the disk artifact for
  // the NEXT phase already exists, indicating the phase is stale. The
  // /review-spam scenario: phase=sprint-complete persisted but
  // reviews/sprint-N/QA-REPORT.md was already on disk. Without this
  // gate autopilot would re-fire /review against a finished review.
  if (phase === "sprint-complete" && sprint != null) {
    const qaPath = path.join(
      pipelineDir,
      "reviews",
      `sprint-${sprint}`,
      "QA-REPORT.md"
    );
    if (fs.existsSync(qaPath)) {
      return allowStop(
        `phase '${phase}' but ${qaPath} already exists — review already complete for sprint ${sprint}. ` +
        `Pipeline likely stuck (phase did not advance after review). ` +
        `Run /heal to inspect state vs disk artifacts and walk forward, ` +
        `or /repair --apply for non-interactive repair.`
      );
    }
  }

  // No-progress detection. If (phase, sprint, wave) is identical to the
  // last fire AND no in-flight agents, the prior auto-advance produced no
  // forward motion — same command would fire again with the same result.
  // Halt with /heal hint instead of looping.
  state.session = state.session || {};
  const lastPhase = state.session.autopilot_last_phase;
  const lastSprint = state.session.autopilot_last_sprint != null
    ? state.session.autopilot_last_sprint : null;
  const lastWave = state.session.autopilot_last_wave != null
    ? state.session.autopilot_last_wave : null;

  const sameAsLast =
    lastPhase === phase && lastSprint === sprint && lastWave === wave;

  if (sameAsLast) {
    return allowStop(
      `no progress since last auto-advance ` +
      `(phase '${phase}', sprint ${sprint}, wave ${wave} unchanged) — ` +
      `same command would fire again with no progress. ` +
      `Run /heal to inspect state vs disk artifacts and walk forward, ` +
      `or /repair --apply for non-interactive repair. ` +
      `Disable autopilot if continuing manually: .pipeline/config.yaml → autopilot.enabled: false.`
    );
  }

  // Persist progress markers (best-effort; failure non-fatal)
  state.session.autopilot_last_phase = phase;
  state.session.autopilot_last_sprint = sprint;
  state.session.autopilot_last_wave = wave;
  state.session.autopilot_last_advance_at = new Date().toISOString();
  writeYamlSafe(statePath, state);

  const reason =
    `[essense-autopilot] Pipeline phase '${phase}'. Auto-advance: invoke ${advanceCmd} now.`;

  return blockStop(reason);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`[essense-autopilot] error: ${err.message} — allowing stop\n`);
    process.exit(0);
  });
}

// Exports for unit tests. The hook is invoked as a child process by Claude
// Code (require.main === module guard above), so these exports are inert in
// production. Tests `require("../hooks/scripts/autopilot.js")` to call
// countInFlightAgents directly against synthetic transcript fixtures.
module.exports = { countInFlightAgents };
