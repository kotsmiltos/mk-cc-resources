#!/usr/bin/env node
// next-step.js — fires on Stop.
//
// Reads state, looks up phase-command-map.yaml, surfaces recommended
// next slash command + one-line description + inputs. Suggestion only.
//
// Per Fail-Soft: NEVER blocks. Every error path exits 0.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "../..");
const MAP_PATH = join(PLUGIN_ROOT, "references/phase-command-map.yaml");
const STATE_LIB_URL = pathToFileURL(join(PLUGIN_ROOT, "lib/state.js")).href;

main().catch((err) => {
  process.stderr.write(`[essense-flow next-step] unexpected error: ${err && err.message}\n`);
  process.exit(0);
});

async function main() {
  const projectRoot = process.cwd();

  let state;
  try {
    const { readState } = await import(STATE_LIB_URL);
    state = await readState(projectRoot);
  } catch (err) {
    process.stderr.write(`[essense-flow next-step] lib unavailable: ${err.message}\n`);
    process.exit(0);
  }

  if (state.degraded) {
    // Don't suggest a phase command from a degraded state — surface and exit.
    process.stdout.write(
      `<essense-flow-next>\n` +
        `state: degraded (${state.degraded})\n` +
        `recommendation: /heal\n` +
        `</essense-flow-next>\n`,
    );
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
