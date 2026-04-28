"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const dispatch = require("../../../lib/dispatch");
const paths = require("../../../lib/paths");
const deterministicGate = require("../../../lib/deterministic-gate");

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

  // Check YAML frontmatter for depends_on (--- fenced)
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
    // Blockquote-style: > **depends_on:** task-a
    if (deps.length === 0) {
      const bqMatch = frontmatter.match(/\*\*depends_on:\*\*\s*(.+)/i);
      if (bqMatch) {
        const val = bqMatch[1].trim();
        if (val.toLowerCase() !== "none") {
          // May be comma-separated
          deps.push(...val.split(",").map((s) => s.trim()).filter(Boolean));
        }
      }
    }
  }

  // Also check blockquote-style anywhere in doc (outside frontmatter)
  if (deps.length === 0) {
    const bqAny = spec.match(/>\s*\*\*depends_on:\*\*\s*(.+)/i);
    if (bqAny) {
      const val = bqAny[1].trim();
      if (val.toLowerCase() !== "none") {
        deps.push(...val.split(",").map((s) => s.trim()).filter(Boolean));
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

// ============================================================
// Constants
// ============================================================

const COMPLETION_STATUS = {
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  DEFERRED: "DEFERRED",
};

const NO_DEVIATIONS = "none";

const VERIFIER_DECISION = {
  PASS_CLEAN: "PASS_CLEAN",
  PASS_WITH_WARNINGS: "PASS_WITH_WARNINGS",
  FAIL_BLOCKING: "FAIL_BLOCKING",
};

// Default overflow backstop (lines) — used when config.overflow absent
const DEFAULT_OVERFLOW_BACKSTOP = 300;

// ============================================================
// New API — planExecution, assembleWaveBriefs, executeWave, etc.
// ============================================================

/**
 * Plan sprint execution: scan tasks directory, build waves, load briefs.
 * Expects agent .md files alongside task specs (task-id.agent.md or task-id.md).
 *
 * @param {string} pipelineDir — directory containing tasks/ (or the dir with tasks/)
 * @param {Object} config
 * @returns {{ ok: boolean, waves: string[][], briefs: Object<string, string>, error?: string }}
 */
function planExecution(pipelineDir, config) {
  // Try tasks/ as direct subdir of pipelineDir
  let tasksDir = path.join(pipelineDir, "tasks");
  if (!fs.existsSync(tasksDir)) {
    // Fall back to pipelineDir itself containing .md files
    tasksDir = pipelineDir;
  }

  if (!fs.existsSync(tasksDir)) {
    return { ok: false, error: `Tasks directory not found: ${tasksDir}` };
  }

  const files = fs.readdirSync(tasksDir);
  const specFiles = files.filter((f) => f.endsWith(".md") && !f.endsWith(".agent.md"));

  if (specFiles.length === 0) {
    return { ok: false, error: `No task specs found in ${tasksDir}` };
  }

  // Build task map: id -> { dependsOn, agentMd }
  const taskMap = {};
  const briefs = {};

  for (const file of specFiles) {
    const id = file.replace(/\.md$/, "");
    const specPath = path.join(tasksDir, file);
    const spec = fs.readFileSync(specPath, "utf8");
    const deps = extractDependencies(spec);
    // Filter out "None" / empty
    const validDeps = deps.filter((d) => d && d.toLowerCase() !== "none");
    taskMap[id] = { dependsOn: validDeps };

    // Load agent.md brief if it exists
    const agentMdPath = path.join(tasksDir, `${id}.agent.md`);
    if (fs.existsSync(agentMdPath)) {
      briefs[id] = fs.readFileSync(agentMdPath, "utf8");
    } else {
      briefs[id] = spec;
    }
  }

  // Build graph — only with known IDs (remove deps referencing unknown tasks)
  for (const id of Object.keys(taskMap)) {
    taskMap[id].dependsOn = taskMap[id].dependsOn.filter((d) => taskMap[d] !== undefined);
  }

  const { buildDependencyGraph, validateDAG, constructWaves } = require("../../../lib/dispatch");

  let graph;
  try {
    graph = buildDependencyGraph(taskMap);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const dagResult = validateDAG(graph);
  if (!dagResult.valid) {
    return { ok: false, error: `Dependency cycle: ${dagResult.cycle.join(" → ")}`, cycle: dagResult.cycle };
  }

  const waves = constructWaves(graph, dagResult.order);
  return { ok: true, waves, briefs };
}

/**
 * Assemble briefs for all tasks in a wave, optionally injecting architecture context.
 *
 * @param {string[]} wave — task IDs in the wave
 * @param {Object<string, string>} briefs — map of task ID to brief content
 * @param {string|null} archContext — architecture context to inject
 * @param {Object} config
 * @returns {{ ok: boolean, assembled: Array<{ taskId: string, brief: string }>, error?: string }}
 */
function assembleWaveBriefs(wave, briefs, archContext, config) {
  const assembled = [];
  const transform = require("../../../lib/transform");
  const ba = require("../../../lib/brief-assembly");

  for (const taskId of wave) {
    const specContent = briefs[taskId];
    if (!specContent) {
      return { ok: false, error: `No brief found for task ${taskId}` };
    }

    // Transform spec to agent.md format
    const transformed = transform.transformToAgentMd(specContent, archContext, config);
    if (!transformed.ok) {
      // Fall back to raw brief content if transform fails
      let brief = specContent;
      if (archContext) {
        brief = ba.wrapDataBlock(archContext, "architecture-context") + "\n\n" + brief;
      }
      assembled.push({ taskId, brief });
    } else {
      assembled.push({ taskId, brief: transformed.agentMd });
    }
  }

  return { ok: true, assembled };
}

/**
 * Mark all tasks in a wave as RUNNING and persist state.
 *
 * @param {Object} state — dispatch state
 * @param {number} waveIndex
 * @param {string[][]} waves
 * @param {string} stateDir — directory for dispatch state persistence
 * @param {Object} _config — unused, reserved
 * @returns {{ ok: boolean, tasks?: string[], error?: string }}
 */
function executeWave(state, waveIndex, waves, stateDir, _config) {
  if (waveIndex < 0 || waveIndex >= waves.length) {
    return { ok: false, error: `Wave index ${waveIndex} out of bounds (0..${waves.length - 1})` };
  }

  const dispatchLib = require("../../../lib/dispatch");
  const waveTasks = waves[waveIndex];

  for (const taskId of waveTasks) {
    dispatchLib.updateAgentState(state, taskId, { status: dispatchLib.AGENT_STATUS.RUNNING });
  }

  dispatchLib.persistDispatchState(state, stateDir);

  return { ok: true, tasks: waveTasks };
}

/**
 * Check for file overflow in agent completion record.
 * Reads files_written from record and checks line counts against backstop.
 *
 * @param {{ files_written: string }} record — agent completion record
 * @param {Object} config
 * @returns {{ overflows: Array<{ file: string, lines: number, backstop: number }> }}
 */
function checkOverflow(record, config) {
  const backstop = (config && config.overflow && config.overflow.file_lines_backstop) || DEFAULT_OVERFLOW_BACKSTOP;
  const overflows = [];

  const filesWritten = (record && record.files_written) || "";
  if (!filesWritten.trim()) return { overflows };

  // Support newline-separated and comma-separated file lists
  const files = filesWritten
    .split(/[\n,]+/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lineCount = content.split("\n").length;
      if (lineCount > backstop) {
        overflows.push({ file: filePath, lines: lineCount, backstop });
      }
    } catch (_e) {
      // Skip unreadable files
    }
  }

  return { overflows };
}

/**
 * Assess wave failure state and decide if we can advance or must stop.
 *
 * @param {Object} state — dispatch state
 * @param {number} waveIndex
 * @param {string[][]} waves
 * @returns {{ terminal: boolean, canAdvance: boolean, completed: number, failed: number, running: number, pending: number }}
 */
function handleWaveFailure(state, waveIndex, waves) {
  const dispatchLib = require("../../../lib/dispatch");

  if (waveIndex < 0 || waveIndex >= (waves || []).length) {
    return { terminal: true, canAdvance: false, completed: 0, failed: 0, running: 0, pending: 0 };
  }

  const status = dispatchLib.getWaveStatus(state, waveIndex, waves);
  const { complete, completed, failed, running, pending } = status;

  if (running > 0 || pending > 0) {
    return { terminal: false, canAdvance: false, completed, failed, running, pending };
  }

  // All settled (no pending/running)
  if (failed > 0) {
    return { terminal: true, canAdvance: false, completed, failed, running: 0, pending: 0 };
  }

  return { terminal: false, canAdvance: complete, completed, failed, running: 0, pending: 0 };
}

/**
 * Record task completion. Accepts two calling conventions:
 *
 * 1. Old evidence-object API (used by orchestrator tasks):
 *    recordCompletion(pipelineDir, sprintNumber, taskId, { status, files_created, ... })
 *    Returns: { ok: true, path: string } or { ok: false, error: string }
 *
 * 2. New raw-output API (used by build integration):
 *    recordCompletion(pipelineDir, sprintNumber, taskId, rawOutputString)
 *    Returns: the completion record object (with .status, .task_id, etc.)
 *
 * @param {string} pipelineDir
 * @param {number} sprintNumber
 * @param {string} taskId
 * @param {string|Object} rawOutputOrEvidence
 * @returns {Object}
 */
function recordCompletion(pipelineDir, sprintNumber, taskId, rawOutputOrEvidence) {
  const yamlIO = require("../../../lib/yaml-io");
  const completionDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "completion");
  fs.mkdirSync(completionDir, { recursive: true });

  // Old API: evidence object
  if (rawOutputOrEvidence && typeof rawOutputOrEvidence === "object") {
    const evidence = rawOutputOrEvidence;
    const validStatuses = ["complete", "blocked", "failed", "deferred", "COMPLETE", "FAILED", "BLOCKED", "DEFERRED"];
    if (!validStatuses.includes(evidence.status)) {
      return { ok: false, error: `Invalid status "${evidence.status}" — must be one of: ${["complete","blocked","failed","deferred"].join(", ")}` };
    }

    const record = {
      task_id: taskId,
      status: evidence.status,
      files_created: evidence.files_created || [],
      files_modified: evidence.files_modified || [],
      acceptance_criteria_met: evidence.acceptance_criteria_met || [],
      timestamp: evidence.timestamp || new Date().toISOString(),
    };
    if (evidence.reason) record.reason = evidence.reason;

    const recordPath = path.join(completionDir, `${taskId}.yaml`);
    yamlIO.safeWrite(recordPath, record);
    return { ok: true, path: recordPath };
  }

  // New API: raw agent output string
  const rawOutput = rawOutputOrEvidence;
  const ao = require("../../../lib/agent-output");

  let status = COMPLETION_STATUS.FAILED;
  let filesWritten = "";
  let deviations = NO_DEVIATIONS;
  let verification = "";
  let criteriaMet = [];

  const parsed = ao.parseOutput(rawOutput);
  if (parsed.ok) {
    const payload = parsed.payload || {};
    status = COMPLETION_STATUS.COMPLETE;
    filesWritten = payload["files-written"] || payload.files_written || "";
    deviations = (payload.deviations || NO_DEVIATIONS).trim();
    verification = payload.verification || "";
    criteriaMet = (parsed.selfAssessment && parsed.selfAssessment.criteria_met) || [];
  }

  const record = {
    task_id: taskId,
    sprint: sprintNumber,
    status,
    files_written: filesWritten,
    deviations,
    verification,
    criteria_met: criteriaMet,
    completed_at: new Date().toISOString(),
  };

  const recordPath = path.join(completionDir, `${taskId}.completion.yaml`);
  yamlIO.safeWrite(recordPath, record);

  return record;
}

/**
 * Generate a sprint completion report from completion records.
 *
 * @param {string} pipelineDir
 * @param {number} sprintNumber
 * @param {Array<Object>} completions
 * @returns {{ completed: number, failed: number, deviations: number, reportPath: string }}
 */
function generateCompletionReport(pipelineDir, sprintNumber, completions) {
  let completed = 0;
  let failed = 0;
  let deviationsCount = 0;

  for (const c of completions) {
    if (c.status === COMPLETION_STATUS.COMPLETE) completed++;
    else failed++;
    if (c.deviations && c.deviations !== NO_DEVIATIONS && c.deviations !== "none") {
      deviationsCount++;
    }
  }

  const total = completions.length;
  const lines = [
    `# Sprint ${sprintNumber} Completion Report`,
    "",
    `**Tasks completed:** ${completed} / ${total}`,
    `**Tasks failed:** ${failed}`,
    `**Tasks with deviations:** ${deviationsCount}`,
    "",
    "## Task Summary",
    "",
  ];

  for (const c of completions) {
    lines.push(`### ${c.task_id}`);
    lines.push(`- Status: ${c.status}`);
    if (c.files_written) lines.push(`- Files written: ${c.files_written}`);
    if (c.deviations && c.deviations !== NO_DEVIATIONS) lines.push(`- Deviations: ${c.deviations}`);
    if (c.verification) lines.push(`- Verification: ${c.verification}`);
    lines.push("");
  }

  const sprintDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`);
  fs.mkdirSync(sprintDir, { recursive: true });
  const reportPath = path.join(sprintDir, "completion-report.md");
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  return { completed, failed, deviations: deviationsCount, reportPath };
}

/**
 * Complete sprint execution: write report and transition pipeline state.
 *
 * @param {string} pipelineDir
 * @param {number} sprintNumber
 * @param {Array<Object>} completions
 * @param {Object} config
 * @param {string} projectRoot — root dir containing pipeline state
 * @returns {{ ok: boolean, nextAction?: string, reason?: string }}
 */
// Valid post-sprint transitions per references/transitions.yaml.
// `sprint-complete` is the only canonical exit from sprinting.
const VALID_BUILD_ROUTES = ["sprint-complete"];

function completeSprintExecution(pipelineDir, sprintNumber, completions, _config, _projectRoot) {
  const stateMachine = require("../../../lib/state-machine");

  // I-10 producer-side gate. Refuse to transition `sprinting → sprint-complete`
  // when no per-task completion records exist on disk. Reproducible across
  // 2 projects (sprint-3.4, sprint-4): orchestrator improvised
  // SPRINT-REPORT.md + raw writeState call, skipping recordCompletion per
  // task. Result: phase=sprint-complete with empty completion/ dir →
  // /review's assembleReviewBriefs aborts → autopilot loops. Closing this
  // gate at the canonical producer means the bug shape is impossible to
  // reach via completeSprintExecution; a parallel direct writeState bypass
  // is addressed by commands/build.md MANDATORY language (I-10b).
  //
  // Two checks: (1) caller passed non-empty completions array (guards the
  // "called with []" mistake), (2) at least one completion record file
  // exists on disk (guards the "wrote completions array but recordCompletion
  // never landed" mistake — defense in depth).
  if (!Array.isArray(completions) || completions.length === 0) {
    return {
      ok: false,
      status: "missing-completion-records",
      reason:
        `completeSprintExecution requires a non-empty completions[] argument ` +
        `(got ${Array.isArray(completions) ? "empty array" : typeof completions}). ` +
        `Call recordCompletion(pipelineDir, sprintNumber, taskId, evidence) per task before finalizing.`,
    };
  }
  if (sprintNumber != null) {
    const completionDir = path.join(
      pipelineDir,
      "sprints",
      sprintDirName(sprintNumber),
      "completion"
    );
    let recordCount = 0;
    try {
      if (fs.existsSync(completionDir) && fs.statSync(completionDir).isDirectory()) {
        recordCount = fs
          .readdirSync(completionDir)
          .filter((f) => f.endsWith(".yaml") || f.endsWith(".md"))
          .length;
      }
    } catch (_e) {
      // fall through to recordCount=0 — refuse below
    }
    if (recordCount === 0) {
      return {
        ok: false,
        status: "missing-completion-records",
        reason:
          `completeSprintExecution refuses to transition: no per-task ` +
          `completion records on disk at ${completionDir}. ` +
          `recordCompletion must run for every task before completeSprintExecution. ` +
          `If the build wrote SPRINT-REPORT.md or similar without per-task records, ` +
          `that is a bypass — refuse here so /review does not break downstream.`,
      };
    }
  }

  // Reject if any tasks failed
  const failures = completions.filter((c) => c.status === "FAILED" || c.status === COMPLETION_STATUS.FAILED);
  if (failures.length > 0) {
    return {
      ok: false,
      reason: `${failures.length} task(s) failed: ${failures.map((f) => f.task_id).join(", ")}`,
    };
  }

  // Generate completion report — written before the transition. If the
  // transition fails the report is preserved (work isn't lost) but the
  // phase stays at `sprinting`, mirroring the finalize* pattern.
  // Wrapped so disk failure during the writeFileSync inside
  // generateCompletionReport surfaces as {ok:false} instead of escaping
  // as a raw exception (matches finalizeReview/Research/Triage/Verify
  // contract).
  let report;
  try {
    report = generateCompletionReport(pipelineDir, sprintNumber, completions);
  } catch (err) {
    return { ok: false, reason: `generateCompletionReport failed: ${err.message}` };
  }

  // Atomic transition via state-machine.writeState — handles validation,
  // state-history.yaml audit append, and terminal-state guard. Replaces
  // the older raw transition + safeWrite path which bypassed audit logs.
  const transitionResult = stateMachine.writeState(
    pipelineDir,
    "sprint-complete",
    {
      pipeline: {
        completion_evidence: report.reportPath,
        sprint: sprintNumber,
      },
    },
    {
      command: "/build",
      trigger: "build-skill",
      artifact: report.reportPath,
    },
  );

  if (!transitionResult.ok) {
    return { ok: false, reason: transitionResult.error, report };
  }

  return { ok: true, nextAction: "/review", report };
}

/**
 * Atomic post-build hand-off: alias for completeSprintExecution under the
 * canonical finalize* naming used by other skills (finalizeReview,
 * finalizeTriage, finalizeResearch, finalizeDecompose). Same atomic
 * write+transition behaviour: completion-report.md and state transition
 * `sprinting → sprint-complete` are produced together so phase=sprinting
 * never persists with a completion report already written.
 */
function finalizeBuild(pipelineDir, sprintNumber, completions, config, projectRoot) {
  return completeSprintExecution(pipelineDir, sprintNumber, completions, config, projectRoot);
}

/**
 * Dispatch the consistency verifier for a completed wave.
 * Reads completion records and assembles a verifier brief.
 *
 * @param {Object} state — dispatch state
 * @param {number} waveIndex
 * @param {string[][]} waves
 * @param {string} pipelineDir
 * @param {number} sprintNumber
 * @param {Object} config
 * @returns {{ ok: boolean, brief?: string, briefId?: string, error?: string }}
 */
function dispatchVerifier(state, waveIndex, waves, pipelineDir, sprintNumber, config) {
  const consistency = require("../../../lib/consistency");
  const yamlIO = require("../../../lib/yaml-io");

  if (waveIndex < 0 || waveIndex >= (waves || []).length) {
    return { ok: false, error: `Wave index ${waveIndex} out of bounds` };
  }

  const waveTasks = waves[waveIndex];
  const completionDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "completion");

  // Load completion records for this wave
  const siblings = [];
  for (const taskId of waveTasks) {
    const filePath = path.join(completionDir, `${taskId}.completion.yaml`);
    if (fs.existsSync(filePath)) {
      const record = yamlIO.safeRead(filePath);
      if (record) {
        siblings.push({
          agentId: taskId,
          payload: {
            "files-written": record.files_written || "",
            verification: record.verification || "",
          },
        });
      }
    }
  }

  if (siblings.length === 0) {
    return { ok: false, error: "No completion records found for this wave" };
  }

  const result = consistency.assembleVerifierBrief(siblings, config);
  if (!result.ok) return result;

  // Mark verifier as PENDING in state
  state.verifier = { status: "PENDING", briefId: result.briefId };

  return result;
}

/**
 * Handle the verifier agent's output.
 * Parses the XML result, decides PASS_CLEAN / PASS_WITH_WARNINGS / FAIL_BLOCKING.
 *
 * @param {Object} state — dispatch state (mutated)
 * @param {string} rawOutput — verifier agent output
 * @param {string} _stateDir — directory for state persistence (reserved)
 * @returns {{ decision: string, issues?: Array, warnings?: Array }}
 */
function handleVerifierResult(state, rawOutput, _stateDir) {
  const consistency = require("../../../lib/consistency");

  const parsed = consistency.parseVerifierOutput(rawOutput);

  // Mark verifier complete regardless of parse success
  if (state.verifier) state.verifier.status = "COMPLETE";

  if (!parsed.ok) {
    // Treat unparseable output as pass-with-warnings (defensive)
    return { decision: VERIFIER_DECISION.PASS_WITH_WARNINGS, warnings: [{ description: parsed.error || "Unparseable verifier output" }] };
  }

  const blockingIssues = parsed.issues.filter((i) => i.severity === "blocking");
  const warningIssues = parsed.issues.filter((i) => i.severity !== "blocking");

  if (blockingIssues.length > 0) {
    return { decision: VERIFIER_DECISION.FAIL_BLOCKING, issues: blockingIssues, warnings: warningIssues };
  }

  if (warningIssues.length > 0) {
    return { decision: VERIFIER_DECISION.PASS_WITH_WARNINGS, warnings: warningIssues };
  }

  return { decision: VERIFIER_DECISION.PASS_CLEAN };
}

/**
 * Inject verifier warnings into assembled briefs.
 *
 * @param {Array<{ taskId: string, brief: string }>} assembled
 * @param {Array<Object>|null} warnings
 * @returns {Array<{ taskId: string, brief: string }>}
 */
function injectWarningsIntoBriefs(assembled, warnings) {
  if (!warnings || warnings.length === 0) return assembled;

  const warningBlock = [
    "",
    "<!-- VERIFIER WARNINGS",
    ...warnings.map((w) => `  - ${w.description || JSON.stringify(w)}`),
    "-->",
    "",
  ].join("\n");

  return assembled.map((entry) => ({
    ...entry,
    brief: entry.brief + warningBlock,
  }));
}

/**
 * Run deterministic gate before dispatching builder agents.
 * If gate fails, the sprint must NOT proceed: surfaces the failure as a blocker.
 *
 * Returns:
 *   { ok: true,  gateRan: true, gateResult } — proceed with build
 *   { ok: false, gateRan: true, gateResult, reason } — halt; gate failures must be fixed first
 */
function preBuildGate(projectRoot, options = {}) {
  const gateResult = deterministicGate.runGate(projectRoot, options);
  if (gateResult.ok) {
    return { ok: true, gateRan: true, gateResult };
  }
  return {
    ok: false,
    gateRan: true,
    gateResult,
    reason: "deterministic gate failed before build — fix tests/lint before sprinting",
  };
}

/**
 * Wave-boundary test gate. Called between waves so a regression introduced
 * by wave N is caught before wave N+1 starts. Wraps the same deterministic
 * gate (`npm test` + `npm run lint`) used by preBuildGate, but tagged with
 * wave context so the failure record can be persisted into the wave's
 * completion evidence.
 *
 * Returns:
 *   { ok: true,  gateRan: true,  waveIndex, skipped: false } — proceed to next wave
 *   { ok: true,  gateRan: false, waveIndex, skipped: true  } — no test/lint script configured
 *   { ok: false, gateRan: true,  waveIndex, failures, blockedOn } — halt build
 *
 * The orchestrator (build workflow step 5b) must:
 *   - on ok:true → continue to next wave immediately, no pause
 *   - on ok:false → set state.blocked_on = blockedOn, leave phase as 'sprinting',
 *     skip remaining waves, jump to step 9 (Report)
 *
 * @param {string} projectRoot — absolute path to the project (parent of .pipeline/)
 * @param {number} waveIndex — 0-based index of the wave that just completed
 * @param {object} [options] — passed through to deterministicGate.runGate
 * @returns {{ ok: boolean, gateRan: boolean, waveIndex: number, skipped?: boolean, failures?: object, blockedOn?: string }}
 */
function runWaveGate(projectRoot, waveIndex, options = {}) {
  const gateResult = deterministicGate.runGate(projectRoot, options);

  // deterministicGate.runGate returns { ok, failures, skipped }, where
  // `skipped` is an array of reasons explaining which gate steps did not
  // run (e.g., no test script in package.json). A "fully skipped" gate
  // — both test and lint absent — passes ok:true with two skip reasons
  // and zero failures. Surface that explicitly so the workflow can tell
  // "gate passed" from "no gate configured".
  const skippedReasons = Array.isArray(gateResult.skipped) ? gateResult.skipped : [];
  const fullySkipped = gateResult.ok && (gateResult.failures || []).length === 0 && skippedReasons.length >= 2;

  if (gateResult.ok) {
    return {
      ok: true,
      gateRan: !fullySkipped,
      waveIndex,
      skipped: fullySkipped,
      skipReasons: skippedReasons,
      gateResult,
    };
  }

  // Compose a one-line blocker summary from the first failure for state.blocked_on.
  const first = (gateResult.failures || [])[0] || {};
  const firstSummary =
    first.type
      ? `${first.type} step failed (exit ${first.exitCode})`
      : "wave gate failed";

  return {
    ok: false,
    gateRan: true,
    waveIndex,
    skipped: false,
    skipReasons: skippedReasons,
    failures: gateResult.failures || [],
    gateResult,
    blockedOn: `wave-${waveIndex} test gate failed: ${firstSummary}`,
  };
}

module.exports = {
  // Constants
  AMBIGUITY_PATTERNS,
  COMPLETION_STATUS,
  NO_DEVIATIONS,
  VERIFIER_DECISION,
  // Legacy / existing
  sprintDirName,
  loadSprintTasks,
  verifyLeaf,
  buildWaves,
  extractDependencies,
  extractOrchestratorTaskFlag,
  getSprintSummary,
  // New API
  planExecution,
  assembleWaveBriefs,
  executeWave,
  checkOverflow,
  handleWaveFailure,
  recordCompletion,
  generateCompletionReport,
  completeSprintExecution,
  finalizeBuild,
  VALID_BUILD_ROUTES,
  dispatchVerifier,
  handleVerifierResult,
  injectWarningsIntoBriefs,
  // Deterministic gate — call BEFORE dispatching builder agents.
  // preBuildGate is the SKILL.md entry point: when ok:false, do NOT dispatch agents
  // and halt the sprint with the gate failure as the blocker.
  // Rationale: building on top of failing tests/lint compounds the problem.
  preBuildGate,
  runWaveGate,
  runDeterministicGate: (projectRoot, options) => deterministicGate.runGate(projectRoot, options),
};
