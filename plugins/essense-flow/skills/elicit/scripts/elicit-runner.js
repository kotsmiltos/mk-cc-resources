"use strict";

const path = require("path");
const fs = require("fs");
const yamlIO = require("../../../lib/yaml-io");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");
const exchangeLog = require("../../../lib/exchange-log");
const { COMPLEXITY_ASSESSMENTS, COMPLEXITY_TOUCH_SURFACES, SPEC_PATH } = require("../../../lib/constants");

const ELICITATION_DIR = "elicitation";
const STATE_FILE = "state.yaml";
const EXCHANGES_FILE = "exchanges.yaml";
const SPEC_FILE = "SPEC.md";
const GITIGNORE_ENTRY = ".pipeline/elicitation/";

// Patterns to sanitize in SPEC.md output before writing
const INJECTION_PATTERNS = [
  { pattern: /<!--\s*SENTINEL:/g, replacement: "<!-- [SANITIZED-SENTINEL]:" },
  { pattern: /<agent-output>/g, replacement: "&lt;agent-output&gt;" },
  { pattern: /<\/agent-output>/g, replacement: "&lt;/agent-output&gt;" },
  { pattern: /<data-block/g, replacement: "&lt;data-block" },
  { pattern: /<\/data-block>/g, replacement: "&lt;/data-block&gt;" },
  { pattern: /\{\{([A-Z_]+)\}\}/g, replacement: "\\{\\{$1\\}\\}" },
];

/**
 * Map a finding kind to the SPEC.md block type it should expand into.
 * Used by the spec-expansion branch to label queued findings before
 * the agent appends them to the existing spec.
 *
 * @param {string} kind — finding kind from queued-findings.yaml
 * @returns {string} — block type label
 */
function classifyBlockType(kind) {
  const map = {
    bug: "constraint",
    feature: "feature",
    ux: "ux",
    requirement: "feature",
    other: "note",
  };
  return map[kind] || "note";
}

/**
 * Run the spec-expansion branch when queued findings AND an existing SPEC.md
 * are both present. Processes each finding and emits structured log lines so
 * the orchestrator knows which block type each finding maps to.
 * Returns true when the branch ran (callers should skip normal elicitation).
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {boolean} — true if spec-expansion branch was activated
 */
function runSpecExpansionIfNeeded(pipelineDir) {
  const queuedFindingsPath = path.join(pipelineDir, "triage", "queued-findings.yaml");
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");

  const hasQueuedFindings = fs.existsSync(queuedFindingsPath);
  const hasExistingSpec = fs.existsSync(specPath);

  // Branch only activates when BOTH conditions hold — missing either means
  // this is a fresh elicitation or there is nothing queued to expand.
  if (!hasQueuedFindings || !hasExistingSpec) {
    return false;
  }

  const findingsData = yamlIO.safeReadWithFallback(queuedFindingsPath) || { items: [] };
  const findings = Array.isArray(findingsData.items) ? findingsData.items : [];

  process.stdout.write("[SPEC-EXPAND] Spec-expansion branch activated.\n");
  for (const finding of findings) {
    const blockType = classifyBlockType(finding.kind || "other");
    process.stdout.write(
      `[SPEC-EXPAND] Finding: ${finding.id || "unknown"} (${finding.kind || "other"}) → ${blockType} block\n`
    );
  }

  return true; // signal caller to skip initial seed questionnaire
}

/**
 * Initialize a new elicitation session.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} seed — the user's initial project pitch
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, sessionDir?: string, error?: string }}
 */
function initSession(pipelineDir, seed, config) {
  const sessionDir = path.join(pipelineDir, ELICITATION_DIR);
  const existingState = path.join(sessionDir, STATE_FILE);
  if (fs.existsSync(existingState)) {
    return { ok: false, error: "Session already exists. Use loadSession() to resume or delete .pipeline/elicitation/ to start fresh." };
  }

  paths.ensureDir(sessionDir);

  const now = new Date().toISOString();

  const state = {
    schema_version: 1,
    status: "active",
    current_round: 0,
    started_at: now,
    last_updated: now,
    seed: seed || "",
    explored: {},
    deferred: [],
    decisions: [],
  };

  const exchanges = {
    schema_version: 1,
    exchanges: [],
  };

  yamlIO.safeWrite(path.join(sessionDir, STATE_FILE), state);
  yamlIO.safeWrite(path.join(sessionDir, EXCHANGES_FILE), exchanges);

  // Ensure .pipeline/elicitation/ is gitignored
  const projectRoot = path.dirname(pipelineDir);
  const gitignorePath = path.join(projectRoot, ".gitignore");
  try {
    const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
    if (!existing.includes(GITIGNORE_ENTRY)) {
      const append = (existing && !existing.endsWith("\n") ? "\n" : "") + GITIGNORE_ENTRY + "\n";
      fs.appendFileSync(gitignorePath, append, "utf8");
    }
  } catch (_e) {
    // Non-fatal — gitignore is a safety measure, not critical
  }

  return { ok: true, sessionDir };
}

/**
 * Load session metadata from state.yaml.
 * Returns null if no session exists or state is corrupt.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {Object|null}
 */
function loadSession(pipelineDir) {
  const stateFile = path.join(pipelineDir, ELICITATION_DIR, STATE_FILE);
  return yamlIO.safeReadWithFallback(stateFile);
}

/**
 * Save updated session state to disk.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {Object} state — the full state object to persist
 */
function saveState(pipelineDir, state) {
  const stateFile = path.join(pipelineDir, ELICITATION_DIR, STATE_FILE);
  state.last_updated = new Date().toISOString();
  yamlIO.safeWrite(stateFile, state);
}

/**
 * Append an exchange to the conversation log.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {Object} exchange — { round, timestamp, system, user, areas_touched, decisions_made }
 */
function appendExchange(pipelineDir, exchange) {
  const { logPath } = exchangeLog.createLog(pipelineDir, "elicitation");
  return exchangeLog.appendExchange(logPath, exchange);
}

/**
 * Load full conversation log for session resume.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {Array} array of exchange objects, or empty array
 */
function loadExchanges(pipelineDir) {
  const { logPath } = exchangeLog.createLog(pipelineDir, "elicitation");
  return exchangeLog.loadExchanges(logPath);
}

/**
 * Sanitize content by escaping injection patterns.
 *
 * @param {string} content — raw content to sanitize
 * @returns {string} sanitized content
 */
function sanitizeContent(content) {
  if (!content || typeof content !== "string") return "";
  let sanitized = content;
  for (const { pattern, replacement } of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

/**
 * Write the final SPEC.md to disk.
 * Sanitizes content before writing. No artificial token cap — output is
 * whatever length the design requires.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} content — the full SPEC.md content (Claude-authored)
 * @returns {{ ok: boolean, path?: string, tokenCount?: number, error?: string }}
 */
/**
 * Parse the complexity frontmatter block from SPEC.md content.
 * Returns null if not present or malformed — consumers must handle gracefully.
 *
 * Expected shape:
 *   complexity:
 *     assessment: bug-fix | new-feature | partial-rewrite | new-project
 *     touch_surface: narrow | moderate | broad
 *     unknown_count: N
 *     notes: "free text"
 */
function parseComplexityBlock(specContent) {
  if (!specContent || typeof specContent !== "string") return null;
  const fmMatch = specContent.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const blockMatch = fm.match(/^complexity:\s*\n((?:[ \t]+.*\n?)+)/m);
  if (!blockMatch) return null;
  const block = blockMatch[1];

  const get = (key) => {
    const m = block.match(new RegExp(`^[ \\t]+${key}:\\s*(.+?)\\s*$`, "m"));
    return m ? m[1].replace(/^["']|["']$/g, "") : null;
  };

  const assessment = get("assessment");
  const touchSurface = get("touch_surface");
  const unknownCountRaw = get("unknown_count");
  const notes = get("notes");

  return {
    assessment,
    touch_surface: touchSurface,
    unknown_count: unknownCountRaw == null ? null : parseInt(unknownCountRaw, 10),
    notes,
    valid: COMPLEXITY_ASSESSMENTS.includes(assessment) &&
           COMPLEXITY_TOUCH_SURFACES.includes(touchSurface) &&
           Number.isFinite(parseInt(unknownCountRaw, 10)),
  };
}

/**
 * Validate that the complexity block in SPEC content is well-formed.
 * Returns { ok, warnings } — warnings are advisory, never throw.
 */
function validateComplexityBlock(specContent) {
  const block = parseComplexityBlock(specContent);
  const warnings = [];
  if (!block) {
    warnings.push("SPEC.md missing complexity block in frontmatter — architect cannot adapt depth");
    return { ok: false, warnings };
  }
  if (!COMPLEXITY_ASSESSMENTS.includes(block.assessment)) {
    warnings.push(`complexity.assessment must be one of: ${COMPLEXITY_ASSESSMENTS.join(", ")}`);
  }
  if (!COMPLEXITY_TOUCH_SURFACES.includes(block.touch_surface)) {
    warnings.push(`complexity.touch_surface must be one of: ${COMPLEXITY_TOUCH_SURFACES.join(", ")}`);
  }
  if (!Number.isFinite(block.unknown_count)) {
    warnings.push("complexity.unknown_count must be a number");
  }
  return { ok: warnings.length === 0, warnings, block };
}

function writeSpec(pipelineDir, content, options = {}) {
  if (!content || typeof content !== "string" || !content.trim()) {
    return { ok: false, error: "SPEC.md content is empty" };
  }

  const sanitized = sanitizeContent(content);

  // Validate complexity block — advisory warning only (does not block write).
  // Architect uses this block to adapt decomposition depth; missing block defaults
  // to standard pipeline depth.
  const complexityCheck = validateComplexityBlock(sanitized);
  const specPath = path.join(pipelineDir, ELICITATION_DIR, SPEC_FILE);
  paths.ensureDir(path.dirname(specPath));

  let finalContent;
  let isAddendum = false;

  if (!options.restart && fs.existsSync(specPath)) {
    const existing = fs.readFileSync(specPath, "utf8");
    const date = new Date().toISOString().slice(0, 10);
    finalContent = `${existing}\n\n---\n\n## Addendum — ${date}\n\n${sanitized}`;
    isAddendum = true;
  } else {
    finalContent = sanitized;
  }

  const tokenCount = tokens.countTokens(finalContent);
  fs.writeFileSync(specPath, finalContent, "utf8");

  // Store content hash for staleness detection
  try {
    const integrity = require("../../../lib/artifact-integrity");
    integrity.storeHash(pipelineDir, SPEC_PATH, integrity.computeHash(specPath));
  } catch (_e) { /* integrity is advisory */ }

  return {
    ok: true,
    path: specPath,
    tokenCount,
    isAddendum,
    complexity: complexityCheck.block || null,
    complexityWarnings: complexityCheck.warnings || [],
  };
}

module.exports = {
  initSession,
  loadSession,
  saveState,
  appendExchange,
  loadExchanges,
  sanitizeContent,
  writeSpec,
  classifyBlockType,
  runSpecExpansionIfNeeded,
  // Complexity scoping — set by elicit, read by architect to adapt decomposition depth.
  parseComplexityBlock,
  validateComplexityBlock,
};
