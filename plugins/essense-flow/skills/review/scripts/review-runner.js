"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const briefAssembly = require("../../../lib/brief-assembly");
const agentOutput = require("../../../lib/agent-output");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");

// Maximum review-build cycles per sprint before escalation to earlier phases
const MAX_REVIEW_CYCLES = 3;

// Review perspective agents — each examines the sprint from a distinct adversarial angle
const DEFAULT_REVIEW_PERSPECTIVES = [
  { id: "spec-compliance", role: "Specification Compliance Auditor", focus: "verify every task spec's acceptance criteria against built code" },
  { id: "edge-cases", role: "Edge Case Hunter", focus: "boundary conditions, error paths, unexpected inputs, race conditions" },
  { id: "integration", role: "Integration Analyst", focus: "cross-module interactions, interface contracts, data flow consistency" },
  { id: "requirements", role: "Requirements Traceability Auditor", focus: "verify FR-NNN and NFR-NNN from REQ.md are satisfied by built code" },
];

// Confidence tiers — ordered from strongest to weakest evidence
const CONFIDENCE_TIERS = ["CONFIRMED", "LIKELY", "SUSPECTED"];

// Severity levels — ordered from most to least impactful
const SEVERITY_LEVELS = ["critical", "high", "medium", "low"];

// Keywords used to infer confidence tier from finding text
const CONFIDENCE_KEYWORDS = {
  CONFIRMED: ["confirmed", "reproduced", "tested", "verified", "demonstrated", "crashes", "fails with"],
  LIKELY: ["likely", "strong evidence", "code shows", "analysis indicates", "code path leads to", "will fail"],
  SUSPECTED: ["suspected", "possible", "may", "might", "could", "unclear", "unable to verify", "needs investigation"],
};

// Keywords used to infer severity from finding text
const SEVERITY_KEYWORDS = {
  critical: ["critical", "crash", "data loss", "security vulnerability", "blocks", "must fix", "corruption"],
  high: ["high", "significant", "breaks", "incorrect behavior", "should fix", "wrong result"],
  medium: ["medium", "inconsistent", "consider", "improvement", "suboptimal", "refactor"],
  low: ["low", "minor", "cosmetic", "nice to have", "style", "naming"],
};

// Ratio cap: SUSPECTED findings limited to this multiple of CONFIRMED count.
// Rationale: keeps speculative findings proportional to verified ones,
// preventing noise flooding in QA reports.
const SUSPECTED_CAP_RATIO = 2;

// Path to the adversarial brief template relative to plugin root
const BRIEF_TEMPLATE_REL = "skills/review/templates/adversarial-brief.md";

/**
 * Generate a unique brief ID for a review perspective.
 *
 * @param {string} perspectiveId — perspective identifier
 * @returns {string}
 */
function generateBriefId(perspectiveId) {
  const ts = Date.now().toString(36);
  return `rev-${perspectiveId}-${ts}`;
}

/**
 * Assemble review briefs for each perspective agent.
 *
 * Each brief includes task specs, completion evidence, built file paths,
 * and SPEC.md content (if it exists) so the agent has full context for review.
 *
 * @param {number} sprintNumber — the completed sprint number
 * @param {string} taskSpecs — concatenated task spec contents
 * @param {string} completionRecords — concatenated completion record contents
 * @param {string|null} specContent — SPEC.md content (null if no spec exists)
 * @param {string} pluginRoot — absolute path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, briefs?: Array<{ perspectiveId: string, agentId: string, briefId: string, brief: string }>, error?: string }}
 */
function assembleReviewBriefs(sprintNumber, taskSpecs, completionRecords, specContent, pluginRoot, config) {
  if (!taskSpecs || typeof taskSpecs !== "string" || !taskSpecs.trim()) {
    return { ok: false, error: "Task specs content is required and must be a non-empty string" };
  }

  if (!completionRecords || typeof completionRecords !== "string" || !completionRecords.trim()) {
    return { ok: false, error: "Completion records content is required and must be a non-empty string" };
  }

  const templatePath = path.join(pluginRoot, BRIEF_TEMPLATE_REL);
  if (!fs.existsSync(templatePath)) {
    return { ok: false, error: `Brief template not found: ${templatePath}` };
  }

  const briefs = [];

  for (let i = 0; i < DEFAULT_REVIEW_PERSPECTIVES.length; i++) {
    const perspective = DEFAULT_REVIEW_PERSPECTIVES[i];
    const briefId = generateBriefId(perspective.id);
    const agentId = `review-${perspective.id}`;
    const timestamp = new Date().toISOString();

    // Extract built file paths from completion records for the agent to read
    const builtFiles = extractBuiltFilePaths(completionRecords);

    const bindings = {
      REVIEW_PERSPECTIVE: perspective.role,
      FOCUS_AREA: perspective.focus,
      TASK_SPECS: taskSpecs,
      COMPLETION_RECORDS: completionRecords,
      BUILT_FILES: builtFiles,
      SPEC_CONTENT: specContent || "(no SPEC.md available)",
      SPRINT_NUMBER: String(sprintNumber),
      SANDBOX_PATH: `.pipeline/reviews/sprint-${String(sprintNumber).padStart(2, "0")}/tests/`,
      BRIEF_ID: briefId,
      AGENT_ID: agentId,
      TIMESTAMP: timestamp,
    };

    // Build sections for budget checking
    const identity = `You are a ${perspective.role} performing adversarial review of Sprint ${sprintNumber}. Your sole concern is ${perspective.focus}.`;
    const context = taskSpecs + "\n" + completionRecords;

    const sections = {
      identity,
      context,
    };

    const result = briefAssembly.assembleBrief({
      templatePath,
      bindings,
      sections,
      metadata: {
        briefId,
        phase: "review",
        batchIndex: 0,
        agentIndex: i,
      },
      config,
    });

    if (!result.ok) {
      return { ok: false, error: `Brief assembly failed for ${perspective.id}: ${result.error}` };
    }

    briefs.push({
      perspectiveId: perspective.id,
      agentId,
      briefId,
      brief: result.brief,
    });
  }

  return { ok: true, briefs };
}

/**
 * Extract built file paths from completion records.
 * Looks for file paths in markdown list items and table cells.
 *
 * @param {string} completionRecords — raw completion record content
 * @returns {string} — newline-separated list of file paths found
 */
function extractBuiltFilePaths(completionRecords) {
  const paths = [];

  // Match paths that look like file references (contain / or \ and have extensions)
  const pathPattern = /(?:^|\s|`)((?:[\w./-]+\/)?[\w.-]+\.\w{1,10})(?:\s|$|`|,|\|)/gm;
  let match;
  while ((match = pathPattern.exec(completionRecords)) !== null) {
    const candidate = match[1].trim();
    // Filter out obvious non-paths
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (!paths.includes(candidate)) {
        paths.push(candidate);
      }
    }
  }

  return paths.length > 0 ? paths.map((p) => `- ${p}`).join("\n") : "(extract from completion records)";
}

/**
 * Parse raw outputs from review agents.
 *
 * @param {Array<{ perspectiveId: string, agentId: string, briefId: string, rawOutput: string }>} rawOutputs
 * @returns {{ ok: boolean, parsed?: Array<{ agentId: string, perspectiveId: string, briefId: string, payload: Object, meta: Object }>, failures?: Array<{ agentId: string, perspectiveId: string, failure: Object }> }}
 */
function parseReviewOutputs(rawOutputs) {
  const parsed = [];
  const failures = [];

  for (const { perspectiveId, agentId, briefId, rawOutput } of rawOutputs) {
    const result = agentOutput.parseOutput(rawOutput);

    if (result.ok) {
      parsed.push({
        agentId,
        perspectiveId,
        briefId,
        payload: result.payload,
        meta: result.meta,
        recovered: result.recovered || false,
      });
    } else {
      const failure = agentOutput.classifyFailure(rawOutput, result.error, {});
      failures.push({ agentId, perspectiveId, briefId, failure });
    }
  }

  return {
    ok: failures.length === 0,
    parsed,
    failures: failures.length > 0 ? failures : undefined,
  };
}

/**
 * Infer confidence tier from finding text using keyword matching.
 *
 * @param {string} text — finding text
 * @returns {string} — CONFIRMED, LIKELY, or SUSPECTED
 */
function inferConfidence(text) {
  const lower = text.toLowerCase();

  // Check tiers in order from strongest to weakest
  for (const tier of CONFIDENCE_TIERS) {
    if (CONFIDENCE_KEYWORDS[tier].some((kw) => lower.includes(kw))) {
      return tier;
    }
  }

  // Default: if the finding is specific (has file paths and line numbers), mark LIKELY;
  // otherwise SUSPECTED
  const hasFilePath = /[\w/\\]+\.\w{1,10}/.test(text);
  const hasLineNumber = /line\s+\d+|:\d+/.test(lower);
  return hasFilePath && hasLineNumber ? "LIKELY" : "SUSPECTED";
}

/**
 * Infer severity level from finding text using keyword matching.
 *
 * @param {string} text — finding text
 * @returns {string} — critical, high, medium, or low
 */
function inferSeverity(text) {
  const lower = text.toLowerCase();

  for (const level of SEVERITY_LEVELS) {
    if (SEVERITY_KEYWORDS[level].some((kw) => lower.includes(kw))) {
      return level;
    }
  }

  return "medium";
}

/**
 * Categorize findings from parsed review outputs by confidence tier and severity.
 *
 * Groups every finding into both a confidence tier (CONFIRMED, LIKELY, SUSPECTED)
 * and a severity bucket (critical, high, medium, low).
 *
 * @param {Array<{ agentId: string, perspectiveId: string, payload: Object }>} parsedOutputs
 * @returns {{ confirmed: Array, likely: Array, suspected: Array, bySeverity: { critical: Array, high: Array, medium: Array, low: Array } }}
 */
function categorizeFindings(parsedOutputs) {
  const byConfidence = { confirmed: [], likely: [], suspected: [] };
  const bySeverity = { critical: [], high: [], medium: [], low: [] };

  for (const output of parsedOutputs) {
    const { agentId, perspectiveId, payload } = output;
    if (!payload) continue;

    // Walk all payload sections and extract individual findings
    const findingSections = ["findings", "confirmed_findings", "likely_findings", "suspected_findings",
      "analysis", "risks", "issues", "bugs", "edge_cases", "compliance_gaps", "integration_issues"];

    for (const section of findingSections) {
      const content = payload[section];
      if (!content || typeof content !== "string") continue;

      // Split into individual items
      const items = content
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("1."))
        .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 0);

      for (const item of items) {
        // Determine confidence — section name may hint at it
        let confidence;
        if (section.includes("confirmed")) {
          confidence = "CONFIRMED";
        } else if (section.includes("likely")) {
          confidence = "LIKELY";
        } else if (section.includes("suspected")) {
          confidence = "SUSPECTED";
        } else {
          confidence = inferConfidence(item);
        }

        const severity = inferSeverity(item);

        const finding = {
          text: item,
          confidence,
          severity,
          source: agentId,
          perspective: perspectiveId,
          section,
        };

        // File into confidence tier
        const tierKey = confidence.toLowerCase();
        if (byConfidence[tierKey]) {
          byConfidence[tierKey].push(finding);
        } else {
          byConfidence.suspected.push(finding);
        }

        // File into severity bucket
        if (bySeverity[severity]) {
          bySeverity[severity].push(finding);
        } else {
          bySeverity.medium.push(finding);
        }
      }
    }
  }

  return {
    confirmed: byConfidence.confirmed,
    likely: byConfidence.likely,
    suspected: byConfidence.suspected,
    bySeverity,
  };
}

/**
 * Apply SUSPECTED finding cap proportional to CONFIRMED count.
 * Keeps the most severe SUSPECTED findings when truncating.
 *
 * @param {Object} categorized — output of categorizeFindings (has confirmed, likely, suspected arrays)
 * @returns {{ categorized: Object, suppressedCount: number }}
 */
function applySuspectedCap(categorized) {
  const confirmedCount = categorized.confirmed ? categorized.confirmed.length : 0;
  const suspectedList = categorized.suspected || [];
  const cap = confirmedCount * SUSPECTED_CAP_RATIO;

  if (suspectedList.length <= cap) {
    return { categorized, suppressedCount: 0 };
  }

  // Sort by severity (critical > high > medium > low) to keep most impactful
  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...suspectedList].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] !== undefined ? SEVERITY_ORDER[a.severity] : 4;
    const sb = SEVERITY_ORDER[b.severity] !== undefined ? SEVERITY_ORDER[b.severity] : 4;
    return sa - sb;
  });

  const suppressedCount = sorted.length - cap;
  categorized.suspected = sorted.slice(0, cap);
  return { categorized, suppressedCount };
}

/**
 * Generate QA-REPORT.md content from categorized findings.
 *
 * Verdict logic: FAIL if any CONFIRMED critical findings exist, otherwise PASS.
 *
 * @param {number} sprintNumber — completed sprint number
 * @param {{ confirmed: Array, likely: Array, suspected: Array, bySeverity: Object }} categorized
 * @param {Array<{ agentId: string, perspectiveId: string }>} parsedOutputs — for attribution
 * @param {number} [suppressedCount=0] — number of SUSPECTED findings suppressed by cap
 * @returns {string} — full QA-REPORT.md markdown content
 */
function generateQAReport(sprintNumber, categorized, parsedOutputs, suppressedCount) {
  // Verdict: FAIL only if CONFIRMED critical findings exist
  const confirmedCritical = categorized.confirmed.filter((f) => f.severity === "critical");
  const verdict = confirmedCritical.length > 0 ? "FAIL" : "PASS";

  const totalFindings =
    categorized.confirmed.length +
    categorized.likely.length +
    categorized.suspected.length;

  const lines = [];

  // YAML frontmatter
  lines.push("---");
  lines.push("artifact: qa-report");
  lines.push("schema_version: 1");
  lines.push(`sprint: ${sprintNumber}`);
  lines.push(`verdict: ${verdict}`);
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");

  // Title and summary
  lines.push(`# Sprint ${sprintNumber} QA Report`);
  lines.push("");
  lines.push(`**Verdict:** ${verdict}`);
  lines.push(`**Date:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Total findings:** ${totalFindings}`);
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("### By Confidence Tier");
  lines.push("");
  lines.push(`- **CONFIRMED:** ${categorized.confirmed.length}`);
  lines.push(`- **LIKELY:** ${categorized.likely.length}`);
  lines.push(`- **SUSPECTED:** ${categorized.suspected.length}`);
  lines.push("");
  lines.push("### By Severity");
  lines.push("");
  lines.push(`- **Critical:** ${categorized.bySeverity.critical.length}`);
  lines.push(`- **High:** ${categorized.bySeverity.high.length}`);
  lines.push(`- **Medium:** ${categorized.bySeverity.medium.length}`);
  lines.push(`- **Low:** ${categorized.bySeverity.low.length}`);
  lines.push("");

  // Confirmed Findings
  lines.push("## Confirmed Findings");
  lines.push("");
  if (categorized.confirmed.length === 0) {
    lines.push("No confirmed findings.");
  } else {
    for (const finding of categorized.confirmed) {
      lines.push(`### [${finding.severity.toUpperCase()}] ${extractFindingName(finding.text)}`);
      lines.push("");
      lines.push(`- **Confidence:** CONFIRMED`);
      lines.push(`- **Severity:** ${finding.severity}`);
      lines.push(`- **Source:** ${finding.source} (${finding.perspective})`);
      lines.push(`- **Detail:** ${finding.text}`);
      lines.push("");
    }
  }
  lines.push("");

  // Likely Findings
  lines.push("## Likely Findings");
  lines.push("");
  if (categorized.likely.length === 0) {
    lines.push("No likely findings.");
  } else {
    for (const finding of categorized.likely) {
      lines.push(`- **[${finding.severity.toUpperCase()}]** ${finding.text} _(source: ${finding.source})_`);
    }
  }
  lines.push("");

  // Suspected Findings
  lines.push("## Suspected Findings");
  lines.push("");
  if (categorized.suspected.length === 0) {
    lines.push("No suspected findings.");
  } else {
    for (const finding of categorized.suspected) {
      lines.push(`- **[${finding.severity.toUpperCase()}]** ${finding.text} _(source: ${finding.source})_`);
    }
  }
  lines.push("");

  if (suppressedCount > 0) {
    lines.push(`> **Note:** ${suppressedCount} SUSPECTED findings suppressed (cap: ${SUSPECTED_CAP_RATIO}x CONFIRMED count).`);
    lines.push("");
  }

  // Per-Perspective Attribution
  lines.push("## Per-Perspective Attribution");
  lines.push("");
  const byPerspective = {};
  const allFindings = [...categorized.confirmed, ...categorized.likely, ...categorized.suspected];
  for (const finding of allFindings) {
    const key = finding.perspective || finding.source;
    if (!byPerspective[key]) {
      byPerspective[key] = { confirmed: 0, likely: 0, suspected: 0 };
    }
    const tier = finding.confidence.toLowerCase();
    if (byPerspective[key][tier] !== undefined) {
      byPerspective[key][tier]++;
    }
  }

  lines.push("| Perspective | CONFIRMED | LIKELY | SUSPECTED | Total |");
  lines.push("|-------------|-----------|--------|-----------|-------|");
  for (const [perspective, counts] of Object.entries(byPerspective)) {
    const total = counts.confirmed + counts.likely + counts.suspected;
    lines.push(`| ${perspective} | ${counts.confirmed} | ${counts.likely} | ${counts.suspected} | ${total} |`);
  }
  lines.push("");

  // Source Perspectives
  lines.push("## Source Perspectives");
  lines.push("");
  for (const output of parsedOutputs) {
    lines.push(`- **${output.perspectiveId || output.agentId}** (${output.agentId})`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Extract a short name from finding text for use as a heading.
 * Takes bold text if present, or the first clause before a dash/colon.
 *
 * @param {string} text — finding text
 * @returns {string}
 */
function extractFindingName(text) {
  const boldMatch = text.match(/^\*\*(.+?)\*\*/);
  if (boldMatch) return boldMatch[1];

  const colonMatch = text.match(/^([^:]{3,60}):/);
  if (colonMatch) return colonMatch[1].trim();

  const dashMatch = text.match(/^([^—]{3,60})—/);
  if (dashMatch) return dashMatch[1].trim();

  // Use first ~8 words
  return text.split(/\s+/).slice(0, 8).join(" ");
}

/**
 * Write QA report to the pipeline directory.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — completed sprint number
 * @param {string} report — QA-REPORT.md content
 * @returns {string} — absolute path to written report
 */
function writeQAReport(pipelineDir, sprintNumber, report) {
  const sprintPad = String(sprintNumber).padStart(2, "0");
  const reviewDir = path.join(pipelineDir, "reviews", `sprint-${sprintPad}`);
  paths.ensureDir(reviewDir);

  const reportPath = path.join(reviewDir, "QA-REPORT.md");
  fs.writeFileSync(reportPath, report, "utf8");

  // Clear progress file after review completes
  try {
    const progress = require("../../../lib/progress");
    const sprintDir = `sprint-${String(sprintNumber).padStart(2, "0")}`;
    progress.clearProgress(path.join(pipelineDir, "reviews", sprintDir, "progress.yaml"));
  } catch (_e) { /* progress is advisory */ }

  return reportPath;
}

/**
 * Load SPEC.md from the elicitation directory, strip YAML frontmatter.
 * Returns null if no SPEC.md exists.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {string|null} — stripped SPEC.md content, or null
 */
function loadSpec(pipelineDir) {
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  if (!fs.existsSync(specPath)) return null;

  const raw = fs.readFileSync(specPath, "utf8");
  const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  return stripped || null;
}

/**
 * Load REQ.md from the requirements directory, strip YAML frontmatter.
 * Returns null if no REQ.md exists.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {string|null} — stripped REQ.md content, or null
 */
function loadRequirements(pipelineDir) {
  const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
  if (!fs.existsSync(reqPath)) return null;

  const raw = fs.readFileSync(reqPath, "utf8");
  const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  return stripped || null;
}

/**
 * Load all task spec files for a given sprint.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number
 * @returns {string} — concatenated task spec contents with file headers
 */
function loadTaskSpecs(pipelineDir, sprintNumber) {
  const tasksDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "tasks");
  if (!fs.existsSync(tasksDir)) return "";

  const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".md") && !f.endsWith(".agent.md"));
  const parts = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(tasksDir, file), "utf8");
    parts.push(`### ${file}\n\n${content}`);
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Load all completion records for a given sprint.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number
 * @returns {string} — concatenated completion record contents with file headers
 */
function loadCompletionRecords(pipelineDir, sprintNumber) {
  const completionDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "completion");
  if (!fs.existsSync(completionDir)) return "";

  const files = fs.readdirSync(completionDir).filter((f) => f.endsWith(".md") || f.endsWith(".yaml"));
  const parts = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(completionDir, file), "utf8");
    parts.push(`### ${file}\n\n${content}`);
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Validate that a CONFIRMED finding includes a positive control in its test file.
 *
 * A positive control is a test case exercising expected (correct) behavior that passes.
 * Without one, a failing test may indicate a broken harness rather than a real defect.
 * Findings lacking a positive control are downgraded from CONFIRMED to LIKELY.
 *
 * @param {Object} finding — a categorized finding object with at least { confidence, testFile, notes? }
 * @param {string} sandboxPath — absolute or relative path to the review sandbox (tests directory)
 * @returns {Object} — the finding, possibly with confidence downgraded and notes amended
 */
function validatePositiveControl(finding, sandboxPath) {
  const POSITIVE_INDICATORS = ["positive", "baseline", "expected", "sanity", "control", "should pass", "passes"];

  if (!finding.testFile) return finding; // no test file referenced

  const testPath = path.join(sandboxPath, finding.testFile);
  if (!fs.existsSync(testPath)) return finding;

  const content = fs.readFileSync(testPath, "utf8").toLowerCase();
  const hasPositive = POSITIVE_INDICATORS.some((ind) => content.includes(ind));

  if (!hasPositive && finding.confidence === "CONFIRMED") {
    finding.confidence = "LIKELY";
    finding.notes = (finding.notes || "") + " [Downgraded: no positive control in test]";
  }

  return finding;
}

/**
 * Check if the review-build cycle limit has been reached for a sprint.
 * @param {string} pipelineDir
 * @param {number} sprintNumber
 * @returns {{ ok: boolean, cycleCount: number, maxReached: boolean }}
 */
function checkReviewCycleLimit(pipelineDir, sprintNumber) {
  const stateFile = path.join(pipelineDir, "state.yaml");
  const state = yamlIO.safeReadWithFallback(stateFile);
  if (!state || !state.sprints) return { ok: true, cycleCount: 0, maxReached: false };

  const sprintKey = "sprint-" + String(sprintNumber).padStart(2, "0");
  const sprint = state.sprints[sprintKey];
  if (!sprint) return { ok: true, cycleCount: 0, maxReached: false };

  const count = sprint.review_cycle_count || 0;
  return { ok: count < MAX_REVIEW_CYCLES, cycleCount: count, maxReached: count >= MAX_REVIEW_CYCLES };
}

/**
 * Increment the review cycle count for a sprint.
 * @param {string} pipelineDir
 * @param {number} sprintNumber
 */
function incrementReviewCycle(pipelineDir, sprintNumber) {
  const stateFile = path.join(pipelineDir, "state.yaml");
  const state = yamlIO.safeReadWithFallback(stateFile);
  if (!state || !state.sprints) return;

  const sprintKey = "sprint-" + String(sprintNumber).padStart(2, "0");
  if (!state.sprints[sprintKey]) return;

  state.sprints[sprintKey].review_cycle_count = (state.sprints[sprintKey].review_cycle_count || 0) + 1;
  state.last_updated = new Date().toISOString();
  yamlIO.safeWrite(stateFile, state);
}

module.exports = {
  DEFAULT_REVIEW_PERSPECTIVES,
  CONFIDENCE_TIERS,
  SEVERITY_LEVELS,
  CONFIDENCE_KEYWORDS,
  SEVERITY_KEYWORDS,
  SUSPECTED_CAP_RATIO,
  generateBriefId,
  assembleReviewBriefs,
  extractBuiltFilePaths,
  parseReviewOutputs,
  inferConfidence,
  inferSeverity,
  categorizeFindings,
  applySuspectedCap,
  generateQAReport,
  extractFindingName,
  writeQAReport,
  loadSpec,
  loadRequirements,
  loadTaskSpecs,
  loadCompletionRecords,
  validatePositiveControl,
  MAX_REVIEW_CYCLES,
  checkReviewCycleLimit,
  incrementReviewCycle,
};
