"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const HOOK = path.join(ROOT, "hooks", "scripts", "context-inject.js");

function makeTempPipeline(phase = "idle") {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-purity-"));
  const pipelineDir = path.join(tmpDir, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });
  const state = {
    schema_version: 1,
    last_updated: "2026-01-01T00:00:00.000Z",
    pipeline: { phase, sprint: null, wave: null, task_in_progress: null },
    phases_completed: {},
    sprints: {},
    blocked_on: null,
    next_action: "/elicit",
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
      timestamp: "2026-01-01T00:00:00.000Z",
    }),
    encoding: "utf8",
    env,
  });
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

describe("context-inject purity (NFR-005)", () => {
  test("context-inject does not modify state.yaml", () => {
    const { tmpDir, pipelineDir } = makeTempPipeline("idle");
    const statePath = path.join(pipelineDir, "state.yaml");
    const before = sha256(fs.readFileSync(statePath));
    runHook(tmpDir);
    const after = sha256(fs.readFileSync(statePath));
    assert.strictEqual(before, after, "state.yaml must be byte-identical after context-inject run");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("context-inject stdout is identical on two consecutive runs", () => {
    const { tmpDir } = makeTempPipeline("idle");
    const run1 = runHook(tmpDir);
    const run2 = runHook(tmpDir);
    // Normalize ISO timestamps in case context-inject includes wall-clock time in output
    const normalize = (s) =>
      s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "TIMESTAMP");
    assert.strictEqual(
      normalize(run1.stdout || ""),
      normalize(run2.stdout || ""),
      "stdout must be identical (modulo timestamps) on consecutive runs"
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
