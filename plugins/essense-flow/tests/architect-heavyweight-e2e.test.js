"use strict";

/**
 * End-to-end integration test for the heavyweight /architect flow.
 *
 * Validates the full path described by the dispatcher in
 * commands/architect.md when complexity routes to heavyweight:
 *
 *   1. chooseArchitectFlow → "heavyweight" for non-flat complexity
 *   2. transition requirements-ready → architecture
 *   3. synthesizeArchitecture (using stubbed perspective outputs to avoid
 *      real LLM dispatch)
 *   4. finalizeArchitecture(decomposing) — atomic prelim ARCH + transition
 *   5. initDecompositionState
 *   6. addNode (leaf-indicator nodes that decomposeWave can resolve in one
 *      pass)
 *   7. decomposeWave → all nodes resolve to leaf state in a single wave
 *   8. isDecompositionComplete → true
 *   9. generateTreeMd
 *  10. createTaskSpecs
 *  11. finalizeDecompose(sprinting) — atomic write + transition
 *
 * Asserts:
 *   - state.yaml progression: requirements-ready → architecture → decomposing → sprinting
 *   - state-history.yaml records every transition
 *   - ARCH.md, synthesis.md, TREE.md, DECOMPOSITION-STATE.yaml, TASK-NNN.md
 *     pairs all written
 *   - chooseArchitectFlow chose heavyweight for the fixture
 *
 * This test does NOT exercise:
 *   - real perspective-agent dispatch (stubbed via SIMULATED_ARCH_OUTPUTS)
 *   - the AskUserQuestion design-question loop (fixture nodes use leaf
 *     indicators so decomposeWave produces no questions)
 *   - the convergence-check escalation path (single wave is sufficient)
 *
 * Those orchestrator-driven steps are documented in plan.md/decompose.md
 * and require live LLM execution to fully validate.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const yamlIO = require("../lib/yaml-io");
const ar = require("../skills/architect/scripts/architect-runner");
const stateMachine = require("../lib/state-machine");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
const PROJECT_TRANSITIONS_YAML = path.join(PLUGIN_ROOT, "references", "transitions.yaml");

// Fixture: realistic requirements (mirrored from architecture-integration.test.js).
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

## Constraints

- Must use a persistent store (not in-memory only)
`;

// Fixture: simulated 4-perspective architecture outputs (skips real LLM dispatch).
const SIMULATED_ARCH_OUTPUTS = [
  {
    agentId: "architect-infrastructure",
    lensId: "infrastructure",
    payload: {
      analysis: "- **URL Service Module** — handles shortening and redirect logic\n- **Storage Layer** — persistent store",
      recommendations: "- **Horizontal Scaling** — stateless service",
      risks: "- **Database bottleneck** — analytics writes. Severity: high.",
    },
  },
  {
    agentId: "architect-interface",
    lensId: "interface",
    payload: {
      interfaces: "- **URL Service** expects long URL string returns short code\n- **Analytics Module** receives click events",
      analysis: "- **REST API** — POST /shorten, GET /:code",
      recommendations: "- **Input Validation** — validate URL format",
    },
  },
  {
    agentId: "architect-testing",
    lensId: "testing",
    payload: {
      analysis: "- **Unit testable** — URL generation is pure function",
      recommendations: "- **Contract Tests** — verify URL Service output matches Analytics input",
      risks: "- **Flaky analytics tests** — async write timing-dependent",
    },
  },
  {
    agentId: "architect-security",
    lensId: "security",
    payload: {
      analysis: "- **Input Validation** — prevent URL injection",
      constraints: "- **URL Sanitization** — validate all input URLs",
      risks: "- **Open Redirect** — phishing risk. Severity: high.",
    },
  },
];

function makeProject() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-arch-heavyweight-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  // Mirror references/transitions.yaml so state-machine.writeState's
  // path.dirname(pipelineDir)/references/transitions.yaml lookup resolves.
  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  // Initial state: requirements-ready (post-research).
  fs.writeFileSync(
    path.join(pipelineDir, STATE_FILE),
    yaml.dump({
      schema_version: 1,
      pipeline: { phase: "requirements-ready", sprint: 1, wave: null, task_in_progress: null },
      sprints: {},
      blocked_on: null,
      session: {},
    }),
    "utf8",
  );

  // Persist REQ.md (the heavyweight flow reads this).
  const reqDir = path.join(pipelineDir, "requirements");
  fs.mkdirSync(reqDir, { recursive: true });
  fs.writeFileSync(path.join(reqDir, "REQ.md"), FIXTURE_REQUIREMENTS, "utf8");

  return { tmpRoot, pipelineDir };
}

describe("Heavyweight /architect flow — end-to-end (stubbed dispatch)", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject());
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------
  // Step 1: Dispatcher routes new-project complexity → heavyweight
  // -------------------------------------------------------------------
  it("chooseArchitectFlow routes new-project complexity to heavyweight", () => {
    const decision = ar.chooseArchitectFlow({ assessment: "new-project" });
    assert.equal(decision.flow, "heavyweight");
    assert.equal(decision.depth, "full");
  });

  // -------------------------------------------------------------------
  // Step 2: requirements-ready → architecture (workflow step 2 in plan.md)
  // -------------------------------------------------------------------
  it("transitions requirements-ready → architecture (planning entry)", () => {
    const result = stateMachine.writeState(
      pipelineDir, "architecture", {},
      { command: "/architect", trigger: "architect-plan-entry" },
    );
    assert.equal(result.ok, true, `expected ok:true, got ${JSON.stringify(result)}`);

    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "architecture");
  });

  // -------------------------------------------------------------------
  // Step 3-8: Synthesize architecture (skipping real LLM dispatch)
  // -------------------------------------------------------------------
  let archDoc, synthDoc;

  it("synthesizeArchitecture produces ARCH.md content from stubbed perspective outputs", () => {
    const synthResult = ar.synthesizeArchitecture(SIMULATED_ARCH_OUTPUTS, FIXTURE_REQUIREMENTS, CONFIG);
    assert.equal(synthResult.ok, true, `expected ok:true, got ${JSON.stringify(synthResult)}`);
    assert.ok(synthResult.architecture.includes("# Architecture Document"));
    assert.ok(synthResult.architecture.includes("schema_version: 1"));
    archDoc = synthResult.architecture;
    synthDoc = synthResult.synthesis;
  });

  // -------------------------------------------------------------------
  // Step 9: finalizeArchitecture(decomposing) — atomic prelim ARCH + transition
  // -------------------------------------------------------------------
  it("finalizeArchitecture(decomposing) writes prelim ARCH + transitions atomically", () => {
    const result = ar.finalizeArchitecture(pipelineDir, archDoc, synthDoc, "decomposing");
    assert.equal(result.ok, true, `expected ok:true, got ${JSON.stringify(result)}`);
    assert.equal(result.transitioned, true);
    assert.equal(result.targetPhase, "decomposing");
  });

  it("prelim ARCH.md and synthesis.md exist on disk after finalizeArchitecture(decomposing)", () => {
    const archDir = path.join(pipelineDir, "architecture");
    assert.ok(fs.existsSync(path.join(archDir, "ARCH.md")));
    assert.ok(fs.existsSync(path.join(archDir, "synthesis.md")));
  });

  it("state.yaml phase is now 'decomposing' after finalizeArchitecture", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "decomposing");
  });

  // -------------------------------------------------------------------
  // Step 10: Initialize decomposition state
  // -------------------------------------------------------------------
  it("initDecompositionState creates DECOMPOSITION-STATE.yaml under .pipeline/architecture/", () => {
    const result = ar.initDecompositionState(pipelineDir);
    assert.equal(result.ok, true);
    assert.ok(fs.existsSync(result.statePath));
  });

  // -------------------------------------------------------------------
  // Step 11: Add leaf-indicator nodes that decomposeWave will resolve
  //
  // evaluateNode(node) returns isLeaf:true when the node name contains
  // any LEAF_INDICATORS keyword (test, config, schema, helper, etc.).
  // Picking such names lets decomposeWave converge in a single wave
  // without the AskUserQuestion design-question loop.
  // -------------------------------------------------------------------
  it("decomposeWave resolves all leaf-indicator nodes in a single wave (no questions surfaced)", () => {
    const statePath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const state = yamlIO.safeRead(statePath);

    ar.addNode(state, "url-service-config", { name: "URL Service Config Module", state: "unresolved", depth: 0 });
    ar.addNode(state, "analytics-schema",   { name: "Analytics Schema",         state: "unresolved", depth: 0 });
    ar.addNode(state, "redirect-test",       { name: "Redirect Test Suite",      state: "unresolved", depth: 0 });

    const waveResult = ar.decomposeWave(state, null, FIXTURE_REQUIREMENTS, CONFIG);
    assert.equal(waveResult.ok, true);
    assert.equal(waveResult.questionsToSurface.length, 0, "leaf-indicator fixture should produce no design questions");

    ar.saveDecompositionState(pipelineDir, state);

    const completion = ar.isDecompositionComplete(state);
    assert.equal(completion.complete, true, `expected decomposition complete, got summary: ${JSON.stringify(completion.summary)}`);
  });

  // -------------------------------------------------------------------
  // Step 12: Generate TREE.md from completed decomposition state
  // -------------------------------------------------------------------
  let treeMd;

  it("generateTreeMd produces a non-empty TREE.md from resolved state", () => {
    const statePath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const state = yamlIO.safeRead(statePath);
    treeMd = ar.generateTreeMd(state);
    assert.ok(typeof treeMd === "string" && treeMd.length > 0);
    // Each leaf node name should appear in the tree.
    assert.ok(treeMd.includes("URL Service Config Module"));
    assert.ok(treeMd.includes("Analytics Schema"));
    assert.ok(treeMd.includes("Redirect Test Suite"));
  });

  // -------------------------------------------------------------------
  // Step 13: createTaskSpecs from leaf nodes
  // -------------------------------------------------------------------
  let specs;

  it("createTaskSpecs produces .md + .agent.md spec pairs for each leaf node", () => {
    const tasks = [
      { id: "TASK-001", spec: "---\ndepends_on: None\n---\n## Goal\nWire URL Service Config.\n\n## Acceptance Criteria\n- [ ] config loaded" },
      { id: "TASK-002", spec: "---\ndepends_on: TASK-001\n---\n## Goal\nDefine Analytics Schema.\n\n## Acceptance Criteria\n- [ ] schema versioned" },
      { id: "TASK-003", spec: "---\ndepends_on: TASK-001\n---\n## Goal\nWrite Redirect Test Suite.\n\n## Acceptance Criteria\n- [ ] redirect tested" },
    ];
    const result = ar.createTaskSpecs(tasks, archDoc, CONFIG);
    assert.equal(result.specs.length, 3);
    specs = result.specs;
    for (const s of specs) {
      assert.ok(typeof s.md === "string" && s.md.length > 0);
      assert.ok(typeof s.agentMd === "string" && s.agentMd.length > 0);
    }
  });

  // -------------------------------------------------------------------
  // Step 14: finalizeDecompose(sprinting) — atomic write + transition
  // -------------------------------------------------------------------
  it("finalizeDecompose(sprinting) writes TREE.md + final ARCH.md + task specs and transitions atomically", () => {
    const result = ar.finalizeDecompose(pipelineDir, 1, specs, treeMd, archDoc, synthDoc, "sprinting");
    assert.equal(result.ok, true, `expected ok:true, got ${JSON.stringify(result)}`);
    assert.equal(result.transitioned, true);
    assert.equal(result.targetPhase, "sprinting");
  });

  it("TREE.md, final ARCH.md, synthesis.md, and TASK-NNN.md pairs all exist on disk", () => {
    const archDir = path.join(pipelineDir, "architecture");
    assert.ok(fs.existsSync(path.join(archDir, "TREE.md")));
    assert.ok(fs.existsSync(path.join(archDir, "ARCH.md")));
    assert.ok(fs.existsSync(path.join(archDir, "synthesis.md")));

    const sprintDir = path.join(pipelineDir, "sprints", "sprint-1", "tasks");
    for (const id of ["TASK-001", "TASK-002", "TASK-003"]) {
      assert.ok(fs.existsSync(path.join(sprintDir, `${id}.md`)));
      assert.ok(fs.existsSync(path.join(sprintDir, `${id}.agent.md`)));
    }
  });

  it("state.yaml phase is now 'sprinting' (heavyweight flow complete)", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });

  // -------------------------------------------------------------------
  // Final audit: state-history records the full trail.
  // -------------------------------------------------------------------
  it("state-history.yaml records architecture → decomposing → sprinting trail", () => {
    const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    assert.ok(fs.existsSync(histPath));
    const hist = yaml.load(fs.readFileSync(histPath, "utf8"));

    const transitions = hist.entries.map((e) => `${e.from_state}→${e.to_state}`);
    assert.ok(transitions.includes("requirements-ready→architecture"), `expected requirements-ready→architecture, got ${transitions.join(", ")}`);
    assert.ok(transitions.includes("architecture→decomposing"), `expected architecture→decomposing, got ${transitions.join(", ")}`);
    assert.ok(transitions.includes("decomposing→sprinting"), `expected decomposing→sprinting, got ${transitions.join(", ")}`);
  });
});
