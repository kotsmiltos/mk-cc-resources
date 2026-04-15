"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("./yaml-io");
const paths = require("./paths");

// Phase-specific progress file locations (relative to pipelineDir)
const PROGRESS_PATHS = {
  research: "research/progress.yaml",
  architecture: "architecture/progress.yaml",
  // Build and review use sprint-specific paths — handled dynamically
};

/**
 * Resolve the progress file path for a given phase.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} phase — phase name
 * @param {number} [sprintNumber] — sprint number (for build/review phases)
 * @returns {string} — absolute path to progress file
 */
function _progressPath(pipelineDir, phase, sprintNumber) {
  if (phase === "build" || phase === "sprinting") {
    const sprintDir = `sprint-${String(sprintNumber || 1).padStart(2, "0")}`;
    return path.join(pipelineDir, "sprints", sprintDir, "progress.yaml");
  }
  if (phase === "review" || phase === "reviewing") {
    const sprintDir = `sprint-${String(sprintNumber || 1).padStart(2, "0")}`;
    return path.join(pipelineDir, "reviews", sprintDir, "progress.yaml");
  }
  const relPath = PROGRESS_PATHS[phase];
  if (relPath) return path.join(pipelineDir, relPath);
  return path.join(pipelineDir, phase, "progress.yaml");
}

/**
 * Initialize a progress file for a phase.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} phase — phase name
 * @param {Object} [metadata] — additional metadata (sprintNumber, agentCount, etc.)
 * @returns {{ ok: boolean, progressPath: string }}
 */
function initProgress(pipelineDir, phase, metadata) {
  const progressPath = _progressPath(pipelineDir, phase, metadata && metadata.sprintNumber);
  paths.ensureDir(path.dirname(progressPath));

  const data = {
    phase,
    started_at: new Date().toISOString(),
    agents: [],
    tasks_total: (metadata && metadata.tasksTotal) || 0,
    tasks_complete: 0,
    last_update: new Date().toISOString(),
  };

  yamlIO.safeWrite(progressPath, data);
  return { ok: true, progressPath };
}

/**
 * Update progress data atomically.
 *
 * @param {string} progressPath — absolute path to progress file
 * @param {Object} update — partial data to merge
 * @returns {{ ok: boolean }}
 */
function updateProgress(progressPath, update) {
  const current = yamlIO.safeReadWithFallback(progressPath);
  if (!current) return { ok: false, error: "No progress file to update" };

  // Merge agent updates
  if (update.agent) {
    const existing = current.agents.findIndex((a) => a.id === update.agent.id);
    if (existing >= 0) {
      Object.assign(current.agents[existing], update.agent);
    } else {
      current.agents.push(update.agent);
    }
    delete update.agent;
  }

  // Merge remaining fields
  Object.assign(current, update);
  current.last_update = new Date().toISOString();

  yamlIO.safeWrite(progressPath, current);
  return { ok: true };
}

/**
 * Read current progress data.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} phase — phase name
 * @param {number} [sprintNumber] — sprint number for build/review
 * @returns {Object|null} — progress data or null if not running
 */
function readProgress(pipelineDir, phase, sprintNumber) {
  const progressPath = _progressPath(pipelineDir, phase, sprintNumber);
  return yamlIO.safeReadWithFallback(progressPath);
}

/**
 * Clean up progress file after phase completes.
 *
 * @param {string} progressPath — absolute path to progress file
 * @returns {{ ok: boolean }}
 */
function clearProgress(progressPath) {
  try {
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { initProgress, updateProgress, readProgress, clearProgress };
