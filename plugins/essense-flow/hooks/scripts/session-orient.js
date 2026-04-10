"use strict";

/**
 * Session orientation hook logic (Node layer).
 * Called by session-orient.sh at session start.
 * Reads .pipeline/state.yaml and prints orientation text to stdout.
 */

const path = require("path");
const fs = require("fs");
const { yamlIO } = require("../../lib");
const contextManager = require("../../skills/context/scripts/context-manager");

function findPipelineDir(startDir) {
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, ".pipeline");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function main() {
  const cwd = process.cwd();
  const pipelineDir = findPipelineDir(cwd);

  if (!pipelineDir) return;

  const stateFile = path.join(pipelineDir, "state.yaml");
  const configFile = path.join(pipelineDir, "config.yaml");

  const state = yamlIO.safeReadWithFallback(stateFile);
  const config = yamlIO.safeReadWithFallback(configFile);

  if (!state) return;

  const orientation = contextManager.getSessionOrientation(state, config);
  if (orientation) {
    process.stdout.write(orientation + "\n");
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`[essense-flow hook error] ${err.message}\n`);
  process.exit(0);
}
