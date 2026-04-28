"use strict";

/**
 * Tests for architect-runner.chooseArchitectFlow — deterministic dispatch
 * between lightweight and heavyweight /architect flows.
 *
 * Routing rules under test (in priority order):
 *   1. complexity.classification === "mechanical" → lightweight (override)
 *   2. depth === "flat" (assessment=bug-fix, narrow touch_surface) → lightweight
 *   3. anything else (incl. missing complexity block) → heavyweight
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { chooseArchitectFlow } = require("../skills/architect/scripts/architect-runner");

describe("chooseArchitectFlow — mechanical override (highest priority)", () => {
  it("classification=mechanical forces lightweight even on full-depth project", () => {
    const decision = chooseArchitectFlow({
      assessment: "new-project",   // would normally → depth=full → heavyweight
      classification: "mechanical",
    });
    assert.equal(decision.flow, "lightweight");
    assert.equal(decision.classification, "mechanical");
    assert.match(decision.reason, /mechanical override/);
  });

  it("classification=mechanical forces lightweight even on high-care depth", () => {
    const decision = chooseArchitectFlow({
      assessment: "partial-rewrite",  // would normally → high-care
      classification: "mechanical",
    });
    assert.equal(decision.flow, "lightweight");
  });
});

describe("chooseArchitectFlow — depth=flat → lightweight", () => {
  it("bug-fix with narrow touch_surface → lightweight (depth=flat)", () => {
    const decision = chooseArchitectFlow({
      assessment: "bug-fix",
      touch_surface: "narrow",
    });
    assert.equal(decision.flow, "lightweight");
    assert.equal(decision.depth, "flat");
    assert.match(decision.reason, /flat/);
  });

  it("bug-fix with broad touch_surface escalates to standard → heavyweight", () => {
    // Per recommendDecompositionDepth: broad touch_surface escalates flat → standard.
    const decision = chooseArchitectFlow({
      assessment: "bug-fix",
      touch_surface: "broad",
    });
    assert.equal(decision.flow, "heavyweight");
    assert.equal(decision.depth, "standard");
  });
});

describe("chooseArchitectFlow — non-flat assessments → heavyweight", () => {
  it("new-feature → heavyweight", () => {
    const decision = chooseArchitectFlow({ assessment: "new-feature" });
    assert.equal(decision.flow, "heavyweight");
    assert.equal(decision.depth, "standard");
  });

  it("partial-rewrite → heavyweight", () => {
    const decision = chooseArchitectFlow({ assessment: "partial-rewrite" });
    assert.equal(decision.flow, "heavyweight");
    assert.equal(decision.depth, "high-care");
  });

  it("new-project → heavyweight", () => {
    const decision = chooseArchitectFlow({ assessment: "new-project" });
    assert.equal(decision.flow, "heavyweight");
    assert.equal(decision.depth, "full");
  });
});

describe("chooseArchitectFlow — missing or partial complexity defaults heavyweight", () => {
  it("null complexity → heavyweight", () => {
    const decision = chooseArchitectFlow(null);
    assert.equal(decision.flow, "heavyweight");
    assert.equal(decision.depth, "standard");   // recommendDecompositionDepth default
  });

  it("empty object complexity → heavyweight", () => {
    const decision = chooseArchitectFlow({});
    assert.equal(decision.flow, "heavyweight");
  });

  it("complexity with only touch_surface (no assessment) → heavyweight default", () => {
    const decision = chooseArchitectFlow({ touch_surface: "narrow" });
    assert.equal(decision.flow, "heavyweight");
  });
});

describe("chooseArchitectFlow — reason field is populated for audit", () => {
  it("every decision returns a non-empty reason string", () => {
    const cases = [
      { assessment: "bug-fix", touch_surface: "narrow" },
      { assessment: "new-feature" },
      { assessment: "new-project", classification: "mechanical" },
      null,
      {},
    ];
    for (const c of cases) {
      const decision = chooseArchitectFlow(c);
      assert.equal(typeof decision.reason, "string");
      assert.ok(decision.reason.length > 0, `expected non-empty reason for input ${JSON.stringify(c)}`);
    }
  });
});
