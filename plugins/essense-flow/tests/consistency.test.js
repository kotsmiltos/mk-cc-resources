"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const consistency = require("../lib/consistency");

// --- extractStructuralElements ---

describe("extractStructuralElements", () => {
  it("extracts interfaces from payload text", () => {
    const payload = { analysis: "This module expects JSON input and returns a parsed object" };
    const elements = consistency.extractStructuralElements(payload);
    assert.ok(elements.interfaces.length > 0);
  });

  it("extracts dependencies from payload text", () => {
    const payload = { findings: "This component depends on the auth module and requires database access" };
    const elements = consistency.extractStructuralElements(payload);
    assert.ok(elements.dependencies.length > 0);
  });

  it("extracts exports from payload text", () => {
    const payload = { analysis: "The module exports a validate function and defines a UserSchema type" };
    const elements = consistency.extractStructuralElements(payload);
    assert.ok(elements.exports.length > 0);
  });

  it("extracts assumptions from payload text", () => {
    const payload = { findings: "This design assumes that all requests are authenticated" };
    const elements = consistency.extractStructuralElements(payload);
    assert.ok(elements.assumptions.length > 0);
  });

  it("handles null payload gracefully", () => {
    const elements = consistency.extractStructuralElements(null);
    assert.deepEqual(elements.interfaces, []);
    assert.deepEqual(elements.dependencies, []);
    assert.deepEqual(elements.exports, []);
    assert.deepEqual(elements.assumptions, []);
  });
});

// --- verify ---

describe("verify", () => {
  it("returns PASS for single sibling (no pairwise checks)", () => {
    const result = consistency.verify([{ agentId: "a1", payload: { findings: "some text" } }]);
    assert.equal(result.status, "PASS");
    assert.equal(result.issues.length, 0);
  });

  it("returns PASS for null input", () => {
    const result = consistency.verify(null);
    assert.equal(result.status, "PASS");
  });

  it("returns PASS for compatible siblings", () => {
    const siblings = [
      { agentId: "infra", payload: { analysis: "The module exports a validate function" } },
      { agentId: "testing", payload: { analysis: "The module exports a verify function" } },
    ];
    const result = consistency.verify(siblings);
    assert.equal(result.status, "PASS");
  });

  it("detects naming collisions", () => {
    const siblings = [
      { agentId: "mod-a", payload: { analysis: "This module defines a UserService" } },
      { agentId: "mod-b", payload: { analysis: "This component defines a UserService" } },
    ];
    const result = consistency.verify(siblings);
    const collisions = result.issues.filter((i) => i.category === "naming-collision");
    assert.ok(collisions.length > 0, "should detect naming collision");
    assert.equal(collisions[0].severity, "blocking");
  });

  it("detects assumption divergence (stateful vs stateless)", () => {
    const siblings = [
      { agentId: "infra", payload: { findings: "This design assumes that sessions are stateful and persistent" } },
      { agentId: "api", payload: { findings: "This design assumes that the API is stateless and uses JWT tokens" } },
    ];
    const result = consistency.verify(siblings);
    const divergences = result.issues.filter((i) => i.category === "assumption-divergence");
    assert.ok(divergences.length > 0, "should detect assumption divergence");
  });

  it("returns FAIL status when blocking issues exist", () => {
    const siblings = [
      { agentId: "mod-a", payload: { analysis: "This module exports a handleRequest function" } },
      { agentId: "mod-b", payload: { analysis: "This module exports a handleRequest endpoint" } },
    ];
    const result = consistency.verify(siblings);
    if (result.issues.some((i) => i.severity === "blocking")) {
      assert.equal(result.status, "FAIL");
    }
  });
});

// --- areContradictory ---

describe("areContradictory", () => {
  it("detects negation contradiction", () => {
    assert.ok(consistency.areContradictory(
      "requests are authenticated verified tokens",
      "requests are not authenticated verified tokens"
    ));
  });

  it("does not flag non-overlapping assumptions", () => {
    assert.ok(!consistency.areContradictory(
      "database uses postgresql",
      "frontend uses react components"
    ));
  });

  it("detects stateful vs stateless contradiction", () => {
    assert.ok(consistency.areContradictory(
      "service maintains stateful session data",
      "service uses stateless token authentication"
    ));
  });
});

// --- formatVerificationReport ---

describe("formatVerificationReport", () => {
  it("formats PASS result", () => {
    const report = consistency.formatVerificationReport({ status: "PASS", issues: [] });
    assert.ok(report.includes("PASS"));
    assert.ok(report.includes("No issues found"));
  });

  it("formats FAIL result with issues", () => {
    const result = {
      status: "FAIL",
      issues: [{
        severity: "blocking",
        category: "naming-collision",
        agentsInvolved: ["a1", "a2"],
        description: "Duplicate name",
        evidence: "Both define UserService",
        suggestedResolution: "Rename one",
      }],
    };
    const report = consistency.formatVerificationReport(result);
    assert.ok(report.includes("FAIL"));
    assert.ok(report.includes("naming-collision"));
    assert.ok(report.includes("Duplicate name"));
  });
});

// --- assembleVerifierBrief ---

describe("assembleVerifierBrief", () => {
  const CONFIG = { token_budgets: { brief_ceiling: 12000, section_max: 4000, safety_margin_pct: 10 } };

  it("produces valid brief with sibling blocks", () => {
    const siblings = [
      { agentId: "task-001", payload: { "files-written": "src/a.js", verification: "pass" } },
      { agentId: "task-002", payload: { "files-written": "src/b.js", verification: "pass" } },
    ];
    const result = consistency.assembleVerifierBrief(siblings, CONFIG);

    assert.equal(result.ok, true);
    assert.ok(result.brief.includes('<sibling agent_id="task-001">'));
    assert.ok(result.brief.includes('<sibling agent_id="task-002">'));
    assert.ok(result.brief.includes("interface-mismatch"));
    assert.ok(result.brief.includes("SENTINEL:COMPLETE"));
  });

  it("returns error for empty siblings", () => {
    const result = consistency.assembleVerifierBrief([], CONFIG);
    assert.equal(result.ok, false);
  });

  it("generates unique briefId and agentId", () => {
    const siblings = [{ agentId: "a", payload: {} }];
    const result = consistency.assembleVerifierBrief(siblings, CONFIG);

    assert.ok(result.briefId.startsWith("verify-"));
    assert.equal(result.agentId, "consistency-verifier");
  });

  it("includes all 5 category names", () => {
    const siblings = [{ agentId: "a", payload: { analysis: "test" } }];
    const result = consistency.assembleVerifierBrief(siblings, CONFIG);

    assert.ok(result.brief.includes("interface-mismatch"));
    assert.ok(result.brief.includes("dependency-conflict"));
    assert.ok(result.brief.includes("naming-collision"));
    assert.ok(result.brief.includes("contract-gap"));
    assert.ok(result.brief.includes("assumption-divergence"));
  });
});

// --- parseVerifierOutput ---

describe("parseVerifierOutput", () => {
  it("parses PASS with no issues", () => {
    const raw = "<verification><status>PASS</status><issues></issues></verification>";
    const result = consistency.parseVerifierOutput(raw);

    assert.equal(result.ok, true);
    assert.equal(result.status, "PASS");
    assert.equal(result.issues.length, 0);
  });

  it("parses FAIL with issues", () => {
    const raw = [
      "<verification>",
      "  <status>FAIL</status>",
      "  <issues>",
      "    <issue>",
      "      <severity>blocking</severity>",
      "      <category>naming-collision</category>",
      "      <agents>task-001, task-002</agents>",
      "      <description>Both export UserService</description>",
      "      <evidence>task-001 line 5, task-002 line 12</evidence>",
      "      <resolution>Rename one to UserServiceV2</resolution>",
      "    </issue>",
      "    <issue>",
      "      <severity>warning</severity>",
      "      <category>assumption-divergence</category>",
      "      <agents>task-003</agents>",
      "      <description>Assumes stateless</description>",
      "      <evidence>task-003 mentions stateless design</evidence>",
      "      <resolution>Clarify state model</resolution>",
      "    </issue>",
      "  </issues>",
      "</verification>",
    ].join("\n");
    const result = consistency.parseVerifierOutput(raw);

    assert.equal(result.ok, true);
    assert.equal(result.status, "FAIL");
    assert.equal(result.issues.length, 2);
    assert.equal(result.issues[0].severity, "blocking");
    assert.equal(result.issues[0].category, "naming-collision");
    assert.deepEqual(result.issues[0].agentsInvolved, ["task-001", "task-002"]);
    assert.equal(result.issues[1].severity, "warning");
  });

  it("returns error for missing verification tag", () => {
    const result = consistency.parseVerifierOutput("no xml here");
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("verification"));
  });

  it("returns error for invalid status", () => {
    const raw = "<verification><status>MAYBE</status><issues></issues></verification>";
    const result = consistency.parseVerifierOutput(raw);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("Invalid status"));
  });

  it("returns error for empty input", () => {
    const result = consistency.parseVerifierOutput("");
    assert.equal(result.ok, false);
  });

  it("handles issue with missing optional fields gracefully", () => {
    const raw = [
      "<verification>",
      "  <status>FAIL</status>",
      "  <issues>",
      "    <issue>",
      "      <severity>warning</severity>",
      "      <description>Something off</description>",
      "    </issue>",
      "  </issues>",
      "</verification>",
    ].join("\n");
    const result = consistency.parseVerifierOutput(raw);

    assert.equal(result.ok, true);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].severity, "warning");
    assert.equal(result.issues[0].category, "unknown");
    assert.deepEqual(result.issues[0].agentsInvolved, []);
    assert.equal(result.issues[0].description, "Something off");
  });
});
