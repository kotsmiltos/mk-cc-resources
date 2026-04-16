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

  // Check for concurrent session lock
  try {
    const lockfile = require("../../lib/lockfile");
    const lockStatus = lockfile.checkLock(pipelineDir);
    if (lockStatus.locked && !lockStatus.stale) {
      process.stdout.write(`[essense-flow] WARNING: Pipeline locked by another session (started ${lockStatus.lockInfo.session_start}). Proceed with caution.\n`);
    } else if (lockStatus.locked && lockStatus.stale) {
      process.stdout.write(`[essense-flow] Stale lock detected (last heartbeat: ${lockStatus.lockInfo.heartbeat}). Consider deleting .pipeline/.lock\n`);
    }
  } catch (_e) { /* lock check is advisory */ }

  // Update lockfile heartbeat on each user prompt
  try {
    const lockfile = require("../../lib/lockfile");
    lockfile.updateHeartbeat(pipelineDir);
  } catch (_e) { /* heartbeat is advisory */ }

  const configFile = path.join(pipelineDir, "config.yaml");
  const config = yamlIO.safeReadWithFallback(configFile);

  const payload = contextManager.buildInjectionPayload(pipelineDir, config);
  if (payload) {
    // Auto-advance guidance for autonomous phases
    const AUTO_ADVANCE_PHASES = ["research", "triaging", "sprinting", "sprint-complete", "reviewing"];
    const stateFile = path.join(pipelineDir, "state.yaml");
    const state = yamlIO.safeReadWithFallback(stateFile);
    const phase = state && state.pipeline ? state.pipeline.phase : null;

    let output = payload;
    if (phase && AUTO_ADVANCE_PHASES.includes(phase)) {
      output += "\n[auto-advance] This phase chains automatically — proceed without waiting for user command.";
    }

    process.stdout.write(output);
  }
}

try {
  main();
} catch (err) {
  // Hooks must not crash the session — log to stderr silently
  process.stderr.write(`[essense-flow hook error] ${err.message}\n`);
  process.exit(0);
}
