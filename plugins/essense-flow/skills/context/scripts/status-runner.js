"use strict";

const path = require("path");
const fs = require("fs");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");
const stateHistory = require("../../../lib/state-history");
const { trace } = require("../../../lib/debug");

const FLAG_JSON = "--json";
const FLAG_HISTORY = "--history";
const HISTORY_LIMIT = 10;

const args = process.argv.slice(2);
const emitJson = args.includes(FLAG_JSON);
const includeHistory = args.includes(FLAG_HISTORY);

const pipelineDir = paths.findPipelineDir(process.cwd());
if (!pipelineDir) {
  process.stderr.write("Pipeline not initialized. Run /init first.\n");
  process.exit(1);
}

const statePath = path.join(pipelineDir, "state.yaml");
const state = yamlIO.safeReadWithFallback(statePath);
if (!state) {
  process.stderr.write(`Cannot read pipeline state at ${statePath}\n`);
  process.exit(1);
}
trace("state loaded", { phase: (state.pipeline || {}).phase, next_action: state.next_action });

// Project root is one level above .pipeline/
const projectRoot = path.dirname(pipelineDir);
const hooksJsonPath = path.join(projectRoot, "hooks", "hooks.json");

function buildHooks() {
  if (!fs.existsSync(hooksJsonPath)) return [];

  let hooksData;
  try {
    hooksData = JSON.parse(fs.readFileSync(hooksJsonPath, "utf8"));
  } catch (_e) {
    return [];
  }

  const result = [];
  const events = hooksData.hooks || {};

  for (const event of Object.keys(events)) {
    for (const matcherGroup of events[event]) {
      for (const hook of matcherGroup.hooks || []) {
        // Extract the script path from the command string — strip bash wrapper and quotes
        const scriptMatch = hook.command && hook.command.match(/"([^"]+\.(?:sh|js))"/);
        const rawScript = scriptMatch ? scriptMatch[1] : null;

        // Resolve script path: replace env var placeholder with actual hooks dir
        const scriptResolved = rawScript
          ? rawScript.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/, projectRoot)
          : null;

        result.push({
          name: event,
          event,
          script: rawScript || hook.command,
          registered: true,
          script_exists: scriptResolved ? fs.existsSync(scriptResolved) : false,
        });
      }
    }
  }

  return result;
}

const pipeline = state.pipeline || {};
const output = {
  phase: pipeline.phase || state.phase || null,
  sprint: pipeline.sprint || state.sprint || null,
  wave: pipeline.wave || null,
  task_in_progress: pipeline.task_in_progress || null,
  last_updated: state.last_updated || null,
  next_action: state.next_action || null,
  hooks: buildHooks(),
  phases_completed: state.phases_completed || [],
};

if (includeHistory) {
  const entries = stateHistory.readHistory(pipelineDir, HISTORY_LIMIT);
  output.history = { entries };
}

if (emitJson) {
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  process.exit(0);
}

if (includeHistory) {
  const entries = output.history ? output.history.entries : [];
  if (entries.length === 0) {
    process.stdout.write("No state history recorded yet.\n");
  } else {
    const COL = { num: 4, from: 18, to: 18, trigger: 16, sprint: 7, ts: 28 };
    const sep = "─".repeat(COL.num + COL.from + COL.to + COL.trigger + COL.sprint + COL.ts + 5 * 3);
    const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
    const lines = [
      `State History (last ${entries.length} transition${entries.length === 1 ? "" : "s"}):`,
      "",
      `  ${"#".padEnd(COL.num)} │ ${"From".padEnd(COL.from)} │ ${"To".padEnd(COL.to)} │ ${"Trigger".padEnd(COL.trigger)} │ ${"Sprint".padEnd(COL.sprint)} │ Timestamp`,
      "  " + sep,
    ];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      lines.push(
        `  ${String(i + 1).padEnd(COL.num)} │ ${pad(e.from_state, COL.from)} │ ${pad(e.to_state, COL.to)} │ ${pad(e.trigger, COL.trigger)} │ ${pad(e.sprint, COL.sprint)} │ ${e.timestamp ?? ""}`
      );
    }
    process.stdout.write(lines.join("\n") + "\n");
  }
  process.exit(0);
}

// Human-readable default output
const lines = [];
lines.push(`Phase:        ${output.phase ?? "(none)"}`);
lines.push(`Sprint:       ${output.sprint ?? "(none)"}`);
lines.push(`Last updated: ${output.last_updated ?? "(unknown)"}`);
lines.push(`Next action:  ${output.next_action ?? "(none)"}`);

if (output.hooks.length > 0) {
  lines.push("");
  lines.push("Hooks:");
  for (const h of output.hooks) {
    const exists = h.script_exists ? "ok" : "MISSING";
    lines.push(`  [${h.event}] ${h.script}  (${exists})`);
  }
} else {
  lines.push("");
  lines.push("Hooks: none registered");
}

process.stdout.write(lines.join("\n") + "\n");
process.exit(0);
