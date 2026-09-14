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

test('the ladder has four rungs, cheapest first, and names the two that got past the old wording', () => {
  // Measured 2026-09-14: the 2-rung version read straight past node:test and util.parseArgs,
  // because neither is a "package/library". A runtime already running is the cheapest dependency.
  const r = String(REMINDER);
  assert.ok(/DELETED instead/.test(r), 'rung 0: can it be deleted');
  assert.ok(/Already implemented HERE/.test(r), 'rung 1: already here');
  assert.ok(/RUNTIME you already run/.test(r) && r.includes('node:test') && r.includes('util.parseArgs'),
    'rung 2: the runtime, with the two measured misses named');
  assert.ok(/maintained PACKAGE/.test(r), 'rung 3: a maintained package');
  assert.ok(r.indexOf('DELETED') < r.indexOf('Already implemented HERE')
    && r.indexOf('Already implemented HERE') < r.indexOf('RUNTIME you already run')
    && r.indexOf('RUNTIME you already run') < r.indexOf('maintained PACKAGE'), 'ordered cheapest-first');
  assert.ok(/say WHICH rung you rejected/.test(r), 'an unexplained reimplementation is the defect');
  assert.ok(!new RegExp('[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]').test(r), 'no raw control byte — this file has been mangled twice');
});

// ---- summary ----
const total = passed + failed;
process.stdout.write(`\nreuse-gate: ${passed}/${total} passed\n`);
if (failed > 0) process.exit(1);
