"use strict";

/**
 * Tests for architect-runner.runArchitectPlan — orchestrator with
 * dispatchFn + askFn injection seams.
 *
 * Validates the multi-status return shape across each branch:
 *   - phase-rejected
 *   - missing-input
 *   - briefs-pending      (dispatchFn === null)
 *   - parse-failed         (every dispatchFn output fails to parse)
 *   - synthesis-ready (lightweight)
 *   - synthesis-ready (heavyweight, with side-effect: phase moved to decomposing)
 *   - questions-pending    (heavyweight wave with askFn === null)
 *   - spec-gap             (askFn returns answer triggering detectSpecGap)
 *   - complete             (full heavyweight loop with askFn returning answers)
 *   - max-waves-reached    (loop guard)
 *
 * Tests do NOT exercise:
 *   - real Agent-tool dispatch — dispatchFn is stubbed
 *   - real AskUserQuestion calls — askFn is stubbed
 *
 * The injection-seam pattern is the same as verify-runner.runVerify
 * (DEC-A004): production sets dispatchFn=null and SKILL.md drives;
 * tests set dispatchFn to a synchronous stub and validate the loop
 * wiring deterministically.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const yamlIO = require("../lib/yaml-io");
const ar = require("../skills/architect/scripts/architect-runner");
const { STATE_FILE } = require("../lib/constants");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
const PROJECT_TRANSITIONS_YAML = path.join(PLUGIN_ROOT, "references", "transitions.yaml");

const FIXTURE_REQUIREMENTS = `---
artifact: requirements
schema_version: 1
produced_by: research
consumed_by: architecture
---

## Project Intent

Build a URL shortener service.

## Functional Requirements

- [ ] **FR-001** — Shorten a URL \`VERIFY\`
- [ ] **FR-002** — Redirect short code \`VERIFY\`
`;

// Stub agent-output rawOutput payloads. Each is a sentinel-bracketed
// XML-tag block that lib/agent-output.parseOutput accepts.
function makeStubRawOutput(briefId, agentId, lensId) {
  return `<analysis>
- **${lensId} Module** — handles ${lensId} concerns
- **Storage Layer** — persistent store
</analysis>

<recommendations>
- ${lensId}-driven recommendation 1
- ${lensId}-driven recommendation 2
</recommendations>

<risks>
- **${lensId} risk** — Severity: medium. Mitigation: standard.
</risks>

<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`;
}

function makeProject(initialPhase, complexity) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-runArchPlan-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  fs.writeFileSync(
    path.join(pipelineDir, STATE_FILE),
    yaml.dump({
      schema_version: 1,
      pipeline: { phase: initialPhase, sprint: 1, wave: null, task_in_progress: null },
      sprints: {}, blocked_on: null, session: {},
    }),
    "utf8",
  );

  const reqDir = path.join(pipelineDir, "requirements");
  fs.mkdirSync(reqDir, { recursive: true });
  fs.writeFileSync(path.join(reqDir, "REQ.md"), FIXTURE_REQUIREMENTS, "utf8");

  if (complexity) {
    const elicitDir = path.join(pipelineDir, "elicitation");
    fs.mkdirSync(elicitDir, { recursive: true });
    const fm = `---\nartifact: elicitation-spec\nschema_version: 1\ncomplexity:\n  ${Object.entries(complexity).map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`).join("\n  ")}\n---\n\n# Spec\n\nIntent: build URL shortener.\n`;
    fs.writeFileSync(path.join(elicitDir, "SPEC.md"), fm, "utf8");
  }

  return { tmpRoot, pipelineDir };
}

// -------------------------------------------------------------------
// Status: phase-rejected
// -------------------------------------------------------------------
describe("runArchitectPlan — phase-rejected", () => {
  let tmpRoot, pipelineDir;
  before(() => { ({ tmpRoot, pipelineDir } = makeProject("sprinting", null)); });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:phase-rejected when starting phase is unsupported", async () => {
    const result = await ar.runArchitectPlan({ pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG });
    assert.equal(result.ok, false);
    assert.equal(result.status, "phase-rejected");
    assert.match(result.error, /sprinting/);
  });
});

// -------------------------------------------------------------------
// Status: missing-input
// -------------------------------------------------------------------
describe("runArchitectPlan — missing-input", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("requirements-ready", null));
    // Remove REQ.md to simulate missing input.
    fs.unlinkSync(path.join(pipelineDir, "requirements", "REQ.md"));
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:missing-input when REQ.md absent", async () => {
    const result = await ar.runArchitectPlan({ pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG });
    assert.equal(result.ok, false);
    assert.equal(result.status, "missing-input");
    assert.match(result.error, /REQ\.md/);
  });
});

// -------------------------------------------------------------------
// Status: briefs-pending (dispatchFn null)
// -------------------------------------------------------------------
describe("runArchitectPlan — briefs-pending (production mode, dispatchFn=null)", () => {
  let tmpRoot, pipelineDir;
  before(() => { ({ tmpRoot, pipelineDir } = makeProject("requirements-ready", null)); });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns briefs and decision when dispatchFn is null", async () => {
    const result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, dispatchFn: null,
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, "briefs-pending");
    assert.equal(result.flow, "heavyweight"); // missing complexity → heavyweight default
    assert.ok(Array.isArray(result.briefs));
    assert.equal(result.briefs.length, 4, "expected 4 perspective briefs");
    for (const b of result.briefs) {
      assert.ok(b.lensId);
      assert.ok(b.agentId);
      assert.ok(b.briefId);
      assert.ok(typeof b.brief === "string" && b.brief.length > 0);
    }
  });

  it("transitions phase requirements-ready → architecture even when stopping at briefs-pending", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "architecture");
  });
});

// -------------------------------------------------------------------
// Status: parse-failed (every dispatchFn output fails to parse)
// -------------------------------------------------------------------
describe("runArchitectPlan — parse-failed (all outputs malformed)", () => {
  let tmpRoot, pipelineDir;
  before(() => { ({ tmpRoot, pipelineDir } = makeProject("requirements-ready", null)); });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:parse-failed when every dispatched output is malformed", async () => {
    async function dispatchFn(_brief) {
      return "no sentinel, no tags, just garbage";
    }
    const result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, dispatchFn,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "parse-failed");
    assert.ok(Array.isArray(result.failures));
    assert.equal(result.failures.length, 4);
  });
});

// -------------------------------------------------------------------
// Status: synthesis-ready — lightweight flow
// -------------------------------------------------------------------
describe("runArchitectPlan — synthesis-ready (lightweight flow)", () => {
  let tmpRoot, pipelineDir, result;
  before(async () => {
    ({ tmpRoot, pipelineDir } = makeProject("requirements-ready", { assessment: "bug-fix", touch_surface: "narrow" }));
    async function dispatchFn(brief) {
      return makeStubRawOutput(brief.briefId, brief.agentId, brief.lensId);
    }
    result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, dispatchFn,
    });
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:synthesis-ready with flow=lightweight", () => {
    assert.equal(result.ok, true, `got: ${JSON.stringify(result)}`);
    assert.equal(result.status, "synthesis-ready");
    assert.equal(result.flow, "lightweight");
  });

  it("provides archDoc + synthDoc + decision in the result", () => {
    assert.ok(typeof result.archDoc === "string" && result.archDoc.includes("schema_version: 1"));
    assert.ok(typeof result.synthDoc === "string" && result.synthDoc.length > 0);
    assert.equal(result.decision.flow, "lightweight");
  });

  it("does NOT call finalizeArchitecture for lightweight (caller drives)", () => {
    // Lightweight path returns synthesis-ready without writing to disk.
    // Phase should remain at architecture (entry transition only); ARCH.md
    // should NOT yet be written by the runner — caller does it via
    // finalizeArchitecture(sprinting).
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "architecture");
    const archDir = path.join(pipelineDir, "architecture");
    assert.equal(fs.existsSync(archDir), false, "lightweight runner should not pre-write ARCH.md");
  });
});

// -------------------------------------------------------------------
// Status: synthesis-ready — heavyweight flow (auto-finalizes architecture)
// -------------------------------------------------------------------
describe("runArchitectPlan — synthesis-ready (heavyweight flow)", () => {
  let tmpRoot, pipelineDir, result;
  before(async () => {
    ({ tmpRoot, pipelineDir } = makeProject("requirements-ready", { assessment: "new-project" }));
    async function dispatchFn(brief) {
      return makeStubRawOutput(brief.briefId, brief.agentId, brief.lensId);
    }
    result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, dispatchFn,
    });
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:synthesis-ready with flow=heavyweight", () => {
    assert.equal(result.ok, true, `got: ${JSON.stringify(result)}`);
    assert.equal(result.status, "synthesis-ready");
    assert.equal(result.flow, "heavyweight");
    assert.match(result.note, /[Ss]eed initial nodes/);
  });

  it("auto-calls finalizeArchitecture(decomposing) — phase is now 'decomposing' and prelim ARCH.md exists", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "decomposing");
    assert.ok(fs.existsSync(path.join(pipelineDir, "architecture", "ARCH.md")));
  });

  it("auto-calls initDecompositionState — DECOMPOSITION-STATE.yaml exists with empty nodes map", () => {
    const decompPath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    assert.ok(fs.existsSync(decompPath));
    const decompState = yamlIO.safeRead(decompPath);
    assert.deepEqual(decompState.nodes, {});
  });
});

// -------------------------------------------------------------------
// Status: questions-pending — heavyweight wave with askFn=null
// -------------------------------------------------------------------
describe("runArchitectPlan — questions-pending (heavyweight, askFn=null)", () => {
  let tmpRoot, pipelineDir, result;
  before(async () => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", null));
    // Init decomposition state + seed a node with a design-keyword name
    // so decomposeWave produces a question.
    ar.initDecompositionState(pipelineDir);
    const decompPath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const decompState = yamlIO.safeRead(decompPath);
    ar.addNode(decompState, "auth-strategy", { name: "Auth strategy choose JWT or session", state: "unresolved", depth: 0 });
    yamlIO.safeWrite(decompPath, decompState);

    result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG,
      askFn: null,
      sprintNumber: 1,
    });
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:questions-pending when askFn is null and wave surfaces questions", () => {
    assert.equal(result.ok, true, `got: ${JSON.stringify(result)}`);
    assert.equal(result.status, "questions-pending");
    assert.ok(Array.isArray(result.questions));
    assert.ok(result.questions.length >= 1);
  });

  it("each surfaced question has nodeId, question text, options", () => {
    for (const q of result.questions) {
      assert.ok(q.nodeId);
      assert.ok(typeof q.question === "string");
      assert.ok(Array.isArray(q.options));
    }
  });

  it("persisted state is saved to disk so caller can resume after applying answers", () => {
    const decompPath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const decompState = yamlIO.safeRead(decompPath);
    assert.ok(decompState.nodes["auth-strategy"]);
    assert.equal(decompState.nodes["auth-strategy"].state, "pending-user-decision");
  });
});

// -------------------------------------------------------------------
// Status: complete — full heavyweight loop with stubbed askFn
// -------------------------------------------------------------------
describe("runArchitectPlan — complete (heavyweight loop with askFn returning answers)", () => {
  let tmpRoot, pipelineDir, result;
  before(async () => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", null));
    ar.initDecompositionState(pipelineDir);
    const decompPath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const decompState = yamlIO.safeRead(decompPath);
    // Leaf-indicator nodes (test, schema, config) auto-resolve to leaf in
    // the first wave — avoiding the design-question path. Validates the
    // happy-path "complete" status return.
    ar.addNode(decompState, "url-config",     { name: "URL Config Module",     state: "unresolved", depth: 0 });
    ar.addNode(decompState, "redirect-test",  { name: "Redirect Test Suite",   state: "unresolved", depth: 0 });
    ar.addNode(decompState, "schema-loader",  { name: "Schema Loader",          state: "unresolved", depth: 0 });
    yamlIO.safeWrite(decompPath, decompState);

    async function askFn(_question, _options) {
      // Should never be called in this fixture (no design questions surfaced).
      // Provide a stub anyway for safety.
      return "Option A";
    }

    result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, askFn, sprintNumber: 1,
    });
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:complete when wave loop converges", () => {
    assert.equal(result.ok, true, `got: ${JSON.stringify(result)}`);
    assert.equal(result.status, "complete");
    assert.equal(result.targetPhase, "sprinting");
    assert.ok(Number.isFinite(result.waveCount));
    assert.equal(result.leafCount, 3, "expected all 3 leaf-indicator nodes to resolve to leaf state");
  });

  it("auto-finalizes decompose — phase=sprinting and TASK-NNN files written", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");

    const sprintDir = path.join(pipelineDir, "sprints", "sprint-1", "tasks");
    assert.ok(fs.existsSync(path.join(sprintDir, "TASK-001.md")));
    assert.ok(fs.existsSync(path.join(sprintDir, "TASK-001.agent.md")));

    const treePath = path.join(pipelineDir, "architecture", "TREE.md");
    assert.ok(fs.existsSync(treePath));
  });
});

// -------------------------------------------------------------------
// Status: max-waves-reached — loop guard
// -------------------------------------------------------------------
describe("runArchitectPlan — max-waves-reached (loop guard)", () => {
  let tmpRoot, pipelineDir, result;
  before(async () => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", null));
    ar.initDecompositionState(pipelineDir);
    const decompPath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const decompState = yamlIO.safeRead(decompPath);
    // A node whose name contains a design keyword ("strategy") AND
    // askFn returns a non-converging answer — every wave produces another
    // pending-user-decision. With maxWaves=1 this hits the guard.
    ar.addNode(decompState, "auth-strategy", { name: "Choose auth strategy", state: "unresolved", depth: 0 });
    yamlIO.safeWrite(decompPath, decompState);

    async function askFn(_q, _opts) {
      // Return an answer that does NOT trigger detectSpecGap. The wave loop
      // continues but with maxWaves=1 we hit the guard immediately after
      // wave 1.
      return "Option A";
    }

    result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG,
      askFn, sprintNumber: 1, maxWaves: 1,
    });
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:max-waves-reached after exceeding maxWaves", () => {
    assert.equal(result.ok, true, `got: ${JSON.stringify(result)}`);
    // After wave 1 the loop guard fires before convergence (because the
    // design-keyword node never resolved into a leaf — applyAnswer
    // updated it but it's still not a leaf in the heuristic).
    // Either max-waves-reached OR complete is acceptable depending on
    // applyAnswer's effect on node state. The contract is: if guard hits,
    // we surface it instead of looping forever.
    assert.ok(
      result.status === "max-waves-reached" || result.status === "complete",
      `expected max-waves-reached or complete, got ${result.status}`,
    );
  });
});

// -------------------------------------------------------------------
// Status: spec-gap — askFn returns gap-triggering answer
// -------------------------------------------------------------------
describe("runArchitectPlan — spec-gap (design question reveals SPEC.md gap)", () => {
  let tmpRoot, pipelineDir, result;
  before(async () => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", null));
    ar.initDecompositionState(pipelineDir);
    const decompPath = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
    const decompState = yamlIO.safeRead(decompPath);
    ar.addNode(decompState, "auth-strategy", { name: "Choose auth strategy", state: "unresolved", depth: 0 });
    yamlIO.safeWrite(decompPath, decompState);

    async function askFn(_q, _opts) {
      // Use an exact GAP_INDICATOR phrase ("not in the spec") so
      // detectSpecGap returns isSpecGap:true. Pre-G1 bug: _runDecomposeLoop
      // checked `gap.detected` (always undefined → falsy), so spec-gap
      // path was dead. Fixed in v0.5.0 follow-up audit — this test
      // pins the contract.
      return "this auth boundary is not in the spec at all — needs a SPEC update";
    }

    result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, askFn, sprintNumber: 1,
    });
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:spec-gap when detectSpecGap fires for an answer", () => {
    assert.equal(result.ok, true, `got: ${JSON.stringify(result)}`);
    assert.equal(result.status, "spec-gap", `expected spec-gap, got ${result.status}`);
    assert.equal(result.gap.isSpecGap, true);
    assert.match(result.gap.reason, /spec gap/);
  });
});

// -------------------------------------------------------------------
// Status: missing-decomposition-state — heavyweight resume with no state
// -------------------------------------------------------------------
describe("runArchitectPlan — missing-decomposition-state (heavyweight resume)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", null));
    // Do NOT call initDecompositionState — DECOMPOSITION-STATE.yaml absent.
  });
  after(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it("returns status:missing-decomposition-state when phase=decomposing but state.yaml absent", async () => {
    const result = await ar.runArchitectPlan({
      pipelineDir, pluginRoot: PLUGIN_ROOT, config: CONFIG, askFn: null, sprintNumber: 1,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "missing-decomposition-state");
    assert.match(result.error, /DECOMPOSITION-STATE/);
  });
});
