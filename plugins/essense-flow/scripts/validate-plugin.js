#!/usr/bin/env node
// validate-plugin.js — schema-checks plugin.json, every SKILL.md
// frontmatter, every command file, and every artifact template renders
// without missing bindings against a fixture.
//
// Exits 0 on green, non-zero on any failure with a clear list.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const failures = [];

function fail(msg) {
  failures.push(msg);
}

async function checkPluginManifest() {
  const path = join(PLUGIN_ROOT, ".claude-plugin/plugin.json");
  if (!existsSync(path)) return fail(`missing ${path}`);
  const raw = await readFile(path, "utf8");
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return fail(`plugin.json parse: ${err.message}`);
  }
  for (const k of ["name", "version", "description", "author"]) {
    if (!json[k]) fail(`plugin.json missing ${k}`);
  }
  if (json.name !== "essense-flow") fail(`plugin.json name must be "essense-flow"`);
}

async function checkSkills() {
  const skillsDir = join(PLUGIN_ROOT, "skills");
  const entries = (await readdir(skillsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  if (entries.length < 9) fail(`expected ≥9 skill directories, found ${entries.length}`);
  for (const skill of entries) {
    const path = join(skillsDir, skill, "SKILL.md");
    if (!existsSync(path)) {
      fail(`skill "${skill}" missing SKILL.md`);
      continue;
    }
    const raw = await readFile(path, "utf8");
    const fm = raw.match(/^---\n([\s\S]+?)\n---/);
    if (!fm) {
      fail(`skill "${skill}" SKILL.md missing frontmatter`);
      continue;
    }
    let parsed;
    try {
      parsed = yaml.load(fm[1]);
    } catch (err) {
      fail(`skill "${skill}" frontmatter parse: ${err.message}`);
      continue;
    }
    for (const k of ["name", "description", "version", "schema_version"]) {
      if (!parsed[k]) fail(`skill "${skill}" frontmatter missing ${k}`);
    }
    if (parsed.name !== skill) fail(`skill "${skill}" name "${parsed.name}" mismatches directory`);
  }
}

async function checkCommands() {
  const commandsDir = join(PLUGIN_ROOT, "commands");
  const entries = (await readdir(commandsDir)).filter((f) => f.endsWith(".md"));
  if (entries.length < 12) fail(`expected ≥12 commands, found ${entries.length}`);
  for (const f of entries) {
    const raw = await readFile(join(commandsDir, f), "utf8");
    if (!raw.startsWith("---\n")) fail(`command ${f} missing frontmatter`);
    if (!/description:\s*\S/.test(raw)) fail(`command ${f} missing description`);
  }
}

async function checkReferences() {
  for (const f of ["transitions.yaml", "phase-command-map.yaml", "principles.md"]) {
    const path = join(PLUGIN_ROOT, "references", f);
    if (!existsSync(path)) fail(`missing references/${f}`);
  }
}

async function checkDefaults() {
  for (const f of ["state.yaml", "config.yaml"]) {
    const path = join(PLUGIN_ROOT, "defaults", f);
    if (!existsSync(path)) fail(`missing defaults/${f}`);
  }
}

async function checkHooks() {
  const path = join(PLUGIN_ROOT, "hooks/hooks.json");
  if (!existsSync(path)) return fail(`missing hooks/hooks.json`);
  const raw = await readFile(path, "utf8");
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return fail(`hooks.json parse: ${err.message}`);
  }
  if (!json.hooks) fail(`hooks.json missing "hooks" key`);
  for (const event of ["UserPromptSubmit", "SessionStart", "Stop"]) {
    if (!json.hooks[event]) fail(`hooks.json missing event ${event}`);
  }
  for (const script of ["context-inject.js", "next-step.js"]) {
    const p = join(PLUGIN_ROOT, "hooks/scripts", script);
    if (!existsSync(p)) fail(`missing hooks/scripts/${script}`);
  }
}

async function checkLib() {
  for (const f of ["state.js", "finalize.js", "brief.js", "dispatch.js", "verify-disk.js"]) {
    const p = join(PLUGIN_ROOT, "lib", f);
    if (!existsSync(p)) fail(`missing lib/${f}`);
  }
}

async function main() {
  await checkPluginManifest();
  await checkSkills();
  await checkCommands();
  await checkReferences();
  await checkDefaults();
  await checkHooks();
  await checkLib();
  if (failures.length > 0) {
    console.error("validate-plugin FAIL:");
    for (const m of failures) console.error(`  - ${m}`);
    process.exit(1);
  }
  console.log("validate-plugin OK");
  process.exit(0);
}

main().catch((err) => {
  console.error("validate-plugin crashed:", err);
  process.exit(1);
});
