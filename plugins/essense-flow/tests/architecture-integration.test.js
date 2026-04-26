"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const yamlIO = require("../lib/yaml-io");
const dispatch = require("../lib/dispatch");
const consistency = require("../lib/consistency");
const transformLib = require("../lib/transform");
const ar = require("../skills/architect/scripts/architect-runner");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
const TMP_DIR = path.join(__dirname, "__tmp_arch_integration__");

// Fixture: realistic requirements
const FIXTURE_REQUIREMENTS = `---
artifact: requirements
schema_version: 1
produced_by: research
consumed_by: architecture
---

## Project Intent

Build a URL shortener service with analytics.

## Functional Requirements

- [ ] **FR-001** — Shorten a URL and return a unique short code \`VERIFY\`
- [ ] **FR-002** — Redirect short code to original URL \`VERIFY\`
- [ ] **FR-003** — Track click analytics per short code \`VERIFY\`

## Non-Functional Requirements

- [ ] **NFR-001** — Redirect latency under 50ms at p95 \`VERIFY\`
- [ ] **NFR-002** — Support 10K redirects per second \`VERIFY\`

## Constraints

- Must use a persistent store (not in-memory only)
- Short codes must be URL-safe (base62)

## Risks

| ID | Description | Severity | Mitigation |
|---|---|---|---|
| RISK-001 | Hash collisions on short codes | medium | Use collision-resistant algorithm with retry |
| RISK-002 | Analytics write amplification under load | high | Batch writes with async queue |
`;

// Fixture: simulated architecture perspective outputs
const SIMULATED_ARCH_OUTPUTS = [
  {
    agentId: "architect-infrastructure",
    lensId: "infrastructure",
    payload: {
      analysis: "- **URL Service Module** — handles shortening and redirect logic\n- **Analytics Module** — tracks click events and serves analytics\n- **Storage Layer** — persistent store interface for URLs and analytics",
      recommendations: "- **Horizontal Scaling** — stateless service design enables horizontal scaling\n- **Caching** — cache hot URLs in memory for redirect latency",
      risks: "- **Database bottleneck** — analytics writes under high load. Severity: high. Mitigation: write-behind cache",
    },
  },
  {
    agentId: "architect-interface",
    lensId: "interface",
    payload: {
      interfaces: "- **URL Service** expects a long URL string and returns a short code object\n- **Analytics Module** receives click events from redirect handler",
      analysis: "- **REST API** — POST /shorten, GET /:code, GET /:code/stats\n- **Internal contract** — URL Service returns { shortCode, originalUrl, createdAt }",
      recommendations: "- **Input Validation** — validate URL format before shortening\n- **Rate Limiting** — protect shorten endpoint from abuse",
    },
  },
  {
    agentId: "architect-testing",
    lensId: "testing",
    payload: {
      analysis: "- **Unit testable** — URL generation is pure function, easy to test\n- **Integration testable** — redirect + analytics flow testable with test database",
      recommendations: "- **Contract Tests** — verify URL Service output matches Analytics Module expected input\n- **Load Tests** — verify p95 latency under 10K RPS",
      risks: "- **Flaky analytics tests** — async write makes timing-dependent tests fragile. Mitigation: use deterministic test queue",
    },
  },
  {
    agentId: "architect-security",
    lensId: "security",
    payload: {
      analysis: "- **Input Validation** — prevent URL injection and XSS via malicious URLs\n- **Rate Limiting** — prevent abuse of shorten endpoint",
      constraints: "- **URL Sanitization** — validate and sanitize all input URLs",
      risks: "- **Open Redirect** — short codes could redirect to phishing sites. Severity: high. Mitigation: URL allowlist or warning page",
    },
  },
];

// --- Integration Tests ---

describe("Architecture Integration: planArchitecture", () => {
  it("assembles 4 perspective briefs from requirements", () => {
    const result = ar.planArchitecture(FIXTURE_REQUIREMENTS, PLUGIN_ROOT, CONFIG);
    assert.equal(result.ok, true);
    assert.equal(result.briefs.length, 4);
    for (const brief of result.briefs) {
      assert.ok(brief.brief.includes("requirements"), `${brief.lensId} brief has requirements`);
      assert.ok(brief.briefId, `${brief.lensId} has briefId`);
      assert.ok(brief.agentId, `${brief.lensId} has agentId`);
    }
  });

  it("rejects empty requirements", () => {
    const result = ar.planArchitecture("", PLUGIN_ROOT, CONFIG);
    assert.equal(result.ok, false);
  });
});

describe("Architecture Integration: synthesizeArchitecture", () => {
  it("produces architecture document from 4 agent outputs", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    assert.equal(result.ok, true);
    assert.ok(result.architecture.includes("# Architecture Document"));
    assert.ok(result.architecture.includes("schema_version: 1"));
    assert.ok(result.architecture.includes("## Module Map"));
    assert.ok(result.architecture.includes("## Interface Contracts"));
    assert.ok(result.architecture.includes("## Risks"));
  });

  it("includes requirement traceability (D10)", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    assert.ok(result.architecture.includes("## Requirement Traceability"));
    assert.ok(result.architecture.includes("FR-001"));
    assert.ok(result.architecture.includes("FR-002"));
    assert.ok(result.architecture.includes("FR-003"));
  });

  it("produces synthesis document", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    assert.ok(result.synthesis.includes("## Consensus") || result.synthesis.includes("## Unique Insights"));
  });

  it("runs consistency verification", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    assert.ok(result.consistency);
    assert.ok(result.consistency.status === "PASS" || result.consistency.status === "FAIL");
  });

  it("includes source perspectives", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    assert.ok(result.architecture.includes("infrastructure"));
    assert.ok(result.architecture.includes("interface"));
    assert.ok(result.architecture.includes("testing"));
    assert.ok(result.architecture.includes("security"));
  });
});

describe("Architecture Integration: decomposeIntoSprints", () => {
  it("produces valid waves for a diamond dependency", () => {
    const tasks = {
      "url-service": { dependsOn: [] },
      "storage-layer": { dependsOn: [] },
      "analytics": { dependsOn: ["url-service", "storage-layer"] },
      "api-gateway": { dependsOn: ["url-service", "analytics"] },
    };
    const result = ar.decomposeIntoSprints(tasks);
    assert.equal(result.ok, true);
    assert.ok(result.waves.length >= 2);
    // url-service and storage-layer should be in wave 0
    assert.ok(result.waves[0].includes("url-service"));
    assert.ok(result.waves[0].includes("storage-layer"));
  });

  it("detects cycles", () => {
    const tasks = {
      A: { dependsOn: ["C"] },
      B: { dependsOn: ["A"] },
      C: { dependsOn: ["B"] },
    };
    const result = ar.decomposeIntoSprints(tasks);
    assert.equal(result.ok, false);
    assert.ok(result.cycle.length > 0);
  });

  it("handles single task", () => {
    const result = ar.decomposeIntoSprints({ only: { dependsOn: [] } });
    assert.equal(result.ok, true);
    assert.equal(result.waves.length, 1);
    assert.deepEqual(result.waves[0], ["only"]);
  });
});

describe("Architecture Integration: dispatch DAG validation", () => {
  it("validates acyclic graph", () => {
    const tasks = { A: { dependsOn: [] }, B: { dependsOn: ["A"] }, C: { dependsOn: ["B"] } };
    const graph = dispatch.buildDependencyGraph(tasks);
    const result = dispatch.validateDAG(graph);
    assert.equal(result.valid, true);
    assert.deepEqual(result.order, ["A", "B", "C"]);
  });

  it("constructs correct waves for sprint 4 structure", () => {
    // Sprint 4 actual structure: tasks 1-5 independent, 6 depends on all, 7 depends on 6
    const tasks = {
      t1: { dependsOn: [] },
      t2: { dependsOn: [] },
      t3: { dependsOn: [] },
      t4: { dependsOn: [] },
      t5: { dependsOn: [] },
      t6: { dependsOn: ["t1", "t2", "t3", "t4", "t5"] },
      t7: { dependsOn: ["t6"] },
    };
    const graph = dispatch.buildDependencyGraph(tasks);
    const { order } = dispatch.validateDAG(graph);
    const waves = dispatch.constructWaves(graph, order);
    assert.equal(waves.length, 3);
    assert.equal(waves[0].length, 5); // t1-t5
    assert.deepEqual(waves[1], ["t6"]);
    assert.deepEqual(waves[2], ["t7"]);
  });
});

describe("Architecture Integration: consistency verification", () => {
  it("detects naming collision between siblings", () => {
    const siblings = [
      { agentId: "mod-a", payload: { analysis: "This module defines a validateUrl" } },
      { agentId: "mod-b", payload: { analysis: "This service defines a validateUrl" } },
    ];
    const result = consistency.verify(siblings);
    const collisions = result.issues.filter((i) => i.category === "naming-collision");
    assert.ok(collisions.length > 0);
  });

  it("passes clean siblings", () => {
    const siblings = [
      { agentId: "url-svc", payload: { analysis: "This module exports a shortenUrl function" } },
      { agentId: "analytics", payload: { analysis: "This module exports a trackClick function" } },
    ];
    const result = consistency.verify(siblings);
    assert.equal(result.status, "PASS");
  });
});

describe("Architecture Integration: transform", () => {
  it("transforms a fixture task spec into .agent.md with 7 blocks", () => {
    // Read an actual sprint-4 task spec as fixture
    const specPath = path.join(PLUGIN_ROOT, "artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-2-budget-fix.md");
    const specContent = fs.readFileSync(specPath, "utf8");
    const result = transformLib.transformToAgentMd(specContent, "ARCH context here", CONFIG);
    assert.equal(result.ok, true);
    assert.ok(result.agentMd.includes("## IDENTITY"));
    assert.ok(result.agentMd.includes("## CONSTRAINTS"));
    assert.ok(result.agentMd.includes("## CONTEXT"));
    assert.ok(result.agentMd.includes("## TASK INSTRUCTIONS"));
    assert.ok(result.agentMd.includes("## OUTPUT FORMAT"));
    assert.ok(result.agentMd.includes("## ACCEPTANCE CRITERIA"));
    assert.ok(result.agentMd.includes("## COMPLETION SENTINEL"));
    assert.ok(result.agentMd.includes("SENTINEL:COMPLETE"));
    assert.ok(result.tokenCount > 0);
  });

  it("strips Notes section from transform output", () => {
    const spec = "## Goal\nDo something.\n\n## Notes\nThis is rationale we should strip.\n\n## Acceptance Criteria\n- [ ] Works";
    const result = transformLib.transformToAgentMd(spec, null, CONFIG);
    assert.ok(!result.agentMd.includes("rationale we should strip"));
  });

  it("preserves pseudocode verbatim", () => {
    const spec = "## Goal\nBuild it.\n\n## Pseudocode\n```\n1. Read input\n2. Process data\n3. Write output\n```\n\n## Acceptance Criteria\n- [ ] Done";
    const result = transformLib.transformToAgentMd(spec, null, CONFIG);
    assert.ok(result.agentMd.includes("1. Read input"));
    assert.ok(result.agentMd.includes("3. Write output"));
  });
});

describe("Architecture Integration: createTaskSpecs", () => {
  it("generates .md + .agent.md pairs", () => {
    const tasks = [
      { id: "TASK-001", spec: "## Goal\nBuild auth.\n\n## Pseudocode\n1. Create module\n\n## Acceptance Criteria\n- [ ] Module exists" },
      { id: "TASK-002", spec: "## Goal\nBuild API.\n\n## Pseudocode\n1. Create routes\n\n## Acceptance Criteria\n- [ ] Routes work" },
    ];
    const result = ar.createTaskSpecs(tasks, "ARCH context", CONFIG);
    assert.equal(result.ok, true);
    assert.equal(result.specs.length, 2);
    for (const spec of result.specs) {
      assert.ok(spec.md, "has .md content");
      assert.ok(spec.agentMd, "has .agent.md content");
      assert.ok(spec.agentMd.includes("## IDENTITY"), ".agent.md has identity block");
      assert.ok(spec.tokenCount > 0, "has token count");
    }
  });
});

describe("Architecture Integration: file output", () => {
  before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("writes ARCH.md and synthesis.md", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    ar.writeArchitectureArtifacts(TMP_DIR, result.architecture, result.synthesis);

    assert.ok(fs.existsSync(path.join(TMP_DIR, "architecture", "ARCH.md")));
    assert.ok(fs.existsSync(path.join(TMP_DIR, "architecture", "synthesis.md")));

    const archContent = fs.readFileSync(path.join(TMP_DIR, "architecture", "ARCH.md"), "utf8");
    assert.ok(archContent.includes("schema_version: 1"));
  });

  it("writes task spec .md and .agent.md pairs", () => {
    const specs = [
      { id: "TASK-001", md: "# Task 1\nContent", agentMd: "## IDENTITY\nAgent brief" },
    ];
    ar.writeTaskSpecs(TMP_DIR, 1, specs);

    assert.ok(fs.existsSync(path.join(TMP_DIR, "sprints", "sprint-1", "tasks", "TASK-001.md")));
    assert.ok(fs.existsSync(path.join(TMP_DIR, "sprints", "sprint-1", "tasks", "TASK-001.agent.md")));
  });
});

describe("Architecture Integration: ARCH.md YAML frontmatter", () => {
  it("produces parseable YAML frontmatter", () => {
    const result = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    const arch = result.architecture;

    assert.ok(arch.startsWith("---\n"));
    const endIndex = arch.indexOf("\n---\n", 4);
    assert.ok(endIndex > 0);

    const frontmatter = arch.slice(4, endIndex);
    const yaml = require("js-yaml");
    const parsed = yaml.load(frontmatter);

    assert.equal(parsed.artifact, "architecture");
    assert.equal(parsed.schema_version, 1);
    assert.equal(parsed.produced_by, "architect");
    assert.equal(parsed.consumed_by, "build");
  });
});

describe("Architecture Integration: runQAReview", () => {
  const SPRINT_NUMBER = 4;
  const TASK_SPEC_PATHS = ["/path/to/task1.md", "/path/to/task2.md"];
  const BUILT_FILE_PATHS = ["/path/to/file1.js", "/path/to/file2.js"];
  const REQUIREMENTS_PATH = "/path/to/REQ.md";

  it("assembles 4 QA perspective briefs for a completed sprint", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, TASK_SPEC_PATHS, BUILT_FILE_PATHS, REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    assert.equal(result.ok, true);
    assert.equal(result.briefs.length, 4);
  });

  it("produces distinct perspective IDs", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, TASK_SPEC_PATHS, BUILT_FILE_PATHS, REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    const ids = result.briefs.map((b) => b.perspectiveId);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 4, "All 4 perspective IDs must be distinct");
  });

  it("each brief has unique briefId and agentId", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, TASK_SPEC_PATHS, BUILT_FILE_PATHS, REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    const briefIds = new Set(result.briefs.map((b) => b.briefId));
    const agentIds = new Set(result.briefs.map((b) => b.agentId));
    assert.equal(briefIds.size, 4, "All briefIds must be unique");
    assert.equal(agentIds.size, 4, "All agentIds must be unique");
  });

  it("each brief includes sprint number, task specs, and built files", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, TASK_SPEC_PATHS, BUILT_FILE_PATHS, REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    for (const brief of result.briefs) {
      assert.ok(brief.brief.includes(`Sprint ${SPRINT_NUMBER}`), `${brief.perspectiveId} brief mentions sprint number`);
      for (const taskSpec of TASK_SPEC_PATHS) {
        assert.ok(brief.brief.includes(taskSpec), `${brief.perspectiveId} brief includes task spec path ${taskSpec}`);
      }
      for (const builtFile of BUILT_FILE_PATHS) {
        assert.ok(brief.brief.includes(builtFile), `${brief.perspectiveId} brief includes built file path ${builtFile}`);
      }
    }
  });

  it("each brief contains a completion sentinel", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, TASK_SPEC_PATHS, BUILT_FILE_PATHS, REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    for (const brief of result.briefs) {
      assert.ok(
        brief.brief.includes(`<!-- SENTINEL:COMPLETE:${brief.briefId}:${brief.agentId} -->`),
        `${brief.perspectiveId} brief has completion sentinel`
      );
    }
  });

  it("rejects empty task spec paths", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, [], BUILT_FILE_PATHS, REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("task spec"));
  });

  it("rejects empty built file paths", () => {
    const result = ar.runQAReview(SPRINT_NUMBER, TASK_SPEC_PATHS, [], REQUIREMENTS_PATH, PLUGIN_ROOT, CONFIG);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("built file"));
  });
});

// --- Review Runner: categorizeFindings ---

describe("Review Runner: categorizeFindings", () => {
  it("categorizes findings by severity keywords", () => {
    const outputs = [
      {
        agentId: "qa-task-compliance",
        payload: {
          findings: "- **Critical bug**: crash on null input must fix\n- Minor style issue, cosmetic only",
        },
      },
      {
        agentId: "qa-adversarial",
        payload: {
          risks: "- High severity: should fix validation gap\n- Consider refactoring the loop",
        },
      },
    ];

    const findings = ar.categorizeFindings(outputs);

    assert.ok(findings.critical.length >= 1, "Should have at least one critical finding");
    assert.ok(findings.high.length >= 1, "Should have at least one high finding");
    assert.ok(findings.low.length >= 1, "Should have at least one low finding");

    // Verify source attribution
    const criticalSources = findings.critical.map((f) => f.source);
    assert.ok(criticalSources.includes("qa-task-compliance"));
  });

  it("defaults to medium when no severity keyword found", () => {
    const outputs = [
      {
        agentId: "qa-generic",
        payload: {
          findings: "- The function does something unexpected",
        },
      },
    ];

    const findings = ar.categorizeFindings(outputs);
    assert.ok(findings.medium.length >= 1, "Should default to medium");
  });

  it("handles empty payload gracefully", () => {
    const outputs = [{ agentId: "qa-empty", payload: null }];
    const findings = ar.categorizeFindings(outputs);

    assert.equal(findings.critical.length, 0);
    assert.equal(findings.high.length, 0);
    assert.equal(findings.medium.length, 0);
    assert.equal(findings.low.length, 0);
  });

  it("includes section information in findings", () => {
    const outputs = [
      {
        agentId: "qa-test",
        payload: {
          risks: "- Critical data loss risk",
        },
      },
    ];

    const findings = ar.categorizeFindings(outputs);
    assert.ok(findings.critical.length >= 1);
    assert.equal(findings.critical[0].section, "risks");
  });
});

// --- Review Runner: generateQAReport ---

describe("Review Runner: generateQAReport", () => {
  it("produces valid markdown with frontmatter", () => {
    const findings = {
      critical: [{ text: "Crash on null", source: "qa-adversarial", section: "findings" }],
      high: [],
      medium: [{ text: "Consider refactoring", source: "qa-testing", section: "recommendations" }],
      low: [],
    };
    const outputs = [{ agentId: "qa-adversarial" }, { agentId: "qa-testing" }];

    const report = ar.generateQAReport(1, findings, outputs);

    assert.ok(report.startsWith("---\n"));
    assert.ok(report.includes("artifact: qa-report"));
    assert.ok(report.includes("schema_version: 1"));
    assert.ok(report.includes("sprint: 1"));
  });

  it("reports FAIL when critical findings exist", () => {
    const findings = {
      critical: [{ text: "Data loss", source: "qa-adv", section: "risks" }],
      high: [],
      medium: [],
      low: [],
    };

    const report = ar.generateQAReport(1, findings, [{ agentId: "qa-adv" }]);
    assert.ok(report.includes("FAIL"));
  });

  it("reports PASS when no critical findings", () => {
    const findings = {
      critical: [],
      high: [{ text: "Should fix", source: "qa-test", section: "findings" }],
      medium: [],
      low: [],
    };

    const report = ar.generateQAReport(1, findings, [{ agentId: "qa-test" }]);
    assert.ok(report.includes("PASS"));
    assert.ok(!report.includes("FAIL"));
  });

  it("includes source perspectives", () => {
    const findings = { critical: [], high: [], medium: [], low: [] };
    const outputs = [{ agentId: "qa-compliance" }, { agentId: "qa-adversarial" }];

    const report = ar.generateQAReport(1, findings, outputs);
    assert.ok(report.includes("qa-compliance"));
    assert.ok(report.includes("qa-adversarial"));
  });
});

// --- Review Runner: runReview ---

describe("Review Runner: runReview", () => {
  const REVIEW_TMP = path.join(TMP_DIR, "review_test");

  before(() => fs.mkdirSync(REVIEW_TMP, { recursive: true }));
  after(() => fs.rmSync(REVIEW_TMP, { recursive: true, force: true }));

  it("writes QA-REPORT.md to the correct path", () => {
    const outputs = [
      {
        agentId: "qa-task-compliance",
        payload: { findings: "- Minor style issue" },
      },
    ];

    const result = ar.runReview(outputs, 3, REVIEW_TMP, CONFIG);

    assert.equal(result.ok, true);
    const reportPath = path.join(REVIEW_TMP, "reviews", "sprint-3", "QA-REPORT.md");
    assert.ok(fs.existsSync(reportPath), "QA-REPORT.md should exist");
  });

  it("returns categorized findings and summary", () => {
    const outputs = [
      {
        agentId: "qa-adversarial",
        payload: {
          findings: "- Critical: crash on edge case\n- Low cosmetic issue",
          risks: "- High severity: should fix auth gap",
        },
      },
    ];

    const result = ar.runReview(outputs, 2, REVIEW_TMP, CONFIG);

    assert.equal(result.ok, true);
    assert.ok(result.findings.critical.length >= 1);
    assert.ok(result.summary.totalFindings >= 2);
    assert.equal(result.summary.pass, false);
  });

  it("reports pass: true when no critical findings", () => {
    const outputs = [
      {
        agentId: "qa-testing",
        payload: { findings: "- Minor suggestion" },
      },
    ];

    const result = ar.runReview(outputs, 4, REVIEW_TMP, CONFIG);
    assert.equal(result.summary.pass, true);
  });
});
