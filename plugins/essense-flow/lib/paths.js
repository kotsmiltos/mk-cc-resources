"use strict";

const fs = require("fs");
const path = require("path");
const { PIPELINE_DIR_NAME, LOCK_FILE_NAME, HASH_STORE_FILE, STATE_HISTORY_FILE, STATE_FILE, CONFIG_FILE } = require("./constants");

/**
 * Create a directory if it doesn't exist (idempotent, recursive).
 *
 * @param {string} dirPath — absolute path to directory
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Locate the nearest `.pipeline` directory by walking up from startDir.
 * Respects ESSENSE_PIPELINE_DIR env override for testing/CI.
 *
 * @param {string} startDir — directory to begin the upward search from
 * @returns {string|null} absolute path to the pipeline dir, or null if not found
 */
function findPipelineDir(startDir) {
  if (process.env.ESSENSE_PIPELINE_DIR) {
    const override = path.resolve(process.env.ESSENSE_PIPELINE_DIR);
    return fs.existsSync(override) ? override : null;
  }
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, PIPELINE_DIR_NAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Build a frozen map of all well-known paths inside a pipeline directory.
 *
 * @param {string} pipelineDir — absolute path to the pipeline root
 * @returns {Readonly<object>} frozen object with named path properties
 */
function pipelinePaths(pipelineDir) {
  return Object.freeze({
    root:           pipelineDir,
    state:          path.join(pipelineDir, STATE_FILE),
    stateBak:       path.join(pipelineDir, STATE_FILE + ".bak"),
    config:         path.join(pipelineDir, CONFIG_FILE),
    lock:           path.join(pipelineDir, LOCK_FILE_NAME),
    hashes:         path.join(pipelineDir, HASH_STORE_FILE),
    history:        path.join(pipelineDir, STATE_HISTORY_FILE),
    elicitation:    path.join(pipelineDir, "elicitation"),
    requirements:   path.join(pipelineDir, "requirements"),
    architecture:   path.join(pipelineDir, "architecture"),
    triage:         path.join(pipelineDir, "triage"),
    reviews:        path.join(pipelineDir, "reviews"),
    sprints:        path.join(pipelineDir, "sprints"),
    decisions:      path.join(pipelineDir, "decisions"),
  });
}

/**
 * Resolve the directory path for a specific sprint number.
 * Sprint numbers are zero-padded to 2 digits (e.g. sprint-01, sprint-12).
 *
 * @param {string} pipelineDir — absolute path to the pipeline root
 * @param {number} sprintNumber — 1-based sprint number
 * @returns {string} absolute path to the sprint directory
 */
function sprintDir(pipelineDir, sprintNumber) {
  const padded = String(sprintNumber).padStart(2, "0");
  return path.join(pipelineDir, "sprints", `sprint-${padded}`);
}

module.exports = { ensureDir, findPipelineDir, pipelinePaths, sprintDir };
