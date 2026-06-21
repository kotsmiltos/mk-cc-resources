"use strict";

/**
 * verifiability-lens — Stop hook (P1: block + in-session classification).
 *
 * Mechanism: when Claude finishes a turn, this hook reads the transcript, and if
 * the last assistant message asserted a plan / claim / result (classify-worthy),
 * it returns {decision:"block", reason:"...dispatch the verifiability-lens..."}.
 * Claude Code interprets that as "do not stop; act on this reason" — so the SAME
 * session runs the lens over what it just produced and surfaces ONLY the triaged
 * escalations before yielding. Same mechanism essense-autopilot uses.
 *
 * Fire-exactly-once guard (no infinite block):
 *   - After a block, the NEXT fire is force-released (state.awaiting) — every
 *     block is followed by exactly one forced allow, so a loop is impossible even
 *     if content hashes drift.
 *   - A content-hash of the triggering message also skips re-classifying the same
 *     content on later fires.
 *
 * Opt-in: OFF by default. Turn ON via any of (precedence high→low):
 *   - env VERIFIABILITY_LENS_ENABLED=1 (forces on),
 *   - project ./.claude/verifiability-lens.json {"enabled": true|false} (explicit repo decision wins),
 *   - global ~/.claude/verifiability-lens.json {"enabled": true} (everywhere switch).
 * A repo can opt OUT of a global ON with a project-level {"enabled": false}.
 *
 * Fail-open: any error or ambiguity falls through to "allow stop". Blocking
 * wrongly (annoy / loop) is worse than missing one classification, so every
 * uncertain path allows the stop.
 *
 * P1 note: the lens runs as an in-session subagent (Agent tool). A subagent
 * finishing fires SubagentStop, NOT this Stop hook, so there is no reentrancy /
 * nested-hook concern (unlike a spawned headless claude would have).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const CONFIG_REL = path.join(".claude", "verifiability-lens.json");
const STATE_REL = path.join(".claude", "verifiability-lens", "state.json");

const BLOCK_REASON =
  "[verifiability-lens] Before yielding: dispatch the `verifiability-lens` agent " +
  "(Agent tool, subagent_type: verifiability-lens) over the work you just produced. " +
  "Pass unit_type, the content, any context_refs, executor_capabilities, and the " +
  "recipient_profile from plugins/verifiability-lens/defaults/recipient-profile.yaml " +
  "(or a project override). Then surface ONLY the agent's triaged rollup — the " +
  "headline + escalations (important + actionable, each with why-it-matters + a " +
  "recommended default + bundled context) + a one-line note of what was auto-resolved " +
  "(with the defaults taken) and how many items were suppressed. Do NOT dump the raw " +
  "A/B/U list. Per references/rubric.md. Then stop.";

// ---------- Pure logic (exported for tests) ----------

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 16);
}

// Deterministic pre-filter: is the last assistant turn worth classifying?
//
// DEFAULT trigger = the turn did substantive WORK whose output can carry unverifiable
// claims — producing (code/files), investigating (file reads), or gathering external info
// (web search/fetch, spawned subagents, MCP research tools). These are exactly where B/U
// claims hide. Bare prose claims ("done", "works", "the plan") appear constantly in normal
// conversation and made the hook fire every turn — so prose-only checking is OPT-IN
// (check_prose_claims) and narrowed to strong shipping/verification phrasing.
//
// Two HARD SKIPS apply regardless of mode (checked before the tool test):
//   - the lens's OWN dispatch/surfaced output — never check the check (kills the meta-loop), and
//   - a turn that is purely a question — nothing to verify.
const WORK_TOOLS = new Set([
  "Write", "Edit", "NotebookEdit", "Bash",   // produce / run
  "Read", "Grep", "Glob",                    // investigate files
  "Agent", "Task",                           // spawn subagents / research
  "WebSearch", "WebFetch",                   // web research
]);

// A turn used a work tool if it called any WORK_TOOLS entry or any MCP tool (mcp__*),
// which are research/data tools (Context7 docs, web, etc.).
function usedWorkTool(tools) {
  return (tools || []).some((t) => WORK_TOOLS.has(t) || /^mcp__/.test(t));
}

// Markers of the lens's own surfaced rollup — a turn that contains these is reporting a
// prior classification, not producing new work; classifying it loops the lens on itself.
const LENS_SURFACING_RX =
  /\[verifiability-lens\]|verifiability[_ -]?(class|lens|pass)|\brollup\b|\bescalations?\b|auto[_-]?resolved|suppressed_count|lens (clean|dispatched|caught|flag)/i;

// Strong, build-specific claims only (used when check_prose_claims is on). Deliberately
// narrow: about shipped/tested/committed work, not casual "done/ready/works".
const STRONG_CLAIM_RX =
  /\b(tests?\s+(pass|passing|are green)|all\s+(tests\s+)?green|shipped|committed|pushed|deployed|merged|implementation\s+(is\s+)?complete|done\s+implementing|verified\s+(working|fixed|on disk)|fix(ed)?\s+(is\s+)?confirmed|build\s+(passes|succeeds))\b/i;

function isLensSurfacing(text) {
  return LENS_SURFACING_RX.test(text || "");
}

// A turn whose operative content is a question (ends with '?') and carries no strong
// completion claim — nothing checkable.
function isQuestionOnly(text) {
  const t = (text || "").trim();
  if (!t) return false;
  return /\?\s*$/.test(t) && !STRONG_CLAIM_RX.test(t);
}

function classifyWorthy(lastAssistant, opts) {
  if (!lastAssistant) return false;
  const text = lastAssistant.text || "";
  const tools = lastAssistant.toolNames || [];
  const checkProse = !!(opts && opts.checkProse);

  // Meta-loop guard first: never classify the lens's own dispatch/surfaced output — even if
  // that turn used a tool (the dispatch turn calls the Agent tool).
  if (isLensSurfacing(text)) return false;

  // Primary trigger: this turn did substantive work — produced, investigated, or researched
  // (code/files/commands, file reads, web search/fetch, spawned subagents, MCP research).
  if (usedWorkTool(tools)) return true;

  // Text-only turn: skip a pure question (nothing to verify); otherwise check strong prose
  // claims only when opted in (OFF by default — keeps quiet in chat/coaching).
  if (isQuestionOnly(text)) return false;
  if (checkProse && STRONG_CLAIM_RX.test(text)) return true;

  return false;
}

// Decide the action from (enabled, lastAssistant, state) — no IO. Returns
// { action: "allow" | "block", newState, reason }.
function decide({ enabled, lastAssistant, state, checkProse }) {
  const s = state && typeof state === "object"
    ? state
    : { last_block_hash: null, awaiting: false };

  if (!enabled) return { action: "allow", newState: s, reason: "disabled" };
  if (!lastAssistant || !lastAssistant.text) {
    return { action: "allow", newState: s, reason: "no last assistant text (fail-open)" };
  }
  // Force-release after any prior block — guarantees one block then an allow.
  if (s.awaiting) {
    return {
      action: "allow",
      newState: { last_block_hash: s.last_block_hash, awaiting: false },
      reason: "releasing after prior block (fire-once guard)",
    };
  }
  if (!classifyWorthy(lastAssistant, { checkProse })) {
    return { action: "allow", newState: s, reason: "not classify-worthy" };
  }
  const h = hashText(lastAssistant.text);
  if (h === s.last_block_hash) {
    return { action: "allow", newState: s, reason: "already classified this content" };
  }
  return {
    action: "block",
    newState: { last_block_hash: h, awaiting: true },
    reason: BLOCK_REASON,
  };
}

// ---------- Transcript parsing ----------

// Parse one transcript line into a normalized message, or null if it's not a
// user/assistant message (meta lines like ai-title/mode/attachment are skipped).
function parseMessage(line) {
  let obj;
  try { obj = JSON.parse(line); } catch (_e) { return null; }
  const m = obj.message || obj;
  const role = m.role || obj.role || obj.type;
  if (role !== "user" && role !== "assistant") return null;
  const content = m.content;
  let text = "";
  const tools = [];
  let hasToolResult = false;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      if (c.type === "text" && typeof c.text === "string") text += c.text + "\n";
      else if (c.type === "tool_use" && c.name) tools.push(c.name);
      else if (c.type === "tool_result") hasToolResult = true;
    }
  }
  return { role, text: text.trim(), tools, hasToolResult };
}

// Aggregate the CURRENT TURN: all assistant messages since the last genuine user
// prompt, returning their combined text + every tool name used across the turn.
//
// Why the whole turn, not just the last message: a turn calls tools in EARLIER
// messages, then almost always ends with a text-only summary message. Reading only
// the last message means the tool-based trigger never sees the tools — so the hook
// silently never fired on real work. (The undocumented JSONL schema also carries
// tool_results as user-role messages; those are NOT turn boundaries.)
//
// Defensive: on any read error returns null so the caller fails open (allows stop).
function extractTurn(transcriptPath) {
  if (!transcriptPath) return null;
  let raw;
  try {
    if (!fs.existsSync(transcriptPath)) return null;
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch (_e) {
    return null;
  }
  const msgs = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const m = parseMessage(line);
    if (m) msgs.push(m);
  }
  if (!msgs.length) return null;

  // Turn start = just after the last GENUINE user prompt (has text, not a tool_result
  // relay). If none found, aggregate everything (conservative).
  let start = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user" && msgs[i].text && !msgs[i].hasToolResult) {
      start = i + 1;
      break;
    }
  }

  let text = "";
  let toolNames = [];
  for (let i = start; i < msgs.length; i++) {
    if (msgs[i].role !== "assistant") continue;
    if (msgs[i].text) text += msgs[i].text + "\n";
    toolNames = toolNames.concat(msgs[i].tools);
  }
  return { text: text.trim(), toolNames };
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

// Read a config file as an object (or null if absent/unreadable).
function readConfigObject(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const o = JSON.parse(fs.readFileSync(file, "utf8"));
    return o && typeof o === "object" ? o : null;
  } catch (_e) {
    return null;
  }
}

// Extract a boolean key from a config object → true | false | null (key absent/non-bool).
function cfgFlag(obj, key) {
  if (obj && obj[key] === true) return true;
  if (obj && obj[key] === false) return false;
  return null;
}

// Resolve the effective on/off from the three sources (pure; exported for tests).
// Precedence: env var forces ON; else an explicit PROJECT decision wins (so a repo can
// opt OUT of a global ON with {"enabled": false}); else the GLOBAL default; else OFF.
function resolveEnabled({ envOn, projectFlag, globalFlag }) {
  if (envOn) return true;
  if (projectFlag === true || projectFlag === false) return projectFlag;
  if (globalFlag === true || globalFlag === false) return globalFlag;
  return false;
}

// Resolve a project-over-global boolean flag with a default (pure; exported for tests).
function resolveFlag(projectFlag, globalFlag, dflt) {
  if (projectFlag === true || projectFlag === false) return projectFlag;
  if (globalFlag === true || globalFlag === false) return globalFlag;
  return !!dflt;
}

// Read both config levels once → { enabled, checkProse }. check_prose_claims defaults OFF
// (prose checking is opt-in; the default fires only on artifact-producing turns).
function readSettings(cwd) {
  const envOn = process.env.VERIFIABILITY_LENS_ENABLED === "1";
  const proj = readConfigObject(path.join(cwd, CONFIG_REL));
  const glob = readConfigObject(path.join(os.homedir(), CONFIG_REL));
  return {
    enabled: resolveEnabled({
      envOn,
      projectFlag: cfgFlag(proj, "enabled"),
      globalFlag: cfgFlag(glob, "enabled"),
    }),
    checkProse: resolveFlag(
      cfgFlag(proj, "check_prose_claims"),
      cfgFlag(glob, "check_prose_claims"),
      false
    ),
  };
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
    return false; // best-effort; never fatal
  }
}

function allowStop() { process.exit(0); }
function blockStop(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

// ---------- Main ----------

async function main() {
  const payload = await readPayload();
  const cwd = process.cwd();

  const { enabled, checkProse } = readSettings(cwd);
  const turn = extractTurn(payload.transcript_path);
  const state = readState(cwd);

  const { action, newState, reason } = decide({ enabled, lastAssistant: turn, state, checkProse });

  // Persist state whenever it changed (block sets the marker; release clears awaiting).
  if (newState && JSON.stringify(newState) !== JSON.stringify(state)) {
    writeState(cwd, newState);
  }

  if (action === "block") return blockStop(reason);
  return allowStop();
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`[verifiability-lens] error: ${err.message} — allowing stop\n`);
    process.exit(0);
  });
}

module.exports = {
  hashText, classifyWorthy, decide, extractTurn, parseMessage, BLOCK_REASON,
  resolveEnabled, resolveFlag, isLensSurfacing, isQuestionOnly,
};
