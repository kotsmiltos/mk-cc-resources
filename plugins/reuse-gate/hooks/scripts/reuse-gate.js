"use strict";

/**
 * reuse-gate — PreToolUse hook (reuse-first reminder on the first code write).
 *
 * Purpose: at the moment code is first written after a user prompt, surface the
 * reuse-first checklist — is this already implemented here (codebase / glossary)
 * or served by a package/library? reuse or extend before writing new; what you
 * do write, build modular + decoupled. A deterministic nudge at the exact moment
 * of writing, so the rule cannot drift out of context the way an instruction can.
 *
 * Mechanism — additionalContext injection, once per USER PROMPT, NO block:
 *   The first Write/Edit to a SOURCE file after a given user prompt returns
 *   {hookSpecificOutput:{hookEventName:"PreToolUse", additionalContext:REMINDER}}
 *   and exits 0. Per the Claude Code hooks reference, additionalContext is
 *   injected into Claude's context BEFORE the tool executes — so the reminder is
 *   seen, the write proceeds, and the normal permission flow is untouched.
 *
 *   Dedupe key = prompt_id (the hooks reference: "UUID identifying the user
 *   prompt currently being processed"). Each new user message gets a fresh
 *   prompt_id, so the reminder fires once PER MESSAGE — on the first source write
 *   of that turn, not on every write, and again on the next message.
 *
 *   Why NOT permissionDecision:"allow": returning "allow" SKIPS the interactive
 *   permission prompt (auto-approves the write) — a side effect a reminder must
 *   not have. We emit NO permissionDecision, so writes keep their normal prompt.
 *
 *   Why NOT exit-2 + stderr: exit 2 BLOCKS the call (a hard gate). The chosen
 *   design is a low-friction reminder, not a block — so we inject and let the
 *   write proceed rather than forcing a re-issue.
 *
 * Opt-in: OFF by default. Turn ON via any of (precedence high→low):
 *   - env REUSE_GATE_ENABLED=1 (forces on),
 *   - project ./.claude/reuse-gate.json {"enabled": true|false} (repo decision wins),
 *   - global ~/.claude/reuse-gate.json {"enabled": true} (everywhere switch).
 *   A repo opts OUT of a global ON with project {"enabled": false}.
 *
 * Fail-open: any error, missing field, or ambiguity exits 0 with no injection —
 * and because the hook never blocks, even a failed state write degrades only to
 * "the reminder repeats on the next write", never to an obstructed write.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const CONFIG_REL = path.join(".claude", "reuse-gate.json");
const STATE_REL = path.join(".claude", "reuse-gate", "state.json");

const REMINDER =
  "[reuse-gate] Reuse-first check before writing new code (surfaced once per message):\n" +
  "  1. Already implemented here? Search the codebase / functionality glossary (MAP.md) — reuse or extend it, don't duplicate.\n" +
  "  2. Served by a package/library? For well-solved problems (parsing, dates, HTTP, crypto, retries, validation), adopt a maintained dependency — pinned, wrapped behind your own contract — over hand-rolling.\n" +
  "Only write new when neither fits (say why if you reimplement anyway). What you DO write: modular, decoupled, reusable.\n" +
  "Ref: your project's reuse-first conventions — e.g. essense-flow references/code-conventions.md \"Before you build: reuse what exists\", or the global ~/.claude/CLAUDE.md Code Quality rule.";

// Source-code file extensions the reminder applies to. Docs/config/data
// (.md .json .yaml .txt .lock …) are deliberately excluded — reuse-first is a
// code concern, and firing on a README write would be noise.
const SOURCE_EXT = new Set([
  ".py", ".pyi", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".java", ".cs",
  ".go", ".rs", ".rb", ".php", ".c", ".h", ".cpp", ".cc", ".cxx", ".hpp",
  ".swift", ".kt", ".kts", ".scala", ".sh", ".bash", ".sql", ".vue", ".svelte",
  ".lua", ".r", ".dart", ".ex", ".exs", ".clj", ".m", ".mm",
]);

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

// ---------- Pure logic (exported for tests) ----------

// Write/Edit both put the target at tool_input.file_path; fall back to .path
// defensively in case a variant tool differs.
function extractFilePath(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  return toolInput.file_path || toolInput.path || null;
}

function isSourceFile(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  return SOURCE_EXT.has(path.extname(filePath).toLowerCase());
}

// Extract a boolean key from a config object → true | false | null.
function cfgFlag(obj, key) {
  if (obj && obj[key] === true) return true;
  if (obj && obj[key] === false) return false;
  return null;
}

// Precedence: env forces ON; else an explicit PROJECT decision wins (repo can opt
// OUT of a global ON with false); else the GLOBAL default; else OFF.
function resolveEnabled({ envOn, projectFlag, globalFlag }) {
  if (envOn) return true;
  if (projectFlag === true || projectFlag === false) return projectFlag;
  if (globalFlag === true || globalFlag === false) return globalFlag;
  return false;
}

// Decide the action from (enabled, toolName, filePath, promptId, state) — no IO.
// Returns { action: "allow" | "remind", newState }.  "remind" => inject the
// reminder via additionalContext (never blocks); "allow" => do nothing.
//
// Dedupe is per USER PROMPT: we remember only the last prompt we reminded for,
// since prompt_ids are sequential — a new message always brings a new id.
function decide({ enabled, toolName, filePath, promptId, state }) {
  const lastPrompt = state && typeof state.last_prompt === "string" ? state.last_prompt : null;
  const s = { last_prompt: lastPrompt };

  if (!enabled) return { action: "allow", newState: s };
  if (!WRITE_TOOLS.has(toolName)) return { action: "allow", newState: s };
  if (!isSourceFile(filePath)) return { action: "allow", newState: s };
  // No prompt id (absent until first user input, or older CLI) → cannot dedupe;
  // fail-open (allow) rather than inject on every write forever.
  if (!promptId) return { action: "allow", newState: s };
  if (promptId === lastPrompt) return { action: "allow", newState: s };

  // First source write for this prompt → inject once, record the prompt.
  return { action: "remind", newState: { last_prompt: promptId } };
}

// ---------- IO helpers ----------

function readPayload() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      if (!data.trim()) return resolve({});
      try { resolve(JSON.parse(data)); } catch (_e) { resolve({}); }
    });
    if (process.stdin.isTTY) resolve({});
  });
}

function readConfigObject(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const o = JSON.parse(fs.readFileSync(file, "utf8"));
    return o && typeof o === "object" ? o : null;
  } catch (_e) {
    return null;
  }
}

function readEnabled(cwd) {
  const envOn = process.env.REUSE_GATE_ENABLED === "1";
  const proj = readConfigObject(path.join(cwd, CONFIG_REL));
  const glob = readConfigObject(path.join(os.homedir(), CONFIG_REL));
  return resolveEnabled({
    envOn,
    projectFlag: cfgFlag(proj, "enabled"),
    globalFlag: cfgFlag(glob, "enabled"),
  });
}

function readState(cwd) {
  try {
    const p = path.join(cwd, STATE_REL);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_e) {
    return null;
  }
}

function writeState(cwd, state) {
  try {
    const p = path.join(cwd, STATE_REL);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(state));
    return true;
  } catch (_e) {
    return false; // best-effort; a failure only means the reminder may repeat
  }
}

// Build the PreToolUse injection payload (pure; exported for tests).
function injectionPayload(reminder) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: reminder,
    },
  };
}

// ---------- Main ----------

async function main() {
  const payload = await readPayload();
  const cwd = payload.cwd || process.cwd();

  const enabled = readEnabled(cwd);
  const toolName = payload.tool_name;
  const filePath = extractFilePath(payload.tool_input);
  const promptId = payload.prompt_id;
  const state = readState(cwd);

  const { action, newState } = decide({ enabled, toolName, filePath, promptId, state });

  if (action === "remind") {
    // Record the prompt so the reminder fires only once this turn. Best-effort:
    // if this fails the reminder simply repeats next write — we never block.
    writeState(cwd, newState);
    process.stdout.write(JSON.stringify(injectionPayload(REMINDER)));
    process.exit(0);
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`[reuse-gate] error: ${err.message} — allowing write\n`);
    process.exit(0);
  });
}

module.exports = {
  extractFilePath, isSourceFile, cfgFlag, resolveEnabled, decide, injectionPayload,
  REMINDER, SOURCE_EXT, WRITE_TOOLS,
};
