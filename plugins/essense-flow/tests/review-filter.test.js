"use strict";

/**
 * Phase A noise filter — tests for review-runner helpers that strip positive
 * confirmations, fix recommendations, severity-prefix mislabels, and
 * cross-perspective restatements before findings reach QA-REPORT.md.
 *
 * Empirical motivation: sprint-6/7/8 review reports had ~80% noise rate at
 * the critical tier (positives like "FR-015 met" classified as critical;
 * fix recs like "Add path.resolve check" listed as findings; same root bug
 * cited 3-5× across perspectives). Routing on inflated counts then routed
 * sprints back to architecture/research for non-existent gaps.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  extractSeverityPrefix,
  isPositiveConfirmation,
  isFixRecommendation,
  findingDedupKey,
  dedupFindings,
  filterFindings,
  categorizeFindings,
  validatePathEvidence,
} = require("../skills/review/scripts/review-runner");

describe("extractSeverityPrefix — leading severity tag wins over keyword infer", () => {
  it("extracts uppercase CRITICAL prefix", () => {
    const r = extractSeverityPrefix("CRITICAL: path traversal in foo.js");
    assert.equal(r.severity, "critical");
    assert.equal(r.stripped, "path traversal in foo.js");
    assert.equal(r.hadPrefix, true);
  });

  it("extracts mixed-case High prefix", () => {
    const r = extractSeverityPrefix("High: regex too permissive");
    assert.equal(r.severity, "high");
  });

  it("returns null severity + original text when no prefix", () => {
    const r = extractSeverityPrefix("regex too permissive");
    assert.equal(r.severity, null);
    assert.equal(r.stripped, "regex too permissive");
    assert.equal(r.hadPrefix, false);
  });

  it("does not match keywords that are not leading prefixes", () => {
    // "the critical path is..." should NOT extract — that's prose, not a tag
    const r = extractSeverityPrefix("the critical path is wrong");
    assert.equal(r.severity, null);
  });
});

describe("isPositiveConfirmation — drops 'X met' / 'tests passing' bullets", () => {
  it("classifies 'FR-015 — met' as positive", () => {
    assert.equal(isPositiveConfirmation("FR-015 terminal state guard — met"), true);
  });

  it("classifies 'TASK-FIX-027 met' as positive", () => {
    assert.equal(isPositiveConfirmation("TASK-FIX-027 met: realpathSync used"), true);
  });

  it("classifies 'N/N tests passing' as positive", () => {
    assert.equal(isPositiveConfirmation("569/569 tests passing"), true);
  });

  it("does NOT classify 'FR-052 partial — prior_find_id not validated' as positive", () => {
    // 'partial' alone is not negative, but the negative indicator 'not enforced/missing/etc'
    // distinguishes real gaps from confirmations
    assert.equal(
      isPositiveConfirmation("FR-052 partial — prior_find_id field not schema-validated; missing"),
      false
    );
  });

  it("does NOT classify a real bug finding as positive", () => {
    assert.equal(
      isPositiveConfirmation("path traversal vulnerability allows reading host files"),
      false
    );
  });

  it("does NOT classify 'verified passing under attack' if it has 'fail' indicator nearby", () => {
    // This one is ambiguous but conservative: if ANY negative indicator is present,
    // we treat as a real finding to be safe.
    assert.equal(
      isPositiveConfirmation("validator verified — but fails on edge case"),
      false
    );
  });
});

describe("isFixRecommendation — drops 'Add X' / 'Wrap Y' bullets", () => {
  it("classifies 'Add path.resolve containment check' as fix rec", () => {
    assert.equal(isFixRecommendation("Add path.resolve containment check"), true);
  });

  it("classifies 'Wrap validatorFn() in try/catch' as fix rec", () => {
    assert.equal(isFixRecommendation("Wrap validatorFn() in try/catch"), true);
  });

  it("classifies 'Replace safeRead in finally' as fix rec", () => {
    assert.equal(isFixRecommendation("Replace safeRead in finally with safeReadWithFallback"), true);
  });

  it("classifies 'Plan Sprint 7 with validator deliverables' as fix rec", () => {
    assert.equal(isFixRecommendation("Plan Sprint 7 with validator deliverables"), true);
  });

  it("does NOT classify 'addEventListener leaks memory' as fix rec", () => {
    // Starts with lowercase 'add' as part of identifier, not imperative verb
    assert.equal(isFixRecommendation("addEventListener leaks memory"), false);
  });

  it("does NOT classify a real bug finding as fix rec", () => {
    assert.equal(
      isFixRecommendation("path traversal vulnerability in validatePathEvidence"),
      false
    );
  });
});

describe("findingDedupKey — same identifier set → same key", () => {
  it("collapses two rephrasings of the same root cause", () => {
    const k1 = findingDedupKey("path traversal in validatePathEvidence at review-runner.js:1026");
    const k2 = findingDedupKey("path traversal vulnerability in validatePathEvidence reads host files (review-runner.js)");
    assert.equal(k1, k2, "rephrasings of same bug share a dedup key");
    assert.equal(k1, "ident:validatePathEvidence", "key anchors on first camelCase identifier");
  });

  it("produces different keys for findings citing different identifiers", () => {
    const k1 = findingDedupKey("path traversal in validatePathEvidence at review-runner.js:1026");
    const k2 = findingDedupKey("regex bug in parseValidatorOutput at review-runner.js:885");
    assert.notEqual(k1, k2);
  });

  it("produces unique passthrough key when no identifier or file ref present", () => {
    const k1 = findingDedupKey("a generic statement with no identifier");
    const k2 = findingDedupKey("a different generic statement");
    assert.ok(k1.startsWith("__unique__"));
    assert.ok(k2.startsWith("__unique__"));
    assert.notEqual(k1, k2);
  });
});

describe("dedupFindings — collapses cross-perspective restatements", () => {
  it("keeps first occurrence of duplicate file+function findings", () => {
    const items = [
      { stripped: "path traversal in validatePathEvidence at review-runner.js:1026", perspective: "qa-adversarial" },
      { stripped: "path traversal in validatePathEvidence — host file read (review-runner.js)", perspective: "qa-fitness-functions" },
      { stripped: "regex bug in parseValidatorOutput at review-runner.js:885", perspective: "qa-adversarial" },
    ];
    const result = dedupFindings(items);
    assert.equal(result.length, 2, "two unique findings, not three");
    assert.equal(result[0].perspective, "qa-adversarial", "first occurrence wins");
  });

  it("keeps generic-text findings (no file ref) untouched", () => {
    const items = [
      { stripped: "generic gap statement A" },
      { stripped: "generic gap statement B" },
    ];
    const result = dedupFindings(items);
    assert.equal(result.length, 2);
  });
});

describe("filterFindings — full pipeline", () => {
  it("drops positives, fix-recs, dupes; keeps real findings", () => {
    const raw = [
      { text: "FR-015 terminal state guard — met", source: "a", perspective: "p1", section: "findings" },
      { text: "Add path.resolve containment check", source: "a", perspective: "p1", section: "findings" },
      { text: "CRITICAL: path traversal in validatePathEvidence at review-runner.js:1026", source: "a", perspective: "qa-adv", section: "findings" },
      { text: "critical: path traversal in validatePathEvidence — host file read (review-runner.js)", source: "b", perspective: "qa-fit", section: "findings" },
      { text: "569/569 tests passing", source: "a", perspective: "p1", section: "findings" },
    ];
    const { kept, dropped } = filterFindings(raw);
    assert.equal(dropped.positives, 2, "2 positives dropped");
    assert.equal(dropped.fixRecs, 1, "1 fix rec dropped");
    assert.equal(dropped.dupes, 1, "1 cross-perspective dupe dropped");
    assert.equal(kept.length, 1, "1 real finding kept");
    assert.equal(kept[0].severity, "critical", "severity from prefix preserved");
  });

  it("preserves severity prefix when present", () => {
    const raw = [
      { text: "HIGH: regex bug in parseValidatorOutput", source: "a", perspective: "p1", section: "findings" },
    ];
    const { kept } = filterFindings(raw);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].severity, "high");
    assert.equal(kept[0].hadPrefix, true);
  });

  it("returns null severity when no prefix (caller falls back to inferSeverity)", () => {
    const raw = [
      { text: "regex bug in parseValidatorOutput", source: "a", perspective: "p1", section: "findings" },
    ];
    const { kept } = filterFindings(raw);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].severity, null);
    assert.equal(kept[0].hadPrefix, false);
  });
});

describe("categorizeFindings — end-to-end with filter applied", () => {
  it("filters noise before tiering — sprint-8-style payload reduces 5 → 1", () => {
    const parsedOutputs = [
      {
        agentId: "qa-adversarial",
        perspectiveId: "qa-adversarial",
        payload: {
          findings: [
            "- FR-015 terminal state guard — met",
            "- Add path.resolve containment check",
            "- CRITICAL: path traversal in validatePathEvidence at review-runner.js:1026",
            "- 569/569 tests passing",
          ].join("\n"),
        },
      },
      {
        agentId: "qa-fitness-functions",
        perspectiveId: "qa-fitness-functions",
        payload: {
          findings: [
            "- critical: path traversal in validatePathEvidence — host file read (review-runner.js)",
          ].join("\n"),
        },
      },
    ];
    const result = categorizeFindings(parsedOutputs);
    // 1 real finding, classified as critical via prefix
    assert.equal(result.bySeverity.critical.length, 1, "1 critical (after filter)");
    assert.equal(result.bySeverity.high.length, 0);
    assert.equal(result.bySeverity.medium.length, 0);
    assert.equal(result.bySeverity.low.length, 0);
    assert.deepEqual(result.droppedCounts, { positives: 2, fixRecs: 1, dupes: 1 });
  });

  it("preserves real findings with no severity prefix using inferSeverity fallback", () => {
    const parsedOutputs = [
      {
        agentId: "a",
        perspectiveId: "p1",
        payload: {
          findings: "- regex must fix in parseValidatorOutput crashes on CRLF",
        },
      },
    ];
    const result = categorizeFindings(parsedOutputs);
    // "must fix" matches inferSeverity's critical keyword list
    assert.equal(result.bySeverity.critical.length, 1);
  });
});

describe("validatePathEvidence — line-proximity check (Phase B)", () => {
  function makeProject(fileName, content) {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-pathev-"));
    fs.writeFileSync(path.join(tmpRoot, fileName), content, "utf8");
    return tmpRoot;
  }

  it("accepts when quote appears at cited line", () => {
    const lines = [];
    for (let i = 0; i < 50; i++) lines.push(`// line ${i + 1} filler text content here`);
    lines[19] = "function validatePathEvidence(verdict, projectRoot) { // KEY LINE";
    const tmp = makeProject("target.js", lines.join("\n"));
    try {
      const verdict = {
        verdict: "CONFIRMED",
        path_evidence: "target.js:20 — function validatePathEvidence(verdict, projectRoot) { // KEY LINE",
      };
      const result = validatePathEvidence(verdict, tmp);
      assert.equal(result.verdict, "CONFIRMED");
      assert.equal(result.reason, undefined);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("rejects sprint-8-style fabrication: quote present in file but far from cited line", () => {
    // Reproduces the sprint-8 path-traversal regression where the finding cited
    // L953-964 but the verbatim quote was actually at L1046.
    const lines = [];
    for (let i = 0; i < 1100; i++) lines.push(`// filler line ${i + 1}`);
    lines[1045] = "if (!path.resolve(absPath).startsWith(path.resolve(projectRoot) + path.sep))";
    const tmp = makeProject("review-runner.js", lines.join("\n"));
    try {
      const verdict = {
        verdict: "CONFIRMED",
        path_evidence: "review-runner.js:953 — if (!path.resolve(absPath).startsWith(path.resolve(projectRoot) + path.sep))",
      };
      const result = validatePathEvidence(verdict, tmp);
      assert.equal(result.verdict, "NEEDS_CONTEXT");
      assert.equal(result.reason, "path-evidence-line-mismatch");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("accepts quote within ±10 line tolerance of cited line", () => {
    const lines = [];
    for (let i = 0; i < 50; i++) lines.push(`// filler line ${i + 1}`);
    lines[24] = "const trimmedQuote = quote.trim(); // tolerated drift";
    const tmp = makeProject("target.js", lines.join("\n"));
    try {
      const verdict = {
        verdict: "CONFIRMED",
        path_evidence: "target.js:30 — const trimmedQuote = quote.trim(); // tolerated drift",
      };
      const result = validatePathEvidence(verdict, tmp);
      assert.equal(result.verdict, "CONFIRMED", `got: ${JSON.stringify(result)}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("falls back to file-wide check when no line cited (no regression)", () => {
    const tmp = makeProject("target.js", "// preamble\nfunction foo() { return 42; }\n// trailing");
    try {
      const verdict = {
        verdict: "CONFIRMED",
        path_evidence: "target.js — function foo() { return 42; }",
      };
      const result = validatePathEvidence(verdict, tmp);
      assert.equal(result.verdict, "CONFIRMED");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("rejects fabricated-path-evidence when quote nowhere in file", () => {
    const tmp = makeProject("target.js", "// real content only");
    try {
      const verdict = {
        verdict: "CONFIRMED",
        path_evidence: "target.js:1 — quote that does not exist anywhere in this file content",
      };
      const result = validatePathEvidence(verdict, tmp);
      assert.equal(result.verdict, "NEEDS_CONTEXT");
      assert.equal(result.reason, "fabricated-path-evidence");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
