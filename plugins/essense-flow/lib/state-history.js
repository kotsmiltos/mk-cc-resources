"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const yamlIO = require("./yaml-io");
const { HISTORY_SCHEMA_VERSION, STATE_HISTORY_FILE } = require("./constants");

function _historyPath(pipelineDir) {
  return path.join(pipelineDir, STATE_HISTORY_FILE);
}

/**
 * Append one state transition record to state-history.yaml.
 * Creates the file if it doesn't exist.
 * Uses write-to-temp-then-rename for atomicity.
 */
function appendTransition(pipelineDir, record) {
  if (!record || !record.fromState || !record.toState) {
    throw new Error('appendTransition: fromState and toState are required');
  }

  const filePath = _historyPath(pipelineDir);

  // Create directory if it doesn't exist — acceptance criteria: write creates file
  fs.mkdirSync(pipelineDir, { recursive: true });

  let history;
  if (fs.existsSync(filePath)) {
    try {
      history = yaml.load(fs.readFileSync(filePath, "utf8")) || {};
    } catch (e) {
      process.stderr.write(`[essense-flow] state-history parse error — resetting: ${e.message}\n`);
      history = {};
    }
  } else {
    history = {};
  }

  // Always ensure schema_version is present (backfills pre-existing files)
  history.schema_version = HISTORY_SCHEMA_VERSION;
  if (!Array.isArray(history.entries)) {
    history.entries = [];
  }

  history.entries.push({
    from_state: record.fromState,
    to_state: record.toState,
    trigger: record.trigger,
    timestamp: new Date().toISOString(),
    triggering_artifact: record.triggeringArtifact || null,
    session_id: record.sessionId || null,
    sprint: record.sprint != null ? record.sprint : null,
  });

  yamlIO.safeWrite(filePath, history);
}

/**
 * Read the last N entries from state-history.yaml.
 * Returns empty array if file does not exist.
 */
function readHistory(pipelineDir, limit = 20) {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) { limit = 20; }
  const filePath = _historyPath(pipelineDir);
  if (!fs.existsSync(filePath)) return [];

  try {
    const data = yaml.load(fs.readFileSync(filePath, "utf8")) || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return entries.slice(-limit);
  } catch (e) {
    process.stderr.write(`[essense-flow] state-history read error: ${e.message}\n`);
    return [];
  }
}

module.exports = { appendTransition, readHistory };
