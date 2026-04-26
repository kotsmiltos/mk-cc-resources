"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ao = require("../lib/agent-output");

// --- detectSentinel ---

describe("detectSentinel", () => {
  it("detects a valid sentinel at end of output", () => {
    const result = ao.detectSentinel("output\n<!-- SENTINEL:COMPLETE:brief-123:agent-456 -->");
    assert.equal(result.found, true);
    assert.equal(result.briefId, "brief-123");
    assert.equal(result.agentId, "agent-456");
  });

  it("detects sentinel with trailing whitespace", () => {
    const result = ao.detectSentinel("output\n<!-- SENTINEL:COMPLETE:b1:a1 -->\n\n  ");
    assert.equal(result.found, true);
    assert.equal(result.briefId, "b1");
  });

  it("returns found=false when no sentinel", () => {
    assert.equal(ao.detectSentinel("no sentinel here").found, false);
  });

  it("returns found=false for null/empty input", () => {
    assert.equal(ao.detectSentinel(null).found, false);
    assert.equal(ao.detectSentinel("").found, false);
  });

  it("handles sentinel with complex IDs", () => {
    const result = ao.detectSentinel("<!-- SENTINEL:COMPLETE:res-security-abc123:research-security -->");
    assert.equal(result.found, true);
    assert.equal(result.briefId, "res-security-abc123");
    assert.equal(result.agentId, "research-security");
  });
});

// --- extractTag ---

describe("extractTag", () => {
  it("extracts simple tag content", () => {
    assert.equal(ao.extractTag("<foo>bar</foo>", "foo"), "bar");
  });

  it("extracts tag with attributes", () => {
    assert.equal(ao.extractTag('<foo attr="x">bar</foo>', "foo"), "bar");
  });

  it("returns null for missing tag", () => {
    assert.equal(ao.extractTag("no tags", "foo"), null);
  });

  it("extracts multiline content", () => {
    const content = ao.extractTag("<payload>\n  line1\n  line2\n</payload>", "payload");
    assert.ok(content.includes("line1"));
    assert.ok(content.includes("line2"));
  });
});

// --- extractChildTags ---

describe("extractChildTags", () => {
  it("extracts all child tags", () => {
    const result = ao.extractChildTags("<a>1</a><b>2</b><c>3</c>");
    assert.deepEqual(result, { a: "1", b: "2", c: "3" });
  });

  it("returns empty object for null input", () => {
    assert.deepEqual(ao.extractChildTags(null), {});
  });

  it("handles nested content", () => {
    const result = ao.extractChildTags("<findings>- item 1\n- item 2</findings>");
    assert.ok(result.findings.includes("item 1"));
  });
});

// --- parseOutput ---

const WELL_FORMED_OUTPUT = `<agent-output>
  <meta>
    <brief_id>b-001</brief_id>
    <agent_id>a-001</agent_id>
    <phase>research</phase>
    <timestamp>2026-04-10T12:00:00Z</timestamp>
  </meta>
  <payload>
    <findings>- Finding A\n- Finding B</findings>
    <risks>- Risk X</risks>
    <constraints>- Constraint Y</constraints>
    <confidence>High overall</confidence>
  </payload>
  <self-assessment>
    <criteria_met>1,2,3,5</criteria_met>
    <criteria_uncertain>4</criteria_uncertain>
    <criteria_failed></criteria_failed>
    <deviations>None</deviations>
  </self-assessment>
</agent-output>
<!-- SENTINEL:COMPLETE:b-001:a-001 -->`;

describe("parseOutput", () => {
  it("parses well-formed output correctly", () => {
    const result = ao.parseOutput(WELL_FORMED_OUTPUT);
    assert.equal(result.ok, true);
    assert.equal(result.meta.brief_id, "b-001");
    assert.equal(result.meta.agent_id, "a-001");
    assert.equal(result.meta.phase, "research");
    assert.ok(result.payload.findings.includes("Finding A"));
    assert.ok(result.payload.risks.includes("Risk X"));
    assert.deepEqual(result.selfAssessment.criteria_met, [1, 2, 3, 5]);
    assert.deepEqual(result.selfAssessment.criteria_uncertain, [4]);
    assert.deepEqual(result.selfAssessment.criteria_failed, []);
  });

  it("returns error for empty input", () => {
    assert.equal(ao.parseOutput("").ok, false);
    assert.equal(ao.parseOutput(null).ok, false);
  });

  it("recovers from missing envelope (lenient parse)", () => {
    const noEnvelope = "<findings>Found stuff</findings><risks>Risk B</risks>";
    const result = ao.parseOutput(noEnvelope);
    assert.equal(result.ok, true);
    assert.equal(result.recovered, true);
    assert.equal(result.payload.findings, "Found stuff");
    assert.equal(result.payload.risks, "Risk B");
  });

  it("fails on completely unstructured input", () => {
    const result = ao.parseOutput("random text with no XML structure whatsoever");
    assert.equal(result.ok, false);
  });
});

// --- parseCriteriaList ---

describe("parseCriteriaList", () => {
  it("parses comma-separated numbers", () => {
    assert.deepEqual(ao.parseCriteriaList("1,2,3"), [1, 2, 3]);
  });

  it("handles spaces", () => {
    assert.deepEqual(ao.parseCriteriaList(" 1 , 3 , 5 "), [1, 3, 5]);
  });

  it("returns empty array for empty string", () => {
    assert.deepEqual(ao.parseCriteriaList(""), []);
    assert.deepEqual(ao.parseCriteriaList("   "), []);
  });

  it("filters out non-numeric entries", () => {
    assert.deepEqual(ao.parseCriteriaList("1,abc,3"), [1, 3]);
  });
});

// --- classifyFailure ---

describe("classifyFailure", () => {
  it("classifies timeout", () => {
    const result = ao.classifyFailure(null, null, { timedOut: true });
    assert.equal(result.mode, "timeout");
    assert.equal(result.recoverable, true);
  });

  it("classifies retry exhaustion", () => {
    const result = ao.classifyFailure("x", null, { retryCount: 2 });
    assert.equal(result.mode, "retry_exhausted");
    assert.equal(result.recoverable, false);
  });

  it("classifies missing sentinel with partial envelope", () => {
    const result = ao.classifyFailure("<agent-output>partial</agent-output>", null, {});
    assert.equal(result.mode, "missing_sentinel");
    assert.ok(result.detail.includes("truncated"));
  });

  it("classifies empty output", () => {
    const result = ao.classifyFailure("", null, {});
    assert.equal(result.mode, "missing_sentinel");
  });

  it("classifies malformed XML", () => {
    const text = "<!-- SENTINEL:COMPLETE:b:a -->";
    const result = ao.classifyFailure(text, "XML parse error", {});
    assert.equal(result.mode, "malformed_xml");
    assert.equal(result.recoverable, true);
  });
});

// --- checkQuorum ---

describe("checkQuorum", () => {
  const config = {
    quorum: {
      research: "all",
      review: "n-1",
      architecture_perspective: "n-1",
    },
  };

  it("all-quorum met when all succeed", () => {
    const results = [
      { ok: true, agentId: "a1" },
      { ok: true, agentId: "a2" },
      { ok: true, agentId: "a3" },
    ];
    const q = ao.checkQuorum(results, "research", config);
    assert.equal(q.met, true);
    assert.equal(q.required, 3);
    assert.equal(q.received, 3);
  });

  it("all-quorum not met with one failure", () => {
    const results = [
      { ok: true, agentId: "a1" },
      { ok: false, agentId: "a2" },
      { ok: true, agentId: "a3" },
    ];
    const q = ao.checkQuorum(results, "research", config);
    assert.equal(q.met, false);
    assert.deepEqual(q.missing, ["a2"]);
  });

  it("n-1 quorum met with one failure", () => {
    const results = [
      { ok: true, agentId: "a1" },
      { ok: false, agentId: "a2" },
      { ok: true, agentId: "a3" },
    ];
    const q = ao.checkQuorum(results, "review", config);
    assert.equal(q.met, true);
    assert.equal(q.required, 2);
  });

  it("n-1 quorum not met with two failures", () => {
    const results = [
      { ok: true, agentId: "a1" },
      { ok: false, agentId: "a2" },
      { ok: false, agentId: "a3" },
    ];
    const q = ao.checkQuorum(results, "review", config);
    assert.equal(q.met, false);
  });

  it("defaults to all when phase not in config", () => {
    const results = [
      { ok: true, agentId: "a1" },
      { ok: false, agentId: "a2" },
    ];
    const q = ao.checkQuorum(results, "unknown_phase", config);
    assert.equal(q.met, false);
    assert.equal(q.required, 2);
  });
});

// --- retryAgent ---

describe("retryAgent", () => {
  it("appends retry context to original brief", () => {
    const original = "You are an agent.\n\n## Task\nDo the thing.";
    const failure = { mode: "missing_sentinel", detail: "No sentinel found" };
    const retryBrief = ao.retryAgent(original, "agent-1", failure);

    assert.ok(retryBrief.startsWith(original), "Should preserve original brief");
    assert.ok(retryBrief.includes("<!-- RETRY CONTEXT -->"));
    assert.ok(retryBrief.includes("missing_sentinel"));
    assert.ok(retryBrief.includes("agent-1"));
  });

  it("preserves original brief content exactly", () => {
    const original = "Brief content here";
    const failure = { mode: "malformed_xml", detail: "Parse error" };
    const retryBrief = ao.retryAgent(original, "a", failure);

    assert.ok(retryBrief.startsWith(original));
    assert.ok(retryBrief.length > original.length);
  });
});

// --- handleFailures ---

describe("handleFailures", () => {
  const config = {
    quorum: { research: "all", architecture_perspective: "n-1" },
    retry: { max_per_agent: 1, allow_partial_synthesis: true },
  };

  it("returns retry for recoverable failures", () => {
    const failures = [
      { agentId: "a1", briefId: "b1", failure: { mode: "missing_sentinel", recoverable: true }, retryCount: 0 },
    ];
    const parsed = [{ agentId: "a2" }, { agentId: "a3" }];
    const result = ao.handleFailures(failures, parsed, "research", config);

    assert.equal(result.action, "retry");
    assert.equal(result.retries.length, 1);
    assert.equal(result.retries[0].agentId, "a1");
  });

  it("returns proceed when quorum met after terminal failures", () => {
    const failures = [
      { agentId: "a1", briefId: "b1", failure: { mode: "retry_exhausted", recoverable: false } },
    ];
    const parsed = [{ agentId: "a2" }, { agentId: "a3" }, { agentId: "a4" }];
    const result = ao.handleFailures(failures, parsed, "architecture_perspective", config);

    assert.equal(result.action, "proceed");
    assert.deepEqual(result.gaps, ["a1"]);
  });

  it("returns escalate when quorum not met", () => {
    const failures = [
      { agentId: "a1", briefId: "b1", failure: { mode: "timeout", recoverable: false } },
      { agentId: "a2", briefId: "b2", failure: { mode: "timeout", recoverable: false } },
    ];
    const parsed = [{ agentId: "a3" }];
    const result = ao.handleFailures(failures, parsed, "research", config);

    assert.equal(result.action, "escalate");
    assert.ok(result.detail.includes("Quorum not met"));
  });

  it("treats retryCount >= max as terminal even if recoverable", () => {
    const failures = [
      { agentId: "a1", briefId: "b1", failure: { mode: "missing_sentinel", recoverable: true }, retryCount: 1 },
    ];
    const parsed = [{ agentId: "a2" }, { agentId: "a3" }, { agentId: "a4" }];
    const result = ao.handleFailures(failures, parsed, "architecture_perspective", config);

    assert.equal(result.action, "proceed");
    assert.deepEqual(result.gaps, ["a1"]);
  });

  it("escalates when partial synthesis disabled", () => {
    const strictConfig = {
      quorum: { architecture_perspective: "n-1" },
      retry: { max_per_agent: 1, allow_partial_synthesis: false },
    };
    const failures = [
      { agentId: "a1", briefId: "b1", failure: { mode: "timeout", recoverable: false } },
    ];
    const parsed = [{ agentId: "a2" }, { agentId: "a3" }, { agentId: "a4" }];
    const result = ao.handleFailures(failures, parsed, "architecture_perspective", strictConfig);

    assert.equal(result.action, "escalate");
  });

  it("handles all agents failed scenario", () => {
    const failures = [
      { agentId: "a1", briefId: "b1", failure: { mode: "timeout", recoverable: false } },
    ];
    const parsed = [];
    const result = ao.handleFailures(failures, parsed, "research", config);

    assert.equal(result.action, "escalate");
  });
});
