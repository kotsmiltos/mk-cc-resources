"use strict";

const path = require("path");
const fs = require("fs");
const yamlIO = require("../../../lib/yaml-io");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");
const exchangeLog = require("../../../lib/exchange-log");

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
function writeSpec(pipelineDir, content) {
  if (!content || typeof content !== "string" || !content.trim()) {
    return { ok: false, error: "SPEC.md content is empty" };
  }

  const sanitized = sanitizeContent(content);
  const tokenCount = tokens.countTokens(sanitized);

  const specPath = path.join(pipelineDir, ELICITATION_DIR, SPEC_FILE);
  paths.ensureDir(path.dirname(specPath));
  fs.writeFileSync(specPath, sanitized, "utf8");

  // Store content hash for staleness detection
  try {
    const integrity = require("../../../lib/artifact-integrity");
    integrity.storeHash(pipelineDir, "elicitation/SPEC.md", integrity.computeHash(specPath));
  } catch (_e) { /* integrity is advisory */ }

  return { ok: true, path: specPath, tokenCount };
}

module.exports = {
  initSession,
  loadSession,
  saveState,
  appendExchange,
  loadExchanges,
  sanitizeContent,
  writeSpec,
};
