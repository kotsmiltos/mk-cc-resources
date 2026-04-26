"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");

function createTmpPipeline(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essense-flow-test-"));
  const pipelineDir = path.join(dir, ".pipeline");
  fs.mkdirSync(pipelineDir);

  const state = {
    schema_version: 1,
    pipeline: { phase: overrides.phase || "sprinting", sprint: overrides.sprint || 1, wave: null, task_in_progress: null },
    phases_completed: {},
    sprints: {},
    blocked_on: null,
    next_action: overrides.next_action || null,
    decisions_count: 0,
    last_decision_id: null,
    grounded_required: false,
    session: { last_verified: null, continue_from: null },
    ...(overrides.state || {})
  };

  const yaml = require("js-yaml");
  fs.writeFileSync(path.join(pipelineDir, "state.yaml"), yaml.dump(state), "utf8");

  const config = {
    schema_version: 1,
    pipeline: { name: "test" },
    token_budgets: { brief_ceiling: 12000 },
    timeouts: { hook_ms: 5000 },
    overflow: { file_lines_backstop: 300 },
    validation: { yaml_validate_paths: [".pipeline/", "context/"] },
    ...(overrides.config || {})
  };
  fs.writeFileSync(path.join(pipelineDir, "config.yaml"), yaml.dump(config), "utf8");

  function cleanup() {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return { dir, pipelineDir, cleanup };
}

module.exports = { createTmpPipeline };
