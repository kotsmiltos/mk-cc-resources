"use strict";

/**
 * Tests for verify-runner.finalizeVerify — atomic post-verify hand-off.
 *
 * Background: previously /verify workflow had separate writeReport +
 * updateVerifyState steps. Orchestrator could stop between them, leaving
 * phase=verifying with VERIFICATION-REPORT.md present — autopilot then
 * looped /verify against an existing report (same B2 failure mode).
 * finalizeVerify combines both into a single call, while still respecting
 * NFR-004 (on-demand mode never writes state).
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const verifyRunner = require("../skills/verify/scripts/verify-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-verify-"));
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

describe("finalizeVerify — gate mode atomic write + transition (each route)", () => {
  for (const route of verifyRunner.VALID_VERIFY_ROUTES) {
    describe(`route → ${route}`, () => {
      let tmpRoot, pipelineDir;

      before(() => {
        ({ tmpRoot, pipelineDir } = makeProject("verifying"));
      });

      after(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      });

      it(`returns ok:true and transitions verifying → ${route}`, () => {
        const result = verifyRunner.finalizeVerify(
          pipelineDir, "# Verify Report\n", "gate", route, [], 0,
        );
        assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
        assert.equal(result.transitioned, true);
        assert.equal(result.targetPhase, route);
      });

      it("VERIFICATION-REPORT.md was written", () => {
        const reportPath = path.join(pipelineDir, "VERIFICATION-REPORT.md");
        assert.ok(fs.existsSync(reportPath));
      });

      it(`state.yaml phase is now '${route}'`, () => {
        const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
        assert.equal(state.pipeline.phase, route);
      });

      it(`state-history.yaml records verifying → ${route}`, () => {
        const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
        assert.ok(fs.existsSync(histPath));
        const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
        const last = hist.entries[hist.entries.length - 1];
        assert.equal(last.from_state, "verifying");
        assert.equal(last.to_state, route);
      });
    });
  }
});

describe("finalizeVerify — on-demand mode writes report only", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("verifying"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:true with transitioned:false (NFR-004 — never writes state)", () => {
    const result = verifyRunner.finalizeVerify(pipelineDir, "# Ondemand Report\n", "on-demand");
    assert.equal(result.ok, true);
    assert.equal(result.transitioned, false);
  });

  it("writes the on-demand report to its distinct path", () => {
    const ondemandPath = path.join(pipelineDir, "VERIFICATION-REPORT-ondemand.md");
    assert.ok(fs.existsSync(ondemandPath));
    // Gate report must NOT have been written
    const gatePath = path.join(pipelineDir, "VERIFICATION-REPORT.md");
    assert.equal(fs.existsSync(gatePath), false);
  });

  it("state.yaml phase remains 'verifying' on on-demand finalize", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "verifying");
  });
});

describe("finalizeVerify — invalid mode rejected", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("verifying"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when mode is not 'gate' or 'on-demand'", () => {
    const result = verifyRunner.finalizeVerify(pipelineDir, "# stub", "preview", "complete", [], 0);
    assert.equal(result.ok, false);
    assert.match(result.error, /invalid mode/);
  });
});

describe("finalizeVerify — invalid gate route rejected", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("verifying"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when gate-mode target is not a valid verify route", () => {
    const result = verifyRunner.finalizeVerify(pipelineDir, "# stub", "gate", "research", [], 0);
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.match(result.error, /invalid route/);
  });

  it("does not write VERIFICATION-REPORT.md when gate route is invalid (early reject)", () => {
    const reportPath = path.join(pipelineDir, "VERIFICATION-REPORT.md");
    assert.equal(fs.existsSync(reportPath), false);
  });

  it("state.yaml phase remains 'verifying' on invalid route", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "verifying");
  });
});

describe("finalizeVerify — phase guard (gate mode)", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Wrong starting phase — finalizeVerify gate mode should reject the transition
    ({ tmpRoot, pipelineDir } = makeProject("sprinting"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'verifying'", () => {
    const result = verifyRunner.finalizeVerify(pipelineDir, "# stub", "gate", "complete", [], 0);
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  it("VERIFICATION-REPORT.md is still written even when transition fails (preserves work)", () => {
    const reportPath = path.join(pipelineDir, "VERIFICATION-REPORT.md");
    assert.ok(fs.existsSync(reportPath), "VERIFICATION-REPORT.md preserved on transition failure");
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});
