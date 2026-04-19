"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const dispatch = require("../../../lib/dispatch");
const paths = require("../../../lib/paths");

// Patterns that indicate unresolved design choices in a task spec
const AMBIGUITY_PATTERNS = [
  /\bTBD\b/,
  /\bTODO:\s*decide\b/i,
  /\bTODO:\s*choose\b/i,
  /\bTODO:\s*determine\b/i,
  /\balternative(?:s)?:\s*\n/i,
  /\boption\s+[AB12]:/i,
  /\bopen\s+question/i,
  /\bneeds?\s+decision/i,
  /\bundecided\b/i,
  /\?\s*$/m, // Lines ending with a question mark (potential open questions)
];

// Sections where trailing question marks are expected and should not trigger ambiguity
const SAFE_QUESTION_SECTIONS = [
  "acceptance criteria",
  "verification",
  "testing",
];

/**
 * Format a sprint number as a zero-padded directory name.
 *
 * @param {number} sprintNumber
 * @returns {string} e.g. "sprint-1" or "sprint-01"
 */
function sprintDirName(sprintNumber) {
  return `sprint-${sprintNumber}`;
}

/**
 * Read all task spec .md files from a sprint's tasks directory.
 * Skips .agent.md files (those are derived transforms, not source specs).
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number
 * @returns {{ ok: boolean, tasks?: Array<{ id: string, spec: string, agentMdPath: string }>, error?: string }}
 */
function loadSprintTasks(pipelineDir, sprintNumber) {
  const tasksDir = path.join(pipelineDir, "sprints", sprintDirName(sprintNumber), "tasks");

  if (!fs.existsSync(tasksDir)) {
    return { ok: false, error: `Sprint tasks directory not found: ${tasksDir}` };
  }

  const files = fs.readdirSync(tasksDir);
  const taskFiles = files.filter(
    (f) => f.endsWith(".md") && !f.endsWith(".agent.md")
  );

  if (taskFiles.length === 0) {
    return { ok: false, error: `No task specs found in ${tasksDir}` };
  }

  const tasks = [];

  for (const file of taskFiles) {
    const filePath = path.join(tasksDir, file);
    const spec = fs.readFileSync(filePath, "utf8");
    const id = file.replace(/\.md$/, "");
    const agentMdPath = path.join(tasksDir, `${id}.agent.md`);

    tasks.push({ id, spec, agentMdPath });
  }

  return { ok: true, tasks };
}

/**
 * Check if a task spec is decision-free (ready for mechanical execution).
 * Scans for unresolved design choices, open questions, TBD markers,
 * and alternatives that haven't been resolved.
 *
 * @param {string} taskSpec — raw task spec content
 * @returns {{ ok: boolean, reason?: string }}
 */
function verifyLeaf(taskSpec) {
  if (!taskSpec || typeof taskSpec !== "string" || !taskSpec.trim()) {
    return { ok: false, reason: "Task spec is empty or invalid" };
  }

  // Check each ambiguity pattern against the spec content
  for (const pattern of AMBIGUITY_PATTERNS) {
    const match = taskSpec.match(pattern);
    if (match) {
      // For question-mark patterns, check if the line is inside a safe section
      if (pattern.source.includes("\\?")) {
        const matchIndex = taskSpec.indexOf(match[0]);
        const preceding = taskSpec.slice(0, matchIndex).toLowerCase();
        const inSafeSection = SAFE_QUESTION_SECTIONS.some(
          (section) => preceding.lastIndexOf(section) > preceding.lastIndexOf("## ")
        );
        if (inSafeSection) continue;
      }

      return {
        ok: false,
        reason: `Unresolved design choice detected: "${match[0].trim()}" — task needs architect resolution`,
      };
    }
  }

  return { ok: true };
}

/**
 * Extract dependency information from task specs and build execution waves.
 * Wraps lib/dispatch to construct a dependency graph and produce
 * parallelizable wave batches.
 *
 * @param {Array<{ id: string, spec: string }>} tasks — non-blocked tasks with specs
 * @returns {{ ok: boolean, waves?: string[][], order?: string[], error?: string, cycle?: string[] }}
 */
function buildWaves(tasks) {
  if (!tasks || tasks.length === 0) {
    return { ok: true, waves: [], order: [] };
  }

  // Parse dependency declarations from task specs
  // Task specs use YAML frontmatter or a "depends_on:" line in the body
  const taskMap = {};

  for (const task of tasks) {
    const deps = extractDependencies(task.spec);
    taskMap[task.id] = { dependsOn: deps };
  }

  const graph = dispatch.buildDependencyGraph(taskMap);
  const dagResult = dispatch.validateDAG(graph);

  if (!dagResult.valid) {
    return { ok: false, error: "Dependency cycle detected in sprint tasks", cycle: dagResult.cycle };
  }

  const waves = dispatch.constructWaves(graph, dagResult.order);
  return { ok: true, waves, order: dagResult.order };
}

/**
 * Extract the `orchestrator_task` boolean flag from a task spec's YAML
 * frontmatter. Tasks with `orchestrator_task: true` must be run by the
 * orchestrator (they invoke `/essense-flow:*` commands which a sub-agent
 * cannot reach). The build runner records these as `deferred` and skips
 * dispatch so they are surfaced for manual orchestrator invocation.
 *
 * @param {string} spec — task spec content
 * @returns {boolean} true iff frontmatter contains `orchestrator_task: true`
 */
function extractOrchestratorTaskFlag(spec) {
  if (!spec || typeof spec !== "string") return false;

  const frontmatterMatch = spec.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return false;

  const frontmatter = frontmatterMatch[1];
  // Accept `true` and `True` (YAML 1.1 style) but not quoted strings,
  // which would be an explicit opt-out of the boolean.
  const flagMatch = frontmatter.match(/^\s*orchestrator_task\s*:\s*(true|True|TRUE)\s*$/m);
  return Boolean(flagMatch);
}

/**
 * Extract dependency task IDs from a task spec.
 * Looks for YAML frontmatter `depends_on:` or inline `Dependencies:` section.
 *
 * @param {string} spec — task spec content
 * @returns {string[]} array of dependency task IDs
 */
function extractDependencies(spec) {
  const deps = [];

  // Check YAML frontmatter for depends_on
  const frontmatterMatch = spec.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    // Single-line: depends_on: [TASK-001, TASK-002]
    const inlineMatch = frontmatter.match(/depends_on:\s*\[([^\]]*)\]/);
    if (inlineMatch) {
      const items = inlineMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      deps.push(...items);
    }
    // Multi-line YAML list
    const listMatch = frontmatter.match(/depends_on:\s*\n((?:\s+-\s+\S+\n?)*)/);
    if (listMatch && deps.length === 0) {
      const items = listMatch[1].match(/-\s+(\S+)/g);
      if (items) {
        deps.push(...items.map((item) => item.replace(/^-\s+/, "").trim()));
      }
    }
  }

  // Check body for a Dependencies section
  const bodyMatch = spec.match(/##\s*Dependencies\s*\n((?:\s*-\s+\S+\n?)*)/i);
  if (bodyMatch && deps.length === 0) {
    const items = bodyMatch[1].match(/-\s+(\S+)/g);
    if (items) {
      deps.push(...items.map((item) => item.replace(/^-\s+/, "").trim()));
    }
  }

  return deps;
}

/**
 * Write a completion record for a task to the sprint's completion directory.
 * Uses yamlIO.safeWrite for atomic writes.
 *
 * Evidence object shape:
 *   status: "complete" | "blocked" | "failed"
 *   files_created: string[]
 *   files_modified: string[]
 *   acceptance_criteria_met: string[]
 *   reason?: string (for blocked/failed)
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number
 * @param {string} taskId — task identifier (e.g. "TASK-001")
 * @param {Object} evidence — completion evidence
 * @returns {{ ok: boolean, path?: string, error?: string }}
 */
function recordCompletion(pipelineDir, sprintNumber, taskId, evidence) {
  if (!evidence || typeof evidence !== "object") {
    return { ok: false, error: "Evidence object is required" };
  }

  const validStatuses = ["complete", "blocked", "failed", "deferred"];
  if (!validStatuses.includes(evidence.status)) {
    return { ok: false, error: `Invalid status "${evidence.status}" — must be one of: ${validStatuses.join(", ")}` };
  }

  const completionDir = path.join(
    pipelineDir,
    "sprints",
    sprintDirName(sprintNumber),
    "completion"
  );
  paths.ensureDir(completionDir);

  const record = {
    task_id: taskId,
    status: evidence.status,
    files_created: evidence.files_created || [],
    files_modified: evidence.files_modified || [],
    acceptance_criteria_met: evidence.acceptance_criteria_met || [],
    timestamp: evidence.timestamp || new Date().toISOString(),
  };

  if (evidence.reason) {
    record.reason = evidence.reason;
  }

  const recordPath = path.join(completionDir, `${taskId}.yaml`);
  yamlIO.safeWrite(recordPath, record);

  return { ok: true, path: recordPath };
}

/**
 * Read all completion records for a sprint and produce a summary.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number
 * @returns {{ ok: boolean, total: number, complete: number, blocked: number, failed: number, tasks: Array<{ id: string, status: string }>, error?: string }}
 */
function getSprintSummary(pipelineDir, sprintNumber) {
  const completionDir = path.join(
    pipelineDir,
    "sprints",
    sprintDirName(sprintNumber),
    "completion"
  );

  if (!fs.existsSync(completionDir)) {
    return {
      ok: true,
      total: 0,
      complete: 0,
      blocked: 0,
      failed: 0,
      tasks: [],
    };
  }

  const files = fs.readdirSync(completionDir).filter((f) => f.endsWith(".yaml"));
  const tasks = [];
  let complete = 0;
  let blocked = 0;
  let failed = 0;
  let deferred = 0;

  for (const file of files) {
    const filePath = path.join(completionDir, file);
    const record = yamlIO.safeReadWithFallback(filePath);

    if (!record) continue;

    const id = record.task_id || file.replace(/\.yaml$/, "");
    const status = record.status || "unknown";

    tasks.push({
      id,
      status,
      files_created: record.files_created || [],
      files_modified: record.files_modified || [],
      acceptance_criteria_met: record.acceptance_criteria_met || [],
      reason: record.reason || null,
    });

    if (status === "complete") complete++;
    else if (status === "blocked") blocked++;
    else if (status === "failed") failed++;
    else if (status === "deferred") deferred++;
  }

  // Clear progress file after sprint completes
  try {
    const progress = require("../../../lib/progress");
    const sprintDir = `sprint-${String(sprintNumber).padStart(2, "0")}`;
    progress.clearProgress(path.join(pipelineDir, "sprints", sprintDir, "progress.yaml"));
  } catch (_e) { /* progress is advisory */ }

  return {
    ok: true,
    total: tasks.length,
    complete,
    blocked,
    failed,
    deferred,
    tasks,
  };
}

module.exports = {
  AMBIGUITY_PATTERNS,
  sprintDirName,
  loadSprintTasks,
  verifyLeaf,
  buildWaves,
  extractDependencies,
  extractOrchestratorTaskFlag,
  recordCompletion,
  getSprintSummary,
};
