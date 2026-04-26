"use strict";

if (process.env.CLAUDE_SESSION_TYPE === "subagent" || process.env.CLAUDE_SUBAGENT === "1") {
  process.exit(0);
}

const path = require("path");
const { yamlIO } = require("../../lib");
const { findPipelineDir } = require("../../lib/paths");
const contextManager = require("../../skills/context/scripts/context-manager");
const { runDriftCheck } = require("../../skills/context/scripts/drift-check");

function main() {
  const cwd = process.cwd();
  const pipelineDir = findPipelineDir(cwd);

  if (!pipelineDir) {
    process.stdout.write("[HOOK WARNING: session-orient — pipeline dir not found. Run /status.]\n");
    return;
  }

  const stateFile = path.join(pipelineDir, "state.yaml");
  const configFile = path.join(pipelineDir, "config.yaml");

  const config = yamlIO.safeReadWithFallback(configFile);
  const timeoutMs = (config && config.timeouts && config.timeouts.hook_ms) || 5000;
  const TO = setTimeout(() => process.exit(0), timeoutMs);

  const state = yamlIO.safeReadWithFallback(stateFile);

  if (!state) {
    process.stdout.write("[HOOK WARNING: session-orient — state.yaml not found. Run /status.]\n");
    clearTimeout(TO);
    return;
  }

  // Derive and persist context map — fresh from .pipeline/ state every session.
  // Failure here is non-fatal: orientation still prints; context-inject falls back.
  try {
    contextManager.writeContextMap(pipelineDir);
  } catch (_e) { /* advisory — context-inject handles missing map */ }

  const orientation = contextManager.getSessionOrientation(state, config);
  if (orientation) {
    process.stdout.write(orientation + "\n");
  }

  // Drift surface: surface state corruption (e.g., invalid phase values like
  // "triaged") at session start so the user sees it before any skill consumes
  // the bad state. Read-only — repair is left to /repair.
  try {
    const result = runDriftCheck(pipelineDir);
    if (result && result.status === "DRIFT" && Array.isArray(result.findings)) {
      const driftFindings = result.findings.filter((f) => f.result === "DRIFT" || f.result === "MISSING");
      if (driftFindings.length > 0) {
        const lines = driftFindings.map((f) => `  - [${f.check}] ${f.detail}`);
        process.stdout.write(
          `[essense-flow] state drift detected — run /repair to diagnose:\n${lines.join("\n")}\n`
        );
      }
    }
  } catch (_e) { /* advisory — drift surface must never block session start */ }

  clearTimeout(TO);
}

try {
  main();
} catch (err) {
  process.stdout.write("[HOOK WARNING: session-orient — " + err.message + ". Run /status.]\n");
  process.exit(0);
}
