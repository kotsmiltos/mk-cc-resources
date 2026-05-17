// ledger-compaction.test.js — T-ENF-3 (v0.13.3) per 2026-05-17 v0.13.3
// closure-reopening decision in redesign/06-decisions.md.
//
// Anthropic canonical context-engineering guidance T7: compaction.
// Summarize history preserving architectural decisions while discarding
// redundant outputs. Plugin governance ledger (redesign/SURPRISES.md +
// redesign/06-decisions.md) grew append-only with zero compaction
// discipline pre-v0.13.3 — SURPRISES at 2933+ lines, 06-decisions at
// 1700+ lines, both pre-loaded by every future-Claude session that
// reads STATE.md cold.
//
// This test enforces: any H2 entry with Status `resolved | ratified |
// complete` AND date >COMPACTION_THRESHOLD_DAYS days old must be archived
// (moved to SURPRISES-ARCHIVE.md or 06-decisions-ARCHIVE.md sibling).
// V1 iteration: test FAILS with archive-list; auto-archive script is
// future-increment. Fail-Soft: if redesign workspace is absent, test
// skips with stderr note (other consumers don't need redesign/).
//
// Read this before doing anything:
//   See `references/principles.md` `## Read This Before Doing Anything`
//   (canonical source per v0.13.3 consolidation).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

// Resolve redesign workspace. Plugin lives at
// <root>/mk-cc-resources/plugins/essense-flow/; redesign lives at
// <root>/essense-flow-re-imagined/redesign/. Walk up from plugin root.
const REDESIGN_DIR = resolve(PLUGIN_ROOT, "../../../essense-flow-re-imagined/redesign");
const SURPRISES_PATH = join(REDESIGN_DIR, "SURPRISES.md");
const DECISIONS_PATH = join(REDESIGN_DIR, "06-decisions.md");

const COMPACTION_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Today: read from runtime; future test runs use the current date for
// threshold comparison. ISO date format. Test is deterministic per the
// system clock; do not pin to a fixed date (would falsely pass forever).
const NOW = new Date();

async function readNormalized(path) {
  const raw = await readFile(path, "utf8");
  return raw.replace(/\r\n/g, "\n");
}

// Extract H2 sections from a markdown doc. Each section starts at a
// `## ` line and ends at the next `## ` or end of file. Returns array of
// { heading, body, lineNumber }.
function extractH2Sections(raw) {
  const lines = raw.split("\n");
  const sections = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) {
      if (current) sections.push(current);
      current = { heading: line, body: [], lineNumber: i + 1 };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// Extract ISO date from H2 heading. Convention: `## YYYY-MM-DD ...`
// (SURPRISES.md + 06-decisions.md both follow this). Returns Date or null.
function extractIsoDateFromHeading(heading) {
  const m = heading.match(/##\s+(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(m[1] + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

// Detect resolved/ratified/complete status in section body. Pattern:
// `**Status:**` line carrying one of the resolved-class keywords.
// Tolerates `resolved 2026-05-17 (v0.13.2 shipped...)` etc.
function isResolvedStatus(body) {
  const bodyText = body.join("\n");
  const m = bodyText.match(/\*\*Status:\*\*\s+(\S+)/);
  if (!m) return false;
  const status = m[1].toLowerCase();
  return status === "resolved" || status === "ratified" || status === "complete";
}

function daysSince(date) {
  return Math.floor((NOW.getTime() - date.getTime()) / MS_PER_DAY);
}

test("T-ENF-3: governance ledger entries with status resolved/ratified/complete + age >30d must be archived", async () => {
  // Fail-Soft: redesign workspace is optional (other plugin consumers don't
  // have it). Skip with stderr if absent.
  if (!existsSync(REDESIGN_DIR)) {
    process.stderr.write(
      `T-ENF-3 note: redesign workspace at ${REDESIGN_DIR} does not exist; ledger-compaction test skipped (Fail-Soft).\n`,
    );
    return;
  }

  const archiveCandidates = [];

  for (const ledgerPath of [SURPRISES_PATH, DECISIONS_PATH]) {
    if (!existsSync(ledgerPath)) {
      process.stderr.write(
        `T-ENF-3 note: ${ledgerPath} not on disk; skipped this ledger.\n`,
      );
      continue;
    }
    const raw = await readNormalized(ledgerPath);
    const sections = extractH2Sections(raw);
    for (const sec of sections) {
      const date = extractIsoDateFromHeading(sec.heading);
      if (!date) continue;
      if (!isResolvedStatus(sec.body)) continue;
      const age = daysSince(date);
      if (age > COMPACTION_THRESHOLD_DAYS) {
        archiveCandidates.push({
          ledger: ledgerPath.split(/[\\/]/).pop(),
          line: sec.lineNumber,
          age_days: age,
          heading: sec.heading.trim(),
        });
      }
    }
  }

  if (archiveCandidates.length > 0) {
    const list = archiveCandidates
      .map((c) => `  ${c.ledger}:${c.line}  [age=${c.age_days}d]  ${c.heading}`)
      .join("\n");
    assert.fail(
      `T-ENF-3: ${archiveCandidates.length} ledger entries older than ${COMPACTION_THRESHOLD_DAYS} days are marked resolved/ratified/complete + should be archived:\n${list}\n\nForward implication: V1 of this test fails with the list; auto-archive script (move section bodies to SURPRISES-ARCHIVE.md / 06-decisions-ARCHIVE.md sibling preserving evidence) is future-increment. To unblock CI when this fires: either author the archive sibling + move the entries, OR raise COMPACTION_THRESHOLD_DAYS in this test (require closed-decision justification).`,
    );
  }
});
