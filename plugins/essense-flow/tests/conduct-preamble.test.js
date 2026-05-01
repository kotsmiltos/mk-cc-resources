// conduct-preamble.test.js — every SKILL.md begins with the verbatim
// Conduct preamble. Drift between the canonical preamble and what's in
// any SKILL.md fails the test loudly.
//
// The canonical preamble is sourced from references/principles.md, which
// is the single source of truth.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const SKILLS_DIR = join(PLUGIN_ROOT, "skills");
const PRINCIPLES_PATH = join(PLUGIN_ROOT, "references/principles.md");

// Extract canonical Conduct preamble from principles.md — between the
// "## Conduct" heading and the next "---" or "##".
async function loadCanonicalConduct() {
  const raw = await readFile(PRINCIPLES_PATH, "utf8");
  const m = raw.match(/##\s+Conduct\n\n([\s\S]+?)\n---\n/);
  assert.ok(m, "principles.md must contain a '## Conduct' section terminated by '---'");
  return m[1].trim();
}

async function listSkills() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

test("every SKILL.md contains the canonical Conduct preamble verbatim", async () => {
  const canonical = await loadCanonicalConduct();
  const skills = await listSkills();
  assert.ok(skills.length >= 9, `expected at least 9 skills, found ${skills.length}`);
  const failures = [];
  for (const skill of skills) {
    const skillPath = join(SKILLS_DIR, skill, "SKILL.md");
    let raw;
    try {
      raw = await readFile(skillPath, "utf8");
    } catch (err) {
      failures.push(`${skill}: cannot read SKILL.md — ${err.message}`);
      continue;
    }
    if (!raw.includes(canonical)) {
      failures.push(`${skill}: SKILL.md does not contain the canonical Conduct preamble verbatim`);
    }
  }
  if (failures.length > 0) {
    assert.fail(
      `Conduct preamble drift in ${failures.length} skill(s):\n  ${failures.join("\n  ")}`,
    );
  }
});

test("every SKILL.md frontmatter has required fields", async () => {
  const skills = await listSkills();
  const failures = [];
  for (const skill of skills) {
    const skillPath = join(SKILLS_DIR, skill, "SKILL.md");
    const raw = await readFile(skillPath, "utf8");
    const fm = raw.match(/^---\n([\s\S]+?)\n---/);
    if (!fm) {
      failures.push(`${skill}: missing frontmatter`);
      continue;
    }
    const body = fm[1];
    for (const required of ["name:", "description:", "version:", "schema_version:"]) {
      if (!body.includes(required)) {
        failures.push(`${skill}: frontmatter missing ${required}`);
      }
    }
    // Name must equal directory.
    const nameLine = body.match(/^name:\s*(\S+)/m);
    if (!nameLine || nameLine[1] !== skill) {
      failures.push(`${skill}: frontmatter name "${nameLine && nameLine[1]}" must equal directory name "${skill}"`);
    }
  }
  if (failures.length > 0) {
    assert.fail(`SKILL.md frontmatter issues:\n  ${failures.join("\n  ")}`);
  }
});

test("expected skills present: elicit, research, triage, architect, build, review, verify, context, heal", async () => {
  const skills = new Set(await listSkills());
  for (const expected of [
    "elicit",
    "research",
    "triage",
    "architect",
    "build",
    "review",
    "verify",
    "context",
    "heal",
  ]) {
    assert.ok(skills.has(expected), `missing skill: ${expected}`);
  }
});
