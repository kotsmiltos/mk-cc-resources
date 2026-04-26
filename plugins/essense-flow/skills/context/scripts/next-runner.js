"use strict";
const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");
const { PIPELINE_DIR_NAME, SPEC_PATH, REQ_PATH, ARCH_PATH } = require("../../../lib/constants");

// Full pipeline-relative paths used by prereq listings below.
const PIPELINE_REQ = `${PIPELINE_DIR_NAME}/${REQ_PATH}`;
const PIPELINE_ARCH = `${PIPELINE_DIR_NAME}/${ARCH_PATH}`;

const PHASE_NEXT = {
  idle:                 { cmd: "/elicit",    why: "Pipeline initialized — elicitation captures requirements before any other phase." },
  eliciting:            { cmd: "/elicit",    why: "Elicitation in progress — complete the elicitation session." },
  research:             { cmd: "/triage",    why: "Research complete — triage routes findings before architecture." },
  triaging:             { cmd: "/triage",    why: "Triage in progress — complete triage session." },
  "requirements-ready": { cmd: "/architect", why: "Requirements finalized — architect translates them into a build plan." },
  architecture:         { cmd: "/build",     why: "Architecture ready — build executes the sprint plan." },
  sprinting:            { cmd: "/build",     why: "Sprint in progress — continue building." },
  "sprint-complete":    { cmd: "/review",    why: "Sprint done — review gates quality before marking complete." },
  reviewing:            { cmd: "/review",    why: "Review in progress — complete the review session." },
  verifying:            { cmd: "/verify",    why: "Verification in progress." },
  complete:             { cmd: "/status",    why: "Pipeline complete — use /status to inspect final state." },
};

const PHASE_PREREQS = {
  "requirements-ready": [PIPELINE_REQ],
  architecture:         [PIPELINE_REQ, PIPELINE_ARCH],
  sprinting:            [PIPELINE_ARCH],
  "sprint-complete":    [PIPELINE_ARCH],
  reviewing:            [PIPELINE_ARCH],
};

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");

const pipelineDir = paths.findPipelineDir(process.cwd());
if (!pipelineDir) {
  process.stderr.write("Pipeline not initialized. Run /init first.\n");
  process.exit(1);
}

const state = yamlIO.safeReadWithFallback(path.join(pipelineDir, "state.yaml"));
if (!state) {
  process.stderr.write("state.yaml unreadable.\n");
  process.exit(1);
}

const phase = (state.pipeline && state.pipeline.phase) || "idle";
const sprint = state.pipeline && state.pipeline.sprint;
const sprintKey = sprint ? `sprint-${sprint}` : null;
const sprintData = sprintKey && state.sprints ? state.sprints[sprintKey] : null;
const pending = sprintData ? ((sprintData.tasks_total || 0) - (sprintData.tasks_complete || 0)) : 0;

const mapping = PHASE_NEXT[phase] || { cmd: state.next_action || "/status", why: "Check current state." };
const projectRoot = path.dirname(pipelineDir);
const prereqPaths = PHASE_PREREQS[phase] || [];
const prerequisites = prereqPaths.map((p) => ({
  path: p,
  exists: fs.existsSync(path.join(projectRoot, p)),
}));

const scope = sprint
  ? `sprint ${sprint}, ${pending} tasks pending`
  : `pipeline phase: ${phase}`;

const output = {
  next_command: mapping.cmd,
  why: mapping.why,
  prerequisites,
  scope,
};

if (jsonMode) {
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
} else {
  process.stdout.write(`Next:  ${output.next_command}\n`);
  process.stdout.write(`Why:   ${output.why}\n`);
  process.stdout.write(`Scope: ${output.scope}\n`);
  if (prerequisites.length > 0) {
    process.stdout.write("Prerequisites:\n");
    for (const p of prerequisites) {
      process.stdout.write(`  ${p.exists ? "✓" : "✗"} ${p.path}\n`);
    }
  }
}
process.exit(0);
