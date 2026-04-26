"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const HOOK = path.join(ROOT, "hooks", "scripts", "context-inject.js");

function makeTempPipeline(phase, nextAction) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-aa-"));
  const pipelineDir = path.join(tmpDir, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });
  const state = {
    schema_version: 1,
    last_updated: new Date().toISOString(),
    pipeline: { phase, sprint: null, wave: null, task_in_progress: null },
    phases_completed: {},
    sprints: {},
    blocked_on: null,
    next_action: nextAction,
    decisions_count: 0,
    last_decision_id: null,
    grounded_required: false,
  };
  fs.writeFileSync(path.join(pipelineDir, "state.yaml"), yaml.dump(state), "utf8");
  return { tmpDir, pipelineDir };
}

function runHook(cwd) {
  const env = { ...process.env };
  delete env.CLAUDE_SUBAGENT;
  delete env.CLAUDE_SESSION_TYPE; // also suppress the subagent guard
  return spawnSync("node", [HOOK], {
    cwd,
    input: JSON.stringify({
      session_id: "test",
      prompt: "",
      hook_event_name: "UserPromptSubmit",
      timestamp: new Date().toISOString(),
    }),
    encoding: "utf8",
    env,
  });
}

describe("auto-advance labeled block", () => {
  test("sprint-complete phase emits [auto-advance: /review] as distinct line", () => {
    const { tmpDir } = makeTempPipeline("sprint-complete", "/review");
    const result = runHook(tmpDir);
    const lines = (result.stdout || "").split("\n").map(l => l.trim()).filter(Boolean);
    assert.ok(
      lines.includes("[auto-advance: /review]"),
      `stdout should contain '[auto-advance: /review]' as distinct line.\nstdout:\n${result.stdout}`
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("idle phase does NOT emit auto-advance", () => {
    const { tmpDir } = makeTempPipeline("idle", "/elicit");
    const result = runHook(tmpDir);
    assert.ok(
      !(result.stdout || "").includes("[auto-advance:"),
      `stdout should NOT contain '[auto-advance:'.\nstdout:\n${result.stdout}`
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("sprinting phase with /build next_action emits [auto-advance: /build]", () => {
    const { tmpDir } = makeTempPipeline("sprinting", "/build");
    const result = runHook(tmpDir);
    const lines = (result.stdout || "").split("\n").map(l => l.trim()).filter(Boolean);
    assert.ok(
      lines.includes("[auto-advance: /build]"),
      `stdout should contain '[auto-advance: /build]' as distinct line.\nstdout:\n${result.stdout}`
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
