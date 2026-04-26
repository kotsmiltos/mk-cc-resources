"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const dispatch = require("../lib/dispatch");

const TMP_DIR = path.join(__dirname, "__tmp_dispatch__");

// --- buildDependencyGraph ---

describe("buildDependencyGraph", () => {
  it("builds adjacency lists from task specs", () => {
    const tasks = {
      A: { dependsOn: [] },
      B: { dependsOn: ["A"] },
      C: { dependsOn: ["A"] },
      D: { dependsOn: ["B", "C"] },
    };
    const graph = dispatch.buildDependencyGraph(tasks);
    assert.deepEqual(graph.taskIds.sort(), ["A", "B", "C", "D"]);
    assert.ok(graph.adjacency["A"].includes("B"));
    assert.ok(graph.adjacency["A"].includes("C"));
    assert.deepEqual(graph.reverse["A"], []);
    assert.deepEqual(graph.reverse["B"], ["A"]);
    assert.deepEqual(graph.reverse["D"].sort(), ["B", "C"]);
  });

  it("handles tasks with no dependencies", () => {
    const tasks = { X: { dependsOn: [] }, Y: { dependsOn: [] } };
    const graph = dispatch.buildDependencyGraph(tasks);
    assert.deepEqual(graph.reverse["X"], []);
    assert.deepEqual(graph.reverse["Y"], []);
  });

  it("throws on unknown dependency", () => {
    const tasks = { A: { dependsOn: ["Z"] } };
    assert.throws(() => dispatch.buildDependencyGraph(tasks), /unknown task "Z"/);
  });

  it("handles empty task map", () => {
    const graph = dispatch.buildDependencyGraph({});
    assert.deepEqual(graph.taskIds, []);
  });
});

// --- validateDAG ---

describe("validateDAG", () => {
  it("validates a valid DAG", () => {
    const tasks = { A: { dependsOn: [] }, B: { dependsOn: ["A"] }, C: { dependsOn: ["B"] } };
    const graph = dispatch.buildDependencyGraph(tasks);
    const result = dispatch.validateDAG(graph);
    assert.equal(result.valid, true);
    assert.deepEqual(result.order, ["A", "B", "C"]);
  });

  it("detects a simple cycle", () => {
    const graph = {
      adjacency: { A: ["B"], B: ["C"], C: ["A"] },
      reverse: { A: ["C"], B: ["A"], C: ["B"] },
      taskIds: ["A", "B", "C"],
    };
    const result = dispatch.validateDAG(graph);
    assert.equal(result.valid, false);
    assert.ok(result.cycle.length > 0);
    assert.ok(result.cycle.includes("A"));
  });

  it("detects self-dependency", () => {
    const graph = {
      adjacency: { A: ["A"] },
      reverse: { A: ["A"] },
      taskIds: ["A"],
    };
    const result = dispatch.validateDAG(graph);
    assert.equal(result.valid, false);
    assert.deepEqual(result.cycle, ["A"]);
  });

  it("handles empty graph", () => {
    const result = dispatch.validateDAG({ adjacency: {}, reverse: {}, taskIds: [] });
    assert.equal(result.valid, true);
    assert.deepEqual(result.order, []);
  });

  it("produces valid topological order for diamond dependency", () => {
    const tasks = {
      A: { dependsOn: [] },
      B: { dependsOn: ["A"] },
      C: { dependsOn: ["A"] },
      D: { dependsOn: ["B", "C"] },
    };
    const graph = dispatch.buildDependencyGraph(tasks);
    const result = dispatch.validateDAG(graph);
    assert.equal(result.valid, true);
    // A must come before B, C; B and C must come before D
    const order = result.order;
    assert.ok(order.indexOf("A") < order.indexOf("B"));
    assert.ok(order.indexOf("A") < order.indexOf("C"));
    assert.ok(order.indexOf("B") < order.indexOf("D"));
    assert.ok(order.indexOf("C") < order.indexOf("D"));
  });
});

// --- constructWaves ---

describe("constructWaves", () => {
  it("groups independent tasks into one wave", () => {
    const tasks = { A: { dependsOn: [] }, B: { dependsOn: [] }, C: { dependsOn: [] } };
    const graph = dispatch.buildDependencyGraph(tasks);
    const { order } = dispatch.validateDAG(graph);
    const waves = dispatch.constructWaves(graph, order);
    assert.equal(waves.length, 1);
    assert.equal(waves[0].length, 3);
  });

  it("produces correct waves for linear chain", () => {
    const tasks = { A: { dependsOn: [] }, B: { dependsOn: ["A"] }, C: { dependsOn: ["B"] } };
    const graph = dispatch.buildDependencyGraph(tasks);
    const { order } = dispatch.validateDAG(graph);
    const waves = dispatch.constructWaves(graph, order);
    assert.equal(waves.length, 3);
    assert.deepEqual(waves[0], ["A"]);
    assert.deepEqual(waves[1], ["B"]);
    assert.deepEqual(waves[2], ["C"]);
  });

  it("produces correct waves for diamond dependency", () => {
    const tasks = {
      A: { dependsOn: [] },
      B: { dependsOn: ["A"] },
      C: { dependsOn: ["A"] },
      D: { dependsOn: ["B", "C"] },
    };
    const graph = dispatch.buildDependencyGraph(tasks);
    const { order } = dispatch.validateDAG(graph);
    const waves = dispatch.constructWaves(graph, order);
    assert.equal(waves.length, 3);
    assert.deepEqual(waves[0], ["A"]);
    assert.equal(waves[1].length, 2);
    assert.ok(waves[1].includes("B") && waves[1].includes("C"));
    assert.deepEqual(waves[2], ["D"]);
  });

  it("handles A->B, B->C, A->C (transitive) correctly", () => {
    const tasks = {
      A: { dependsOn: [] },
      B: { dependsOn: ["A"] },
      C: { dependsOn: ["A", "B"] },
    };
    const graph = dispatch.buildDependencyGraph(tasks);
    const { order } = dispatch.validateDAG(graph);
    const waves = dispatch.constructWaves(graph, order);
    assert.equal(waves.length, 3);
    assert.deepEqual(waves[0], ["A"]);
    assert.deepEqual(waves[1], ["B"]);
    assert.deepEqual(waves[2], ["C"]);
  });

  it("handles single task", () => {
    const tasks = { A: { dependsOn: [] } };
    const graph = dispatch.buildDependencyGraph(tasks);
    const { order } = dispatch.validateDAG(graph);
    const waves = dispatch.constructWaves(graph, order);
    assert.equal(waves.length, 1);
    assert.deepEqual(waves[0], ["A"]);
  });

  it("handles empty graph", () => {
    const waves = dispatch.constructWaves({ adjacency: {}, reverse: {}, taskIds: [] }, []);
    assert.deepEqual(waves, []);
  });
});

// --- dispatch state management ---

describe("createDispatchState", () => {
  it("creates initial state with phase and batch", () => {
    const state = dispatch.createDispatchState("research", 0);
    assert.equal(state.phase, "research");
    assert.equal(state.batch, 0);
    assert.deepEqual(state.agents, []);
    assert.equal(state.verifier, null);
    assert.ok(state.created_at);
  });
});

describe("updateAgentState", () => {
  it("adds a new agent to state", () => {
    const state = dispatch.createDispatchState("research", 0);
    dispatch.updateAgentState(state, "agent-1", { status: "PENDING" });
    assert.equal(state.agents.length, 1);
    assert.equal(state.agents[0].id, "agent-1");
  });

  it("updates existing agent status", () => {
    const state = dispatch.createDispatchState("research", 0);
    dispatch.updateAgentState(state, "agent-1", { status: "PENDING" });
    dispatch.updateAgentState(state, "agent-1", { status: "RUNNING" });
    assert.equal(state.agents.length, 1);
    assert.equal(state.agents[0].status, "RUNNING");
    assert.ok(state.agents[0].started_at);
  });

  it("sets completed_at on COMPLETE", () => {
    const state = dispatch.createDispatchState("research", 0);
    dispatch.updateAgentState(state, "agent-1", { status: "RUNNING" });
    dispatch.updateAgentState(state, "agent-1", { status: "COMPLETE", output_path: "out.xml" });
    assert.ok(state.agents[0].completed_at);
    assert.equal(state.agents[0].output_path, "out.xml");
  });

  it("sets completed_at on FAILED", () => {
    const state = dispatch.createDispatchState("research", 0);
    dispatch.updateAgentState(state, "agent-1", { status: "FAILED" });
    assert.ok(state.agents[0].completed_at);
  });
});

describe("getWaveStatus", () => {
  it("reports all pending when no agents registered", () => {
    const state = dispatch.createDispatchState("build", 0);
    const waves = [["A", "B"], ["C"]];
    const status = dispatch.getWaveStatus(state, 0, waves);
    assert.equal(status.complete, false);
    assert.equal(status.pending, 2);
  });

  it("reports complete when all agents done", () => {
    const state = dispatch.createDispatchState("build", 0);
    dispatch.updateAgentState(state, "A", { status: "COMPLETE" });
    dispatch.updateAgentState(state, "B", { status: "COMPLETE" });
    const waves = [["A", "B"], ["C"]];
    const status = dispatch.getWaveStatus(state, 0, waves);
    assert.equal(status.complete, true);
    assert.equal(status.completed, 2);
  });

  it("handles out-of-range wave index", () => {
    const state = dispatch.createDispatchState("build", 0);
    const status = dispatch.getWaveStatus(state, 5, [["A"]]);
    assert.equal(status.complete, true);
  });
});

describe("canAdvanceWave", () => {
  it("returns true when wave is complete and no verifier", () => {
    const state = dispatch.createDispatchState("build", 0);
    dispatch.updateAgentState(state, "A", { status: "COMPLETE" });
    const waves = [["A"], ["B"]];
    assert.equal(dispatch.canAdvanceWave(state, 0, waves), true);
  });

  it("returns false when wave has running agents", () => {
    const state = dispatch.createDispatchState("build", 0);
    dispatch.updateAgentState(state, "A", { status: "RUNNING" });
    const waves = [["A"], ["B"]];
    assert.equal(dispatch.canAdvanceWave(state, 0, waves), false);
  });

  it("returns false when verifier is pending", () => {
    const state = dispatch.createDispatchState("build", 0);
    dispatch.updateAgentState(state, "A", { status: "COMPLETE" });
    state.verifier = { status: "PENDING" };
    const waves = [["A"], ["B"]];
    assert.equal(dispatch.canAdvanceWave(state, 0, waves), false);
  });

  it("returns true when verifier is complete", () => {
    const state = dispatch.createDispatchState("build", 0);
    dispatch.updateAgentState(state, "A", { status: "COMPLETE" });
    state.verifier = { status: "COMPLETE" };
    const waves = [["A"], ["B"]];
    assert.equal(dispatch.canAdvanceWave(state, 0, waves), true);
  });
});

// --- persistence ---

describe("dispatch state persistence", () => {
  before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("persists and loads dispatch state", () => {
    const state = dispatch.createDispatchState("architecture", 1);
    dispatch.updateAgentState(state, "arch-infra", { status: "COMPLETE" });
    dispatch.persistDispatchState(state, TMP_DIR);

    const loaded = dispatch.loadDispatchState(TMP_DIR);
    assert.equal(loaded.phase, "architecture");
    assert.equal(loaded.batch, 1);
    assert.equal(loaded.agents.length, 1);
    assert.equal(loaded.agents[0].id, "arch-infra");
  });

  it("returns null when no state file exists", () => {
    const emptyDir = path.join(TMP_DIR, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    const loaded = dispatch.loadDispatchState(emptyDir);
    assert.equal(loaded, null);
  });
});
