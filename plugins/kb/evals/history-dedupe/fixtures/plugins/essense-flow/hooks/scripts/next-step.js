#!/usr/bin/env node
// next-step.js — fires on Stop.
//
// Reads state, looks up phase-command-map.yaml, surfaces recommended
// next slash command + one-line description + inputs. Suggestion only.
//
// Per Fail-Soft: NEVER blocks. Every error path exits 0.
//
// INJECTION ECONOMICS (measured 2026-09-11, audit over 196 sessions): a degraded state made
// this hook print `state: degraded / recommendation: /heal` at the END OF EVERY TURN, forever,
// in a repo whose pipeline skills were invoked 0 times. The suggestion is worthless there:
// nothing is mid-flight, and /heal on a dead .pipeline/ would assert a false phase. So a
// degraded state now exits 0 SILENTLY — SessionStart's one context-inject banner is the single
// place the degradation is announced. Every NON-degraded path keeps its suggestion.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolveProjectRoot } from "../../lib/project-root.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "../..");
const MAP_PATH = join(PLUGIN_ROOT, "references/phase-command-map.yaml");
const STATE_LIB_URL = pathToFileURL(join(PLUGIN_ROOT, "lib/state.js")).href;

/**
 * The platform's hook payload, or {} when there is none (hand-run, TTY, unparseable).
 * Never throws and never hangs — a TTY stdin resolves immediately.
 */
function readPayload() {
  return new Promise((resolve_) => {
    if (process.stdin.isTTY) return resolve_({});
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("error", () => resolve_({}));
    process.stdin.on("end", () => {
      if (!data.trim()) return resolve_({});
      try { resolve_(JSON.parse(data)); } catch (_e) { resolve_({}); }
    });
  });
}

main().catch((err) => {
  process.stderr.write(`[essense-flow next-step] unexpected error: ${err && err.message}\n`);
  process.exit(0);
});

async function main() {
  const payload = await readPayload();
  // Nearest .git ancestor, not the shell's position — a subdirectory shell used to read
  // another project's .pipeline/ and suggest its next command here.
  const projectRoot = resolveProjectRoot(payload.cwd || process.cwd());

  // FAST stand-down before any library loads — this Stop hook fires in EVERY repo (measured
  // ~430 fires, ~130 ms each, in projects that never ran the pipeline). Same predicate
  // readState uses for `pipeline_present`; only the cost moves, never the behaviour.
  if (!existsSync(join(projectRoot, ".pipeline"))) process.exit(0);

  let state;
  try {
    const { readState } = await import(STATE_LIB_URL);
    state = await readState(projectRoot);
  } catch (err) {
    // Parse-corrupt state.yaml throws ShapeValidationError; normalise it to the same
    // degraded marker shape readState returns for shape-corrupt, so both variants take the
    // one silent exit below. Other errors = lib unavailable, stay quiet.
    if (err && err.name === "ShapeValidationError") {
      state = { phase: "idle", degraded: "corrupt", reason: err.message };
    } else {
      process.stderr.write(`[essense-flow next-step] lib unavailable: ${err.message}\n`);
      process.exit(0);
    }
  }

  // Never-initialized repo (no .pipeline/ at all): not a pipeline project —
  // no suggestion, no banner. Mirrors context-inject's probe.
  if (state.degraded === "missing" && state.pipeline_present === false) {
    process.exit(0);
  }

  if (state.degraded) {
    // Don't suggest a phase command from a degraded state — and don't say so either.
    // Degraded marker family:
    //   - 'missing' — state.yaml absent
    //   - 'corrupt' — post-parse shape-validation failure; readState returns
    //     {degraded:'corrupt', shape_error, ...} marker directly (no throw).
    //     The truthy check catches both variants uniformly.
    // SILENT since 0.27.0 (see INJECTION ECONOMICS above): the degradation is announced once
    // per session by context-inject on SessionStart; repeating it at every turn's end taught
    // the model nothing and pushed /heal at a pipeline nobody is running.
    process.exit(0);
  }

  let map;
  try {
    const yaml = (await import("js-yaml")).default;
    const raw = await readFile(MAP_PATH, "utf8");
    map = yaml.load(raw);
  } catch (err) {
    process.stderr.write(`[essense-flow next-step] map load failed: ${err.message}\n`);
    process.exit(0);
  }

  const entry = map && map.phases && map.phases[state.phase];
  if (!entry) {
    // Unknown phase — surface, don't refuse.
    process.stdout.write(
      `<essense-flow-next>\n` +
        `phase: ${state.phase}\n` +
        `note: no recommended next command for this phase\n` +
        `</essense-flow-next>\n`,
    );
    process.exit(0);
  }

  const lines = [];
  lines.push(`<essense-flow-next>`);
  lines.push(`phase: ${state.phase}`);
  lines.push(`recommended_next: ${entry.next}`);
  lines.push(`description: ${entry.description}`);
  if (Array.isArray(entry.inputs) && entry.inputs.length > 0) {
    lines.push(`reads:`);
    for (const inp of entry.inputs) lines.push(`  - ${inp}`);
  }
  lines.push(`note: suggestion only — run if you want to proceed`);
  lines.push(`</essense-flow-next>`);
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}
