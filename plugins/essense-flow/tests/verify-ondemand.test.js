"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { runVerify, computeItemId } = require("../skills/verify/scripts/verify-runner");

// Minimal spec content used across tests in this file.
// Must have at least one ## section and one verifiable requirement.
const SPEC_CONTENT = `## Requirements

The system must satisfy this testable requirement.
`;

// Derive the spec hash the same way verify-runner does:
// strip frontmatter (none here), then SHA-256 the trimmed content.
const SPEC_HASH = crypto
  .createHash("sha256")
  .update(SPEC_CONTENT.trim())
  .digest("hex");

// Stable item ID for the single test requirement.
const ITEM_ID = computeItemId("Requirements", "The system must satisfy this testable requirement.");

describe("verify on-demand mode", () => {
  let tmpDir, pipelineDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-ondemand-"));
    pipelineDir = path.join(tmpDir, ".pipeline");
    fs.mkdirSync(pipelineDir, { recursive: true });

    const yaml = require("js-yaml");
    fs.writeFileSync(
      path.join(pipelineDir, "state.yaml"),
      yaml.dump({ schema_version: 1, pipeline: { phase: "reviewing", sprint: 5 }, last_updated: new Date().toISOString() }),
      "utf8"
    );

    // Seed SPEC.md so preflight passes and runVerify can proceed to writeReport.
    const elicitDir = path.join(pipelineDir, "elicitation");
    fs.mkdirSync(elicitDir, { recursive: true });
    fs.writeFileSync(path.join(elicitDir, "SPEC.md"), SPEC_CONTENT, "utf8");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not modify state.yaml in on-demand mode", async () => {
    const stateBefore = fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8");

    // dispatchFn is called twice:
    //   call 1 — extraction brief  → return extracted items YAML
    //   call 2 — verification brief → return verdict YAML
    let dispatchCallCount = 0;
    async function dispatchFn(_brief) {
      dispatchCallCount++;

      if (dispatchCallCount === 1) {
        // Extraction response: one verifiable item in the Requirements section.
        return `\`\`\`yaml
schema_version: 1
spec_hash: "${SPEC_HASH}"
section_headings:
  - Requirements
total_items: 1
verifiable_items: 1
items:
  - text: "The system must satisfy this testable requirement."
    section: Requirements
    verifiable: true
    verifiable_reason: "Directly testable behaviour."
    files: []
\`\`\``;
      }

      // Verification response for the Requirements group.
      return `\`\`\`yaml
agent_id: "verify-agent-Requirements"
group_id: "Requirements"
spec_hash: "${SPEC_HASH}"
read_complete: true
files_read: []
verdicts:
  - item_id: "${ITEM_ID}"
    verdict: MATCH
    confidence: CONFIRMED
    evidence: "Requirement present in codebase."
    absence_type: null
    decision_override: null
    decision_scope_confirmed: null
\`\`\``;
    }

    await runVerify({
      pipelineDir,
      pluginRoot: path.resolve("."),
      config: {},
      mode: "on-demand",
      dispatchFn,
    });

    const stateAfter = fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8");
    assert.strictEqual(stateBefore, stateAfter, "state.yaml must not change in on-demand mode");

    const REPORT_ONDEMAND_REL = "VERIFICATION-REPORT-ondemand.md";
    const ondemandReportPath = path.join(pipelineDir, REPORT_ONDEMAND_REL);
    assert.ok(
      fs.existsSync(ondemandReportPath),
      `on-demand verify report not found on disk at: ${ondemandReportPath}`
    );
  });

  it("on-demand report path uses REPORT_ONDEMAND_REL constant", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../skills/verify/scripts/verify-runner.js"),
      "utf8"
    );
    const literalCount = (src.match(/["']VERIFICATION-REPORT-ondemand\.md["']/g) || []).length;
    assert.strictEqual(literalCount, 1, "VERIFICATION-REPORT-ondemand.md should only appear once (as the constant value)");
  });
});
