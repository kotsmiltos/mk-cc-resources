"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");
const { STALE_THRESHOLD_MS } = require("../../../lib/constants");

// ── Arg parsing ──────────────────────────────────────────────────────────────

const FLAG_APPLY = "--apply";
const FLAG_JSON  = "--json";

const args     = process.argv.slice(2);
const applyFix = args.includes(FLAG_APPLY);
const emitJson = args.includes(FLAG_JSON);

// ── Pipeline location ─────────────────────────────────────────────────────────

const pipelineDir = paths.findPipelineDir(process.cwd());
if (!pipelineDir) {
  process.stderr.write("Pipeline not initialized.\n");
  process.exit(0);
}

// ── Load state ────────────────────────────────────────────────────────────────

const statePath = path.join(pipelineDir, "state.yaml");
// Treat unreadable state as empty object — repair can still check lock / structural issues
let state = yamlIO.safeReadWithFallback(statePath, {});
if (!state || typeof state !== "object") state = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the on-disk sprint directory for sprint number N.
 * The project uses un-padded names (sprint-1) but lib/paths uses zero-padded (sprint-01).
 * We try un-padded first, then zero-padded, then return the un-padded path (for creation).
 *
 * @param {number} n - sprint number (1-based)
 * @returns {string} absolute path to the sprint directory
 */
function resolveSprintDir(n) {
  const unpadded = path.join(pipelineDir, "sprints", `sprint-${n}`);
  const padded   = path.join(pipelineDir, "sprints", `sprint-${String(n).padStart(2, "0")}`);
  if (fs.existsSync(unpadded)) return unpadded;
  if (fs.existsSync(padded))   return padded;
  // Fallback: return the un-padded path for absence checks
  return unpadded;
}

/**
 * Read all YAML files in a directory and return the parsed objects.
 * Returns [] if the directory does not exist.
 *
 * @param {string} dirPath - absolute path to directory
 * @returns {Array<object>}
 */
function readYamlDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
  return files.map(f => yamlIO.safeReadWithFallback(path.join(dirPath, f), {})).filter(Boolean);
}

// ── Run the 5 repair checks ───────────────────────────────────────────────────

const issues = [];
const pipeline = (state && state.pipeline) || {};
const phase    = pipeline.phase || state.phase || null;
const sprint   = pipeline.sprint || state.sprint || null;

// ── Case 1: reviewing but no QA-REPORT ───────────────────────────────────────
// Phase claims "reviewing" for sprint N but QA-REPORT.md is absent — state is
// stuck; the review phase already concluded (or never wrote the artifact).
// Safe recovery: back off to sprint-complete so /review can be re-triggered.
if (phase === "reviewing" && sprint != null) {
  const spDir    = resolveSprintDir(Number(sprint));
  const qaReport = path.join(spDir, "QA-REPORT.md");
  if (!fs.existsSync(qaReport)) {
    const issue = {
      case:        1,
      description: `Phase is "reviewing" for sprint ${sprint} but QA-REPORT.md is absent at ${qaReport}`,
      action:      applyFix ? 'Set pipeline.phase → "sprint-complete"' : 'Would set pipeline.phase → "sprint-complete"',
    };
    issues.push(issue);
    if (applyFix) {
      const next = { ...state, pipeline: { ...pipeline, phase: "sprint-complete" } };
      yamlIO.safeWrite(statePath, next);
      // Reload state for subsequent checks in same run
      state = next;
      Object.assign(pipeline, next.pipeline);
    }
  }
}

// ── Case 2: triaging but TRIAGE-REPORT.md absent ─────────────────────────────
// The triage phase was entered but the report was never produced — revert to
// "research" so /triage can be re-run cleanly.
const triageReportPath = path.join(pipelineDir, "triage", "TRIAGE-REPORT.md");
if (phase === "triaging" && !fs.existsSync(triageReportPath)) {
  const issue = {
    case:        2,
    description: `Phase is "triaging" but TRIAGE-REPORT.md is absent at ${triageReportPath}`,
    action:      applyFix ? 'Set pipeline.phase → "research"' : 'Would set pipeline.phase → "research"',
  };
  issues.push(issue);
  if (applyFix) {
    const next = { ...state, pipeline: { ...pipeline, phase: "research" } };
    yamlIO.safeWrite(statePath, next);
    state = next;
    Object.assign(pipeline, next.pipeline);
  }
}

// ── Case 3: research phase but REQ.md absent ─────────────────────────────────
// Phase is "research" but the requirements document it should produce is gone —
// revert to "idle" so the pipeline can be cleanly re-initialized.
const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
if (phase === "research" && !fs.existsSync(reqPath)) {
  const issue = {
    case:        3,
    description: `Phase is "research" but REQ.md is absent at ${reqPath}`,
    action:      applyFix ? 'Set pipeline.phase → "idle"' : 'Would set pipeline.phase → "idle"',
  };
  issues.push(issue);
  if (applyFix) {
    const next = { ...state, pipeline: { ...pipeline, phase: "idle" } };
    yamlIO.safeWrite(statePath, next);
    state = next;
    Object.assign(pipeline, next.pipeline);
  }
}

// ── Case 4: stale lock file ───────────────────────────────────────────────────
// A lock file that hasn't received a heartbeat within STALE_THRESHOLD_MS means
// the agent that claimed the lock has died; removing it unblocks future runs.
const lockPath = path.join(pipelineDir, ".lock");
if (fs.existsSync(lockPath)) {
  const lock = yamlIO.safeReadWithFallback(lockPath, {});
  const heartbeat = lock && lock.last_heartbeat ? new Date(lock.last_heartbeat).getTime() : NaN;
  const isStale   = !isNaN(heartbeat) && (Date.now() - heartbeat) > STALE_THRESHOLD_MS;
  if (isStale) {
    const ageMs = Date.now() - heartbeat;
    const issue = {
      case:        4,
      description: `Lock file is stale (last_heartbeat ${lock.last_heartbeat}, age ${Math.round(ageMs / 1000)}s > threshold ${STALE_THRESHOLD_MS / 1000}s)`,
      action:      applyFix ? "Deleted stale lock file" : "Would delete stale lock file",
    };
    issues.push(issue);
    if (applyFix) {
      fs.unlinkSync(lockPath);
    }
  }
}

// ── Case 5: building sprint with all tasks complete ───────────────────────────
// Sprint N shows status "building" but every completion record has status:complete
// and the count matches tasks_total — the phase stuck on "building" without
// advancing; mark it done.
const sprints = (state && state.sprints) || {};
for (const [sprintKey, sprintData] of Object.entries(sprints)) {
  if (!sprintData || sprintData.status !== "building") continue;

  const tasksTotal = Number(sprintData.tasks_total);
  if (!Number.isFinite(tasksTotal) || tasksTotal <= 0) continue;

  // Extract sprint number from key (sprint-1, sprint-01, etc.)
  const sprintNumMatch = sprintKey.match(/sprint-(\d+)$/i);
  if (!sprintNumMatch) continue;
  const sprintNum = Number(sprintNumMatch[1]);

  const spDir          = resolveSprintDir(sprintNum);
  const completionDir  = path.join(spDir, "completion");
  const completionRecs = readYamlDir(completionDir);

  const allComplete = completionRecs.length === tasksTotal &&
                      completionRecs.every(r => r.status === "complete");

  if (allComplete) {
    const issue = {
      case:        5,
      description: `Sprint ${sprintNum} status is "building" but all ${tasksTotal} completion records have status:complete`,
      action:      applyFix
        ? `Set ${sprintKey}.status → "complete", pipeline.phase → "sprint-complete", tasks_complete = ${tasksTotal}`
        : `Would set ${sprintKey}.status → "complete", pipeline.phase → "sprint-complete", tasks_complete = ${tasksTotal}`,
    };
    issues.push(issue);

    if (applyFix) {
      const updatedSprints = {
        ...sprints,
        [sprintKey]: {
          ...sprintData,
          status:         "complete",
          tasks_complete: tasksTotal,
        },
      };
      const next = {
        ...state,
        pipeline: { ...pipeline, phase: "sprint-complete" },
        sprints:  updatedSprints,
      };
      yamlIO.safeWrite(statePath, next);
      state = next;
      Object.assign(pipeline, next.pipeline);
    }
  }
}

// ── Write REPAIR-REPORT.md ────────────────────────────────────────────────────

const repairDir    = path.join(pipelineDir, "repair");
const reportPath   = path.join(repairDir, "REPAIR-REPORT.md");
const timestamp    = new Date().toISOString();

if (!fs.existsSync(repairDir)) {
  fs.mkdirSync(repairDir, { recursive: true });
}

const reportLines = [
  "# REPAIR-REPORT",
  "",
  `timestamp: ${timestamp}`,
  `dry_run: ${!applyFix}`,
  `issues_found: ${issues.length}`,
  "",
  "## Issues",
  "",
];

if (issues.length === 0) {
  reportLines.push("No issues found.");
} else {
  for (const issue of issues) {
    reportLines.push(`- Case ${issue.case}: ${issue.description} → ${issue.action}`);
  }
}

reportLines.push("");

fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");

// ── Output ────────────────────────────────────────────────────────────────────

if (emitJson) {
  const result = {
    timestamp,
    dry_run:      !applyFix,
    issues_found: issues.length,
    issues,
    report_path:  reportPath,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} else {
  process.stdout.write(`REPAIR-REPORT written to ${reportPath}\n`);
  process.stdout.write(`dry_run: ${!applyFix}  |  issues_found: ${issues.length}\n`);
  if (issues.length > 0) {
    for (const issue of issues) {
      process.stdout.write(`  [Case ${issue.case}] ${issue.description}\n`);
      process.stdout.write(`           → ${issue.action}\n`);
    }
  } else {
    process.stdout.write("  No issues found.\n");
  }
}

process.exit(0);
