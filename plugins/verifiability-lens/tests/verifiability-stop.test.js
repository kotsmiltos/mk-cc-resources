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
  extractTurn,
  hashText,
  resolveEnabled,
  resolveFlag,
  isLensSurfacing,
  isQuestionOnly,
} = require("../hooks/scripts/verifiability-stop.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("  ok  " + name);
}

const codeMsg = { text: "Updated the module.", toolNames: ["Edit"] };           // artifact → worthy by default
const codeMsg2 = { text: "Wrote the new file.", toolNames: ["Write"] };
const strongClaim = { text: "Shipped 0.2.1 and pushed; tests pass.", toolNames: [] }; // worthy only with checkProse
const casualClaim = { text: "Step 1 done, that looks ready and works for me.", toolNames: [] }; // casual prose → NOT worthy
const questionMsg = { text: "Ever priced something you built and shown a stranger? yes or no", toolNames: [] };
const lensSurface = { text: "Lens clean — only flag: the rollup shows 1 escalation, 3 suppressed.", toolNames: [] };
const chatMsg = { text: "Sure, what would you like to explore about this topic?", toolNames: [] };

// --- classifyWorthy: DEFAULT fires on any WORK tool (produce/investigate/research) ---
test("code-tool turn is worthy by default", () => assert.strictEqual(classifyWorthy(codeMsg), true));
test("file-read turn is worthy", () => assert.strictEqual(classifyWorthy({ text: "Looked at the files.", toolNames: ["Read"] }), true));
test("grep/glob turn is worthy", () => assert.strictEqual(classifyWorthy({ text: "Searched the tree.", toolNames: ["Grep"] }), true));
test("web-search turn is worthy", () => assert.strictEqual(classifyWorthy({ text: "Checked sources.", toolNames: ["WebSearch"] }), true));
test("web-fetch turn is worthy", () => assert.strictEqual(classifyWorthy({ text: "Pulled the page.", toolNames: ["WebFetch"] }), true));
test("spawned-subagent turn is worthy", () => assert.strictEqual(classifyWorthy({ text: "Ran a research scout.", toolNames: ["Agent"] }), true));
test("MCP research tool turn is worthy", () => assert.strictEqual(classifyWorthy({ text: "Fetched docs.", toolNames: ["mcp__context7__query-docs"] }), true));
test("casual prose claim is NOT worthy by default", () => assert.strictEqual(classifyWorthy(casualClaim), false));
test("strong prose claim is NOT worthy without checkProse", () => assert.strictEqual(classifyWorthy(strongClaim), false));
test("plain chat is NOT worthy", () => assert.strictEqual(classifyWorthy(chatMsg), false));
test("null is not worthy", () => assert.strictEqual(classifyWorthy(null), false));

// --- classifyWorthy: opt-in prose checking ---
test("strong prose claim IS worthy with checkProse", () => assert.strictEqual(classifyWorthy(strongClaim, { checkProse: true }), true));
test("casual prose stays NOT worthy even with checkProse", () => assert.strictEqual(classifyWorthy(casualClaim, { checkProse: true }), false));

// --- HARD SKIPS (regardless of mode) ---
test("question turn is NEVER worthy", () => assert.strictEqual(classifyWorthy(questionMsg, { checkProse: true }), false));
test("lens-surfacing turn is NEVER worthy (meta-loop guard)", () => assert.strictEqual(classifyWorthy(lensSurface, { checkProse: true }), false));
test("a turn that DID work then asked a question still fires (work counts)", () =>
  assert.strictEqual(classifyWorthy({ text: "Read the files — does this look right?", toolNames: ["Read"] }), true));
test("lens-dispatch turn (Agent tool + verifiability-lens text) skips (meta-loop guard before tool test)", () =>
  assert.strictEqual(classifyWorthy({ text: "Dispatching the verifiability-lens over the work.", toolNames: ["Agent"] }), false));
test("isLensSurfacing detects rollup/escalations/[verifiability-lens]", () => {
  assert.strictEqual(isLensSurfacing("[verifiability-lens] dispatch..."), true);
  assert.strictEqual(isLensSurfacing("the rollup: 2 escalations, 3 suppressed"), true);
  assert.strictEqual(isLensSurfacing("just normal text"), false);
});
test("isQuestionOnly: trailing ? with no strong claim", () => {
  assert.strictEqual(isQuestionOnly("yes or no?"), true);
  assert.strictEqual(isQuestionOnly("shipped and pushed; tests pass — confirm?"), false); // strong claim present
  assert.strictEqual(isQuestionOnly("it works"), false);
});

// --- decide: disabled always allows ---
test("disabled -> allow even on an artifact turn", () => {
  assert.strictEqual(decide({ enabled: false, lastAssistant: codeMsg, state: null }).action, "allow");
});

// --- decide: artifact turn -> block ---
test("enabled + fresh artifact turn -> block, awaiting=true", () => {
  const r = decide({ enabled: true, lastAssistant: codeMsg, state: null });
  assert.strictEqual(r.action, "block");
  assert.strictEqual(r.newState.awaiting, true);
  assert.strictEqual(r.newState.last_block_hash, hashText(codeMsg.text));
});

// --- decide: a question never blocks (the reported bug) ---
test("enabled + question turn -> allow (was firing before the fix)", () => {
  assert.strictEqual(decide({ enabled: true, lastAssistant: questionMsg, state: null, checkProse: true }).action, "allow");
});

// --- decide: lens surfacing never blocks (meta-loop, the reported bug) ---
test("enabled + lens-surfacing turn -> allow (no checking the check)", () => {
  assert.strictEqual(decide({ enabled: true, lastAssistant: lensSurface, state: null, checkProse: true }).action, "allow");
});

// --- decide: no last assistant -> allow (fail-open) ---
test("enabled + no last assistant -> allow", () => {
  assert.strictEqual(decide({ enabled: true, lastAssistant: null, state: null }).action, "allow");
});

// --- THE LOOP GUARD: block once, then forced release, then hash-skip ---
test("fire-once guard: block -> release -> skip (no second block on same content)", () => {
  const f1 = decide({ enabled: true, lastAssistant: codeMsg, state: null });
  assert.strictEqual(f1.action, "block", "fire1 should block");
  const f2 = decide({ enabled: true, lastAssistant: codeMsg, state: f1.newState });
  assert.strictEqual(f2.action, "allow", "fire2 should release");
  assert.strictEqual(f2.newState.awaiting, false, "awaiting cleared");
  const f3 = decide({ enabled: true, lastAssistant: codeMsg, state: f2.newState });
  assert.strictEqual(f3.action, "allow", "fire3 must NOT re-block the same content");
});

test("new artifact turn after release -> blocks again", () => {
  const released = { last_block_hash: hashText(codeMsg.text), awaiting: false };
  const r = decide({ enabled: true, lastAssistant: codeMsg2, state: released });
  assert.strictEqual(r.action, "block");
  assert.strictEqual(r.newState.last_block_hash, hashText(codeMsg2.text));
});

// --- extractTurn aggregates the WHOLE turn (the bug: tool in an earlier message,
//     turn ENDS with a text-only summary; last-message-only would miss the tool) ---
test("extractTurn aggregates tools across the turn, even when it ends text-only", () => {
  const tmp = path.join(os.tmpdir(), "vl-transcript-" + process.pid + ".jsonl");
  const lines = [
    JSON.stringify({ message: { role: "user", content: "fix the parser" } }),     // genuine prompt
    JSON.stringify({ message: { role: "assistant", content: [
      { type: "text", text: "Reading and patching." },
      { type: "tool_use", name: "Edit", id: "x1" },
    ] } }),
    JSON.stringify({ message: { role: "user", content: [{ type: "tool_result", tool_use_id: "x1" }] } }), // NOT a boundary
    JSON.stringify({ message: { role: "assistant", content: [
      { type: "tool_use", name: "Bash", id: "x2" },
    ] } }),
    JSON.stringify({ message: { role: "user", content: [{ type: "tool_result", tool_use_id: "x2" }] } }),
    JSON.stringify({ message: { role: "assistant", content: [
      { type: "text", text: "Done. Build clean (99pp)." },   // <-- text-only closing summary, no tool
    ] } }),
  ];
  fs.writeFileSync(tmp, lines.join("\n"));
  const turn = extractTurn(tmp);
  fs.unlinkSync(tmp);
  assert.deepStrictEqual(turn.toolNames, ["Edit", "Bash"], "must see tools from earlier messages");
  assert.ok(/Done\. Build clean/.test(turn.text), "must include the closing summary text");
  assert.strictEqual(classifyWorthy(turn), true, "a turn that used tools fires even though it ended text-only");
});

test("extractTurn only aggregates the CURRENT turn (since last genuine prompt)", () => {
  const tmp = path.join(os.tmpdir(), "vl-transcript2-" + process.pid + ".jsonl");
  const lines = [
    JSON.stringify({ message: { role: "assistant", content: [{ type: "tool_use", name: "WebSearch", id: "a" }] } }), // prior turn
    JSON.stringify({ message: { role: "user", content: "now just answer a question" } }),  // new genuine prompt = boundary
    JSON.stringify({ message: { role: "assistant", content: [{ type: "text", text: "Sure, here's the answer." }] } }),
  ];
  fs.writeFileSync(tmp, lines.join("\n"));
  const turn = extractTurn(tmp);
  fs.unlinkSync(tmp);
  assert.deepStrictEqual(turn.toolNames, [], "prior turn's WebSearch must NOT leak into this turn");
  assert.strictEqual(classifyWorthy(turn), false, "this turn used no tools → not worthy");
});

test("extractTurn returns null for missing file (fail-open)", () => {
  assert.strictEqual(extractTurn("/no/such/transcript.jsonl"), null);
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

// --- resolveFlag (check_prose_claims): project over global, default off ---
test("resolveFlag: default when nothing set", () =>
  assert.strictEqual(resolveFlag(null, null, false), false));
test("resolveFlag: global true wins when no project", () =>
  assert.strictEqual(resolveFlag(null, true, false), true));
test("resolveFlag: project false overrides global true", () =>
  assert.strictEqual(resolveFlag(false, true, false), false));

console.log(`\n${passed} passed`);
