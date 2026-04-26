"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const yamlIO = require("../lib/yaml-io");
const paths = require("../lib/paths");
const rr = require("../skills/research/scripts/research-runner");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
const TMP_DIR = path.join(__dirname, "__tmp_integration__");

// Simulated agent outputs — realistic responses from 4 perspective agents
const SIMULATED_OUTPUTS = [
  {
    lensId: "security",
    agentId: "research-security",
    briefId: "res-sec-test",
    rawOutput: `<agent-output>
  <meta>
    <brief_id>res-sec-test</brief_id>
    <agent_id>research-security</agent_id>
    <phase>research</phase>
    <timestamp>2026-04-10T12:00:00Z</timestamp>
  </meta>
  <payload>
    <findings>
- **Input Validation** — all user inputs must be validated server-side before processing. Acceptance criterion: no unvalidated input reaches business logic. Confidence: high
- **Authentication** — JWT token-based authentication required for all API endpoints. Acceptance criterion: expired/invalid tokens rejected with 401. Confidence: high
- **Data Encryption** — sensitive data encrypted at rest and in transit. Acceptance criterion: TLS 1.3 for transport, AES-256 for storage. Confidence: high
    </findings>
    <constraints>
- **HTTPS Only** — all traffic must use TLS 1.3 minimum. Rationale: prevents MITM attacks
- **Token Expiry** — JWT tokens must expire within 1 hour. Rationale: limits exposure window
    </constraints>
    <risks>
- **SQL Injection** — user input in database queries. Severity: critical. Mitigation: parameterized queries only
- **XSS Attacks** — unsanitized output in rendered views. Severity: high. Mitigation: output encoding and CSP headers
- **Token Theft** — stolen JWT enables unauthorized access. Severity: high. Mitigation: short expiry + refresh token rotation
    </risks>
    <confidence>High overall. Gaps: cannot assess third-party dependency vulnerabilities without knowing the full dependency tree.</confidence>
  </payload>
  <self-assessment>
    <criteria_met>1,2,3,4,5,6</criteria_met>
    <criteria_uncertain></criteria_uncertain>
    <criteria_failed></criteria_failed>
    <deviations>None</deviations>
  </self-assessment>
</agent-output>
<!-- SENTINEL:COMPLETE:res-sec-test:research-security -->`,
  },
  {
    lensId: "infrastructure",
    agentId: "research-infrastructure",
    briefId: "res-inf-test",
    rawOutput: `<agent-output>
  <meta>
    <brief_id>res-inf-test</brief_id>
    <agent_id>research-infrastructure</agent_id>
    <phase>research</phase>
    <timestamp>2026-04-10T12:00:05Z</timestamp>
  </meta>
  <payload>
    <findings>
- **Input Validation** — validate inputs at API gateway layer before reaching services. Acceptance criterion: invalid requests rejected at gateway with appropriate error codes. Confidence: high
- **Horizontal Scaling** — stateless service design enabling horizontal scaling. Acceptance criterion: adding instances reduces p95 latency proportionally. Confidence: medium
- **Health Monitoring** — liveness and readiness probes on all services. Acceptance criterion: unhealthy instances removed from load balancer within 30 seconds. Confidence: high
    </findings>
    <constraints>
- **Container Deployment** — all services must run in containers. Rationale: consistent deployment across environments
- **Stateless Services** — no in-memory session state. Rationale: enables horizontal scaling and zero-downtime deploys
    </constraints>
    <risks>
- **Single Point of Failure** — database without replication. Severity: critical. Mitigation: primary-replica setup with automatic failover
- **Resource Exhaustion** — unbounded request processing. Severity: high. Mitigation: rate limiting and circuit breakers
    </risks>
    <confidence>Medium overall. Gaps: exact load projections unknown, scaling recommendations are based on general patterns.</confidence>
  </payload>
  <self-assessment>
    <criteria_met>1,2,3,4,5,6</criteria_met>
    <criteria_uncertain></criteria_uncertain>
    <criteria_failed></criteria_failed>
    <deviations>None</deviations>
  </self-assessment>
</agent-output>
<!-- SENTINEL:COMPLETE:res-inf-test:research-infrastructure -->`,
  },
  {
    lensId: "ux",
    agentId: "research-ux",
    briefId: "res-ux-test",
    rawOutput: `<agent-output>
  <meta>
    <brief_id>res-ux-test</brief_id>
    <agent_id>research-ux</agent_id>
    <phase>research</phase>
    <timestamp>2026-04-10T12:00:10Z</timestamp>
  </meta>
  <payload>
    <findings>
- **Error Messages** — all errors must show user-friendly messages with recovery guidance. Acceptance criterion: no raw error codes shown to users. Confidence: high
- **Loading States** — skeleton loading states during async operations. Acceptance criterion: no blank screens during data fetching. Confidence: high
- **Input Validation** — real-time client-side validation with clear inline feedback. Acceptance criterion: validation messages appear within 300ms of input. Confidence: high
    </findings>
    <constraints>
- **Accessibility** — WCAG 2.1 AA compliance required. Rationale: legal requirement and inclusive design
- **Response Time** — page load under 2 seconds on 3G connection. Rationale: user retention drops sharply past 3 seconds
    </constraints>
    <risks>
- **Cognitive Overload** — too many features on initial screen. Severity: medium. Mitigation: progressive disclosure pattern
- **Inconsistent UI** — divergent patterns across screens. Severity: medium. Mitigation: shared component library
    </risks>
    <confidence>High overall. Gaps: cannot assess accessibility without reviewing actual UI designs.</confidence>
  </payload>
  <self-assessment>
    <criteria_met>1,2,3,4,5,6</criteria_met>
    <criteria_uncertain></criteria_uncertain>
    <criteria_failed></criteria_failed>
    <deviations>None</deviations>
  </self-assessment>
</agent-output>
<!-- SENTINEL:COMPLETE:res-ux-test:research-ux -->`,
  },
  {
    lensId: "testing",
    agentId: "research-testing",
    briefId: "res-test-test",
    rawOutput: `<agent-output>
  <meta>
    <brief_id>res-test-test</brief_id>
    <agent_id>research-testing</agent_id>
    <phase>research</phase>
    <timestamp>2026-04-10T12:00:15Z</timestamp>
  </meta>
  <payload>
    <findings>
- **Input Validation** — all validation logic must be unit-testable in isolation. Acceptance criterion: 100% branch coverage on validation functions. Confidence: high
- **API Contract Tests** — every API endpoint must have contract tests. Acceptance criterion: breaking contract changes caught before deployment. Confidence: high
- **Error Boundary Testing** — test failure modes and error paths. Acceptance criterion: every error path has at least one test case. Confidence: medium
    </findings>
    <constraints>
- **Test Isolation** — tests must not depend on external services. Rationale: flaky tests erode developer trust
- **Fast Feedback** — unit test suite must complete in under 30 seconds. Rationale: slow tests discourage frequent runs
    </constraints>
    <risks>
- **Test Brittleness** — tests coupled to implementation details. Severity: medium. Mitigation: test behavior not implementation, use testing library best practices
- **Coverage Blind Spots** — integration points untested. Severity: high. Mitigation: dedicated integration test suite with test containers
    </risks>
    <confidence>High overall. Gaps: cannot assess specific edge cases without seeing the domain model.</confidence>
  </payload>
  <self-assessment>
    <criteria_met>1,2,3,4,5,6</criteria_met>
    <criteria_uncertain></criteria_uncertain>
    <criteria_failed></criteria_failed>
    <deviations>None</deviations>
  </self-assessment>
</agent-output>
<!-- SENTINEL:COMPLETE:res-test-test:research-testing -->`,
  },
];

// --- Integration Tests ---

describe("Research Integration: brief assembly", () => {
  it("assembles briefs for all 4 default lenses", () => {
    const result = rr.assemblePerspectiveBriefs(
      "Build a task management web application with real-time collaboration",
      PLUGIN_ROOT,
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.briefs.length, 4);

    for (const brief of result.briefs) {
      assert.ok(brief.briefId, "has briefId");
      assert.ok(brief.agentId, "has agentId");
      assert.ok(brief.brief.includes("BRIEF-META"), "has metadata");
      assert.ok(brief.brief.length > 100, "brief has content");
    }
  });

  it("rejects when problem statement is too large for budget", () => {
    const hugeProblem = "x".repeat(200000);
    const result = rr.assemblePerspectiveBriefs(hugeProblem, PLUGIN_ROOT, CONFIG);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("exceeds"));
  });
});

describe("Research Integration: output parsing", () => {
  it("parses all 4 simulated agent outputs", () => {
    const result = rr.parseAgentOutputs(SIMULATED_OUTPUTS);
    assert.equal(result.ok, true);
    assert.equal(result.parsed.length, 4);
    assert.equal(result.failures, undefined);

    for (const p of result.parsed) {
      assert.ok(p.payload.findings, `${p.lensId} has findings`);
      assert.ok(p.payload.risks, `${p.lensId} has risks`);
      assert.ok(p.payload.constraints, `${p.lensId} has constraints`);
      assert.ok(p.payload.confidence, `${p.lensId} has confidence`);
    }
  });

  it("handles mixed success and failure", () => {
    const mixed = [
      SIMULATED_OUTPUTS[0],
      { lensId: "bad", agentId: "bad-agent", briefId: "bad-brief", rawOutput: "garbage" },
    ];
    const result = rr.parseAgentOutputs(mixed);
    assert.equal(result.ok, false);
    assert.equal(result.parsed.length, 1);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].agentId, "bad-agent");
  });
});

describe("Research Integration: synthesis and requirements generation", () => {
  let parsedOutputs;

  before(() => {
    const result = rr.parseAgentOutputs(SIMULATED_OUTPUTS);
    parsedOutputs = result.parsed;
  });

  it("synthesizes findings into classified positions", () => {
    const { synthesis, requirements } = rr.synthesizeAndGenerate(parsedOutputs, PLUGIN_ROOT, null);

    // Synthesis document
    assert.ok(synthesis.includes("## Consensus"), "synthesis has consensus section");
    assert.ok(synthesis.includes("## Unique Insights"), "synthesis has unique insights");

    // Requirements document
    assert.ok(requirements.includes("schema_version: 1"), "REQ has schema version");
    assert.ok(requirements.includes("produced_by: research"), "REQ has producer");
    assert.ok(requirements.includes("consumed_by: architecture"), "REQ has consumer");
  });

  it("generates requirements with FR-NNN format", () => {
    const { requirements } = rr.synthesizeAndGenerate(parsedOutputs, PLUGIN_ROOT, null);
    const frPattern = /FR-\d{3}/g;
    const frMatches = requirements.match(frPattern);
    assert.ok(frMatches && frMatches.length > 0, "has FR-NNN IDs");
  });

  it("generates requirements with VERIFY tags", () => {
    const { requirements } = rr.synthesizeAndGenerate(parsedOutputs, PLUGIN_ROOT, null);
    assert.ok(requirements.includes("`VERIFY`"), "has VERIFY tags");
  });

  it("includes risk table", () => {
    const { requirements } = rr.synthesizeAndGenerate(parsedOutputs, PLUGIN_ROOT, null);
    assert.ok(requirements.includes("## Risks"), "has risks section");
    assert.ok(requirements.includes("RISK-"), "has risk IDs");
  });

  it("includes source perspectives", () => {
    const { requirements } = rr.synthesizeAndGenerate(parsedOutputs, PLUGIN_ROOT, null);
    assert.ok(requirements.includes("## Source Perspectives"), "has perspectives section");
    assert.ok(requirements.includes("security"), "attributes security");
  });

  it("includes unique insights section when unique items exist", () => {
    const { requirements } = rr.synthesizeAndGenerate(parsedOutputs, PLUGIN_ROOT, null);
    assert.ok(requirements.includes("## Unique Insights"), "has unique insights");
  });
});

describe("Research Integration: file output", () => {
  before(() => {
    paths.ensureDir(TMP_DIR);
  });

  after(() => {
    // Clean up temp directory
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("writes REQ.md and synthesis.md to pipeline directory", () => {
    const result = rr.parseAgentOutputs(SIMULATED_OUTPUTS);
    const { synthesis, requirements } = rr.synthesizeAndGenerate(result.parsed, PLUGIN_ROOT, null);

    const reqPath = rr.writeRequirements(TMP_DIR, requirements, synthesis);

    assert.ok(fs.existsSync(reqPath), "REQ.md written");
    assert.ok(fs.existsSync(path.join(TMP_DIR, "requirements", "synthesis.md")), "synthesis.md written");

    // Verify REQ.md content
    const reqContent = fs.readFileSync(reqPath, "utf8");
    assert.ok(reqContent.includes("schema_version: 1"), "REQ has schema version");
    assert.ok(reqContent.includes("FR-"), "REQ has functional requirements");
    assert.ok(reqContent.includes("`VERIFY`"), "REQ has VERIFY tags");
  });

  it("creates requirements directory if it does not exist", () => {
    const newDir = path.join(TMP_DIR, "new-pipeline");
    const result = rr.parseAgentOutputs(SIMULATED_OUTPUTS);
    const { requirements } = rr.synthesizeAndGenerate(result.parsed, PLUGIN_ROOT, null);

    const reqPath = rr.writeRequirements(newDir, requirements);
    assert.ok(fs.existsSync(reqPath), "REQ.md written to new directory");
  });
});

describe("Research Integration: YAML frontmatter validity", () => {
  it("produces requirements with parseable YAML frontmatter", () => {
    const result = rr.parseAgentOutputs(SIMULATED_OUTPUTS);
    const { requirements } = rr.synthesizeAndGenerate(result.parsed, PLUGIN_ROOT, null);

    // Extract frontmatter
    assert.ok(requirements.startsWith("---\n"), "starts with frontmatter delimiter");
    const endIndex = requirements.indexOf("\n---\n", 4);
    assert.ok(endIndex > 0, "has closing frontmatter delimiter");

    const frontmatter = requirements.slice(4, endIndex);
    const yaml = require("js-yaml");
    const parsed = yaml.load(frontmatter);

    assert.equal(parsed.artifact, "requirements");
    assert.equal(parsed.schema_version, 1);
    assert.equal(parsed.produced_by, "research");
    assert.equal(parsed.consumed_by, "architecture");
    assert.ok(parsed.generated_at, "has timestamp");
  });
});
