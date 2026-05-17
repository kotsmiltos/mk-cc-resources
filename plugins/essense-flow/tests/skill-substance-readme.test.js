// skill-substance-readme.test.js — T-ENF-4 (v0.13.3) per 2026-05-17 v0.13.3
// closure-reopening decision in redesign/06-decisions.md.
//
// Plugin ships only a subset of the 9-file skill-substance set (3 of 9:
// architect, review, verify — the dispatch-substance-rule skills per
// closure-plan SPEC DD-2 / D-Sprint10-5 lens-side mirror). The other 6
// substance files live in the parallel governance workspace at
// essense-flow-re-imagined/redesign/skill-substance/. Future-Claude
// reading the plugin directory cold cannot derive this rationale from
// the bare file listing.
//
// This test enforces: if plugins/essense-flow/skill-substance/ contains
// any *.md substance file, README.md must be present explaining the
// subset rationale. README presence is the discoverability gate.
//
// Read this before doing anything:
//   See `references/principles.md` `## Read This Before Doing Anything`
//   (canonical source per v0.13.3 consolidation).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const SKILL_SUBSTANCE_DIR = join(PLUGIN_ROOT, "skill-substance");
const README_PATH = join(SKILL_SUBSTANCE_DIR, "README.md");

test("T-ENF-4: skill-substance/ directory with any substance file MUST carry README.md explaining subset", async () => {
  // Fail-Soft: if directory doesn't exist at all, nothing to enforce.
  if (!existsSync(SKILL_SUBSTANCE_DIR)) {
    process.stderr.write(
      `T-ENF-4 note: ${SKILL_SUBSTANCE_DIR} does not exist; nothing to enforce (Fail-Soft).\n`,
    );
    return;
  }

  const entries = await readdir(SKILL_SUBSTANCE_DIR);
  const substanceFiles = entries.filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );

  // If no substance files present, README is not required.
  if (substanceFiles.length === 0) {
    return;
  }

  // Substance files present → README required.
  assert.ok(
    existsSync(README_PATH),
    `T-ENF-4: skill-substance/ contains ${substanceFiles.length} substance file(s) [${substanceFiles.join(", ")}] but README.md is absent. Future-Claude reading plugin directory cold cannot derive the subset rationale (why only ${substanceFiles.length} of the canonical 9-file set ship). Author skill-substance/README.md naming which skills ship + why + where the full set lives.`,
  );

  // README must mention the canonical rationale anchors so it's not just an
  // empty stub. Verify it cites the closure-plan SPEC DD-2 + names the
  // redesign workspace location of the full set.
  const readme = await readFile(README_PATH, "utf8");
  const requiredAnchors = [
    "closure-plan SPEC DD-2",
    "essense-flow-re-imagined/redesign/skill-substance",
  ];
  for (const anchor of requiredAnchors) {
    assert.ok(
      readme.includes(anchor),
      `T-ENF-4: skill-substance/README.md must reference '${anchor}' to anchor the subset rationale; absent.`,
    );
  }
});
