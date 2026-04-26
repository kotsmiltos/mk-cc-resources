"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HOOK = path.resolve(__dirname, "..", "hooks", "scripts", "autopilot.js");

function makeProject(stateYaml, configYaml) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ap-test-"));
  const pipelineDir = path.join(root, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });
  if (configYaml !== null) {
    fs.writeFileSync(path.join(pipelineDir, "config.yaml"), configYaml);
  }
  if (stateYaml !== null) {
    fs.writeFileSync(path.join(pipelineDir, "state.yaml"), stateYaml);
  }
  return root;
}

function runHook(cwd) {
  const res = spawnSync(process.execPath, [HOOK], {
    cwd,
    input: JSON.stringify({ transcript_path: "/nonexistent" }),
    encoding: "utf8",
  });
  return {
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    status: res.status,
    decision: (() => {
      try { return JSON.parse(res.stdout); } catch { return null; }
    })(),
  };
}

const ENABLED = "autopilot:\n  enabled: true\n";
const DISABLED = "autopilot:\n  enabled: false\n";

// ── Halt paths: each must emit stderr diagnostic + exit 0 ──────────────────

test("halt: no .pipeline directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ap-no-pipe-"));
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /no \.pipeline\/ directory/);
});

test("halt: autopilot disabled", () => {
  const root = makeProject("pipeline:\n  phase: architecture\n", DISABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /autopilot disabled/);
});

test("halt: state.yaml missing", () => {
  const root = makeProject(null, ENABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /state\.yaml missing/);
});

test("halt: pipeline blocked_on set", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\nblocked_on: \"awaiting decision\"\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /pipeline blocked: awaiting decision/);
});

test("halt: terminal phase", () => {
  const root = makeProject("pipeline:\n  phase: complete\n", ENABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /phase 'complete' is terminal/);
});

test("halt: human gate phase", () => {
  const root = makeProject("pipeline:\n  phase: eliciting\n", ENABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /phase 'eliciting' is a human gate/);
});

test("halt: unknown phase has no flow mapping", () => {
  // Direct repro of issue B (state corrupted to 'triaged')
  const root = makeProject("pipeline:\n  phase: triaged\n", ENABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /phase 'triaged' has no flow mapping/);
  assert.match(r.stderr, /mapped phases:/);
});

// ── Flow map semantics (fix #1) ────────────────────────────────────────────

test("flow: architecture maps to /architect (not /build)", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\n  sprint: 1\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision, "expected JSON decision on stdout");
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /\/architect/);
  assert.doesNotMatch(r.decision.reason, /\/build/);
});

test("flow: triaging maps to /triage (was silent halt)", () => {
  const root = makeProject("pipeline:\n  phase: triaging\n", ENABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /\/triage/);
});

test("flow: decomposing maps to /architect (was silent halt)", () => {
  const root = makeProject(
    "pipeline:\n  phase: decomposing\n  sprint: 1\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /\/architect/);
});

test("flow: sprinting with tasks maps to /build", () => {
  const root = makeProject(
    "pipeline:\n  phase: sprinting\n  sprint: 1\nsprints:\n  sprint-1:\n    tasks: [TASK-001]\n    tasks_total: 1\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /\/build/);
});

test("flow: requirements-ready maps to /architect", () => {
  const root = makeProject(
    "pipeline:\n  phase: requirements-ready\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.match(r.decision.reason, /\/architect/);
});

test("flow: sprint-complete maps to /review", () => {
  const root = makeProject("pipeline:\n  phase: sprint-complete\n", ENABLED);
  const r = runHook(root);
  assert.match(r.decision.reason, /\/review/);
});

test("flow: reviewing maps to /review (resume; review-skill auto-advances to triaging on done)", () => {
  const root = makeProject("pipeline:\n  phase: reviewing\n", ENABLED);
  const r = runHook(root);
  assert.match(r.decision.reason, /\/review/);
  assert.doesNotMatch(r.decision.reason, /\/triage/);
});

// ── Tasks-empty gate (fix #6) ──────────────────────────────────────────────

test("gate: sprinting with empty tasks halts with diagnostic", () => {
  const root = makeProject(
    "pipeline:\n  phase: sprinting\n  sprint: 1\nsprints:\n  sprint-1:\n    tasks: []\n    tasks_total: 0\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /sprint-1 has no tasks decomposed/);
  assert.match(r.stderr, /run \/architect first/);
});

test("gate: sprinting with no sprint entry at all halts", () => {
  // Defensive: state has phase=sprinting but sprints map is missing entry.
  const root = makeProject(
    "pipeline:\n  phase: sprinting\n  sprint: 5\nsprints: {}\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /sprint-5 has no tasks decomposed/);
});

test("gate: architecture with empty tasks does NOT trip gate (advanceCmd=/architect)", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\n  sprint: 1\nsprints:\n  sprint-1:\n    tasks: []\n    tasks_total: 0\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.match(r.decision.reason, /\/architect/);
});

test("gate: sprinting without pipeline.sprint set is permissive", () => {
  // If sprint is null, can't determine readiness — fall through to /build.
  const root = makeProject("pipeline:\n  phase: sprinting\n", ENABLED);
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.match(r.decision.reason, /\/build/);
});

// ── Iteration counter ──────────────────────────────────────────────────────

test("counter: iteration cap halts with diagnostic", () => {
  const root = makeProject(
    "pipeline:\n  phase: sprinting\n  sprint: 1\n" +
    "sprints:\n  sprint-1:\n    tasks: [t]\n    tasks_total: 1\n" +
    "session:\n  autopilot_iterations: 30\n  autopilot_last_phase: sprinting\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /iteration cap \(30\)/);
});

test("counter: phase change resets iteration counter", () => {
  const root = makeProject(
    "pipeline:\n  phase: triaging\n" +
    "session:\n  autopilot_iterations: 30\n  autopilot_last_phase: sprinting\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision, "should not halt — phase changed, counter resets");
  assert.match(r.decision.reason, /iteration 1\/30/);
});
