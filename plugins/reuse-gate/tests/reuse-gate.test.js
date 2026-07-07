"use strict";

/**
 * reuse-gate pure-logic tests. No framework — run: node tests/reuse-gate.test.js
 * Mirrors the verifiability-lens test style (counter + denominator + exit code).
 */

const assert = require("assert");
const {
  extractFilePath, isSourceFile, resolveEnabled, decide, cfgFlag, injectionPayload,
  REMINDER,
} = require("../hooks/scripts/reuse-gate.js");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; process.stderr.write(`FAIL: ${name}\n  ${e.message}\n`); }
}

// ---- extractFilePath ----
test("extractFilePath reads file_path", () => {
  assert.strictEqual(extractFilePath({ file_path: "/a/b.ts" }), "/a/b.ts");
});
test("extractFilePath falls back to path", () => {
  assert.strictEqual(extractFilePath({ path: "/a/b.py" }), "/a/b.py");
});
test("extractFilePath null-safe", () => {
  assert.strictEqual(extractFilePath(null), null);
  assert.strictEqual(extractFilePath({}), null);
});

// ---- isSourceFile ----
test("isSourceFile true for code extensions", () => {
  for (const f of ["x.py", "x.ts", "x.tsx", "x.js", "x.cs", "x.go", "x.rs", "x.sh"]) {
    assert.strictEqual(isSourceFile(f), true, f);
  }
});
test("isSourceFile false for docs/config/data", () => {
  for (const f of ["README.md", "plugin.json", "config.yaml", "notes.txt", "data.csv", "x.lock"]) {
    assert.strictEqual(isSourceFile(f), false, f);
  }
});
test("isSourceFile case-insensitive on extension", () => {
  assert.strictEqual(isSourceFile("Main.PY"), true);
});
test("isSourceFile null-safe", () => {
  assert.strictEqual(isSourceFile(null), false);
  assert.strictEqual(isSourceFile(""), false);
});

// ---- cfgFlag ----
test("cfgFlag returns bool or null", () => {
  assert.strictEqual(cfgFlag({ enabled: true }, "enabled"), true);
  assert.strictEqual(cfgFlag({ enabled: false }, "enabled"), false);
  assert.strictEqual(cfgFlag({}, "enabled"), null);
  assert.strictEqual(cfgFlag(null, "enabled"), null);
});

// ---- resolveEnabled (precedence) ----
test("resolveEnabled: env forces on", () => {
  assert.strictEqual(resolveEnabled({ envOn: true, projectFlag: false, globalFlag: false }), true);
});
test("resolveEnabled: project overrides global", () => {
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: false, globalFlag: true }), false);
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: true, globalFlag: false }), true);
});
test("resolveEnabled: global when no project", () => {
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: null, globalFlag: true }), true);
});
test("resolveEnabled: OFF by default", () => {
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: null, globalFlag: null }), false);
});

// ---- decide (dedupe per user prompt) ----
const base = { enabled: true, toolName: "Write", filePath: "src/x.ts", promptId: "P1", state: null };

test("decide: disabled → allow", () => {
  assert.strictEqual(decide({ ...base, enabled: false }).action, "allow");
});
test("decide: non-write tool → allow", () => {
  assert.strictEqual(decide({ ...base, toolName: "Read" }).action, "allow");
});
test("decide: non-source file → allow", () => {
  assert.strictEqual(decide({ ...base, filePath: "README.md" }).action, "allow");
});
test("decide: missing prompt id → allow (fail-open)", () => {
  assert.strictEqual(decide({ ...base, promptId: null }).action, "allow");
});
test("decide: first source write of a prompt → remind + records prompt", () => {
  const r = decide(base);
  assert.strictEqual(r.action, "remind");
  assert.strictEqual(r.newState.last_prompt, "P1");
});
test("decide: same prompt already reminded → allow", () => {
  const r = decide({ ...base, state: { last_prompt: "P1" } });
  assert.strictEqual(r.action, "allow");
});
test("decide: a NEW prompt reminds again (once per message)", () => {
  const r = decide({ ...base, promptId: "P2", state: { last_prompt: "P1" } });
  assert.strictEqual(r.action, "remind");
  assert.strictEqual(r.newState.last_prompt, "P2");
});
test("decide: Edit tool also reminds", () => {
  assert.strictEqual(decide({ ...base, toolName: "Edit" }).action, "remind");
});

// ---- injectionPayload (the PreToolUse output shape) ----
test("injectionPayload has correct PreToolUse additionalContext shape", () => {
  const p = injectionPayload(REMINDER);
  assert.strictEqual(p.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.strictEqual(p.hookSpecificOutput.additionalContext, REMINDER);
  assert.strictEqual(p.hookSpecificOutput.permissionDecision, undefined); // no permission side effect
});

// ---- summary ----
const total = passed + failed;
process.stdout.write(`\nreuse-gate: ${passed}/${total} passed\n`);
if (failed > 0) process.exit(1);
