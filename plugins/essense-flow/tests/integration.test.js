"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const stateMachine = require("../lib/state-machine");
const stateHistory = require("../lib/state-history");

// transitions.yaml lives at project root / references / transitions.yaml
const TRANSITIONS_SRC = path.join(ROOT, "references", "transitions.yaml");

/**
 * Create a minimal pipeline dir structure inside baseDir:
 *   baseDir/.pipeline/state.yaml   (initial idle state)
 *   baseDir/references/transitions.yaml  (copied from project root)
 *
 * state-machine.js resolves transitions.yaml as:
 *   path.join(path.dirname(pipelineDir), "references", "transitions.yaml")
 * so pipelineDir = baseDir/.pipeline and dirname = baseDir.
 */
function seedPipelineDir(baseDir) {
  const pipelineDir = path.join(baseDir, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  // Copy transitions.yaml so state-machine can resolve it
  const refsDir = path.join(baseDir, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(TRANSITIONS_SRC, path.join(refsDir, "transitions.yaml"));

  // Seed initial state.yaml with idle phase
  const yaml = require("js-yaml");
  fs.writeFileSync(
    path.join(pipelineDir, "state.yaml"),
    yaml.dump({
      schema_version: 1,
      pipeline: { phase: "idle", sprint: null, wave: null, task_in_progress: null },
      last_updated: new Date().toISOString(),
    }),
    "utf8"
  );

  return pipelineDir;
}

describe("pipeline state sequence (integration)", () => {
  let tmpDir, pipelineDir;

  // Full happy-path sequence from idle through reviewing.
  // Each step must be a valid transition per references/transitions.yaml.
  const SEQUENCE = [
    { to: "research",            trigger: "research-skill" },
    { to: "triaging",            trigger: "research-skill" },
    { to: "requirements-ready",  trigger: "triage-skill" },
    { to: "architecture",        trigger: "architecture-skill" },
    { to: "sprinting",           trigger: "architecture-skill" },
    { to: "sprint-complete",     trigger: "build-skill" },
    { to: "reviewing",           trigger: "review-skill" },
  ];

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-integration-"));
    pipelineDir = seedPipelineDir(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("full sequence transitions without error", () => {
    const yaml = require("js-yaml");
    for (const step of SEQUENCE) {
      const result = stateMachine.writeState(
        pipelineDir,
        step.to,
        {},
        { trigger: step.trigger }
      );
      assert.ok(result.ok, `Transition to "${step.to}" failed: ${result.error}`);

      const state = yaml.load(
        fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8")
      );
      assert.strictEqual(
        state.pipeline.phase,
        step.to,
        `Phase should be "${step.to}" after transition`
      );
    }
  });

  it("state-history.yaml has correct entry count", () => {
    const entries = stateHistory.readHistory(pipelineDir, 20);
    assert.strictEqual(
      entries.length,
      SEQUENCE.length,
      `Expected ${SEQUENCE.length} history entries, got ${entries.length}`
    );
  });

  it("each history entry has required fields", () => {
    const entries = stateHistory.readHistory(pipelineDir, 20);
    for (const entry of entries) {
      assert.ok(
        entry.from_state,
        `entry missing from_state: ${JSON.stringify(entry)}`
      );
      assert.ok(
        entry.to_state,
        `entry missing to_state: ${JSON.stringify(entry)}`
      );
      assert.ok(
        entry.trigger,
        `entry missing trigger: ${JSON.stringify(entry)}`
      );
      assert.ok(
        entry.timestamp,
        `entry missing timestamp: ${JSON.stringify(entry)}`
      );
    }
  });

  it("terminal state guard blocks transitions from complete", () => {
    const yaml = require("js-yaml");
    const termTmp = fs.mkdtempSync(path.join(os.tmpdir(), "essense-terminal-"));
    try {
      const pipelineDir2 = seedPipelineDir(termTmp);
      // Overwrite state to simulate a completed pipeline
      fs.writeFileSync(
        path.join(pipelineDir2, "state.yaml"),
        yaml.dump({
          schema_version: 1,
          pipeline: { phase: "complete" },
          last_updated: new Date().toISOString(),
        }),
        "utf8"
      );

      const result = stateMachine.writeState(
        pipelineDir2,
        "sprinting",
        {},
        { trigger: "test" }
      );

      assert.ok(!result.ok, "Must block transition from complete");
      // formatError("E_TERMINAL_STATE", ...) produces:
      //   "Cannot run {command} — pipeline is complete. Run /init to archive and reset."
      assert.ok(
        result.error && result.error.includes("pipeline is complete"),
        `Expected "pipeline is complete" in error, got: ${result.error}`
      );
    } finally {
      fs.rmSync(termTmp, { recursive: true, force: true });
    }
  });

  it("invalid transition returns transition error", () => {
    const yaml = require("js-yaml");
    const invalidTmp = fs.mkdtempSync(
      path.join(os.tmpdir(), "essense-invalid-")
    );
    try {
      const pipelineDir3 = seedPipelineDir(invalidTmp);
      // idle → sprint-complete is not a valid transition
      const result = stateMachine.writeState(
        pipelineDir3,
        "sprint-complete",
        {},
        { trigger: "test" }
      );

      assert.ok(!result.ok, "Must reject invalid transition from idle");
      // state-machine returns formatError("E_PHASE_INVALID", ...) which produces:
      //   "Cannot run {command} in phase "{phase}". Expected phase(s): ..."
      assert.ok(
        result.error &&
          (result.error.includes("Cannot run") ||
            result.error.includes("Expected phase") ||
            result.error.includes("phase")),
        `Expected a phase/transition error, got: ${result.error}`
      );
    } finally {
      fs.rmSync(invalidTmp, { recursive: true, force: true });
    }
  });
});
