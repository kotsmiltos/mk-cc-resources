"use strict";

const fs = require("fs");
const path = require("path");
const { MAX_CONCURRENT_AGENTS, MIN_WAVE_CAP } = require("./constants");
const { formatError } = require("./errors");
const yaml = require("js-yaml");

// Filename for persisted dispatch state
const DISPATCH_STATE_FILE = ".dispatch-state.yaml";

// Agent status constants
const AGENT_STATUS = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
};

/**
 * Build a dependency graph from task definitions.
 * Returns { taskIds, adjacency (task → dependents), reverse (task → dependencies) }.
 *
 * @param {Object<string, { dependsOn?: string[] }>} tasks
 * @returns {{ taskIds: string[], adjacency: Object, reverse: Object }}
 * @throws if an unknown dependency is referenced
 */
function buildDependencyGraph(tasks) {
  const taskIds = Object.keys(tasks);
  const adjacency = {};
  const reverse = {};

  // Initialize empty lists
  for (const id of taskIds) {
    adjacency[id] = [];
    reverse[id] = [];
  }

  for (const [taskId, spec] of Object.entries(tasks)) {
    const deps = spec.dependsOn || spec.depends_on || [];
    for (const dep of deps) {
      if (!adjacency[dep] && dep !== taskId) {
        throw new Error(`unknown task "${dep}" referenced by "${taskId}"`);
      }
      // adjacency: dep → taskId (dep must run before taskId, so taskId depends on dep)
      // reverse: taskId ← dep (taskId's prerequisites)
      if (!adjacency[dep].includes(taskId)) adjacency[dep].push(taskId);
      if (!reverse[taskId].includes(dep)) reverse[taskId].push(dep);
    }
  }

  return { taskIds, adjacency, reverse };
}

/**
 * Validate that the graph is a DAG (no cycles) using Kahn's algorithm.
 * Accepts either:
 *   - { taskIds, adjacency, reverse } from buildDependencyGraph
 *   - A raw adjacency map { taskId: [dep, ...] } (array values = dependencies)
 *
 * @param {{ taskIds: string[], adjacency: Object, reverse: Object }|Object} graphOrMap
 * @returns {{ valid: boolean, order?: string[], cycle?: string[], error?: string }}
 */
function validateDAG(graphOrMap) {
  // Normalize: if input lacks `taskIds` array, treat as raw dep map
  // Raw map: { A: ["B"] } means A depends on B
  let graph;
  if (!Array.isArray(graphOrMap.taskIds)) {
    // Build graph from raw dependency map (values are dep lists)
    const rawMap = graphOrMap;
    const allIds = new Set(Object.keys(rawMap));
    // Add implicit nodes (deps not declared as keys)
    for (const deps of Object.values(rawMap)) {
      for (const dep of (Array.isArray(deps) ? deps : [])) {
        allIds.add(dep);
      }
    }
    const taskIds = [...allIds];
    const adjacency = {};
    const reverse = {};
    for (const id of taskIds) {
      adjacency[id] = [];
      reverse[id] = [];
    }
    for (const [id, deps] of Object.entries(rawMap)) {
      for (const dep of (Array.isArray(deps) ? deps : [])) {
        if (!adjacency[dep]) { adjacency[dep] = []; reverse[dep] = []; }
        if (!adjacency[dep].includes(id)) adjacency[dep].push(id);
        if (!reverse[id].includes(dep)) reverse[id].push(dep);
      }
    }
    graph = { taskIds, adjacency, reverse };
  } else {
    graph = graphOrMap;
  }

  const { taskIds, adjacency, reverse } = graph;

  // In-degree = number of prerequisites (length of reverse[id])
  const inDegree = {};
  for (const id of taskIds) {
    inDegree[id] = (reverse[id] || []).length;
  }

  // Start with nodes that have no prerequisites
  const queue = taskIds.filter((id) => inDegree[id] === 0).sort();
  const order = [];

  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);

    // Reduce in-degree for all dependents of this node
    for (const dependent of (adjacency[node] || [])) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
        queue.sort(); // maintain deterministic order
      }
    }
  }

  if (order.length !== taskIds.length) {
    const inOrderSet = new Set(order);
    const cycle = taskIds.filter((n) => !inOrderSet.has(n));
    return {
      valid: false,
      cycle,
      error: formatError ? formatError("E_CYCLE_DETECTED", { cycle: cycle.join(" → ") }) : `Cycle detected: ${cycle.join(" → ")}`,
    };
  }

  return { valid: true, order };
}

/**
 * Construct execution waves (parallelizable batches) from the dependency graph.
 *
 * @param {{ taskIds: string[], adjacency: Object, reverse: Object }} graph
 * @param {string[]} order — topological order from validateDAG
 * @returns {string[][]}
 */
function constructWaves(graph, order) {
  if (!order || order.length === 0) return [];

  // Depth of each node = max depth of any dependency + 1
  const depth = {};
  for (const node of order) {
    const deps = (graph.reverse || {})[node] || [];
    if (deps.length === 0) {
      depth[node] = 0;
    } else {
      depth[node] = Math.max(...deps.map((d) => (depth[d] != null ? depth[d] : 0))) + 1;
    }
  }

  // Group by depth
  const maxDepth = Math.max(0, ...Object.values(depth));
  const waves = [];
  for (let d = 0; d <= maxDepth; d++) {
    const wave = order.filter((n) => depth[n] === d);
    if (wave.length > 0) waves.push(wave);
  }

  return waves;
}

/**
 * Split a wave into sub-batches capped at `cap` agents each.
 *
 * @param {string[]} wave
 * @param {number} [cap=MAX_CONCURRENT_AGENTS]
 * @returns {string[][]}
 */
function queueWave(wave, cap = MAX_CONCURRENT_AGENTS) {
  if (cap < MIN_WAVE_CAP) throw new Error(`queueWave cap must be >= ${MIN_WAVE_CAP}, got ${cap}`);
  const batches = [];
  for (let i = 0; i < wave.length; i += cap) {
    batches.push(wave.slice(i, i + cap));
  }
  return batches;
}

// --- Dispatch state management ---

/**
 * Create an initial dispatch state object.
 *
 * @param {string} phase
 * @param {number} batch
 * @returns {Object}
 */
function createDispatchState(phase, batch) {
  return {
    phase,
    batch,
    agents: [],
    verifier: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Add or update an agent entry within dispatch state.
 * When status transitions to RUNNING, sets started_at.
 * When status transitions to COMPLETE or FAILED, sets completed_at.
 *
 * @param {Object} state — mutable dispatch state
 * @param {string} agentId
 * @param {Object} update — { status, output_path?, ... }
 */
function updateAgentState(state, agentId, update) {
  const now = new Date().toISOString();
  state.updated_at = now;

  const existing = state.agents.find((a) => a.id === agentId);
  if (existing) {
    Object.assign(existing, update);
    if (update.status === "RUNNING" && !existing.started_at) {
      existing.started_at = now;
    }
    if (["COMPLETE", "FAILED"].includes(update.status) && !existing.completed_at) {
      existing.completed_at = now;
    }
  } else {
    const entry = { id: agentId, ...update };
    if (update.status === "RUNNING") entry.started_at = now;
    if (["COMPLETE", "FAILED"].includes(update.status)) entry.completed_at = now;
    state.agents.push(entry);
  }
}

/**
 * Get status summary for a specific wave.
 *
 * @param {Object} state
 * @param {number} waveIndex
 * @param {string[][]} waves
 * @returns {{ complete: boolean, pending: number, running: number, completed: number, failed: number }}
 */
function getWaveStatus(state, waveIndex, waves) {
  if (waveIndex >= waves.length) {
    return { complete: true, pending: 0, running: 0, completed: 0, failed: 0 };
  }

  const waveTasks = waves[waveIndex];
  let pending = 0;
  let running = 0;
  let completed = 0;
  let failed = 0;

  for (const taskId of waveTasks) {
    const agent = state.agents.find((a) => a.id === taskId);
    if (!agent) {
      pending++;
    } else if (agent.status === "COMPLETE") {
      completed++;
    } else if (agent.status === "FAILED") {
      failed++;
    } else if (agent.status === "RUNNING") {
      running++;
    } else {
      pending++;
    }
  }

  const allDone = waveTasks.every((id) => {
    const a = state.agents.find((ag) => ag.id === id);
    return a && ["COMPLETE", "FAILED"].includes(a.status);
  });

  return { complete: allDone, pending, running, completed, failed };
}

/**
 * Check if the current wave can advance to the next.
 * Requires: all agents in wave done, and verifier (if present) is COMPLETE.
 *
 * @param {Object} state
 * @param {number} waveIndex
 * @param {string[][]} waves
 * @returns {boolean}
 */
function canAdvanceWave(state, waveIndex, waves) {
  const status = getWaveStatus(state, waveIndex, waves);
  if (!status.complete) return false;
  if (state.verifier && state.verifier.status !== "COMPLETE") return false;
  return true;
}

/**
 * Persist dispatch state to a YAML file in dir.
 *
 * @param {Object} state
 * @param {string} dir
 */
function persistDispatchState(state, dir) {
  const filePath = path.join(dir, DISPATCH_STATE_FILE);
  fs.writeFileSync(filePath, yaml.dump(state, { lineWidth: 120, noRefs: true }), "utf8");
}

/**
 * Load dispatch state from dir. Returns null if not found.
 *
 * @param {string} dir
 * @returns {Object|null}
 */
function loadDispatchState(dir) {
  const filePath = path.join(dir, DISPATCH_STATE_FILE);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  return yaml.load(content);
}

module.exports = {
  AGENT_STATUS,
  buildDependencyGraph,
  validateDAG,
  constructWaves,
  queueWave,
  createDispatchState,
  updateAgentState,
  getWaveStatus,
  canAdvanceWave,
  persistDispatchState,
  loadDispatchState,
};
