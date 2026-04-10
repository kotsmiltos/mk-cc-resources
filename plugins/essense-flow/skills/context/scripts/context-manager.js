"use strict";

const path = require("path");
const { yamlIO, stateMachine, tokens } = require("../../../lib");

// Phase display labels for human-readable output
const PHASE_LABELS = {
  idle: "Idle — no pipeline active",
  research: "Research — multi-perspective analysis in progress",
  "requirements-ready": "Requirements ready — awaiting architecture",
  architecture: "Architecture — designing system structure",
  decomposing: "Decomposing — breaking modules into leaf tasks",
  sprinting: "Sprinting — building tasks",
  "sprint-complete": "Sprint complete — awaiting review",
  reviewing: "Reviewing — adversarial QA in progress",
  reassessment: "Reassessment — requires user decision",
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
      return "/research";
    case "research":
      return "Continue research (in progress)";
    case "requirements-ready":
      return "/architect";
    case "architecture":
      return "Continue architecture (in progress)";
    case "decomposing":
      return "Continue decomposition (in progress)";
    case "sprinting":
      return sprint !== null ? `/build sprint ${sprint}` : "/build";
    case "sprint-complete":
      return sprint !== null ? `/review sprint ${sprint}` : "/review";
    case "reviewing":
      return "Review in progress — awaiting QA verdict";
    case "reassessment":
      return "User decision required — /architect or /research";
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
  if (!state) return "[essense-flow] No pipeline state found. Run /init to start.";

  const summary = getPipelineSummary(state);
  const next = state.next_action || getNextAction(state);

  const lines = [];
  lines.push(`[essense-flow] ${summary}`);
  lines.push(`Next: ${next}`);

  // Sprint progress
  if (state.sprints && Object.keys(state.sprints).length > 0) {
    const sprintEntries = Object.entries(state.sprints);
    const recent = sprintEntries.slice(-3); // Last 3 sprints
    for (const [id, s] of recent) {
      const status = s.status || "unknown";
      const progress =
        s.tasks_total > 0 ? ` (${s.tasks_complete || 0}/${s.tasks_total})` : "";
      lines.push(`  ${id}: ${status}${progress}`);
    }
  }

  // Decisions count
  if (state.decisions_count > 0) {
    lines.push(`Decisions: ${state.decisions_count} recorded`);
  }

  // Blocker
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
  if (!state) return "[essense-flow] No pipeline found. Run /init to initialize.";

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

module.exports = {
  getPipelineSummary,
  getNextAction,
  formatStateForInjection,
  formatRulesForInjection,
  buildInjectionPayload,
  savePauseContext,
  restorePauseContext,
  getSessionOrientation,
  PHASE_LABELS,
};
