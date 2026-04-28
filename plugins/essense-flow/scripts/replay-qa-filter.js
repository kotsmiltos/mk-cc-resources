#!/usr/bin/env node
"use strict";

/**
 * Replay Phase A noise filter against historical QA-REPORT.md files.
 *
 * Purpose: validate the empirical claim that ~80% of "critical" findings in
 * sprint-6/7/8 reviews are noise (positives, fix-recs, restatements). Reads
 * existing .pipeline/reviews/sprint-N/QA-REPORT.md, parses bullets per
 * severity section, runs them through filterFindings, and emits a comparison
 * report.
 *
 * Usage:
 *   node scripts/replay-qa-filter.js [--write] [--pipeline=<dir>]
 *
 *   --write     write report to .planning/qa-filter-replay.md (default: stdout)
 *   --pipeline  path to .pipeline directory (default: .pipeline next to cwd)
 *
 * Verifiable check: per-sprint critical-tier drop rate should exceed 60% on
 * the sprints whose reports are noisy. If drop rate is consistently low,
 * filter is over-conservative; if high, the noise hypothesis is confirmed.
 */

const fs = require("fs");
const path = require("path");

const { filterFindings } = require("../skills/review/scripts/review-runner");

const SEVERITY_HEADER_RE = /^##\s+(Critical|High|Medium|Low)\s*$/i;

function parseQAReportSections(content) {
  // Returns map { critical: [bullets], high: [], medium: [], low: [] }
  const lines = content.split(/\r?\n/);
  const sections = { critical: [], high: [], medium: [], low: [] };
  let current = null;

  for (const line of lines) {
    const m = line.match(SEVERITY_HEADER_RE);
    if (m) {
      current = m[1].toLowerCase();
      continue;
    }
    if (!current) continue;
    // Stop at next ## heading that isn't a severity heading
    if (/^##\s+/.test(line) && !SEVERITY_HEADER_RE.test(line)) {
      current = null;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bullet = trimmed.replace(/^[-*]\s*/, "").trim();
      if (bullet.length > 0) sections[current].push(bullet);
    }
  }
  return sections;
}

function replaySprint(sprintDir) {
  const reportPath = path.join(sprintDir, "QA-REPORT.md");
  if (!fs.existsSync(reportPath)) return null;
  const content = fs.readFileSync(reportPath, "utf8");

  const sections = parseQAReportSections(content);
  const result = {};

  for (const sev of ["critical", "high", "medium", "low"]) {
    const bullets = sections[sev];
    const before = bullets.length;
    if (before === 0) {
      result[sev] = { before: 0, after: 0, dropped: { positives: 0, fixRecs: 0, dupes: 0 } };
      continue;
    }
    // Wrap bullets as raw items so filterFindings can run cross-bullet dedup
    const rawItems = bullets.map((text) => ({
      text,
      source: "replay",
      perspective: "replay",
      section: "findings",
    }));
    const { kept, dropped } = filterFindings(rawItems);
    result[sev] = { before, after: kept.length, dropped };
  }

  return result;
}

function discoverSprints(pipelineDir) {
  const reviewsDir = path.join(pipelineDir, "reviews");
  if (!fs.existsSync(reviewsDir)) return [];
  return fs.readdirSync(reviewsDir)
    .filter((name) => /^sprint-\d+$/.test(name))
    .sort()
    .map((name) => ({ name, path: path.join(reviewsDir, name) }));
}

function formatReport(perSprint) {
  const lines = [];
  lines.push("# QA Filter Replay Report");
  lines.push("");
  lines.push("Phase A noise filter applied retroactively to historical QA-REPORTs.");
  lines.push("");
  lines.push("## Per-Sprint Summary");
  lines.push("");
  lines.push("| Sprint | Tier | Before | After | Dropped (P/F/D) | Drop % |");
  lines.push("|--------|------|--------|-------|-----------------|--------|");

  let totalBefore = 0;
  let totalAfter = 0;

  for (const { sprint, result } of perSprint) {
    if (!result) continue;
    for (const tier of ["critical", "high", "medium", "low"]) {
      const r = result[tier];
      if (r.before === 0) continue;
      const pct = ((r.before - r.after) / r.before * 100).toFixed(0);
      const dropStr = `${r.dropped.positives}/${r.dropped.fixRecs}/${r.dropped.dupes}`;
      lines.push(`| ${sprint} | ${tier} | ${r.before} | ${r.after} | ${dropStr} | ${pct}% |`);
      totalBefore += r.before;
      totalAfter += r.after;
    }
  }

  const overallPct = totalBefore > 0 ? ((totalBefore - totalAfter) / totalBefore * 100).toFixed(0) : "0";
  lines.push("");
  lines.push("## Overall");
  lines.push("");
  lines.push(`- **Bullets analyzed:** ${totalBefore}`);
  lines.push(`- **Kept after filter:** ${totalAfter}`);
  lines.push(`- **Dropped:** ${totalBefore - totalAfter} (${overallPct}%)`);
  lines.push("");
  lines.push("Legend: Dropped (P/F/D) = positives / fix-recs / dupes.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const writeFlag = args.includes("--write");
  const pipelineArg = args.find((a) => a.startsWith("--pipeline="));
  const pipelineDir = pipelineArg
    ? pipelineArg.slice("--pipeline=".length)
    : path.join(process.cwd(), ".pipeline");

  const sprints = discoverSprints(pipelineDir);
  if (sprints.length === 0) {
    process.stderr.write(`No sprint review reports found under ${pipelineDir}/reviews\n`);
    process.exit(1);
  }

  const perSprint = sprints.map(({ name, path: p }) => ({
    sprint: name,
    result: replaySprint(p),
  }));

  const report = formatReport(perSprint);

  if (writeFlag) {
    const outDir = path.join(process.cwd(), ".planning");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "qa-filter-replay.md");
    fs.writeFileSync(outPath, report, "utf8");
    process.stdout.write(`Report written to ${outPath}\n`);
  } else {
    process.stdout.write(report);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseQAReportSections, replaySprint, discoverSprints };
