"use strict";

const path = require("path");
const fs = require("fs");
const { yamlIO, stateMachine, tokens } = require("../../../lib");
const {
  STATE_FILE,
  CONTEXT_MAP_FILE,
  SPEC_PATH,
  REQ_PATH,
  ARCH_PATH,
  PHASE_INPUTS,
} = require("../../../lib/constants");

// Phase display labels for human-readable output
const PHASE_LABELS = {
  idle: "Idle — no pipeline active",
  eliciting: "Eliciting — design exploration in progress",
  research: "Research — multi-perspective analysis in progress",
  triaging: "Triaging — categorizing gaps and routing",
  "requirements-ready": "Requirements ready — awaiting architecture",
  architecture: "Architecture — designing system structure",
  decomposing: "Decomposing — breaking modules into leaf tasks",
  sprinting: "Sprinting — building tasks",
  "sprint-complete": "Sprint complete — awaiting review",
  reviewing: "Reviewing — adversarial QA in progress",
  verifying: "Ready for verification — run /verify to check spec compliance",
  complete: "Complete — pipeline finished",
};

/**
 * Get a one-line summary of current pipeline position.
 */
function getPipelineSummary(state) {
  if (!state || !state.pipeline) return "No pipeline initialized";

  const phase = state.pipeline.phase || "idle";
  const label = PHASE_LABELS[phase] || phase;
  const parts = [label];

  if (state.pipeline.sprint !== null) {
    parts.push(`sprint ${state.pipeline.sprint}`);
  }
  if (state.pipeline.wave !== null) {
    parts.push(`wave ${state.pipeline.wave}`);
  }
  if (state.pipeline.task_in_progress) {
    parts.push(`task: ${state.pipeline.task_in_progress}`);
  }
  if (state.blocked_on) {
    parts.push(`BLOCKED: ${state.blocked_on}`);
  }

  return parts.join(" | ");
}

/**
 * Derive the next recommended command from pipeline state.
 */
function getNextAction(state) {
  if (!state || !state.pipeline) return "/init";

  const phase = state.pipeline.phase;
  const sprint = state.pipeline.sprint;

  switch (phase) {
    case "idle":
      return "/elicit or /research";
    case "eliciting":
      return "/elicit — continue session";
    case "research":
      return "Auto-advancing → triage";
    case "requirements-ready":
      return "/architect";
    case "architecture":
      return "Architecture in progress";
    case "decomposing":
      return "Decomposition in progress";
    case "sprinting":
      return sprint !== null ? `/build sprint ${sprint}` : "/build";
    case "sprint-complete":
      return "Auto-advancing → review";
    case "triaging":
      return "Auto-advancing → triage";
    case "reviewing":
      return "Auto-advancing → triage (review in progress)";
    case "verifying": return "/verify — check spec compliance";
    case "complete":
      return "/status — pipeline complete";
    default:
      return "/status";
  }
}

/**
 * Format state.yaml into a context injection payload.
 * Returns a structured text block under the configured token ceiling.
 */
function formatStateForInjection(state, config) {
  if (!state) return "[essense-flow] No pipeline state. Run /init.";

  const summary = getPipelineSummary(state);
  const next = state.next_action || getNextAction(state);

  const lines = [];
  lines.push(`[essense-flow] ${summary}`);
  lines.push(`Next: ${next}`);

  // Current sprint only — stale sprints are noise every turn
  const currentSprintId = state.pipeline && state.pipeline.sprint ? `sprint-${state.pipeline.sprint}` : null;
  if (currentSprintId && state.sprints && state.sprints[currentSprintId]) {
    const s = state.sprints[currentSprintId];
    const status = s.status || "unknown";
    const progress =
      s.tasks_total > 0 ? ` (${s.tasks_complete || 0}/${s.tasks_total})` : "";
    lines.push(`  ${currentSprintId}: ${status}${progress}`);
  }

  // Blocker (decisions count removed — status metric, not actionable)
  if (state.blocked_on) {
    lines.push(`BLOCKED: ${state.blocked_on}`);
  }

  const payload = lines.join("\n");

  // Check against injection ceiling
  if (config && config.token_budgets) {
    const tokenCount = tokens.countTokens(payload);
    const ceiling = config.token_budgets.injection_ceiling || 5000;
    if (tokenCount > ceiling) {
      // Truncate to summary + next only
      return `[essense-flow] ${summary}\nNext: ${next}\n[injection truncated — ${tokenCount} tokens exceeds ceiling of ${ceiling}]`;
    }
  }

  return payload;
}

/**
 * Format rules for injection.
 */
function formatRulesForInjection(rules) {
  if (!rules || !rules.rules || Object.keys(rules.rules).length === 0) {
    return "";
  }

  const lines = [];
  for (const [name, rule] of Object.entries(rules.rules)) {
    lines.push(`- ${name}: ${rule.what}`);
  }
  return lines.join("\n");
}

/**
 * Build full injection payload (state + rules).
 */
function buildInjectionPayload(pipelineDir, config) {
  const stateFile = path.join(pipelineDir, "state.yaml");
  const rulesFile = path.join(pipelineDir, "rules.yaml");

  const state = yamlIO.safeReadWithFallback(stateFile);
  const rules = yamlIO.safeReadWithFallback(rulesFile);

  const statePayload = formatStateForInjection(state, config);
  const rulesPayload = formatRulesForInjection(rules);

  const parts = [statePayload];
  if (rulesPayload) {
    parts.push("Rules:\n" + rulesPayload);
  }

  return parts.join("\n");
}

/**
 * Save pause context — stores continuation data in state.
 */
function savePauseContext(stateFilePath, pauseContext) {
  const state = yamlIO.safeReadWithFallback(stateFilePath);
  if (!state) throw new Error("No state file to pause");

  state.session.continue_from = pauseContext;
  state.last_updated = new Date().toISOString();
  yamlIO.safeWrite(stateFilePath, state);
  return state;
}

/**
 * Restore pause context — reads and clears continuation data.
 */
function restorePauseContext(stateFilePath) {
  const state = yamlIO.safeReadWithFallback(stateFilePath);
  if (!state) return null;

  const context = state.session.continue_from;
  if (context) {
    state.session.continue_from = null;
    state.last_updated = new Date().toISOString();
    yamlIO.safeWrite(stateFilePath, state);
  }
  return context;
}

/**
 * Generate session orientation text — printed once when a new session starts.
 */
function getSessionOrientation(state, config) {
  if (!state) return "[essense-flow] No pipeline. Run /init.";

  const lines = [];
  lines.push("=== essense-flow pipeline ===");
  lines.push(getPipelineSummary(state));

  // Resume context if paused
  if (state.session && state.session.continue_from) {
    lines.push(`Resume from: ${state.session.continue_from}`);
  }

  // Last verified
  if (state.session && state.session.last_verified) {
    lines.push(`Last verified: ${state.session.last_verified}`);
  }

  const next = state.next_action || getNextAction(state);
  lines.push(`Next: ${next}`);

  return lines.join("\n");
}

/**
 * Derive context map from actual .pipeline/ directory state.
 * Generated fresh — never maintained. The map is the navigation index
 * for what artifacts exist and which subset each phase needs.
 *
 * Returns a structured map; never throws on missing files.
 */
function deriveContextMap(pipelineDir) {
  const exists = (rel) => fs.existsSync(path.join(pipelineDir, rel));
  const mtime = (rel) => {
    try {
      return fs.statSync(path.join(pipelineDir, rel)).mtime.toISOString();
    } catch (_e) {
      return null;
    }
  };

  const canonical = {
    spec:          { path: `.pipeline/${SPEC_PATH}`, exists: exists(SPEC_PATH), produced_at: mtime(SPEC_PATH) },
    requirements:  { path: `.pipeline/${REQ_PATH}`,  exists: exists(REQ_PATH),  produced_at: mtime(REQ_PATH) },
    architecture:  { path: `.pipeline/${ARCH_PATH}`, exists: exists(ARCH_PATH), produced_at: mtime(ARCH_PATH) },
  };

  const state = yamlIO.safeReadWithFallback(path.join(pipelineDir, STATE_FILE));
  const currentSprint = (state && state.pipeline && state.pipeline.sprint) || null;

  // Archived sprints — all sprint-N dirs except current
  let archivedSprints = [];
  const sprintsDir = path.join(pipelineDir, "sprints");
  if (fs.existsSync(sprintsDir)) {
    archivedSprints = fs
      .readdirSync(sprintsDir)
      .filter((d) => /^sprint-\d+$/.test(d))
      .map((d) => parseInt(d.replace("sprint-", ""), 10))
      .filter((n) => Number.isFinite(n) && n !== currentSprint)
      .sort((a, b) => a - b);
  }

  // Decision count — DEC-NNN.md files in decisions/
  let decisionsCount = 0;
  const decisionsDir = path.join(pipelineDir, "decisions");
  if (fs.existsSync(decisionsDir)) {
    decisionsCount = fs
      .readdirSync(decisionsDir)
      .filter((f) => /^DEC-\d+.*\.md$/.test(f)).length;
  }

  return {
    schema_version: 1,
    canonical,
    current_sprint: currentSprint,
    phase_inputs: PHASE_INPUTS,
    archived: {
      sprints: archivedSprints,
      decisions_count: decisionsCount,
    },
    derived_at: new Date().toISOString(),
  };
}

/**
 * Write context map to .pipeline/context_map.yaml.
 * Called by session-orient on SessionStart so context-inject can read it.
 */
function writeContextMap(pipelineDir) {
  const map = deriveContextMap(pipelineDir);
  const mapPath = path.join(pipelineDir, CONTEXT_MAP_FILE);
  yamlIO.safeWrite(mapPath, map);
  return map;
}

/**
 * Read context map from disk. Returns null if absent — callers must handle.
 */
function readContextMap(pipelineDir) {
  const mapPath = path.join(pipelineDir, CONTEXT_MAP_FILE);
  return yamlIO.safeReadWithFallback(mapPath);
}

/**
 * Format the phase-input slice for injection.
 * Lists what artifacts the current phase needs to read.
 */
function formatPhaseInputsForInjection(map, phase) {
  if (!map || !phase) return "";
  const inputs = (map.phase_inputs && map.phase_inputs[phase]) || [];
  if (inputs.length === 0) return "";

  const parts = [];
  const missing = [];

  // Resolve each input key to a "label (path)" string. Push to `missing` when the
  // declared input cannot be located — surfaces silent staleness instead of hiding it.
  for (const key of inputs) {
    if (key === "spec") {
      if (map.canonical && map.canonical.spec && map.canonical.spec.exists) {
        parts.push(`spec (${map.canonical.spec.path})`);
      } else {
        missing.push("spec");
      }
    } else if (key === "requirements") {
      if (map.canonical && map.canonical.requirements && map.canonical.requirements.exists) {
        parts.push(`requirements (${map.canonical.requirements.path})`);
      } else {
        missing.push("requirements");
      }
    } else if (key === "architecture") {
      if (map.canonical && map.canonical.architecture && map.canonical.architecture.exists) {
        parts.push(`architecture (${map.canonical.architecture.path})`);
      } else {
        missing.push("architecture");
      }
    } else if (key === "current_task") {
      if (map.current_sprint != null) {
        parts.push(`current_task (.pipeline/sprints/sprint-${map.current_sprint}/tasks/)`);
      } else {
        missing.push("current_task");
      }
    } else if (key === "current_sprint_findings") {
      if (map.current_sprint != null) {
        parts.push(`current_sprint_findings (.pipeline/reviews/sprint-${map.current_sprint}/QA-REPORT.md)`);
      } else {
        missing.push("current_sprint_findings");
      }
    } else if (key === "changed_files") {
      if (map.current_sprint != null) {
        parts.push(`changed_files (sprint-${map.current_sprint} working tree)`);
      } else {
        missing.push("changed_files");
      }
    } else if (key === "findings_summary") {
      if (map.current_sprint != null) {
        parts.push(`findings_summary (.pipeline/reviews/sprint-${map.current_sprint}/QA-REPORT.md frontmatter)`);
      } else {
        missing.push("findings_summary");
      }
    } else {
      missing.push(key);
    }
  }

  if (parts.length === 0 && missing.length === 0) return "";

  let line = parts.length > 0
    ? `Context for this phase: ${parts.join(", ")}`
    : "Context for this phase: (no inputs available)";
  if (missing.length > 0) {
    line += ` [missing: ${missing.join(", ")}]`;
  }
  return line;
}

module.exports = {
  getPipelineSummary,
  getNextAction,
  formatStateForInjection,
  formatRulesForInjection,
  buildInjectionPayload,
  savePauseContext,
  restorePauseContext,
  getSessionOrientation,
  deriveContextMap,
  writeContextMap,
  readContextMap,
  formatPhaseInputsForInjection,
  PHASE_LABELS,
};
