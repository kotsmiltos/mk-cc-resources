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
 * Validate whether a transition from currentPhase to targetPhase is allowed.
 *
 * @param {string} currentPhase — current pipeline phase
 * @param {string} targetPhase — desired target phase
 * @param {Object<string, Array>} transitionMap — output of loadTransitions()
 * @returns {{ ok: boolean, transition?: Object, error?: string }}
 */
function transition(currentPhaseOrFilePath, targetPhase, transitionMap, _projectRoot) {
  // Overload: if first arg looks like a file path (contains path sep or .yaml),
  // treat as state file path — read current phase, validate, write new phase.
  const fs = require("fs");
  if (
    typeof currentPhaseOrFilePath === "string" &&
    (currentPhaseOrFilePath.includes(path.sep) || currentPhaseOrFilePath.includes("/") || currentPhaseOrFilePath.endsWith(".yaml"))
  ) {
    const statePath = currentPhaseOrFilePath;
    const stateData = yamlIO.safeReadWithFallback(statePath, {});
    const currentPhase = (stateData && stateData.pipeline && stateData.pipeline.phase) || "idle";

    const outgoing = transitionMap[currentPhase];
    if (!outgoing || outgoing.length === 0) {
      throw new Error(`Invalid transition from ${currentPhase} to ${targetPhase}: no outgoing transitions`);
    }
    const match = outgoing.find((t) => t.to === targetPhase);
    if (!match) {
      const allowed = outgoing.map((t) => t.to);
      throw new Error(`Invalid transition from ${currentPhase} to ${targetPhase}: allowed targets are ${allowed.join(", ")}`);
    }

    // Write new state
    const newState = {
      ...stateData,
      pipeline: { ...((stateData && stateData.pipeline) || {}), phase: targetPhase },
      last_updated: new Date().toISOString(),
    };
    yamlIO.safeWrite(statePath, newState);
    return { ok: true, transition: match };
  }

  // Original API: currentPhaseOrFilePath is a phase string
  const currentPhase = currentPhaseOrFilePath;
  const outgoing = transitionMap[currentPhase];
  if (!outgoing || outgoing.length === 0) {
    return {
      ok: false,
      error: errors.formatError("E_TRANSITION_INVALID", { from: currentPhase, to: targetPhase, valid: "none" }),
    };
  }

  const match = outgoing.find((t) => t.to === targetPhase);
  if (!match) {
    const allowed = outgoing.map((t) => t.to);
    return {
      ok: false,
      error: errors.formatError("E_TRANSITION_INVALID", { from: currentPhase, to: targetPhase, valid: allowed.join(", ") }),
    };
  }

  return { ok: true, transition: match };
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
  const transitionResult = transition(fromState, targetPhase, transitionMap);

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

  try {
    yamlIO.safeWrite(statePath, newState);
  } catch (err) {
    return { ok: false, error: `State write failed: ${err.message}` };
  }

  stateHistory.appendTransition(pipelineDir, {
    fromState,
    toState: targetPhase,
    trigger: options.trigger || "manual",
    triggeringArtifact: options.artifact || null,
    sprint: state && state.pipeline ? state.pipeline.sprint || null : null,
  });

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

module.exports = { loadTransitions, transition, validateTransition, writeState };
