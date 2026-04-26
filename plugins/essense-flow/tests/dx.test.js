"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");

function writeStateYaml(pipelineDir, phase, extra = {}) {
  const yaml = require("js-yaml");
  const state = {
    schema_version: 1,
    last_updated: new Date().toISOString(),
    pipeline: { phase, sprint: null, wave: null, task_in_progress: null },
    phases_completed: {},
    sprints: {},
    blocked_on: null,
    next_action: "/elicit",
    decisions_count: 0,
    last_decision_id: null,
    grounded_required: false,
    ...extra,
  };
  fs.writeFileSync(path.join(pipelineDir, "state.yaml"), yaml.dump(state), "utf8");
}

function makeTempPipeline(phase = "idle", extra = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-dx-"));
  const pipelineDir = path.join(tmpDir, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });
  writeStateYaml(pipelineDir, phase, extra);
  return { tmpDir, pipelineDir };
}

describe("DX — developer experience tests", () => {
  // Test 1: E_PHASE_INVALID has all 4 required elements
  // The template uses {command}, {phase}, {expected}, {next_valid} placeholders.
  test("E_PHASE_INVALID format has all 4 required elements", () => {
    const errors = require(path.join(ROOT, "lib", "errors"));
    const msg = errors.formatError("E_PHASE_INVALID", {
      command: "/build",
      phase: "idle",
      expected: "sprinting",
      next_valid: "/elicit",
    });
    assert.ok(msg.includes("idle"), `missing current phase in: ${msg}`);
    assert.ok(msg.includes("sprinting"), `missing required/expected phase in: ${msg}`);
    assert.ok(msg.includes("/build"), `missing command in: ${msg}`);
    assert.ok(msg.includes("/elicit"), `missing next valid command in: ${msg}`);
  });

  // Test 2: Missing .pipeline/ → output contains /init
  test("missing .pipeline produces output containing /init", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-dx-noinit-"));
    const result = spawnSync("node", [path.join(ROOT, "skills", "context", "scripts", "status-runner.js")], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    const output = (result.stdout || "") + (result.stderr || "");
    assert.ok(output.includes("/init"), `output should mention /init. Got: ${output}`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 3: /status --json → valid JSON with phase field
  test("/status --json outputs valid JSON with phase field", () => {
    const { tmpDir } = makeTempPipeline("idle");
    const result = spawnSync("node", [path.join(ROOT, "skills", "context", "scripts", "status-runner.js"), "--json"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    assert.strictEqual(result.status, 0, `exit ${result.status}: ${result.stderr}`);
    const parsed = JSON.parse(result.stdout);
    assert.ok("phase" in parsed, "JSON missing phase field");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 4: /repair dry-run makes no state changes
  test("/repair dry-run does not modify state.yaml", () => {
    const { tmpDir, pipelineDir } = makeTempPipeline("idle");
    const stateBefore = fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8");
    spawnSync("node", [path.join(ROOT, "skills", "context", "scripts", "repair-runner.js")], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    const stateAfter = fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8");
    assert.strictEqual(stateBefore, stateAfter, "state.yaml must not change during dry-run");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 5: /repair --apply idempotency
  // Run --apply twice on a clean pipeline (no issues). Both reports should be
  // structurally identical — no issues found, no state mutations on either run.
  test("/repair --apply is idempotent (identical report on second run)", () => {
    const { tmpDir, pipelineDir } = makeTempPipeline("idle");

    spawnSync("node", [path.join(ROOT, "skills", "context", "scripts", "repair-runner.js"), "--apply"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    const repairDir = path.join(pipelineDir, "repair");
    const report1 = fs.existsSync(path.join(repairDir, "REPAIR-REPORT.md"))
      ? fs.readFileSync(path.join(repairDir, "REPAIR-REPORT.md"), "utf8")
      : "";

    spawnSync("node", [path.join(ROOT, "skills", "context", "scripts", "repair-runner.js"), "--apply"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    const report2 = fs.readFileSync(path.join(repairDir, "REPAIR-REPORT.md"), "utf8");

    // Normalize out timestamp lines so both reports are structurally comparable
    const normalize = (s) => s.split("\n").filter(l => !l.startsWith("timestamp:")).join("\n");
    assert.strictEqual(
      normalize(report1),
      normalize(report2),
      "REPAIR-REPORT.md must be structurally identical on second run"
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 6: review-guard block reason has all 4 FR-034 elements
  test("review-guard block reason contains all 4 FR-034 elements", () => {
    const { tmpDir } = makeTempPipeline("reviewing");
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: path.join(tmpDir, "forbidden", "file.txt") },
      session_id: "test",
      hook_event_name: "PreToolUse",
    });
    const result = spawnSync("node", [path.join(ROOT, "hooks", "scripts", "review-guard.js")], {
      cwd: tmpDir,
      input,
      encoding: "utf8",
    });
    const parsed = JSON.parse(result.stdout.trim());
    assert.strictEqual(parsed.decision, "block");
    // Element 1: specific tool name (Write)
    assert.ok(
      parsed.reason.includes("Write") || parsed.reason.includes("write"),
      `reason must mention specific tool. Got: ${parsed.reason}`
    );
    // Element 2: reviewing phase restriction label
    assert.ok(
      parsed.reason.includes("reviewing phase restriction"),
      `reason must include "reviewing phase restriction". Got: ${parsed.reason}`
    );
    // Element 3: allowed paths listed
    assert.ok(
      parsed.reason.toLowerCase().includes("allowed"),
      `reason must list allowed paths. Got: ${parsed.reason}`
    );
    // Element 4: lift condition
    assert.ok(
      parsed.reason.includes("Restriction lifts when reviewing phase ends"),
      `reason must include lift condition. Got: ${parsed.reason}`
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 7: ESSENSE_DEBUG=1 produces debug trace in stderr
  test("ESSENSE_DEBUG=1 produces debug output in stderr", () => {
    const { tmpDir } = makeTempPipeline("idle");
    const result = spawnSync("node", [path.join(ROOT, "skills", "context", "scripts", "status-runner.js")], {
      cwd: tmpDir,
      encoding: "utf8",
      env: { ...process.env, ESSENSE_DEBUG: "1" },
    });
    const stderr = result.stderr || "";
    assert.ok(
      stderr.length > 0 && (stderr.includes("[DEBUG]") || stderr.includes("debug") || stderr.includes("DEBUG")),
      `stderr should contain debug output when ESSENSE_DEBUG=1. Got: "${stderr}"`
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
