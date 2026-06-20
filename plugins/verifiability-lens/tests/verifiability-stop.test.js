"use strict";

// Unit tests for the verifiability-lens Stop hook guard. Run: node tests/verifiability-stop.test.js
// No framework — plain assert, like essense-autopilot's test style.

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  classifyWorthy,
  decide,
  extractLastAssistant,
  hashText,
  resolveEnabled,
} = require("../hooks/scripts/verifiability-stop.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("  ok  " + name);
}

const claim = { text: "Step 1 done. The function works and tests are passing.", toolNames: [] };
const planMsg = { text: "Here's the plan: first I'll implement the parser, then wire it.", toolNames: [] };
const codeMsg = { text: "Updated the file.", toolNames: ["Edit"] };
const chatMsg = { text: "Sure, what would you like to explore about this topic?", toolNames: [] };

// --- classifyWorthy ---
test("claim text is classify-worthy", () => assert.strictEqual(classifyWorthy(claim), true));
test("plan text is classify-worthy", () => assert.strictEqual(classifyWorthy(planMsg), true));
test("code-tool turn is classify-worthy", () => assert.strictEqual(classifyWorthy(codeMsg), true));
test("plain chat is NOT classify-worthy", () => assert.strictEqual(classifyWorthy(chatMsg), false));
test("null is not classify-worthy", () => assert.strictEqual(classifyWorthy(null), false));

// --- decide: disabled always allows ---
test("disabled -> allow even on a claim", () => {
  const r = decide({ enabled: false, lastAssistant: claim, state: null });
  assert.strictEqual(r.action, "allow");
});

// --- decide: fresh classify-worthy -> block, sets marker + awaiting ---
test("enabled + fresh claim -> block, awaiting=true", () => {
  const r = decide({ enabled: true, lastAssistant: claim, state: null });
  assert.strictEqual(r.action, "block");
  assert.strictEqual(r.newState.awaiting, true);
  assert.strictEqual(r.newState.last_block_hash, hashText(claim.text));
});

// --- decide: trivial chat -> allow ---
test("enabled + chat -> allow", () => {
  const r = decide({ enabled: true, lastAssistant: chatMsg, state: null });
  assert.strictEqual(r.action, "allow");
});

// --- decide: no last assistant -> allow (fail-open) ---
test("enabled + no last assistant -> allow", () => {
  const r = decide({ enabled: true, lastAssistant: null, state: null });
  assert.strictEqual(r.action, "allow");
});

// --- THE LOOP GUARD: block once, then forced release, then hash-skip ---
test("fire-once guard: block -> release -> skip (no second block on same content)", () => {
  // fire 1: fresh -> block
  const f1 = decide({ enabled: true, lastAssistant: claim, state: null });
  assert.strictEqual(f1.action, "block", "fire1 should block");

  // fire 2: awaiting -> forced allow (lens ran during the block)
  const f2 = decide({ enabled: true, lastAssistant: claim, state: f1.newState });
  assert.strictEqual(f2.action, "allow", "fire2 should release");
  assert.strictEqual(f2.newState.awaiting, false, "awaiting cleared");

  // fire 3: same content, awaiting now false, hash matches -> allow (already classified)
  const f3 = decide({ enabled: true, lastAssistant: claim, state: f2.newState });
  assert.strictEqual(f3.action, "allow", "fire3 must NOT re-block the same content");
});

// --- new classify-worthy content after release blocks again ---
test("new content after release -> blocks again", () => {
  const released = { last_block_hash: hashText(claim.text), awaiting: false };
  const r = decide({ enabled: true, lastAssistant: planMsg, state: released });
  assert.strictEqual(r.action, "block");
  assert.strictEqual(r.newState.last_block_hash, hashText(planMsg.text));
});

// --- extractLastAssistant against a synthetic transcript ---
test("extractLastAssistant pulls last assistant text + tools", () => {
  const tmp = path.join(os.tmpdir(), "vl-transcript-" + process.pid + ".jsonl");
  const lines = [
    JSON.stringify({ message: { role: "user", content: "do it" } }),
    JSON.stringify({ message: { role: "assistant", content: [
      { type: "text", text: "working on it" },
      { type: "tool_use", name: "Edit", id: "x1" },
    ] } }),
    JSON.stringify({ message: { role: "user", content: "and now?" } }),
    JSON.stringify({ message: { role: "assistant", content: [
      { type: "text", text: "All done, tests passing." },
    ] } }),
  ];
  fs.writeFileSync(tmp, lines.join("\n"));
  const la = extractLastAssistant(tmp);
  fs.unlinkSync(tmp);
  assert.strictEqual(la.text, "All done, tests passing.");
  assert.deepStrictEqual(la.toolNames, []);
  assert.strictEqual(classifyWorthy(la), true);
});

test("extractLastAssistant returns null for missing file (fail-open)", () => {
  assert.strictEqual(extractLastAssistant("/no/such/transcript.jsonl"), null);
});

// --- resolveEnabled precedence (env > explicit project > global > default-off) ---
test("resolveEnabled: default off when nothing set", () =>
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: null, globalFlag: null }), false));
test("resolveEnabled: env forces on", () =>
  assert.strictEqual(resolveEnabled({ envOn: true, projectFlag: false, globalFlag: false }), true));
test("resolveEnabled: global on enables everywhere", () =>
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: null, globalFlag: true }), true));
test("resolveEnabled: project OFF overrides global ON (repo opt-out)", () =>
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: false, globalFlag: true }), false));
test("resolveEnabled: project ON works with no global", () =>
  assert.strictEqual(resolveEnabled({ envOn: false, projectFlag: true, globalFlag: null }), true));

console.log(`\n${passed} passed`);
