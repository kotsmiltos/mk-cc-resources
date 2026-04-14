"use strict";

const yamlIO = require("./yaml-io");

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

module.exports = { loadTransitions };
