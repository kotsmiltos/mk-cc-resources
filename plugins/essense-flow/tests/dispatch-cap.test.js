"use strict";

const { describe, it, test } = require("node:test");
const assert = require("node:assert/strict");

const { queueWave, validateDAG } = require("../lib/dispatch");

// ---------------------------------------------------------------------------
// Test 1 — queueWave splits into batches correctly with cap < wave length
// ---------------------------------------------------------------------------

describe("queueWave — splits [1,2,3,4,5] with cap 3 into [[1,2,3],[4,5]]", () => {
  it("produces two batches: [1,2,3] and [4,5]", () => {
    const WAVE = [1, 2, 3, 4, 5];
    const CAP = 3;
    const EXPECTED = [[1, 2, 3], [4, 5]];

    const result = queueWave(WAVE, CAP);
    assert.deepEqual(result, EXPECTED);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — queueWave produces a single batch when cap >= wave length
// ---------------------------------------------------------------------------

describe("queueWave — [1,2] with cap 10 produces single batch", () => {
  it("produces one batch containing all items: [[1,2]]", () => {
    const WAVE = [1, 2];
    const CAP = 10;
    const EXPECTED = [[1, 2]];

    const result = queueWave(WAVE, CAP);
    assert.deepEqual(result, EXPECTED);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — validateDAG detects a cycle A→B, B→A
// ---------------------------------------------------------------------------

describe("validateDAG — cycle A→B, B→A returns {valid:false} with error string", () => {
  it("returns valid:false and a non-empty error string", () => {
    // Adjacency map: each key lists its dependencies
    const CYCLIC_GRAPH = { A: ["B"], B: ["A"] };

    const result = validateDAG(CYCLIC_GRAPH);
    assert.equal(result.valid, false, "expected valid:false for cyclic graph");
    assert.ok(typeof result.error === "string" && result.error.length > 0, "error must be a non-empty string");
  });
});

// ---------------------------------------------------------------------------
// Test 4 — validateDAG accepts a valid DAG A→B, B has no dependencies
// ---------------------------------------------------------------------------

describe("validateDAG — valid DAG A→B, B:[] returns {valid:true}", () => {
  it("returns valid:true", () => {
    // A depends on B, B has no dependencies — this is a valid DAG
    const VALID_GRAPH = { A: ["B"], B: [] };

    const result = validateDAG(VALID_GRAPH);
    assert.equal(result.valid, true, "expected valid:true for acyclic graph");
  });
});

// ---------------------------------------------------------------------------
// Test 5 — validateDAG: implicit dependency (B not declared) is not a cycle
// ---------------------------------------------------------------------------

test("validateDAG: implicit dependency is not a cycle", () => {
  // A depends on B, but B is not declared as a key in the graph.
  // buildDependencyGraph treats undeclared deps as implicit nodes with no
  // outgoing edges — this must not trigger a false cycle detection.
  const result = validateDAG({ A: ["B"] });
  assert.strictEqual(result.valid, true, "implicit dep must not trigger false cycle");
});

// ---------------------------------------------------------------------------
// Test 6 — queueWave: cap=0 must throw with a clear message
// ---------------------------------------------------------------------------

test("queueWave: cap=0 throws", () => {
  assert.throws(
    () => queueWave([1, 2, 3], 0),
    /cap must be >= 1/
  );
});
