"use strict";

/**
 * Tests for build-runner.finalizeBuild — atomic post-sprint hand-off.
 *
 * finalizeBuild is the canonical-name alias of completeSprintExecution
 * (introduced for naming consistency with the other finalize* helpers
 * across skills). Both share the same atomic write+transition path:
 * generate completion-report.md AND transition `sprinting → sprint-complete`
 * via state-machine.writeState (which keeps state-history.yaml in sync).
 *
 * Background: previously the build runner bypassed state-machine.writeState
 * and wrote state.yaml directly via yamlIO.safeWrite — the audit trail in
 * state-history.yaml was not appended atomically. Refactor consolidates
 * that path so all skills now use the same atomic finalize* mechanism.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const buildRunner = require("../skills/build/scripts/build-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-build-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: sprintNumber, wave: null, task_in_progress: null },
    sprints: {},
    blocked_on: null,
    session: {},
  };
  fs.writeFileSync(path.join(pipelineDir, STATE_FILE), yaml.dump(state), "utf8");

  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  return { tmpRoot, pipelineDir };
}

// I-10 producer-side gate: completeSprintExecution refuses to transition
// without per-task completion records on disk. Tests that exercise paths
// past the gate must seed records explicitly; tests that exercise the
// refusal must NOT.
function seedCompletionRecords(pipelineDir, sprintNumber, taskIds) {
  const dir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "completion");
  fs.mkdirSync(dir, { recursive: true });
  for (const taskId of taskIds) {
    fs.writeFileSync(
      path.join(dir, `${taskId}.completion.yaml`),
      `task_id: ${taskId}\nstatus: complete\n`,
      "utf8"
    );
  }
}

const goodCompletions = [
  { task_id: "TASK-A", sprint: 1, status: "COMPLETE", files_written: "", deviations: "none", verification: "", completed_at: new Date().toISOString() },
];

describe("finalizeBuild — atomic write + transition (sprinting → sprint-complete)", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 1));
    seedCompletionRecords(pipelineDir, 1, ["TASK-A"]);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:true and writes completion-report.md atomically with transition", () => {
    const result = buildRunner.finalizeBuild(pipelineDir, 1, goodCompletions, {}, null);
    assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
    assert.ok(result.report);
    assert.ok(result.report.reportPath.endsWith("completion-report.md"));
    assert.equal(result.nextAction, "/review");
  });

  it("state.yaml phase is now 'sprint-complete'", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprint-complete");
    assert.ok(state.pipeline.completion_evidence.includes("completion-report.md"));
  });

  it("state-history.yaml records sprinting → sprint-complete with completion-report artifact", () => {
    const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    assert.ok(fs.existsSync(histPath), "state-history.yaml must exist");
    const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
    const last = hist.entries[hist.entries.length - 1];
    assert.equal(last.from_state, "sprinting");
    assert.equal(last.to_state, "sprint-complete");
    assert.match(last.triggering_artifact || "", /completion-report\.md/);
  });
});

describe("finalizeBuild — phase guard", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Wrong starting phase — finalizeBuild should reject the transition.
    // Seed completion records so the I-10 gate passes; the test exercises
    // the writeState phase guard, NOT the missing-records refusal.
    ({ tmpRoot, pipelineDir } = makeProject("idle", 2));
    seedCompletionRecords(pipelineDir, 2, ["TASK-A"]);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'sprinting'", () => {
    const result = buildRunner.finalizeBuild(pipelineDir, 2, goodCompletions, {}, null);
    assert.equal(result.ok, false);
    assert.ok(typeof result.reason === "string" && result.reason.length > 0);
  });

  it("completion-report.md still written even when transition fails (preserves work)", () => {
    const reportPath = path.join(pipelineDir, "sprints", "sprint-2", "completion-report.md");
    assert.ok(fs.existsSync(reportPath), "completion-report.md preserved on transition failure");
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "idle");
  });
});

describe("finalizeBuild — failed completions short-circuit", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Seed records so I-10 missing-records gate doesn't pre-empt the
    // failed-tasks check this test is actually exercising.
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 3));
    seedCompletionRecords(pipelineDir, 3, ["TASK-X"]);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false with reason listing failed tasks; does not transition", () => {
    const failedCompletions = [
      { task_id: "TASK-X", sprint: 3, status: "FAILED", files_written: "", deviations: "none", verification: "", completed_at: new Date().toISOString() },
    ];
    const result = buildRunner.finalizeBuild(pipelineDir, 3, failedCompletions, {}, null);
    assert.equal(result.ok, false);
    assert.match(result.reason, /failed/);

    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});

// ── I-10 producer-side gate: missing per-task completion records ─────────

describe("finalizeBuild — refuses when completion dir missing", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    // Phase=sprinting, completions[] non-empty, but NO records on disk.
    // Reproduces the bug: orchestrator wrote SPRINT-REPORT.md and called
    // writeState directly, skipping recordCompletion. completeSprintExecution
    // must catch this BEFORE transitioning.
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 4));
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with status:missing-completion-records", () => {
    const r = buildRunner.finalizeBuild(pipelineDir, 4, goodCompletions, {}, null);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
    assert.match(r.reason, /no per-task completion records on disk/);
  });

  it("does NOT transition phase (stays at sprinting)", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });

  it("does NOT write completion-report.md (refuse before generation)", () => {
    const reportPath = path.join(pipelineDir, "sprints", "sprint-4", "completion-report.md");
    assert.equal(fs.existsSync(reportPath), false);
  });

  it("does NOT write state-history (refuse before transition)", () => {
    const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    assert.equal(fs.existsSync(histPath), false);
  });
});

describe("finalizeBuild — refuses when completion dir empty", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 5));
    // Dir exists but no records
    fs.mkdirSync(path.join(pipelineDir, "sprints", "sprint-5", "completion"), { recursive: true });
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with status:missing-completion-records", () => {
    const r = buildRunner.finalizeBuild(pipelineDir, 5, goodCompletions, {}, null);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });
});

describe("finalizeBuild — refuses when completions array is empty", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 6));
    seedCompletionRecords(pipelineDir, 6, ["TASK-A"]);  // disk OK
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false on empty completions[] argument", () => {
    const r = buildRunner.finalizeBuild(pipelineDir, 6, [], {}, null);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
    assert.match(r.reason, /non-empty completions/);
  });

  it("does NOT transition phase", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});

describe("finalizeBuild — refuses on non-array completions", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 7));
    seedCompletionRecords(pipelineDir, 7, ["TASK-A"]);
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false when completions is null", () => {
    const r = buildRunner.finalizeBuild(pipelineDir, 7, null, {}, null);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });

  it("returns ok:false when completions is undefined", () => {
    const r = buildRunner.finalizeBuild(pipelineDir, 7, undefined, {}, null);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });
});
