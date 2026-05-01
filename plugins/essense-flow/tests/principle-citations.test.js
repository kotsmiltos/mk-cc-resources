// principle-citations.test.js — every SKILL.md must cite every required
// principle inline. The Conduct preamble is audited separately by
// conduct-preamble.test.js; this test catches drift in the inline
// citations under "## Constraints" where each principle gets named
// against the specific behavior it governs in that skill.
//
// If a citation is genuinely not applicable to a phase, it must be added
// to the EXEMPT map below with a one-line justification — never silently.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const SKILLS_DIR = join(PLUGIN_ROOT, "skills");

const PRINCIPLES = [
  "Graceful-Degradation",
  "Front-Loaded-Design",
  "Fail-Soft",
  "Diligent-Conduct",
  "INST-13",
];

const SKILLS = [
  "elicit",
  "research",
  "triage",
  "architect",
  "build",
  "review",
  "verify",
  "context",
  "heal",
];

// Explicit exemptions only. Empty by design — every skill cites every principle.
const EXEMPT = {};

test("every SKILL.md cites every required principle inline", async () => {
  const failures = [];
  for (const skill of SKILLS) {
    const path = join(SKILLS_DIR, skill, "SKILL.md");
    const raw = await readFile(path, "utf8");
    for (const p of PRINCIPLES) {
      const exempt = EXEMPT[skill] && EXEMPT[skill].includes(p);
      if (exempt) continue;
      if (!raw.includes(p)) {
        failures.push(`${skill}: missing inline citation for ${p}`);
      }
    }
  }
  if (failures.length > 0) {
    assert.fail(
      `Principle citation drift in ${failures.length} skill/principle pair(s):\n  ${failures.join("\n  ")}\n\n` +
        `Either add the citation to "## Constraints" naming the specific behavior it governs, or add an explicit exemption to EXEMPT in this test with a one-line justification.`,
    );
  }
});

test("every principle is cited in either Core principle or Constraints block per skill", async () => {
  // Stronger version: the citation should live in a load-bearing section
  // (Core principle OR Constraints), not just appear somewhere in the
  // file. Catches "I dropped the word in the middle of a paragraph but
  // never invoked it as a normative rule."
  const failures = [];
  for (const skill of SKILLS) {
    const path = join(SKILLS_DIR, skill, "SKILL.md");
    const raw = await readFile(path, "utf8");
    const constraintsMatch = raw.match(/##\s+Constraints\s*\n([\s\S]+?)(?=\n##\s|\n#\s|$)/);
    const coreMatch = raw.match(/##\s+Core principle\s*\n([\s\S]+?)(?=\n##\s|\n#\s|$)/);
    if (!constraintsMatch) {
      failures.push(`${skill}: missing "## Constraints" section`);
      continue;
    }
    const loadBearing = (constraintsMatch[1] || "") + "\n" + (coreMatch ? coreMatch[1] : "");
    for (const p of PRINCIPLES) {
      const exempt = EXEMPT[skill] && EXEMPT[skill].includes(p);
      if (exempt) continue;
      if (!loadBearing.includes(p)) {
        failures.push(`${skill}: ${p} mentioned but not in Core principle or Constraints block`);
      }
    }
  }
  if (failures.length > 0) {
    assert.fail(failures.join("\n  "));
  }
});
