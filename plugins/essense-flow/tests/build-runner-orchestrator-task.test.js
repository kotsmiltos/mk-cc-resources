"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const buildRunner = require("../skills/build/scripts/build-runner");

// ---------------------------------------------------------------------------
// Fixtures — task specs with and without the orchestrator_task flag.
// ---------------------------------------------------------------------------

const TASK_WITH_FLAG = `---
task_id: T-A-2b
sprint: A
wave: 3
title: "Baseline tetris pipeline replay"
depends_on: [T-A-1, T-A-2a]
leaf: true
orchestrator_task: true
---

# T-A-2b

This task requires orchestrator invocation because it calls /essense-flow:*
commands that a sub-agent cannot reach.
`;

const TASK_WITHOUT_FLAG = `---
task_id: T-A-1
sprint: A
wave: 1
title: "Regular leaf task"
depends_on: []
leaf: true
---

# T-A-1

A plain mechanical leaf task with no frontmatter flag.
`;

// Explicit opt-out — a task that sets orchestrator_task: false must NOT be
// treated as an orchestrator task.
const TASK_WITH_FLAG_FALSE = `---
task_id: T-A-3
sprint: A
orchestrator_task: false
leaf: true
---

# T-A-3

Explicitly opted out.
`;

describe("extractOrchestratorTaskFlag", () => {
  it("returns true when frontmatter has orchestrator_task: true", () => {
    const result = buildRunner.extractOrchestratorTaskFlag(TASK_WITH_FLAG);
    assert.equal(result, true);
  });

  it("returns false when frontmatter does not mention the flag", () => {
    const result = buildRunner.extractOrchestratorTaskFlag(TASK_WITHOUT_FLAG);
    assert.equal(result, false);
  });

  it("returns false when orchestrator_task is explicitly false", () => {
    const result = buildRunner.extractOrchestratorTaskFlag(TASK_WITH_FLAG_FALSE);
    assert.equal(result, false);
  });

  it("returns false for an empty or invalid input", () => {
    assert.equal(buildRunner.extractOrchestratorTaskFlag(""), false);
    assert.equal(buildRunner.extractOrchestratorTaskFlag(null), false);
    assert.equal(buildRunner.extractOrchestratorTaskFlag(undefined), false);
    assert.equal(buildRunner.extractOrchestratorTaskFlag(42), false);
  });

  it("returns false when the spec has no frontmatter at all", () => {
    const body = "# Plain Markdown\n\nNo frontmatter here.\n";
    assert.equal(buildRunner.extractOrchestratorTaskFlag(body), false);
  });

  it("detects the flag when loaded from an on-disk task file", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "build-runner-ot-"));
    try {
      const specPath = path.join(tmp, "T-A-2b.md");
      fs.writeFileSync(specPath, TASK_WITH_FLAG, "utf8");
      const spec = fs.readFileSync(specPath, "utf8");
      assert.equal(buildRunner.extractOrchestratorTaskFlag(spec), true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// recordCompletion — the new `deferred` status must be accepted by the
// validator and round-trip through the written YAML record.
// ---------------------------------------------------------------------------

describe("recordCompletion with status: deferred", () => {
  let tmpPipeline;

  before(() => {
    tmpPipeline = fs.mkdtempSync(path.join(os.tmpdir(), "build-runner-deferred-"));
  });

  after(() => {
    fs.rmSync(tmpPipeline, { recursive: true, force: true });
  });

  it("accepts status: deferred without error", () => {
    const sprintNumber = 1;
    const taskId = "T-A-2b";
    const evidence = {
      status: "deferred",
      files_created: [],
      files_modified: [],
      acceptance_criteria_met: [],
      reason: "requires orchestrator invocation — use the task's explicit command to run",
    };

    const result = buildRunner.recordCompletion(
      tmpPipeline,
      sprintNumber,
      taskId,
      evidence
    );

    assert.equal(result.ok, true, "recordCompletion should succeed for status: deferred");
    assert.ok(result.path, "recordCompletion should return the path of the written record");
    assert.ok(fs.existsSync(result.path), "Completion record file must exist on disk");
  });

  it("still rejects truly invalid statuses", () => {
    const result = buildRunner.recordCompletion(
      tmpPipeline,
      1,
      "T-BOGUS",
      { status: "pending" }
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /Invalid status/);
  });

  it("tallies deferred tasks separately in the sprint summary", () => {
    const summary = buildRunner.getSprintSummary(tmpPipeline, 1);
    assert.equal(summary.ok, true);
    assert.ok(typeof summary.deferred === "number", "Summary must include a `deferred` count");
    assert.ok(summary.deferred >= 1, "Deferred tally should reflect the recorded deferred task");

    const deferredEntry = summary.tasks.find((t) => t.status === "deferred");
    assert.ok(deferredEntry, "Summary tasks list must include the deferred task");
    assert.equal(deferredEntry.id, "T-A-2b");
  });
});
