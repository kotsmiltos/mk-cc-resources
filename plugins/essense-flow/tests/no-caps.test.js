// no-caps.test.js — INST-13 enforcement.
//
// Greps lib/, hooks/, skills/ for forbidden cap-style patterns:
//   MAX_CONCURRENT_*, MAX_AGENTS, MAX_WAVE_*, MIN_WAVE_*,
//   concurrencyCap, agentCap, waveCap, hard numeric "if N > X reject"
//
// Quality-gate thresholds (e.g. evidence.min_quote_length) are allowlisted
// because they police evidence policy, not throughput. Allowlist requires
// an explicit "// no-caps:allow <reason>" comment on the line.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const SCAN_DIRS = ["lib", "hooks/scripts", "skills"].map((d) => join(PLUGIN_ROOT, d));

// Patterns that indicate a fail-closed cap. Case-insensitive.
const FORBIDDEN = [
  /\bMAX_CONCURRENT[_A-Z]*\b/i,
  /\bMAX_AGENTS\b/i,
  /\bMAX_WAVE_(SIZE|COUNT|CAP)\b/i,
  /\bMIN_WAVE_CAP\b/i,
  /\bconcurrencyCap\b/,
  /\bagentCap\b/,
  /\bwaveCap\b/,
  // "if X > N return ok: false / refuse / reject" patterns are too prose-like
  // for a regex to catch reliably. The named-constant patterns above are the
  // authoritative gate. Reviews catch the prose violations.
];

const ALLOWLIST_MARKER = "no-caps:allow";

async function* walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkFiles(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

async function scanFile(path) {
  const ext = path.split(".").pop().toLowerCase();
  if (!["js", "md", "yaml", "yml", "json"].includes(ext)) return [];
  const raw = await readFile(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(ALLOWLIST_MARKER)) continue;
    for (const pat of FORBIDDEN) {
      if (pat.test(line)) {
        hits.push({ path, line: i + 1, content: line.trim(), pattern: pat.source });
      }
    }
  }
  return hits;
}

test("no-caps: scan lib/, hooks/scripts/, skills/ for forbidden cap patterns", async () => {
  const allHits = [];
  for (const d of SCAN_DIRS) {
    let exists = true;
    try {
      await stat(d);
    } catch {
      exists = false;
    }
    if (!exists) continue;
    for await (const f of walkFiles(d)) {
      // Skip this audit file itself — it legitimately names the patterns.
      if (f.endsWith("no-caps.test.js")) continue;
      const hits = await scanFile(f);
      allHits.push(...hits);
    }
  }
  if (allHits.length > 0) {
    const detail = allHits
      .map((h) => `  ${h.path}:${h.line} matched /${h.pattern}/\n    ${h.content}`)
      .join("\n");
    assert.fail(
      `INST-13 violation — ${allHits.length} forbidden cap-pattern hit(s):\n${detail}\n\n` +
        `Either remove the cap, or add a "// no-caps:allow <reason>" trailing comment if it is a documented quality-gate threshold.`,
    );
  }
});
