// description-consistency.test.js — T-ENF-1 (v0.13.3) per 2026-05-17 v0.13.3
// closure-reopening decision in redesign/06-decisions.md.
//
// Anthropic canonical context-engineering guidance: SKILL.md frontmatter
// description is the L1 metadata (always-in-context) skill-selection signal;
// commands/<skill>.md frontmatter description is the slash-command preamble
// the user reads when typing `/<skill>`. Both surfaces feed into Claude's
// decision about whether to invoke the skill. Drift between them = the user
// sees one description, Claude sees a different one, behavior diverges.
//
// This test enforces shared-significant-word overlap >= THRESHOLD between
// each SKILL.md description and its sibling commands/<skill>.md description.
//
// Stop-words excluded so high-frequency English doesn't inflate the score.
// Tokens lowercased + stripped of leading/trailing non-alphanumerics.
//
// Threshold: 0.5 (intersection / min set size). Tuned to catch real drift
// (different verbs or different scope) while tolerating minor wording shifts.
//
// Read this before doing anything:
//   See `references/principles.md` `## Read This Before Doing Anything`
//   (canonical source per v0.13.3 consolidation).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const SKILLS_DIR = join(PLUGIN_ROOT, "skills");
const COMMANDS_DIR = join(PLUGIN_ROOT, "commands");

const OVERLAP_THRESHOLD = 0.5;

// Compact stop-word list: high-frequency tokens that inflate the intersection
// without signaling semantic alignment. Picked from common English + the
// connector words plugin descriptions tend to share regardless of meaning.
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "by",
  "for", "with", "from", "as", "is", "are", "was", "were", "be", "been",
  "this", "that", "these", "those", "it", "its", "into", "via", "per",
  "each", "every", "any", "all", "some", "such", "no", "not",
  "skill", "skills", "phase", "phases", "step", "steps", "use", "uses",
  "used", "using", "do", "does", "done", "have", "has", "had",
]);

async function readNormalized(path) {
  const raw = await readFile(path, "utf8");
  return raw.replace(/\r\n/g, "\n");
}

function extractDescription(raw) {
  const fm = raw.match(/^---\n([\s\S]+?)\n---/);
  if (!fm) return null;
  // Support multi-line description: capture from `description:` to next
  // top-level frontmatter key OR end of frontmatter.
  const m = fm[1].match(/^description:\s*([\s\S]+?)(?:\n[a-z_]+:|$)/m);
  if (!m) return null;
  return m[1].trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[\s\p{P}]+/u)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function overlapRatio(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let common = 0;
  for (const t of setA) if (setB.has(t)) common++;
  return common / Math.min(setA.size, setB.size);
}

async function listSkills() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

test("T-ENF-1: SKILL.md description overlaps with commands/<skill>.md description", async () => {
  const skills = await listSkills();
  const failures = [];
  const missingCommandFiles = [];
  for (const skill of skills) {
    const skillPath = join(SKILLS_DIR, skill, "SKILL.md");
    const commandPath = join(COMMANDS_DIR, `${skill}.md`);

    const skillRaw = await readNormalized(skillPath);
    const skillDesc = extractDescription(skillRaw);
    if (!skillDesc) {
      failures.push(`${skill}: SKILL.md frontmatter missing description`);
      continue;
    }

    if (!existsSync(commandPath)) {
      // Some skills may not have a slash-command counterpart; note + skip.
      // Failure-soft: surface in test output but do NOT fail the test for
      // missing-command-file. Hard requirement = no drift when both exist.
      missingCommandFiles.push(skill);
      continue;
    }

    const commandRaw = await readNormalized(commandPath);
    const commandDesc = extractDescription(commandRaw);
    if (!commandDesc) {
      failures.push(`${skill}: commands/${skill}.md frontmatter missing description`);
      continue;
    }

    const skillTokens = new Set(tokenize(skillDesc));
    const commandTokens = new Set(tokenize(commandDesc));
    const ratio = overlapRatio(skillTokens, commandTokens);

    if (ratio < OVERLAP_THRESHOLD) {
      failures.push(
        `${skill}: description overlap ${ratio.toFixed(2)} < ${OVERLAP_THRESHOLD} threshold\n` +
          `    SKILL.md:    "${skillDesc.slice(0, 200)}${skillDesc.length > 200 ? "..." : ""}"\n` +
          `    commands/${skill}.md: "${commandDesc.slice(0, 200)}${commandDesc.length > 200 ? "..." : ""}"\n` +
          `    SKILL tokens (${skillTokens.size}): [${Array.from(skillTokens).slice(0, 20).join(", ")}]\n` +
          `    cmd   tokens (${commandTokens.size}): [${Array.from(commandTokens).slice(0, 20).join(", ")}]`,
      );
    }
  }

  if (missingCommandFiles.length > 0) {
    // Informational stderr (Anthropic Fail-Soft principle: observe + warn, never block).
    process.stderr.write(
      `T-ENF-1 note: ${missingCommandFiles.length} skill(s) have no commands/<skill>.md counterpart (skipped for overlap check, not a failure): ${missingCommandFiles.join(", ")}\n`,
    );
  }

  if (failures.length > 0) {
    assert.fail(
      `T-ENF-1: description-consistency drift in ${failures.length} skill(s):\n  ${failures.join("\n  ")}`,
    );
  }
});
