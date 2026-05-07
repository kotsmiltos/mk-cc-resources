#!/usr/bin/env node
// essense-flow-tools — narrow CLI surface for state mutations + path lookups.
//
// S7 spike scope (2026-05-06): implements `init context` and `step-advance`
// (context skill, all 3 modes — init/status/next; only status mode exercised
// by the spike).
//
// S8 extension (2026-05-06): adds the architect surface — `init architect`,
// `state-set-phase`, the setter family (`state-set-sprint`,
// `state-set-architecture-completed`, `state-set-decomposition-round`,
// plus the other setters needed by future S9.x are stubbed inactive),
// and `task-spec-write`. `record-task-completion` is build's territory
// (S9.1) — not implemented here.
//
// S9.1 extension (2026-05-07): adds the build surface — `init build`,
// `record-task-completion` (dual-record shape per cli-spec §5 2026-05-07
// Addendum). essense-flow-task-agent registered.
//
// S9.2 extension (2026-05-07): adds the review surface — `init review`,
// extends `evaluatePredicate` for `confirmed_unacknowledged_criticals` content-
// property predicate (reading QA-REPORT.md frontmatter) to enforce the
// reviewing→verifying / reviewing→triaging deterministic gate. essense-flow-
// adversarial-lens + essense-flow-validator registered. `evaluatePredicate`
// fallback fix: `<n>` substitution falls back to `current.sprint` when the
// transition target phase doesn't accept `--sprint` (per S9.2 closed decision).
//
// S9.3 extension (2026-05-07): adds the verify surface — `init verify`,
// extends `evaluatePredicate` for the `confirmed_gaps == 0` content-property
// predicate (reading VERIFICATION-REPORT.md frontmatter) to enforce the
// verifying→complete deterministic gate. The transitions.yaml predicate
// phrase "with no confirmed gaps" maps to `confirmed_gaps == 0`.
// essense-flow-extractor + essense-flow-item-verifier registered.
//
// S9.4 extension (2026-05-08): adds the research surface — `init research`.
// Research is sprint-spanning (sprint_number: null). Predicate is path-only
// existence (`.pipeline/requirements/REQ.md exists`) — no evaluatePredicate
// extension needed (existing path-exists branch suffices). Both `case 'init':`
// public switch + step-advance internal init dispatcher gain a `research`
// branch in the SAME edit per S9.3 O-4 cross-impl-site preflight rule (closes
// recurrence-pattern row 10 at preflight rather than at smoke).
// essense-flow-perspective-agent registered.
//
// Spec sources (read-only — do not paraphrase or invent fields):
//   redesign/cli-spec.md §1.1 (state-set-* family preamble + per-field blocks),
//                       §1.2 (state-set-phase), §1.4 (step-advance + §5 D-3
//                       Addendum 2026-05-05 mode arg), §1.5 (task-spec-write +
//                       §5 2026-05-06 Addendum required-key list sync),
//                       §1.3 (record-task-completion + §5 2026-05-07 Addendum
//                       dual-record shape), §3.4 (predicate evaluator).
//   redesign/init-spec.md §1.2 (init research), §1.4 (init architect),
//                         §1.5 (init build), §1.6 (init review),
//                         §1.7 (init verify), §1.9 (init context),
//                         §7 Addendum 2026-05-06 (item-verifier brief_template
//                         = null; extracted-item IS the brief input).
//   redesign/agent-spec.md §1.1 (essense-flow-sub-architect — task spec shape),
//                          §1.4 (validator), §1.5 (adversarial-lens),
//                          §1.6 (extractor — verify Job 1),
//                          §1.7 (perspective-agent — research per-lens),
//                          §1.8 (task-agent — dual-record shape),
//                          §1.9 (item-verifier — verify Job 2),
//                          §3.1 (perspective-brief — outside brief pattern),
//                          §3.3 (item-verifier — no dedicated template).
//   redesign/06-decisions.md 2026-05-05 D-3, 2026-05-06 S6.5, 2026-05-06 S7,
//                            2026-05-06 S8 (cli-spec §1.5 amend +
//                            drift-5 amend), 2026-05-07 S9.1 (cli-spec §1.3
//                            amend), 2026-05-07 S9.2 (impl-vs-spec gap),
//                            2026-05-07 S9.3 (verify wire),
//                            2026-05-08 S9.4 (research wire).
//
// Conventions:
//   - All ops emit JSON to stdout on success and exit 0.
//   - Errors emit one-line message to stderr with exact wording from cli-spec.md
//     and exit with the cli-spec-named code.
//   - The .cjs container loads ESM `js-yaml` via dynamic import (Node 18+).
//   - Cursor file lives at `<project-root>/.pipeline/cursor.yaml` (S7-locked
//     default per 2026-05-06 closed decision; future better-location amend
//     surfaces as SURPRISES.md per cli-spec §1.4 Note).
//   - State writes go through lib/state.js's writeState (which already
//     re-validates phase legality + atomicity guarantees) via dynamic ESM
//     import, mirroring the js-yaml interop pattern.

const path = require('node:path');
const fs = require('node:fs');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

// ---- Exit codes (per cli-spec.md §1.1 shared rejection table + per-op tables) ----
const EXIT_OK = 0;
const EXIT_DEGRADED = 2;
const EXIT_TYPE_MISMATCH = 3;
const EXIT_ARG_MISSING_OR_BAD = 4;
const EXIT_PROJECT_ROOT_BAD = 5;
const EXIT_ILLEGAL_TRANSITION = 6;
const EXIT_PREREQ_MISSING = 7;
const EXIT_GATE_FAILED = 8;
const EXIT_VALIDATION_FAIL = 9;
const EXIT_IDEMPOTENCY = 10;
const EXIT_WRONG_PHASE = 11;
const EXIT_INIT_LOOKUP_FAIL = 12;
const EXIT_OUT_OF_ORDER = 13;
const EXIT_SKILL_OR_MODE_MISMATCH = 14;
const EXIT_FORBIDDEN_MARKER = 15;
const EXIT_YAML_PARSE = 16;
const EXIT_REQUIRED_KEY = 17;
const EXIT_TASK_ID_MISMATCH = 18;
const EXIT_UNKNOWN_OP = 4;
const EXIT_GENERIC = 1;

// ---- Closed-list constants (per cli-spec.md §3.1, §3.2; init-spec.md §1.4 / §1.9) ----
const SKILLS = [
  'elicit', 'research', 'architect', 'build', 'review',
  'verify', 'triage', 'heal', 'context',
];
const CONTEXT_MODES = ['init', 'status', 'next'];

// Canonical phase list — sourced fresh from references/transitions.yaml on
// every invocation (cache invalidates on file mtime change per cli-spec §3.1).
// Bootstrap fallback only used if transitions.yaml unreadable mid-op.
const CANONICAL_PHASES_FALLBACK = [
  'idle', 'eliciting', 'research', 'triaging', 'requirements-ready',
  'architecture', 'decomposing', 'sprinting', 'sprint-complete',
  'reviewing', 'verifying', 'complete',
];

// Top-level state-schema field allowlist (per cli-spec.md §3.2 + audit-checks.yaml
// drift-1.allowed_keys, both sourced from defaults/state.yaml). Ops that read
// state never reject a key, but the setter family rejects unknown FIELD names
// structurally because no setter op exists for them.
const STATE_TOP_LEVEL_KEYS = [
  'schema_version', 'phase', 'sprint', 'wave',
  'elicitation', 'research', 'triage', 'architecture',
  'decomposition', 'verify', 'last_updated',
];

// Forbidden-marker list per cli-spec.md §3.3 (case-insensitive substring match).
// "Final marker list locks at S6"; agent-spec.md §1.1 sub-architect constraints
// confirmed `TBD` + "agent decides X" verbatim. The remainder are common
// programming-culture leftover-markers; including them costs nothing and closes
// near-miss variants. Keep ordering by category for grep-readability.
const FORBIDDEN_MARKERS = [
  // drift symptom #10 verbatim
  'TBD',
  '[TBD]',
  '<TBD>',
  'agent decides',
  '<agent decides>',
  '[agent decides]',
  'agent-decides',
  // general programming culture
  'TODO',
  '[TODO]',
  'XXX',
  'FIXME',
  '???',
  // template-leftover
  '<choose>',
  '<fill in>',
  '<placeholder>',
];

// Task-id pattern per cli-spec.md §3.5
const TASK_ID_PATTERN = /^T-\d{3,}$/;

// Required-key list for parsed task-spec content per cli-spec.md §5
// 2026-05-06 Addendum (supersedes §1.5 step 6 placeholder).
// 10 keys; `module` accepted-but-not-required.
const TASK_SPEC_REQUIRED_KEYS = [
  'schema_version',
  'task_id',
  'goal',
  'requirements_traced',
  'file_write_contract',
  'behavioral_pseudocode',
  'test_completion_contract',
  'dependencies',
  'agency_level',
  'agency_rationale',
];
const TASK_SPEC_AGENCY_LEVELS = ['prescribed', 'guided', 'open'];

// Required-key list for parsed completion-record content per cli-spec.md §5
// 2026-05-07 Addendum (supersedes §1.3 prior wording — thin-gate 5-key shape →
// dual-record from build.md substance + agent-spec §1.8). 8 top-level keys
// required; `drift, synthetic, recorded_at` accepted-but-not-required
// (`recorded_at` server-stamped; `synthetic` defaults false; `drift` defaults
// to empty).
const COMPLETION_RECORD_REQUIRED_KEYS = [
  'schema_version',
  'task_id',
  'sprint',
  'agent_claim',
  'runner_verification',
  'verified',
  'task_started_at',
  'task_completed_at',
];
const COMPLETION_RECORD_AGENT_STATUS_VALUES = [
  'complete',
  'blocked',
  'partial-with-surfaced-concern',
  'crashed', // for synthetic records per build.md "Auto-synthesis safety net"
];

// Sentinel passed as --next-step to finalize a skill run (deletes cursor file).
const SKILL_COMPLETE_SENTINEL = 'skill-complete';

const CURSOR_REL = '.pipeline/cursor.yaml';
const STATE_REL = '.pipeline/state.yaml';
const TRANSITIONS_REL = 'references/transitions.yaml';

// ---- Async YAML helpers (dynamic ESM import for js-yaml) ----
let _yamlMod = null;
async function yaml() {
  if (_yamlMod) return _yamlMod;
  _yamlMod = (await import('js-yaml')).default;
  return _yamlMod;
}
async function loadYaml(p) {
  const y = await yaml();
  return y.load(fs.readFileSync(p, 'utf8'));
}
async function loadYamlString(s) {
  const y = await yaml();
  return y.load(s);
}
async function dumpYaml(obj) {
  const y = await yaml();
  return y.dump(obj, { lineWidth: 100, noRefs: true });
}

// ---- lib/state.js helpers (dynamic ESM import; writeState owns atomicity +
//      transition legality; this CJS shell delegates rather than re-implementing).
let _stateMod = null;
async function stateLib() {
  if (_stateMod) return _stateMod;
  // Resolve as file:// URL for cross-platform import (Windows path-as-URL fix).
  const url = require('node:url').pathToFileURL(path.join(PLUGIN_ROOT, 'lib', 'state.js')).href;
  _stateMod = await import(url);
  return _stateMod;
}

// ---- transitions.yaml loader (fresh-on-every-invoke per cli-spec §3.1) ----
async function loadTransitions() {
  const p = path.join(PLUGIN_ROOT, TRANSITIONS_REL);
  return await loadYaml(p);
}
async function canonicalPhases() {
  try {
    const t = await loadTransitions();
    if (Array.isArray(t.phases) && t.phases.length > 0) return t.phases;
  } catch (_e) {
    // fallthrough to bootstrap fallback
  }
  return CANONICAL_PHASES_FALLBACK;
}

// ---- Output helpers ----
function emitSuccess(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  process.exit(EXIT_OK);
}
function emitFailure(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

// ---- Project-root sanity ----
function validateProjectRoot(projectRoot, opName) {
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    return emitFailure(
      EXIT_PROJECT_ROOT_BAD,
      `essense-flow-tools ${opName}: --project-root ${projectRoot} is not a directory`,
    );
  }
}

// ============================================================================
// Op: init context (S7)
// ----------------------------------------------------------------------------
// Returns the multi-mode JSON shape per `redesign/init-spec.md` §1.9.
// Pure (no writes). Reads `.pipeline/state.yaml` only for the `sprint_number`
// field; degraded read → null per init-spec §3.7.
// ============================================================================
async function initContext(projectRoot) {
  let sprint_number = null;
  const statePath = path.join(projectRoot, STATE_REL);
  if (fs.existsSync(statePath)) {
    try {
      const s = await loadYaml(statePath);
      sprint_number = s && typeof s === 'object' && 'sprint' in s ? s.sprint : null;
    } catch (_e) {
      sprint_number = null;
    }
  }

  return {
    skill: 'context',
    modes: ['init', 'status', 'next'],
    phase_from: '<mode-specific; see modes block below>',
    phase_to: '<mode-specific; see modes block below>',
    transitions: [
      {
        name: 'no-state-to-idle',
        from: '(no-state)',
        to: 'idle',
        auto_advance: false,
        requires: null,
        scope:
          'context.init mode only — writes initial state.yaml from defaults/state.yaml',
      },
    ],
    canonical_paths: {
      state_yaml: STATE_REL,
    },
    ordered_steps_by_mode: {
      init: [
        'check-no-state-exists',
        'init-state-from-defaults',
        'surface-recommended-next',
      ],
      status: ['read-state', 'render-status-block', 'delegate-to-next'],
      next: ['read-state', 'lookup-next-command', 'emit-cue-no-auto-execute'],
    },
    sprint_number,
    required_inputs: [],
    principles_cited: [
      'Graceful-Degradation',
      'Fail-Soft',
      'Diligent-Conduct',
      'Front-Loaded-Design',
      'INST-13',
    ],
    sub_agents: [],
    per_phase_artifact_map: {
      idle: [],
      eliciting: ['.pipeline/elicitation/SPEC.md'],
      research: ['.pipeline/elicitation/SPEC.md', '.pipeline/requirements/REQ.md'],
      triaging: [
        '.pipeline/elicitation/SPEC.md',
        '.pipeline/requirements/REQ.md',
        '.pipeline/triage/TRIAGE-REPORT.md',
      ],
      'requirements-ready': ['.pipeline/requirements/REQ.md'],
      architecture: [
        '.pipeline/architecture/ARCH.md',
        '.pipeline/architecture/sprints/<n>/manifest.yaml',
      ],
      decomposing: ['.pipeline/architecture/ARCH.md'],
      sprinting: [
        '.pipeline/architecture/sprints/<n>/manifest.yaml',
        '<per-task specs>',
      ],
      'sprint-complete': [
        '.pipeline/build/sprints/<n>/SPRINT-REPORT.md',
        '<completion records>',
      ],
      reviewing: ['.pipeline/review/sprints/<n>/QA-REPORT.md'],
      verifying: [
        '.pipeline/verify/VERIFICATION-REPORT.md',
        '.pipeline/verify/extracted-items.yaml',
      ],
      complete: ['.pipeline/state.yaml'],
    },
  };
}

// ============================================================================
// Op: init architect (S8 — per init-spec.md §1.4)
// ----------------------------------------------------------------------------
// Returns canonical paths + ordered_steps + sub_agents for the architect skill.
// Pure (no writes). `sprint_number` from state.yaml when present.
// ============================================================================
async function initArchitect(projectRoot) {
  let sprint_number = null;
  const statePath = path.join(projectRoot, STATE_REL);
  if (fs.existsSync(statePath)) {
    try {
      const s = await loadYaml(statePath);
      sprint_number = s && typeof s === 'object' && 'sprint' in s ? s.sprint : null;
    } catch (_e) {
      sprint_number = null;
    }
  }

  return {
    skill: 'architect',
    phase_from: ['requirements-ready', 'architecture', 'decomposing'],
    phase_to: ['architecture', 'decomposing', 'sprinting'],
    transitions: [
      { name: 'requirements-ready-to-architecture', from: 'requirements-ready', to: 'architecture',
        auto_advance: false, requires: '.pipeline/requirements/REQ.md exists' },
      { name: 'architecture-to-decomposing', from: 'architecture', to: 'decomposing',
        auto_advance: false, requires: null },
      { name: 'decomposing-to-decomposing', from: 'decomposing', to: 'decomposing',
        auto_advance: false, requires: null },
      { name: 'decomposing-to-architecture', from: 'decomposing', to: 'architecture',
        auto_advance: false, requires: 'open design decision surfaced during decomposition' },
      { name: 'architecture-to-sprinting', from: 'architecture', to: 'sprinting',
        auto_advance: true, requires: '.pipeline/architecture/sprints/<n>/manifest.yaml exists with all task specs closed' },
      { name: 'decomposing-to-sprinting', from: 'decomposing', to: 'sprinting',
        auto_advance: true, requires: '.pipeline/architecture/sprints/<n>/manifest.yaml exists with all task specs closed' },
    ],
    canonical_paths: {
      arch_md: '.pipeline/architecture/ARCH.md',
      decisions_yaml: '.pipeline/architecture/decisions.yaml',
      sprint_manifest_template: '.pipeline/architecture/sprints/<n>/manifest.yaml',
      task_spec_template: '.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml',
    },
    ordered_steps: [
      'decide',
      'delegate',
      'synthesize',
      'pack',
      'finalize',
    ],
    sprint_number,
    required_inputs: [
      '.pipeline/elicitation/SPEC.md',
      '.pipeline/requirements/REQ.md',
    ],
    principles_cited: [
      'Front-Loaded-Design',
      'Fail-Soft',
      'Diligent-Conduct',
      'Graceful-Degradation',
      'INST-13',
    ],
    sub_agents: [
      {
        name: 'essense-flow-sub-architect',
        cardinality: 'per-module parallel (one per module identified in `decide` step)',
        brief_template: 'skills/architect/templates/sub-architect-brief.md',
        required: true,
        quorum: 'all-required',
      },
    ],
  };
}

// ============================================================================
// Op: init build (S9.1 — per init-spec.md §1.5)
// ----------------------------------------------------------------------------
// Returns canonical paths + ordered_steps + sub_agents for the build skill.
// Pure (no writes). `sprint_number` from state.yaml when present.
// Path source per cli-spec.md §5 D-1 Addendum (2026-05-05): completion-record
// path is the S1-canonical nested-tasks shape, NOT §1.3 prior `task-records/`.
// Shape source per cli-spec.md §5 2026-05-07 Addendum: dual-record (not 5-key
// thin gate).
// ============================================================================
async function initBuild(projectRoot) {
  let sprint_number = null;
  const statePath = path.join(projectRoot, STATE_REL);
  if (fs.existsSync(statePath)) {
    try {
      const s = await loadYaml(statePath);
      sprint_number = s && typeof s === 'object' && 'sprint' in s ? s.sprint : null;
    } catch (_e) {
      sprint_number = null;
    }
  }

  return {
    skill: 'build',
    phase_from: ['sprinting'],
    phase_to: ['sprinting', 'sprint-complete'],
    transitions: [
      { name: 'sprinting-to-sprinting', from: 'sprinting', to: 'sprinting',
        auto_advance: false, requires: null },
      { name: 'sprinting-to-sprint-complete', from: 'sprinting', to: 'sprint-complete',
        auto_advance: true,
        requires: '.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists with all tasks resolved' },
    ],
    canonical_paths: {
      sprint_report_md: '.pipeline/build/sprints/<n>/SPRINT-REPORT.md',
      completion_record_template: '.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml',
      task_spec_template: '.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml',
      sprint_manifest_template: '.pipeline/architecture/sprints/<n>/manifest.yaml',
    },
    ordered_steps: [
      'read-manifest',
      'build-wave-order',
      'per-wave-dispatch',
      'per-task-return-and-verify',
      'out-of-contract-write-check',
      'drift-pause-or-continue',
      'assemble-sprint-report',
      'finalize',
    ],
    sprint_number,
    required_inputs: [
      '.pipeline/architecture/sprints/<n>/manifest.yaml',
      '.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml (one per task in manifest)',
    ],
    principles_cited: [
      'INST-13',
      'Front-Loaded-Design',
      'Diligent-Conduct',
      'Fail-Soft',
      'Graceful-Degradation',
    ],
    sub_agents: [
      {
        name: 'essense-flow-task-agent',
        cardinality: 'per-task parallel within wave (no concurrency cap per INST-13)',
        // Per S6.5 Path A resolution + agent-spec.md §3.2: no dedicated brief
        // template — task spec yaml from architect IS the brief input.
        brief_template: null,
        required: true,
        quorum: 'all-required (with synthetic record on crash)',
      },
    ],
  };
}

// ============================================================================
// Op: init review (S9.2 — per init-spec.md §1.6)
// ----------------------------------------------------------------------------
// Returns canonical paths + ordered_steps + sub_agents for the review skill.
// Pure (no writes). `sprint_number` from state.yaml when present.
// Source: redesign/init-spec.md §1.6 and redesign/skill-substance/review.md
// "Outputs" + "Ordered steps" + "Sub-agent dispatches".
// ============================================================================
async function initReview(projectRoot) {
  let sprint_number = null;
  const statePath = path.join(projectRoot, STATE_REL);
  if (fs.existsSync(statePath)) {
    try {
      const s = await loadYaml(statePath);
      sprint_number = s && typeof s === 'object' && 'sprint' in s ? s.sprint : null;
    } catch (_e) {
      sprint_number = null;
    }
  }

  return {
    skill: 'review',
    phase_from: ['sprint-complete', 'reviewing'],
    phase_to: ['reviewing', 'triaging', 'verifying'],
    transitions: [
      { name: 'sprint-complete-to-reviewing', from: 'sprint-complete', to: 'reviewing',
        auto_advance: true,
        requires: '.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists' },
      { name: 'reviewing-to-triaging', from: 'reviewing', to: 'triaging',
        auto_advance: true,
        requires: '.pipeline/review/sprints/<n>/QA-REPORT.md exists with confirmed_unacknowledged_criticals > 0' },
      { name: 'reviewing-to-verifying', from: 'reviewing', to: 'verifying',
        auto_advance: false,
        requires: '.pipeline/review/sprints/<n>/QA-REPORT.md exists with confirmed_unacknowledged_criticals == 0' },
    ],
    canonical_paths: {
      qa_report_md: '.pipeline/review/sprints/<n>/QA-REPORT.md',
      spec_compliance_yaml: '.pipeline/review/sprints/<n>/spec-compliance.yaml',
      false_positive_ledger_yaml: '.pipeline/review/false-positive-ledger.yaml',
      acknowledged_ledger_yaml: '.pipeline/review/acknowledged-ledger.yaml',
    },
    ordered_steps: [
      'read-inputs-and-ledgers',
      'extract-spec-claims',
      'audit-adversarial-lenses',
      'validate-findings-against-disk',
      'compute-deterministic-gate',
      'finalize',
    ],
    sprint_number,
    required_inputs: [
      '.pipeline/elicitation/SPEC.md',
      '.pipeline/architecture/ARCH.md',
      '.pipeline/architecture/decisions.yaml',
      '.pipeline/architecture/sprints/<n>/manifest.yaml',
      '.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml (one per task)',
      '.pipeline/build/sprints/<n>/SPRINT-REPORT.md',
      '.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml (one per task)',
    ],
    principles_cited: [
      'Diligent-Conduct',
      'Fail-Soft',
      'Front-Loaded-Design',
      'INST-13',
      'Graceful-Degradation',
    ],
    sub_agents: [
      {
        name: 'essense-flow-adversarial-lens',
        cardinality:
          'per-lens parallel (correctness | contract-compliance | hidden-state | failure-modes | spec-drift | functional-testing — adaptive)',
        brief_template: 'skills/review/templates/adversarial-brief.md',
        required: false,
        quorum: 'tolerant (n-1 lenses may crash; missing → synthetic risk finding)',
      },
      {
        name: 'essense-flow-validator',
        cardinality: 'per-finding (one validator per finding emitted by lens agents)',
        brief_template: 'skills/review/templates/validator-brief.md',
        required: true,
        quorum: 'all-required',
      },
    ],
  };
}

// ============================================================================
// Op: init verify (S9.3 — per init-spec.md §1.7)
// ----------------------------------------------------------------------------
// Returns canonical paths + ordered_steps + sub_agents for the verify skill.
// Pure (no writes). `sprint_number: null` — verify is whole-codebase audit,
// not sprint-scoped (per skill-substance/verify.md "Inputs": SPEC, ARCH,
// decisions plus codebase under audit; codebase root not a discrete path).
// Source: redesign/init-spec.md §1.7 + skill-substance/verify.md "Outputs"
// + "Ordered steps" + "Sub-agent dispatches".
//
// brief_template for essense-flow-item-verifier is null per init-spec.md
// §7 Addendum 2026-05-06 + agent-spec.md §3.3 (extracted-items.yaml entry
// IS the brief input; verification-report.md is the report-output shape
// master uses, not a brief read by the agent).
// ============================================================================
async function initVerify(projectRoot) {
  return {
    skill: 'verify',
    phase_from: ['verifying'],
    phase_to: ['complete', 'eliciting', 'architecture', 'triaging'],
    transitions: [
      { name: 'verifying-to-complete', from: 'verifying', to: 'complete',
        auto_advance: true,
        requires: '.pipeline/verify/VERIFICATION-REPORT.md exists with no confirmed gaps' },
      { name: 'verifying-to-eliciting', from: 'verifying', to: 'eliciting',
        auto_advance: false,
        requires: 'VERIFICATION-REPORT.md confirms spec drift requiring elicit addendum' },
      { name: 'verifying-to-architecture', from: 'verifying', to: 'architecture',
        auto_advance: false,
        requires: 'VERIFICATION-REPORT.md confirms missing implementation' },
      { name: 'verifying-to-triaging', from: 'verifying', to: 'triaging',
        auto_advance: false,
        requires: 'VERIFICATION-REPORT.md surfaces items needing categorization' },
    ],
    canonical_paths: {
      verification_report_md: '.pipeline/verify/VERIFICATION-REPORT.md',
      extracted_items_yaml: '.pipeline/verify/extracted-items.yaml',
    },
    ordered_steps: [
      'extract-spec-decisions',
      'per-item-verification-dispatch',
      'aggregate-verdicts',
      'compute-confirmed-gaps',
      'set-completion-status',
      'finalize',
    ],
    sprint_number: null,
    required_inputs: [
      '.pipeline/elicitation/SPEC.md',
      '.pipeline/architecture/ARCH.md',
      '.pipeline/architecture/decisions.yaml',
    ],
    principles_cited: [
      'Diligent-Conduct',
      'Fail-Soft',
      'Front-Loaded-Design',
      'INST-13',
      'Graceful-Degradation',
    ],
    sub_agents: [
      {
        name: 'essense-flow-extractor',
        cardinality: 'single (one extraction agent per verify run)',
        brief_template: 'skills/verify/templates/extraction-brief.md',
        required: true,
        quorum: 'all-required',
      },
      {
        name: 'essense-flow-item-verifier',
        cardinality: 'per-item parallel (one per extracted spec decision)',
        // null per init-spec §7 Addendum 2026-05-06 + agent-spec §3.3:
        // extracted-items.yaml entry IS the brief input; verification-report.md
        // is the report-output shape master uses, not a brief read by the agent.
        brief_template: null,
        required: true,
        quorum: 'all-required',
      },
    ],
  };
}

// ============================================================================
// Op: init research (S9.4 — per init-spec.md §1.2)
// ----------------------------------------------------------------------------
// Returns canonical paths + ordered_steps + sub_agents for the research skill.
// Pure (no writes). `sprint_number: null` — research is whole-project (informs
// implementation decisions across the whole codebase, not a specific sprint),
// per skill-substance/research.md "Inputs" (SPEC.md required) + init-spec
// §1.2's `sprint_number: null`. Source: redesign/init-spec.md §1.2 +
// skill-substance/research.md "Outputs" + "Ordered steps" + "Sub-agent
// dispatches".
//
// Predicate for `research → triaging` is `.pipeline/requirements/REQ.md exists`
// — path-only existence, handled by existing `evaluatePredicate` path-exists
// branch (no extension needed; contrast with S9.2 review's content-property
// `confirmed_unacknowledged_criticals == 0` and S9.3 verify's `confirmed_gaps
// == 0`, both of which required helper extensions).
// ============================================================================
async function initResearch(projectRoot) {
  return {
    skill: 'research',
    phase_from: ['research'],
    phase_to: ['research', 'triaging'],
    transitions: [
      { name: 'research-to-research', from: 'research', to: 'research',
        auto_advance: false,
        requires: null },
      { name: 'research-to-triaging', from: 'research', to: 'triaging',
        auto_advance: true,
        requires: '.pipeline/requirements/REQ.md exists' },
    ],
    canonical_paths: {
      req_md: '.pipeline/requirements/REQ.md',
    },
    ordered_steps: [
      'read-spec',
      'identify-open-questions',
      'formulate-perspective-briefs',
      'dispatch-perspective-agents',
      'synthesize-findings',
      'convert-to-acceptance-criteria',
      'reread-spec-and-req',
      'finalize',
    ],
    sprint_number: null,
    required_inputs: [
      '.pipeline/elicitation/SPEC.md',
    ],
    principles_cited: [
      'Diligent-Conduct',
      'Front-Loaded-Design',
      'Fail-Soft',
      'Graceful-Degradation',
      'INST-13',
    ],
    sub_agents: [
      {
        name: 'essense-flow-perspective-agent',
        cardinality: 'per-lens parallel (best-practices | ecosystem | examples | risks-and-costs | alternatives)',
        brief_template: 'skills/research/templates/perspective-brief.md',
        required: true,
        quorum: 'all-required',
      },
    ],
  };
}

// ============================================================================
// Op family: state-set-* (S8 — per cli-spec.md §1.1)
// ----------------------------------------------------------------------------
// Setters share a common shape. Each setter declares: field name, value parser
// (which also encodes type validation), and any field-specific rejection text.
// The op-name is hardcoded into the CLI surface — drift symptom #1 (invents
// schema fields) closes structurally.
// ============================================================================

// Shared setter runner. `parseValue` returns
//   { ok: true, value }    — typed value to write
//   { ok: false, msg }     — exit-3 type-mismatch text (no op prefix needed;
//                            shared wrapper adds it)
async function runSetter({
  opName,        // e.g. 'state-set-sprint'
  fieldPath,     // e.g. 'sprint' or ['architecture', 'completed_at']
  rawValue,      // string from --value or undefined
  parseValue,    // function (raw) → {ok, value} | {ok:false, msg}
  projectRoot,
}) {
  if (rawValue === undefined || rawValue === null) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --value is required`,
    );
  }

  const parsed = parseValue(rawValue);
  if (!parsed.ok) {
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: ${parsed.msg}`,
    );
  }

  validateProjectRoot(projectRoot, opName);

  const { readState, writeState } = await stateLib();
  const current = await readState(projectRoot);
  if (current.degraded) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools ${opName}: current state degraded (${current.degraded}); run /heal first`,
    );
  }

  // Build the next state. Strip `degraded`/`path` fields readState added.
  const { degraded, path: _statePath, ...stateCore } = current;
  const fieldKeys = Array.isArray(fieldPath) ? fieldPath : [fieldPath];
  const previous = readNested(stateCore, fieldKeys);
  const nextState = setNested(stateCore, fieldKeys, parsed.value);

  const result = await writeState(projectRoot, nextState);
  if (!result.ok) {
    return emitFailure(
      EXIT_GENERIC,
      `essense-flow-tools ${opName}: write failed (${result.reason})`,
    );
  }

  // Re-read for the freshly-stamped last_updated
  const after = await readState(projectRoot);
  return emitSuccess({
    ok: true,
    op: opName,
    field: fieldKeys.join('.'),
    previous,
    current: parsed.value,
    state_path: result.path,
    last_updated: after.last_updated || null,
  });
}

function readNested(obj, keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return null;
    cur = cur[k];
  }
  return cur === undefined ? null : cur;
}
function setNested(obj, keys, value) {
  if (keys.length === 1) return { ...obj, [keys[0]]: value };
  const [head, ...rest] = keys;
  const sub = obj[head] && typeof obj[head] === 'object' ? obj[head] : {};
  return { ...obj, [head]: setNested(sub, rest, value) };
}

// Type parsers
function parsePositiveIntOrNull(opName) {
  return (raw) => {
    const trimmed = String(raw).trim();
    if (trimmed === 'null') return { ok: true, value: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return {
        ok: false,
        msg: `--value rejected — expected positive int or 'null', got ${JSON.stringify(raw)}`,
      };
    }
    if (n < 1) {
      const suffix = opName.replace('state-set-', '');
      return {
        ok: false,
        msg: `--value rejected — expected ${suffix} >= 1, got ${n}`,
      };
    }
    return { ok: true, value: n };
  };
}
function parseNonNegInt() {
  return (raw) => {
    const trimmed = String(raw).trim();
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return {
        ok: false,
        msg: `--value rejected — expected int, got ${JSON.stringify(raw)}`,
      };
    }
    if (n < 0) {
      return {
        ok: false,
        msg: `--value rejected — expected round >= 0, got ${n}`,
      };
    }
    return { ok: true, value: n };
  };
}
function parseIso8601() {
  return (raw) => {
    const trimmed = String(raw).trim();
    if (trimmed === 'null') return { ok: true, value: null };
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      return {
        ok: false,
        msg: `--value rejected — expected ISO 8601 datetime, got ${JSON.stringify(raw)}`,
      };
    }
    // Round-trip check rejects loose forms (e.g. "2026-05-06" without time).
    if (d.toISOString() !== trimmed) {
      return {
        ok: false,
        msg: `--value rejected — expected ISO 8601 datetime, got ${JSON.stringify(raw)}`,
      };
    }
    return { ok: true, value: trimmed };
  };
}

// Concrete setter dispatchers
const SETTERS = {
  'state-set-sprint': {
    fieldPath: 'sprint',
    parseValue: parsePositiveIntOrNull('state-set-sprint'),
  },
  'state-set-wave': {
    fieldPath: 'wave',
    parseValue: parsePositiveIntOrNull('state-set-wave'),
  },
  'state-set-elicitation-round': {
    fieldPath: ['elicitation', 'round'],
    parseValue: parseNonNegInt(),
  },
  'state-set-elicitation-started': {
    fieldPath: ['elicitation', 'started_at'],
    parseValue: parseIso8601(),
  },
  'state-set-elicitation-completed': {
    fieldPath: ['elicitation', 'completed_at'],
    parseValue: parseIso8601(),
  },
  'state-set-research-round': {
    fieldPath: ['research', 'round'],
    parseValue: parseNonNegInt(),
  },
  'state-set-research-completed': {
    fieldPath: ['research', 'completed_at'],
    parseValue: parseIso8601(),
  },
  'state-set-triage-completed': {
    fieldPath: ['triage', 'completed_at'],
    parseValue: parseIso8601(),
  },
  'state-set-architecture-completed': {
    fieldPath: ['architecture', 'completed_at'],
    parseValue: parseIso8601(),
  },
  'state-set-decomposition-round': {
    fieldPath: ['decomposition', 'round'],
    parseValue: parseNonNegInt(),
  },
  'state-set-verify-completed': {
    fieldPath: ['verify', 'completed_at'],
    parseValue: parseIso8601(),
  },
};

// ============================================================================
// Op: state-set-phase (S8 — per cli-spec.md §1.2)
// ----------------------------------------------------------------------------
// Sole CLI op that mutates state.yaml's phase field. Carries:
//   1. Legality check (against transitions.yaml).
//   2. Prerequisite-artifact check (transition's `requires:` field).
//   3. Per-task-record gate for sprinting → sprint-complete.
//   4. --sprint required iff target ∈ {sprinting, sprint-complete}.
//
// Closes drift symptoms #2 (invents phase value), #5 (top-level summary
// instead of per-task records), #6 (calls writeState directly bypassing
// per-task ops). Symptoms #5/#6 close via the gate at sprinting → sprint-
// complete; record-task-completion (S9.1, build's territory) is the only
// path that increments count_recorded.
// ============================================================================
async function stateSetPhase({ rawValue, sprintArg, projectRoot }) {
  const opName = 'state-set-phase';

  if (rawValue === undefined || rawValue === null) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --value is required`,
    );
  }

  const phases = await canonicalPhases();
  if (!phases.includes(rawValue)) {
    // Per cli-spec.md §1.2 rejection table row 1: exit 3 (validation/type-mismatch
    // posture). Distinct from exit 6 (illegal transition between two legal phases).
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: --value rejected — '${rawValue}' not in canonical phases [${phases.join(', ')}]`,
    );
  }

  // --sprint required iff target ∈ {sprinting, sprint-complete}
  const sprintTargets = ['sprinting', 'sprint-complete'];
  const isSprintTarget = sprintTargets.includes(rawValue);
  if (isSprintTarget && (sprintArg === undefined || sprintArg === null)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --sprint is required when --value is in {sprinting, sprint-complete}`,
    );
  }
  if (!isSprintTarget && sprintArg !== undefined && sprintArg !== null) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --sprint not accepted for target phase ${rawValue}`,
    );
  }

  let sprintInt = null;
  if (isSprintTarget) {
    const n = Number(String(sprintArg).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return emitFailure(
        EXIT_TYPE_MISMATCH,
        `essense-flow-tools ${opName}: --sprint rejected — expected positive int, got ${JSON.stringify(sprintArg)}`,
      );
    }
    sprintInt = n;
  }

  validateProjectRoot(projectRoot, opName);

  const { readState, writeState, assertLegalTransition } = await stateLib();
  const current = await readState(projectRoot);
  if (current.degraded) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools ${opName}: current state degraded (${current.degraded}); run /heal first`,
    );
  }

  // Legality check
  const legal = await assertLegalTransition(current.phase, rawValue);
  if (!legal.ok) {
    return emitFailure(
      EXIT_ILLEGAL_TRANSITION,
      `essense-flow-tools ${opName}: no legal transition from ${current.phase} to ${rawValue}`,
    );
  }

  // Prerequisite-artifact predicate (per cli-spec §3.4)
  // Fallback: when target phase does not accept --sprint (e.g. reviewing,
  // verifying, triaging), the predicate's `<n>` placeholder still needs a
  // value; use the sprint carried in current state.yaml. This closes the
  // S9.2 gap where sprint-complete → reviewing's
  // `.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists` predicate could
  // not be evaluated against the literal sprint.
  if (legal.requires) {
    const sprintForPredicate =
      sprintInt != null ? sprintInt
      : (typeof current.sprint === 'number' ? current.sprint : null);
    const predResult = evaluatePredicate(legal.requires, projectRoot, sprintForPredicate);
    if (!predResult.ok) {
      // Differentiate path-missing (exit 7) from predicate-false (exit 7 with different msg)
      if (predResult.kind === 'path-missing') {
        return emitFailure(
          EXIT_PREREQ_MISSING,
          `essense-flow-tools ${opName}: transition ${current.phase}→${rawValue} requires ${predResult.path}; not on disk`,
        );
      }
      // predicate-false / disposition-not-met / unparseable
      return emitFailure(
        EXIT_PREREQ_MISSING,
        `essense-flow-tools ${opName}: transition ${current.phase}→${rawValue} requires '${legal.requires}'; condition not met (${predResult.observed || 'predicate evaluation failed'})`,
      );
    }
  }

  // Per-task-record gate (sprinting → sprint-complete only)
  if (current.phase === 'sprinting' && rawValue === 'sprint-complete') {
    const gate = await evalSprintCompleteGate(projectRoot, sprintInt);
    if (!gate.ok) {
      return emitFailure(
        EXIT_GATE_FAILED,
        `essense-flow-tools ${opName}: sprinting→sprint-complete requires ${gate.declared} task records under .pipeline/build/sprints/${sprintInt}/tasks/*/completion-record.yaml; found ${gate.recorded}`,
      );
    }
  }

  // Build next state — write phase + (if sprint-target) sprint atomically
  const { degraded, path: _statePath, ...stateCore } = current;
  let nextState = { ...stateCore, phase: rawValue };
  if (isSprintTarget) {
    nextState.sprint = sprintInt;
  }

  const writeResult = await writeState(projectRoot, nextState);
  if (!writeResult.ok) {
    return emitFailure(
      EXIT_GENERIC,
      `essense-flow-tools ${opName}: write failed (${writeResult.reason})`,
    );
  }

  const after = await readState(projectRoot);
  return emitSuccess({
    ok: true,
    op: 'state-set-phase',
    transition: `${current.phase}→${rawValue}`,
    transition_name: legal.transition || null,
    sprint: sprintInt,
    state_path: writeResult.path,
    last_updated: after.last_updated || null,
  });
}

// Predicate evaluator per cli-spec §3.4
//   - null → ok
//   - "<path> exists [with <prop>]" → check existence + optional content prop
//   - "<disposition prose>" → cannot evaluate at this CLI surface (defer to
//     skill-level disposition predicate engine; for S8 architect, the only
//     disposition predicate that fires is decomposing-to-architecture's
//     "open design decision surfaced during decomposition" — master signals
//     by passing through the transition explicitly. For now, accept disposition
//     predicates as unevaluated-by-CLI; the runner trusts master's call.)
function evaluatePredicate(predicate, projectRoot, sprint) {
  // Path predicate detection: contains ".pipeline/" + " exists"
  const pathRegex = /\.pipeline\/[^\s]+/g;
  const paths = predicate.match(pathRegex);
  if (paths && predicate.includes(' exists')) {
    const subbed = sprint != null ? paths[0].replace(/<n>/g, String(sprint)) : paths[0];
    const fullPath = path.join(projectRoot, subbed);
    if (!fs.existsSync(fullPath)) {
      return { ok: false, kind: 'path-missing', path: subbed };
    }
    // Content-property predicate: e.g. "exists with status: build-ready"
    // For S8 architect scope, the only path predicate exercised is
    //   .pipeline/requirements/REQ.md exists
    //   .pipeline/architecture/sprints/<n>/manifest.yaml exists with all task specs closed
    // The "with all task specs closed" property is enforced at sprint-pack
    // time (every task in manifest.tasks must have a corresponding spec file
    // under tasks/<task-id>.yaml that passed task-spec-write's marker scan).
    // Treat the property as a soft-check: if the manifest exists and tasks/
    // dir contains spec files for every entry in manifest.tasks, predicate
    // ok. Otherwise reject.
    if (predicate.includes('with all task specs closed')) {
      return evalAllTaskSpecsClosed(fullPath, path.dirname(fullPath));
    }
    // S9.2 review wire: `confirmed_unacknowledged_criticals (==|>|<|>=|<=) <int>`
    // Closes drift symptom at the reviewing→verifying / reviewing→triaging gate.
    // Without this real check, master could call `state-set-phase --value verifying`
    // when the count was non-zero — undermining the deterministic gate.
    const cucMatch = predicate.match(
      /confirmed_unacknowledged_criticals\s*(==|>=|<=|>|<)\s*(-?\d+)/,
    );
    if (cucMatch) {
      return evalCountPredicate({
        fullPath,
        key: 'confirmed_unacknowledged_criticals',
        operator: cucMatch[1],
        operand: parseInt(cucMatch[2], 10),
      });
    }
    // S9.3 verify wire: `confirmed_gaps (==|>|<|>=|<=) <int>` with explicit
    // operator+operand, OR the natural-language phrase "no confirmed gaps"
    // (from transitions.yaml verifying-to-complete predicate verbatim) which
    // maps to `confirmed_gaps == 0`. Closes drift symptom at the verifying→
    // complete gate. Without this real check, master could call
    // `state-set-phase --value complete` while gaps were non-zero —
    // undermining the deterministic gate (gaps = missing + drift).
    const cgMatch = predicate.match(
      /confirmed_gaps\s*(==|>=|<=|>|<)\s*(-?\d+)/,
    );
    if (cgMatch) {
      return evalCountPredicate({
        fullPath,
        key: 'confirmed_gaps',
        operator: cgMatch[1],
        operand: parseInt(cgMatch[2], 10),
      });
    }
    if (/with no confirmed gaps/i.test(predicate)) {
      return evalCountPredicate({
        fullPath,
        key: 'confirmed_gaps',
        operator: '==',
        operand: 0,
      });
    }
    // Other content properties (build-ready, etc.) not yet exercised — defer to
    // a later wire-up step (S9.6 elicit) per cli-spec §3.4.
    if (predicate.includes(' with ')) {
      return { ok: true, kind: 'soft-pass-not-implemented' };
    }
    return { ok: true, kind: 'path-exists' };
  }
  // Disposition predicate (no path). Accept as unevaluated-by-CLI.
  return { ok: true, kind: 'disposition-soft-pass' };
}

function evalAllTaskSpecsClosed(manifestPath, sprintDir) {
  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    // Parse using sync require; this evaluator is sync-by-shape
    const yamlSync = require('js-yaml');
    manifest = yamlSync.load(raw);
  } catch (e) {
    return { ok: false, kind: 'predicate-false', observed: `manifest unreadable (${e.message})` };
  }
  // Manifest tasks list per architect.md substance: waves[].tasks[] is task ids
  const taskIds = new Set();
  if (Array.isArray(manifest && manifest.waves)) {
    for (const w of manifest.waves) {
      if (Array.isArray(w.tasks)) for (const t of w.tasks) taskIds.add(t);
    }
  }
  if (taskIds.size === 0) {
    return { ok: false, kind: 'predicate-false', observed: 'manifest has no tasks' };
  }
  const tasksDir = path.join(sprintDir, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    return { ok: false, kind: 'predicate-false', observed: `tasks dir ${tasksDir} missing` };
  }
  const missing = [];
  for (const id of taskIds) {
    if (!fs.existsSync(path.join(tasksDir, `${id}.yaml`))) missing.push(id);
  }
  if (missing.length > 0) {
    return { ok: false, kind: 'predicate-false', observed: `missing task specs: [${missing.join(', ')}]` };
  }
  return { ok: true, kind: 'all-task-specs-closed' };
}

// Evaluate a numeric content-property predicate against a markdown file's
// YAML frontmatter (or a full YAML file). Per cli-spec §3.4 step 4-6.
// Used by reviewing-to-verifying / reviewing-to-triaging predicate (S9.2).
function evalCountPredicate({ fullPath, key, operator, operand }) {
  let parsed;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const frontmatter = extractFrontmatter(raw);
    if (frontmatter == null) {
      return {
        ok: false,
        kind: 'predicate-false',
        observed: `${path.basename(fullPath)} has no YAML frontmatter; cannot read '${key}'`,
      };
    }
    const yamlSync = require('js-yaml');
    parsed = yamlSync.load(frontmatter);
  } catch (e) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} unreadable (${e.message})`,
    };
  }
  if (!parsed || typeof parsed !== 'object' || !(key in parsed)) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} frontmatter missing '${key}'`,
    };
  }
  const observed = parsed[key];
  if (!Number.isFinite(observed)) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} '${key}' is not a number (got ${JSON.stringify(observed)})`,
    };
  }
  let pass;
  switch (operator) {
    case '==': pass = observed === operand; break;
    case '>=': pass = observed >= operand; break;
    case '<=': pass = observed <= operand; break;
    case '>':  pass = observed >  operand; break;
    case '<':  pass = observed <  operand; break;
    default: pass = false;
  }
  if (!pass) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${key}=${observed}, predicate requires ${operator} ${operand}`,
    };
  }
  return { ok: true, kind: 'count-predicate-pass' };
}

// Extract the raw YAML frontmatter string from a markdown file
// (between leading `---` line and the next `---` line).
// Returns null if no frontmatter found.
function extractFrontmatter(raw) {
  // Allow optional UTF-8 BOM
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  return m ? m[1] : null;
}

async function evalSprintCompleteGate(projectRoot, sprint) {
  const manifestPath = path.join(
    projectRoot,
    `.pipeline/architecture/sprints/${sprint}/manifest.yaml`,
  );
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, recorded: 0, declared: 0 };
  }
  const manifest = await loadYaml(manifestPath);
  const taskIds = new Set();
  if (Array.isArray(manifest && manifest.waves)) {
    for (const w of manifest.waves) {
      if (Array.isArray(w.tasks)) for (const t of w.tasks) taskIds.add(t);
    }
  }
  const declared = taskIds.size;

  const recordsRoot = path.join(projectRoot, `.pipeline/build/sprints/${sprint}/tasks`);
  let recorded = 0;
  if (fs.existsSync(recordsRoot) && fs.statSync(recordsRoot).isDirectory()) {
    for (const entry of fs.readdirSync(recordsRoot)) {
      const recPath = path.join(recordsRoot, entry, 'completion-record.yaml');
      if (fs.existsSync(recPath)) recorded++;
    }
  }
  return { ok: recorded >= declared, recorded, declared };
}

// ============================================================================
// Op: step-advance (S7 — per cli-spec.md §1.4 + §5 D-3 Addendum)
// ----------------------------------------------------------------------------
// Sole writer of `.pipeline/cursor.yaml`. Monotonic-by-construction.
// ============================================================================
async function stepAdvance({ skill, nextStep, mode, projectRoot }) {
  if (!skill) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools step-advance: --skill required, expected one of [${SKILLS.join(', ')}]`,
    );
  }
  if (!SKILLS.includes(skill)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools step-advance: --skill required, expected one of [${SKILLS.join(', ')}]`,
    );
  }
  if (!nextStep) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools step-advance: --next-step is required`,
    );
  }

  if (skill === 'context') {
    if (!mode) {
      return emitFailure(
        EXIT_ARG_MISSING_OR_BAD,
        `essense-flow-tools step-advance: --mode is required when --skill = context (must be one of [init, status, next])`,
      );
    }
    if (!CONTEXT_MODES.includes(mode)) {
      return emitFailure(
        EXIT_VALIDATION_FAIL,
        `essense-flow-tools step-advance: --mode '${mode}' not in [init, status, next]`,
      );
    }
  } else {
    if (mode) {
      return emitFailure(
        EXIT_ARG_MISSING_OR_BAD,
        `essense-flow-tools step-advance: --mode '${mode}' not accepted for --skill '${skill}'; --mode is context-only`,
      );
    }
  }

  // Read init <skill>'s ordered_steps
  let initJson;
  try {
    if (skill === 'context') {
      initJson = await initContext(projectRoot);
    } else if (skill === 'architect') {
      initJson = await initArchitect(projectRoot);
    } else if (skill === 'build') {
      initJson = await initBuild(projectRoot);
    } else if (skill === 'review') {
      initJson = await initReview(projectRoot);
    } else if (skill === 'verify') {
      initJson = await initVerify(projectRoot);
    } else if (skill === 'research') {
      initJson = await initResearch(projectRoot);
    } else {
      throw new Error(`init <${skill}> not implemented in S9.4 spike scope`);
    }
  } catch (e) {
    return emitFailure(
      EXIT_INIT_LOOKUP_FAIL,
      `essense-flow-tools step-advance: init ${skill} returned non-zero (${e.message}); cannot validate --next-step`,
    );
  }
  const orderedSteps =
    skill === 'context'
      ? (initJson.ordered_steps_by_mode && initJson.ordered_steps_by_mode[mode])
      : initJson.ordered_steps;
  if (!orderedSteps || !Array.isArray(orderedSteps) || orderedSteps.length === 0) {
    return emitFailure(
      EXIT_INIT_LOOKUP_FAIL,
      `essense-flow-tools step-advance: init ${skill} returned no ordered_steps for ${mode || skill}; cannot validate --next-step`,
    );
  }

  const cursorPath = path.join(projectRoot, CURSOR_REL);
  let cursor = null;
  if (fs.existsSync(cursorPath)) {
    try {
      cursor = await loadYaml(cursorPath);
    } catch (e) {
      return emitFailure(
        EXIT_DEGRADED,
        `essense-flow-tools step-advance: current state degraded (cursor parse failed: ${e.message}); run /heal first`,
      );
    }
  }

  // Sentinel: skill-complete → delete cursor when at last step
  if (nextStep === SKILL_COMPLETE_SENTINEL) {
    if (!cursor) {
      return emitFailure(
        EXIT_OUT_OF_ORDER,
        `essense-flow-tools step-advance: cursor empty; cannot finalize (no skill run in progress)`,
      );
    }
    if (cursor.skill !== skill) {
      return emitFailure(
        EXIT_SKILL_OR_MODE_MISMATCH,
        `essense-flow-tools step-advance: cursor.skill is '${cursor.skill}', --skill is '${skill}'; prior skill run incomplete — run /heal first`,
      );
    }
    if (skill === 'context' && cursor.mode !== mode) {
      return emitFailure(
        EXIT_SKILL_OR_MODE_MISMATCH,
        `essense-flow-tools step-advance: cursor.mode is '${cursor.mode}', --mode is '${mode}'; prior context.${cursor.mode} run incomplete — run /heal first`,
      );
    }
    const lastStep = orderedSteps[orderedSteps.length - 1];
    if (cursor.current_step !== lastStep) {
      return emitFailure(
        EXIT_OUT_OF_ORDER,
        `essense-flow-tools step-advance: --next-step '${SKILL_COMPLETE_SENTINEL}' requires cursor at last step '${lastStep}', got '${cursor.current_step}'`,
      );
    }
    fs.unlinkSync(cursorPath);
    return emitSuccess({
      ok: true,
      op: 'step-advance',
      skill,
      previous_step: cursor.current_step,
      current_step: SKILL_COMPLETE_SENTINEL,
      step_index: orderedSteps.length,
      total_steps: orderedSteps.length,
      cursor_path: CURSOR_REL,
      skill_complete: true,
    });
  }

  if (!orderedSteps.includes(nextStep)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools step-advance: --next-step '${nextStep}' not in ${skill}'s ordered_steps [${orderedSteps.join(', ')}]`,
    );
  }

  // Cursor empty → must be first step
  if (!cursor) {
    if (nextStep !== orderedSteps[0]) {
      return emitFailure(
        EXIT_OUT_OF_ORDER,
        `essense-flow-tools step-advance: cursor empty; --next-step must be first step '${orderedSteps[0]}', got '${nextStep}'`,
      );
    }
    const newCursor = {
      skill,
      ...(skill === 'context' ? { mode } : {}),
      current_step: nextStep,
      step_index: 0,
      total_steps: orderedSteps.length,
      last_advanced_at: new Date().toISOString(),
    };
    await writeCursor(cursorPath, newCursor);
    return emitSuccess({
      ok: true,
      op: 'step-advance',
      skill,
      previous_step: null,
      current_step: nextStep,
      step_index: 0,
      total_steps: orderedSteps.length,
      cursor_path: CURSOR_REL,
      skill_complete: false,
    });
  }

  // Cursor exists → skill must match
  if (cursor.skill !== skill) {
    return emitFailure(
      EXIT_SKILL_OR_MODE_MISMATCH,
      `essense-flow-tools step-advance: cursor.skill is '${cursor.skill}', --skill is '${skill}'; prior skill run incomplete — run /heal first`,
    );
  }
  if (skill === 'context' && cursor.mode !== mode) {
    return emitFailure(
      EXIT_SKILL_OR_MODE_MISMATCH,
      `essense-flow-tools step-advance: cursor.mode is '${cursor.mode}', --mode is '${mode}'; prior context.${cursor.mode} run incomplete — run /heal first`,
    );
  }

  // Monotonic successor only
  const currentIdx = orderedSteps.indexOf(cursor.current_step);
  if (currentIdx < 0) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools step-advance: cursor.current_step '${cursor.current_step}' not in ordered_steps for ${skill}/${mode || ''}; run /heal first`,
    );
  }
  const expectedSuccessor = orderedSteps[currentIdx + 1];
  if (expectedSuccessor === undefined) {
    return emitFailure(
      EXIT_OUT_OF_ORDER,
      `essense-flow-tools step-advance: cursor at last step '${cursor.current_step}'; pass --next-step '${SKILL_COMPLETE_SENTINEL}' to finalize`,
    );
  }
  if (nextStep !== expectedSuccessor) {
    return emitFailure(
      EXIT_OUT_OF_ORDER,
      `essense-flow-tools step-advance: --next-step '${nextStep}' is not the immediate successor of cursor.current_step '${cursor.current_step}'; expected '${expectedSuccessor}'`,
    );
  }

  const newCursor = {
    skill,
    ...(skill === 'context' ? { mode } : {}),
    current_step: nextStep,
    step_index: currentIdx + 1,
    total_steps: orderedSteps.length,
    last_advanced_at: new Date().toISOString(),
  };
  await writeCursor(cursorPath, newCursor);
  return emitSuccess({
    ok: true,
    op: 'step-advance',
    skill,
    previous_step: cursor.current_step,
    current_step: nextStep,
    step_index: currentIdx + 1,
    total_steps: orderedSteps.length,
    cursor_path: CURSOR_REL,
    skill_complete: false,
  });
}

async function writeCursor(cursorPath, cursor) {
  const dir = path.dirname(cursorPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cursorPath, await dumpYaml(cursor), 'utf8');
}

// ============================================================================
// Op: task-spec-write (S8 — per cli-spec.md §1.5 + §5 2026-05-06 Addendum)
// ----------------------------------------------------------------------------
// Sole writer of task spec files. Rejects content with forbidden markers
// (closes drift symptom #10). Required-key list per §5 2026-05-06 Addendum
// is the 10-key canonical shape from agent-spec §1.1.
// ============================================================================
async function taskSpecWrite({ sprint, taskId, contentFile, projectRoot }) {
  const opName = 'task-spec-write';

  // V1: required args
  if (sprint === undefined || sprint === null) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --sprint is required`);
  }
  const sprintInt = Number(String(sprint).trim());
  if (!Number.isFinite(sprintInt) || !Number.isInteger(sprintInt) || sprintInt < 1) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --sprint required, expected positive int, got ${JSON.stringify(sprint)}`,
    );
  }
  if (!taskId) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --task-id is required`);
  }
  if (!TASK_ID_PATTERN.test(taskId)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: --task-id '${taskId}' does not match canonical pattern /${TASK_ID_PATTERN.source}/ (e.g. T-001)`,
    );
  }
  if (!contentFile) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --content-file is required`);
  }

  validateProjectRoot(projectRoot, opName);

  if (!fs.existsSync(contentFile)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --content-file '${contentFile}' not found`,
    );
  }

  // V2: load state, check phase
  const { readState } = await stateLib();
  const current = await readState(projectRoot);
  if (current.degraded) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools ${opName}: current state degraded (${current.degraded}); run /heal first`,
    );
  }
  if (!['architecture', 'decomposing'].includes(current.phase)) {
    return emitFailure(
      EXIT_WRONG_PHASE,
      `essense-flow-tools ${opName}: current phase is ${current.phase}; expected one of [architecture, decomposing]`,
    );
  }

  // V3: read content; scan markers; YAML parse
  const contentText = fs.readFileSync(contentFile, 'utf8');
  const markerHit = scanForbiddenMarkers(contentText);
  if (markerHit) {
    return emitFailure(
      EXIT_FORBIDDEN_MARKER,
      `essense-flow-tools ${opName}: --content-file contains forbidden marker '${markerHit.marker}' at line ${markerHit.line}; closed task specs cannot defer fields`,
    );
  }

  let parsed;
  try {
    parsed = await loadYamlString(contentText);
  } catch (e) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: --content-file YAML parse failed: ${e.message}`,
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: --content-file YAML parse failed: top-level value must be a mapping`,
    );
  }

  // V4: required-key check (per §5 2026-05-06 Addendum)
  for (const k of TASK_SPEC_REQUIRED_KEYS) {
    if (!(k in parsed)) {
      return emitFailure(
        EXIT_REQUIRED_KEY,
        `essense-flow-tools ${opName}: --content-file missing required key '${k}'; expected keys [${TASK_SPEC_REQUIRED_KEYS.join(', ')}]`,
      );
    }
  }

  // V5: typed-value checks (per §5 2026-05-06 Addendum type table)
  const typeCheck = validateTaskSpecTypes(parsed);
  if (!typeCheck.ok) {
    return emitFailure(
      EXIT_REQUIRED_KEY,
      `essense-flow-tools ${opName}: --content-file key '${typeCheck.key}' has invalid value '${typeCheck.observed}'; expected ${typeCheck.expected}`,
    );
  }

  // V6: task_id consistency
  if (parsed.task_id !== taskId) {
    return emitFailure(
      EXIT_TASK_ID_MISMATCH,
      `essense-flow-tools ${opName}: --content-file's task_id field is '${parsed.task_id}', --task-id is '${taskId}'; mismatch`,
    );
  }

  // V7: sprint manifest consistency
  const manifestPath = path.join(
    projectRoot,
    `.pipeline/architecture/sprints/${sprintInt}/manifest.yaml`,
  );
  if (!fs.existsSync(manifestPath)) {
    return emitFailure(
      EXIT_PREREQ_MISSING,
      `essense-flow-tools ${opName}: sprint manifest .pipeline/architecture/sprints/${sprintInt}/manifest.yaml not found`,
    );
  }
  const manifest = await loadYaml(manifestPath);
  const taskIds = new Set();
  if (Array.isArray(manifest && manifest.waves)) {
    for (const w of manifest.waves) {
      if (Array.isArray(w.tasks)) for (const t of w.tasks) taskIds.add(t);
    }
  }
  if (!taskIds.has(taskId)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: --task-id '${taskId}' not in sprint ${sprintInt} manifest tasks list [${[...taskIds].join(', ')}]`,
    );
  }

  // V8: idempotency (destination must not exist)
  const destRel = `.pipeline/architecture/sprints/${sprintInt}/tasks/${taskId}.yaml`;
  const destPath = path.join(projectRoot, destRel);
  if (fs.existsSync(destPath)) {
    return emitFailure(
      EXIT_IDEMPOTENCY,
      `essense-flow-tools ${opName}: destination ${destRel} already exists; idempotency violation`,
    );
  }

  // Write atomically: write to .tmp-task-spec then rename.
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${destPath}.tmp-task-spec`;
  // Write the parsed (already-validated) yaml back; re-emitted form
  // canonicalises ordering/indent and ensures bytes match what we validated.
  const canonical = await dumpYaml(parsed);
  fs.writeFileSync(tmpPath, canonical, 'utf8');
  fs.renameSync(tmpPath, destPath);

  return emitSuccess({
    ok: true,
    op: 'task-spec-write',
    sprint: sprintInt,
    task_id: taskId,
    spec_path: destRel,
    bytes_written: Buffer.byteLength(canonical, 'utf8'),
    scanned_markers_clear: true,
  });
}

function scanForbiddenMarkers(text) {
  const lower = text.toLowerCase();
  for (const marker of FORBIDDEN_MARKERS) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0) {
      // Compute 1-based line number
      const line = text.slice(0, idx).split('\n').length;
      return { marker, line };
    }
  }
  return null;
}

function validateTaskSpecTypes(spec) {
  // schema_version: int = 1
  if (typeof spec.schema_version !== 'number' || !Number.isInteger(spec.schema_version) || spec.schema_version !== 1) {
    return { ok: false, key: 'schema_version', observed: String(spec.schema_version), expected: 'int frozen at 1' };
  }
  // task_id: §3.5 pattern (already checked vs --task-id; here verify shape)
  if (typeof spec.task_id !== 'string' || !TASK_ID_PATTERN.test(spec.task_id)) {
    return { ok: false, key: 'task_id', observed: String(spec.task_id), expected: `string matching /${TASK_ID_PATTERN.source}/` };
  }
  // goal: non-empty string
  if (typeof spec.goal !== 'string' || spec.goal.trim() === '') {
    return { ok: false, key: 'goal', observed: String(spec.goal), expected: 'non-empty string' };
  }
  // requirements_traced: array of strings
  if (!Array.isArray(spec.requirements_traced) ||
      spec.requirements_traced.some((x) => typeof x !== 'string')) {
    return {
      ok: false,
      key: 'requirements_traced',
      observed: JSON.stringify(spec.requirements_traced),
      expected: 'array of strings (FR-* / NFR-* IDs)',
    };
  }
  // file_write_contract: object with `paths` array
  if (
    !spec.file_write_contract ||
    typeof spec.file_write_contract !== 'object' ||
    Array.isArray(spec.file_write_contract) ||
    !Array.isArray(spec.file_write_contract.paths)
  ) {
    return {
      ok: false,
      key: 'file_write_contract',
      observed: JSON.stringify(spec.file_write_contract),
      expected: 'object with `paths` array',
    };
  }
  // agency_level: enum first (used by behavioral_pseudocode null-acceptance rule)
  if (!TASK_SPEC_AGENCY_LEVELS.includes(spec.agency_level)) {
    return {
      ok: false,
      key: 'agency_level',
      observed: String(spec.agency_level),
      expected: `enum [${TASK_SPEC_AGENCY_LEVELS.join(', ')}]`,
    };
  }
  // behavioral_pseudocode: string (null OK only when agency_level == 'open')
  if (spec.behavioral_pseudocode === null) {
    if (spec.agency_level !== 'open') {
      return {
        ok: false,
        key: 'behavioral_pseudocode',
        observed: 'null',
        expected: 'string (null only allowed when agency_level == open)',
      };
    }
  } else if (typeof spec.behavioral_pseudocode !== 'string') {
    return {
      ok: false,
      key: 'behavioral_pseudocode',
      observed: String(spec.behavioral_pseudocode),
      expected: 'string',
    };
  }
  // test_completion_contract: array of objects each with id/description/check
  if (!Array.isArray(spec.test_completion_contract)) {
    return {
      ok: false,
      key: 'test_completion_contract',
      observed: JSON.stringify(spec.test_completion_contract),
      expected: 'array of objects each with id, description, check',
    };
  }
  for (const ac of spec.test_completion_contract) {
    if (!ac || typeof ac !== 'object' || !('id' in ac) || !('description' in ac) || !('check' in ac)) {
      return {
        ok: false,
        key: 'test_completion_contract',
        observed: JSON.stringify(ac),
        expected: 'array of objects each with id, description, check',
      };
    }
  }
  // dependencies: array of strings
  if (!Array.isArray(spec.dependencies) || spec.dependencies.some((x) => typeof x !== 'string')) {
    return {
      ok: false,
      key: 'dependencies',
      observed: JSON.stringify(spec.dependencies),
      expected: 'array of strings (task-id refs)',
    };
  }
  // agency_rationale: non-empty string
  if (typeof spec.agency_rationale !== 'string' || spec.agency_rationale.trim() === '') {
    return {
      ok: false,
      key: 'agency_rationale',
      observed: String(spec.agency_rationale),
      expected: 'non-empty string',
    };
  }
  return { ok: true };
}

// ============================================================================
// Op: record-task-completion (S9.1 — per cli-spec.md §1.3 + §5 D-1 Addendum
// 2026-05-05 [path] + §5 2026-05-07 Addendum [shape])
// ----------------------------------------------------------------------------
// Sole writer of per-task completion records. Args mirror task-spec-write
// pattern: --content-file <path> carrying assembled dual-record YAML.
// Required keys per §5 2026-05-07 Addendum (8 top-level: schema_version,
// task_id, sprint, agent_claim, runner_verification, verified,
// task_started_at, task_completed_at). Optional: drift, synthetic,
// recorded_at (server-stamped). Closes drift symptom #5/#6 (dual-record
// preserves agent_claim + runner_verification both; per-task ops are the
// only path to advance the gate).
// ============================================================================
async function recordTaskCompletion({ sprint, taskId, contentFile, projectRoot }) {
  const opName = 'record-task-completion';

  // V1: required args
  if (sprint === undefined || sprint === null) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --sprint required, expected positive int`,
    );
  }
  const sprintInt = Number(String(sprint).trim());
  if (!Number.isFinite(sprintInt) || !Number.isInteger(sprintInt) || sprintInt < 1) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --sprint required, expected positive int`,
    );
  }
  if (!taskId) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --task-id is required`);
  }
  if (!TASK_ID_PATTERN.test(taskId)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: --task-id '${taskId}' does not match canonical pattern /${TASK_ID_PATTERN.source}/ (e.g. T-001)`,
    );
  }
  if (!contentFile) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --content-file is required`);
  }

  validateProjectRoot(projectRoot, opName);

  if (!fs.existsSync(contentFile)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --content-file '${contentFile}' not found`,
    );
  }

  // V2: load state, check phase
  const { readState } = await stateLib();
  const current = await readState(projectRoot);
  if (current.degraded) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools ${opName}: current state degraded (${current.degraded}); run /heal first`,
    );
  }
  if (current.phase !== 'sprinting') {
    return emitFailure(
      EXIT_WRONG_PHASE,
      `essense-flow-tools ${opName}: current phase is ${current.phase}; expected 'sprinting' (record-task-completion is sprinting-phase-only)`,
    );
  }

  // V3: read content; YAML parse
  const contentText = fs.readFileSync(contentFile, 'utf8');
  let parsed;
  try {
    parsed = await loadYamlString(contentText);
  } catch (e) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: --content-file YAML parse failed: ${e.message}`,
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: --content-file YAML parse failed: top-level value must be a mapping`,
    );
  }

  // V4: required-key check
  for (const k of COMPLETION_RECORD_REQUIRED_KEYS) {
    if (!(k in parsed)) {
      return emitFailure(
        EXIT_REQUIRED_KEY,
        `essense-flow-tools ${opName}: --content-file missing required key '${k}'; expected keys [${COMPLETION_RECORD_REQUIRED_KEYS.join(', ')}]`,
      );
    }
  }

  // V5: typed-value checks (per §5 2026-05-07 Addendum sub-object schema table)
  const typeCheck = validateCompletionRecordTypes(parsed);
  if (!typeCheck.ok) {
    return emitFailure(
      EXIT_REQUIRED_KEY,
      `essense-flow-tools ${opName}: --content-file key '${typeCheck.key}' has invalid value '${typeCheck.observed}'; expected ${typeCheck.expected}`,
    );
  }

  // V6: task_id consistency (parsed task_id must equal --task-id)
  if (parsed.task_id !== taskId) {
    return emitFailure(
      EXIT_TASK_ID_MISMATCH,
      `essense-flow-tools ${opName}: --content-file's task_id field is '${parsed.task_id}', --task-id is '${taskId}'; mismatch`,
    );
  }

  // V7: sprint consistency (parsed sprint must equal --sprint)
  if (parsed.sprint !== sprintInt) {
    return emitFailure(
      EXIT_TASK_ID_MISMATCH,
      `essense-flow-tools ${opName}: --content-file's sprint field is '${parsed.sprint}', --sprint is '${sprintInt}'; mismatch`,
    );
  }

  // V8: sprint manifest consistency
  const manifestPath = path.join(
    projectRoot,
    `.pipeline/architecture/sprints/${sprintInt}/manifest.yaml`,
  );
  if (!fs.existsSync(manifestPath)) {
    return emitFailure(
      EXIT_PREREQ_MISSING,
      `essense-flow-tools ${opName}: sprint manifest .pipeline/architecture/sprints/${sprintInt}/manifest.yaml not found`,
    );
  }
  const manifest = await loadYaml(manifestPath);
  const taskIds = new Set();
  if (Array.isArray(manifest && manifest.waves)) {
    for (const w of manifest.waves) {
      if (Array.isArray(w.tasks)) for (const t of w.tasks) taskIds.add(t);
    }
  }
  if (!taskIds.has(taskId)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: --task-id '${taskId}' not in sprint ${sprintInt} manifest tasks list [${[...taskIds].join(', ')}]`,
    );
  }

  // V9: idempotency (destination must not exist) per §5 D-1 canonical path
  const destRel = `.pipeline/build/sprints/${sprintInt}/tasks/${taskId}/completion-record.yaml`;
  const destPath = path.join(projectRoot, destRel);
  if (fs.existsSync(destPath)) {
    return emitFailure(
      EXIT_IDEMPOTENCY,
      `essense-flow-tools ${opName}: record .pipeline/build/sprints/${sprintInt}/tasks/${taskId}/completion-record.yaml already exists; idempotency violation`,
    );
  }

  // Build canonical content: server-stamp recorded_at, normalize sprint/task_id,
  // default synthetic + drift if absent.
  const recordedAt = new Date().toISOString();
  const canonicalContent = {
    schema_version: parsed.schema_version,
    task_id: taskId,
    sprint: sprintInt,
    agent_claim: parsed.agent_claim,
    runner_verification: parsed.runner_verification,
    verified: parsed.verified,
    synthetic: parsed.synthetic === true,
    task_started_at: parsed.task_started_at,
    task_completed_at: parsed.task_completed_at,
    recorded_at: recordedAt,
  };
  // drift only included if present (defaults to absent → empty)
  if (parsed.drift !== undefined && parsed.drift !== null) {
    canonicalContent.drift = parsed.drift;
  }

  // Atomic write: tmp + rename
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${destPath}.tmp-completion-record`;
  const canonicalYaml = await dumpYaml(canonicalContent);
  fs.writeFileSync(tmpPath, canonicalYaml, 'utf8');
  fs.renameSync(tmpPath, destPath);

  // Compute sprint_progress for forensic continuity
  const recordsRoot = path.join(projectRoot, `.pipeline/build/sprints/${sprintInt}/tasks`);
  let recorded = 0;
  if (fs.existsSync(recordsRoot) && fs.statSync(recordsRoot).isDirectory()) {
    for (const entry of fs.readdirSync(recordsRoot)) {
      const recPath = path.join(recordsRoot, entry, 'completion-record.yaml');
      if (fs.existsSync(recPath)) recorded++;
    }
  }

  return emitSuccess({
    ok: true,
    op: 'record-task-completion',
    sprint: sprintInt,
    task_id: taskId,
    record_path: destRel,
    verified: canonicalContent.verified,
    synthetic: canonicalContent.synthetic,
    recorded_at: recordedAt,
    bytes_written: Buffer.byteLength(canonicalYaml, 'utf8'),
    sprint_progress: { recorded, declared: taskIds.size },
  });
}

function validateCompletionRecordTypes(rec) {
  // schema_version: int = 1
  if (typeof rec.schema_version !== 'number' || !Number.isInteger(rec.schema_version) || rec.schema_version !== 1) {
    return { ok: false, key: 'schema_version', observed: String(rec.schema_version), expected: 'int frozen at 1' };
  }
  // task_id: §3.5 pattern (V6 also re-checks vs --task-id; here verify shape)
  if (typeof rec.task_id !== 'string' || !TASK_ID_PATTERN.test(rec.task_id)) {
    return { ok: false, key: 'task_id', observed: String(rec.task_id), expected: `string matching /${TASK_ID_PATTERN.source}/` };
  }
  // sprint: positive int
  if (typeof rec.sprint !== 'number' || !Number.isInteger(rec.sprint) || rec.sprint < 1) {
    return { ok: false, key: 'sprint', observed: String(rec.sprint), expected: 'positive int' };
  }
  // agent_claim: object with optional status enum + summary string when present
  if (!rec.agent_claim || typeof rec.agent_claim !== 'object' || Array.isArray(rec.agent_claim)) {
    return { ok: false, key: 'agent_claim', observed: JSON.stringify(rec.agent_claim), expected: 'object (mapping)' };
  }
  if ('status' in rec.agent_claim && rec.agent_claim.status !== null) {
    if (typeof rec.agent_claim.status !== 'string' || !COMPLETION_RECORD_AGENT_STATUS_VALUES.includes(rec.agent_claim.status)) {
      return {
        ok: false,
        key: 'agent_claim.status',
        observed: String(rec.agent_claim.status),
        expected: `enum [${COMPLETION_RECORD_AGENT_STATUS_VALUES.join(', ')}]`,
      };
    }
  }
  if ('summary' in rec.agent_claim && rec.agent_claim.summary !== null && rec.agent_claim.summary !== undefined) {
    if (typeof rec.agent_claim.summary !== 'string' || rec.agent_claim.summary.trim() === '') {
      return {
        ok: false,
        key: 'agent_claim.summary',
        observed: String(rec.agent_claim.summary),
        expected: 'non-empty string when present',
      };
    }
  }
  // runner_verification: object; drift sub-shape if present
  if (!rec.runner_verification || typeof rec.runner_verification !== 'object' || Array.isArray(rec.runner_verification)) {
    return { ok: false, key: 'runner_verification', observed: JSON.stringify(rec.runner_verification), expected: 'object (mapping)' };
  }
  if ('files_validated' in rec.runner_verification && rec.runner_verification.files_validated !== null) {
    if (!Array.isArray(rec.runner_verification.files_validated)) {
      return {
        ok: false,
        key: 'runner_verification.files_validated',
        observed: JSON.stringify(rec.runner_verification.files_validated),
        expected: 'array',
      };
    }
  }
  if ('drift' in rec.runner_verification && rec.runner_verification.drift !== null && rec.runner_verification.drift !== undefined) {
    const d = rec.runner_verification.drift;
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      return { ok: false, key: 'runner_verification.drift', observed: JSON.stringify(d), expected: 'object with files: array, criteria: array' };
    }
    if ('files' in d && !Array.isArray(d.files)) {
      return { ok: false, key: 'runner_verification.drift.files', observed: JSON.stringify(d.files), expected: 'array' };
    }
    if ('criteria' in d && !Array.isArray(d.criteria)) {
      return { ok: false, key: 'runner_verification.drift.criteria', observed: JSON.stringify(d.criteria), expected: 'array' };
    }
  }
  // top-level drift (alternative location per build.md substance shape)
  if ('drift' in rec && rec.drift !== null && rec.drift !== undefined) {
    const d = rec.drift;
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      return { ok: false, key: 'drift', observed: JSON.stringify(d), expected: 'object with files: array, criteria: array' };
    }
    if ('files' in d && !Array.isArray(d.files)) {
      return { ok: false, key: 'drift.files', observed: JSON.stringify(d.files), expected: 'array' };
    }
    if ('criteria' in d && !Array.isArray(d.criteria)) {
      return { ok: false, key: 'drift.criteria', observed: JSON.stringify(d.criteria), expected: 'array' };
    }
  }
  // verified: bool
  if (typeof rec.verified !== 'boolean') {
    return { ok: false, key: 'verified', observed: String(rec.verified), expected: 'bool (true / false)' };
  }
  // task_started_at + task_completed_at: ISO 8601 strings round-tripping through Date
  for (const tk of ['task_started_at', 'task_completed_at']) {
    const v = rec[tk];
    if (typeof v !== 'string') {
      return { ok: false, key: tk, observed: String(v), expected: 'ISO 8601 datetime string' };
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, key: tk, observed: v, expected: 'ISO 8601 datetime string (parseable)' };
    }
  }
  // synthetic: optional bool
  if ('synthetic' in rec && rec.synthetic !== undefined && typeof rec.synthetic !== 'boolean') {
    return { ok: false, key: 'synthetic', observed: String(rec.synthetic), expected: 'bool (true / false) when present' };
  }
  return { ok: true };
}

// ============================================================================
// Arg parser
// ============================================================================
function parseArgs(argv) {
  const out = { _op: null, _sub: null };
  let i = 0;
  if (argv[i] && !argv[i].startsWith('--')) out._op = argv[i++];
  if (out._op === 'init' && argv[i] && !argv[i].startsWith('--')) out._sub = argv[i++];
  while (i < argv.length) {
    const tok = argv[i];
    if (!tok.startsWith('--')) {
      i++;
      continue;
    }
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
      i += 1;
    } else {
      out[key] = next;
      i += 2;
    }
  }
  return out;
}

function printHelp() {
  process.stdout.write(
    [
      'essense-flow-tools — narrow CLI for essense-flow state ops + path lookups',
      '',
      'Ops implemented (S7 + S8 + S9.1 + S9.2 + S9.3 — 2026-05-07):',
      '  init context | architect | build | review | verify',
      '      → JSON describing skill (canonical paths, ordered_steps, sub_agents).',
      '        context returns multi-mode shape (ordered_steps_by_mode + per_phase_artifact_map).',
      '  step-advance --skill <name> --next-step <step> [--mode <init|status|next>] [--project-root <p>]',
      '      → advance per-skill cursor at <project-root>/.pipeline/cursor.yaml',
      '        monotonic-by-construction; --mode required for --skill=context only',
      '        --next-step skill-complete + cursor on last step → cursor deleted',
      '  state-set-phase --value <phase> [--sprint <int>] [--project-root <p>]',
      '      → advance pipeline phase; legality + prerequisite + per-task-record gate.',
      '  state-set-sprint | state-set-wave --value <int|null>',
      '  state-set-elicitation-round | state-set-research-round | state-set-decomposition-round',
      '      --value <int>',
      '  state-set-elicitation-started | -elicitation-completed | -research-completed |',
      '  state-set-triage-completed | -architecture-completed | -verify-completed',
      '      --value <iso8601-datetime>',
      '  task-spec-write --sprint <int> --task-id <id> --content-file <path>',
      '      → write closed task spec yaml; rejects forbidden markers (TBD, agent decides, …);',
      '        validates against §5 2026-05-06 Addendum required-key list (10 keys + optional module).',
      '  record-task-completion --sprint <int> --task-id <id> --content-file <path>',
      '      → write per-task dual-record completion yaml; validates against §5 2026-05-07',
      '        Addendum required-key list (8 keys: schema_version, task_id, sprint, agent_claim,',
      '        runner_verification, verified, task_started_at, task_completed_at);',
      '        atomic tmp+rename; idempotency rejection; sprinting-phase-only.',
      '',
      'Future S9.5-7 extends with: init <skill> for the remaining 3 skills',
      '(triage, elicit, heal).',
      'See redesign/cli-spec.md and redesign/init-spec.md.',
    ].join('\n') + '\n',
  );
}

// ============================================================================
// Main
// ============================================================================
(async () => {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    printHelp();
    process.exit(EXIT_OK);
  }
  const args = parseArgs(argv);
  const projectRoot = args['project-root'] ? path.resolve(args['project-root']) : process.cwd();

  // Setter family dispatch
  if (args._op && SETTERS[args._op]) {
    const setter = SETTERS[args._op];
    await runSetter({
      opName: args._op,
      fieldPath: setter.fieldPath,
      rawValue: args.value,
      parseValue: setter.parseValue,
      projectRoot,
    });
    return;
  }

  switch (args._op) {
    case 'init': {
      if (args._sub === 'context') {
        const json = await initContext(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (args._sub === 'architect') {
        const json = await initArchitect(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (args._sub === 'build') {
        const json = await initBuild(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (args._sub === 'review') {
        const json = await initReview(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (args._sub === 'verify') {
        const json = await initVerify(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (args._sub === 'research') {
        const json = await initResearch(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (!args._sub) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          `essense-flow-tools init: <skill> required (one of [${SKILLS.join(', ')}])`,
        );
      }
      if (!SKILLS.includes(args._sub)) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          `essense-flow-tools init: unknown skill '${args._sub}', expected one of [${SKILLS.join(', ')}]`,
        );
      }
      // Known skill but not yet implemented in S9.4 spike scope
      return emitFailure(
        EXIT_INIT_LOOKUP_FAIL,
        `essense-flow-tools init: skill '${args._sub}' not implemented in S9.4 spike scope (only 'context', 'architect', 'build', 'review', 'verify', 'research' implemented; future S9.5-7 extend per redesign/init-spec.md)`,
      );
    }
    case 'step-advance': {
      await stepAdvance({
        skill: args.skill,
        nextStep: args['next-step'],
        mode: args.mode,
        projectRoot,
      });
      return;
    }
    case 'state-set-phase': {
      await stateSetPhase({
        rawValue: args.value,
        sprintArg: args.sprint,
        projectRoot,
      });
      return;
    }
    case 'task-spec-write': {
      await taskSpecWrite({
        sprint: args.sprint,
        taskId: args['task-id'],
        contentFile: args['content-file']
          ? path.resolve(args['content-file'])
          : undefined,
        projectRoot,
      });
      return;
    }
    case 'record-task-completion': {
      await recordTaskCompletion({
        sprint: args.sprint,
        taskId: args['task-id'],
        contentFile: args['content-file']
          ? path.resolve(args['content-file'])
          : undefined,
        projectRoot,
      });
      return;
    }
    default:
      return emitFailure(
        EXIT_UNKNOWN_OP,
        `essense-flow-tools: unknown op '${args._op}' (run with --help for ops list)`,
      );
  }
})().catch((err) => {
  process.stderr.write(`essense-flow-tools: unhandled error: ${err.message}\n`);
  if (process.env.ESSENSE_FLOW_DEBUG) console.error(err.stack);
  process.exit(1);
});
