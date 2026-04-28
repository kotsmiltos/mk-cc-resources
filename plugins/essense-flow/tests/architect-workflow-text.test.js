"use strict";

/**
 * Static-analysis tests for /architect workflow markdown.
 *
 * The /architect orchestrator reads commands/architect.md (dispatcher),
 * skills/architect/workflows/plan.md (heavyweight), and decompose.md
 * (wave loop). These markdown files contain instructions Claude follows
 * at runtime — they're effectively the system prompt. If specific phrases
 * silently disappear (refactor accident, copy-paste deletion), the
 * orchestrator changes behaviour without any code test catching it.
 *
 * These tests assert that the load-bearing instruction phrases are
 * present. They DO NOT validate semantic correctness — they catch text
 * drift only. Pair with runArchitectPlan injection-seam tests for
 * behavioural validation.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function readWorkflow(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("commands/architect.md — dispatcher instructions present", () => {
  const text = readWorkflow("commands/architect.md");

  it("describes the lightweight vs heavyweight routing decision", () => {
    assert.match(text, /Lightweight/);
    assert.match(text, /Heavyweight/);
    assert.match(text, /chooseArchitectFlow/);
  });

  it("instructs orchestrator to read SPEC.md complexity", () => {
    assert.match(text, /SPEC\.md/);
    assert.match(text, /complexity/);
  });

  it("calls finalizeArchitecture for both routes", () => {
    assert.match(text, /finalizeArchitecture\([^)]*"sprinting"/, "lightweight finalize");
    assert.match(text, /finalizeArchitecture\([^)]*"decomposing"/, "heavyweight finalize");
  });

  it("documents the mechanical override pattern (per-cycle SPEC.md edit)", () => {
    assert.match(text, /mechanical/);
    assert.match(text, /classification/);
  });

  it("calls finalizeArchitecture single-call MANDATORY for atomic write+transition", () => {
    assert.match(text, /MANDATORY single call/);
  });
});

describe("skills/architect/workflows/plan.md — heavyweight workflow instructions present", () => {
  const text = readWorkflow("skills/architect/workflows/plan.md");

  it("describes the perspective swarm dispatch (4 agents in parallel)", () => {
    // Catches silent drift if "in parallel" or "Agent tool" is dropped during
    // refactor — the orchestrator would no longer fan out and would serialize
    // the swarm, blowing the wall-clock budget.
    assert.match(text, /4 agents/);
    assert.match(text, /parallel/);
    assert.match(text, /Agent tool/);
  });

  it("classifies design-bearing vs mechanical before dispatch", () => {
    assert.match(text, /design-bearing/);
    assert.match(text, /[Mm]echanical/);
  });

  it("references planArchitecture, synthesizeArchitecture, finalizeArchitecture", () => {
    assert.match(text, /planArchitecture/);
    assert.match(text, /synthesizeArchitecture/);
    assert.match(text, /finalizeArchitecture/);
  });

  it("describes the wave-based decomposition loop entry", () => {
    assert.match(text, /[Dd]ecomposition/);
    assert.match(text, /wave/i);
  });

  it("calls finalizeArchitecture(decomposing) MANDATORY at architecture exit", () => {
    assert.match(text, /finalizeArchitecture\([^)]*"decomposing"/);
    assert.match(text, /MANDATORY single call/);
  });
});

describe("skills/architect/workflows/decompose.md — wave loop instructions present", () => {
  const text = readWorkflow("skills/architect/workflows/decompose.md");

  it("frontmatter declares phase_requires: decomposing (not architecture)", () => {
    // Bug fix in v0.5.0: frontmatter previously said `phase_requires:
    // architecture` even though phase_transitions and content described
    // decomposing-phase work. workflow-transitions.test.js catches the
    // resulting transition-list mismatch but not the phase_requires
    // value itself — this test does.
    assert.match(text, /phase_requires:\s*decomposing/);
  });

  it("instructs orchestrator to call decomposeWave per wave", () => {
    assert.match(text, /decomposeWave/);
  });

  it("instructs AskUserQuestion for surfacing design questions", () => {
    assert.match(text, /AskUserQuestion/);
  });

  it("instructs applyAnswer + detectSpecGap after each user answer", () => {
    assert.match(text, /applyAnswer/);
    assert.match(text, /detectSpecGap/);
  });

  it("calls finalizeDecompose MANDATORY at the decomposing → sprinting boundary", () => {
    assert.match(text, /finalizeDecompose/);
    assert.match(text, /MANDATORY single call/);
  });

  it("documents convergence-check escalation (max waves)", () => {
    assert.match(text, /convergence/i);
    assert.match(text, /\b\d+\s+waves\b/, "expected a numeric wave threshold");
  });
});

describe("skills/architect/SKILL.md — workflow + transition lists match dispatcher reality", () => {
  const text = readWorkflow("skills/architect/SKILL.md");

  it("documents both lightweight and heavyweight flows under Workflows section", () => {
    assert.match(text, /[Ll]ightweight/);
    assert.match(text, /[Hh]eavyweight/);
  });

  it("references chooseArchitectFlow in workflow routing description", () => {
    assert.match(text, /chooseArchitectFlow/);
  });

  it("State Transitions list includes decomposing → decomposing self-loop", () => {
    assert.match(text, /decomposing\s*→\s*decomposing/);
  });

  it("State Transitions list includes architecture → sprinting (lightweight) and architecture → decomposing (heavyweight)", () => {
    assert.match(text, /architecture\s*→\s*sprinting/);
    assert.match(text, /architecture\s*→\s*decomposing/);
  });
});
