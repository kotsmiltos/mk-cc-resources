"use strict";

/**
 * Cross-check workflow frontmatter against references/transitions.yaml.
 *
 * Each `skills/*\/workflows/*.md` declares a `phase_transitions` string like
 * `idle → research → triaging`. Every adjacent (from, to) pair in that
 * string must correspond to an actual transition in transitions.yaml.
 *
 * Motivation: F3 found `skills/architect/workflows/review.md` declaring
 * `sprint-complete → reviewing → sprinting|complete` — but `reviewing →
 * sprinting` and `reviewing → complete` do not exist in transitions.yaml
 * (the canonical post-review transition is `reviewing → triaging`).
 * Workflow drift like this turns into pipeline stalls when a skill tries
 * to follow its declared transition path. This test prevents recurrence.
 *
 * Workflows with `status: archived` in frontmatter are skipped — archived
 * workflows are intentionally non-canonical and not invoked.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const TRANSITIONS_PATH = path.join(ROOT, "references", "transitions.yaml");

function parseFrontmatter(rawContent) {
  const content = rawContent.replace(/\r\n/g, "\n");
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const result = {};
  for (const line of m[1].split("\n")) {
    const [k, ...rest] = line.split(":");
    if (k && rest.length) result[k.trim()] = rest.join(":").trim();
  }
  return result;
}

// Build canonical transitions set from references/transitions.yaml.
function loadCanonicalTransitions() {
  const data = yaml.load(fs.readFileSync(TRANSITIONS_PATH, "utf8"));
  const validPhases = new Set();
  const transitionPairs = new Set();
  for (const [, t] of Object.entries(data.transitions || {})) {
    if (t && t.from && t.to) {
      validPhases.add(t.from);
      validPhases.add(t.to);
      transitionPairs.add(`${t.from}→${t.to}`);
    }
  }
  // Also accept the per-phase self-loop "(resume)" notation in workflows
  // — these are documentation hints meaning "skip transition; already at
  // target". Not real transitions, but workflows reference them when the
  // skill resumes mid-flight.
  for (const p of validPhases) {
    transitionPairs.add(`${p}→${p}`);
  }
  return { validPhases, transitionPairs };
}

// Discover all skill workflow files.
function discoverWorkflows() {
  const out = [];
  for (const skillEntry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!skillEntry.isDirectory()) continue;
    const wfDir = path.join(SKILLS_DIR, skillEntry.name, "workflows");
    if (!fs.existsSync(wfDir)) continue;
    for (const wfEntry of fs.readdirSync(wfDir, { withFileTypes: true })) {
      if (wfEntry.isFile() && wfEntry.name.endsWith(".md")) {
        out.push({
          skill: skillEntry.name,
          file: wfEntry.name,
          fullPath: path.join(wfDir, wfEntry.name),
        });
      }
    }
  }
  return out;
}

// Parse a phase_transitions string like
// "idle → research → triaging | research (resume) → triaging"
// into adjacent (from, to) pairs. The pipe `|` separates alternative paths.
// Annotations like "(resume)" are stripped. Multi-targets like
// "sprinting|complete" within a path are expanded into multiple pairs.
function parsePhaseTransitions(s) {
  if (!s) return [];
  const pairs = [];
  // Split on top-level " | " (between alternative chains). A simple split
  // works because we expand "sprinting|complete" multi-targets separately
  // below (they have no surrounding spaces in the canonical form, so the
  // " | " separator is unambiguous).
  const chains = s.split(/\s+\|\s+/);
  for (const chain of chains) {
    // Strip "(resume)" / "(...)" annotations and "[routing]" / "[...]"
    // documentation placeholders (the latter mean "wherever the next
    // skill routes to" — not literal phase names).
    const cleaned = chain
      .replace(/\s*\([^)]*\)/g, " ")
      .replace(/\s*\[[^\]]*\]/g, " ")
      .trim();
    // Split on the unicode arrow plus ASCII fallback.
    const phases = cleaned.split(/\s*(?:→|->|to)\s*/).map((p) => p.trim()).filter(Boolean);
    // For each "phase" segment, split on `|` to handle multi-targets like
    // "sprinting|complete" — produces multiple from→to pairs from one chain.
    for (let i = 0; i < phases.length - 1; i++) {
      const fromOptions = phases[i].split("|").map((p) => p.trim()).filter(Boolean);
      const toOptions = phases[i + 1].split("|").map((p) => p.trim()).filter(Boolean);
      for (const fromP of fromOptions) {
        for (const toP of toOptions) {
          pairs.push({ from: fromP, to: toP });
        }
      }
    }
  }
  return pairs;
}

describe("workflow phase_transitions match references/transitions.yaml", () => {
  const { validPhases, transitionPairs } = loadCanonicalTransitions();
  const workflows = discoverWorkflows();

  for (const { skill, file, fullPath } of workflows) {
    const content = fs.readFileSync(fullPath, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm) {
      it(`${skill}/${file} — has frontmatter`, () => {
        assert.fail("workflow markdown must declare YAML frontmatter");
      });
      continue;
    }
    if (fm.status === "archived") {
      // Skip archived workflows — intentionally non-canonical.
      continue;
    }
    const pairs = parsePhaseTransitions(fm.phase_transitions || "");

    it(`${skill}/${file} — every (from→to) pair exists in transitions.yaml`, () => {
      assert.ok(pairs.length > 0, `${skill}/${file} declares no phase_transitions`);
      const missing = [];
      for (const { from, to } of pairs) {
        const key = `${from}→${to}`;
        if (!transitionPairs.has(key)) {
          missing.push(key);
        }
      }
      assert.equal(
        missing.length,
        0,
        `${skill}/${file} phase_transitions references undefined transitions: ${missing.join(", ")}. ` +
        `If a transition is missing intentionally, mark the workflow status: archived in frontmatter.`
      );
    });

    it(`${skill}/${file} — every phase named in phase_transitions is a known phase`, () => {
      for (const { from, to } of pairs) {
        assert.ok(validPhases.has(from), `unknown phase '${from}' in ${skill}/${file}`);
        assert.ok(validPhases.has(to), `unknown phase '${to}' in ${skill}/${file}`);
      }
    });
  }
});
