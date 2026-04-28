"use strict";

/**
 * Tests for research-runner.finalizeResearch — atomic post-research hand-off.
 *
 * Background: previously /research workflow had separate writeRequirements
 * + transition steps. Orchestrator could stop between them, leaving
 * phase=research with REQ.md present — autopilot then looped /research
 * against an existing report (same B2 failure mode that affected /review
 * and /triage). finalizeResearch combines both into a single call.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const { finalizeResearch, VALID_RESEARCH_ROUTES } = require("../skills/research/scripts/research-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-research-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: null, wave: null, task_in_progress: null },
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

describe("finalizeResearch — atomic write + transition (each route)", () => {
  for (const route of VALID_RESEARCH_ROUTES) {
    describe(`route → ${route}`, () => {
      let tmpRoot, pipelineDir;

      before(() => {
        ({ tmpRoot, pipelineDir } = makeProject("research"));
      });

      after(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      });

      it(`returns ok:true and transitions research → ${route}`, () => {
        const result = finalizeResearch(pipelineDir, "# REQ\n", "# Synthesis\n", [], route);
        assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
        assert.equal(result.transitioned, true);
        assert.equal(result.targetPhase, route);
        assert.ok(result.reqPath.endsWith("REQ.md"));
      });

      it(`state.yaml phase is now '${route}'`, () => {
        const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
        assert.equal(state.pipeline.phase, route);
      });

      it(`state-history.yaml records research → ${route} with REQ artifact`, () => {
        const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
        assert.ok(fs.existsSync(histPath), "state-history.yaml must exist");
        const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
        const last = hist.entries[hist.entries.length - 1];
        assert.equal(last.from_state, "research");
        assert.equal(last.to_state, route);
        assert.match(last.triggering_artifact || "", /REQ\.md/);
      });

      it("synthesis.md was written when provided", () => {
        const synthPath = path.join(pipelineDir, "requirements", "synthesis.md");
        assert.ok(fs.existsSync(synthPath));
      });
    });
  }
});

describe("finalizeResearch — defaults to triaging", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("research"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("uses 'triaging' as default route when route arg omitted", () => {
    const result = finalizeResearch(pipelineDir, "# REQ\n");
    assert.equal(result.ok, true);
    assert.equal(result.targetPhase, "triaging");
  });
});

describe("finalizeResearch — invalid route rejected", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("research"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when route is not a valid research target", () => {
    const result = finalizeResearch(pipelineDir, "# stub", null, [], "architecture");
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.match(result.error, /invalid route/);
  });

  it("does not write REQ.md when route is invalid (early reject)", () => {
    const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
    assert.equal(fs.existsSync(reqPath), false, "no artifacts on invalid-route reject");
  });

  it("state.yaml phase remains 'research' on invalid route", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "research");
  });
});

describe("finalizeResearch — phase guard", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Wrong starting phase — finalizeResearch should reject the transition
    ({ tmpRoot, pipelineDir } = makeProject("sprinting"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'research'", () => {
    const result = finalizeResearch(pipelineDir, "# stub", null, [], "triaging");
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  it("REQ.md is still written even when transition fails (preserves work)", () => {
    const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
    assert.ok(fs.existsSync(reqPath), "REQ.md preserved on transition failure");
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});
