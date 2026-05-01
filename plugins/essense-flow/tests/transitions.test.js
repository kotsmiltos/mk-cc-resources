// transitions.test.js — every (from, to) declared in any SKILL.md's
// "## State transitions" table must exist as a transition in
// references/transitions.yaml. Drift fails this audit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const TRANSITIONS_PATH = join(PLUGIN_ROOT, "references/transitions.yaml");
const SKILLS_DIR = join(PLUGIN_ROOT, "skills");

test("every transition declared in any SKILL.md exists in transitions.yaml", async () => {
  const transitions = yaml.load(await readFile(TRANSITIONS_PATH, "utf8"));
  const legalEdges = new Set();
  for (const [, t] of Object.entries(transitions.transitions)) {
    legalEdges.add(`${t.from}|${t.to}`);
  }
  // Self-transitions are always considered legal at write time per
  // assertLegalTransition's identity rule, but they are explicitly listed
  // for the phases that have a documented self-loop. Those are still in
  // the table — no special handling here.

  const skillDirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const failures = [];
  for (const skill of skillDirs) {
    const skillPath = join(SKILLS_DIR, skill, "SKILL.md");
    const raw = await readFile(skillPath, "utf8");
    // Find the "## State transitions" section.
    const m = raw.match(/##\s+State transitions[\s\S]*?(?=\n##\s|\n#\s|$)/);
    if (!m) continue;
    const block = m[0];
    // Match every table row of the form: | from | to | trigger | auto |
    // Skip the header row + separator.
    const rowRe = /^\|\s*([\w-]+(?:\s*\([^)]+\))?)\s*\|\s*([\w-]+(?:\s*\([^)]+\))?)\s*\|/gm;
    let mm;
    while ((mm = rowRe.exec(block)) !== null) {
      const from = mm[1].trim();
      const to = mm[2].trim();
      // Skip header rows ("from | to | trigger | auto") and separator.
      if (from === "from" || from === "------" || /^-+$/.test(from)) continue;
      // Skip "(no state)" placeholders.
      if (/^\(/.test(from)) continue;
      const edge = `${from}|${to}`;
      // Self-transitions are legal by identity rule.
      if (from === to) continue;
      if (!legalEdges.has(edge)) {
        failures.push(`${skill}: declared transition ${from} → ${to} not present in transitions.yaml`);
      }
    }
  }

  if (failures.length > 0) {
    assert.fail(`transition drift between SKILL.md and transitions.yaml:\n  ${failures.join("\n  ")}`);
  }
});

test("transitions.yaml every from/to phase is in phases list", async () => {
  const t = yaml.load(await readFile(TRANSITIONS_PATH, "utf8"));
  const phases = new Set(t.phases);
  const failures = [];
  for (const [name, transition] of Object.entries(t.transitions)) {
    if (!phases.has(transition.from)) failures.push(`${name}: from "${transition.from}" not in phases`);
    if (!phases.has(transition.to)) failures.push(`${name}: to "${transition.to}" not in phases`);
  }
  if (failures.length > 0) {
    assert.fail(`transitions.yaml integrity:\n  ${failures.join("\n  ")}`);
  }
});

test("transitions.yaml: idle is reachable from complete (cycle close)", async () => {
  const t = yaml.load(await readFile(TRANSITIONS_PATH, "utf8"));
  const found = Object.values(t.transitions).some((tr) => tr.from === "complete" && tr.to === "idle");
  assert.ok(found, "must have a complete → idle transition to allow cycle restart");
});
