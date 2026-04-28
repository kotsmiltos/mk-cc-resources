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
const TMP_DIR = path.join(__dirname, "__tmp_build__");

// --- executeWave ---

describe("executeWave", () => {
  before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("marks each task in the wave as RUNNING", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-001", "TASK-002"], ["TASK-003"]];

    const result = buildRunner.executeWave(state, 0, waves, TMP_DIR, CONFIG);

    assert.equal(result.ok, true);
    assert.deepEqual(result.tasks, ["TASK-001", "TASK-002"]);

    for (const taskId of waves[0]) {
      const agent = state.agents.find((a) => a.id === taskId);
      assert.ok(agent, `Agent ${taskId} should exist in state`);
      assert.equal(agent.status, dispatch.AGENT_STATUS.RUNNING);
      assert.ok(agent.started_at, `Agent ${taskId} should have started_at`);
    }
  });

  it("persists dispatch state to disk after each agent update", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-010"]];

    buildRunner.executeWave(state, 0, waves, TMP_DIR, CONFIG);

    const loaded = dispatch.loadDispatchState(TMP_DIR);
    assert.ok(loaded, "Dispatch state should be persisted to disk");
    assert.equal(loaded.agents.length, 1);
    assert.equal(loaded.agents[0].id, "TASK-010");
    assert.equal(loaded.agents[0].status, dispatch.AGENT_STATUS.RUNNING);
  });

  it("allows wave advancement after all agents complete", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A", "TASK-B"], ["TASK-C"]];

    buildRunner.executeWave(state, 0, waves, TMP_DIR, CONFIG);

    // Simulate orchestrator marking agents as COMPLETE
    dispatch.updateAgentState(state, "TASK-A", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });
    dispatch.updateAgentState(state, "TASK-B", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });

    assert.equal(
      dispatch.canAdvanceWave(state, 0, waves),
      true,
      "Should be able to advance after all agents complete"
    );
  });

  it("blocks advancement while agents are still running", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-X", "TASK-Y"], ["TASK-Z"]];

    buildRunner.executeWave(state, 0, waves, TMP_DIR, CONFIG);

    // Only mark one as complete
    dispatch.updateAgentState(state, "TASK-X", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });

    assert.equal(
      dispatch.canAdvanceWave(state, 0, waves),
      false,
      "Should not advance while TASK-Y is still RUNNING"
    );
  });
});

// --- checkOverflow ---

describe("checkOverflow", () => {
  const OVERFLOW_DIR = path.join(TMP_DIR, "overflow");

  before(() => {
    fs.mkdirSync(OVERFLOW_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("detects overflow when file exceeds backstop", () => {
    const backstop = CONFIG.overflow.file_lines_backstop;
    const overflowLineCount = backstop + 50;
    const bigFile = path.join(OVERFLOW_DIR, "big-file.js");
    const lines = Array.from({ length: overflowLineCount }, (_, i) => `// line ${i + 1}`);
    fs.writeFileSync(bigFile, lines.join("\n"), "utf8");

    const record = { files_written: bigFile };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 1);
    assert.equal(result.overflows[0].file, bigFile);
    assert.ok(
      result.overflows[0].lines > backstop,
      `Expected ${result.overflows[0].lines} > ${backstop}`
    );
    assert.equal(result.overflows[0].backstop, backstop);
  });

  it("reports no overflow for small files", () => {
    const smallFile = path.join(OVERFLOW_DIR, "small-file.js");
    fs.writeFileSync(smallFile, "const x = 1;\n", "utf8");

    const record = { files_written: smallFile };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 0);
  });

  it("handles multiple files with mixed sizes", () => {
    const backstop = CONFIG.overflow.file_lines_backstop;
    const overflowLineCount = backstop + 10;

    const bigFile = path.join(OVERFLOW_DIR, "multi-big.js");
    const smallFile = path.join(OVERFLOW_DIR, "multi-small.js");

    const bigLines = Array.from({ length: overflowLineCount }, (_, i) => `// line ${i}`);
    fs.writeFileSync(bigFile, bigLines.join("\n"), "utf8");
    fs.writeFileSync(smallFile, "// tiny\n", "utf8");

    const record = { files_written: `${bigFile}\n${smallFile}` };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 1);
    assert.equal(result.overflows[0].file, bigFile);
  });

  it("handles comma-separated file lists", () => {
    const backstop = CONFIG.overflow.file_lines_backstop;
    const overflowLineCount = backstop + 5;

    const file1 = path.join(OVERFLOW_DIR, "comma-big.js");
    const lines = Array.from({ length: overflowLineCount }, (_, i) => `// ${i}`);
    fs.writeFileSync(file1, lines.join("\n"), "utf8");

    const record = { files_written: `${file1}, some/nonexistent/file.js` };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 1);
    assert.equal(result.overflows[0].file, file1);
  });

  it("gracefully handles non-existent files", () => {
    const record = {
      files_written: "/does/not/exist/file1.js\n/also/missing/file2.js",
    };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 0);
  });

  it("handles empty files_written", () => {
    const record = { files_written: "" };
    const result = buildRunner.checkOverflow(record, CONFIG);

    assert.equal(result.overflows.length, 0);
  });

  it("uses default backstop when config lacks overflow setting", () => {
    const backstop = 300;
    const overflowLineCount = backstop + 20;
    const file = path.join(OVERFLOW_DIR, "default-backstop.js");
    const lines = Array.from({ length: overflowLineCount }, (_, i) => `// ${i}`);
    fs.writeFileSync(file, lines.join("\n"), "utf8");

    const record = { files_written: file };
    // Pass config without overflow section
    const result = buildRunner.checkOverflow(record, {});

    assert.equal(result.overflows.length, 1);
    assert.equal(result.overflows[0].backstop, backstop);
  });
});

// --- handleWaveFailure ---

describe("handleWaveFailure", () => {
  it("returns canAdvance: true when all agents complete", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A", "TASK-B"]];

    dispatch.updateAgentState(state, "TASK-A", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });
    dispatch.updateAgentState(state, "TASK-B", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, false);
    assert.equal(result.canAdvance, true);
  });

  it("returns terminal: true when all settled with failures", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A", "TASK-B"]];

    dispatch.updateAgentState(state, "TASK-A", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });
    dispatch.updateAgentState(state, "TASK-B", {
      status: dispatch.AGENT_STATUS.FAILED,
    });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, true);
    assert.equal(result.failed, 1);
    assert.equal(result.completed, 1);
  });

  it("returns terminal: true when all agents failed", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-X", "TASK-Y"]];

    dispatch.updateAgentState(state, "TASK-X", {
      status: dispatch.AGENT_STATUS.FAILED,
    });
    dispatch.updateAgentState(state, "TASK-Y", {
      status: dispatch.AGENT_STATUS.FAILED,
    });

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, true);
    assert.equal(result.failed, 2);
    assert.equal(result.completed, 0);
  });

  it("returns canAdvance: false when agents still running", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A", "TASK-B", "TASK-C"]];

    dispatch.updateAgentState(state, "TASK-A", {
      status: dispatch.AGENT_STATUS.COMPLETE,
    });
    dispatch.updateAgentState(state, "TASK-B", {
      status: dispatch.AGENT_STATUS.RUNNING,
    });
    // TASK-C left as PENDING (not yet dispatched)

    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, false);
    assert.equal(result.canAdvance, false);
    assert.equal(result.running, 1);
    assert.equal(result.pending, 1);
  });

  it("returns canAdvance: false when agents are pending", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A"]];

    // Agent not yet started — defaults to PENDING
    const result = buildRunner.handleWaveFailure(state, 0, waves);

    assert.equal(result.terminal, false);
    assert.equal(result.canAdvance, false);
    assert.equal(result.pending, 1);
    assert.equal(result.running, 0);
  });

  it("handles negative waveIndex gracefully", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A"]];

    const result = buildRunner.handleWaveFailure(state, -1, waves);
    assert.equal(result.terminal, true);
  });

  it("handles out-of-bounds waveIndex gracefully", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A"]];

    const result = buildRunner.handleWaveFailure(state, 99, waves);
    assert.equal(result.terminal, true);
  });
});

// --- executeWave bounds checking ---

describe("executeWave bounds checking", () => {
  before(() => fs.mkdirSync(TMP_DIR, { recursive: true }));
  after(() => fs.rmSync(TMP_DIR, { recursive: true, force: true }));

  it("returns error for negative waveIndex", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A"]];
    const result = buildRunner.executeWave(state, -1, waves, TMP_DIR, CONFIG);
    assert.equal(result.ok, false);
  });

  it("returns error for out-of-bounds waveIndex", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A"]];
    const result = buildRunner.executeWave(state, 99, waves, TMP_DIR, CONFIG);
    assert.equal(result.ok, false);
  });
});

// --- completeSprintExecution ---

describe("completeSprintExecution", () => {
  // state-machine.writeState resolves transitions.yaml relative to the
  // *parent* of pipelineDir (it expects pipelineDir to be `<root>/.pipeline`).
  // Mirror references/transitions.yaml to TMP_DIR's parent so writeState
  // can find canonical transitions during the sprinting → sprint-complete
  // transition.
  const refsDir = path.join(path.dirname(TMP_DIR), "references");
  const refsTransitions = path.join(refsDir, "transitions.yaml");
  const sourceTransitions = path.join(PLUGIN_ROOT, "references", "transitions.yaml");
  let mirroredRefs = false;

  before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    if (!fs.existsSync(refsTransitions)) {
      fs.mkdirSync(refsDir, { recursive: true });
      fs.copyFileSync(sourceTransitions, refsTransitions);
      mirroredRefs = true;
    }
  });
  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    if (mirroredRefs) {
      fs.rmSync(refsDir, { recursive: true, force: true });
    }
  });

  // I-10 producer-side gate seeds: completeSprintExecution refuses without
  // per-task completion records on disk. Tests that exercise paths past the
  // gate must seed records explicitly.
  function seedRecordsForSprint(sprintNumber, taskIds) {
    const dir = path.join(TMP_DIR, "sprints", `sprint-${sprintNumber}`, "completion");
    fs.mkdirSync(dir, { recursive: true });
    for (const tid of taskIds) {
      fs.writeFileSync(
        path.join(dir, `${tid}.completion.yaml`),
        `task_id: ${tid}\nstatus: complete\n`,
        "utf8"
      );
    }
  }

  it("transitions state to sprint-complete on success via state machine", () => {
    // Pre-set state to sprinting (valid source for sprint-complete transition)
    yamlIO.safeWrite(path.join(TMP_DIR, "state.yaml"), { schema_version: 1, pipeline: { phase: "sprinting" } });
    seedRecordsForSprint(1, ["TASK-A"]);

    const completions = [
      { task_id: "TASK-A", sprint: 1, status: "COMPLETE", files_written: "", deviations: "none", verification: "", completed_at: new Date().toISOString() },
    ];
    const result = buildRunner.completeSprintExecution(TMP_DIR, 1, completions, CONFIG, PLUGIN_ROOT);
    assert.equal(result.ok, true);
    assert.equal(result.nextAction, "/review");

    const state = yamlIO.safeRead(path.join(TMP_DIR, "state.yaml"));
    assert.equal(state.pipeline.phase, "sprint-complete");
    assert.ok(state.pipeline.completion_evidence.includes("completion-report.md"));
  });

  it("does not transition state when tasks failed", () => {
    yamlIO.safeWrite(path.join(TMP_DIR, "state.yaml"), { schema_version: 1, pipeline: { phase: "sprinting" } });
    seedRecordsForSprint(1, ["TASK-A"]);

    const completions = [
      { task_id: "TASK-A", sprint: 1, status: "FAILED", files_written: "", deviations: "none", verification: "", completed_at: new Date().toISOString() },
    ];
    const result = buildRunner.completeSprintExecution(TMP_DIR, 1, completions, CONFIG, PLUGIN_ROOT);
    assert.equal(result.ok, false);
    assert.ok(result.reason.includes("failed"));

    const state = yamlIO.safeRead(path.join(TMP_DIR, "state.yaml"));
    assert.equal(state.pipeline.phase, "sprinting");
  });

  it("rejects invalid transitions via state machine", () => {
    // Set state to idle — transition to sprint-complete should be invalid
    yamlIO.safeWrite(path.join(TMP_DIR, "state.yaml"), { schema_version: 1, pipeline: { phase: "idle" } });

    const completions = [
      { task_id: "TASK-A", sprint: 1, status: "COMPLETE", files_written: "", deviations: "none", verification: "", completed_at: new Date().toISOString() },
    ];

    // Refactored to use state-machine.writeState — returns { ok: false }
    // instead of throwing. Preserves the legacy report (work isn't lost)
    // but blocks the bad transition.
    const result = buildRunner.completeSprintExecution(TMP_DIR, 1, completions, CONFIG, PLUGIN_ROOT);
    assert.equal(result.ok, false);
    assert.ok(typeof result.reason === "string" && result.reason.length > 0);

    const state = yamlIO.safeRead(path.join(TMP_DIR, "state.yaml"));
    assert.equal(state.pipeline.phase, "idle");
  });
});

// --- dispatchVerifier ---

describe("dispatchVerifier", () => {
  const VERIFY_DIR = path.join(TMP_DIR, "verify_test");

  before(() => fs.mkdirSync(VERIFY_DIR, { recursive: true }));
  after(() => fs.rmSync(VERIFY_DIR, { recursive: true, force: true }));

  it("sets state.verifier to PENDING", () => {
    // Create completion records
    const completionDir = path.join(VERIFY_DIR, "sprints", "sprint-1", "completion");
    fs.mkdirSync(completionDir, { recursive: true });
    yamlIO.safeWrite(path.join(completionDir, "TASK-001.completion.yaml"), {
      task_id: "TASK-001", status: "COMPLETE", files_written: "src/a.js",
      deviations: "none", verification: "pass",
    });
    yamlIO.safeWrite(path.join(completionDir, "TASK-002.completion.yaml"), {
      task_id: "TASK-002", status: "COMPLETE", files_written: "src/b.js",
      deviations: "none", verification: "pass",
    });

    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-001", "TASK-002"], ["TASK-003"]];

    const result = buildRunner.dispatchVerifier(state, 0, waves, VERIFY_DIR, 1, CONFIG);

    assert.equal(result.ok, true);
    assert.ok(result.brief.includes("<sibling"));
    assert.ok(result.briefId.startsWith("verify-"));
    assert.equal(state.verifier.status, "PENDING");
  });

  it("returns error for invalid wave index", () => {
    const state = dispatch.createDispatchState("build", 0);
    const result = buildRunner.dispatchVerifier(state, -1, [["A"]], VERIFY_DIR, 1, CONFIG);
    assert.equal(result.ok, false);
  });

  it("returns error when no completion records exist", () => {
    const emptyDir = path.join(VERIFY_DIR, "empty_sprint");
    fs.mkdirSync(emptyDir, { recursive: true });
    const state = dispatch.createDispatchState("build", 0);
    const result = buildRunner.dispatchVerifier(state, 0, [["TASK-999"]], emptyDir, 1, CONFIG);
    assert.equal(result.ok, false);
  });
});

// --- handleVerifierResult ---

describe("handleVerifierResult", () => {
  const HVR_DIR = path.join(TMP_DIR, "hvr_test");

  before(() => fs.mkdirSync(HVR_DIR, { recursive: true }));
  after(() => fs.rmSync(HVR_DIR, { recursive: true, force: true }));

  it("returns PASS_CLEAN for clean pass", () => {
    const state = dispatch.createDispatchState("build", 0);
    state.verifier = { status: "RUNNING" };
    const raw = "<verification><status>PASS</status><issues></issues></verification>";

    const result = buildRunner.handleVerifierResult(state, raw, HVR_DIR);
    assert.equal(result.decision, buildRunner.VERIFIER_DECISION.PASS_CLEAN);
    assert.equal(state.verifier.status, "COMPLETE");
  });

  it("returns PASS_WITH_WARNINGS for warnings", () => {
    const state = dispatch.createDispatchState("build", 0);
    state.verifier = { status: "RUNNING" };
    const raw = [
      "<verification>",
      "<status>PASS</status>",
      "<issues>",
      "<issue><severity>warning</severity><category>assumption-divergence</category>",
      "<agents>a,b</agents><description>Different state assumptions</description>",
      "<evidence>quotes</evidence><resolution>align</resolution></issue>",
      "</issues>",
      "</verification>",
    ].join("\n");

    const result = buildRunner.handleVerifierResult(state, raw, HVR_DIR);
    assert.equal(result.decision, buildRunner.VERIFIER_DECISION.PASS_WITH_WARNINGS);
    assert.ok(result.warnings.length >= 1);
  });

  it("returns FAIL_BLOCKING for blocking issues", () => {
    const state = dispatch.createDispatchState("build", 0);
    state.verifier = { status: "RUNNING" };
    const raw = [
      "<verification>",
      "<status>FAIL</status>",
      "<issues>",
      "<issue><severity>blocking</severity><category>naming-collision</category>",
      "<agents>x,y</agents><description>Both export Auth</description>",
      "<evidence>line 5</evidence><resolution>rename</resolution></issue>",
      "</issues>",
      "</verification>",
    ].join("\n");

    const result = buildRunner.handleVerifierResult(state, raw, HVR_DIR);
    assert.equal(result.decision, buildRunner.VERIFIER_DECISION.FAIL_BLOCKING);
    assert.ok(result.issues.length >= 1);
  });

  it("handles unparseable output as PASS_WITH_WARNINGS", () => {
    const state = dispatch.createDispatchState("build", 0);
    state.verifier = { status: "RUNNING" };

    const result = buildRunner.handleVerifierResult(state, "garbage output", HVR_DIR);
    assert.equal(result.decision, buildRunner.VERIFIER_DECISION.PASS_WITH_WARNINGS);
    assert.equal(state.verifier.status, "COMPLETE");
  });

  it("marks verifier COMPLETE in state", () => {
    const state = dispatch.createDispatchState("build", 0);
    state.verifier = { status: "RUNNING" };
    const raw = "<verification><status>PASS</status><issues></issues></verification>";

    buildRunner.handleVerifierResult(state, raw, HVR_DIR);
    assert.equal(state.verifier.status, "COMPLETE");
  });
});

// --- injectWarningsIntoBriefs ---

describe("injectWarningsIntoBriefs", () => {
  it("appends warning block to each brief", () => {
    const assembled = [
      { taskId: "T1", brief: "Brief for T1" },
      { taskId: "T2", brief: "Brief for T2" },
    ];
    const warnings = [
      { description: "Different state assumptions between T1 and T2" },
    ];

    const result = buildRunner.injectWarningsIntoBriefs(assembled, warnings);
    assert.equal(result.length, 2);
    assert.ok(result[0].brief.includes("<!-- VERIFIER WARNINGS"));
    assert.ok(result[0].brief.includes("Different state assumptions"));
    assert.ok(result[1].brief.includes("<!-- VERIFIER WARNINGS"));
  });

  it("returns unchanged briefs when no warnings", () => {
    const assembled = [{ taskId: "T1", brief: "Brief" }];
    const result = buildRunner.injectWarningsIntoBriefs(assembled, []);
    assert.equal(result[0].brief, "Brief");
  });

  it("returns unchanged briefs when warnings is null", () => {
    const assembled = [{ taskId: "T1", brief: "Brief" }];
    const result = buildRunner.injectWarningsIntoBriefs(assembled, null);
    assert.equal(result[0].brief, "Brief");
  });

  it("canAdvanceWave blocks while verifier is PENDING", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["TASK-A"]];

    // Mark task complete
    dispatch.updateAgentState(state, "TASK-A", { status: dispatch.AGENT_STATUS.COMPLETE });

    // Set verifier as PENDING
    state.verifier = { status: dispatch.AGENT_STATUS.PENDING };

    assert.equal(
      dispatch.canAdvanceWave(state, 0, waves),
      false,
      "Should not advance while verifier is PENDING"
    );

    // Mark verifier complete
    state.verifier.status = dispatch.AGENT_STATUS.COMPLETE;

    assert.equal(
      dispatch.canAdvanceWave(state, 0, waves),
      true,
      "Should advance after verifier completes"
    );
  });
});
