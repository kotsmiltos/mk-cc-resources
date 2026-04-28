"use strict";

const path = require("path");
const yamlIO = require("./yaml-io");
const errors = require("./errors");
const stateHistory = require("./state-history");
const debug = require("./debug");
const { STATE_FILE } = require("./constants");

// Path to transitions.yaml relative to the project root (parent of pipelineDir).
const TRANSITIONS_YAML_REL = path.join("references", "transitions.yaml");

// Terminal phase — once reached, no further transitions are allowed except reset to idle.
const TERMINAL_PHASE = "complete";

// Phase → next command map. Single source of truth is references/phase-command-map.yaml
// (loaded lazily below). Inline fallback covers every canonical phase so writeState
// can self-heal next_action even when the references file is unavailable. Mirrors
// PHASE_NEXT_FALLBACK in skills/context/scripts/next-runner.js — keep in sync.
//
// Background: prior to this contract, finalize* helpers transitioned phase atomically
// but left state.next_action pointing at the OLD phase's command. autopilot routes
// from phase (correct), but /status, context-inject auto-advance hint, and next-runner
// fallback all read state.next_action and surfaced stale values. Pinning next_action
// to the new phase's command on every transition closes that gap at the source.
const PHASE_NEXT_FALLBACK = {
  idle:                 "/elicit",
  eliciting:            "/elicit",
  research:             "/triage",
  triaging:             "/triage",
  "requirements-ready": "/architect",
  architecture:         "/architect",
  decomposing:          "/architect",
  sprinting:            "/build",
  "sprint-complete":    "/review",
  reviewing:            "/triage",
  verifying:            "/verify",
  complete:             "/status",
};

let _phaseNextCache = null;
function loadPhaseNextCommand() {
  if (_phaseNextCache) return _phaseNextCache;
  // Resolve references/phase-command-map.yaml relative to plugin root (state-machine
  // lives at lib/state-machine.js → plugin root is two `..` up).
  const yamlPath = path.resolve(__dirname, "..", "references", "phase-command-map.yaml");
  const data = yamlIO.safeRead(yamlPath);
  if (!data || !data.phase_command || typeof data.phase_command !== "object") {
    _phaseNextCache = PHASE_NEXT_FALLBACK;
    return _phaseNextCache;
  }
  const out = {};
  for (const [phase, cmd] of Object.entries(data.phase_command)) {
    if (typeof cmd === "string") out[phase] = cmd;
  }
  _phaseNextCache = Object.keys(out).length > 0 ? out : PHASE_NEXT_FALLBACK;
  return _phaseNextCache;
}

function nextCommandFor(phase) {
  const map = loadPhaseNextCommand();
  return map[phase] || "";
}

/**
 * Load transitions from a transitions.yaml file and return a map
 * from source state to an array of transition objects.
 *
 * Input YAML has shape:
 *   transitions:
 *     name:
 *       from: "state-a"
 *       to: "state-b"
 *       ...
 *
 * Output: { "state-a": [{ to: "state-b", ... }], ... }
 *
 * @param {string} filePath — absolute path to transitions.yaml
 * @returns {Object<string, Array<{ to: string }>>}
 */
function loadTransitions(filePath) {
  const data = yamlIO.safeRead(filePath);
  const transitions = data && data.transitions ? data.transitions : {};
  const map = {};

  for (const [_name, def] of Object.entries(transitions)) {
    const from = def.from;
    if (!map[from]) {
      map[from] = [];
    }
    map[from].push(def);
  }

  return map;
}

/**
 * Derive the canonical phase set from a transition map. Includes both
 * source phases (map keys) and target phases (each entry's `to` field).
 * Used to validate phase values at write time so invalid values like
 * "triaged" cannot land in state.yaml via writeState().
 *
 * @param {Object<string, Array<{ to: string }>>} transitionMap
 * @returns {Set<string>}
 */
function validPhasesFrom(transitionMap) {
  const phases = new Set();
  for (const [from, list] of Object.entries(transitionMap)) {
    phases.add(from);
    for (const def of list) {
      if (def && def.to) phases.add(def.to);
    }
  }
  return phases;
}

/**
 * Write a validated state transition to state.yaml and append a history record.
 *
 * Enforces the terminal-state guard (FR-015): a completed pipeline cannot advance
 * to any phase other than idle without first archiving via /init.
 *
 * @param {string} pipelineDir — absolute path to the .pipeline directory
 * @param {string} targetPhase — desired next phase
 * @param {Object} stateUpdates — additional fields to merge into state.yaml
 * @param {Object} [options]
 * @param {string} [options.command] — command name for error messages
 * @param {string} [options.trigger] — trigger label recorded in history
 * @param {string|null} [options.artifact] — triggering artifact path recorded in history
 * @returns {{ ok: boolean, error?: string }}
 */
function writeState(pipelineDir, targetPhase, stateUpdates, options = {}) {
  const statePath = path.join(pipelineDir, STATE_FILE);
  const state = yamlIO.safeReadWithFallback(statePath, {});

  const fromState = state && state.pipeline && state.pipeline.phase
    ? state.pipeline.phase
    : "idle";

  debug.trace("state-machine:writeState", { from: fromState, to: targetPhase });

  // Terminal guard (FR-015): pipeline.phase === 'complete' blocks all transitions except reset to idle.
  if (fromState === TERMINAL_PHASE && targetPhase !== "idle") {
    return {
      ok: false,
      error: errors.formatError("E_TERMINAL_STATE", { command: options.command || "unknown" }),
    };
  }

  const transitionsPath = path.join(path.dirname(pipelineDir), TRANSITIONS_YAML_REL);
  const transitionMap = loadTransitions(transitionsPath);

  // Phase-enum guard: reject targetPhase values that are not in the canonical
  // phase set. Prevents state corruption from typos or external writers
  // landing values like "triaged" (which is not a real phase) into state.yaml.
  const validPhases = validPhasesFrom(transitionMap);
  if (validPhases.size > 0 && !validPhases.has(targetPhase)) {
    return {
      ok: false,
      error: errors.formatError("E_PHASE_UNKNOWN", {
        phase: targetPhase,
        valid: Array.from(validPhases).sort().join(", "),
      }),
    };
  }

  const transitionResult = validateTransition(fromState, targetPhase, transitionMap);

  if (!transitionResult.ok) {
    const validTargets = (transitionMap[fromState] || []).map((t) => t.to);
    return {
      ok: false,
      error: errors.formatError("E_PHASE_INVALID", {
        command: options.command || "unknown",
        phase: fromState,
        expected: targetPhase,
        next_valid: validTargets.join(", ") || "none",
      }),
    };
  }

  const newState = {
    ...state,
    ...stateUpdates,
    pipeline: {
      ...((state && state.pipeline) || {}),
      ...((stateUpdates && stateUpdates.pipeline) || {}),
      phase: targetPhase,
    },
    last_updated: new Date().toISOString(),
  };

  // Pin next_action to the target phase's canonical command so consumers
  // (status-runner, context-inject auto-advance hint, next-runner fallback)
  // never read a stale value left over from a prior transition. Caller-supplied
  // stateUpdates.next_action takes precedence — caller knows best.
  if (!stateUpdates || !("next_action" in stateUpdates)) {
    newState.next_action = nextCommandFor(targetPhase);
  }

  try {
    yamlIO.safeWrite(statePath, newState);
  } catch (err) {
    return { ok: false, error: `State write failed: ${err.message}` };
  }

  // Audit append. state.yaml is already written; if appendTransition
  // throws (disk full, permission), the transition is real but the
  // history is incomplete. Surface as ok:false so the caller can decide
  // whether to retry — without the wrap the throw escapes writeState's
  // {ok,error} contract and any caller that branches on `.ok` will
  // mis-handle it. Same family as the finalize* try/catch wraps.
  try {
    stateHistory.appendTransition(pipelineDir, {
      fromState,
      toState: targetPhase,
      trigger: options.trigger || "manual",
      triggeringArtifact: options.artifact || null,
      sprint: state && state.pipeline ? state.pipeline.sprint || null : null,
    });
  } catch (err) {
    return {
      ok: false,
      error: `State written to ${targetPhase} but audit log append failed: ${err.message}`,
      stateWritten: true,
    };
  }

  return { ok: true };
}

/**
 * Pure validation — checks if transition is allowed without writing state.
 *
 * @param {string} currentPhase
 * @param {string} targetPhase
 * @param {Object<string, Array>} transitionMap — output of loadTransitions()
 * @returns {{ ok: boolean, transition?: Object, error?: string }}
 */
function validateTransition(currentPhase, targetPhase, transitionMap) {
  const outgoing = transitionMap[currentPhase];
  if (!outgoing || outgoing.length === 0) {
    return { ok: false, error: `No outgoing transitions from "${currentPhase}"` };
  }
  const match = outgoing.find((t) => t.to === targetPhase);
  if (!match) {
    const allowed = outgoing.map((t) => t.to);
    return {
      ok: false,
      error: `Transition from "${currentPhase}" to "${targetPhase}" not allowed; valid: ${allowed.join(", ")}`,
    };
  }
  return { ok: true, valid: true, transition: match };
}

module.exports = { loadTransitions, validPhasesFrom, validateTransition, writeState };
