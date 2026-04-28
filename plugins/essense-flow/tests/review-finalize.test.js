"use strict";

/**
 * Tests for review-runner.finalizeReview — atomic post-review hand-off.
 *
 * Background: previously, /review workflow had separate "write QA-REPORT"
 * and "transition reviewing → triaging" steps. Orchestrator stopped between
 * them, leaving phase=reviewing with QA-REPORT.md present. autopilot then
 * looped /review (regression in v0.2.0) or halted waiting on user.
 *
 * finalizeReview combines both into one call so the orchestrator cannot
 * stop between writing the report and advancing the phase.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const { finalizeReview, writeQAReport } = require("../skills/review/scripts/review-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  // Seed state.yaml with the requested starting phase.
  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: sprintNumber, wave: null, task_in_progress: null },
    sprints: {},
    blocked_on: null,
    session: {},
  };
  fs.writeFileSync(path.join(pipelineDir, STATE_FILE), yaml.dump(state), "utf8");

  // Copy transitions.yaml to <projectRoot>/references/transitions.yaml so
  // state-machine.writeState can resolve it.
  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  return { tmpRoot, pipelineDir };
}

describe("finalizeReview — atomic write + transition (happy path)", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("reviewing", 2));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:true with qaReportPath and transitioned:true", () => {
    const result = finalizeReview(pipelineDir, 2, "# QA Report\n\nstub content\n");
    assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
    assert.equal(result.transitioned, true);
    assert.ok(result.qaReportPath.endsWith("QA-REPORT.md"));
    assert.ok(!result.error);
  });

  it("QA-REPORT.md exists on disk after finalize", () => {
    const qa = path.join(pipelineDir, "reviews", "sprint-02", "QA-REPORT.md");
    assert.ok(fs.existsSync(qa), `QA-REPORT.md must exist at ${qa}`);
    const body = fs.readFileSync(qa, "utf8");
    assert.match(body, /QA Report/);
  });

  it("state.yaml phase is now 'triaging'", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "triaging", "phase must be 'triaging' after finalize");
  });

  it("state-history.yaml records reviewing → triaging with QA-REPORT artifact", () => {
    const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    assert.ok(fs.existsSync(histPath), "state-history.yaml must be written");
    const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
    const last = hist.entries[hist.entries.length - 1];
    assert.equal(last.from_state, "reviewing");
    assert.equal(last.to_state, "triaging");
    assert.match(last.triggering_artifact || "", /QA-REPORT\.md/);
  });
});

describe("finalizeReview — phase guard", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Wrong starting phase — finalizeReview should reject
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 3));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'reviewing'", () => {
    const result = finalizeReview(pipelineDir, 3, "# QA stub\n");
    assert.equal(result.ok, false, "expected ok:false when phase != reviewing");
    assert.equal(result.transitioned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  it("QA-REPORT is still written even when transition fails (preserves work)", () => {
    // The atomic guarantee is "do both or report which step failed", not
    // "rollback the file write". The QA-REPORT remains so the user can
    // recover the state manually.
    const qa = path.join(pipelineDir, "reviews", "sprint-03", "QA-REPORT.md");
    assert.ok(fs.existsSync(qa), "QA-REPORT.md must be preserved on transition failure");
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting", "phase must NOT change when transition rejected");
  });
});
