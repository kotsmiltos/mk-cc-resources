"use strict";

const path = require("path");
const { yamlIO } = require("../../lib");
const { findPipelineDir } = require("../../lib/paths");
const { STATE_FILE, CONFIG_FILE, AUTO_ADVANCE_MAP, AUTO_ADVANCE_DESCRIPTIONS } = require("../../lib/constants");
const contextManager = require("../../skills/context/scripts/context-manager");
const debug = require("../../lib/debug");

if (process.env.CLAUDE_SESSION_TYPE === "subagent" || process.env.CLAUDE_SUBAGENT === "1") {
  process.exit(0);
}

function main() {
  debug.trace("context-inject:main", { event: "entry" });
  const config = (() => {
    const cwd = process.cwd();
    const pipelineDir = findPipelineDir(cwd);
    if (!pipelineDir) return null;
    const configFile = path.join(pipelineDir, CONFIG_FILE);
    return { pipelineDir, config: yamlIO.safeReadWithFallback(configFile) };
  })();

  const TO = setTimeout(() => process.exit(0), config?.config?.timeouts?.hook_ms || 5000);

  const cwd = process.cwd();
  const pipelineDir = findPipelineDir(cwd);

  if (!pipelineDir) {
    process.stdout.write("[HOOK WARNING: context-inject — no pipeline directory found. Run /status.]\n");
    clearTimeout(TO);
    return;
  }

  try {
    const lockfile = require("../../lib/lockfile");
    const lockStatus = lockfile.checkLock(pipelineDir);
    if (lockStatus.locked && !lockStatus.stale) {
      process.stdout.write(`[essense-flow] WARNING: Pipeline locked by another session (started ${lockStatus.lockInfo.created_at}). Proceed with caution.\n`);
    } else if (lockStatus.locked && lockStatus.stale) {
      process.stdout.write(`[essense-flow] Stale lock detected (last heartbeat: ${lockStatus.lockInfo.last_heartbeat}). Consider deleting .pipeline/.lock\n`);
    }
  } catch (_e) { /* lock check is advisory */ }

  try {
    const lockfile = require("../../lib/lockfile");
    lockfile.updateHeartbeat(pipelineDir);
  } catch (_e) { /* heartbeat is advisory */ }

  const configFile = path.join(pipelineDir, CONFIG_FILE);
  const cfg = yamlIO.safeReadWithFallback(configFile);

  const payload = contextManager.buildInjectionPayload(pipelineDir, cfg);
  if (payload) {
    const stateFile = path.join(pipelineDir, STATE_FILE);
    const state = yamlIO.safeReadWithFallback(stateFile);

    if (!state) {
      process.stdout.write("[HOOK WARNING: context-inject — state.yaml unreadable. Run /status.]\n");
      clearTimeout(TO);
      return;
    }

    const phase = state.pipeline ? state.pipeline.phase : null;
    let output = payload;

    // Inject phase-input slice from context map — only what current phase needs.
    // Falls back silently if map absent (e.g. fresh session before SessionStart fires).
    if (phase) {
      try {
        const contextMap = contextManager.readContextMap(pipelineDir);
        const inputsLine = contextManager.formatPhaseInputsForInjection(contextMap, phase);
        if (inputsLine) {
          output += `\n${inputsLine}`;
        }
      } catch (_e) { /* advisory — state metadata still injected */ }
    }

    if (phase) {
      const advanceCmd = AUTO_ADVANCE_MAP[phase];
      const shouldAdvance =
        (advanceCmd && state.next_action === advanceCmd)
        || (phase === "architecture" && state.next_action === "/build");
      if (shouldAdvance) {
        const cmd = state.next_action;
        // Description is co-located with AUTO_ADVANCE_MAP in lib/constants.js;
        // a parity assertion at module load guarantees every phase has a description.
        const desc = AUTO_ADVANCE_DESCRIPTIONS[phase] || phase;
        output += `\n[essense-flow] Auto-advancing to ${cmd} — ${desc}. Reply STOP to pause.`;
        output += `\n[auto-advance: ${cmd}]`;
      }
    }

    process.stdout.write(output);
  }

  debug.trace("context-inject:main", { event: "exit" });
  clearTimeout(TO);
}

try {
  main();
} catch (err) {
  process.stdout.write(`[HOOK WARNING: context-inject — ${err.message}. Run /status.]\n`);
  process.exit(0);
}
