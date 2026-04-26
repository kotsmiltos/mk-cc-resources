"use strict";
const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");
const { PIPELINE_DIR_NAME, SPEC_PATH, REQ_PATH, ARCH_PATH } = require("../../../lib/constants");

// Full pipeline-relative paths used by prereq listings below.
const PIPELINE_REQ = `${PIPELINE_DIR_NAME}/${REQ_PATH}`;
const PIPELINE_ARCH = `${PIPELINE_DIR_NAME}/${ARCH_PATH}`;

// Per-phase rationale strings — paired with the canonical phase→command map
// loaded from references/phase-command-map.yaml at module init.
const PHASE_WHY = {
  idle:                 "Pipeline initialized — elicitation captures requirements before any other phase.",
  eliciting:            "Elicitation in progress — complete the elicitation session.",
  research:             "Research complete — triage routes findings before architecture.",
  triaging:             "Triage in progress — complete triage session.",
  "requirements-ready": "Requirements finalized — architect translates them into a build plan.",
  architecture:         "Architecture phase active — re-invoke /architect to resume decomposition. Phase advances to sprinting once task specs are written.",
  decomposing:          "Decomposition in progress — continue /architect.",
  sprinting:            "Sprint in progress — continue building.",
  "sprint-complete":    "Sprint done — review gates quality before marking complete.",
  reviewing:            "Review in progress — complete the review session.",
  verifying:            "Verification in progress.",
  complete:             "Pipeline complete — use /status to inspect final state.",
};

// Hardcoded fallback if references/phase-command-map.yaml is missing.
// Keep in sync with that YAML — the cross-check test enforces parity.
const PHASE_NEXT_FALLBACK = {
  idle:                 { cmd: "/elicit",    why: PHASE_WHY.idle },
  eliciting:            { cmd: "/elicit",    why: PHASE_WHY.eliciting },
  research:             { cmd: "/triage",    why: PHASE_WHY.research },
  triaging:             { cmd: "/triage",    why: PHASE_WHY.triaging },
  "requirements-ready": { cmd: "/architect", why: PHASE_WHY["requirements-ready"] },
  architecture:         { cmd: "/architect", why: PHASE_WHY.architecture },
  decomposing:          { cmd: "/architect", why: PHASE_WHY.decomposing },
  sprinting:            { cmd: "/build",     why: PHASE_WHY.sprinting },
  "sprint-complete":    { cmd: "/review",    why: PHASE_WHY["sprint-complete"] },
  reviewing:            { cmd: "/review",    why: PHASE_WHY.reviewing },
  verifying:            { cmd: "/verify",    why: PHASE_WHY.verifying },
  complete:             { cmd: "/status",    why: PHASE_WHY.complete },
};

/**
 * Load PHASE_NEXT from references/phase-command-map.yaml (canonical source).
 * Falls back to PHASE_NEXT_FALLBACK if the YAML is missing or malformed —
 * this keeps next-runner functional in environments where references/ is
 * not present alongside the plugin lib.
 *
 * @returns {Object<string, {cmd: string, why: string}>}
 */
function loadPhaseNext() {
  const pluginRoot = path.resolve(__dirname, "..", "..", "..");
  const yamlPath = path.join(pluginRoot, "references", "phase-command-map.yaml");
  const data = yamlIO.safeRead(yamlPath);
  if (!data || !data.phase_command || typeof data.phase_command !== "object") {
    return PHASE_NEXT_FALLBACK;
  }
  const out = {};
  for (const [phase, cmd] of Object.entries(data.phase_command)) {
    if (typeof cmd !== "string") continue;
    out[phase] = { cmd, why: PHASE_WHY[phase] || `Phase '${phase}'.` };
  }
  return Object.keys(out).length > 0 ? out : PHASE_NEXT_FALLBACK;
}

const PHASE_NEXT = loadPhaseNext();

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
