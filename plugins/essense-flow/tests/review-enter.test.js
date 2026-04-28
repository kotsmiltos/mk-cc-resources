"use strict";

/**
 * Tests for review-runner.enterReview — atomic /review entry transition.
 *
 * Closes B5: sprint-complete → reviewing was previously not atomic with
 * QA-REPORT side effects. If /review exited before the entry transition
 * landed, phase=sprint-complete persisted and autopilot re-fired /review
 * forever (the spam pattern observed in field).
 *
 * Behavioural contract:
 * - phase=sprint-complete → enterReview transitions to reviewing,
 *   state-history records audit entry, returns {ok:true, transitioned:true}
 * - phase=reviewing → enterReview is idempotent no-op,
 *   returns {ok:true, transitioned:false, alreadyEntered:true}
 *   (resume after crash without bumping state-history)
 * - phase=anything-else → enterReview returns {ok:false, error},
 *   does NOT transition, does NOT touch state-history
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const { enterReview } = require("../skills/review/scripts/review-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-enter-"));
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

function readState(pipelineDir) {
  return yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
}

// Seed per-task completion records under sprints/sprint-N/completion/.
// I-04 readiness gate: enterReview refuses to transition without these.
// Tests that exercise the success path must call this; tests that exercise
// the refusal path must NOT.
function seedCompletionRecords(pipelineDir, sprintNumber, taskIds) {
  const dir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "completion");
  fs.mkdirSync(dir, { recursive: true });
  for (const taskId of taskIds) {
    fs.writeFileSync(
      path.join(dir, `${taskId}.yaml`),
      `task_id: ${taskId}\nstatus: complete\n`,
      "utf8"
    );
  }
}

function readHistory(pipelineDir) {
  const p = path.join(pipelineDir, STATE_HISTORY_FILE);
  if (!fs.existsSync(p)) return null;
  return yaml.load(fs.readFileSync(p, "utf8"));
}

describe("enterReview — atomic sprint-complete → reviewing", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 3));
    seedCompletionRecords(pipelineDir, 3, ["TASK-1", "TASK-2"]);
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("transitions phase from sprint-complete to reviewing", () => {
    const r = enterReview(pipelineDir, 3);
    assert.equal(r.ok, true, `enterReview returned: ${JSON.stringify(r)}`);
    assert.equal(r.transitioned, true);
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "reviewing");
  });

  it("appends an entry to state-history with trigger 'review-skill-entry'", () => {
    const history = readHistory(pipelineDir);
    assert.ok(history, "state-history.yaml should exist after a successful transition");
    assert.ok(Array.isArray(history.entries) && history.entries.length >= 1);
    const last = history.entries[history.entries.length - 1];
    assert.equal(last.from_state, "sprint-complete");
    assert.equal(last.to_state, "reviewing");
    assert.equal(last.trigger, "review-skill-entry");
    assert.equal(last.triggering_artifact, "sprint-3");
  });
});

describe("enterReview — idempotent when already in reviewing", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("reviewing", 3));
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns {ok:true, transitioned:false, alreadyEntered:true}", () => {
    const r = enterReview(pipelineDir, 3);
    assert.equal(r.ok, true);
    assert.equal(r.transitioned, false);
    assert.equal(r.alreadyEntered, true);
  });

  it("does NOT mutate state.yaml (phase still reviewing)", () => {
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "reviewing");
  });

  it("does NOT add a new entry to state-history (idempotent skip avoids audit-log spam)", () => {
    const history = readHistory(pipelineDir);
    // History may or may not exist depending on prior test setup; key check is
    // that enterReview itself didn't append anything when already-entered.
    if (history && Array.isArray(history.entries)) {
      // If a history entry exists, it can only be from prior setup, not from
      // enterReview (which short-circuits before writeState).
      const fromEnter = history.entries.filter(
        (e) => e.trigger === "review-skill-entry" && e.from_state === "reviewing"
      );
      assert.equal(fromEnter.length, 0, "enterReview must not write history when already-entered");
    }
  });
});

describe("enterReview — rejects from non-sprint-complete phases", () => {
  const invalidPhases = ["sprinting", "architecture", "decomposing", "triaging", "idle", "complete"];

  for (const phase of invalidPhases) {
    it(`returns {ok:false} when starting phase='${phase}'`, () => {
      const { tmpRoot, pipelineDir } = makeProject(phase, 1);
      try {
        const r = enterReview(pipelineDir, 1);
        assert.equal(r.ok, false);
        assert.match(r.error, /requires phase='sprint-complete'/);
        // State unchanged.
        const state = readState(pipelineDir);
        assert.equal(state.pipeline.phase, phase);
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    });
  }
});

describe("enterReview — exports", () => {
  it("is exported from review-runner", () => {
    const runner = require("../skills/review/scripts/review-runner");
    assert.equal(typeof runner.enterReview, "function");
  });
});

// ── I-04 readiness gate: refuse if completion records missing ────────────

describe("enterReview — refuses when sprint completion dir missing", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 4));
    // Intentionally do NOT seed completion records — directory doesn't exist
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with status:missing-completion-records", () => {
    const r = enterReview(pipelineDir, 4);
    assert.equal(r.ok, false);
    assert.equal(r.transitioned, false);
    assert.equal(r.status, "missing-completion-records");
    assert.match(r.error, /per-task completion records/);
    assert.match(r.error, /sprint-4[\\/]completion/);
  });

  it("does NOT transition phase (stays at sprint-complete)", () => {
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "sprint-complete");
  });

  it("does NOT write state-history (no transition occurred)", () => {
    const history = readHistory(pipelineDir);
    if (history && Array.isArray(history.entries)) {
      const fromEnter = history.entries.filter(
        (e) => e.trigger === "review-skill-entry"
      );
      assert.equal(fromEnter.length, 0);
    }
  });
});

describe("enterReview — refuses when sprint completion dir empty", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 5));
    // Create the dir but leave it empty
    const dir = path.join(pipelineDir, "sprints", "sprint-5", "completion");
    fs.mkdirSync(dir, { recursive: true });
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with status:missing-completion-records", () => {
    const r = enterReview(pipelineDir, 5);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });

  it("does NOT transition phase", () => {
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "sprint-complete");
  });
});

describe("enterReview — refuses when only non-record files present", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 6));
    const dir = path.join(pipelineDir, "sprints", "sprint-6", "completion");
    fs.mkdirSync(dir, { recursive: true });
    // Files present but neither .yaml nor .md — must not count as records
    fs.writeFileSync(path.join(dir, ".gitkeep"), "");
    fs.writeFileSync(path.join(dir, "notes.txt"), "scratch");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with status:missing-completion-records", () => {
    const r = enterReview(pipelineDir, 6);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });
});

describe("enterReview — accepts .md completion records (legacy shape)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 7));
    const dir = path.join(pipelineDir, "sprints", "sprint-7", "completion");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "TASK-A.md"), "# completion notes\n");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("transitions when at least one .md record exists", () => {
    const r = enterReview(pipelineDir, 7);
    assert.equal(r.ok, true);
    assert.equal(r.transitioned, true);
  });
});

describe("enterReview — readiness gate skipped when sprintNumber is null", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", null));
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("transitions without checking completion records (no sprint context)", () => {
    // Defensive: caller knows what it's doing if sprintNumber is null
    // (e.g. resume from external orchestrator). The gate is sprint-scoped;
    // can't check what doesn't have a known location.
    const r = enterReview(pipelineDir, null);
    assert.equal(r.ok, true);
    assert.equal(r.transitioned, true);
  });
});

describe("enterReview — idempotent reviewing skips readiness gate", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    // Phase already at reviewing — completion records may not exist yet
    // (e.g. crash recovery), but enterReview should not refuse on resume.
    ({ tmpRoot, pipelineDir } = makeProject("reviewing", 8));
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns alreadyEntered:true without checking completion records", () => {
    const r = enterReview(pipelineDir, 8);
    assert.equal(r.ok, true);
    assert.equal(r.alreadyEntered, true);
  });
});

// ── Auto-synthesize from SPRINT-REPORT.md / completion-report.md ──────────
//
// When the build phase improvises (writes a top-level summary instead of
// per-task completion records), enterReview synthesizes records from the
// task spec list + the source report, marks them synthetic:true, and
// proceeds. Closes the most reproducible failure mode of the v0.6.x
// build/review boundary (sprint-3.4, sprint-4 across two projects).

const reviewRunner = require("../skills/review/scripts/review-runner");

function seedTaskSpec(pipelineDir, sprintNumber, taskId) {
  const dir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "tasks");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${taskId}.md`),
    `# ${taskId}\n\nTask spec for ${taskId}.\n`,
    "utf8"
  );
}

function seedReport(pipelineDir, sprintNumber, name, body) {
  const dir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body || `# Sprint ${sprintNumber} report\n`, "utf8");
}

function readCompletionRecord(pipelineDir, sprintNumber, taskId) {
  const p = path.join(
    pipelineDir,
    "sprints",
    `sprint-${sprintNumber}`,
    "completion",
    `${taskId}.completion.yaml`
  );
  if (!fs.existsSync(p)) return null;
  return yaml.load(fs.readFileSync(p, "utf8"));
}

describe("enterReview — auto-synthesizes completion records from SPRINT-REPORT.md", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 10));
    seedTaskSpec(pipelineDir, 10, "TASK-001");
    seedTaskSpec(pipelineDir, 10, "TASK-002");
    seedReport(pipelineDir, 10, "SPRINT-REPORT.md");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("transitions to reviewing", () => {
    const r = enterReview(pipelineDir, 10);
    assert.equal(r.ok, true, `enterReview failed: ${JSON.stringify(r)}`);
    assert.equal(r.transitioned, true);
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "reviewing");
  });

  it("created one synthetic completion record per task spec", () => {
    const completionDir = path.join(pipelineDir, "sprints", "sprint-10", "completion");
    const records = fs.readdirSync(completionDir).filter((f) => f.endsWith(".completion.yaml"));
    assert.equal(records.length, 2);
  });

  it("records carry synthetic:true and reference the source report", () => {
    const rec = readCompletionRecord(pipelineDir, 10, "TASK-001");
    assert.ok(rec, "TASK-001.completion.yaml should exist");
    assert.equal(rec.synthetic, true);
    assert.equal(rec.task_id, "TASK-001");
    assert.equal(rec.status, "COMPLETE");
    assert.match(rec.synthesis_source, /SPRINT-REPORT\.md/);
  });
});

describe("enterReview — auto-synthesizes from completion-report.md (canonical name)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 11));
    seedTaskSpec(pipelineDir, 11, "TASK-A");
    seedReport(pipelineDir, 11, "completion-report.md");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("transitions and creates a synthetic record", () => {
    const r = enterReview(pipelineDir, 11);
    assert.equal(r.ok, true);
    assert.equal(r.transitioned, true);
    const rec = readCompletionRecord(pipelineDir, 11, "TASK-A");
    assert.ok(rec);
    assert.equal(rec.synthetic, true);
  });
});

describe("enterReview — synthesis still refuses when no report exists", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 12));
    // task specs but NO report — synthesis has nothing to anchor to
    seedTaskSpec(pipelineDir, 12, "TASK-A");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with missing-completion-records", () => {
    const r = enterReview(pipelineDir, 12);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });
});

describe("enterReview — synthesis refuses when no task specs exist", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 13));
    // report but no task specs — synthesis can't enumerate task IDs
    seedReport(pipelineDir, 13, "SPRINT-REPORT.md");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns ok:false with missing-completion-records", () => {
    const r = enterReview(pipelineDir, 13);
    assert.equal(r.ok, false);
    assert.equal(r.status, "missing-completion-records");
  });
});

describe("enterReview — synthesis ignores .agent.md sibling spec files", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 14));
    seedTaskSpec(pipelineDir, 14, "TASK-A");
    // also create a .agent.md sibling — must NOT generate a separate record
    const dir = path.join(pipelineDir, "sprints", "sprint-14", "tasks");
    fs.writeFileSync(path.join(dir, "TASK-A.agent.md"), "# agent variant\n");
    seedReport(pipelineDir, 14, "SPRINT-REPORT.md");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("creates exactly one synthetic record (one task), not two", () => {
    const r = enterReview(pipelineDir, 14);
    assert.equal(r.ok, true);
    const completionDir = path.join(pipelineDir, "sprints", "sprint-14", "completion");
    const records = fs.readdirSync(completionDir).filter((f) => f.endsWith(".completion.yaml"));
    assert.equal(records.length, 1);
  });
});

describe("synthesizeCompletionRecordsFromReport — direct unit test", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 15));
    seedTaskSpec(pipelineDir, 15, "TASK-X");
    seedTaskSpec(pipelineDir, 15, "TASK-Y");
    seedReport(pipelineDir, 15, "SPRINT-REPORT.md");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("returns {ok:true, created:N} with N == number of task specs", () => {
    const r = reviewRunner.synthesizeCompletionRecordsFromReport(pipelineDir, 15);
    assert.equal(r.ok, true);
    assert.equal(r.created, 2);
    assert.match(r.source, /SPRINT-REPORT\.md/);
  });

  it("is idempotent on re-run (does not overwrite existing records)", () => {
    const r2 = reviewRunner.synthesizeCompletionRecordsFromReport(pipelineDir, 15);
    assert.equal(r2.ok, true);
    assert.equal(r2.created, 0); // already exists
  });
});
