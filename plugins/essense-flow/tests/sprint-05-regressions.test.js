"use strict";

/**
 * Regression tests for sprint-04 QA findings.
 *
 * Each test references its source finding id (C-1..C-3, H-1..H-5) so a future
 * reader can trace back to the QA report. Tests either (a) guard a real fix
 * from regressing, or (b) document that the finding is a no-op — code was
 * already correct against the claim, and this test pins that behavior so any
 * future refactor that reintroduces the claimed bug would be caught.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const verifyMerge = require("../lib/verify-merge");
const { worstVerdict, worstConfidence, mergeItemVerdicts } = verifyMerge;

const schemas = require("../skills/verify/scripts/verify-schemas");

// Build a minimally-valid verification response with one verdict override.
function makeResponse(verdictOverrides) {
  const baseVerdict = {
    item_id: "VI-001",
    verdict: "MATCH",
    confidence: "CONFIRMED",
    absence_type: null,
    decision_override: null,
    decision_scope_confirmed: null,
    evidence: "stub",
    tokens_estimated: 1,
    ...verdictOverrides,
  };
  return {
    agent_id: "test-agent",
    group_id: "g1",
    spec_hash: "a".repeat(64),
    read_complete: true,
    files_read: [],
    verdicts: [baseVerdict],
  };
}

// ---------------------------------------------------------------------------
// C-1 — determineRouting takes completionStatus as a separate parameter.
// (Was reported as reading report.completion_status on a markdown string.
//  Current code already threads completionStatus through — pin the signature.)
// ---------------------------------------------------------------------------

describe("C-1: determineRouting signature (regression pin)", () => {
  it("verify-runner.js exports runVerify that computes completionStatus locally", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "skills", "verify", "scripts", "verify-runner.js"),
      "utf8"
    );
    // The fix: determineRouting receives completionStatus as an argument, not
    // by reading into a markdown string. Pin both the signature and the call.
    assert.match(
      src,
      /function determineRouting\([^)]*completionStatus[^)]*\)/,
      "determineRouting must accept completionStatus as a named parameter"
    );
    assert.match(
      src,
      /determineRouting\(mergedVerdicts,\s*mode,\s*completionStatus/,
      "runVerify must pass completionStatus positionally"
    );
    assert.doesNotMatch(
      src,
      /report\.completion_status/,
      "must never read completion_status off the rendered report string"
    );
  });
});

// ---------------------------------------------------------------------------
// C-2 — worstVerdict / worstConfidence guard empty arrays (return null).
// ---------------------------------------------------------------------------

describe("C-2: empty-array guards on public merge API", () => {
  it("worstVerdict([]) returns null without throwing", () => {
    assert.equal(worstVerdict([]), null);
  });

  it("worstConfidence([]) returns null without throwing", () => {
    assert.equal(worstConfidence([]), null);
  });

  it("worstVerdict(null) returns null without throwing", () => {
    assert.equal(worstVerdict(null), null);
  });
});

// ---------------------------------------------------------------------------
// C-3 — unknown verdict / confidence strings throw with actionable messages.
// ---------------------------------------------------------------------------

describe("C-3: unknown verdict/confidence strings throw", () => {
  it("worstVerdict throws on unknown verdict and names allowed values", () => {
    assert.throws(
      () => worstVerdict(["GARBAGE"]),
      (err) =>
        err instanceof Error &&
        /GARBAGE/.test(err.message) &&
        /MATCH/.test(err.message) &&
        /GAP/.test(err.message)
    );
  });

  it("worstConfidence throws on unknown confidence and names allowed values", () => {
    assert.throws(
      () => worstConfidence(["UNKNOWN"]),
      (err) =>
        err instanceof Error &&
        /UNKNOWN/.test(err.message) &&
        /CONFIRMED/.test(err.message)
    );
  });

  it("valid inputs are unaffected by the new guards", () => {
    assert.equal(worstVerdict(["MATCH", "GAP"]), "GAP");
    assert.equal(worstConfidence(["LIKELY", "CONFIRMED"]), "CONFIRMED");
  });
});

// ---------------------------------------------------------------------------
// H-1 — review-guard uses prefix semantics, not substring .includes.
// Reads the source and checks the guard shape — cheaper than spawning the
// hook binary in-test.
// ---------------------------------------------------------------------------

describe("H-1: review-guard path check uses prefix semantics", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "hooks", "scripts", "review-guard.js"),
    "utf8"
  );

  it("no longer uses bare substring .includes for allowed path matching", () => {
    // Pin: the old pattern (normalized.includes("/" + allowed)) is gone.
    assert.doesNotMatch(
      src,
      /normalized\.includes\("\/"\s*\+\s*allowed\)/,
      "must not use substring include to match allowed paths"
    );
  });

  it("uses startsWith or exact-match semantics for directory allowances", () => {
    assert.match(
      src,
      /startsWith/,
      "must use startsWith for directory prefix matching"
    );
  });
});

// ---------------------------------------------------------------------------
// H-2 — GAP with absence_type null is rejected with an explicit error.
// (No-op regression pin: the current schema already rejects this.)
// ---------------------------------------------------------------------------

describe("H-2: GAP verdict requires non-null absence_type", () => {
  it("validateVerificationResponse rejects GAP with absence_type: null", () => {
    const input = makeResponse({
      item_id: "VI-001",
      verdict: "GAP",
      confidence: "CONFIRMED",
      absence_type: null,
    });
    const result = schemas.validateVerificationResponse(input);
    assert.equal(result.ok, false);
    assert.match(
      (result.errors || []).join("\n"),
      /absence_type/,
      "error must name the offending field"
    );
  });

  it("validateVerificationResponse accepts GAP with absence_type: confirmed", () => {
    const input = makeResponse({
      verdict: "GAP",
      confidence: "CONFIRMED",
      absence_type: "confirmed",
    });
    const result = schemas.validateVerificationResponse(input);
    assert.equal(result.ok, true, (result.errors || []).join("\n"));
  });
});

// ---------------------------------------------------------------------------
// H-3 — DEVIATED with null decision_override emits a validation error.
// (No-op regression pin: the current schema already rejects this.)
// ---------------------------------------------------------------------------

describe("H-3: DEVIATED verdict requires decision_override", () => {
  it("validateVerificationResponse rejects DEVIATED with null decision_override", () => {
    const input = makeResponse({
      verdict: "DEVIATED",
      confidence: "CONFIRMED",
      decision_override: null,
    });
    const result = schemas.validateVerificationResponse(input);
    assert.equal(result.ok, false);
    assert.match(
      (result.errors || []).join("\n"),
      /decision_override|DEC-/,
      "error must reference decision_override or DEC-NNN convention"
    );
  });
});

// ---------------------------------------------------------------------------
// H-4 — cacheHit is mutable so the post-lock spec-hash re-check can
// invalidate it without throwing a TypeError on const reassignment.
// ---------------------------------------------------------------------------

describe("H-4: cache-hit spec-hash invalidation uses mutable binding", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "skills", "verify", "scripts", "verify-runner.js"),
    "utf8"
  );

  it("cacheHit is declared with let (not destructured as const)", () => {
    assert.match(
      src,
      /let cacheHit = preflightResult\.cacheHit/,
      "cacheHit must be declared with let so invalidation can reassign it"
    );
    assert.doesNotMatch(
      src,
      /const\s*\{[^}]*cacheHit[^}]*\}\s*=\s*preflightResult/,
      "cacheHit must not be destructured as const"
    );
  });

  it("invalidation path reassigns cacheHit when spec hash changes", () => {
    assert.match(
      src,
      /cacheHit\s*=\s*false/,
      "invalidation must reassign cacheHit to false"
    );
  });
});

// ---------------------------------------------------------------------------
// H-5 — gap routing payload text is sourced from extractedItems, not merged
// verdicts (which don't carry text). Regression pin against source.
// ---------------------------------------------------------------------------

describe("H-5: gap routing payload carries item text", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "skills", "verify", "scripts", "verify-runner.js"),
    "utf8"
  );

  it("determineRouting accepts extractedItemsMap parameter", () => {
    assert.match(
      src,
      /function determineRouting\([^)]*extractedItemsMap[^)]*\)/,
      "determineRouting signature must include extractedItemsMap"
    );
  });

  it("gapItems payload text is looked up via extractedItemsMap.get(itemId)", () => {
    assert.match(
      src,
      /extractedItemsMap\s*\.\s*get\(\s*itemId\s*\)/,
      "text must be resolved from extractedItemsMap by itemId"
    );
  });
});
