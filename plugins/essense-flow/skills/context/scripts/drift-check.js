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

// Maps drift check names to repair actions
const REPAIR_ACTIONS = {
  "phase-valid": {
    description: "Reset phase to idle",
    apply: (pipelineDir, _finding) => {
      const stateFile = path.join(pipelineDir, "state.yaml");
      const state = yamlIO.safeReadWithFallback(stateFile);
      if (state && state.pipeline) {
        state.pipeline.phase = "idle";
        state.last_updated = new Date().toISOString();
        yamlIO.safeWrite(stateFile, state);
      }
    },
  },
  "requirements-exist": {
    description: "Flag: re-run /research to regenerate requirements",
    apply: null, // cannot auto-repair — needs user to run /research
  },
  "elicitation-state-exists": {
    description: "Create empty elicitation state file",
    apply: (pipelineDir, _finding) => {
      const elicitDir = path.join(pipelineDir, "elicitation");
      if (!fs.existsSync(elicitDir)) fs.mkdirSync(elicitDir, { recursive: true });
      yamlIO.safeWrite(path.join(elicitDir, "state.yaml"), {
        schema_version: 1,
        status: "active",
        current_round: 0,
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        seed: "",
        explored: {},
        deferred: [],
        decisions: [],
      });
    },
  },
  "sprint-dir-exists": {
    description: "Create missing sprint directory with standard structure",
    apply: (pipelineDir, finding) => {
      // Extract sprint number from finding detail
      const match = finding.detail.match(/sprint[- ](\d+)/i);
      const sprintNum = match ? match[1].padStart(2, "0") : "01";
      const sprintDir = path.join(pipelineDir, "sprints", `sprint-${sprintNum}`);
      fs.mkdirSync(path.join(sprintDir, "tasks"), { recursive: true });
      fs.mkdirSync(path.join(sprintDir, "completion"), { recursive: true });
    },
  },
  "config-exists": {
    description: "Re-initialize config from defaults",
    apply: (pipelineDir, _finding) => {
      const pluginRoot = path.resolve(__dirname, "..", "..", "..");
      const defaultConfig = path.join(pluginRoot, "defaults", "config.yaml");
      if (fs.existsSync(defaultConfig)) {
        const config = yamlIO.safeRead(defaultConfig);
        // Null guard — safeRead returns null on parse error / read failure.
        // defaults/config.yaml is bundled so corruption is unlikely, but
        // crashing here would mask the actual repair failure with a NPE.
        if (!config || !config.pipeline) return;
        config.pipeline.created_at = new Date().toISOString();
        yamlIO.safeWrite(path.join(pipelineDir, "config.yaml"), config);
      }
    },
  },
  "verification-report-exists": {
    description: "Cannot auto-repair — re-run /verify to regenerate the verification report",
    apply: null,
  },
  "schema-version": {
    description: "Add schema_version: 1 to state.yaml",
    apply: (pipelineDir, _finding) => {
      const stateFile = path.join(pipelineDir, "state.yaml");
      const state = yamlIO.safeReadWithFallback(stateFile);
      if (state) {
        state.schema_version = 1;
        state.last_updated = new Date().toISOString();
        yamlIO.safeWrite(stateFile, state);
      }
    },
  },
};

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
    "idle", "eliciting", "research", "triaging", "requirements-ready",
    "architecture", "decomposing", "sprinting", "sprint-complete",
    "reviewing", "verifying", "complete",
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

  // Check 3a: If phase is eliciting, elicitation state should exist
  if (phase === "eliciting") {
    const elicitStateFile = path.join(pipelineDir, "elicitation", "state.yaml");
    if (!fs.existsSync(elicitStateFile)) {
      findings.push({ check: "elicitation-state-exists", result: STATUS_DRIFT, detail: "Phase is eliciting but elicitation/state.yaml not found" });
    } else {
      findings.push({ check: "elicitation-state-exists", result: STATUS_OK, detail: "elicitation/state.yaml exists" });
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
    if (state.phases_completed.verify) {
      const verificationReport = path.join(pipelineDir, "VERIFICATION-REPORT.md");
      if (!fs.existsSync(verificationReport)) {
        findings.push({ check: "verification-report-exists", result: STATUS_DRIFT, detail: "phases_completed.verify is set but VERIFICATION-REPORT.md not found — re-run /verify" });
      } else {
        findings.push({ check: "verification-report-exists", result: STATUS_OK, detail: "VERIFICATION-REPORT.md exists" });
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

/**
 * Generate repair actions for drift findings and apply selected ones.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {Array} findings — drift findings from runDriftCheck
 * @returns {{ repairsAvailable: Array<{check, description, canAutoRepair}>, repairsApplied: Array<string>, remaining: Array }}
 */
function repairDrift(pipelineDir, findings) {
  const driftFindings = findings.filter(f => f.result === STATUS_DRIFT);

  const repairsAvailable = [];

  for (const finding of driftFindings) {
    // Check for exact match first, then prefix match for sprint-specific checks
    let action = REPAIR_ACTIONS[finding.check];
    if (!action) {
      // Try prefix matching (e.g., "sprint-01-dir" matches "sprint-dir-exists" pattern)
      if (finding.check.match(/^sprint-.*-dir$/)) action = REPAIR_ACTIONS["sprint-dir-exists"];
      if (finding.check.match(/^sprint-.*-completion$/)) action = REPAIR_ACTIONS["sprint-dir-exists"]; // same repair
      if (finding.check === "research-artifact") action = { description: "Remove stale research artifact path from state", apply: (pd) => {
        const state = yamlIO.safeReadWithFallback(path.join(pd, "state.yaml"));
        if (state && state.phases_completed && state.phases_completed.research) {
          state.phases_completed.research = null;
          state.last_updated = new Date().toISOString();
          yamlIO.safeWrite(path.join(pd, "state.yaml"), state);
        }
      }};
      if (finding.check === "architecture-artifact") action = { description: "Remove stale architecture artifact path from state", apply: (pd) => {
        const state = yamlIO.safeReadWithFallback(path.join(pd, "state.yaml"));
        if (state && state.phases_completed && state.phases_completed.architecture) {
          state.phases_completed.architecture = null;
          state.last_updated = new Date().toISOString();
          yamlIO.safeWrite(path.join(pd, "state.yaml"), state);
        }
      }};
    }

    if (action) {
      repairsAvailable.push({
        check: finding.check,
        detail: finding.detail,
        description: action.description,
        canAutoRepair: action.apply !== null,
        apply: action.apply,
      });
    }
  }

  // Apply auto-repairable actions
  const repairsApplied = [];
  for (const repair of repairsAvailable) {
    if (repair.canAutoRepair && repair.apply) {
      try {
        repair.apply(pipelineDir, { check: repair.check, detail: repair.detail });
        repairsApplied.push(repair.check);
      } catch (e) {
        // Log but don't fail
        console.error(`Repair failed for ${repair.check}: ${e.message}`);
      }
    }
  }

  // Re-run drift check to see what remains
  const recheck = runDriftCheck(pipelineDir);
  const remaining = recheck.findings.filter(f => f.result === STATUS_DRIFT);

  return { repairsAvailable, repairsApplied, remaining };
}

// CLI entry point
if (require.main === module) {
  const pipelineDir = process.argv[2] || path.join(process.cwd(), ".pipeline");
  const repairMode = process.argv.includes("--repair");

  if (!fs.existsSync(pipelineDir)) {
    console.log("No .pipeline/ directory found. Run /init first.");
    process.exit(0);
  }

  const report = runDriftCheck(pipelineDir);
  console.log(formatReport(report));

  if (repairMode && report.status === STATUS_DRIFT) {
    console.log("\nRepair mode enabled. Applying available repairs...\n");
    const result = repairDrift(pipelineDir, report.findings);

    console.log(`Repairs applied: ${result.repairsApplied.length}`);
    for (const r of result.repairsApplied) {
      console.log(`  [+] ${r}`);
    }

    if (result.remaining.length > 0) {
      console.log(`\nRemaining drift (${result.remaining.length}):`);
      for (const f of result.remaining) {
        console.log(`  [!] ${f.check}: ${f.detail}`);
      }
    } else {
      console.log("\nAll drift resolved.");
    }

    // Update last_verified
    const stateFile = path.join(pipelineDir, "state.yaml");
    const state = yamlIO.safeReadWithFallback(stateFile);
    if (state && state.session) {
      state.session.last_verified = new Date().toISOString();
      state.last_updated = new Date().toISOString();
      yamlIO.safeWrite(stateFile, state);
    }

    process.exit(result.remaining.length > 0 ? 1 : 0);
  }

  // Non-repair mode: just update last_verified and exit
  const stateFile = path.join(pipelineDir, "state.yaml");
  const state = yamlIO.safeReadWithFallback(stateFile);
  if (state && state.session) {
    state.session.last_verified = new Date().toISOString();
    state.last_updated = new Date().toISOString();
    yamlIO.safeWrite(stateFile, state);
  }

  process.exit(report.status === STATUS_DRIFT ? 1 : 0);
}

module.exports = { runDriftCheck, formatReport, REPAIR_ACTIONS, repairDrift };
