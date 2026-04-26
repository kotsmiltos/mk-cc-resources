"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const yamlIO = require("../lib/yaml-io");
const dispatch = require("../lib/dispatch");
const buildRunner = require("../skills/build/scripts/build-runner");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
const TMP_DIR = path.join(__dirname, "__tmp_build_integration__");

// --- Fixture helpers ---

/**
 * Build a task spec .md with --- fenced frontmatter.
 * Uses `> **field:** value` style within the frontmatter block
 * so extractFrontmatterField can parse depends_on.
 */
function buildSpecMd(taskId, sprint, dependsOn) {
  return [
    "---",
    `> **type:** task-spec`,
    `> **sprint:** ${sprint}`,
    `> **depends_on:** ${dependsOn}`,
    "---",
    "",
    `## Goal`,
    "",
    `Implement ${taskId}.`,
    "",
  ].join("\n");
}

/**
 * Build a minimal .agent.md file for a task.
 */
function buildAgentMd(label) {
  return [
    `## IDENTITY`,
    `Build task ${label}.`,
    "",
    `## ACCEPTANCE CRITERIA`,
    `- [ ] Task works`,
    "",
  ].join("\n");
}

/**
 * Produce a simulated agent output string using the XML envelope with sentinel.
 */
function simulatedAgentOutput(briefId, agentId, opts = {}) {
  const impl = opts.implementation || `Built ${agentId}`;
  const files = opts.filesWritten || `src/${agentId}.js`;
  const deviations = opts.deviations || "none";
  const verification = opts.verification || "All criteria passed";
  const criteriaMet = opts.criteriaMet || "1,2,3";

  return [
    "<agent-output>",
    "  <meta>",
    `    <brief_id>${briefId}</brief_id>`,
    `    <agent_id>${agentId}</agent_id>`,
    "    <phase>build</phase>",
    "  </meta>",
    "  <payload>",
    `    <implementation>${impl}</implementation>`,
    `    <files-written>${files}</files-written>`,
    `    <deviations>${deviations}</deviations>`,
    `    <verification>${verification}</verification>`,
    "  </payload>",
    "  <self-assessment>",
    `    <criteria_met>${criteriaMet}</criteria_met>`,
    "    <criteria_uncertain></criteria_uncertain>",
    "    <criteria_failed></criteria_failed>",
    "    <deviations>None</deviations>",
    "  </self-assessment>",
    "</agent-output>",
    `<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`,
  ].join("\n");
}

// --- Tests ---

describe("build integration: planExecution constructs waves from task specs", () => {
  const TASKS_DIR = path.join(TMP_DIR, "tasks");

  before(() => {
    fs.mkdirSync(TASKS_DIR, { recursive: true });

    // Task A: no dependencies
    fs.writeFileSync(path.join(TASKS_DIR, "task-a.md"), buildSpecMd("task-a", 1, "None"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-a.agent.md"), buildAgentMd("A"), "utf8");

    // Task B: depends on task-a
    fs.writeFileSync(path.join(TASKS_DIR, "task-b.md"), buildSpecMd("task-b", 1, "task-a"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-b.agent.md"), buildAgentMd("B"), "utf8");

    // Task C: depends on task-a
    fs.writeFileSync(path.join(TASKS_DIR, "task-c.md"), buildSpecMd("task-c", 1, "task-a"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-c.agent.md"), buildAgentMd("C"), "utf8");
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("produces two waves: [task-a] then [task-b, task-c]", () => {
    const result = buildRunner.planExecution(TMP_DIR, CONFIG);

    assert.equal(result.ok, true, `planExecution should succeed: ${result.error || ""}`);
    assert.equal(result.waves.length, 2, "Should have exactly 2 waves");

    // Wave 0: only task-a (no dependencies)
    assert.deepEqual(result.waves[0], ["task-a"]);

    // Wave 1: task-b and task-c (order within wave may vary)
    const wave1Sorted = [...result.waves[1]].sort();
    assert.deepEqual(wave1Sorted, ["task-b", "task-c"]);
  });

  it("includes all 3 task IDs in briefs", () => {
    const result = buildRunner.planExecution(TMP_DIR, CONFIG);

    assert.equal(result.ok, true);
    const briefIds = Object.keys(result.briefs).sort();
    assert.deepEqual(briefIds, ["task-a", "task-b", "task-c"]);
  });
});

describe("build integration: assembleWaveBriefs prepares briefs within budget", () => {
  const TASKS_DIR = path.join(TMP_DIR, "tasks");

  before(() => {
    fs.mkdirSync(TASKS_DIR, { recursive: true });

    fs.writeFileSync(path.join(TASKS_DIR, "task-a.md"), buildSpecMd("task-a", 1, "None"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-a.agent.md"), buildAgentMd("A"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-b.md"), buildSpecMd("task-b", 1, "task-a"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-b.agent.md"), buildAgentMd("B"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-c.md"), buildSpecMd("task-c", 1, "task-a"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-c.agent.md"), buildAgentMd("C"), "utf8");
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("assembles wave 0 briefs with architecture context", () => {
    const plan = buildRunner.planExecution(TMP_DIR, CONFIG);
    assert.equal(plan.ok, true);

    const archContext = "## Architecture\nUse modular design with clear interfaces.";
    const result = buildRunner.assembleWaveBriefs(plan.waves[0], plan.briefs, archContext, CONFIG);

    assert.equal(result.ok, true, `assembleWaveBriefs should succeed: ${result.error || ""}`);
    assert.equal(result.assembled.length, plan.waves[0].length);

    // Each assembled brief should contain the architecture context
    for (const entry of result.assembled) {
      assert.ok(
        entry.brief.includes("modular design"),
        `Brief for ${entry.taskId} should contain architecture context`
      );
      assert.ok(
        entry.brief.includes("architecture-context"),
        `Brief for ${entry.taskId} should contain architecture-context data-block label`
      );
    }
  });

  it("assembles wave 1 briefs without architecture context", () => {
    const plan = buildRunner.planExecution(TMP_DIR, CONFIG);
    assert.equal(plan.ok, true);

    const result = buildRunner.assembleWaveBriefs(plan.waves[1], plan.briefs, null, CONFIG);

    assert.equal(result.ok, true);
    assert.equal(result.assembled.length, plan.waves[1].length);
  });
});

describe("build integration: recordCompletion writes .completion.yaml", () => {
  before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("writes completion file and returns COMPLETE record", () => {
    const output = simulatedAgentOutput("test-brief-001", "task-a");
    const record = buildRunner.recordCompletion(TMP_DIR, 1, "task-a", output);

    assert.equal(record.status, buildRunner.COMPLETION_STATUS.COMPLETE);
    assert.equal(record.task_id, "task-a");
    assert.equal(record.sprint, 1);

    // Verify the file was written to disk
    const completionPath = path.join(TMP_DIR, "sprints", "sprint-1", "completion", "task-a.completion.yaml");
    assert.ok(fs.existsSync(completionPath), "Completion YAML should exist on disk");

    const loaded = yamlIO.safeRead(completionPath);
    assert.equal(loaded.status, buildRunner.COMPLETION_STATUS.COMPLETE);
    assert.equal(loaded.task_id, "task-a");
  });

  it("captures deviations from agent output", () => {
    const output = simulatedAgentOutput("brief-dev", "task-dev", {
      deviations: "Changed return type from string to object",
    });
    const record = buildRunner.recordCompletion(TMP_DIR, 1, "task-dev", output);

    assert.equal(record.deviations, "Changed return type from string to object");
  });

  it("records files_written from agent output", () => {
    const output = simulatedAgentOutput("brief-files", "task-files", {
      filesWritten: "src/mod.js, src/mod.test.js",
    });
    const record = buildRunner.recordCompletion(TMP_DIR, 1, "task-files", output);

    assert.ok(record.files_written.includes("src/mod.js"));
    assert.ok(record.files_written.includes("src/mod.test.js"));
  });

  it("marks malformed output as FAILED", () => {
    const brokenOutput = "this is not valid agent output at all";
    const record = buildRunner.recordCompletion(TMP_DIR, 1, "task-broken", brokenOutput);

    assert.equal(record.status, buildRunner.COMPLETION_STATUS.FAILED);
  });
});

describe("build integration: generateCompletionReport produces summary", () => {
  before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("generates report with correct counts", () => {
    const completions = [
      {
        task_id: "task-a",
        sprint: 1,
        status: buildRunner.COMPLETION_STATUS.COMPLETE,
        files_written: "src/a.js",
        deviations: buildRunner.NO_DEVIATIONS,
        verification: "Passed",
      },
      {
        task_id: "task-b",
        sprint: 1,
        status: buildRunner.COMPLETION_STATUS.COMPLETE,
        files_written: "src/b.js",
        deviations: "Minor interface change",
        verification: "Passed",
      },
      {
        task_id: "task-c",
        sprint: 1,
        status: buildRunner.COMPLETION_STATUS.FAILED,
        files_written: "",
        deviations: buildRunner.NO_DEVIATIONS,
        verification: "Failed criterion 2",
      },
    ];

    const report = buildRunner.generateCompletionReport(TMP_DIR, 1, completions);

    assert.equal(report.completed, 2);
    assert.equal(report.failed, 1);
    assert.equal(report.deviations, 1, "Only task-b has non-'none' deviations");

    // Verify the report file was written
    assert.ok(fs.existsSync(report.reportPath), "Report file should exist");
    const content = fs.readFileSync(report.reportPath, "utf8");
    assert.ok(content.includes("Sprint 1 Completion Report"));
    assert.ok(content.includes("Tasks completed:** 2 / 3"));
    assert.ok(content.includes("Tasks failed:** 1"));
    assert.ok(content.includes("Tasks with deviations:** 1"));
  });

  it("handles all-complete scenario", () => {
    const completions = [
      {
        task_id: "task-x",
        sprint: 2,
        status: buildRunner.COMPLETION_STATUS.COMPLETE,
        files_written: "src/x.js",
        deviations: buildRunner.NO_DEVIATIONS,
        verification: "OK",
      },
    ];

    const report = buildRunner.generateCompletionReport(TMP_DIR, 2, completions);

    assert.equal(report.completed, 1);
    assert.equal(report.failed, 0);
    assert.equal(report.deviations, 0);
  });
});

describe("build integration: overflow detection flags large files", () => {
  const OVERFLOW_DIR = path.join(TMP_DIR, "overflow-int");

  before(() => {
    fs.mkdirSync(OVERFLOW_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("flags file exceeding backstop", () => {
    const backstop = CONFIG.overflow.file_lines_backstop;
    const overflowLineCount = backstop + 50;
    const bigFile = path.join(OVERFLOW_DIR, "overflow-module.js");
    const lines = Array.from({ length: overflowLineCount }, (_, i) => `// line ${i + 1}`);
    fs.writeFileSync(bigFile, lines.join("\n"), "utf8");

    const record = { files_written: bigFile };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 1);
    assert.equal(result.overflows[0].file, bigFile);
    assert.ok(
      result.overflows[0].lines > backstop,
      `Expected ${result.overflows[0].lines} lines > ${backstop} backstop`
    );
    assert.equal(result.overflows[0].backstop, backstop);
  });

  it("does not flag file within backstop", () => {
    const backstop = CONFIG.overflow.file_lines_backstop;
    const safeLineCount = backstop - 50;
    const safeFile = path.join(OVERFLOW_DIR, "safe-module.js");
    const lines = Array.from({ length: safeLineCount }, (_, i) => `// line ${i + 1}`);
    fs.writeFileSync(safeFile, lines.join("\n"), "utf8");

    const record = { files_written: safeFile };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 0);
  });
});

describe("build integration: wave failure handling detects terminal state", () => {
  it("returns terminal: true when all agents FAILED", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["task-a", "task-b", "task-c"]];

    dispatch.updateAgentState(state, "task-a", { status: dispatch.AGENT_STATUS.FAILED });
    dispatch.updateAgentState(state, "task-b", { status: dispatch.AGENT_STATUS.FAILED });
    dispatch.updateAgentState(state, "task-c", { status: dispatch.AGENT_STATUS.FAILED });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, true);
    assert.equal(result.failed, 3);
    assert.equal(result.completed, 0);
  });

  it("returns terminal: true with mixed settled (some complete, some failed)", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["task-a", "task-b"]];

    dispatch.updateAgentState(state, "task-a", { status: dispatch.AGENT_STATUS.COMPLETE });
    dispatch.updateAgentState(state, "task-b", { status: dispatch.AGENT_STATUS.FAILED });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, true);
    assert.equal(result.failed, 1);
    assert.equal(result.completed, 1);
  });

  it("returns canAdvance: true when all agents COMPLETE", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["task-a", "task-b"]];

    dispatch.updateAgentState(state, "task-a", { status: dispatch.AGENT_STATUS.COMPLETE });
    dispatch.updateAgentState(state, "task-b", { status: dispatch.AGENT_STATUS.COMPLETE });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, false);
    assert.equal(result.canAdvance, true);
  });

  it("returns canAdvance: false when agents still running", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["task-a", "task-b"]];

    dispatch.updateAgentState(state, "task-a", { status: dispatch.AGENT_STATUS.COMPLETE });
    dispatch.updateAgentState(state, "task-b", { status: dispatch.AGENT_STATUS.RUNNING });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, false);
    assert.equal(result.canAdvance, false);
    assert.equal(result.running, 1);
  });
});

describe("build integration: end-to-end pipeline flow", () => {
  const TASKS_DIR = path.join(TMP_DIR, "tasks");

  before(() => {
    fs.mkdirSync(TASKS_DIR, { recursive: true });

    fs.writeFileSync(path.join(TASKS_DIR, "task-a.md"), buildSpecMd("task-a", 1, "None"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-a.agent.md"), buildAgentMd("A"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-b.md"), buildSpecMd("task-b", 1, "task-a"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-b.agent.md"), buildAgentMd("B"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-c.md"), buildSpecMd("task-c", 1, "task-a"), "utf8");
    fs.writeFileSync(path.join(TASKS_DIR, "task-c.agent.md"), buildAgentMd("C"), "utf8");
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("runs full pipeline: plan -> assemble -> dispatch -> record -> report", () => {
    // Step 1: Plan execution
    const plan = buildRunner.planExecution(TMP_DIR, CONFIG);
    assert.equal(plan.ok, true, `planExecution failed: ${plan.error || ""}`);
    assert.equal(plan.waves.length, 2);

    // Step 2: Assemble briefs for wave 0
    const archContext = "Modular architecture with dependency injection.";
    const wave0Briefs = buildRunner.assembleWaveBriefs(plan.waves[0], plan.briefs, archContext, CONFIG);
    assert.equal(wave0Briefs.ok, true);

    // Step 3: Simulate agent dispatch for wave 0
    const state = dispatch.createDispatchState("build", 0);
    const wave0Result = buildRunner.executeWave(state, 0, plan.waves, TMP_DIR, CONFIG);
    assert.equal(wave0Result.ok, true);

    // Step 4: Simulate agent completion for wave 0 — record results
    const completions = [];
    for (const taskId of plan.waves[0]) {
      const output = simulatedAgentOutput(`brief-${taskId}`, taskId);

      // Mark agent as complete in dispatch state
      dispatch.updateAgentState(state, taskId, { status: dispatch.AGENT_STATUS.COMPLETE });

      const record = buildRunner.recordCompletion(TMP_DIR, 1, taskId, output);
      completions.push(record);
    }

    // Verify wave 0 can advance
    const wave0Status = buildRunner.handleWaveFailure(state, 0, plan.waves);
    assert.equal(wave0Status.terminal, false);
    assert.equal(wave0Status.canAdvance, true);

    // Step 5: Dispatch and complete wave 1
    buildRunner.executeWave(state, 1, plan.waves, TMP_DIR, CONFIG);
    for (const taskId of plan.waves[1]) {
      const output = simulatedAgentOutput(`brief-${taskId}`, taskId);
      dispatch.updateAgentState(state, taskId, { status: dispatch.AGENT_STATUS.COMPLETE });
      const record = buildRunner.recordCompletion(TMP_DIR, 1, taskId, output);
      completions.push(record);
    }

    // Step 6: Generate completion report
    const report = buildRunner.generateCompletionReport(TMP_DIR, 1, completions);

    assert.equal(report.completed, 3);
    assert.equal(report.failed, 0);
    assert.equal(report.deviations, 0);
    assert.ok(fs.existsSync(report.reportPath), "Report file should exist on disk");

    // Verify report content references all tasks
    const reportContent = fs.readFileSync(report.reportPath, "utf8");
    assert.ok(reportContent.includes("task-a"));
    assert.ok(reportContent.includes("task-b"));
    assert.ok(reportContent.includes("task-c"));
    assert.ok(reportContent.includes("Tasks completed:** 3 / 3"));
  });
});
