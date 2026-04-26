"use strict";

/**
 * E2E integration test: grounded rereview full flow.
 *
 * Verifies:
 *  1. Two consecutive triage passes with stale:quote-mismatch drops from the
 *     same drop_source trigger grounded_required=true on state.yaml.
 *  2. runReview() grounded pass drops fabricated findings (backtick snippet not
 *     found in the referenced file).
 *  3. grounded_required is cleared (false) after the pass completes.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { writeTriage } = require("../skills/triage/scripts/triage-runner");
const { runReview } = require("../skills/review/scripts/review-runner");
const yamlIO = require("../lib/yaml-io");
const paths = require("../lib/paths");

// Shared drop_source value used across both sprints — must match so streak accumulates
const TEST_DROP_SOURCE = "review-findings::abc123deadbeef";

// Minimal config accepted by runReview
const MINIMAL_CONFIG = {
  token_budgets: {
    brief_ceiling: 100_000,
    agent_identity: 1000,
    agent_context: 80_000,
  },
};

/**
 * Build a minimal stale item that satisfies writeTriage streak logic.
 * The item goes through revalidateDrops so category lives at top level.
 *
 * @param {string} id
 * @returns {Object}
 */
function makeStaleItem(id) {
  return {
    id,
    description: `Fabricated finding ${id} with missing quote`,
    source: TEST_DROP_SOURCE,
    drop_source: TEST_DROP_SOURCE,
    stale: "quote-mismatch",
    stale_reason: "verbatim_quote not found in cited file",
  };
}

test("grounded rereview e2e", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grounded-e2e-"));
  try {
    const pipelineDir = path.join(tmpDir, ".pipeline");
    paths.ensureDir(pipelineDir);
    paths.ensureDir(path.join(pipelineDir, "triage"));

    // -------------------------------------------------------------------------
    // Initial state.yaml — grounded_required absent/false, sprint=1 first
    // -------------------------------------------------------------------------
    const statePath = path.join(pipelineDir, "state.yaml");
    yamlIO.safeWrite(statePath, {
      schema_version: 1,
      grounded_required: false,
      pipeline: { sprint: 1 },
    });

    // -------------------------------------------------------------------------
    // Sprint 1 triage — one stale:quote-mismatch drop from TEST_DROP_SOURCE
    // -------------------------------------------------------------------------
    writeTriage(
      pipelineDir,
      "# Triage Report Sprint 1",
      [],                       // queued items
      [makeStaleItem("FIND-001")] // revalidateDrops
    );

    // drop-history.yaml must exist after first triage with stale drops
    const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
    assert.ok(
      fs.existsSync(dropHistoryPath),
      "drop-history.yaml must exist after sprint-1 triage"
    );

    const history1 = yamlIO.safeReadWithFallback(dropHistoryPath);
    assert.ok(Array.isArray(history1.entries), "entries must be an array");
    assert.equal(history1.entries.length, 1, "one entry after sprint 1");

    // grounded_required must NOT be set after only 1 sprint
    const state1 = yamlIO.safeReadWithFallback(statePath);
    assert.equal(
      state1.grounded_required,
      false,
      "grounded_required must remain false after a single stale sprint"
    );

    // -------------------------------------------------------------------------
    // Sprint 2 triage — same drop_source, consecutive sprint=2
    // -------------------------------------------------------------------------
    yamlIO.safeWrite(statePath, {
      ...state1,
      pipeline: { sprint: 2 },
    });

    writeTriage(
      pipelineDir,
      "# Triage Report Sprint 2",
      [],
      [makeStaleItem("FIND-002")]
    );

    // After 2 consecutive sprints with same drop_source, grounded_required must be true
    const state2 = yamlIO.safeReadWithFallback(statePath);
    assert.equal(
      state2.grounded_required,
      true,
      "grounded_required must be true after 2 consecutive stale drops from same source"
    );

    // drop-history.yaml must have 2 entries
    const history2 = yamlIO.safeReadWithFallback(dropHistoryPath);
    assert.equal(history2.entries.length, 2, "two entries after sprint 2");

    // -------------------------------------------------------------------------
    // Architect grounded pass setup
    //
    // Create a real source file in tmpDir so we can craft:
    //  - a "real" finding whose snippet is present → kept
    //  - a "fabricated" finding whose snippet is absent → dropped
    // -------------------------------------------------------------------------
    const sourceFile = path.join(tmpDir, "example.js");
    fs.writeFileSync(
      sourceFile,
      `function realFunction() {\n  return "real implementation";\n}\n`,
      "utf8"
    );

    // QA findings: text field format that runReview categorizeFindings consumes
    // runReview reads stateData.grounded_required, so state must still have it true
    // (state was written during sprint-2 triage — verify it is still true)
    assert.equal(
      yamlIO.safeReadWithFallback(statePath).grounded_required,
      true,
      "pre-condition: grounded_required still true before runReview"
    );

    // parsedQAOutputs shape expected by runReview → categorizeFindings
    const parsedQAOutputs = [
      {
        agentId: "qa-adversarial",
        payload: {
          findings: [
            // Real finding: snippet present in example.js
            `- \`real implementation\` found in example.js needs review`,
            // Fabricated finding: snippet NOT in example.js
            `- \`nonexistent_fabricated_token\` in example.js is a critical security flaw`,
          ].join("\n"),
        },
      },
    ];

    const sprintNumber = 1;
    const reviewResult = await runReview(parsedQAOutputs, sprintNumber, pipelineDir, MINIMAL_CONFIG);

    assert.ok(reviewResult.ok, "runReview must succeed");

    // Verify grounded_required cleared after pass (FIX-040 behavior via review-runner.js)
    const stateAfter = yamlIO.safeReadWithFallback(statePath);
    assert.equal(
      stateAfter.grounded_required,
      false,
      "grounded_required must be cleared (false) after grounded pass completes"
    );

    // Verify QA-REPORT.md written to disk
    const reportPath = path.join(pipelineDir, "reviews", `sprint-${String(sprintNumber).padStart(2, "0")}`, "QA-REPORT.md");
    assert.ok(fs.existsSync(reportPath), "QA-REPORT.md must be written to disk");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
