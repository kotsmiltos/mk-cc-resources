"use strict";

const path = require("path");
const fs = require("fs");
const yamlIO = require("../../../lib/yaml-io");

const PIPELINE_DIR_NAME = ".pipeline";

const PIPELINE_SUBDIRS = [
  "sprints",
  "elicitation",
  "requirements",
  "architecture",
  "reviews",
  "triage",
  "repair",
  "verify",
];

const REQUIRED_HOOK_EVENTS = ["PreToolUse", "PostToolUse", "UserPromptSubmit", "SessionStart"];

const SETTINGS_RELATIVE_PATH = path.join(".claude", "settings.json");

/**
 * Walk up from startDir until a directory containing `.claude/` or `package.json` is found.
 * Falls back to startDir if neither is found before filesystem root.
 *
 * @param {string} startDir
 * @returns {string} resolved project root
 */
function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (
      fs.existsSync(path.join(current, ".claude")) ||
      fs.existsSync(path.join(current, "package.json"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(startDir);
    current = parent;
  }
}

/**
 * Parse .claude/settings.json and return the set of registered hook event names.
 * Tolerates missing file, parse errors, and any unexpected shape.
 *
 * @param {string} projectRoot
 * @returns {Set<string>}
 */
function registeredHookEvents(projectRoot) {
  const settingsPath = path.join(projectRoot, SETTINGS_RELATIVE_PATH);
  if (!fs.existsSync(settingsPath)) return new Set();
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch (_e) {
    return new Set();
  }
  const hooks = settings.hooks;
  if (!Array.isArray(hooks)) return new Set();
  const found = new Set();
  for (const entry of hooks) {
    if (entry && typeof entry.event === "string") {
      found.add(entry.event);
    }
  }
  return found;
}

/**
 * Initialize the pipeline in projectRoot.
 * Returns a result object describing what was done.
 *
 * @param {string} projectRoot
 * @returns {{ alreadyInitialized: boolean, phase?: string, missingHookEvents?: string[] }}
 */
function initPipeline(projectRoot) {
  const pipelineDir = path.join(projectRoot, PIPELINE_DIR_NAME);
  const statePath = path.join(pipelineDir, "state.yaml");

  if (fs.existsSync(statePath)) {
    const state = yamlIO.safeReadWithFallback(statePath);
    const phase = (state && state.pipeline && state.pipeline.phase) || "unknown";
    return { alreadyInitialized: true, phase };
  }

  fs.mkdirSync(pipelineDir, { recursive: true });
  for (const sub of PIPELINE_SUBDIRS) {
    fs.mkdirSync(path.join(pipelineDir, sub), { recursive: true });
  }

  const initialState = {
    schema_version: 1,
    last_updated: new Date().toISOString(),
    pipeline: { phase: "idle", sprint: null, wave: null, task_in_progress: null },
    phases_completed: {},
    sprints: {},
    blocked_on: null,
    next_action: "/elicit",
    decisions_count: 0,
    last_decision_id: null,
    grounded_required: false,
    session: { last_verified: null, continue_from: null },
  };
  yamlIO.safeWrite(statePath, initialState);

  const registeredEvents = registeredHookEvents(projectRoot);
  const missingHookEvents = REQUIRED_HOOK_EVENTS.filter((e) => !registeredEvents.has(e));

  return { alreadyInitialized: false, missingHookEvents };
}

if (require.main === module) {
  const projectRoot = findProjectRoot(process.cwd());
  const result = initPipeline(projectRoot);

  if (result.alreadyInitialized) {
    process.stdout.write(
      `Pipeline already initialized (phase: ${result.phase}). Run /status to see current state.\n`
    );
    process.exit(0);
  }

  if (result.missingHookEvents && result.missingHookEvents.length > 0) {
    process.stdout.write(
      `Hooks missing from .claude/settings.json: ${result.missingHookEvents.join(", ")}. Add entries for hooks/scripts/*.js.\n`
    );
  }

  process.stdout.write("Pipeline initialized. Run /elicit to begin.\n");
  process.exit(0);
}

module.exports = { initPipeline, findProjectRoot, PIPELINE_DIR_NAME, PIPELINE_SUBDIRS };
