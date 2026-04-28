"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const triageRunner = require("../skills/triage/scripts/triage-runner");
const architectRunner = require("../skills/architect/scripts/architect-runner");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal isolated pipeline dir with state.yaml seeded.
 * state.yaml includes an optional sprint number for drop-history streak tests.
 *
 * @param {string} baseDir - temp directory to create .pipeline/ inside
 * @param {number|null} [sprint=null] - sprint number to seed in state.yaml
 * @returns {string} absolute path to .pipeline/
 */
function makePipelineDir(baseDir, sprint = null) {
  const pipelineDir = path.join(baseDir, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });
  fs.writeFileSync(
    path.join(pipelineDir, "state.yaml"),
    yaml.dump({
      schema_version: 1,
      pipeline: { phase: "triaging", sprint, wave: null, task_in_progress: null },
      last_updated: new Date().toISOString(),
    }),
    "utf8"
  );
  return pipelineDir;
}

/**
 * Build a minimal triage report string (content doesn't matter for disk tests).
 *
 * @returns {string}
 */
function minimalReport() {
  return "# Triage Report\n\n(test)\n";
}

const yamlIO = require("../lib/yaml-io");

// ---------------------------------------------------------------------------
// Part A — drop-history.yaml disk write
// ---------------------------------------------------------------------------

describe("Part A: drop-history.yaml disk write", () => {
  // -------------------------------------------------------------------------
  // Test A1: drop-history.yaml written when stale:quote-mismatch item present
  // -------------------------------------------------------------------------
  describe("A1: drop-history.yaml written to disk after triage drop", () => {
    let tmpDir, pipelineDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-triage-drop-"));
      pipelineDir = makePipelineDir(tmpDir, 1);
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("drop-history.yaml file exists after writeTriage with stale:quote-mismatch item", () => {
      // A queued item that carries a stale:quote-mismatch category triggers history write.
      // drop_source must be present (triage-runner warns and fills default, but we supply it).
      const staleItem = {
        id: "F-001",
        description: "Some finding",
        source: "review",
        category: "stale:quote-mismatch",
        drop_source: "triage::abc123",
        verbatim_quote: "XYZZY_DOES_NOT_EXIST",
        file_path: "lib/constants.js",
      };

      triageRunner.writeTriage(pipelineDir, minimalReport(), [staleItem], []);

      const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
      assert.ok(
        fs.existsSync(dropHistoryPath),
        "drop-history.yaml must be written when stale:quote-mismatch item is queued"
      );
    });

    it("drop-history.yaml contains one entry with the expected drop_source", () => {
      const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
      const history = yaml.load(fs.readFileSync(dropHistoryPath, "utf8"));
      assert.ok(Array.isArray(history.entries), "entries must be an array");
      assert.strictEqual(history.entries.length, 1, "must have exactly one entry");
      const drops = history.entries[0].drops;
      assert.ok(Array.isArray(drops) && drops.length > 0, "entry must have drops");
      assert.strictEqual(
        drops[0].drop_source,
        "triage::abc123",
        "drop_source must match the item's drop_source"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Test A2: drop-history.yaml written from revalidateDrops (pre-categorization)
  // -------------------------------------------------------------------------
  describe("A2: drop-history.yaml written when revalidateDrops has quote-mismatch", () => {
    let tmpDir, pipelineDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-triage-revalid-"));
      pipelineDir = makePipelineDir(tmpDir, 1);
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("drop-history.yaml written when revalidateDrops contains stale item", () => {
      // revalidateDrops uses stale: "quote-mismatch" (not category) — code in writeTriage
      // checks item.stale === "quote-mismatch" on revalidateDrops entries.
      const staleRevalidateDrop = {
        id: "F-002",
        description: "Stale finding from revalidation",
        source: "review",
        stale: "quote-mismatch",
        stale_reason: "verbatim_quote not found in lib/constants.js",
        drop_source: "triage::def456",
        verbatim_quote: "FABRICATED_QUOTE_XYZ",
        file_path: "lib/constants.js",
      };

      // No stale items in queued; stale comes via revalidateDrops
      triageRunner.writeTriage(pipelineDir, minimalReport(), [], [staleRevalidateDrop]);

      const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
      assert.ok(
        fs.existsSync(dropHistoryPath),
        "drop-history.yaml must be written when revalidateDrops has quote-mismatch entry"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Test A3: no drop-history.yaml when no stale items
  // -------------------------------------------------------------------------
  describe("A3: drop-history.yaml NOT written when no stale items", () => {
    let tmpDir, pipelineDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-triage-nostale-"));
      pipelineDir = makePipelineDir(tmpDir, 1);
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("drop-history.yaml absent when all queued items are non-stale", () => {
      const normalItem = {
        id: "F-003",
        description: "A normal design gap",
        source: "research",
        category: "design_gaps",
        drop_source: "triage::ghi789",
      };

      triageRunner.writeTriage(pipelineDir, minimalReport(), [normalItem], []);

      const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
      assert.ok(
        !fs.existsSync(dropHistoryPath),
        "drop-history.yaml must NOT be written when no stale:quote-mismatch items exist"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Test A4: grounded_required set true after 2 consecutive sprint drops
  // -------------------------------------------------------------------------
  describe("A4: grounded_required: true after 2 consecutive sprint drops from same source", () => {
    let tmpDir, pipelineDir;

    // Shared drop_source — same source across both sprints triggers the streak
    const SHARED_DROP_SOURCE = "triage::streak-source-xxxx";

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-triage-streak-"));
      pipelineDir = makePipelineDir(tmpDir, 1);
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("state.yaml does NOT have grounded_required after only 1 sprint drop", () => {
      // Sprint 1 drop — only one sprint, no streak yet
      const sprint1Item = {
        id: "F-S1-001",
        description: "Stale finding sprint 1",
        source: "review",
        category: "stale:quote-mismatch",
        drop_source: SHARED_DROP_SOURCE,
      };

      triageRunner.writeTriage(pipelineDir, minimalReport(), [sprint1Item], []);

      const statePath = path.join(pipelineDir, "state.yaml");
      const state = yaml.load(fs.readFileSync(statePath, "utf8"));
      // grounded_required must not be true after just one sprint
      assert.ok(
        state.grounded_required !== true,
        "grounded_required must NOT be set after only 1 sprint drop"
      );
    });

    it("grounded_required: true after 2nd consecutive sprint drop from same source", () => {
      // Advance state.yaml to sprint 2 for the streak calc
      const statePath = path.join(pipelineDir, "state.yaml");
      const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
      fs.writeFileSync(
        statePath,
        yaml.dump({ ...existingState, pipeline: { ...existingState.pipeline, sprint: 2 } }),
        "utf8"
      );

      // Sprint 2 drop — same source, consecutive sprint → should trigger grounded_required
      const sprint2Item = {
        id: "F-S2-001",
        description: "Stale finding sprint 2",
        source: "review",
        category: "stale:quote-mismatch",
        drop_source: SHARED_DROP_SOURCE,
      };

      triageRunner.writeTriage(pipelineDir, minimalReport(), [sprint2Item], []);

      const state = yaml.load(fs.readFileSync(statePath, "utf8"));
      assert.strictEqual(
        state.grounded_required,
        true,
        "grounded_required must be set to true after 2 consecutive sprint drops from same source"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Test A5: grounded_required NOT set for non-consecutive sprints
  // -------------------------------------------------------------------------
  describe("A5: grounded_required NOT set when sprints are non-consecutive", () => {
    let tmpDir, pipelineDir;

    const SHARED_DROP_SOURCE = "triage::nonconsec-source-yyyy";

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-triage-nonconsec-"));
      pipelineDir = makePipelineDir(tmpDir, 1);
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("grounded_required stays false when drops occur in non-consecutive sprints", () => {
      // Sprint 1 drop
      const sprint1Item = {
        id: "F-NC-S1",
        description: "Stale sprint 1",
        source: "review",
        category: "stale:quote-mismatch",
        drop_source: SHARED_DROP_SOURCE,
      };
      triageRunner.writeTriage(pipelineDir, minimalReport(), [sprint1Item], []);

      // Skip sprint 2 — jump to sprint 3 (non-consecutive)
      const statePath = path.join(pipelineDir, "state.yaml");
      const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
      fs.writeFileSync(
        statePath,
        yaml.dump({ ...existingState, pipeline: { ...existingState.pipeline, sprint: 3 } }),
        "utf8"
      );

      const sprint3Item = {
        id: "F-NC-S3",
        description: "Stale sprint 3",
        source: "review",
        category: "stale:quote-mismatch",
        drop_source: SHARED_DROP_SOURCE,
      };
      triageRunner.writeTriage(pipelineDir, minimalReport(), [sprint3Item], []);

      const state = yaml.load(fs.readFileSync(statePath, "utf8"));
      assert.ok(
        state.grounded_required !== true,
        "grounded_required must NOT be set for non-consecutive sprint drops"
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Part B — architect grounded review filter
// ---------------------------------------------------------------------------

describe("Part B: architect grounded review filter", () => {
  // -------------------------------------------------------------------------
  // B1: fabricated finding dropped when grounded_required: true
  // -------------------------------------------------------------------------
  describe("B1: fabricated finding dropped in grounded review pass", () => {
    let tmpDir, pipelineDir;

    // The real file we'll create so architect-runner can scan it
    const REAL_FILE_REL = "lib/constants.js";
    const REAL_QUOTE = "GROUNDED_REREVIEW_THRESHOLD = 2";
    const FAKE_QUOTE = "THIS_QUOTE_DOES_NOT_EXIST_IN_ANY_FILE_XYZZY_12345";

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-architect-grounded-"));
      pipelineDir = makePipelineDir(tmpDir, 1);

      // Create a real file at projectRoot/lib/constants.js with the real quote
      const libDir = path.join(tmpDir, "lib");
      fs.mkdirSync(libDir, { recursive: true });
      fs.writeFileSync(
        path.join(libDir, "constants.js"),
        `"use strict";\n\n// ${REAL_QUOTE}\nconst GROUNDED_REREVIEW_THRESHOLD = 2;\nmodule.exports = { GROUNDED_REREVIEW_THRESHOLD };\n`,
        "utf8"
      );

      // Seed grounded_required: true in state.yaml
      const statePath = path.join(pipelineDir, "state.yaml");
      const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
      fs.writeFileSync(
        statePath,
        yaml.dump({ ...existingState, grounded_required: true }),
        "utf8"
      );
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("fabricated finding (fake verbatim quote) is dropped", () => {
      // QA output: finding with plain file ref + backtick snippet that does NOT exist in constants.js.
      // File ref must be plain text (not backtick-wrapped) so the snippet regex picks up the
      // code quote rather than the filename as the verbatim snippet.
      const parsedQAOutputs = [
        {
          agentId: "qa-task-compliance",
          lensId: "task-compliance",
          payload: {
            findings: `- In ${REAL_FILE_REL} the call \`${FAKE_QUOTE}\` violates contract`,
          },
        },
      ];

      const config = { token_budgets: { brief_ceiling: 8000 } };
      const result = architectRunner.runReview(parsedQAOutputs, 1, pipelineDir, config);

      assert.ok(result.ok, "runReview must return ok");

      // The fabricated finding must not appear in any severity bucket
      const allFindings = [
        ...result.findings.critical,
        ...result.findings.high,
        ...result.findings.medium,
        ...result.findings.low,
      ];

      const fabricatedStillPresent = allFindings.some(f =>
        f.text && f.text.includes(FAKE_QUOTE)
      );
      assert.ok(
        !fabricatedStillPresent,
        `Fabricated finding with fake quote should be dropped, but still present`
      );
    });
  });

  // -------------------------------------------------------------------------
  // B2: real finding passes through grounded review
  // -------------------------------------------------------------------------
  describe("B2: real finding passes through grounded review", () => {
    let tmpDir, pipelineDir;

    const REAL_FILE_REL = "lib/constants.js";
    // This quote IS in the file created in before()
    const REAL_QUOTE = "GROUNDED_REREVIEW_THRESHOLD = 2";

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-architect-real-"));
      pipelineDir = makePipelineDir(tmpDir, 1);

      // Create real project file
      const libDir = path.join(tmpDir, "lib");
      fs.mkdirSync(libDir, { recursive: true });
      fs.writeFileSync(
        path.join(libDir, "constants.js"),
        `"use strict";\n\n// Grounded rereview\nconst GROUNDED_REREVIEW_THRESHOLD = 2;\nmodule.exports = { GROUNDED_REREVIEW_THRESHOLD };\n`,
        "utf8"
      );

      // Seed grounded_required: true
      const statePath = path.join(pipelineDir, "state.yaml");
      const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
      fs.writeFileSync(
        statePath,
        yaml.dump({ ...existingState, grounded_required: true }),
        "utf8"
      );
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("real finding (quote exists in file) is preserved", () => {
      // QA output: plain file ref + backtick snippet that DOES exist in constants.js.
      // File ref must be plain text so snippet regex picks up the code quote, not the filename.
      const parsedQAOutputs = [
        {
          agentId: "qa-task-compliance",
          lensId: "task-compliance",
          payload: {
            findings: `- In ${REAL_FILE_REL} the constant \`${REAL_QUOTE}\` should be documented`,
          },
        },
      ];

      const config = { token_budgets: { brief_ceiling: 8000 } };
      const result = architectRunner.runReview(parsedQAOutputs, 1, pipelineDir, config);

      assert.ok(result.ok, "runReview must return ok");

      const allFindings = [
        ...result.findings.critical,
        ...result.findings.high,
        ...result.findings.medium,
        ...result.findings.low,
      ];

      const realFindingPresent = allFindings.some(f =>
        f.text && f.text.includes(REAL_QUOTE)
      );
      assert.ok(
        realFindingPresent,
        `Real finding with grounded quote should pass through, but was dropped`
      );
    });
  });

  // -------------------------------------------------------------------------
  // B3: un-parseable finding (no backtick snippet) always passes through
  // -------------------------------------------------------------------------
  describe("B3: finding without parseable snippet always passes through", () => {
    let tmpDir, pipelineDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-architect-noquote-"));
      pipelineDir = makePipelineDir(tmpDir, 1);

      // Seed grounded_required: true
      const statePath = path.join(pipelineDir, "state.yaml");
      const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
      fs.writeFileSync(
        statePath,
        yaml.dump({ ...existingState, grounded_required: true }),
        "utf8"
      );
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("finding with no backtick snippet is preserved regardless of grounded_required", () => {
      // No backticks — cannot be parsed for grounded check, must be left untouched
      const parsedQAOutputs = [
        {
          agentId: "qa-requirements-alignment",
          lensId: "requirements-alignment",
          payload: {
            findings: "- The logging strategy is not documented in REQ.md",
          },
        },
      ];

      const config = { token_budgets: { brief_ceiling: 8000 } };
      const result = architectRunner.runReview(parsedQAOutputs, 1, pipelineDir, config);

      assert.ok(result.ok, "runReview must return ok");

      const allFindings = [
        ...result.findings.critical,
        ...result.findings.high,
        ...result.findings.medium,
        ...result.findings.low,
      ];

      const unparsedPresent = allFindings.some(f =>
        f.text && f.text.includes("logging strategy is not documented")
      );
      assert.ok(
        unparsedPresent,
        "Finding without backtick snippet must not be dropped — un-parseable findings always pass"
      );
    });
  });

  // -------------------------------------------------------------------------
  // B4: grounded_required cleared after runReview completes
  // -------------------------------------------------------------------------
  describe("B4: grounded_required cleared to false after runReview", () => {
    let tmpDir, pipelineDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-architect-cleared-"));
      pipelineDir = makePipelineDir(tmpDir, 1);

      const statePath = path.join(pipelineDir, "state.yaml");
      const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
      fs.writeFileSync(
        statePath,
        yaml.dump({ ...existingState, grounded_required: true }),
        "utf8"
      );
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("grounded_required is false after runReview completes the grounded pass", () => {
      const parsedQAOutputs = [
        {
          agentId: "qa-task-compliance",
          lensId: "task-compliance",
          payload: { findings: "- Minor style issue" },
        },
      ];

      const config = { token_budgets: { brief_ceiling: 8000 } };
      architectRunner.runReview(parsedQAOutputs, 1, pipelineDir, config);

      const statePath = path.join(pipelineDir, "state.yaml");
      const state = yaml.load(fs.readFileSync(statePath, "utf8"));
      assert.strictEqual(
        state.grounded_required,
        false,
        "grounded_required must be cleared to false after runReview completes"
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Part C — writeTriage error handling on grounded_required state.yaml write (FIX-046)
// ---------------------------------------------------------------------------

describe("Part C: writeTriage throws on grounded_required state.yaml write failure", () => {
  const SHARED_DROP_SOURCE = "review-findings::writefail-src-zzz";

  let tmpDir, pipelineDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-triage-writefail-"));
    pipelineDir = makePipelineDir(tmpDir, 1);

    // Sprint 1 — seed drop-history with one stale entry
    triageRunner.writeTriage(pipelineDir, minimalReport(), [
      {
        id: "F-WF-S1",
        description: "Stale sprint 1",
        source: "review",
        category: "stale:quote-mismatch",
        drop_source: SHARED_DROP_SOURCE,
      },
    ], []);

    // Advance to sprint 2 so next call triggers streak threshold
    const statePath = path.join(pipelineDir, "state.yaml");
    const existingState = yaml.load(fs.readFileSync(statePath, "utf8"));
    fs.writeFileSync(
      statePath,
      yaml.dump({ ...existingState, pipeline: { ...existingState.pipeline, sprint: 2 } }),
      "utf8"
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws with grounded_required and Re-run /triage in message when state.yaml write fails", () => {
    const sprint2Item = {
      id: "F-WF-S2",
      description: "Stale sprint 2",
      source: "review",
      category: "stale:quote-mismatch",
      drop_source: SHARED_DROP_SOURCE,
    };

    const origWrite = yamlIO.safeWrite;
    yamlIO.safeWrite = (p, d) => {
      if (p.endsWith("state.yaml")) throw new Error("disk full");
      origWrite(p, d);
    };

    let threw = false;
    let errorMsg = "";

    try {
      triageRunner.writeTriage(pipelineDir, "# report sprint 2", [sprint2Item], []);
    } catch (err) {
      threw = true;
      errorMsg = err.message;
    } finally {
      yamlIO.safeWrite = origWrite;
    }

    assert.ok(threw, "writeTriage must throw when state.yaml grounded_required write fails");
    assert.ok(errorMsg.includes("grounded_required"), "error must mention grounded_required");
    assert.ok(errorMsg.includes("Re-run /triage"), "error must include recovery instruction");

    // Transactional ordering: state.yaml is written FIRST. When that write
    // fails, drop-history.yaml MUST NOT have been touched — otherwise the
    // next /triage run would see a duplicate entry on retry.
    const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
    const dropHistory = yaml.load(fs.readFileSync(dropHistoryPath, "utf8"));
    const sprint2Entries = dropHistory.entries.filter((e) => e.sprint === 2);
    assert.equal(
      sprint2Entries.length,
      0,
      "drop-history.yaml must NOT contain sprint-2 entry when state.yaml write failed (transactional rollback)"
    );
  });
});
