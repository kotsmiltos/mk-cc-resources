"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("./yaml-io");
const paths = require("./paths");

/**
 * Generate a pipeline completion summary report.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {string} — markdown summary report
 */
function generateSummaryReport(pipelineDir) {
  const state = yamlIO.safeReadWithFallback(path.join(pipelineDir, "state.yaml"));
  const lines = [];

  lines.push("---");
  lines.push("artifact: completion-report");
  lines.push("schema_version: 1");
  lines.push("generated_at: " + JSON.stringify(new Date().toISOString()));
  lines.push("---");
  lines.push("");
  lines.push("# Pipeline Completion Report");
  lines.push("");

  // What was built — sprint summaries
  lines.push("## Sprints");
  lines.push("");
  if (state && state.sprints) {
    for (const [id, sprint] of Object.entries(state.sprints)) {
      const verdict = sprint.qa_verdict || "N/A";
      lines.push("### " + id);
      lines.push("");
      lines.push("- Status: " + (sprint.status || "unknown"));
      lines.push("- Tasks: " + (sprint.tasks_complete || 0) + "/" + (sprint.tasks_total || 0));
      lines.push("- Blocked: " + (sprint.tasks_blocked || 0));
      lines.push("- QA Verdict: " + verdict);
      lines.push("");
    }
  } else {
    lines.push("No sprint data available.");
    lines.push("");
  }

  // Decisions made
  lines.push("## Decisions");
  lines.push("");
  const decisionsPath = path.join(pipelineDir, "decisions", "index.yaml");
  const decisions = yamlIO.safeReadWithFallback(decisionsPath);
  if (decisions && decisions.decisions && decisions.decisions.length > 0) {
    for (const d of decisions.decisions) {
      lines.push("- **" + (d.id || "?") + "**: " + (d.decision || d.title || "(no description)"));
    }
  } else {
    lines.push("No decisions recorded.");
  }
  lines.push("");

  // Known limitations — from QA reports
  lines.push("## Known Limitations");
  lines.push("");
  const reviewsDir = path.join(pipelineDir, "reviews");
  let hasLimitations = false;
  if (fs.existsSync(reviewsDir)) {
    const sprintDirs = fs.readdirSync(reviewsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const sd of sprintDirs) {
      const qaPath = path.join(reviewsDir, sd.name, "QA-REPORT.md");
      if (fs.existsSync(qaPath)) {
        const content = fs.readFileSync(qaPath, "utf8");
        // Extract verdict from frontmatter
        const verdictMatch = content.match(/verdict:\s*"?(\w+)"?/);
        if (verdictMatch) {
          lines.push("- " + sd.name + ": " + verdictMatch[1]);
          hasLimitations = true;
        }
      }
    }
  }
  if (!hasLimitations) {
    lines.push("None identified.");
  }
  lines.push("");

  // Phases completed
  lines.push("## Phases Completed");
  lines.push("");
  if (state && state.phases_completed) {
    for (const [phase, info] of Object.entries(state.phases_completed)) {
      if (info) {
        lines.push("- **" + phase + "**: " + (info.completed_at || "unknown") + " → " + (info.artifact_path || "N/A"));
      }
    }
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Archive .pipeline/ to .pipeline-archive/YYYY-MM-DD-project-name/.
 *
 * @param {string} projectRoot — project root (parent of .pipeline/)
 * @param {string} projectName — project name for archive folder
 * @returns {{ ok: boolean, archivePath?: string, error?: string }}
 */
function archivePipeline(projectRoot, projectName) {
  const pipelineDir = path.join(projectRoot, ".pipeline");
  if (!fs.existsSync(pipelineDir)) {
    return { ok: false, error: ".pipeline/ does not exist" };
  }

  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const safeName = (projectName || "project").replace(/[^a-zA-Z0-9-_]/g, "-");
  const archiveName = date + "-" + safeName;
  const archiveDir = path.join(projectRoot, ".pipeline-archive", archiveName);

  if (fs.existsSync(archiveDir)) {
    return { ok: false, error: "Archive already exists: " + archiveDir };
  }

  // Copy .pipeline/ to archive (recursive copy)
  _copyDirSync(pipelineDir, archiveDir);

  return { ok: true, archivePath: archiveDir };
}

/**
 * Reset .pipeline/ to initial state.
 *
 * @param {string} projectRoot — project root
 * @param {string} projectName — project name for config
 * @returns {{ ok: boolean }}
 */
function resetPipeline(projectRoot, projectName) {
  const pipelineDir = path.join(projectRoot, ".pipeline");

  // Remove all contents except .gitignore patterns
  _removeDirContents(pipelineDir);

  // Re-initialize with defaults
  const pluginRoot = path.resolve(__dirname, "..");
  const defaultsDir = path.join(pluginRoot, "defaults");

  // Recreate subdirs
  const subdirs = ["elicitation", "requirements", "triage", "architecture", "sprints", "reviews", "decisions"];
  for (const sub of subdirs) {
    paths.ensureDir(path.join(pipelineDir, sub));
  }

  // Copy default config
  const configSrc = yamlIO.safeRead(path.join(defaultsDir, "config.yaml"));
  if (configSrc) {
    configSrc.pipeline.name = projectName || path.basename(projectRoot);
    configSrc.pipeline.created_at = new Date().toISOString();
    yamlIO.safeWrite(path.join(pipelineDir, "config.yaml"), configSrc);
  }

  // Copy default state
  const stateSrc = yamlIO.safeRead(path.join(defaultsDir, "state.yaml"));
  if (stateSrc) {
    stateSrc.last_updated = new Date().toISOString();
    stateSrc.next_action = "/elicit or /research";
    yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), stateSrc);
  }

  // Empty decisions index
  yamlIO.safeWrite(path.join(pipelineDir, "decisions", "index.yaml"), {
    schema_version: 1,
    decisions: [],
  });

  return { ok: true };
}

/**
 * Recursively copy a directory.
 */
function _copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      _copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove all contents of a directory (but keep the directory itself).
 */
function _removeDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

module.exports = { generateSummaryReport, archivePipeline, resetPipeline };
