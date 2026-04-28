"use strict";

/**
 * Tests for /repair Case 6 — forward-walk healing.
 *
 * Validates that repair-runner detects phase-behind-artifacts via
 * lib/phase-inference and walks forward through legal transitions
 * via state-machine.writeState. Each walk step lands in state-history.yaml
 * with trigger="repair-walk-forward".
 *
 * Cases:
 *  1. Stuck-pipeline scenario (sprint-complete + QA-REPORT + TRIAGE done)
 *     → walk to requirements-ready, 3 history entries
 *  2. Dry-run (no --apply): issue reported, state unchanged
 *  3. Current already matches inferred: no Case 6 issue
 *  4. Ambiguous (no artifacts): no Case 6 issue
 *  5. Walk halt mid-way: writeState rejection captured as partial
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");
const { spawnSync } = require("node:child_process");

const REPAIR_RUNNER = path.join(__dirname, "..", "skills", "context", "scripts", "repair-runner.js");
const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");
const PROJECT_DEFAULTS_CONFIG = path.join(__dirname, "..", "defaults", "config.yaml");
const STATE_FILE = "state.yaml";
const STATE_HISTORY_FILE = "state-history.yaml";

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-repair-walk-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: sprintNumber },
    sprints: {},
    blocked_on: null,
    session: {},
  };
  fs.writeFileSync(path.join(pipelineDir, STATE_FILE), yaml.dump(state), "utf8");

  // Seed defaults/config.yaml + transitions.yaml so state-machine + repair-runner
  // resolve their references relative to the project root.
  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  // Minimal config so repair-runner's existing case logic doesn't crash.
  fs.writeFileSync(
    path.join(pipelineDir, "config.yaml"),
    "schema_version: 1\nautopilot:\n  enabled: false\n",
    "utf8"
  );

  return { tmpRoot, pipelineDir };
}

function seedFile(pipelineDir, relPath, content) {
  const abs = path.join(pipelineDir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content || "stub\n", "utf8");
  return abs;
}

function readState(pipelineDir) {
  return yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
}

function readHistory(pipelineDir) {
  const p = path.join(pipelineDir, STATE_HISTORY_FILE);
  if (!fs.existsSync(p)) return null;
  return yaml.load(fs.readFileSync(p, "utf8"));
}

function runRepair(pipelineDir, args = []) {
  // repair-runner reads pipeline from process.cwd() (via paths.findPipelineDir).
  // cwd should be the project root (parent of .pipeline).
  const projectRoot = path.dirname(pipelineDir);
  const res = spawnSync(process.execPath, [REPAIR_RUNNER, ...args, "--json"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  let parsed = null;
  try { parsed = JSON.parse(res.stdout); } catch (_e) { /* fall through */ }
  return {
    stdout: res.stdout,
    stderr: res.stderr,
    status: res.status,
    json: parsed,
  };
}

describe("Case 6 — stuck-pipeline forward-walk (dry-run)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 3));
    seedFile(pipelineDir, "sprints/sprint-3/completion-report.md", "# build done\n");
    seedFile(pipelineDir, "reviews/sprint-3/QA-REPORT.md", "# qa\n");
    seedFile(pipelineDir, "triage/TRIAGE-REPORT.md", "# triaged\n");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("dry-run reports Case 6 issue without changing state", () => {
    const r = runRepair(pipelineDir);
    assert.equal(r.status, 0);
    assert.ok(r.json, `expected JSON, got: ${r.stdout}`);
    const case6 = r.json.issues.find((i) => i.case === 6);
    assert.ok(case6, `expected Case 6 in issues: ${JSON.stringify(r.json.issues)}`);
    assert.match(case6.description, /Phase 'sprint-complete' is behind/);
    assert.match(case6.description, /requirements-ready/);
    assert.match(case6.action, /Would walk forward/);
    // State unchanged.
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "sprint-complete");
  });
});

describe("Case 6 — stuck-pipeline forward-walk (--apply)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 3));
    seedFile(pipelineDir, "sprints/sprint-3/completion-report.md", "# build done\n");
    seedFile(pipelineDir, "reviews/sprint-3/QA-REPORT.md", "# qa\n");
    seedFile(pipelineDir, "triage/TRIAGE-REPORT.md", "# triaged\n");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("--apply walks forward through 3 transitions", () => {
    const r = runRepair(pipelineDir, ["--apply"]);
    assert.equal(r.status, 0);
    const case6 = r.json.issues.find((i) => i.case === 6);
    assert.ok(case6);
    assert.match(case6.action, /Walking forward through 3 transition\(s\)/);

    // State advanced to requirements-ready.
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "requirements-ready");
  });

  it("state-history records 3 walk-forward audit entries", () => {
    const history = readHistory(pipelineDir);
    assert.ok(history && Array.isArray(history.entries));
    const walkEntries = history.entries.filter(
      (e) => e.trigger === "repair-walk-forward"
    );
    assert.equal(walkEntries.length, 3);
    assert.equal(walkEntries[0].from_state, "sprint-complete");
    assert.equal(walkEntries[0].to_state, "reviewing");
    assert.equal(walkEntries[1].from_state, "reviewing");
    assert.equal(walkEntries[1].to_state, "triaging");
    assert.equal(walkEntries[2].from_state, "triaging");
    assert.equal(walkEntries[2].to_state, "requirements-ready");
  });
});

describe("Case 6 — current === inferred (no Case 6 issue)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("requirements-ready", null));
    seedFile(pipelineDir, "requirements/REQ.md", "# REQ\n");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("does NOT report Case 6 when phase already matches inferred", () => {
    const r = runRepair(pipelineDir);
    assert.equal(r.status, 0);
    const case6 = r.json.issues.find((i) => i.case === 6);
    assert.equal(case6, undefined, "should not report Case 6 when no walk needed");
  });
});

describe("Case 6 — ambiguous artifacts (no Case 6 issue)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    // Empty pipeline — no artifacts to infer from.
    ({ tmpRoot, pipelineDir } = makeProject("idle", null));
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("does NOT report Case 6 when inference is ambiguous", () => {
    const r = runRepair(pipelineDir);
    assert.equal(r.status, 0);
    const case6 = r.json.issues.find((i) => i.case === 6);
    // ambiguous=true → Case 6 skipped.
    assert.equal(case6, undefined);
  });
});

describe("Case 6 — short walk (sprint-complete → reviewing only)", () => {
  let tmpRoot, pipelineDir;
  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("sprint-complete", 1));
    // Only completion-report — no QA-REPORT yet → infer reviewing
    seedFile(pipelineDir, "sprints/sprint-1/completion-report.md", "# build done\n");
  });
  after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it("--apply walks 1 transition to reviewing", () => {
    const r = runRepair(pipelineDir, ["--apply"]);
    assert.equal(r.status, 0);
    const case6 = r.json.issues.find((i) => i.case === 6);
    assert.ok(case6);
    const state = readState(pipelineDir);
    assert.equal(state.pipeline.phase, "reviewing");
    const history = readHistory(pipelineDir);
    const walkEntries = history.entries.filter((e) => e.trigger === "repair-walk-forward");
    assert.equal(walkEntries.length, 1);
  });
});
