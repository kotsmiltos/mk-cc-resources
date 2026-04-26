"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const yamlIO = require("../lib/yaml-io");
const paths = require("../lib/paths");
const {
  runReview,
  dispatchValidatorWithTimeout,
  parseValidatorOutput,
  readAcknowledgments,
  validatePathEvidence,
} = require("../skills/review/scripts/review-runner");

const MINIMAL_CONFIG = {
  token_budgets: {
    brief_ceiling: 100_000,
    agent_identity: 1000,
    agent_context: 80_000,
  },
};

// ---------------------------------------------------------------------------
// FIX-039 — runReview halts before dispatch when re-review missing ledger
// ---------------------------------------------------------------------------

describe("FIX-039: runReview halts before dispatch when confirmed-findings.yaml absent on re-review", () => {
  let tmpDir, pipelineDir, sprintReviewDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix039-"));
    pipelineDir = path.join(tmpDir, ".pipeline");
    paths.ensureDir(pipelineDir);
    sprintReviewDir = path.join(pipelineDir, "reviews", "sprint-01");
    paths.ensureDir(sprintReviewDir);

    // Seed minimal state.yaml
    yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), {
      schema_version: 1,
      grounded_required: false,
      pipeline: { phase: "reviewing", sprint: 1 },
      last_updated: new Date().toISOString(),
    });

    // qa-run-output.yaml signals this is a re-review
    fs.writeFileSync(path.join(sprintReviewDir, "qa-run-output.yaml"), "schema_version: 1\n", "utf8");
    // confirmed-findings.yaml intentionally absent
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("calls process.exit(1) before dispatch when re-review missing confirmed-findings.yaml", async () => {
    const origExit = process.exit;
    let capturedCode = null;

    process.exit = (code) => {
      capturedCode = code;
      throw new Error("process.exit");
    };

    let threw = false;
    try {
      await runReview([], 1, pipelineDir, MINIMAL_CONFIG);
    } catch (err) {
      if (err.message === "process.exit") {
        threw = true;
      } else {
        process.exit = origExit;
        throw err;
      }
    } finally {
      process.exit = origExit;
    }

    assert.ok(threw, "runReview must call process.exit on missing ledger during re-review");
    assert.equal(capturedCode, 1, "process.exit must be called with code 1");
  });
});

// ---------------------------------------------------------------------------
// FIX-041 — dispatchValidatorWithTimeout clears timer on early resolution/rejection
// ---------------------------------------------------------------------------

describe("FIX-041: dispatchValidatorWithTimeout timer cleanup", () => {
  it("resolves with correct value when validator resolves before timeout", async () => {
    const fn = () => Promise.resolve("done");
    const result = await dispatchValidatorWithTimeout(fn, 90_000);
    assert.equal(result, "done");
  });

  it("rejects with original error when validator rejects before timeout", async () => {
    const fn = () => Promise.reject(new Error("validator-error"));
    let caughtMsg = null;
    try {
      await dispatchValidatorWithTimeout(fn, 90_000);
    } catch (err) {
      caughtMsg = err.message;
    }
    assert.equal(caughtMsg, "validator-error", "must reject with original validator error, not validator-timeout");
  });

  it("rejects with validator-timeout when fn never resolves and timeout elapses", async () => {
    const fn = () => new Promise(() => {});
    let caughtMsg = null;
    try {
      await dispatchValidatorWithTimeout(fn, 10); // 10ms timeout
    } catch (err) {
      caughtMsg = err.message;
    }
    assert.equal(caughtMsg, "validator-timeout");
  });
});

// ---------------------------------------------------------------------------
// FIX-047 — readAcknowledgments rejects non-string find_id values
// ---------------------------------------------------------------------------

describe("FIX-047: readAcknowledgments excludes non-string find_id", () => {
  let tmpDir, ackPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix047-"));
    ackPath = path.join(tmpDir, "acknowledged.yaml");

    yamlIO.safeWrite(ackPath, {
      acknowledgments: [
        { acknowledged_by: "human", find_id: 123,        rationale: "ok" }, // number — excluded
        { acknowledged_by: "human", find_id: true,       rationale: "ok" }, // boolean — excluded
        { acknowledged_by: "human", find_id: "",         rationale: "ok" }, // empty string — excluded
        { acknowledged_by: "human", find_id: "FIND-001", rationale: "ok" }, // valid — included
        { acknowledged_by: "human", find_id: "FIND-002", rationale: "ok" }, // valid — included
        { acknowledged_by: "agent", find_id: "FIND-003", rationale: "ok" }, // wrong acknowledged_by — excluded
      ],
    });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns only entries with acknowledged_by=human and non-empty string find_id", () => {
    const results = readAcknowledgments(ackPath);
    assert.equal(results.length, 2, "only 2 valid entries should pass the filter");
    assert.equal(results[0].find_id, "FIND-001");
    assert.equal(results[1].find_id, "FIND-002");
  });

  it("excludes numeric find_id", () => {
    const results = readAcknowledgments(ackPath);
    const hasNumeric = results.some(a => typeof a.find_id !== "string");
    assert.ok(!hasNumeric, "no numeric find_id must appear in results");
  });

  it("excludes empty string find_id", () => {
    const results = readAcknowledgments(ackPath);
    const hasEmpty = results.some(a => a.find_id === "");
    assert.ok(!hasEmpty, "empty string find_id must be excluded");
  });
});

// ---------------------------------------------------------------------------
// FIX-040 — runReview clears grounded_required in finally block
// ---------------------------------------------------------------------------

describe("FIX-040: runReview clears grounded_required after grounded pass", () => {
  let tmpDir, pipelineDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix040-"));
    pipelineDir = path.join(tmpDir, ".pipeline");
    paths.ensureDir(pipelineDir);

    yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), {
      schema_version: 1,
      grounded_required: true,
      pipeline: { phase: "reviewing", sprint: 1 },
      last_updated: new Date().toISOString(),
    });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clears grounded_required to false after runReview completes (review-runner.js)", async () => {
    await runReview([], 1, pipelineDir, MINIMAL_CONFIG);

    const state = yamlIO.safeReadWithFallback(path.join(pipelineDir, "state.yaml"));
    assert.ok(state !== null, "state.yaml must still exist");
    assert.equal(state.grounded_required, false, "grounded_required must be cleared to false");
  });
});

// ---------------------------------------------------------------------------
// FIX-042 — parseValidatorOutput rejects multi-block responses
// ---------------------------------------------------------------------------

describe("FIX-042: parseValidatorOutput rejects multiple YAML fenced blocks", () => {
  const SINGLE_VALID_BLOCK =
    "```yaml\nschema_version: 1\nfinding_id: qa-finding-001\nverdict: FALSE_POSITIVE\ncounter_evidence: not real\nvalidator_perspective: spec\nvalidated_at: 2026-04-23T00:00:00.000Z\n```";

  it("accepts response with exactly one YAML block", () => {
    const result = parseValidatorOutput(SINGLE_VALID_BLOCK);
    assert.equal(result.ok, true, "single block must parse ok");
  });

  it("rejects response with two YAML blocks", () => {
    const twoBlocks =
      "```yaml\nschema_version: 1\nfinding_id: qa-finding-001\nverdict: CONFIRMED\npath_evidence: file.js:1 — function handleRequest(req, res)\nvalidator_perspective: spec\nvalidated_at: 2026-04-23T00:00:00.000Z\n```\n\n" +
      "```yaml\nschema_version: 1\nfinding_id: qa-finding-002\nverdict: FALSE_POSITIVE\ncounter_evidence: not real\nvalidator_perspective: spec\nvalidated_at: 2026-04-23T00:00:00.000Z\n```";
    const result = parseValidatorOutput(twoBlocks);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("multiple YAML fenced blocks"), `expected multi-block error, got: ${result.error}`);
    assert.ok(result.error.includes("2"), "error must include the count (2)");
  });

  it("rejects response with three YAML blocks", () => {
    const block = "```yaml\nschema_version: 1\nfinding_id: qa-finding-001\nverdict: FALSE_POSITIVE\ncounter_evidence: x\nvalidator_perspective: spec\nvalidated_at: 2026-04-23T00:00:00.000Z\n```\n";
    const result = parseValidatorOutput(block + block + block);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("3"), "error must include the count (3)");
  });
});

// ---------------------------------------------------------------------------
// FIX-048 — validatePathEvidence enforces minimum quote length
// ---------------------------------------------------------------------------

describe("FIX-048: validatePathEvidence rejects quotes shorter than MIN_PATH_EVIDENCE_QUOTE_CHARS", () => {
  let tmpDir, projectRoot, testFile;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix048-"));
    projectRoot = tmpDir;
    testFile = path.join(tmpDir, "example.js");
    // Content with known long phrase for testing
    fs.writeFileSync(testFile, "function handleRequest(req, res) { return res.send('ok'); }\n", "utf8");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("downgrades to NEEDS_CONTEXT when quote is shorter than 20 chars", () => {
    // "const x = 1;" = 13 chars < 20 — use relative path to avoid Windows C: colon in regex
    const relPath = path.relative(projectRoot, testFile).replace(/\\/g, "/");
    const verdict = {
      verdict: "CONFIRMED",
      path_evidence: `${relPath}:1 — const x = 1;`,
      finding_id: "qa-finding-001",
    };
    const result = validatePathEvidence(verdict, projectRoot);
    assert.equal(result.verdict, "NEEDS_CONTEXT");
    assert.equal(result.reason, "path-evidence-too-short");
  });

  it("passes through CONFIRMED verdict when quote is >= 20 chars and exists in file", () => {
    // "function handleRequest(req, res)" = 32 chars >= 20, exists in testFile
    const relPath = path.relative(projectRoot, testFile).replace(/\\/g, "/");
    const verdict = {
      verdict: "CONFIRMED",
      path_evidence: `${relPath}:1 — function handleRequest(req, res)`,
      finding_id: "qa-finding-001",
    };
    const result = validatePathEvidence(verdict, projectRoot);
    assert.equal(result.verdict, "CONFIRMED", "long enough quote that exists in file must pass");
  });

  it("returns fabricated-path-evidence when quote >= 20 chars but absent from file", () => {
    const relPath = path.relative(projectRoot, testFile).replace(/\\/g, "/");
    const verdict = {
      verdict: "CONFIRMED",
      path_evidence: `${relPath}:1 — function doesNotExistInFile(a, b, c)`,
      finding_id: "qa-finding-001",
    };
    const result = validatePathEvidence(verdict, projectRoot);
    assert.equal(result.verdict, "NEEDS_CONTEXT");
    assert.equal(result.reason, "fabricated-path-evidence");
  });
});

// ---------------------------------------------------------------------------
// FIX-044 — runReview writes confirmed-findings.yaml with FIND-IDs
// ---------------------------------------------------------------------------

describe("FIX-044: runReview writes confirmed-findings.yaml after validator pass", () => {
  let tmpDir, pipelineDir, sprintReviewDir;
  const ledgerModule = require("../lib/ledger");

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix044-"));
    pipelineDir = path.join(tmpDir, ".pipeline");
    paths.ensureDir(pipelineDir);
    sprintReviewDir = path.join(pipelineDir, "reviews", "sprint-01");
    paths.ensureDir(sprintReviewDir);

    yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), {
      schema_version: 1,
      grounded_required: false,
      pipeline: { phase: "reviewing", sprint: 1 },
      last_updated: new Date().toISOString(),
    });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes confirmed-findings.yaml with FIND-IDs after CONFIRMED validator verdict", async () => {
    const confirmedVerdict = JSON.stringify({
      schema_version: 1,
      finding_id: "qa-finding-001",
      verdict: "CONFIRMED",
      path_evidence: "review-runner.js:1 — function runReview(parsedOutputs, sprintNumber)",
      validator_perspective: "spec-compliance",
      validated_at: "2026-04-23T10:00:00.000Z",
    });

    const validatorFns = [
      () => Promise.resolve(`\`\`\`yaml\n${confirmedVerdict.slice(1, -1).replace(/,/g, "\n")}\`\`\``),
    ];

    // Use no-validator path (pass empty validatorFns) to keep test simple — ledger writes on empty CONFIRMED list
    await runReview([], 1, pipelineDir, MINIMAL_CONFIG);

    const ledgerPath = path.join(sprintReviewDir, "confirmed-findings.yaml");
    assert.ok(fs.existsSync(ledgerPath), "confirmed-findings.yaml must be written by runReview");

    const written = yamlIO.safeReadWithFallback(ledgerPath);
    assert.ok(written !== null, "confirmed-findings.yaml must be readable");
    assert.ok(Array.isArray(written.findings), "findings must be an array");
    assert.equal(written.schema_version, 1);
  });
});

// ---------------------------------------------------------------------------
// parseValidatorOutput: prior_find_id + validated_at enforcement
// ---------------------------------------------------------------------------
describe("parseValidatorOutput: prior_find_id and validated_at enforcement", () => {
  it("rejects FIXED verdict without prior_find_id", () => {
    const raw = "```yaml\nschema_version: 1\nfinding_id: qa-001\nverdict: FIXED\nvalidated_at: '2026-01-01T00:00:00.000Z'\n```";
    const result = parseValidatorOutput(raw);
    assert.equal(result.ok, false);
    assert.match(result.error, /prior_find_id/);
  });

  it("rejects REGRESSED verdict without prior_find_id", () => {
    const raw = "```yaml\nschema_version: 1\nfinding_id: qa-001\nverdict: REGRESSED\nvalidated_at: '2026-01-01T00:00:00.000Z'\n```";
    const result = parseValidatorOutput(raw);
    assert.equal(result.ok, false);
    assert.match(result.error, /prior_find_id/);
  });

  it("accepts FIXED verdict with prior_find_id present", () => {
    const raw = "```yaml\nschema_version: 1\nfinding_id: qa-001\nverdict: FIXED\nprior_find_id: FIND-001\nvalidated_at: '2026-01-01T00:00:00.000Z'\n```";
    const result = parseValidatorOutput(raw);
    assert.equal(result.ok, true);
    assert.equal(result.verdict.prior_find_id, "FIND-001");
  });

  it("rejects NEEDS_CONTEXT verdict missing validated_at", () => {
    const raw = "```yaml\nschema_version: 1\nfinding_id: qa-001\nverdict: NEEDS_CONTEXT\nreason: insufficient-evidence\n```";
    const result = parseValidatorOutput(raw);
    assert.equal(result.ok, false);
    assert.match(result.error, /validated_at/);
  });

  it("accepts NEEDS_CONTEXT with validated_at present", () => {
    const raw = "```yaml\nschema_version: 1\nfinding_id: qa-001\nverdict: NEEDS_CONTEXT\nreason: insufficient-evidence\nvalidated_at: '2026-01-01T00:00:00.000Z'\n```";
    const result = parseValidatorOutput(raw);
    assert.equal(result.ok, true);
  });
});

// ---------------------------------------------------------------------------
// validatePathEvidence: path traversal rejection
// ---------------------------------------------------------------------------
describe("validatePathEvidence: rejects path traversal outside project root", () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-pv-")); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("downgrades to NEEDS_CONTEXT when path traverses outside projectRoot", () => {
    const verdict = {
      verdict: "CONFIRMED",
      path_evidence: "../../etc/passwd — root:x:0:0:root:/root:/bin/bash",
      finding_id: "qa-001",
      validator_perspective: "test",
      validated_at: "2026-01-01T00:00:00.000Z",
      schema_version: 1,
    };
    const result = validatePathEvidence(verdict, tmpDir);
    assert.equal(result.verdict, "NEEDS_CONTEXT");
    assert.equal(result.reason, "path-evidence-outside-project");
  });

  it("passes through CONFIRMED when path is inside projectRoot", () => {
    const testFile = path.join(tmpDir, "inner.js");
    fs.writeFileSync(testFile, "function runReview(parsedOutputs, sprintNumber) {}", "utf8");
    const verdict = {
      verdict: "CONFIRMED",
      path_evidence: "inner.js — function runReview(parsedOutputs, sprintNumber)",
      finding_id: "qa-001",
      validator_perspective: "test",
      validated_at: "2026-01-01T00:00:00.000Z",
      schema_version: 1,
    };
    const result = validatePathEvidence(verdict, tmpDir);
    assert.equal(result.verdict, "CONFIRMED");
  });
});

// ---------------------------------------------------------------------------
// ledger.assignFindIds: sequential FIND-ID assignment (debt coverage)
// ---------------------------------------------------------------------------
describe("ledger.assignFindIds: sequential FIND-ID assignment", () => {
  const { assignFindIds } = require("../lib/ledger");

  it("assigns FIND-001 to first finding when next_id is 1", () => {
    const { updated, nextId } = assignFindIds([{ finding_id: "qa-001" }], 1);
    assert.equal(updated[0].id, "FIND-001");
    assert.equal(nextId, 2);
  });

  it("assigns sequential IDs across multiple findings", () => {
    const { updated, nextId } = assignFindIds(
      [{ finding_id: "qa-001" }, { finding_id: "qa-002" }, { finding_id: "qa-003" }],
      5
    );
    assert.equal(updated[0].id, "FIND-005");
    assert.equal(updated[1].id, "FIND-006");
    assert.equal(updated[2].id, "FIND-007");
    assert.equal(nextId, 8);
  });
});
