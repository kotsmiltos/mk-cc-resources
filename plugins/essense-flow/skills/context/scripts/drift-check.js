"use strict";

/**
 * Drift-check: compares .pipeline/state.yaml against filesystem reality.
 * Reports discrepancies between claimed state and actual artifacts.
 *
 * Usage: node drift-check.js [pipeline-dir]
 *   pipeline-dir defaults to .pipeline/ in cwd
 */

const path = require("path");
const fs = require("fs");
const { yamlIO } = require("../../../lib");

const STATUS_OK = "OK";
const STATUS_DRIFT = "DRIFT";

/**
 * Run all drift checks and return a report.
 */
function runDriftCheck(pipelineDir) {
  const findings = [];
  const stateFile = path.join(pipelineDir, "state.yaml");
  const state = yamlIO.safeReadWithFallback(stateFile);

  if (!state) {
    return { status: STATUS_DRIFT, findings: [{ check: "state-file", result: "MISSING", detail: "state.yaml not found" }] };
  }

  // Check 1: Phase is a known phase
  const knownPhases = [
    "idle", "research", "requirements-ready", "architecture",
    "decomposing", "sprinting", "sprint-complete", "reviewing",
    "reassessment", "complete",
  ];
  const phase = state.pipeline && state.pipeline.phase;
  if (!knownPhases.includes(phase)) {
    findings.push({ check: "phase-valid", result: STATUS_DRIFT, detail: `Unknown phase: "${phase}"` });
  } else {
    findings.push({ check: "phase-valid", result: STATUS_OK, detail: phase });
  }

  // Check 2: If phase > idle, requirements should exist when expected
  const phasesPastResearch = ["requirements-ready", "architecture", "decomposing", "sprinting", "sprint-complete", "reviewing", "complete"];
  if (phasesPastResearch.includes(phase)) {
    const reqPath = path.join(pipelineDir, "requirements");
    if (!fs.existsSync(reqPath) || fs.readdirSync(reqPath).length === 0) {
      findings.push({ check: "requirements-exist", result: STATUS_DRIFT, detail: "Phase implies research is done, but requirements/ is missing or empty" });
    } else {
      findings.push({ check: "requirements-exist", result: STATUS_OK, detail: "requirements/ exists" });
    }
  }

  // Check 3: If phase is sprinting/sprint-complete/reviewing, sprint dir should exist
  const sprintPhases = ["sprinting", "sprint-complete", "reviewing"];
  if (sprintPhases.includes(phase) && state.pipeline.sprint !== null) {
    const sprintNum = String(state.pipeline.sprint).padStart(2, "0");
    const sprintDir = path.join(pipelineDir, "sprints", `sprint-${sprintNum}`);
    if (!fs.existsSync(sprintDir)) {
      findings.push({ check: "sprint-dir-exists", result: STATUS_DRIFT, detail: `Phase is "${phase}" with sprint ${state.pipeline.sprint}, but ${sprintDir} not found` });
    } else {
      findings.push({ check: "sprint-dir-exists", result: STATUS_OK, detail: `sprint-${sprintNum}/ exists` });
    }
  }

  // Check 4: Sprint states in state.yaml match filesystem
  if (state.sprints) {
    for (const [sprintId, sprintState] of Object.entries(state.sprints)) {
      const sprintDir = path.join(pipelineDir, "sprints", sprintId);
      if (!fs.existsSync(sprintDir)) {
        findings.push({ check: `sprint-${sprintId}-dir`, result: STATUS_DRIFT, detail: `Sprint "${sprintId}" in state but directory missing` });
      } else {
        findings.push({ check: `sprint-${sprintId}-dir`, result: STATUS_OK, detail: "directory exists" });
      }

      // If sprint is complete, check for completion evidence
      if (sprintState.status === "complete" || sprintState.status === "reviewing") {
        const completionDir = path.join(sprintDir, "completion");
        if (!fs.existsSync(completionDir) || fs.readdirSync(completionDir).length === 0) {
          findings.push({ check: `sprint-${sprintId}-completion`, result: STATUS_DRIFT, detail: `Sprint "${sprintId}" is ${sprintState.status} but no completion evidence` });
        }
      }
    }
  }

  // Check 5: phases_completed claims match artifacts
  if (state.phases_completed) {
    if (state.phases_completed.research) {
      const artifactPath = state.phases_completed.research.artifact_path;
      if (artifactPath && !fs.existsSync(path.resolve(pipelineDir, "..", artifactPath))) {
        findings.push({ check: "research-artifact", result: STATUS_DRIFT, detail: `Research artifact claimed at "${artifactPath}" but not found` });
      }
    }
    if (state.phases_completed.architecture) {
      const artifactPath = state.phases_completed.architecture.artifact_path;
      if (artifactPath && !fs.existsSync(path.resolve(pipelineDir, "..", artifactPath))) {
        findings.push({ check: "architecture-artifact", result: STATUS_DRIFT, detail: `Architecture artifact claimed at "${artifactPath}" but not found` });
      }
    }
  }

  // Check 6: config.yaml exists
  const configFile = path.join(pipelineDir, "config.yaml");
  if (!fs.existsSync(configFile)) {
    findings.push({ check: "config-exists", result: STATUS_DRIFT, detail: "config.yaml missing from .pipeline/" });
  } else {
    findings.push({ check: "config-exists", result: STATUS_OK, detail: "config.yaml exists" });
  }

  // Check 7: schema_version present
  if (!state.schema_version) {
    findings.push({ check: "schema-version", result: STATUS_DRIFT, detail: "state.yaml missing schema_version" });
  } else {
    findings.push({ check: "schema-version", result: STATUS_OK, detail: `v${state.schema_version}` });
  }

  const hasDrift = findings.some((f) => f.result === STATUS_DRIFT);
  return { status: hasDrift ? STATUS_DRIFT : STATUS_OK, findings };
}

/**
 * Format drift report as human-readable text.
 */
function formatReport(report) {
  const lines = [`Drift check: ${report.status}`];
  for (const f of report.findings) {
    const icon = f.result === STATUS_OK ? "+" : "!";
    lines.push(`  [${icon}] ${f.check}: ${f.detail}`);
  }
  return lines.join("\n");
}

// CLI entry point
if (require.main === module) {
  const pipelineDir = process.argv[2] || path.join(process.cwd(), ".pipeline");
  if (!fs.existsSync(pipelineDir)) {
    console.log("No .pipeline/ directory found. Run /init first.");
    process.exit(0);
  }
  const report = runDriftCheck(pipelineDir);
  console.log(formatReport(report));

  // Update last_verified in state
  const stateFile = path.join(pipelineDir, "state.yaml");
  const state = yamlIO.safeReadWithFallback(stateFile);
  if (state && state.session) {
    state.session.last_verified = new Date().toISOString();
    state.last_updated = new Date().toISOString();
    yamlIO.safeWrite(stateFile, state);
  }

  process.exit(report.status === STATUS_DRIFT ? 1 : 0);
}

module.exports = { runDriftCheck, formatReport };
