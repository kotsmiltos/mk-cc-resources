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

function readHistory(pipelineDir) {
  const p = path.join(pipelineDir, STATE_HISTORY_FILE);
  if (!fs.existsSync(p)) return null;
  return yaml.load(fs.readFileSync(p, "utf8"));
}

describe("enterReview — atomic sprint-complete → reviewing", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 3));
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
