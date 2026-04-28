"use strict";

/**
 * Tests for architect-runner.finalizeDecompose — atomic post-decompose
 * hand-off.
 *
 * Background: previously the architect plan/decompose workflows had
 * separate writeTaskSpecs + transition steps. Orchestrator could stop
 * between them, leaving phase=decomposing with TASK-NNN.md files
 * present — autopilot then looped /architect against an existing
 * decomposition (same B2 failure mode). finalizeDecompose combines
 * both into a single call.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const { finalizeDecompose, VALID_DECOMPOSE_ROUTES } = require("../skills/architect/scripts/architect-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-decompose-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: sprintNumber, wave: null, task_in_progress: null },
    sprints: {},
    blocked_on: null,
    session: {},
  };
  fs.writeFileSync(path.join(pipelineDir, STATE_FILE), yaml.dump(state), "utf8");

  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  return { tmpRoot, pipelineDir };
}

const fakeSpecs = [
  { id: "TASK-001", md: "# TASK-001\n", agentMd: "# TASK-001 (agent)\n" },
  { id: "TASK-002", md: "# TASK-002\n", agentMd: "# TASK-002 (agent)\n" },
];

describe("finalizeDecompose — atomic write + transition (each route)", () => {
  for (const route of VALID_DECOMPOSE_ROUTES) {
    describe(`route → ${route}`, () => {
      let tmpRoot, pipelineDir;

      before(() => {
        ({ tmpRoot, pipelineDir } = makeProject("decomposing", 4));
      });

      after(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      });

      it(`returns ok:true and transitions decomposing → ${route}`, () => {
        const result = finalizeDecompose(
          pipelineDir, 4, fakeSpecs, "# Tree\n", "# Arch\n", "# Synth\n", route,
        );
        assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
        assert.equal(result.transitioned, true);
        assert.equal(result.targetPhase, route);
        assert.ok(result.sprintDir.endsWith(path.join("sprint-4", "tasks")));
      });

      it("task specs were written for each spec id", () => {
        const sprintDir = path.join(pipelineDir, "sprints", "sprint-4", "tasks");
        for (const s of fakeSpecs) {
          assert.ok(fs.existsSync(path.join(sprintDir, `${s.id}.md`)));
          assert.ok(fs.existsSync(path.join(sprintDir, `${s.id}.agent.md`)));
        }
      });

      it("TREE.md and ARCH.md were written when provided", () => {
        const archDir = path.join(pipelineDir, "architecture");
        assert.ok(fs.existsSync(path.join(archDir, "TREE.md")));
        assert.ok(fs.existsSync(path.join(archDir, "ARCH.md")));
      });

      it(`state.yaml phase is now '${route}'`, () => {
        const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
        assert.equal(state.pipeline.phase, route);
      });

      it(`state-history.yaml records decomposing → ${route}`, () => {
        const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
        const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
        const last = hist.entries[hist.entries.length - 1];
        assert.equal(last.from_state, "decomposing");
        assert.equal(last.to_state, route);
      });
    });
  }
});

describe("finalizeDecompose — defaults to sprinting", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", 5));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("uses 'sprinting' as default route when route arg omitted", () => {
    const result = finalizeDecompose(pipelineDir, 5, fakeSpecs);
    assert.equal(result.ok, true);
    assert.equal(result.targetPhase, "sprinting");
  });
});

describe("finalizeDecompose — invalid route rejected", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("decomposing", 6));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when route is not a valid decompose target", () => {
    const result = finalizeDecompose(pipelineDir, 6, fakeSpecs, null, null, null, "verifying");
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.match(result.error, /invalid route/);
  });

  it("does not write task specs when route is invalid (early reject)", () => {
    const sprintDir = path.join(pipelineDir, "sprints", "sprint-6", "tasks");
    assert.equal(fs.existsSync(sprintDir), false, "no artifacts on invalid-route reject");
  });

  it("state.yaml phase remains 'decomposing' on invalid route", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "decomposing");
  });
});

describe("finalizeDecompose — phase guard", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 7));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'decomposing'", () => {
    const result = finalizeDecompose(pipelineDir, 7, fakeSpecs);
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  it("task specs are still written even when transition fails (preserves work)", () => {
    const sprintDir = path.join(pipelineDir, "sprints", "sprint-7", "tasks");
    assert.ok(fs.existsSync(path.join(sprintDir, "TASK-001.md")));
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});
