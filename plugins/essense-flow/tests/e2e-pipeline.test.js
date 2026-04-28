"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const yamlIO = require("../lib/yaml-io");
const stateMachine = require("../lib/state-machine");
const pathsLib = require("../lib/paths");
const researchRunner = require("../skills/research/scripts/research-runner");
const architectRunner = require("../skills/architect/scripts/architect-runner");
const buildRunner = require("../skills/build/scripts/build-runner");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
const TMP_PROJECT = path.join(__dirname, "__tmp_e2e__");
const PIPELINE_DIR = path.join(TMP_PROJECT, ".pipeline");
const TRANSITIONS_PATH = path.join(PLUGIN_ROOT, "references", "transitions.yaml");
const STATE_FILE = path.join(PIPELINE_DIR, "state.yaml");

// Simulated agent XML outputs with sentinel
function makeAgentOutput(briefId, agentId, payload) {
  const sections = Object.entries(payload)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("\n");
  return `${sections}\n\n<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`;
}

// Helper: write state directly (for transitions with file requirements
// that reference .pipeline/ paths relative to project root)
function writeState(phase) {
  const state = yamlIO.safeReadWithFallback(STATE_FILE) || { schema_version: 1, pipeline: {} };
  state.pipeline.phase = phase;
  state.last_updated = new Date().toISOString();
  yamlIO.safeWrite(STATE_FILE, state);
}

describe("End-to-End Pipeline", () => {
  before(() => {
    fs.mkdirSync(PIPELINE_DIR, { recursive: true });

    // state-machine.writeState resolves transitions.yaml relative to
    // path.dirname(pipelineDir) — i.e. TMP_PROJECT/references/transitions.yaml.
    // Mirror the canonical file there so build-runner.completeSprintExecution
    // (and any other writeState callers) find a valid transition map.
    const refsDir = path.join(TMP_PROJECT, "references");
    fs.mkdirSync(refsDir, { recursive: true });
    fs.copyFileSync(TRANSITIONS_PATH, path.join(refsDir, "transitions.yaml"));

    // Initialize pipeline state
    yamlIO.safeWrite(STATE_FILE, {
      schema_version: 1,
      pipeline: { phase: "idle" },
      last_updated: new Date().toISOString(),
    });

    // Copy config
    const config = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));
    config.pipeline.name = "e2e-test";
    config.pipeline.created_at = new Date().toISOString();
    yamlIO.safeWrite(path.join(PIPELINE_DIR, "config.yaml"), config);
  });

  after(() => {
    fs.rmSync(TMP_PROJECT, { recursive: true, force: true });
  });

  it("research phase produces requirements", () => {
    // 1. Assemble briefs
    const problemStatement = "Build a CLI tool that converts markdown to PDF with template support";
    const briefResult = researchRunner.assemblePerspectiveBriefs(problemStatement, PLUGIN_ROOT, CONFIG);
    assert.equal(briefResult.ok, true);
    assert.equal(briefResult.briefs.length, 4);

    // 2. Simulate agent outputs
    const simulatedRawOutputs = briefResult.briefs.map((b) => ({
      lensId: b.lensId,
      agentId: b.agentId,
      briefId: b.briefId,
      rawOutput: makeAgentOutput(b.briefId, b.agentId, {
        findings: `- **Input Validation** — validate markdown syntax before conversion\n- **Template Loading** — load PDF templates from configurable directory`,
        risks: `- **Large File Handling** — memory issues with very large markdown files. Severity: medium`,
        constraints: `- **CLI Interface** — must work as a standard CLI tool with arguments`,
      }),
    }));

    // 3. Parse outputs
    const parseResult = researchRunner.parseAgentOutputs(simulatedRawOutputs);
    assert.ok(parseResult.parsed.length >= 3, "Most agents should parse successfully");

    // 4. Synthesize and generate requirements
    const synthResult = researchRunner.synthesizeAndGenerate(parseResult.parsed, PLUGIN_ROOT, null);
    assert.ok(synthResult.requirements.includes("FR-"), "Requirements should have FR-NNN entries");
    assert.ok(synthResult.requirements.includes("schema_version: 1"));

    // 5. Write to pipeline dir
    const reqPath = researchRunner.writeRequirements(PIPELINE_DIR, synthResult.requirements, synthResult.synthesis);
    assert.ok(fs.existsSync(reqPath));

    // 6. Transition state: idle -> research -> requirements-ready
    // These transitions have no file requirements, so use state machine
    const transitionMap = stateMachine.loadTransitions(TRANSITIONS_PATH);
    stateMachine.transition(STATE_FILE, "research", transitionMap, TMP_PROJECT);
    stateMachine.transition(STATE_FILE, "requirements-ready", transitionMap, TMP_PROJECT);

    const state = yamlIO.safeRead(STATE_FILE);
    assert.equal(state.pipeline.phase, "requirements-ready");
  });

  it("architecture phase produces task specs", () => {
    // 1. Read requirements
    const reqPath = path.join(PIPELINE_DIR, "requirements", "REQ.md");
    assert.ok(fs.existsSync(reqPath), "REQ.md should exist from research phase");
    const reqContent = fs.readFileSync(reqPath, "utf8");

    // 2. Plan architecture
    const planResult = architectRunner.planArchitecture(reqContent, PLUGIN_ROOT, CONFIG);
    assert.equal(planResult.ok, true);
    assert.equal(planResult.briefs.length, 4);

    // 3. Simulate architecture agent outputs
    const simOutputs = planResult.briefs.map((b) => ({
      agentId: b.agentId,
      lensId: b.lensId,
      payload: {
        analysis: `- **Markdown Parser Module** — reads and validates markdown input\n- **PDF Renderer** — converts parsed AST to PDF output`,
        recommendations: `- **Template Engine** — use Handlebars for template processing\n- **Plugin Architecture** — allow custom renderers`,
        risks: `- **Cross-platform fonts** — font availability varies by OS. Severity: medium`,
      },
    }));

    // 4. Synthesize
    const synthResult = architectRunner.synthesizeArchitecture(simOutputs, reqContent, CONFIG);
    assert.equal(synthResult.ok, true);
    assert.ok(synthResult.architecture.includes("# Architecture Document"));

    // 5. Write architecture artifacts
    architectRunner.writeArchitectureArtifacts(PIPELINE_DIR, synthResult.architecture, synthResult.synthesis);
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "architecture", "ARCH.md")));

    // 6. Create fixture task specs
    const tasks = [
      { id: "TASK-001", spec: "---\ndepends_on: None\n---\n## Goal\nBuild markdown parser.\n\n## Pseudocode\n1. Read input file\n2. Parse AST\n\n## Acceptance Criteria\n- [ ] Parses valid markdown" },
      { id: "TASK-002", spec: "---\ndepends_on: TASK-001\n---\n## Goal\nBuild PDF renderer.\n\n## Pseudocode\n1. Accept AST\n2. Render to PDF\n\n## Acceptance Criteria\n- [ ] Generates valid PDF" },
    ];
    const specResult = architectRunner.createTaskSpecs(tasks, synthResult.architecture, CONFIG);
    assert.equal(specResult.specs.length, 2);
    architectRunner.writeTaskSpecs(PIPELINE_DIR, 1, specResult.specs);

    // Verify files written
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "sprints", "sprint-1", "tasks", "TASK-001.md")));
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "sprints", "sprint-1", "tasks", "TASK-001.agent.md")));
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "sprints", "sprint-1", "tasks", "TASK-002.md")));
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "sprints", "sprint-1", "tasks", "TASK-002.agent.md")));

    // 7. Transition state: requirements-ready -> architecture -> sprinting
    // The architecture transition has file requirements that reference .pipeline/
    // relative to project root. Use transition with TMP_PROJECT as pipelineDir.
    const transitionMap = stateMachine.loadTransitions(TRANSITIONS_PATH);
    stateMachine.transition(STATE_FILE, "architecture", transitionMap, TMP_PROJECT);
    stateMachine.transition(STATE_FILE, "sprinting", transitionMap, TMP_PROJECT);

    const state = yamlIO.safeRead(STATE_FILE);
    assert.equal(state.pipeline.phase, "sprinting");
  });

  it("build phase executes tasks in waves", () => {
    // 1. Plan execution
    const sprintDir = path.join(PIPELINE_DIR, "sprints", "sprint-1");
    const planResult = buildRunner.planExecution(sprintDir, CONFIG);
    assert.equal(planResult.ok, true);
    assert.ok(planResult.waves.length >= 1, "Should have at least one wave");

    // TASK-001 has no deps, TASK-002 depends on TASK-001
    assert.ok(planResult.waves[0].includes("TASK-001"), "TASK-001 in wave 0");

    // 2. Simulate completions for each task
    const completions = [];
    for (const wave of planResult.waves) {
      for (const taskId of wave) {
        const rawOutput = [
          `<files-written>src/${taskId.toLowerCase()}.js</files-written>`,
          `<deviations>none</deviations>`,
          `<verification>Tests pass</verification>`,
          `<!-- SENTINEL:COMPLETE:build-${taskId}:builder -->`,
        ].join("\n");

        const completion = buildRunner.recordCompletion(PIPELINE_DIR, 1, taskId, rawOutput);
        completions.push(completion);
      }
    }

    assert.equal(completions.length, 2);
    assert.ok(completions.every((c) => c.status === "COMPLETE"));

    // 3. Complete sprint (transitions via state machine)
    const completeResult = buildRunner.completeSprintExecution(PIPELINE_DIR, 1, completions, CONFIG, PLUGIN_ROOT);
    assert.equal(completeResult.ok, true);
    assert.ok(completeResult.report.completed === 2);

    // Verify completion report written
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "sprints", "sprint-1", "completion-report.md")));

    const state = yamlIO.safeRead(STATE_FILE);
    assert.equal(state.pipeline.phase, "sprint-complete");
  });

  it("review phase produces QA report", () => {
    // 1. Simulate QA agent outputs with mixed severity
    const parsedQAOutputs = [
      {
        agentId: "qa-task-compliance",
        payload: {
          findings: "- All acceptance criteria met for TASK-001\n- Minor cosmetic issue in TASK-002 output formatting",
          recommendations: "- Consider adding more edge case tests",
        },
      },
      {
        agentId: "qa-requirements-alignment",
        payload: {
          findings: "- FR-001 fully implemented\n- FR-002 partially implemented",
          risks: "- High: should fix incomplete FR-002 coverage",
        },
      },
      {
        agentId: "qa-fitness-functions",
        payload: {
          findings: "- Module boundaries respected\n- No cross-module imports detected",
        },
      },
      {
        agentId: "qa-adversarial",
        payload: {
          findings: "- Critical: crash on empty input — must fix null guard\n- Low minor: verbose error messages",
          risks: "- Medium: consider timeout handling for large files",
        },
      },
    ];

    // 2. Run review
    const result = architectRunner.runReview(parsedQAOutputs, 1, PIPELINE_DIR, CONFIG);
    assert.equal(result.ok, true);
    assert.ok(result.findings.critical.length >= 1, "Should have critical findings");
    assert.ok(result.summary.totalFindings >= 4, "Should have multiple findings");
    assert.equal(result.summary.pass, false, "Should fail due to critical findings");

    // 3. Verify QA report written
    const reportPath = path.join(PIPELINE_DIR, "reviews", "sprint-1", "QA-REPORT.md");
    assert.ok(fs.existsSync(reportPath), "QA-REPORT.md should exist");

    const reportContent = fs.readFileSync(reportPath, "utf8");
    assert.ok(reportContent.includes("schema_version: 1"));
    assert.ok(reportContent.includes("FAIL"));
    assert.ok(reportContent.includes("## Source Perspectives"));
  });

  it("full pipeline state transitions are valid throughout", () => {
    // Verify final state after all phases
    const state = yamlIO.safeRead(STATE_FILE);
    assert.equal(state.pipeline.phase, "sprint-complete");
    assert.ok(state.last_updated);

    // Verify all artifacts exist
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "requirements", "REQ.md")), "REQ.md exists");
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "architecture", "ARCH.md")), "ARCH.md exists");
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "sprints", "sprint-1", "completion-report.md")), "Completion report exists");
    assert.ok(fs.existsSync(path.join(PIPELINE_DIR, "reviews", "sprint-1", "QA-REPORT.md")), "QA report exists");

    // Verify state machine would accept transition to reviewing
    const transitionMap = stateMachine.loadTransitions(TRANSITIONS_PATH);
    const validation = stateMachine.validateTransition("sprint-complete", "reviewing", transitionMap);
    assert.equal(validation.valid, true, "sprint-complete -> reviewing should be valid");
  });
});
