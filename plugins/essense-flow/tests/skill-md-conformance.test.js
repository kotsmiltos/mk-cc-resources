"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");

/**
 * Parse YAML frontmatter from a markdown document.
 * Returns key-value object or null if no frontmatter block found.
 * Normalizes CRLF to LF so files with Windows line endings are handled.
 */
function parseFrontmatter(rawContent) {
  // Normalize line endings before matching — files may have CRLF on Windows
  const content = rawContent.replace(/\r\n/g, "\n");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const lines = match[1].split("\n");
  const result = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) result[key.trim()] = rest.join(":").trim();
  }
  return result;
}

/**
 * Extract function names from the ## Scripts section of a SKILL.md.
 * Only captures names that appear as backtick-wrapped function calls
 * (i.e., `funcName(` pattern) — this avoids false matches on file
 * path segments and prose words that happen to follow a bullet.
 */
function extractScriptFunctions(content) {
  const section = content.match(/##\s*Scripts([\s\S]*?)(?=\n##|$)/i);
  if (!section) return [];
  // Match only `funcName(` patterns — the opening paren confirms it's a call site
  return [...section[1].matchAll(/`(\w+)\s*\(/g)].map((m) => m[1]);
}

/**
 * Extract E_XXX error code tokens referenced in the document.
 */
function extractErrorCodes(content) {
  return [...content.matchAll(/\bE_[A-Z_]+\b/g)].map((m) => m[0]);
}

// Collect all skill directories that contain a SKILL.md
const skillDirs = fs
  .readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({
    name: d.name,
    skillMdPath: path.join(SKILLS_DIR, d.name, "SKILL.md"),
  }))
  .filter(({ skillMdPath }) => fs.existsSync(skillMdPath));

// Build the set of valid error codes from lib/errors.js.
// The module exports { ERRORS, formatError, formatRecovery, makeError };
// ERRORS is the catalog object whose keys are the E_XXXX codes.
const errorsModule = require("../lib/errors");
const errorCatalog = errorsModule.ERRORS || {};
const ERROR_CODES = new Set(
  Object.keys(errorCatalog).filter((k) => k.startsWith("E_"))
);

// Read constants source once — used to verify numeric thresholds are named
const constantsSrc = fs.readFileSync(
  path.join(ROOT, "lib", "constants.js"),
  "utf8"
);

describe("SKILL.md conformance", () => {
  for (const { name, skillMdPath } of skillDirs) {
    const content = fs.readFileSync(skillMdPath, "utf8");

    describe(`skills/${name}`, () => {
      // Assertion 1: frontmatter completeness
      it("frontmatter has required fields", () => {
        const fm = parseFrontmatter(content);
        assert.ok(fm, "SKILL.md must have YAML frontmatter");
        for (const field of ["name", "description", "version", "schema_version"]) {
          assert.ok(
            fm[field] && fm[field].length > 0,
            `frontmatter missing or empty: ${field}`
          );
        }
      });

      // Assertion 2: listed function names are actually exported by the runner
      it("listed script functions are exported", () => {
        const fns = extractScriptFunctions(content);
        // Skip gracefully when no functions are listed in ## Scripts
        if (fns.length === 0) return;

        const runnerPath = path.join(
          SKILLS_DIR,
          name,
          "scripts",
          `${name}-runner.js`
        );
        // Skip when no runner file exists (e.g. skill uses lib modules directly)
        if (!fs.existsSync(runnerPath)) return;

        const mod = require(runnerPath);
        for (const fn of fns) {
          assert.strictEqual(
            typeof mod[fn],
            "function",
            `${name}-runner.js must export function: ${fn}`
          );
        }
      });

      // Assertion 3: numeric thresholds use named constants, not magic numbers.
      // The pattern matches a number adjacent to a threshold-related keyword on
      // the same line. Numbers 0 and 1 are universally safe and excluded.
      // List-item numbers (e.g. "7. **Acceptable") are excluded by requiring
      // the number to NOT be followed by a period+space before the keyword.
      it("numeric thresholds in rules/constraints use named constants", () => {
        // Matches: <number> <up to 40 chars on same line> <threshold word>
        // Excludes ordered-list markers like "7. **Acceptable limitation**" by
        // requiring that the number is not immediately followed by ". " (OL syntax).
        const thresholdPattern =
          /\b(\d+)(?!\.\s)\b[^\n]{0,40}(?:ceiling|limit|max|min|threshold|cap)/gi;
        const matches = [...content.matchAll(thresholdPattern)];
        for (const m of matches) {
          const num = m[1];
          // 0 and 1 are universal identity/off values — not magic numbers
          if (num === "0" || num === "1") continue;
          assert.ok(
            constantsSrc.includes(num),
            `Threshold value ${num} in skills/${name}/SKILL.md has no corresponding constant in lib/constants.js (context: "${m[0].trim()}")`
          );
        }
      });

      // Assertion 4: every E_XXXX code referenced in the doc exists in errors.js
      it("referenced error codes exist in lib/errors.js", () => {
        const codes = extractErrorCodes(content);
        for (const code of codes) {
          assert.ok(
            ERROR_CODES.has(code),
            `Error code ${code} in skills/${name}/SKILL.md not found in lib/errors.js`
          );
        }
      });
    });
  }
});
