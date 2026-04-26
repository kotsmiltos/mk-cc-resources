"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { validateCoverage } = require("../lib/synthesis");
const { generateAgentInstanceId } = require("../lib/agent-output");
const { computeDropSource } = require("../lib/triage-utils");
const { queueWave } = require("../lib/dispatch");
const { parseAgentOutputs, createSyntheticGapFinding } = require("../skills/research/scripts/research-runner");

describe("validateCoverage", () => {
  it("CONFIRMED finding absent from synthesized doc → {ok:false}", () => {
    const rawOutputs = [
      {
        payload: {
          findings: [
            { id: "FIND-001", status: "CONFIRMED", description: "auth bypass" },
          ],
        },
      },
    ];
    const synthesizedDoc = "## Synthesis\n\nNo findings here.";
    const result = validateCoverage(rawOutputs, synthesizedDoc);
    assert.equal(result.ok, false);
    assert.ok(Array.isArray(result.missing));
    assert.equal(result.missing.length, 1);
    assert.equal(result.missing[0].id, "FIND-001");
  });

  it("all CONFIRMED findings present → {ok:true}", () => {
    const rawOutputs = [
      {
        payload: {
          findings: [
            { id: "FIND-002", status: "CONFIRMED", description: "injection risk" },
          ],
        },
      },
    ];
    const synthesizedDoc = "## Synthesis\n\nSee FIND-002 for details.";
    const result = validateCoverage(rawOutputs, synthesizedDoc);
    assert.equal(result.ok, true);
  });
});

describe("queueWave", () => {
  it("wave > cap → sub-batches of correct size", () => {
    const wave = ["T-001", "T-002", "T-003", "T-004", "T-005", "T-006"];
    const batches = queueWave(wave, 4);
    assert.equal(batches.length, 2);
    assert.equal(batches[0].length, 4);
    assert.equal(batches[1].length, 2);
  });

  it("wave <= cap → single batch", () => {
    const wave = ["T-001", "T-002"];
    const batches = queueWave(wave, 4);
    assert.equal(batches.length, 1);
    assert.deepEqual(batches[0], wave);
  });
});

describe("generateAgentInstanceId", () => {
  it("two calls with identical params produce distinct IDs", () => {
    const id1 = generateAgentInstanceId("research", "security", 3);
    const id2 = generateAgentInstanceId("research", "security", 3);
    assert.notEqual(id1, id2);
  });

  it("ID contains phase, role, sprint", () => {
    const id = generateAgentInstanceId("build", "tester", 5);
    assert.ok(id.startsWith("build-tester-5-"));
  });
});

describe("research quorum failure protocol", () => {
  it("agent failure → synthetic gap finding created; research does not hang", () => {
    // Simulate 4 agents where 1 fails (empty/unparseable output)
    const rawOutputs = [
      { lensId: "security", agentId: "research-security", briefId: "b1", rawOutput: "" },
      { lensId: "infrastructure", agentId: "research-infra", briefId: "b2", rawOutput: "```yaml\nstatus: ok\nfindings: []\n```" },
      { lensId: "ux", agentId: "research-ux", briefId: "b3", rawOutput: "```yaml\nstatus: ok\nfindings: []\n```" },
      { lensId: "testing", agentId: "research-testing", briefId: "b4", rawOutput: "```yaml\nstatus: ok\nfindings: []\n```" },
    ];
    const config = { max_per_agent: 1 };
    const result = parseAgentOutputs(rawOutputs, config);

    assert.ok(Array.isArray(result.syntheticGaps), "syntheticGaps should be an array");
    assert.equal(result.syntheticGaps.length, 1);
    assert.equal(result.syntheticGaps[0].source, "research-security");
    assert.equal(result.syntheticGaps[0].kind, "missed-perspective");
    assert.match(result.syntheticGaps[0].id, /^GAP-SYNTHETIC-\d+$/);
    // Research should not hang — result returned synchronously
  });
});

describe("computeDropSource", () => {
  it("same inputs → same output", () => {
    const a = computeDropSource("triage", ["/a/b.md", "/a/c.md"]);
    const b = computeDropSource("triage", ["/a/b.md", "/a/c.md"]);
    assert.equal(a, b);
  });

  it("different file set → different hash", () => {
    const a = computeDropSource("triage", ["/a/b.md"]);
    const b = computeDropSource("triage", ["/a/x.md"]);
    assert.notEqual(a, b);
  });

  it("file order does not affect result", () => {
    const a = computeDropSource("triage", ["/a/b.md", "/a/c.md"]);
    const b = computeDropSource("triage", ["/a/c.md", "/a/b.md"]);
    assert.equal(a, b);
  });
});
