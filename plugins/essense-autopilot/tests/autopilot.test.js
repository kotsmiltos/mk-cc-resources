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

function runHook(cwd, transcriptPath) {
  const res = spawnSync(process.execPath, [HOOK], {
    cwd,
    input: JSON.stringify({ transcript_path: transcriptPath || "/nonexistent" }),
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

// Synthetic JSONL fixture writer for transcript-scan tests. Mirrors the
// schema empirically observed in real Claude Code transcripts: each line is
// a JSON object with `timestamp` + `message.content` array. Items in
// content can be `{type:"tool_use", name:"Agent", id:"..."}` or
// `{type:"tool_result", tool_use_id:"..."}`.
function makeTranscript(entries) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ap-tx-"));
  const p = path.join(root, "transcript.jsonl");
  const lines = entries.map((e) => JSON.stringify(e)).join("\n");
  fs.writeFileSync(p, lines + "\n");
  return p;
}

function agentUse(id, ageMinutes, name) {
  const ts = new Date(Date.now() - ageMinutes * 60_000).toISOString();
  return {
    timestamp: ts,
    message: { content: [{ type: "tool_use", name: name || "Agent", id }] },
  };
}

function agentResult(toolUseId, ageMinutes) {
  const ts = new Date(Date.now() - ageMinutes * 60_000).toISOString();
  return {
    timestamp: ts,
    message: { content: [{ type: "tool_result", tool_use_id: toolUseId }] },
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

test("flow: reviewing maps to /triage when QA-REPORT.md exists (post-review hand-off)", () => {
  // Simulate the common case: /review wrote QA-REPORT then orchestrator stopped
  // before firing the reviewing → triaging transition. Autopilot must NOT loop
  // /review (QA already done); it must advance to /triage.
  const root = makeProject(
    "pipeline:\n  phase: reviewing\n  sprint: 2\n",
    ENABLED
  );
  // Seed the QA-REPORT so the readiness gate sees it
  const fsMod = require("node:fs");
  const pathMod = require("node:path");
  const qaDir = pathMod.join(root, ".pipeline", "reviews", "sprint-2");
  fsMod.mkdirSync(qaDir, { recursive: true });
  fsMod.writeFileSync(pathMod.join(qaDir, "QA-REPORT.md"), "# QA stub\n");

  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision, `expected JSON decision; stderr: ${r.stderr}`);
  assert.match(r.decision.reason, /\/triage/);
  assert.doesNotMatch(r.decision.reason, /\/review/);
});

test("gate: reviewing without QA-REPORT halts with /review hint (review still mid-flight)", () => {
  // Defense: if reviewing persists but QA-REPORT was never written, /triage
  // would fail — the gate halts and routes user to /review.
  const root = makeProject(
    "pipeline:\n  phase: reviewing\n  sprint: 2\n",
    ENABLED
  );
  // Intentionally do not create QA-REPORT.md
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /QA-REPORT\.md missing/);
  assert.match(r.stderr, /run \/review first/);
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

// ── Stuck-state threshold (M4 — separate from max_iterations) ─────────────
//
// The user-reported failure pattern: phase=sprint-complete persisted across
// 10+ /review firings because /review's orchestrator detected QA-REPORT
// already on disk and refused to overwrite. Without stuck-detect, autopilot
// kept firing until max_iterations=30. With stuck-detect (default 5),
// autopilot halts on the 5th firing with a /heal-suggesting diagnostic.

test("stuck: same phase persisted 5 iterations halts before max_iterations", () => {
  // Iters=4 already, this hook firing makes iters=5 → halt
  const root = makeProject(
    "pipeline:\n  phase: triaging\n" +
    "session:\n  autopilot_iterations: 4\n  autopilot_last_phase: triaging\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "", "should halt (allowStop), not block");
  assert.match(r.stderr, /persisted across 5 auto-advances/);
  assert.match(r.stderr, /\/heal/);
});

test("stuck: iteration 4 still advances (below threshold)", () => {
  // Iters=3 already, this hook firing makes iters=4 → still below threshold=5
  const root = makeProject(
    "pipeline:\n  phase: triaging\n" +
    "session:\n  autopilot_iterations: 3\n  autopilot_last_phase: triaging\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision, "iteration 4 should still block (advance), not halt");
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /iteration 4\/30/);
});

test("stuck: custom stuck_phase_threshold overrides default", () => {
  const customConfig =
    "autopilot:\n" +
    "  enabled: true\n" +
    "  stuck_phase_threshold: 2\n";
  // Iters=1, this firing makes iters=2 → halts at custom threshold
  const root = makeProject(
    "pipeline:\n  phase: triaging\n" +
    "session:\n  autopilot_iterations: 1\n  autopilot_last_phase: triaging\n",
    customConfig
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /stuck_phase_threshold 2/);
});

test("stuck: phase change resets stuck counter (so post-heal advance works)", () => {
  // Phase changed from sprint-complete to requirements-ready (e.g. via /heal).
  // Counter should reset, autopilot should advance.
  const root = makeProject(
    "pipeline:\n  phase: requirements-ready\n" +
    "session:\n  autopilot_iterations: 5\n  autopilot_last_phase: sprint-complete\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision, "phase changed → reset to iteration 1, advance");
  assert.match(r.decision.reason, /iteration 1\/30/);
  assert.match(r.decision.reason, /\/architect/);
});

// ── Forward-detect for sprint-complete (M4b — cheap fast-fail) ────────────
//
// When QA-REPORT.md already exists for the current sprint AND phase is still
// sprint-complete, the phase is stale (review already happened). Don't wait
// for stuck_phase_threshold — halt on iteration 1 with /heal hint.

test("forward-detect: sprint-complete with QA-REPORT.md halts on iteration 1", () => {
  const root = makeProject(
    "pipeline:\n  phase: sprint-complete\n  sprint: 3\n",
    ENABLED
  );
  // Seed QA-REPORT.md on disk — indicates review already completed
  const fsMod = require("node:fs");
  const pathMod = require("node:path");
  const qaDir = pathMod.join(root, ".pipeline", "reviews", "sprint-3");
  fsMod.mkdirSync(qaDir, { recursive: true });
  fsMod.writeFileSync(pathMod.join(qaDir, "QA-REPORT.md"), "# QA stub\n");

  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "", "should halt immediately, not block");
  assert.match(r.stderr, /already exists/);
  assert.match(r.stderr, /review already complete for sprint 3/);
  assert.match(r.stderr, /\/heal/);
});

test("forward-detect: sprint-complete WITHOUT QA-REPORT advances normally to /review", () => {
  // Genuine "review needs to run" case — no QA-REPORT yet.
  const root = makeProject(
    "pipeline:\n  phase: sprint-complete\n  sprint: 3\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /\/review/);
});

test("forward-detect: sprint-complete without sprint number falls through", () => {
  // Defensive: state.pipeline.sprint is null, can't form QA path → skip the
  // forward-detect, advance normally to /review (which will figure it out).
  const root = makeProject(
    "pipeline:\n  phase: sprint-complete\n",
    ENABLED
  );
  const r = runHook(root);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.match(r.decision.reason, /\/review/);
});

// ── countInFlightAgents — direct unit tests via module require ───────────

const { countInFlightAgents } = require("../hooks/scripts/autopilot.js");

test("countInFlightAgents: empty / missing transcript returns count=0", () => {
  assert.deepEqual(
    countInFlightAgents(null, {}),
    { count: 0, oldest_age_minutes: null, stale_count: 0 }
  );
  assert.deepEqual(
    countInFlightAgents("/path/does/not/exist", {}),
    { count: 0, oldest_age_minutes: null, stale_count: 0 }
  );
});

test("countInFlightAgents: all Agent calls paired returns count=0", () => {
  const tx = makeTranscript([
    agentUse("toolu_a", 10),
    agentUse("toolu_b", 8),
    agentUse("toolu_c", 5),
    agentResult("toolu_a", 9),
    agentResult("toolu_b", 7),
    agentResult("toolu_c", 4),
  ]);
  const r = countInFlightAgents(tx, { staleMinutes: 60 });
  assert.equal(r.count, 0);
  assert.equal(r.oldest_age_minutes, null);
  assert.equal(r.stale_count, 0);
});

test("countInFlightAgents: one fresh unpaired Agent → count=1", () => {
  const tx = makeTranscript([
    agentUse("toolu_a", 10),
    agentResult("toolu_a", 9),
    agentUse("toolu_b", 5),  // unpaired, fresh
  ]);
  const r = countInFlightAgents(tx, { staleMinutes: 60 });
  assert.equal(r.count, 1);
  assert.ok(r.oldest_age_minutes >= 4.9 && r.oldest_age_minutes <= 5.1, `expected ~5m, got ${r.oldest_age_minutes}`);
  assert.equal(r.stale_count, 0);
});

test("countInFlightAgents: stale unpaired Agent → counted as stale, not in flight", () => {
  const tx = makeTranscript([
    agentUse("toolu_a", 90),  // unpaired, 90 min old
  ]);
  const r = countInFlightAgents(tx, { staleMinutes: 60 });
  assert.equal(r.count, 0);
  assert.equal(r.oldest_age_minutes, null);
  assert.equal(r.stale_count, 1);
});

test("countInFlightAgents: 4 unpaired with varied ages → oldest reported", () => {
  const tx = makeTranscript([
    agentUse("toolu_a", 12),
    agentUse("toolu_b", 8),
    agentUse("toolu_c", 15),  // oldest of the unpaired
    agentUse("toolu_d", 3),
  ]);
  const r = countInFlightAgents(tx, { staleMinutes: 60 });
  assert.equal(r.count, 4);
  assert.ok(r.oldest_age_minutes >= 14.9 && r.oldest_age_minutes <= 15.1, `expected ~15m, got ${r.oldest_age_minutes}`);
  assert.equal(r.stale_count, 0);
});

test("countInFlightAgents: malformed JSONL line skipped, scan continues", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ap-tx-bad-"));
  const p = path.join(root, "transcript.jsonl");
  const lines = [
    JSON.stringify(agentUse("toolu_a", 5)),
    "{not valid json}",
    JSON.stringify(agentResult("toolu_a", 4)),
    JSON.stringify(agentUse("toolu_b", 3)),  // unpaired
  ];
  fs.writeFileSync(p, lines.join("\n") + "\n");
  const r = countInFlightAgents(p, { staleMinutes: 60 });
  assert.equal(r.count, 1);
  assert.equal(r.stale_count, 0);
});

test("countInFlightAgents: ignores non-Agent tool_use entries", () => {
  // Bash, Read, Write etc. should not register — only Agent spans turns.
  const tx = makeTranscript([
    agentUse("toolu_bash", 5, "Bash"),
    agentUse("toolu_read", 4, "Read"),
    agentUse("toolu_agent", 3, "Agent"),  // only this one counts
  ]);
  const r = countInFlightAgents(tx, { staleMinutes: 60 });
  assert.equal(r.count, 1);
});

test("countInFlightAgents: mix of fresh + stale + paired", () => {
  const tx = makeTranscript([
    agentUse("toolu_a", 90),  // stale unpaired
    agentUse("toolu_b", 10),  // paired
    agentResult("toolu_b", 9),
    agentUse("toolu_c", 5),   // fresh unpaired
    agentUse("toolu_d", 2),   // fresh unpaired
  ]);
  const r = countInFlightAgents(tx, { staleMinutes: 60 });
  assert.equal(r.count, 2);
  assert.equal(r.stale_count, 1);
  assert.ok(r.oldest_age_minutes >= 4.9 && r.oldest_age_minutes <= 5.1);
});

test("countInFlightAgents: default staleMinutes is 60 when opts omitted", () => {
  const tx = makeTranscript([
    agentUse("toolu_a", 65),  // 65m > default 60m → stale
    agentUse("toolu_b", 30),  // 30m < default 60m → in flight
  ]);
  const r = countInFlightAgents(tx);
  assert.equal(r.count, 1);
  assert.equal(r.stale_count, 1);
});

// ── Hook integration: agents-pending halt branch ─────────────────────────

test("agents-pending halt: fresh in-flight Agent halts without incrementing iter", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\n",
    ENABLED
  );
  const tx = makeTranscript([
    agentUse("toolu_a", 5),  // fresh unpaired
  ]);
  const r = runHook(root, tx);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /background agent\(s\) in flight/);
  assert.match(r.stderr, /Iteration counter not incremented/);

  // Verify state.session.autopilot_iterations was NOT written
  const stateAfter = fs.readFileSync(path.join(root, ".pipeline", "state.yaml"), "utf8");
  assert.doesNotMatch(stateAfter, /autopilot_iterations/);
});

test("agents-pending halt: stale Agent triggers warning but proceeds", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\n",
    ENABLED
  );
  const tx = makeTranscript([
    agentUse("toolu_a", 90),  // stale unpaired (default 60m threshold)
  ]);
  const r = runHook(root, tx);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /stale unpaired Agent tool_use/);
  // Hook proceeded (decision should be block for /architect)
  assert.ok(r.decision, `expected decision JSON, got stdout=${r.stdout} stderr=${r.stderr}`);
  assert.equal(r.decision.decision, "block");
});

test("agents-pending halt: all paired → autopilot proceeds normally", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\n",
    ENABLED
  );
  const tx = makeTranscript([
    agentUse("toolu_a", 5),
    agentResult("toolu_a", 4),
  ]);
  const r = runHook(root, tx);
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.equal(r.decision.decision, "block");
  assert.match(r.decision.reason, /\/architect/);
});

test("agents-pending halt: custom stale threshold via config", () => {
  const cfg = "autopilot:\n  enabled: true\n  agents_pending_stale_minutes: 10\n";
  const root = makeProject(
    "pipeline:\n  phase: architecture\n",
    cfg
  );
  const tx = makeTranscript([
    agentUse("toolu_a", 15),  // 15m > custom 10m → stale, not in flight
  ]);
  const r = runHook(root, tx);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /stale unpaired Agent/);
  assert.ok(r.decision);
});

test("agents-pending halt: nonexistent transcript_path falls through (no false halt)", () => {
  const root = makeProject(
    "pipeline:\n  phase: architecture\n",
    ENABLED
  );
  const r = runHook(root);  // default transcript_path = /nonexistent
  assert.equal(r.status, 0);
  assert.ok(r.decision);
  assert.equal(r.decision.decision, "block");
});
