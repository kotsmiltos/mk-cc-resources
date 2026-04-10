"use strict";

/**
 * Context injection hook logic (Node layer).
 * Called by context-inject.sh on UserPromptSubmit.
 * Reads .pipeline/state.yaml + config.yaml + rules.yaml, outputs injection payload to stdout.
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

  if (!pipelineDir) {
    // No pipeline — silent exit (don't inject anything)
    return;
  }

  const configFile = path.join(pipelineDir, "config.yaml");
  const config = yamlIO.safeReadWithFallback(configFile);

  const payload = contextManager.buildInjectionPayload(pipelineDir, config);
  if (payload) {
    process.stdout.write(payload);
  }
}

try {
  main();
} catch (err) {
  // Hooks must not crash the session — log to stderr silently
  process.stderr.write(`[essense-flow hook error] ${err.message}\n`);
  process.exit(0);
}
