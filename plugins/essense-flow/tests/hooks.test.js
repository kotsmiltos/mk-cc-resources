"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { createTmpPipeline } = require("./fixtures/pipeline-factory");

const ROOT = path.resolve(__dirname, "..");
const HOOKS_DIR = path.join(ROOT, "hooks", "scripts");
const HOOKS_JSON = path.join(ROOT, "hooks", "hooks.json");

test("FR-001: hooks.json has all 4 hooks with correct event bindings", () => {
  const hooks = JSON.parse(fs.readFileSync(HOOKS_JSON, "utf8"));
  const h = hooks.hooks;
  assert.ok(h.SessionStart, "SessionStart key must exist");
  assert.ok(h.UserPromptSubmit, "UserPromptSubmit key must exist");
  assert.ok(h.PreToolUse, "PreToolUse key must exist");
  assert.ok(h.PostToolUse, "PostToolUse key must exist");
  assert.ok(!h.Notification, "Notification key must be absent");
  // verify review-guard is on PreToolUse
  const preToolHooks = h.PreToolUse.flatMap(e => e.hooks);
  assert.ok(preToolHooks.some(h => h.command.includes("review-guard")), "review-guard must be on PreToolUse");
});

test("FR-002: session-orient exits 0 with valid pipeline state", () => {
  const { dir, cleanup } = createTmpPipeline({ phase: "sprinting" });
  try {
    const result = spawnSync("node", [path.join(HOOKS_DIR, "session-orient.js")], {
      cwd: dir,
      timeout: 5100,
      encoding: "utf8"
    });
    assert.strictEqual(result.status, 0, "exit code must be 0");
  } finally {
    cleanup();
  }
});

test("FR-003: session-orient exits within 5100ms", () => {
  const { dir, cleanup } = createTmpPipeline();
  try {
    const start = Date.now();
    const result = spawnSync("node", [path.join(HOOKS_DIR, "session-orient.js")], {
      cwd: dir,
      timeout: 5100,
      encoding: "utf8"
    });
    const elapsed = Date.now() - start;
    assert.ok(result.status !== null, "process must not time out");
    assert.ok(elapsed < 5200, `elapsed ${elapsed}ms exceeds 5200ms`);
  } finally {
    cleanup();
  }
});

test("FR-004: missing state.yaml emits [HOOK WARNING to stdout", () => {
  const { dir, pipelineDir, cleanup } = createTmpPipeline();
  try {
    // remove state.yaml after creation
    fs.unlinkSync(path.join(pipelineDir, "state.yaml"));
    const result = spawnSync("node", [path.join(HOOKS_DIR, "session-orient.js")], {
      cwd: dir,
      timeout: 5100,
      encoding: "utf8"
    });
    assert.strictEqual(result.status, 0, "must still exit 0");
    assert.ok(result.stdout.includes("[HOOK WARNING"), "stdout must contain [HOOK WARNING");
  } finally {
    cleanup();
  }
});

test("FR-005: CLAUDE_SESSION_TYPE=subagent → empty stdout", { skip: process.env.SKIP_SUBAGENT_TEST === "1" }, () => {
  const { dir, cleanup } = createTmpPipeline();
  try {
    const result = spawnSync("node", [path.join(HOOKS_DIR, "session-orient.js")], {
      cwd: dir,
      timeout: 5100,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_SESSION_TYPE: "subagent" }
    });
    assert.strictEqual(result.status, 0, "must exit 0");
    assert.strictEqual(result.stdout.trim(), "", "stdout must be empty");
  } finally {
    cleanup();
  }
});

test("FR-008: review-guard blocks path traversal during reviewing phase", () => {
  const { dir, cleanup } = createTmpPipeline({ phase: "reviewing" });
  try {
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: ".pipeline/reviews/sprint-01/../../forbidden.txt" }
    });
    const result = spawnSync("node", [path.join(HOOKS_DIR, "review-guard.js")], {
      cwd: dir,
      input,
      timeout: 5100,
      encoding: "utf8"
    });
    assert.strictEqual(result.status, 0);
    const out = JSON.parse(result.stdout.trim());
    assert.strictEqual(out.decision, "block");
  } finally {
    cleanup();
  }
});

test("FR-008: review-guard allows valid path during reviewing phase", () => {
  const { dir, cleanup } = createTmpPipeline({ phase: "reviewing" });
  try {
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: ".pipeline/reviews/sprint-01/valid.md" }
    });
    const result = spawnSync("node", [path.join(HOOKS_DIR, "review-guard.js")], {
      cwd: dir,
      input,
      timeout: 5100,
      encoding: "utf8"
    });
    assert.strictEqual(result.status, 0);
    // stdout should be empty or {"decision":"allow"}
    const raw = result.stdout.trim();
    if (raw) {
      const out = JSON.parse(raw);
      assert.strictEqual(out.decision, "allow");
    }
    // empty stdout also = allow
  } finally {
    cleanup();
  }
});

test("FR-054: review-guard allows write to confirmed-findings.yaml during reviewing phase", () => {
  const { dir, pipelineDir, cleanup } = createTmpPipeline({ phase: "reviewing" });
  try {
    // Create the reviews/sprint-01 dir so realpathSync succeeds
    const sprintDir = path.join(pipelineDir, "reviews", "sprint-01");
    fs.mkdirSync(sprintDir, { recursive: true });
    const targetPath = path.join(sprintDir, "confirmed-findings.yaml");
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: targetPath }
    });
    const result = spawnSync("node", [path.join(HOOKS_DIR, "review-guard.js")], {
      cwd: dir,
      input,
      timeout: 5100,
      encoding: "utf8"
    });
    assert.strictEqual(result.status, 0);
    const raw = result.stdout.trim();
    if (raw) {
      const out = JSON.parse(raw);
      assert.strictEqual(out.decision, "allow", "confirmed-findings.yaml write must be allowed");
    }
    // empty stdout also = allow (hook exited without emitting block)
  } finally {
    cleanup();
  }
});

test("FR-BG-001: bash-guard rejects whitespace-only and empty commands", () => {
  const { isSafeCommand } = require("../lib/bash-guard");
  assert.strictEqual(isSafeCommand("   "), false, "whitespace-only rejected");
  assert.strictEqual(isSafeCommand(""), false, "empty string rejected");
  assert.strictEqual(isSafeCommand("\t\t"), false, "tab-only rejected");
});

test("FR-009: yaml-validate skips non-YAML files without error", () => {
  const { dir, cleanup } = createTmpPipeline();
  try {
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: path.join(dir, ".pipeline", "QA-REPORT.md") }
    });
    const result = spawnSync("node", [path.join(HOOKS_DIR, "yaml-validate.js")], {
      cwd: dir,
      input,
      timeout: 5100,
      encoding: "utf8"
    });
    assert.strictEqual(result.status, 0, "must exit 0 for .md file");
    assert.strictEqual(result.stderr, "", "must have no stderr output");
  } finally {
    cleanup();
  }
});
