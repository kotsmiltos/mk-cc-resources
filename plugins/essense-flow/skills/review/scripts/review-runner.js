"use strict";

const fs = require("fs");
const path = require("path");
const jsYaml = require("js-yaml");
const yamlIO = require("../../../lib/yaml-io");
const briefAssembly = require("../../../lib/brief-assembly");
const agentOutput = require("../../../lib/agent-output");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");
const lockfile = require("../../../lib/lockfile");
const ledger = require("../../../lib/ledger");
const importance = require("../../../lib/importance");
const deterministicGate = require("../../../lib/deterministic-gate");
const {
  VALIDATOR_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  PASS_REQUIRES_ZERO_CONFIRMED_CRITICALS,
  PASS_REQUIRES_ZERO_UNACKNOWLEDGED_NC_CRITICALS,
  MIN_PATH_EVIDENCE_QUOTE_CHARS,
  PATH_EVIDENCE_LINE_TOLERANCE,
} = require("../../../lib/constants");

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
 * Briefs list paths to task specs, completion records, and SPEC.md — agents
 * read on demand rather than receiving pre-embedded content. This eliminates
 * brief-re-embedding waste (SPEC waste prior #4) and supports the grounding
 * requirement that every finding quote verbatim code from the cited file.
 *
 * @param {number} sprintNumber — the completed sprint number
 * @param {string[]} taskSpecPaths — absolute paths to task spec files
 * @param {string[]} completionRecordPaths — absolute paths to completion records
 * @param {string|null} specPath — absolute path to SPEC.md (null if absent)
 * @param {string} pluginRoot — absolute path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, briefs?: Array<{ perspectiveId: string, agentId: string, briefId: string, brief: string }>, error?: string }}
 */
function assembleReviewBriefs(sprintNumber, taskSpecPaths, completionRecordPaths, specPath, pluginRoot, config, ledgerPath) {
  if (!Array.isArray(taskSpecPaths) || taskSpecPaths.length === 0) {
    return { ok: false, error: "taskSpecPaths must be a non-empty array of file paths" };
  }

  if (!Array.isArray(completionRecordPaths) || completionRecordPaths.length === 0) {
    return { ok: false, error: "completionRecordPaths must be a non-empty array of file paths" };
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

    const taskSpecList = taskSpecPaths.map((p) => `- ${p}`).join("\n");
    const completionRecordList = completionRecordPaths.map((p) => `- ${p}`).join("\n");
    // Extract built file paths by reading completion records (agents re-read them,
    // but the brief pre-computes this list so the agent has a starting reading plan)
    const builtFiles = extractBuiltFilePathsFromPaths(completionRecordPaths);

    const bindings = {
      REVIEW_PERSPECTIVE: perspective.role,
      FOCUS_AREA: perspective.focus,
      TASK_SPEC_PATHS: taskSpecList,
      COMPLETION_RECORD_PATHS: completionRecordList,
      BUILT_FILES: builtFiles,
      SPEC_PATH: specPath || "(no SPEC.md available)",
      CONFIRMED_FINDINGS_PATH: (ledgerPath && fs.existsSync(ledgerPath))
        ? ledgerPath
        : "(no prior confirmed-findings.yaml — first review)",
      SPRINT_NUMBER: String(sprintNumber),
      SANDBOX_PATH: `.pipeline/reviews/sprint-${String(sprintNumber).padStart(2, "0")}/tests/`,
      BRIEF_ID: briefId,
      AGENT_ID: agentId,
      TIMESTAMP: timestamp,
    };

    // Build sections for budget checking — brief no longer embeds artifact bodies,
    // so the context section is just the path manifest.
    const identity = `You are a ${perspective.role} performing adversarial review of Sprint ${sprintNumber}. Your sole concern is ${perspective.focus}.`;
    const context = taskSpecList + "\n" + completionRecordList;

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
 * Extract built file paths by scanning completion record files on disk.
 * Returns a newline-separated bulleted list suitable for brief injection.
 *
 * @param {string[]} completionRecordPaths — paths to completion record files
 * @returns {string} — newline-separated bulleted list of file paths found
 */
function extractBuiltFilePathsFromPaths(completionRecordPaths) {
  const paths = [];
  const pathPattern = /(?:^|\s|`)((?:[\w./-]+\/)?[\w.-]+\.\w{1,10})(?:\s|$|`|,|\|)/gm;
  for (const recordPath of completionRecordPaths) {
    if (!fs.existsSync(recordPath)) continue;
    const content = fs.readFileSync(recordPath, "utf8");
    let match;
    while ((match = pathPattern.exec(content)) !== null) {
      const candidate = match[1].trim();
      if (candidate.includes("/") || candidate.includes("\\")) {
        if (!paths.includes(candidate)) paths.push(candidate);
      }
    }
  }
  return paths.length > 0 ? paths.map((p) => `- ${p}`).join("\n") : "(extract by reading the completion records above)";
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

// ---------------------------------------------------------------------------
// Phase A noise filter — drop fabricated/restated/non-finding bullets before
// they enter QA-REPORT.md. Three modes:
//   1. positive confirmations ("FR-NNN met", "tests passing") — not findings
//   2. fix recommendations ("Add X check", "Wrap Y in try/catch") — actions,
//      not findings; collapse with their parent finding
//   3. cross-perspective restatements — same bug × N agents
// Empirical motivation: sprint-6/7/8 reviews showed ~80% noise rate at the
// critical tier; routing then treats positives/restatements as blockers.
// ---------------------------------------------------------------------------

const SEVERITY_PREFIX_RE = /^\s*(critical|high|medium|low)\s*:\s*/i;

const POSITIVE_KEYWORDS = ["met", "passing", "verified", "confirmed", "preserved", "implemented"];

// If any of these appears, the bullet is describing a gap/bug — not a positive.
const NEGATIVE_INDICATORS = [
  "not met", "missing", "absent", "fail", " gap", "broken", "never",
  "silent", "leak", "crash", "fabric", "bypass", "invalid", "incorrect",
  "wrong", "stale", "corrupt", "skip", "fragile",
  "edge case", "should fix", "must fix", "needs to", "consider ",
  "violates", "premature", "not implemented", "not enforced",
  "no test", "no coverage", "untested", "uncovered", "ambiguous",
  "important:", "critical:", "high:", "medium:", "low:",
];

const FIX_REC_VERBS = [
  "Add", "Remove", "Update", "Plan", "Extend", "Fix", "Wrap", "Replace",
  "Use", "Call", "Change", "Move", "Improve", "Enhance", "Rewrite",
  "Consider", "Convert", "Refactor", "Switch", "Apply", "Implement",
  "Strip", "Tighten", "Loosen", "Combine", "Split", "Inline", "Extract",
  "Cache", "Note", "Modify", "Adjust", "Restore", "Reduce", "Increase",
  "Enable", "Disable", "Drop", "MUST FIX", "Should",
];
const FIX_REC_RE = new RegExp(`^(${FIX_REC_VERBS.join("|")})\\b`);

/**
 * Extract a leading "CRITICAL:"-style severity tag, returning the canonical
 * severity and the text with the tag stripped. Authoritative over keyword
 * infer — fixes severity inflation where reviewers tag `HIGH:` and group it
 * under the `## Critical` section.
 *
 * @param {string} text
 * @returns {{ severity: string|null, stripped: string, hadPrefix: boolean }}
 */
function extractSeverityPrefix(text) {
  const m = text.match(SEVERITY_PREFIX_RE);
  if (!m) return { severity: null, stripped: text, hadPrefix: false };
  return {
    severity: m[1].toLowerCase(),
    stripped: text.slice(m[0].length).trim(),
    hadPrefix: true,
  };
}

/**
 * True when the bullet is confirming something works (not reporting a gap).
 * Requires (a) positive keyword present AND (b) no negative indicator.
 *
 * @param {string} stripped — text with severity prefix already removed
 * @returns {boolean}
 */
function isPositiveConfirmation(stripped) {
  const lower = stripped.toLowerCase();
  const hasPositive = POSITIVE_KEYWORDS.some((kw) =>
    new RegExp(`\\b${kw}\\b`, "i").test(lower)
  );
  if (!hasPositive) return false;
  const hasNegation = NEGATIVE_INDICATORS.some((kw) => lower.includes(kw));
  return !hasNegation;
}

/**
 * True when the bullet is a fix recommendation rather than a finding.
 * Pattern: starts with imperative verb (Add, Wrap, Replace, …).
 *
 * @param {string} stripped — text with severity prefix already removed
 * @returns {boolean}
 */
function isFixRecommendation(stripped) {
  return FIX_REC_RE.test(stripped.trim());
}

/**
 * Compute a stable dedup key from a finding so cross-perspective
 * restatements collapse to a single entry. Uses identifier-set signature:
 * camelCase / snake_case identifiers plus file refs, deduped and sorted.
 * This is rephrasing-invariant — "path traversal in validatePathEvidence
 * at review-runner.js:1026" and "path traversal vulnerability in
 * validatePathEvidence (review-runner.js)" produce the same signature.
 *
 * Bullets with no identifying info return a unique passthrough sentinel.
 *
 * @param {string} stripped
 * @returns {string}
 */
function findingDedupKey(stripped) {
  // Prefer camelCase identifier — high-signal anchor for "this is the
  // function/symbol the finding is about". Two paraphrasings of the same bug
  // almost always cite the same camelCase function name; falling back to
  // file ref / snake_case for findings that lack a function anchor.
  const camelRe = /\b([a-z][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*)\b/g;
  const camelHits = stripped.match(camelRe) || [];
  if (camelHits.length > 0) return `ident:${camelHits[0]}`;

  const fileRe = /[\w\-/.]+\.(?:js|ts|md|yaml|json)\b/g;
  const fileHits = stripped.match(fileRe) || [];
  if (fileHits.length > 0) return `file:${fileHits[0]}`;

  const snakeRe = /\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g;
  const snakeHits = stripped.match(snakeRe) || [];
  if (snakeHits.length > 0) return `snake:${snakeHits[0]}`;

  return `__unique__${stripped.slice(0, 80)}`;
}

/**
 * Collapse cross-perspective restatements. Keep first occurrence (preserving
 * original perspective attribution); subsequent matches are dropped.
 *
 * @param {Array<{ stripped: string }>} items
 * @returns {Array}
 */
function dedupFindings(items) {
  const seen = new Set();
  const kept = [];
  for (const item of items) {
    const key = findingDedupKey(item.stripped);
    if (key.startsWith("__unique__")) {
      kept.push(item);
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      kept.push(item);
    }
  }
  return kept;
}

/**
 * Apply the full Phase A filter pipeline: positives drop, fix-recs drop,
 * dedup. Returns kept items annotated with severity-prefix info plus a
 * count of drops by reason for QA-REPORT footer / observability.
 *
 * @param {Array<{ text: string, source: string, perspective: string, section: string }>} rawItems
 * @returns {{ kept: Array, dropped: { positives: number, fixRecs: number, dupes: number } }}
 */
function filterFindings(rawItems) {
  const enriched = [];
  let positivesCount = 0;
  let fixRecsCount = 0;
  for (const raw of rawItems) {
    const { severity, stripped, hadPrefix } = extractSeverityPrefix(raw.text);
    if (isPositiveConfirmation(stripped)) {
      positivesCount++;
      continue;
    }
    if (isFixRecommendation(stripped)) {
      fixRecsCount++;
      continue;
    }
    enriched.push({ ...raw, severity, stripped, hadPrefix });
  }
  const before = enriched.length;
  const deduped = dedupFindings(enriched);
  return {
    kept: deduped,
    dropped: { positives: positivesCount, fixRecs: fixRecsCount, dupes: before - deduped.length },
  };
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
  // Phase 1: collect raw items across all perspectives + sections so dedup
  // can see cross-perspective restatements.
  const rawItems = [];
  for (const output of parsedOutputs) {
    const { agentId, perspectiveId, payload } = output;
    if (!payload) continue;

    const findingSections = ["findings", "confirmed_findings", "likely_findings", "suspected_findings",
      "analysis", "risks", "issues", "bugs", "edge_cases", "compliance_gaps", "integration_issues"];

    for (const section of findingSections) {
      const content = payload[section];
      if (!content || typeof content !== "string") continue;

      const items = content
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("1."))
        .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 0);

      for (const item of items) {
        rawItems.push({ text: item, source: agentId, perspective: perspectiveId, section });
      }
    }
  }

  // Phase 2: noise filter (positives, fix-recs, dedup).
  const { kept, dropped } = filterFindings(rawItems);

  // Phase 3: tier into confidence + severity buckets.
  const byConfidence = { confirmed: [], likely: [], suspected: [] };
  const bySeverity = { critical: [], high: [], medium: [], low: [] };

  for (const enriched of kept) {
    const { text, source, perspective, section, severity: prefixSeverity, stripped } = enriched;

    let confidence;
    if (section.includes("confirmed")) {
      confidence = "CONFIRMED";
    } else if (section.includes("likely")) {
      confidence = "LIKELY";
    } else if (section.includes("suspected")) {
      confidence = "SUSPECTED";
    } else {
      confidence = inferConfidence(stripped);
    }

    // Prefix wins. Keyword infer only when no leading severity tag was present.
    const severity = prefixSeverity || inferSeverity(stripped);

    const finding = {
      text,
      confidence,
      severity,
      // blocks_advance declared at production via the rule in lib/importance.js —
      // never inferred post-hoc by consumers (triage uses this declared value).
      blocks_advance: importance.blocksAdvanceLabel(severity, confidence),
      source,
      perspective,
      section,
    };

    const tierKey = confidence.toLowerCase();
    if (byConfidence[tierKey]) {
      byConfidence[tierKey].push(finding);
    } else {
      byConfidence.suspected.push(finding);
    }

    if (bySeverity[severity]) {
      bySeverity[severity].push(finding);
    } else {
      bySeverity.medium.push(finding);
    }
  }

  return {
    confirmed: byConfidence.confirmed,
    likely: byConfidence.likely,
    suspected: byConfidence.suspected,
    bySeverity,
    droppedCounts: dropped,
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
  // Floor: never cap to zero on first pass (no confirmed findings yet)
  const cap = confirmedCount > 0 ? confirmedCount * SUSPECTED_CAP_RATIO : suspectedList.length;

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
 * Build validator manifest rows for the report.
 *
 * Throws BEFORE any file is written if a perspective has no entry in validatorResults.
 * This enforces the invariant that every dispatched validator is accounted for.
 *
 * @param {Array<{ id: string }>} perspectives — review perspectives used in this run
 * @param {Array<{ perspectiveId: string, status: string, findingsCount: number, failReason?: string }>} validatorResults
 * @returns {string[]} — array of markdown table row strings (one per validator)
 */
function buildValidatorManifestRows(perspectives, validatorResults) {
  return perspectives.map((p) => {
    const result = validatorResults.find((r) => r.perspectiveId === p.id);
    if (!result) {
      throw new Error(
        `[essense-flow] Validator manifest: missing entry for ${p.id} — report generation aborted`
      );
    }
    const findingsCol = result.failReason
      ? `${result.findingsCount} (${result.failReason})`
      : String(result.findingsCount);
    return `| ${p.id} | ${result.status} | ${findingsCol} |`;
  });
}

/**
 * Build validator results summary from raw validator verdicts and all findings.
 * Converts the flat validatorVerdicts array into per-perspective result objects
 * expected by buildValidatorManifestRows.
 *
 * @param {Array<{ id: string }>} perspectives
 * @param {Array<Object>} validatorVerdicts — collected validator verdict objects
 * @param {Array<Object>} allFindings — all qa findings (with .id assigned)
 * @returns {Array<{ perspectiveId: string, status: string, findingsCount: number, failReason?: string }>}
 */
function buildValidatorResults(perspectives, validatorVerdicts, allFindings) {
  return perspectives.map((p) => {
    // Verdicts attributed to this perspective
    const perspectiveVerdicts = validatorVerdicts.filter(
      (v) => v.validator_perspective === p.id
    );

    // Detect timeout/parse failure from synthetic NEEDS_CONTEXT verdicts
    const syntheticFail = perspectiveVerdicts.find(
      (v) => v.verdict === "NEEDS_CONTEXT" && (
        v.reason === "validator-timeout" ||
        v.reason === "validator-parse-failure" ||
        v.reason === "validator-unknown-verdict"
      )
    );

    const status = syntheticFail ? "failed" : "completed";
    const failReason = syntheticFail ? syntheticFail.reason : undefined;

    // Count findings processed by this validator (non-synthetic verdicts)
    const findingsCount = syntheticFail
      ? allFindings.filter((f) => f.perspective === p.id).length
      : perspectiveVerdicts.length;

    return { perspectiveId: p.id, status, findingsCount, failReason };
  });
}

/**
 * Look up the original QA finding text by finding ID from qa-run-output data.
 *
 * @param {string} findingId — e.g. "qa-finding-001"
 * @param {Array<Object>} allFindings — all qa findings with .id and .text
 * @returns {string} — original text or fallback string
 */
function lookupOriginalFindingText(findingId, allFindings) {
  const match = allFindings.find((f) => f.id === findingId);
  return match ? match.text : "(original finding not found)";
}

/**
 * Generate QA-REPORT.md content from categorized findings.
 *
 * Summary section (## QA Summary) is placed within the first 20 lines so verdict
 * and confirmed-critical count are immediately visible.
 *
 * Throws before writing if any perspective is missing from validatorResults
 * (enforced via buildValidatorManifestRows).
 *
 * @param {number} sprintNumber — completed sprint number
 * @param {{ confirmed: Array, likely: Array, suspected: Array, bySeverity: Object }} categorized
 * @param {Array<{ agentId: string, perspectiveId: string }>} parsedOutputs — for attribution
 * @param {number} [suppressedCount=0] — number of SUSPECTED findings suppressed by cap
 * @param {Array<{ id: string }>} [perspectives] — review perspectives (defaults to DEFAULT_REVIEW_PERSPECTIVES)
 * @param {Array<Object>} [validatorVerdicts] — collected validator verdict objects
 * @param {Array<Object>} [allFindings] — all qa findings with .id assigned (for FALSE_POSITIVE lookup)
 * @returns {string} — full QA-REPORT.md markdown content
 */
function generateQAReport(sprintNumber, categorized, parsedOutputs, suppressedCount, perspectives, validatorVerdicts, allFindings) {
  const usePerspectives = perspectives || DEFAULT_REVIEW_PERSPECTIVES;
  const useVerdicts = validatorVerdicts || [];
  const useAllFindings = allFindings || [
    ...categorized.confirmed,
    ...categorized.likely,
    ...categorized.suspected,
  ];

  // Compute verdict counts from ledger-backed data when available.
  // Here we derive from categorized findings for the summary header.
  const confirmedCriticalCount = categorized.confirmed.filter((f) => f.severity === "critical").length;

  // blocks_advance_count is the routing signal triage reads.
  // Each finding has blocks_advance declared at production (see categorizeFindings).
  // Count "yes" across confirmed findings only — confidence tier matters per the rule.
  const blocksAdvanceCount = categorized.confirmed.filter((f) => f.blocks_advance === "yes").length;

  const verdict = blocksAdvanceCount > 0 ? "FAIL" : "PASS";
  const findingsTotal =
    (categorized.confirmed.length || 0) +
    (categorized.likely.length || 0) +
    (categorized.suspected.length || 0);

  // Tally validator verdict categories for summary line
  const fpCount = useVerdicts.filter((v) => v.verdict === "FALSE_POSITIVE").length;
  const ncCount = useVerdicts.filter((v) => v.verdict === "NEEDS_CONTEXT").length;
  const errCount = useVerdicts.filter((v) =>
    v.verdict === "NEEDS_CONTEXT" && (
      v.reason === "validator-timeout" ||
      v.reason === "validator-parse-failure" ||
      v.reason === "validator-unknown-verdict"
    )
  ).length;
  // confirmed = verdicts that are not false-positive, not needs-context, and not errors
  const confirmedVerdictCount = useVerdicts.filter(
    (v) => v.verdict === "CONFIRMED" || v.verdict === "FIXED" ||
           v.verdict === "REGRESSED" || v.verdict === "STILL_CONFIRMED"
  ).length;

  const lines = [];

  // --- YAML frontmatter: lines 1-9 ---
  // blocks_advance_count is the deterministic routing signal triage uses.
  // findings_total + verdict + blocks_advance_count must agree (template contract).
  lines.push("---");
  lines.push("artifact: qa-report");
  lines.push("schema_version: 2");
  lines.push("produced_by: /review");
  lines.push("read_by: /triage");
  lines.push(`sprint: ${sprintNumber}`);
  lines.push(`verdict: ${verdict}`);
  lines.push(`blocks_advance_count: ${blocksAdvanceCount}`);
  lines.push(`findings_total: ${findingsTotal}`);
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");

  // --- QA Summary: lines 9-14 (verdict on line 11, confirmed-criticals on line 12) ---
  // Target: summary section fully within first 20 lines.
  lines.push(`# Sprint ${sprintNumber} QA Report`);
  lines.push("");
  lines.push("## QA Summary");
  lines.push(`Verdict: ${verdict}`);
  lines.push(`Confirmed criticals: ${confirmedCriticalCount}`);
  lines.push(`Total findings: confirmed=${confirmedVerdictCount}, false-positive=${fpCount}, needs-context=${ncCount}, errors=${errCount}`);
  lines.push("");

  // --- Validator Manifest: build rows (throws if any validator missing) ---
  const validatorResults = buildValidatorResults(usePerspectives, useVerdicts, useAllFindings);
  const manifestRows = buildValidatorManifestRows(usePerspectives, validatorResults);

  lines.push("## Validator Manifest");
  lines.push("");
  lines.push("| Validator | Status | Findings Processed |");
  lines.push("|-----------|--------|-------------------|");
  for (const row of manifestRows) {
    lines.push(row);
  }
  lines.push("");

  // --- Confirmed Findings ---
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
      lines.push(`- **blocks_advance:** ${finding.blocks_advance || importance.blocksAdvanceLabel(finding.severity, "CONFIRMED")}`);
      lines.push(`- **Source:** ${finding.source} (${finding.perspective})`);
      lines.push(`- **Detail:** ${finding.text}`);
      lines.push("");
    }
  }
  lines.push("");

  // --- Likely Findings ---
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

  // --- Suspected Findings ---
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

  // --- Discarded Findings (FALSE_POSITIVE) ---
  // Each entry includes both original claim and counter-evidence in a single block.
  const falsePositiveVerdicts = useVerdicts.filter((v) => v.verdict === "FALSE_POSITIVE");
  if (falsePositiveVerdicts.length > 0) {
    lines.push("## Discarded Findings");
    lines.push("");
    for (const v of falsePositiveVerdicts) {
      const originalText = lookupOriginalFindingText(v.finding_id, useAllFindings);
      lines.push(`### [${v.finding_id}] FALSE_POSITIVE`);
      lines.push(`**Original claim:** ${originalText}`);
      lines.push(`**Counter-evidence:** ${v.counter_evidence || "(no counter-evidence provided)"}`);
      lines.push("");
    }
  }

  // --- Per-Perspective Attribution ---
  lines.push("## Per-Perspective Attribution");
  lines.push("");
  const byPerspective = {};
  const allFindingsForAttr = [...categorized.confirmed, ...categorized.likely, ...categorized.suspected];
  for (const finding of allFindingsForAttr) {
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

  // --- Source Perspectives ---
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
 * Atomic post-review finalization. Combines QA-REPORT write with the
 * reviewing → triaging state transition into one call so the orchestrator
 * cannot stop between writing the report and advancing the phase.
 *
 * Background: prior to this helper, the review workflow had separate steps
 * for "write QA-REPORT" (step 10) and "transition reviewing → triaging"
 * (step 11). In practice the orchestrator stopped after step 10, leaving
 * phase=reviewing with QA-REPORT.md present — autopilot then either looped
 * /review (pre-fix) or had to halt waiting for /triage.
 *
 * Atomic flow:
 *   1. Write QA-REPORT.md
 *   2. Transition state.yaml: reviewing → triaging (state-machine.writeState)
 *
 * If transition fails (e.g. phase no longer 'reviewing', transitions.yaml
 * missing), QA-REPORT is preserved on disk but transition is reported as
 * failed — caller decides recovery.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint being reviewed
 * @param {string} reportContent — full QA-REPORT.md content (output of generateQAReport)
 * @returns {{ ok: boolean, qaReportPath: string, transitioned: boolean, error?: string }}
 */
function finalizeReview(pipelineDir, sprintNumber, reportContent) {
  // Step 1 — write QA-REPORT. Wrapped to match the {ok,error} contract
  // honoured by every other finalize* helper (research/triage/verify/
  // architecture/decompose). Without the wrap a disk failure raises a
  // raw exception and callers that branch on `result.ok` mis-handle it.
  let qaReportPath;
  try {
    qaReportPath = writeQAReport(pipelineDir, sprintNumber, reportContent);
  } catch (err) {
    return { ok: false, transitioned: false, error: `writeQAReport failed: ${err.message}` };
  }

  // Step 2 — transition reviewing → triaging atomically. We use the
  // state-machine writeState which validates the transition against
  // transitions.yaml and rejects if the source phase is not 'reviewing'.
  const stateMachine = require("../../../lib/state-machine");
  const transition = stateMachine.writeState(
    pipelineDir,
    "triaging",
    {},
    {
      command: "/review",
      trigger: "review-skill",
      artifact: qaReportPath,
    }
  );

  if (!transition.ok) {
    return {
      ok: false,
      qaReportPath,
      transitioned: false,
      error: transition.error || "writeState returned no error message",
    };
  }

  return { ok: true, qaReportPath, transitioned: true };
}

/**
 * Atomic entry transition for /review: sprint-complete → reviewing.
 *
 * Closes the last open B-class boundary (B5). Without this helper the
 * /review orchestrator did the entry transition + later side effects
 * (validator dispatch, QA-REPORT.md write) as separate steps; if /review
 * exited between the transition and write, phase=reviewing persisted
 * with no QA-REPORT (existing autopilot readiness gate handles that
 * case). If /review exited BEFORE the transition, phase=sprint-complete
 * persisted and autopilot would re-fire /review on every Stop hook —
 * the spam pattern the user observed.
 *
 * Behaviour:
 * - phase = "sprint-complete"  → transitions to "reviewing", returns
 *   {ok:true, transitioned:true}
 * - phase = "reviewing"        → idempotent no-op, returns
 *   {ok:true, transitioned:false, alreadyEntered:true}
 *   (resume-after-crash: review can pick up where it left off)
 * - any other phase            → returns {ok:false, error:...},
 *   does NOT transition
 *
 * @param {string} pipelineDir
 * @param {number|string|null} sprintNumber — for the audit-log artifact field
 * @returns {{ ok: boolean, transitioned?: boolean, alreadyEntered?: boolean, error?: string }}
 */
function enterReview(pipelineDir, sprintNumber) {
  const yamlIO = require("../../../lib/yaml-io");
  const statePath = path.join(pipelineDir, "state.yaml");
  const state = yamlIO.safeReadWithFallback(statePath, {});
  const phase = state && state.pipeline && state.pipeline.phase;

  if (phase === "reviewing") {
    return { ok: true, transitioned: false, alreadyEntered: true };
  }
  if (phase !== "sprint-complete") {
    return {
      ok: false,
      transitioned: false,
      error: `enterReview requires phase='sprint-complete' (got '${phase}')`,
    };
  }

  const stateMachine = require("../../../lib/state-machine");
  const sprintTag = sprintNumber != null ? `sprint-${sprintNumber}` : null;
  const r = stateMachine.writeState(pipelineDir, "reviewing", {}, {
    command: "/review",
    trigger: "review-skill-entry",
    artifact: sprintTag,
  });
  if (!r.ok) {
    return { ok: false, transitioned: false, error: r.error };
  }
  return { ok: true, transitioned: true };
}

/**
 * Load SPEC.md from the elicitation directory, strip YAML frontmatter.
 * Returns null if no SPEC.md exists.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {string|null} — stripped SPEC.md content, or null
 */
function loadSpecPath(pipelineDir) {
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  return fs.existsSync(specPath) ? specPath : null;
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
function loadTaskSpecPaths(pipelineDir, sprintNumber) {
  const tasksDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  return fs
    .readdirSync(tasksDir)
    .filter((f) => f.endsWith(".md") && !f.endsWith(".agent.md"))
    .map((f) => path.join(tasksDir, f));
}

/**
 * Load all completion records for a given sprint.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number
 * @returns {string} — concatenated completion record contents with file headers
 */
function loadCompletionRecordPaths(pipelineDir, sprintNumber) {
  const completionDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "completion");
  if (!fs.existsSync(completionDir)) return [];
  return fs
    .readdirSync(completionDir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".yaml"))
    .map((f) => path.join(completionDir, f));
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

/**
 * Write qa-run-output.yaml after the barrier sync (all QA agents complete).
 * This file is the structured handoff to the validator stage.
 *
 * Must be called before any validator dispatch so validators can reference
 * finding IDs (qa-finding-NNN) that are stable and pre-assigned.
 *
 * @param {string} sprintReviewDir — absolute path to .pipeline/reviews/sprint-NN/
 * @param {number} sprintNumber — completed sprint number
 * @param {Array<Object>} parsedQaFindings — flat finding objects from categorizeFindings output
 * @returns {string} — absolute path to written qa-run-output.yaml
 */
function writeQaRunOutput(sprintReviewDir, sprintNumber, parsedQaFindings) {
  const qaRunOutputPath = path.join(sprintReviewDir, "qa-run-output.yaml");
  const qaRunOutput = {
    schema_version: 1,
    sprint: sprintNumber,
    generated_at: new Date().toISOString(),
    findings: parsedQaFindings.map((f, idx) => ({
      id: `qa-finding-${String(idx + 1).padStart(3, "0")}`,
      source_perspective: f.perspective,
      severity: f.severity,
      confidence: f.confidence,
      text: f.text,
      file_refs: f.fileRefs || [],
      line_refs: f.lineRefs || [],
      prior_find_id: f.priorFindId || null,
    })),
  };
  yamlIO.safeWrite(qaRunOutputPath, qaRunOutput);
  return qaRunOutputPath;
}

/**
 * Count verdicts by category from a validator output or array of outputs.
 * Used for progress signals after each validator completes.
 *
 * @param {Object|Array<Object>} outputs — single verdict object or array of them
 * @returns {{ confirmed: number, fp: number, nc: number }}
 */
function countVerdicts(outputs) {
  const arr = Array.isArray(outputs) ? outputs : [outputs];
  return {
    confirmed: arr.filter(v => v.verdict === "CONFIRMED" || v.verdict === "STILL_CONFIRMED" || v.verdict === "REGRESSED").length,
    fp: arr.filter(v => v.verdict === "FALSE_POSITIVE").length,
    nc: arr.filter(v => v.verdict === "NEEDS_CONTEXT" || v.verdict === "FIXED").length,
  };
}

// Valid verdict values for validator output.
// FIXED/REGRESSED/STILL_CONFIRMED are re-review verdicts — they update an existing
// ledger entry status and must never create new FIND-IDs.
const VALID_VALIDATOR_VERDICTS = new Set([
  "CONFIRMED",
  "FALSE_POSITIVE",
  "NEEDS_CONTEXT",
  "FIXED",
  "REGRESSED",
  "STILL_CONFIRMED",
]);

/**
 * Parse raw validator agent output and validate it against the validator output schema.
 *
 * Severity check comes first — it is structurally prohibited in validator output
 * (validators assess confidence, not severity; severity lives in QA findings only).
 *
 * @param {string} raw — raw string output from a validator agent
 * @returns {{ ok: boolean, verdict?: Object, error?: string }}
 */
function parseValidatorOutput(raw) {
  if (!raw || typeof raw !== "string") return { ok: false, error: "empty input" };

  // \r?\n so CRLF agent output (Windows) parses identically to LF.
  const allFenceMatches = [...raw.matchAll(/```yaml\r?\n([\s\S]*?)```/g)];
  if (allFenceMatches.length === 0) return { ok: false, error: "no YAML fenced block found" };
  if (allFenceMatches.length > 1) {
    return { ok: false, error: `multiple YAML fenced blocks found (${allFenceMatches.length}) — ambiguous output` };
  }
  const fenceMatch = allFenceMatches[0];

  let verdict;
  try {
    verdict = jsYaml.load(fenceMatch[1]);
  } catch (e) {
    return { ok: false, error: `YAML parse error: ${e.message}` };
  }

  // severity field is structurally prohibited — check before all other validation
  if ("severity" in verdict) {
    return { ok: false, error: "severity field prohibited in validator output" };
  }

  if (!verdict.schema_version || verdict.schema_version !== 1) {
    return { ok: false, error: `schema_version must be 1, found ${verdict.schema_version}` };
  }

  if (!verdict.finding_id) return { ok: false, error: "finding_id required" };

  if (!VALID_VALIDATOR_VERDICTS.has(verdict.verdict)) {
    return { ok: false, error: `verdict must be one of ${[...VALID_VALIDATOR_VERDICTS].join(", ")}` };
  }

  if (verdict.verdict === "CONFIRMED" && !verdict.path_evidence) {
    return { ok: false, error: "path_evidence required for CONFIRMED verdict" };
  }
  if (verdict.verdict === "FALSE_POSITIVE" && !verdict.counter_evidence) {
    return { ok: false, error: "counter_evidence required for FALSE_POSITIVE verdict" };
  }
  if (verdict.verdict === "NEEDS_CONTEXT" && !verdict.reason) {
    return { ok: false, error: "reason required for NEEDS_CONTEXT verdict" };
  }

  const RE_REVIEW_VERDICTS = new Set(["FIXED", "REGRESSED", "STILL_CONFIRMED"]);
  if (RE_REVIEW_VERDICTS.has(verdict.verdict) && !verdict.prior_find_id) {
    return { ok: false, error: "prior_find_id required for re-review verdicts (FIXED/REGRESSED/STILL_CONFIRMED)" };
  }

  if (!verdict.validated_at) {
    return { ok: false, error: "validated_at required" };
  }

  return { ok: true, verdict };
}

/**
 * Validate that a CONFIRMED verdict's path_evidence references a real file with
 * a real verbatim quote. Pure — no side effects, returns new object, never mutates.
 *
 * Only called when grounded_required === true in pipeline state. When the file
 * or quote cannot be verified, the verdict is downgraded to NEEDS_CONTEXT so
 * fabricated evidence cannot enter the confirmed ledger.
 *
 * @param {Object} verdict — parsed validator verdict object
 * @param {string} projectRoot — absolute path to project root (parent of .pipeline/)
 * @returns {Object} — original verdict or downgraded copy; never mutates input
 */
function validatePathEvidence(verdict, projectRoot) {
  if (verdict.verdict !== "CONFIRMED") return verdict;

  const evidence = verdict.path_evidence;
  if (!evidence || typeof evidence !== "string") {
    return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-evidence-unparseable" };
  }

  // Parse: "path/to/file.js:42 — some code" or "path/to/file.js — some code"
  // Em-dash with whitespace boundary is mandatory; hyphen is not a separator,
  // so hyphenated filenames like "review-runner.js" parse correctly.
  const colonMatch = evidence.match(/^([^:—\n]+?)(?::(\d+))?\s+—\s+(.+)$/s);
  if (!colonMatch) {
    return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-evidence-unparseable" };
  }

  const [, filePath, citedLineRaw, quote] = colonMatch;
  const absPath = path.isAbsolute(filePath.trim())
    ? filePath.trim()
    : path.join(projectRoot, filePath.trim());

  // Reject path traversal — evidence must reference a file inside the project
  if (!path.resolve(absPath).startsWith(path.resolve(projectRoot) + path.sep) &&
      path.resolve(absPath) !== path.resolve(projectRoot)) {
    return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-evidence-outside-project" };
  }

  if (!fs.existsSync(absPath)) {
    return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-not-found" };
  }

  let content;
  try { content = fs.readFileSync(absPath, "utf8"); }
  catch (_e) { return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-not-found" }; }

  const trimmedQuote = quote.trim();

  if (trimmedQuote.length < MIN_PATH_EVIDENCE_QUOTE_CHARS) {
    return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-evidence-too-short" };
  }

  if (!content.includes(trimmedQuote)) {
    return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "fabricated-path-evidence" };
  }

  // When the validator cited a specific line, require the verbatim quote
  // to appear within PATH_EVIDENCE_LINE_TOLERANCE lines of it. A quote that
  // exists "somewhere in the file" but nowhere near the cited line is a
  // strong fabrication signal — the agent likely picked plausible-sounding
  // line numbers that do not correspond to the code it described.
  if (citedLineRaw) {
    const citedLine = parseInt(citedLineRaw, 10);
    if (Number.isFinite(citedLine) && citedLine > 0) {
      const lines = content.split(/\r?\n/);
      const windowStart = Math.max(0, citedLine - 1 - PATH_EVIDENCE_LINE_TOLERANCE);
      const windowEnd = Math.min(lines.length, citedLine - 1 + PATH_EVIDENCE_LINE_TOLERANCE + 1);
      const windowText = lines.slice(windowStart, windowEnd).join("\n");
      if (!windowText.includes(trimmedQuote)) {
        return { ...verdict, verdict: "NEEDS_CONTEXT", reason: "path-evidence-line-mismatch" };
      }
    }
  }

  return verdict;
}

/**
 * Write false-positives.yaml for the sprint review directory.
 *
 * Called after all validator outputs are collected. FALSE_POSITIVE entries
 * are written here and must NEVER appear in confirmed-findings.yaml.
 *
 * @param {string} sprintReviewDir — absolute path to .pipeline/reviews/sprint-NN/
 * @param {number} sprintNumber — sprint number
 * @param {Array<Object>} validatorOutputs — array of parsed validator verdict objects
 * @returns {string} — absolute path to written false-positives.yaml
 */
function writeFalsePositives(sprintReviewDir, sprintNumber, validatorOutputs) {
  const falsePositives = validatorOutputs.filter((v) => v.verdict === "FALSE_POSITIVE");
  const fpPath = path.join(sprintReviewDir, "false-positives.yaml");
  yamlIO.safeWrite(fpPath, {
    schema_version: 1,
    sprint: sprintNumber,
    generated_at: new Date().toISOString(),
    false_positives: falsePositives.map((v) => ({
      finding_id: v.finding_id,
      counter_evidence: v.counter_evidence,
      validator_perspective: v.validator_perspective,
      validated_at: v.validated_at,
    })),
  });
  return fpPath;
}

/**
 * Halt if this is a re-review but confirmed-findings.yaml is absent.
 *
 * Must be called BEFORE any QA agents are dispatched. A re-review is detected
 * by the presence of qa-run-output.yaml from a prior run. If that file exists
 * but the ledger (confirmed-findings.yaml) is missing, the pipeline is in an
 * inconsistent state and review cannot proceed safely.
 *
 * Calls process.exit(1) on halt — does NOT write QA-REPORT.md.
 *
 * @param {string} sprintReviewDir — absolute path to .pipeline/reviews/sprint-NN/
 */
function checkMissingLedger(sprintReviewDir) {
  const priorQaOutput = path.join(sprintReviewDir, "qa-run-output.yaml");
  const isRereview = fs.existsSync(priorQaOutput);
  const ledgerPath = path.join(sprintReviewDir, "confirmed-findings.yaml");

  if (isRereview && !fs.existsSync(ledgerPath)) {
    // Throw rather than process.exit so the rejection is observable in the
    // async runReview Promise chain — earlier process.exit(1) here bypassed
    // caller try/catch and made the path untestable.
    const err = new Error(
      `Re-review halted: confirmed-findings.yaml not found.\nExpected at: ${ledgerPath}`
    );
    err.code = "ERR_MISSING_LEDGER";
    throw err;
  }
}

/**
 * Wrap a validator function call with a wall-clock timeout.
 * Rejects with Error("validator-timeout") if timeoutMs elapses first.
 *
 * @param {Function} validatorFn — zero-arg async function returning validator result
 * @param {number} timeoutMs — milliseconds before timeout rejection
 * @returns {Promise<*>}
 */
function dispatchValidatorWithTimeout(validatorFn, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("validator-timeout")), timeoutMs);
    // Wrap in Promise.resolve().then so that sync throws and non-Promise
    // returns are funnelled through the same error path. Without this,
    // a validatorFn that throws synchronously (or returns undefined / a
    // plain value) caused an unhandled TypeError inside the executor and
    // the timer was never cleared — leaking for the full timeout window.
    Promise.resolve()
      .then(() => validatorFn())
      .then(
        (result) => { clearTimeout(timer); resolve(result); },
        (err) => { clearTimeout(timer); reject(err); }
      );
  });
}

/**
 * Map a validator dispatch error to a synthetic NEEDS_CONTEXT verdict for every
 * finding owned by that validator perspective.
 *
 * @param {Error} err — the caught error from dispatchValidatorWithTimeout
 * @param {string} perspectiveId — validator's perspective ID
 * @param {Array<Object>} allFindings — all qa findings (from categorizeFindings output)
 * @returns {Array<Object>} synthetic verdict objects for affected findings
 */
function buildTimeoutVerdicts(err, perspectiveId, allFindings) {
  // Determine reason string from error message
  let reason;
  if (err.message === "validator-timeout") {
    reason = "validator-timeout";
  } else if (err.message && err.message.startsWith("YAML parse error")) {
    reason = "validator-parse-failure";
  } else {
    reason = "validator-unknown-verdict";
  }

  const affected = allFindings.filter((f) => f.perspective === perspectiveId);

  // When no findings are attributed to this perspective, return single synthetic entry
  if (affected.length === 0) {
    return [{ verdict: "NEEDS_CONTEXT", finding_id: `${perspectiveId}-timeout`, reason, validator_perspective: perspectiveId }];
  }

  return affected.map((f) => ({
    verdict: "NEEDS_CONTEXT",
    finding_id: f.id || `${perspectiveId}-unknown`,
    reason,
    validator_perspective: perspectiveId,
  }));
}

/**
 * Read human acknowledgment records from acknowledged.yaml.
 * Returns only entries where acknowledged_by === "human" with a find_id and rationale.
 * Read-only — never writes the file.
 *
 * @param {string} ackPath — absolute path to acknowledged.yaml
 * @returns {Array<{ find_id: string, acknowledged_by: string, rationale: string }>}
 */
function readAcknowledgments(ackPath) {
  if (!fs.existsSync(ackPath)) return [];
  const data = yamlIO.safeRead(ackPath);
  if (!data || !Array.isArray(data.acknowledgments)) return [];
  return data.acknowledgments.filter(
    (a) =>
      a.acknowledged_by === "human" &&
      typeof a.find_id === "string" &&
      a.find_id.length > 0 &&
      a.rationale
  );
}

/**
 * Compute PASS/FAIL verdict from a confirmed-findings ledger and acknowledgment records.
 *
 * Two independent gates controlled by named constants:
 *   - PASS_REQUIRES_ZERO_CONFIRMED_CRITICALS: any CONFIRMED critical → FAIL
 *   - PASS_REQUIRES_ZERO_UNACKNOWLEDGED_NC_CRITICALS: NEEDS_CONTEXT critical without
 *     a human acknowledgment → FAIL
 *
 * @param {{ findings?: Array<Object> }|null} ledger — confirmed-findings ledger object
 * @param {Array<{ find_id: string, acknowledged_by: string, rationale: string }>} ackRecords
 * @returns {{ verdict: "PASS"|"FAIL", confirmed_criticals: number, unacknowledged_nc_criticals: number }}
 */
function computeVerdict(ledger, ackRecords) {
  const findings = (ledger && ledger.findings) || [];
  // Only human acknowledgments count — auto-generated acks are not trusted
  const humanAcks = (ackRecords || []).filter((a) => a.acknowledged_by === "human");
  const ackSet = new Set(humanAcks.map((a) => a.find_id));

  const confirmedCriticals = findings.filter(
    (f) => f.status === "CONFIRMED" && f.severity === "critical"
  ).length;

  const unacknowledgedNcCriticals = findings.filter(
    (f) => f.status === "NEEDS_CONTEXT" && f.severity === "critical" && !ackSet.has(f.id)
  ).length;

  const pass =
    (PASS_REQUIRES_ZERO_CONFIRMED_CRITICALS ? confirmedCriticals === 0 : true) &&
    (PASS_REQUIRES_ZERO_UNACKNOWLEDGED_NC_CRITICALS ? unacknowledgedNcCriticals === 0 : true);

  return {
    verdict: pass ? "PASS" : "FAIL",
    confirmed_criticals: confirmedCriticals,
    unacknowledged_nc_criticals: unacknowledgedNcCriticals,
  };
}

/**
 * Orchestrate the full review pipeline for a sprint:
 *   1. Barrier sync: collect all QA findings (caller provides parsedOutputs — already complete)
 *   2. Write qa-run-output.yaml (stable finding IDs before any validator sees them)
 *   3. Write validator-checkpoint.yaml
 *   4. Dispatch all validators as a second wave, with per-validator timeout
 *   5. Heartbeat lockfile throughout the validator wait
 *   6. Update checkpoint after each validator completes (n-1 quorum — one failure allowed)
 *   7. Write false-positives.yaml
 *   8. Write QA-REPORT.md
 *
 * Validator wave is a second wave AFTER all QA agents complete — never triggered
 * per-QA-completion (barrier sync enforced by function signature: caller must have
 * already awaited all QA agents and assembled parsedOutputs before calling runReview).
 *
 * @param {Array<Object>} parsedOutputs — parsed QA agent outputs from parseReviewOutputs
 * @param {number} sprintNumber — completed sprint number
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {Object} config — pipeline config
 * @param {Array<Function>} [validatorFns] — optional array of per-perspective async validator functions;
 *   each function must return a raw string (validator agent output). When omitted (normal pipeline
 *   operation) validators are dispatched externally and outputs passed via validatorRawOutputs.
 * @param {Array<{ perspectiveId: string, rawOutput: string }>} [validatorRawOutputs] — pre-collected
 *   raw validator outputs when dispatched externally (alternative to validatorFns).
 * @returns {Promise<{ ok: boolean, reportPath: string, validatorVerdicts: Array<Object>, summary: Object }>}
 */
async function runReview(parsedOutputs, sprintNumber, pipelineDir, config, validatorFns, validatorRawOutputs) {
  const sprintPad = String(sprintNumber).padStart(2, "0");
  const sprintReviewDir = path.join(pipelineDir, "reviews", `sprint-${sprintPad}`);
  paths.ensureDir(sprintReviewDir);
  checkMissingLedger(sprintReviewDir);

  // --- Step 1: Categorize all QA findings (barrier sync already enforced by caller) ---
  const categorized = categorizeFindings(parsedOutputs);
  const { categorized: capped, suppressedCount } = applySuspectedCap(categorized);
  const allFindings = [
    ...capped.confirmed,
    ...capped.likely,
    ...capped.suspected,
  ];

  // --- Step 2: Write qa-run-output.yaml BEFORE any validator dispatch ---
  // Assigns stable qa-finding-NNN IDs that validators reference.
  const qaRunOutputPath = writeQaRunOutput(sprintReviewDir, sprintNumber, allFindings);

  // Attach IDs back onto allFindings so buildTimeoutVerdicts can reference them
  allFindings.forEach((f, idx) => {
    f.id = `qa-finding-${String(idx + 1).padStart(3, "0")}`;
  });

  // --- Step 3: Write validator-checkpoint.yaml before first dispatch ---
  const checkpointPath = path.join(sprintReviewDir, "validator-checkpoint.yaml");
  const perspectives = DEFAULT_REVIEW_PERSPECTIVES;
  const checkpoint = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    validators_dispatched: perspectives.map((p) => p.id),
    validators_completed: [],
  };
  yamlIO.safeWrite(checkpointPath, checkpoint);

  // Determine if path-evidence grounding check is required for this run.
  // Read state once here — grounded_required is a pipeline-level flag.
  const statePath = path.join(pipelineDir, "state.yaml");
  const pipelineState = yamlIO.safeReadWithFallback(statePath);
  const groundedRequired = pipelineState && pipelineState.grounded_required === true;
  const projectRoot = path.resolve(pipelineDir, "..");

  // --- Steps 4 + 5: Dispatch validators (second wave) with timeout + heartbeat ---
  const validatorVerdicts = [];

  const heartbeat = setInterval(
    () => Promise.resolve(lockfile.updateHeartbeat(pipelineDir)).catch(() => {}),
    HEARTBEAT_INTERVAL_MS
  );
  // Must not prevent process exit if the event loop would otherwise drain
  heartbeat.unref();

  try {
    if (validatorFns && validatorFns.length > 0) {
      // Programmatic mode: caller supplies async validator functions (one per perspective)
      const validatorPromises = perspectives.map(async (perspective, i) => {
        const fn = validatorFns[i];
        const findingCount = allFindings.filter(f => f.perspective === perspective.id).length;

        if (!fn) {
          // No function for this perspective — treat as NEEDS_CONTEXT
          const synthetic = buildTimeoutVerdicts(
            new Error("validator-unknown-verdict"),
            perspective.id,
            allFindings
          );
          synthetic.forEach((v) => validatorVerdicts.push(v));
          console.log(`[validator] ${perspective.id}: parse failure — ${findingCount} findings marked NEEDS_CONTEXT`);
          return;
        }

        console.log(`[validator] ${perspective.id}: processing ${findingCount} findings...`);

        let rawOutput;
        try {
          rawOutput = await dispatchValidatorWithTimeout(fn, VALIDATOR_TIMEOUT_MS);
        } catch (err) {
          // n-1 quorum: one failed validator must not fail the whole review
          const synthetic = buildTimeoutVerdicts(err, perspective.id, allFindings);
          synthetic.forEach((v) => validatorVerdicts.push(v));
          if (err.message === "validator-timeout") {
            console.log(`[validator] ${perspective.id}: timed out after ${VALIDATOR_TIMEOUT_MS / 1000}s (${findingCount} findings marked NEEDS_CONTEXT)`);
          } else {
            console.log(`[validator] ${perspective.id}: parse failure — ${findingCount} findings marked NEEDS_CONTEXT`);
          }
          // Update checkpoint even on failure
          checkpoint.validators_completed.push(perspective.id);
          yamlIO.safeWrite(checkpointPath, checkpoint);
          return;
        }

        const parsed = parseValidatorOutput(rawOutput);
        if (!parsed.ok) {
          const synthetic = buildTimeoutVerdicts(
            new Error(`YAML parse error: ${parsed.error}`),
            perspective.id,
            allFindings
          );
          synthetic.forEach((v) => validatorVerdicts.push(v));
          console.log(`[validator] ${perspective.id}: parse failure — ${findingCount} findings marked NEEDS_CONTEXT`);
        } else {
          const v = groundedRequired ? validatePathEvidence(parsed.verdict, projectRoot) : parsed.verdict;
          validatorVerdicts.push(v);
          const counts = countVerdicts(v);
          console.log(`[validator] ${perspective.id}: completed (${counts.confirmed} confirmed, ${counts.fp} false-positive, ${counts.nc} needs-context)`);
        }

        // Update checkpoint after each validator completes
        checkpoint.validators_completed.push(perspective.id);
        yamlIO.safeWrite(checkpointPath, checkpoint);
      });

      // Await all validators concurrently — barrier sync already done (QA wave is complete)
      await Promise.all(validatorPromises);

    } else if (validatorRawOutputs && validatorRawOutputs.length > 0) {
      // External dispatch mode: raw outputs provided (agent dispatch already done externally)
      for (const { perspectiveId, rawOutput } of validatorRawOutputs) {
        const findingCount = allFindings.filter(f => f.perspective === perspectiveId).length;
        console.log(`[validator] ${perspectiveId}: processing ${findingCount} findings...`);

        const parsed = parseValidatorOutput(rawOutput);
        if (!parsed.ok) {
          const synthetic = buildTimeoutVerdicts(
            new Error(`YAML parse error: ${parsed.error}`),
            perspectiveId,
            allFindings
          );
          synthetic.forEach((v) => validatorVerdicts.push(v));
          console.log(`[validator] ${perspectiveId}: parse failure — ${findingCount} findings marked NEEDS_CONTEXT`);
        } else {
          const v = groundedRequired ? validatePathEvidence(parsed.verdict, projectRoot) : parsed.verdict;
          validatorVerdicts.push(v);
          const counts = countVerdicts(v);
          console.log(`[validator] ${perspectiveId}: completed (${counts.confirmed} confirmed, ${counts.fp} false-positive, ${counts.nc} needs-context)`);
        }

        checkpoint.validators_completed.push(perspectiveId);
        yamlIO.safeWrite(checkpointPath, checkpoint);
      }
    }
    // If neither validatorFns nor validatorRawOutputs provided, proceed with no verdicts
    // (pipeline continues — n-1 quorum allows all validators to be absent)

  } finally {
    clearInterval(heartbeat);
    // Clear grounded_required — this run consumed it (DEC-035)
    if (groundedRequired) {
      const currentState = yamlIO.safeReadWithFallback(statePath) || {};
      yamlIO.safeWrite(statePath, {
        ...currentState,
        grounded_required: false,
        last_updated: new Date().toISOString(),
      });
    }
  }

  // --- Step 5b: Write confirmed-findings.yaml (DEC-039) ---
  const ledgerPath = path.join(sprintReviewDir, "confirmed-findings.yaml");
  const existingLedger = ledger.initLedger(ledgerPath);

  const newConfirmed = validatorVerdicts.filter(v => v.verdict === "CONFIRMED");
  if (newConfirmed.length > 0) {
    const { updated, nextId } = ledger.assignFindIds(newConfirmed, existingLedger.next_id);
    existingLedger.findings.push(...updated.map(v => ({
      id: v.id,
      finding_id: v.finding_id,
      verdict: "CONFIRMED",
      severity: (allFindings.find(f => f.id === v.finding_id) || {}).severity || "unknown",
      status: "CONFIRMED",
      path_evidence: v.path_evidence,
      validator_perspective: v.validator_perspective,
      confirmed_at: v.validated_at || new Date().toISOString(),
    })));
    existingLedger.next_id = nextId;
  }

  for (const v of validatorVerdicts.filter(v =>
    v.verdict === "FIXED" || v.verdict === "REGRESSED" || v.verdict === "STILL_CONFIRMED"
  )) {
    const entry = existingLedger.findings.find(f => f.id === v.prior_find_id);
    if (entry) {
      entry.status = v.verdict;
      entry.updated_at = v.validated_at || new Date().toISOString();
    } else {
      // prior_find_id supplied but not matched — surface this loudly. A
      // re-review verdict referencing a missing FIND-NNN ID is a contract
      // violation between the validator and the ledger; silently skipping
      // would lose the verdict signal and produce stale "CONFIRMED" status
      // on the next gate evaluation.
      process.stderr.write(
        `[essense-flow] WARNING: re-review verdict ${v.verdict} references prior_find_id ` +
        `${v.prior_find_id} which is not in the ledger; verdict ignored.\n`
      );
    }
  }

  ledger.writeLedger(ledgerPath, existingLedger);

  // --- Step 6: Write false-positives.yaml ---
  writeFalsePositives(sprintReviewDir, sprintNumber, validatorVerdicts);

  // --- Step 7: Compute verdict using ledger + acknowledgments ---
  // ledgerPath already defined in Step 5b above
  const confirmedLedger = fs.existsSync(ledgerPath) ? yamlIO.safeRead(ledgerPath) : null;

  // Read human acknowledgments (read-only — never written here)
  const ackPath = path.join(sprintReviewDir, "acknowledged.yaml");
  const ackRecords = readAcknowledgments(ackPath);

  const { verdict, confirmed_criticals, unacknowledged_nc_criticals } = computeVerdict(confirmedLedger, ackRecords);

  // --- Step 8: Generate and write QA-REPORT.md ---
  // Pass perspectives, validatorVerdicts, and allFindings so the report can:
  //   - validate the manifest (throws before write if any perspective missing)
  //   - render FALSE_POSITIVE juxtaposition blocks with original claim text
  const report = generateQAReport(sprintNumber, capped, parsedOutputs, suppressedCount, perspectives, validatorVerdicts, allFindings);
  const reportPath = writeQAReport(pipelineDir, sprintNumber, report);

  const summary = {
    totalFindings: allFindings.length,
    confirmed: capped.confirmed.length,
    likely: capped.likely.length,
    suspected: capped.suspected.length,
    suppressedCount,
    validatorVerdictCount: validatorVerdicts.length,
    falsePositiveCount: validatorVerdicts.filter((v) => v.verdict === "FALSE_POSITIVE").length,
    verdict,
    confirmed_criticals,
    unacknowledged_nc_criticals,
    // Legacy boolean for callers that check summary.pass directly
    pass: verdict === "PASS",
  };

  return { ok: true, reportPath, qaRunOutputPath, validatorVerdicts, summary };
}

/**
 * Build a minimal QA-REPORT.md from deterministic gate failures.
 * Used when the gate fails and LLM review is skipped — failures ARE the findings.
 */
function buildGateFailureReport(sprintNumber, gateFindings) {
  const lines = [];
  const blocksAdvanceCount = gateFindings.filter((f) => f.blocks_advance === "yes").length;
  const findingsTotal = gateFindings.length;
  const verdict = blocksAdvanceCount > 0 ? "FAIL" : "PASS";

  lines.push("---");
  lines.push("artifact: qa-report");
  lines.push("schema_version: 2");
  lines.push("produced_by: /review");
  lines.push("read_by: /triage");
  lines.push(`sprint: ${sprintNumber}`);
  lines.push(`verdict: ${verdict}`);
  lines.push(`blocks_advance_count: ${blocksAdvanceCount}`);
  lines.push(`findings_total: ${findingsTotal}`);
  lines.push("source: deterministic-gate");
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");
  lines.push(`# Sprint ${sprintNumber} QA Report`);
  lines.push("");
  lines.push("## QA Summary");
  lines.push("Source: deterministic gate (npm test / lint).");
  lines.push("LLM review skipped — fix deterministic failures before re-running review.");
  lines.push(`Verdict: ${verdict}`);
  lines.push(`blocks_advance_count: ${blocksAdvanceCount}`);
  lines.push(`Total findings: ${findingsTotal}`);
  lines.push("");
  lines.push("## Confirmed Findings");
  lines.push("");
  for (const f of gateFindings) {
    lines.push(`### [${(f.severity || "critical").toUpperCase()}] ${f.id}: ${f.type || f.category} failure`);
    lines.push("");
    lines.push(`- **Confidence:** CONFIRMED`);
    lines.push(`- **Severity:** ${f.severity}`);
    lines.push(`- **blocks_advance:** ${f.blocks_advance}`);
    lines.push(`- **Source:** ${f.file}`);
    lines.push(`- **Reproduction:** \`${f.reproduction}\``);
    lines.push(`- **Detail:** ${f.reason}`);
    if (f.output) {
      const truncated = String(f.output).slice(0, 4000);
      lines.push("");
      lines.push("```");
      lines.push(truncated);
      if (String(f.output).length > 4000) lines.push("... (truncated)");
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Run deterministic gate, write QA-REPORT directly if it fails.
 * SKILL.md instructs the review skill to call this BEFORE dispatching QA agents:
 *   - gate.ok = false → QA-REPORT is already written; do NOT dispatch agents; return.
 *   - gate.ok = true → proceed with normal LLM review (assemble briefs, dispatch, runReview).
 *
 * This is the "deterministic before LLM" enforcement point. Tests/lint failures are
 * findings the LLM does not need to re-discover.
 */
function preReviewGate(projectRoot, pipelineDir, sprintNumber, options = {}) {
  const gate = deterministicGate.runGate(projectRoot, options);
  if (gate.ok) {
    return { ok: true, gateRan: true, gateResult: gate };
  }
  const findings = deterministicGate.failuresToFindings(gate.failures, sprintNumber);
  const reportContent = buildGateFailureReport(sprintNumber, findings);
  const reportPath = writeQAReport(pipelineDir, sprintNumber, reportContent);
  return {
    ok: false,
    gateRan: true,
    gateResult: gate,
    qaReportPath: reportPath,
    findings,
    reason: "deterministic gate failed — fix before re-running review",
  };
}

module.exports = {
  countVerdicts,
  DEFAULT_REVIEW_PERSPECTIVES,
  CONFIDENCE_TIERS,
  SEVERITY_LEVELS,
  CONFIDENCE_KEYWORDS,
  SEVERITY_KEYWORDS,
  SUSPECTED_CAP_RATIO,
  generateBriefId,
  assembleReviewBriefs,
  extractBuiltFilePathsFromPaths,
  parseReviewOutputs,
  inferConfidence,
  inferSeverity,
  extractSeverityPrefix,
  isPositiveConfirmation,
  isFixRecommendation,
  findingDedupKey,
  dedupFindings,
  filterFindings,
  categorizeFindings,
  applySuspectedCap,
  buildValidatorManifestRows,
  buildValidatorResults,
  lookupOriginalFindingText,
  generateQAReport,
  extractFindingName,
  writeQAReport,
  finalizeReview,
  enterReview,
  loadSpecPath,
  loadRequirements,
  loadTaskSpecPaths,
  loadCompletionRecordPaths,
  validatePositiveControl,
  MAX_REVIEW_CYCLES,
  checkReviewCycleLimit,
  incrementReviewCycle,
  writeQaRunOutput,
  VALID_VALIDATOR_VERDICTS,
  parseValidatorOutput,
  writeFalsePositives,
  checkMissingLedger,
  dispatchValidatorWithTimeout,
  buildTimeoutVerdicts,
  validatePathEvidence,
  runReview,
  readAcknowledgments,
  computeVerdict,
  // Deterministic gate — call BEFORE dispatching QA agents.
  // preReviewGate runs the gate AND writes QA-REPORT directly if failures occur.
  // SKILL.md uses this as the entry point — when ok:false, do NOT dispatch agents.
  preReviewGate,
  buildGateFailureReport,
  runDeterministicGate: (projectRoot, options) => deterministicGate.runGate(projectRoot, options),
  gateFailuresToFindings: (failures, sprint) => deterministicGate.failuresToFindings(failures, sprint),
};
