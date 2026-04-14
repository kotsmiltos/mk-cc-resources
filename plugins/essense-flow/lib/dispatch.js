"use strict";

/**
 * Build a dependency graph from task definitions.
 *
 * @param {Object<string, { dependsOn: string[] }>} tasks — map of task ID to spec
 * @returns {{ nodes: string[], edges: Object<string, string[]>, inDegree: Object<string, number> }}
 */
function buildDependencyGraph(tasks) {
  const nodes = Object.keys(tasks);
  const edges = {};     // node -> array of nodes it depends on
  const inDegree = {};  // node -> number of incoming edges

  for (const node of nodes) {
    edges[node] = [];
    inDegree[node] = 0;
  }

  for (const [taskId, spec] of Object.entries(tasks)) {
    const deps = spec.dependsOn || spec.depends_on || [];
    for (const dep of deps) {
      if (edges[dep] === undefined) {
        // Dependency references a task not in the map — add as implicit node
        edges[dep] = [];
        inDegree[dep] = 0;
        nodes.push(dep);
      }
      edges[taskId].push(dep);
      inDegree[taskId]++;
    }
  }

  return { nodes, edges, inDegree };
}

/**
 * Validate that the graph is a DAG (no cycles) using Kahn's algorithm.
 * Returns topological order if valid, or the cycle if invalid.
 *
 * @param {{ nodes: string[], edges: Object<string, string[]>, inDegree: Object<string, number> }} graph
 * @returns {{ valid: boolean, order?: string[], cycle?: string[] }}
 */
function validateDAG(graph) {
  const inDegree = { ...graph.inDegree };
  const reverseEdges = {};

  // Build reverse edges (dep -> dependents) for topological sort
  for (const node of graph.nodes) {
    if (!reverseEdges[node]) reverseEdges[node] = [];
  }
  for (const [node, deps] of Object.entries(graph.edges)) {
    for (const dep of deps) {
      if (!reverseEdges[dep]) reverseEdges[dep] = [];
      reverseEdges[dep].push(node);
    }
  }

  // Kahn's algorithm
  const queue = [];
  for (const node of graph.nodes) {
    if (inDegree[node] === 0) {
      queue.push(node);
    }
  }

  const order = [];
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);

    for (const dependent of (reverseEdges[node] || [])) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
      }
    }
  }

  if (order.length !== graph.nodes.length) {
    // Cycle detected — find nodes not in the order
    const inOrder = new Set(order);
    const cycle = graph.nodes.filter((n) => !inOrder.has(n));
    return { valid: false, cycle };
  }

  return { valid: true, order };
}

/**
 * Construct execution waves (parallelizable batches) from the dependency graph.
 * Each wave contains tasks whose dependencies are all satisfied by prior waves.
 *
 * @param {{ nodes: string[], edges: Object<string, string[]>, inDegree: Object<string, number> }} graph
 * @param {string[]} order — topological order from validateDAG
 * @returns {string[][]} array of waves, each wave is an array of task IDs
 */
function constructWaves(graph, order) {
  // Assign each node to a wave based on the longest dependency chain depth
  const depth = {};

  for (const node of order) {
    const deps = graph.edges[node] || [];
    if (deps.length === 0) {
      depth[node] = 0;
    } else {
      depth[node] = Math.max(...deps.map((d) => (depth[d] || 0) + 1));
    }
  }

  // Group by depth
  const maxDepth = Math.max(0, ...Object.values(depth));
  const waves = [];
  for (let d = 0; d <= maxDepth; d++) {
    const wave = order.filter((n) => depth[n] === d);
    if (wave.length > 0) {
      waves.push(wave);
    }
  }

  return waves;
}

module.exports = { buildDependencyGraph, validateDAG, constructWaves };
