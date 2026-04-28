"use strict";

/**
 * Tests for triage-runner.finalizeTriage — atomic post-triage hand-off.
 *
 * Background: previously, /triage workflow had separate "write artifacts"
 * and "transition state" steps. Orchestrator could stop between them,
 * leaving phase=triaging with TRIAGE-REPORT.md present — autopilot then
 * looped /triage against an existing report (same B2 failure mode that
 * affected /review). finalizeTriage combines both into a single call.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const { finalizeTriage, VALID_TRIAGE_ROUTES } = require("../skills/triage/scripts/triage-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-triage-"));
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

  // Mirror transitions.yaml so writeState can resolve it.
  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  return { tmpRoot, pipelineDir };
}

describe("finalizeTriage — atomic write + transition (each route)", () => {
  for (const route of VALID_TRIAGE_ROUTES) {
    describe(`route → ${route}`, () => {
      let tmpRoot, pipelineDir;

      before(() => {
        ({ tmpRoot, pipelineDir } = makeProject("triaging", 4));
      });

      after(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      });

      it(`returns ok:true and transitions triaging → ${route}`, () => {
        const result = finalizeTriage(pipelineDir, "# Triage Report\n", [], [], route);
        assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
        assert.equal(result.transitioned, true);
        assert.equal(result.targetPhase, route);
        assert.ok(result.reportPath.endsWith("TRIAGE-REPORT.md"));
      });

      it(`state.yaml phase is now '${route}'`, () => {
        const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
        assert.equal(state.pipeline.phase, route);
      });

      it(`state-history.yaml records triaging → ${route} with TRIAGE-REPORT artifact`, () => {
        const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
        assert.ok(fs.existsSync(histPath), "state-history.yaml must exist");
        const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
        const last = hist.entries[hist.entries.length - 1];
        assert.equal(last.from_state, "triaging");
        assert.equal(last.to_state, route);
        assert.match(last.triggering_artifact || "", /TRIAGE-REPORT\.md/);
      });
    });
  }
});

describe("finalizeTriage — invalid route rejected", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("triaging", 5));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when route is not a valid triage target", () => {
    const result = finalizeTriage(pipelineDir, "# stub", [], [], "nonexistent-phase");
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.match(result.error, /invalid route/);
  });

  it("does not write TRIAGE-REPORT.md when route is invalid (early reject)", () => {
    const reportPath = path.join(pipelineDir, "triage", "TRIAGE-REPORT.md");
    assert.equal(fs.existsSync(reportPath), false, "no artifacts on invalid-route reject");
  });

  it("state.yaml phase remains 'triaging' on invalid route", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "triaging");
  });
});

describe("finalizeTriage — phase guard", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Wrong starting phase — finalizeTriage should reject the transition
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 6));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'triaging'", () => {
    const result = finalizeTriage(pipelineDir, "# stub", [], [], "verifying");
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  it("TRIAGE-REPORT is still written even when transition fails (preserves work)", () => {
    const reportPath = path.join(pipelineDir, "triage", "TRIAGE-REPORT.md");
    assert.ok(fs.existsSync(reportPath), "TRIAGE-REPORT.md preserved on transition failure");
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});
