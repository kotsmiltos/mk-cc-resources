"use strict";

/**
 * lib/phase-inference — infer pipeline phase from on-disk artifacts.
 *
 * Foundation for /repair --apply forward-walk (Case 6) and /heal command.
 *
 * Pure read-only: reads state.yaml + scans .pipeline/ for completion
 * artifacts, returns inference result. NEVER writes state. Callers do
 * their own writes via lib/state-machine.writeState (heal-walk, repair).
 *
 * Inference rule: highest-priority phase whose artifact set is satisfied
 * on disk wins. Walk is computed via lib/transitions traversal from
 * current_phase to inferred_phase using transitions.yaml.
 *
 * Hotfix sprint convention is project-local (essense-flow itself does
 * not produce hotfix dir names). Inference treats `state.pipeline.sprint`
 * as gospel and inspects only that sprint's artifacts. Project-local
 * conventions (e.g. `sprint-3-hotfix-1`) live alongside as separate
 * sprints from the canonical `sprint-N` and don't influence inference of
 * the canonical sprint's phase.
 *
 * Public API:
 *   inferPhaseFromArtifacts(pipelineDir) → InferenceResult
 *
 * InferenceResult shape:
 *   {
 *     current_phase: string,
 *     current_sprint: number | null,
 *     inferred_phase: string,
 *     inferred_sprint: number | null,
 *     evidence: Array<{file: string, implies: string}>,
 *     walk: Array<string> | null,   // legal forward path; null if no path
 *     ambiguous: boolean,
 *     reason: string,
 *   }
 */

const fs = require("fs");
const path = require("path");
const yamlIO = require("./yaml-io");

const TRANSITIONS_YAML_REL = path.join("..", "references", "transitions.yaml");
const STATE_FILE = "state.yaml";

const KNOWN_PHASES = [
  "idle",
  "eliciting",
  "research",
  "triaging",
  "requirements-ready",
  "architecture",
  "decomposing",
  "sprinting",
  "sprint-complete",
  "reviewing",
  "verifying",
  "complete",
];

// ── Helpers ──────────────────────────────────────────────────────────────

function exists(p) {
  try { return fs.existsSync(p); } catch (_e) { return false; }
}

function isNonEmptyDir(p) {
  if (!exists(p)) return false;
  try {
    return fs.readdirSync(p).filter((f) => !f.startsWith(".")).length > 0;
  } catch (_e) { return false; }
}

/**
 * Resolve the canonical sprint dir for sprint number N.
 * Tries `sprint-N` then `sprint-0N` (zero-padded). Returns the first
 * existing path, or null if neither exists.
 */
function resolveSprintDir(pipelineDir, n) {
  if (n == null) return null;
  const candidates = [
    path.join(pipelineDir, "sprints", `sprint-${n}`),
    path.join(pipelineDir, "sprints", `sprint-${String(n).padStart(2, "0")}`),
  ];
  return candidates.find(exists) || null;
}

/**
 * Resolve the QA-REPORT.md path for sprint N. Tries un-padded then padded.
 */
function resolveQAReport(pipelineDir, n) {
  if (n == null) return null;
  const candidates = [
    path.join(pipelineDir, "reviews", `sprint-${n}`, "QA-REPORT.md"),
    path.join(pipelineDir, "reviews", `sprint-${String(n).padStart(2, "0")}`, "QA-REPORT.md"),
  ];
  return candidates.find(exists) || null;
}

/**
 * Load transitions.yaml and build adjacency map: from-phase → [to-phase].
 * Returns {} on error so callers fall back to walk: null gracefully.
 */
function loadTransitionAdjacency(pipelineDir) {
  const transitionsPath = path.resolve(pipelineDir, "..", "references", "transitions.yaml");
  const data = yamlIO.safeReadWithFallback(transitionsPath);
  if (!data || !data.transitions) return {};
  const adj = {};
  for (const t of Object.values(data.transitions)) {
    if (!t || !t.from || !t.to) continue;
    if (!adj[t.from]) adj[t.from] = [];
    adj[t.from].push(t.to);
  }
  return adj;
}

/**
 * BFS to find shortest legal walk from `from` to `to` in the adjacency map.
 * Returns array of intermediate-and-target phases in order, or null.
 *
 * Self-loops (decomposing → decomposing, eliciting → eliciting) are skipped
 * during traversal so they can't pad the walk; loops only show up if they
 * are the *target* of the search (rare).
 */
function findWalk(adj, from, to) {
  if (from === to) return [];
  const visited = new Set([from]);
  const queue = [[from, []]];
  while (queue.length > 0) {
    const [node, pathSoFar] = queue.shift();
    const next = adj[node] || [];
    for (const n of next) {
      if (n === node) continue;          // skip self-loops
      if (visited.has(n)) continue;
      const newPath = [...pathSoFar, n];
      if (n === to) return newPath;
      visited.add(n);
      queue.push([n, newPath]);
    }
  }
  return null;
}

/**
 * `from` reachable from `to` via the adjacency map (used by isForwardWalk).
 * Skips self-loops to avoid trivial yes-answers.
 */
function isReachable(adj, from, to) {
  if (from === to) return true;
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const node = queue.shift();
    const next = adj[node] || [];
    for (const n of next) {
      if (n === node) continue;
      if (visited.has(n)) continue;
      if (n === to) return true;
      visited.add(n);
      queue.push(n);
    }
  }
  return false;
}

/**
 * "Forward walk" guard for the heal/repair use case: target reachable from
 * current via transitions.yaml.
 *
 * Note: the pipeline graph is intentionally cyclic — triaging can route to
 * architecture for a re-plan, which loops back via decomposing → sprinting
 * → sprint-complete → reviewing → triaging. Any walk we propose IS forward
 * by construction (every step is a documented legal transition); we don't
 * try to enforce strict acyclicity because the graph isn't acyclic.
 *
 * The contract: returns true iff `inferred` is reachable from `current`
 * via legal transitions. False only when truly disconnected (e.g.
 * complete → eliciting requires an explicit reset path).
 */
function isForwardWalk(adj, current, inferred) {
  if (current === inferred) return false;
  return isReachable(adj, current, inferred);
}

// ── Inference rules — highest-priority phase wins ────────────────────────
//
// Each rule examines disk artifacts and returns either:
//   { matches: true, evidence: [...], inferredPhase: string }
// or { matches: false }.
//
// Rules are tried in order. First match wins. Order matters: more-advanced
// phases (closer to "complete") come first.

function ruleComplete(pipelineDir, state) {
  const verifyReport = path.join(pipelineDir, "VERIFICATION-REPORT.md");
  const phasesCompleted = state && state.phases_completed;
  const verifyDone = phasesCompleted && phasesCompleted.verify;
  if (exists(verifyReport) && verifyDone) {
    return {
      matches: true,
      inferredPhase: "complete",
      evidence: [
        { file: "VERIFICATION-REPORT.md", implies: "verify pass recorded" },
        { file: "state.yaml#phases_completed.verify", implies: "verify phase marked complete" },
      ],
    };
  }
  return { matches: false };
}

function ruleRequirementsReadyForNextSprint(pipelineDir, state) {
  // Sprint reviewed + triaged + clean (no follow-up architecture for next sprint).
  // Indicates ready-for-next-sprint planning.
  const sprintNum = state && state.pipeline && state.pipeline.sprint;
  if (sprintNum == null) return { matches: false };

  const qaPath = resolveQAReport(pipelineDir, sprintNum);
  const triageReport = path.join(pipelineDir, "triage", "TRIAGE-REPORT.md");
  if (!qaPath || !exists(triageReport)) return { matches: false };

  // Heuristic: if there is no architecture artifact NEWER than the triage
  // report, we are between sprints. ARCH.md mtime > TRIAGE-REPORT.md mtime
  // would indicate next-sprint architecture has already started.
  const archPath = path.join(pipelineDir, "architecture", "ARCH.md");
  let nextArchStarted = false;
  if (exists(archPath)) {
    try {
      const archMtime = fs.statSync(archPath).mtimeMs;
      const triageMtime = fs.statSync(triageReport).mtimeMs;
      nextArchStarted = archMtime > triageMtime;
    } catch (_e) { /* on stat failure, treat as not started */ }
  }
  if (nextArchStarted) return { matches: false };

  return {
    matches: true,
    inferredPhase: "requirements-ready",
    evidence: [
      { file: qaPath, implies: `review complete for sprint ${sprintNum}` },
      { file: triageReport, implies: "triage complete" },
      { file: "(no newer architecture/ARCH.md)", implies: "next-sprint architecture not yet started" },
    ],
  };
}

function ruleTriaging(pipelineDir, state) {
  const sprintNum = state && state.pipeline && state.pipeline.sprint;
  if (sprintNum == null) return { matches: false };

  const qaPath = resolveQAReport(pipelineDir, sprintNum);
  const triageReport = path.join(pipelineDir, "triage", "TRIAGE-REPORT.md");

  // QA-REPORT exists AND TRIAGE-REPORT does NOT — post-review, pre-triage.
  if (qaPath && !exists(triageReport)) {
    return {
      matches: true,
      inferredPhase: "triaging",
      evidence: [
        { file: qaPath, implies: `review complete for sprint ${sprintNum}, triage pending` },
      ],
    };
  }
  return { matches: false };
}

function ruleReviewing(pipelineDir, state) {
  const sprintNum = state && state.pipeline && state.pipeline.sprint;
  if (sprintNum == null) return { matches: false };

  const sprintDir = resolveSprintDir(pipelineDir, sprintNum);
  if (!sprintDir) return { matches: false };

  const completionReport = path.join(sprintDir, "completion-report.md");
  const qaPath = resolveQAReport(pipelineDir, sprintNum);

  // Completion report exists, no QA-REPORT yet → review mid-flight.
  if (exists(completionReport) && !qaPath) {
    return {
      matches: true,
      inferredPhase: "reviewing",
      evidence: [
        { file: completionReport, implies: `sprint ${sprintNum} build complete, review pending` },
      ],
    };
  }
  return { matches: false };
}

function ruleSprintComplete(pipelineDir, state) {
  // Distinguished from reviewing by: state.sprints[N].status === "complete".
  // This is the post-build-complete-pre-review state.
  const sprintNum = state && state.pipeline && state.pipeline.sprint;
  if (sprintNum == null) return { matches: false };

  const sprintDir = resolveSprintDir(pipelineDir, sprintNum);
  if (!sprintDir) return { matches: false };

  const completionReport = path.join(sprintDir, "completion-report.md");
  const qaPath = resolveQAReport(pipelineDir, sprintNum);

  if (!exists(completionReport)) return { matches: false };
  if (qaPath) return { matches: false };  // ruleReviewing handled this

  // Same on-disk state as "reviewing inferred"; only difference is
  // state.sprints[N].status. Without that, we can't disambiguate from
  // ruleReviewing — return matches:false so the higher-confidence rule wins.
  // (In practice ruleReviewing matches first.)
  return { matches: false };
}

function ruleSprinting(pipelineDir, state) {
  const sprintNum = state && state.pipeline && state.pipeline.sprint;
  if (sprintNum == null) return { matches: false };

  const sprintDir = resolveSprintDir(pipelineDir, sprintNum);
  if (!sprintDir) return { matches: false };

  const tasksDir = path.join(sprintDir, "tasks");
  const completionDir = path.join(sprintDir, "completion");
  const completionReport = path.join(sprintDir, "completion-report.md");

  // Tasks decomposed AND completion report missing AND completion dir not
  // empty (i.e. some tasks have completed records) → mid-flight build.
  if (
    isNonEmptyDir(tasksDir) &&
    !exists(completionReport) &&
    isNonEmptyDir(completionDir)
  ) {
    return {
      matches: true,
      inferredPhase: "sprinting",
      evidence: [
        { file: tasksDir, implies: "task specs decomposed" },
        { file: completionDir, implies: "build mid-flight" },
      ],
    };
  }
  return { matches: false };
}

function ruleDecomposing(pipelineDir, _state) {
  const decompState = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
  const treePath = path.join(pipelineDir, "architecture", "TREE.md");
  if (!exists(decompState)) return { matches: false };

  // If TREE.md missing, decomposition not finalized.
  if (!exists(treePath)) {
    return {
      matches: true,
      inferredPhase: "decomposing",
      evidence: [
        { file: decompState, implies: "decomposition state initialized" },
        { file: "(no TREE.md yet)", implies: "decomposition not finalized" },
      ],
    };
  }
  return { matches: false };
}

function ruleArchitecture(pipelineDir, state) {
  const archPath = path.join(pipelineDir, "architecture", "ARCH.md");
  const sprintNum = state && state.pipeline && state.pipeline.sprint;
  const sprintDir = resolveSprintDir(pipelineDir, sprintNum);
  const tasksDir = sprintDir ? path.join(sprintDir, "tasks") : null;

  if (!exists(archPath)) return { matches: false };

  // ARCH.md exists, no decomposition state, no task specs yet → still in
  // architecture (mid-flight or just finished pre-decompose decision).
  const decompState = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");
  if (!exists(decompState) && (!tasksDir || !isNonEmptyDir(tasksDir))) {
    return {
      matches: true,
      inferredPhase: "architecture",
      evidence: [
        { file: archPath, implies: "architecture document written" },
        { file: "(no DECOMPOSITION-STATE.yaml, no task specs)", implies: "not yet decomposed/sprinting" },
      ],
    };
  }
  return { matches: false };
}

function ruleRequirementsReady(pipelineDir, _state) {
  // REQ.md exists AND no architecture artifacts yet.
  const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
  const archPath = path.join(pipelineDir, "architecture", "ARCH.md");
  if (!exists(reqPath)) return { matches: false };
  if (exists(archPath)) return { matches: false };

  return {
    matches: true,
    inferredPhase: "requirements-ready",
    evidence: [
      { file: reqPath, implies: "requirements complete" },
      { file: "(no architecture/ARCH.md)", implies: "architecture not started" },
    ],
  };
}

function ruleResearch(pipelineDir, _state) {
  const reqDir = path.join(pipelineDir, "requirements");
  const reqPath = path.join(reqDir, "REQ.md");
  if (!exists(reqDir) || exists(reqPath)) return { matches: false };

  return {
    matches: true,
    inferredPhase: "research",
    evidence: [
      { file: reqDir, implies: "research workspace initialized" },
      { file: "(no REQ.md)", implies: "requirements not produced" },
    ],
  };
}

function ruleEliciting(pipelineDir, _state) {
  const elicitState = path.join(pipelineDir, "elicitation", "state.yaml");
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  if (!exists(elicitState)) return { matches: false };
  if (exists(specPath)) return { matches: false };
  return {
    matches: true,
    inferredPhase: "eliciting",
    evidence: [
      { file: elicitState, implies: "elicitation in progress" },
      { file: "(no SPEC.md)", implies: "spec not produced" },
    ],
  };
}

const RULES_IN_PRIORITY_ORDER = [
  ruleComplete,
  ruleRequirementsReadyForNextSprint,
  ruleTriaging,
  ruleReviewing,
  ruleSprintComplete,
  ruleSprinting,
  ruleDecomposing,
  ruleArchitecture,
  ruleRequirementsReady,
  ruleResearch,
  ruleEliciting,
];

// ── Public API ───────────────────────────────────────────────────────────

function inferPhaseFromArtifacts(pipelineDir) {
  const statePath = path.join(pipelineDir, STATE_FILE);
  const state = yamlIO.safeReadWithFallback(statePath, {});
  const currentPhase = (state && state.pipeline && state.pipeline.phase) || "idle";
  const currentSprint =
    (state && state.pipeline && typeof state.pipeline.sprint === "number")
      ? state.pipeline.sprint
      : null;

  // Apply rules in priority order — first match wins.
  let match = null;
  for (const rule of RULES_IN_PRIORITY_ORDER) {
    const r = rule(pipelineDir, state);
    if (r.matches) { match = r; break; }
  }

  if (!match) {
    return {
      current_phase: currentPhase,
      current_sprint: currentSprint,
      inferred_phase: "idle",
      inferred_sprint: currentSprint,
      evidence: [],
      walk: null,
      ambiguous: true,
      reason: "no inference rule matched — disk has no recognizable artifact set",
    };
  }

  const inferredPhase = match.inferredPhase;
  const evidence = match.evidence;

  // Same phase already — no walk needed.
  if (inferredPhase === currentPhase) {
    return {
      current_phase: currentPhase,
      current_sprint: currentSprint,
      inferred_phase: inferredPhase,
      inferred_sprint: currentSprint,
      evidence,
      walk: [],
      ambiguous: false,
      reason: `state.yaml phase already matches inferred phase '${inferredPhase}' — no heal needed`,
    };
  }

  // Compute walk via transitions.yaml.
  const adj = loadTransitionAdjacency(pipelineDir);
  const walk = findWalk(adj, currentPhase, inferredPhase);
  const forward = isForwardWalk(adj, currentPhase, inferredPhase);

  if (!walk) {
    return {
      current_phase: currentPhase,
      current_sprint: currentSprint,
      inferred_phase: inferredPhase,
      inferred_sprint: currentSprint,
      evidence,
      walk: null,
      ambiguous: true,
      reason: `inferred phase '${inferredPhase}' not reachable from '${currentPhase}' via transitions.yaml — manual intervention required`,
    };
  }

  if (!forward) {
    return {
      current_phase: currentPhase,
      current_sprint: currentSprint,
      inferred_phase: inferredPhase,
      inferred_sprint: currentSprint,
      evidence,
      walk,
      ambiguous: true,
      reason: `walk to '${inferredPhase}' is not strictly forward (backward path exists) — manual review needed; use /repair backward-revert cases instead`,
    };
  }

  return {
    current_phase: currentPhase,
    current_sprint: currentSprint,
    inferred_phase: inferredPhase,
    inferred_sprint: currentSprint,
    evidence,
    walk,
    ambiguous: false,
    reason: `disk artifacts indicate phase '${inferredPhase}'; walk forward via ${walk.length} transition(s)`,
  };
}

module.exports = {
  inferPhaseFromArtifacts,
  // Internal — exported for tests.
  KNOWN_PHASES,
  loadTransitionAdjacency,
  findWalk,
  isForwardWalk,
  resolveSprintDir,
  resolveQAReport,
};
