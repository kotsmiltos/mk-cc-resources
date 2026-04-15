"use strict";

const yamlIO = require("./yaml-io");
const errors = require("./errors");

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
function transition(currentPhase, targetPhase, transitionMap) {
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

module.exports = { loadTransitions, transition };
