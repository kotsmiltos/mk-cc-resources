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
// S9.5 extension (2026-05-08): adds the triage surface — `init triage`.
// Triage is sprint-spanning (sprint_number: null) and has the most exits of
// any skill (5 destinations: eliciting, research, architecture,
// requirements-ready, verifying — the sorting hat). Closes the cli-spec §3.4
// disposition-predicate TBD (per 06-decisions.md 2026-05-08 + cli-spec §5
// 2026-05-08 Addendum) by extending `evaluatePredicate` with a 5-entry phrase
// lookup table mapping each transitions.yaml `triage-skill` `requires:` string
// to a TRIAGE-REPORT.md frontmatter `routed_to:` scalar-equality check via
// the new `evalDispositionPredicate` helper (re-uses `extractFrontmatter`
// + js-yaml-sync from S9.2). Both `case 'init':` public switch + step-advance
// internal init dispatcher gain a `triage` branch in the SAME edit per S9.3
// O-4 cross-impl-site preflight rule. Disposition-soft-pass fallback retained
// as defense-in-depth for predicates outside the locked phrase table.
// essense-flow-sub-triager registered (optional, judgment-driven, all-required
// quorum on dispatched classes per agent-spec §1.2 + skill-substance/triage.md
// "Sub-agent dispatches").
//
// Spec sources (read-only — do not paraphrase or invent fields):
//   redesign/cli-spec.md §1.1 (state-set-* family preamble + per-field blocks),
//                       §1.2 (state-set-phase), §1.4 (step-advance + §5 D-3
//                       Addendum 2026-05-05 mode arg), §1.5 (task-spec-write +
//                       §5 2026-05-06 Addendum required-key list sync),
//                       §1.3 (record-task-completion + §5 2026-05-07 Addendum
//                       dual-record shape), §3.4 (predicate evaluator).
//   redesign/init-spec.md §1.2 (init research), §1.3 (init triage),
//                         §1.4 (init architect), §1.5 (init build),
//                         §1.6 (init review), §1.7 (init verify),
//                         §1.9 (init context),
//                         §7 Addendum 2026-05-06 (item-verifier brief_template
//                         = null; extracted-item IS the brief input).
//   redesign/agent-spec.md §1.1 (essense-flow-sub-architect — task spec shape),
//                          §1.2 (sub-triager — triage per-class),
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
//                            2026-05-08 S9.4 (research wire),
//                            2026-05-08 S9.5 (triage wire +
//                            disposition-predicate TBD lock).
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

// ---- T-904 explicit-args helper (DD-18 discipline gate) ----
// Closes the magic-inference surface across Round-9 new ops (T-901 next-step,
// T-902 arch-alignment-check, T-903 task-spec-write-section, T-905 cursor-init).
// Pattern per op handler: applyCursorInference(...) -> requireExplicitArgs(...).
// See lib/explicit-args.cjs for the policy + Phase A/B helper bodies.
const { requireExplicitArgs, applyCursorInference } = require(path.join(PLUGIN_ROOT, 'lib', 'explicit-args.cjs'));

// ---- Canonical artifact schemas (references/schemas/*.schema.yaml) ----
// Single source of truth for artifact shapes. Validators, required-key
// lists, enums, and the rendered shape blocks in templates/agent defs all
// derive from these files — shapes are never hand-copied. Loaded at module
// init; a missing schema file is a packaging bug and must fail loudly.
const {
  loadSchema: loadArtifactSchema,
  validate: validateAgainstSchema,
  requiredKeys: schemaRequiredKeys,
  schemaEnum,
} = require(path.join(PLUGIN_ROOT, 'lib', 'schema-validate.cjs'));
const TASK_SPEC_SCHEMA = loadArtifactSchema('task-spec');
const COMPLETION_RECORD_SCHEMA = loadArtifactSchema('completion-record');
const REGISTER_ITEM_SCHEMA = loadArtifactSchema('register-item');

// ---- Artifact-phase inference (2026-06 rebuild: artifacts ARE the state) ----
const { inferPhaseFromArtifacts } = require(path.join(PLUGIN_ROOT, 'lib', 'infer-phase.cjs'));

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
// T-921 round-10 D-Rd10-4: dedicated alias for "cursor.step_index exceeds
// total_steps" hard-fail. Maps to value 9 (same numeric as EXIT_VALIDATION_FAIL
// per round-10 closed decision: this IS a validation failure of the cursor
// invariant step_index <= total_steps). Distinct named constant so callers +
// future round migrations grep the semantic, not just the number. Replaces
// the prior misuse of EXIT_PREREQ_MISSING (value 7) at the same call site —
// F11 + D-Rd10-4 closed exit code 7→9.
const EXIT_STEP_INDEX_EXCEEDS_TOTAL = 9;
const EXIT_IDEMPOTENCY = 10;
const EXIT_WRONG_PHASE = 11;
const EXIT_INIT_LOOKUP_FAIL = 12;
const EXIT_OUT_OF_ORDER = 13;
const EXIT_SKILL_OR_MODE_MISMATCH = 14;
const EXIT_FORBIDDEN_MARKER = 15;
const EXIT_YAML_PARSE = 16;
const EXIT_REQUIRED_KEY = 17;
const EXIT_TASK_ID_MISMATCH = 18;
// EXIT_ALIGNMENT_DRIFT=19 per D-Rd12-8 + CMC-Rd12-M2-1 resolution 2026-05-14T14:30Z
// (code 18 reserved for task_id-mismatch at cli-spec L365 + L551 pre-canonical);
// shared-constants table authority at redesign/cli-spec.md §3.7 (M2 task amend T-985).
// Dedicated alignment-counter-drift exit code so CI scripts can key on the
// specific failure mode without re-parsing structured findings YAML.
const EXIT_ALIGNMENT_DRIFT = 19;
const EXIT_UNKNOWN_OP = 4;
const EXIT_GENERIC = 1;

// ---- Closed-list constants (per cli-spec.md §3.1, §3.2; init-spec.md §1.4 / §1.9) ----
const SKILLS = [
  'elicit', 'research', 'architect', 'build', 'review',
  'verify', 'triage', 'heal', 'context',
];
const CONTEXT_MODES = ['init', 'status', 'next'];

// One dispatch table for the 9 skill-init handlers — consumed by both the
// 'init <skill>' op and step-advance's internal ordered_steps lookup. The
// two call sites used to carry parallel 9-branch if-else chains that had to
// be edited in lockstep when a skill landed. Function declarations hoist,
// so the forward references are safe.
const INIT_DISPATCH = {
  context: () => initContext,
  architect: () => initArchitect,
  build: () => initBuild,
  review: () => initReview,
  verify: () => initVerify,
  research: () => initResearch,
  triage: () => initTriage,
  elicit: () => initElicit,
  heal: () => initHeal,
};

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

// M-2 engine-behavior triggers per D-Sprint10-5 / T-1002. Words that, when
// they appear in behavioral_pseudocode under agency_level=prescribed, MUST
// be supported by a nearby <file>:<line> citation. Whole-word regex match
// (case-insensitive). The 4 triggers are the closed M-2 set per
// META-GAP-ROUND-LOOP.md ship recommendation; widening the list requires a
// closed decision (substantive scope amend), not a quiet edit.
const ENGINE_BEHAVIOR_TRIGGERS = ['throws', 'emits', 'returns', 'produces'];
const ENGINE_BEHAVIOR_TRIGGER_RE = /\b(throws|emits|returns|produces)\b/i;
// Citation shape: <path>.(cjs|js|md|yaml|yml|py):<line-number>. Permissive
// path characters cover both POSIX + Windows separators. Line-only shape
// (`:42`) also accepted when paired with any path-like token on the same
// window line — handled in the helper, not the regex.
const CITATION_PATH_LINE_RE = /[A-Za-z0-9._/\\-]+\.(cjs|js|md|yaml|yml|py):[0-9]+/;
const CITATION_LOOSE_LINE_RE = /:\s*[0-9]+\b/;
const CITATION_PATH_TOKEN_RE = /[A-Za-z0-9._/\\-]+\.(cjs|js|md|yaml|yml|py)/;

// Task-id pattern — derives from references/schemas/task-spec.schema.yaml
// (single source; the schema doc records why the pattern was widened from
// the original /^T-\d{3,}$/).
const TASK_ID_PATTERN = new RegExp(TASK_SPEC_SCHEMA.fields.task_id.pattern);

// Required-key lists + enums derive from the canonical schemas. The legacy
// hand-maintained copies of these lists drifted from the templates and agent
// defs that taught them; deriving kills that drift class by construction.
const TASK_SPEC_REQUIRED_KEYS = schemaRequiredKeys(TASK_SPEC_SCHEMA);
const TASK_SPEC_AGENCY_LEVELS = schemaEnum(TASK_SPEC_SCHEMA, 'agency_level');
const COMPLETION_RECORD_REQUIRED_KEYS = schemaRequiredKeys(COMPLETION_RECORD_SCHEMA);
const COMPLETION_RECORD_AGENT_STATUS_VALUES = schemaEnum(COMPLETION_RECORD_SCHEMA, 'agent_claim.status');

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
// ---- Manifest reads tolerate the multi-document shape ----
// The sprint-manifest.md template is single-doc, but some architect runs emit a
// `---` frontmatter block + body (two YAML documents). A plain js-yaml load()
// throws 'expected a single document in the stream' and hard-blocks every
// manifest-backed gate (state-set-phase, record-task-completion). Per Fail-Soft +
// Graceful-Degradation, merge all documents — frontmatter keys (schema_version,
// budget_caps, …) and body keys (waves, dependency_graph, notes) are disjoint, so
// Object.assign is lossless; later docs win on the rare collision. A single-doc
// manifest passes through unchanged (loadAll -> [doc] -> doc). Added 2026-06-07
// after both BiananceRepo sprint-1/2 manifests hard-blocked the CLI.
function mergeYamlDocsSync(raw) {
  const y = require('js-yaml');
  const docs = y
    .loadAll(raw)
    .filter((d) => d && typeof d === 'object' && !Array.isArray(d));
  if (docs.length === 0) return null;
  return Object.assign({}, ...docs);
}
async function loadManifestYaml(p) {
  return mergeYamlDocsSync(fs.readFileSync(p, 'utf8'));
}
async function dumpYaml(obj) {
  const y = await yaml();
  return y.dump(obj, { lineWidth: 100, noRefs: true });
}

// ---- T-939 writeStateAndFingerprint wrapper (DD-10 audit-trail integrity
//      hash mandate; commissioned by T-919 + T-918 + Sprint-6 T-M4-001;
//      replaces direct register-write call sites with a single canonical
//      writer). Atomic tmp+rename + SHA-256 fingerprint sidecar.
//
//   Contract (DD-10 closed):
//     - absRegisterPath MUST be absolute. Throws with /DD-10/ + /absolute/
//       message on relative input.
//     - Body:
//         canonical = await dumpYaml(registerObject)
//         tmpPath = tmpName(absRegisterPath)                  // D-Rd11-8 + D-Rd10-13
//         write tmp; rename tmp -> absRegisterPath
//         fp = sha256(canonical, utf8) hex
//         tmpFp = tmpName(fingerprintPath)                    // D-Rd11-8 + D-Rd10-13
//         write tmpFp; rename tmpFp -> absRegisterPath + '.fingerprint'
//         return { canonicalBytes: canonical, fingerprint: fp }
//
//   ESF_TEST_FAIL_AFTER_TMP guard (F34-cluster pattern, gated per D-Rd10-14):
//     if isTestMode() AND process.env.ESF_TEST_FAIL_AFTER_TMP === '1', throw
//     AFTER tmp write + BEFORE rename. No production effect — isTestMode()
//     requires NODE_ENV=test or ESF_TEST_MODE=1 (D-Rd10-14 opt-in policy).
//
//   Uniqueness suffix: routed through tmpName() from lib/atomic-write.cjs —
//     single source of truth for ${path}.tmp-${pid}-${ms}-${4hex} shape
//     (D-Rd10-13 single-writer ruling, T-952 routes 3 sites here through it).
//
//   Not exported: internal helper. External modules cannot bypass canonical-
//     write discipline.
const _crypto = require('node:crypto');
// T-952 (D-Rd11-8): route both tmp filenames through tmpName() + the test-only
// crash gate through isTestMode() — three sites inside the wrapper below.
const { tmpName } = require('../lib/atomic-write.cjs');
const { isTestMode } = require('../lib/test-mode-guard.cjs');
// T-961 (D-Rd11-4 + CMC-Rd11-1 + R2-HS3 + R2-FM2 Cluster E): lock-discipline
// wrap for register-mutating handlers (register-add, heal --sweep-stale-claims
// auto-release branch, heal --apply-disposition) + audit-line atomic-append
// substrate for HEAL-LOG entries. withLock(REGISTER_PATH, asyncFn) acquires a
// wx-sentinel lock at REGISTER_PATH + '.lock' before the read-modify-write
// boundary and releases via finally — even if asyncFn throws. appendAuditLine
// replaces the prior _appendStaleSweepLogLine + _appendApplyDispositionLogLine
// tmp+rename bodies with a single O_APPEND atomic write per D-Rd11-4. Lock
// scope MUST NOT cross stdout emit (release before JSON envelope write) so
// the lock-substance contract stays grep-stable.
const { withLock, appendAuditLine } = require('../lib/with-lock.cjs');
async function writeStateAndFingerprint(absRegisterPath, registerObject) {
  // HARD CHECK (DD-10): absRegisterPath MUST be absolute.
  if (typeof absRegisterPath !== 'string' || !path.isAbsolute(absRegisterPath)) {
    throw new Error(
      'writeStateAndFingerprint: absRegisterPath must be absolute (DD-10)',
    );
  }

  const canonical = await dumpYaml(registerObject);

  // T-952 (D-Rd11-8): state-tmp filename routes through tmpName() —
  // ${path}.tmp-${pid}-${ms}-${4hex} per D-Rd10-13 single-writer ruling.
  const tmpPath = tmpName(absRegisterPath);
  fs.writeFileSync(tmpPath, canonical, 'utf8');

  // T-952 (D-Rd11-8): test-only crash hook gated through isTestMode() —
  // D-Rd10-14 opt-in policy refuses to honor ESF_TEST_FAIL_AFTER_TMP in
  // production-mode invocations (NODE_ENV=test or ESF_TEST_MODE=1 required).
  if (isTestMode() && process.env.ESF_TEST_FAIL_AFTER_TMP === '1') {
    // Best-effort cleanup of orphan tmp before raising (target file
    // unchanged because rename never happens).
    try { fs.unlinkSync(tmpPath); } catch (_e) { /* ignore */ }
    throw new Error('writeStateAndFingerprint: ESF_TEST_FAIL_AFTER_TMP injected fault');
  }

  fs.renameSync(tmpPath, absRegisterPath);

  // HARD CHECK (DD-10 fingerprint mandate): SHA-256 of canonical bytes.
  const fp = _crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  const fingerprintPath = absRegisterPath + '.fingerprint';
  // T-952 (D-Rd11-8): fingerprint-tmp filename routes through tmpName() —
  // same uniqueness-suffix discipline as state-tmp above.
  const tmpFp = tmpName(fingerprintPath);
  fs.writeFileSync(tmpFp, fp + '\n', 'utf8');
  fs.renameSync(tmpFp, fingerprintPath);

  return { canonicalBytes: canonical, fingerprint: fp };
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
// maybeOverrideOrderedSteps — T-1007 (Sprint 10 round-12 D-Rd12-10 reconcile).
// ----------------------------------------------------------------------------
// Legacy step-advance ordered_steps were hardcoded inside each init<Skill>
// function and did NOT consult ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR (only the
// new-schema next-step / cursor-init paths honored the override via
// resolveSkillMdPath at tools.cjs:2719). This helper closes the gap: when
// ESF_TEST_MODE=1 AND ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR is set AND a
// fixture file at <override-dir>/skill-<skill>-fixture.md exists, parse the
// fixture's heading sequence via lib/cursor-schema parseSkillStepsFromMarkdown
// (lib/cursor-schema.cjs:204) and return the slugified ordered_steps. Else
// return the defaults verbatim (regression-safe). Parse failures fall back to
// defaults with stderr log (Fail-Soft).
//
// Substrate citations (substrate-verified per M-6 rule):
//   - resolveSkillMdPath fixture-path shape: tools.cjs:2722 (skill-${skill}-fixture.md)
//   - parseSkillStepsFromMarkdown signature: lib/cursor-schema.cjs:204 returns {steps:[{n,title,line}]}
//   - ESF_TEST_MODE opt-in test policy: D-Rd10-14 (gate per test-mode discipline)
// ============================================================================
function maybeOverrideOrderedSteps(skill, defaultOrderedSteps) {
  if (process.env.ESF_TEST_MODE !== '1') return defaultOrderedSteps;
  if (!process.env.ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR) return defaultOrderedSteps;
  const { absolutePath, isOverride } = resolveSkillMdPath(skill);
  if (!isOverride) return defaultOrderedSteps; // override dir set but no fixture for this skill
  try {
    // Use parseSkillStepsFromMarkdown (raw-markdown entry point) at
    // lib/cursor-schema.cjs:204 — parseSkillSteps takes (skill, pluginRoot)
    // and would re-resolve against the live plugin path, ignoring our
    // override absolutePath. Raw-markdown entry point preserves override.
    const schemaLib = _loadCursorSchemaLib();
    const body = fs.readFileSync(absolutePath, 'utf8');
    const parsed = schemaLib.parseSkillStepsFromMarkdown(body);
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return defaultOrderedSteps;
    }
    // Slugify each title to match the legacy ordered_steps shape (lowercase
    // hyphenated tokens like 'decide', 'build-wave-order', 'only-step').
    // Rule: take title chars up to first whitespace or '(' (parenthetical
    // suffix common in live SKILL.md, e.g. "Decide (master, in main context)"),
    // lowercase the result. Authors of override fixtures should write step
    // headings whose first token IS the slug (e.g. "## 1. only-step").
    return parsed.steps.map((s) => {
      const raw = String(s.title || '').trim();
      const firstToken = raw.split(/[\s(]/, 1)[0];
      return firstToken.toLowerCase();
    });
  } catch (e) {
    process.stderr.write(
      `maybeOverrideOrderedSteps: override fixture parse failed for skill '${skill}': ${e.message}; falling back to in-code ordered_steps\n`,
    );
    return defaultOrderedSteps;
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
    // T-1007: maybeOverrideOrderedSteps honors ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR
    // when ESF_TEST_MODE=1. Context's per-mode shape: one helper call returning
    // a single parsed steps list which (if override took effect) replaces all 3
    // mode arrays uniformly; else each mode keeps its in-code default verbatim.
    ordered_steps_by_mode: (function () {
      const initDefault = [
        'check-no-state-exists',
        'init-state-from-defaults',
        'surface-recommended-next',
      ];
      const statusDefault = ['read-state', 'render-status-block', 'delegate-to-next'];
      const nextDefault = ['read-state', 'lookup-next-command', 'emit-cue-no-auto-execute'];
      // Single override probe: if fixture is set + present, the same parsed
      // list applies to all 3 modes (override is whole-skill, not per-mode).
      const overridden = maybeOverrideOrderedSteps('context', null);
      if (overridden && Array.isArray(overridden) && overridden !== null) {
        // overridden === null sentinel can't happen (helper returns array on
        // success; we pass null defaults to detect override-effective). But
        // the helper short-circuits to defaults on no-override → returns null.
        return { init: overridden, status: overridden, next: overridden };
      }
      return { init: initDefault, status: statusDefault, next: nextDefault };
    })(),
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
    ordered_steps: maybeOverrideOrderedSteps('architect', [
      'decide',
      'delegate',
      'synthesize',
      'align',
      'pack',
      'finalize',
      'write-round-close',
    ]),
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
    ordered_steps: maybeOverrideOrderedSteps('build', [
      'read-manifest',
      'build-wave-order',
      'per-wave-dispatch',
      'per-task-return-and-verify',
      'out-of-contract-write-check',
      'drift-pause-or-continue',
      'assemble-sprint-report',
      'finalize',
    ]),
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
    ordered_steps: maybeOverrideOrderedSteps('review', [
      'read-inputs-and-ledgers',
      'extract-spec-claims',
      'audit-adversarial-lenses',
      'validate-findings-against-disk',
      'compute-deterministic-gate',
      'finalize',
    ]),
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
        requires: '.pipeline/verify/VERIFICATION-REPORT.md exists with confirmed_gaps == 0' },
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
    ordered_steps: maybeOverrideOrderedSteps('verify', [
      'extract-spec-decisions',
      'per-item-verification-dispatch',
      'aggregate-verdicts',
      'compute-confirmed-gaps',
      'set-completion-status',
      'finalize',
    ]),
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
    ordered_steps: maybeOverrideOrderedSteps('research', [
      'read-spec',
      'identify-open-questions',
      'formulate-perspective-briefs',
      'dispatch-perspective-agents',
      'synthesize-findings',
      'convert-to-acceptance-criteria',
      'reread-spec-and-req',
      'finalize',
    ]),
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
// Op: init triage (S9.5 — per init-spec.md §1.3)
// ----------------------------------------------------------------------------
// Triage is sprint-spanning (sprint_number: null) and has the most exits of
// any skill (5 destinations: eliciting, research, architecture,
// requirements-ready, verifying — the sorting hat). Predicates are
// disposition-shape (TRIAGE-REPORT.md frontmatter `routed_to:` scalar) —
// handled by the new `evalDispositionPredicate` helper added below to
// `evaluatePredicate` per cli-spec §5 2026-05-08 Addendum. Sub-agent dispatch
// is OPTIONAL (judgment-driven; required:false per agent-spec §1.2 +
// skill-substance/triage.md "Sub-agent dispatches"); when dispatched, all
// classes the master picks are required to return (synthetic record on crash).
// ============================================================================
async function initTriage(projectRoot) {
  return {
    skill: 'triage',
    phase_from: ['triaging'],
    phase_to: ['eliciting', 'research', 'requirements-ready', 'architecture', 'verifying'],
    transitions: [
      { name: 'triaging-to-eliciting', from: 'triaging', to: 'eliciting',
        auto_advance: false,
        requires: 'triage routed item back for design intent addendum' },
      { name: 'triaging-to-research', from: 'triaging', to: 'research',
        auto_advance: false,
        requires: 'triage routed item back for further analysis' },
      { name: 'triaging-to-requirements-ready', from: 'triaging', to: 'requirements-ready',
        auto_advance: true,
        requires: 'all triage dispositions resolved; no upstream routes' },
      { name: 'triaging-to-architecture', from: 'triaging', to: 'architecture',
        auto_advance: false,
        requires: 'triage routed item to architecture' },
      { name: 'triaging-to-verifying', from: 'triaging', to: 'verifying',
        auto_advance: false,
        requires: 'post-build triage routed all items to spec-compliance audit' },
    ],
    canonical_paths: {
      triage_report_md: '.pipeline/triage/TRIAGE-REPORT.md',
    },
    ordered_steps: maybeOverrideOrderedSteps('triage', [
      'identify-entry-point',
      'read-spec-and-upstream',
      'extract-items',
      'categorize-items',
      'apply-deterministic-signal-precedence',
      'reread-verification',
      'compute-routing-decision',
      'finalize',
    ]),
    sprint_number: null,
    required_inputs: [
      '.pipeline/elicitation/SPEC.md',
      '.pipeline/requirements/REQ.md OR .pipeline/review/sprints/<n>/QA-REPORT.md OR .pipeline/verify/VERIFICATION-REPORT.md',
    ],
    principles_cited: [
      'Front-Loaded-Design',
      'Diligent-Conduct',
      'Graceful-Degradation',
      'Fail-Soft',
      'INST-13',
    ],
    sub_agents: [
      {
        name: 'essense-flow-sub-triager',
        cardinality: 'optional, judgment-driven; per-item-class parallel when dispatched',
        brief_template: 'skills/triage/templates/sub-triager-brief.md',
        required: false,
        quorum: 'all-required',
      },
    ],
  };
}

// ============================================================================
// Op: init elicit (S9.6 — per init-spec.md §1.1)
// ----------------------------------------------------------------------------
// Returns canonical paths + ordered_steps for the elicit skill. Pure (no
// writes). `sub_agents` is empty — elicit operates in main context only per
// skill-substance/elicit.md "Sub-agent dispatches" verbatim ("None — elicit
// operates in main context only"). `sprint_number: null` — elicit is whole-
// project (pre-sprint). `required_inputs: []` — caller-provided pitch is text,
// not a file path; existing SPEC.md on resume is a resume affordance, not a
// hard prerequisite (per init-spec.md §1.1 "Source of truth").
// ============================================================================
async function initElicit(_projectRoot) {
  return {
    skill: 'elicit',
    phase_from: ['idle', 'eliciting'],
    phase_to: ['eliciting', 'research', 'architecture'],
    transitions: [
      { name: 'idle-to-eliciting', from: 'idle', to: 'eliciting',
        auto_advance: false, requires: null },
      { name: 'eliciting-to-eliciting', from: 'eliciting', to: 'eliciting',
        auto_advance: false, requires: null },
      { name: 'eliciting-to-research', from: 'eliciting', to: 'research',
        auto_advance: true,
        requires: '.pipeline/elicitation/SPEC.md exists with status: build-ready' },
      { name: 'eliciting-to-architecture', from: 'eliciting', to: 'architecture',
        auto_advance: false,
        requires: '.pipeline/elicitation/SPEC.md exists with status: build-ready AND user routed around research' },
    ],
    canonical_paths: {
      spec_md: '.pipeline/elicitation/SPEC.md',
    },
    ordered_steps: maybeOverrideOrderedSteps('elicit', [
      'read-pitch-or-resume',
      'transition-or-resume',
      'elicitation-loop',
      'build-ready-reread',
      'set-build-ready-status',
      'assess-complexity',
      'finalize',
    ]),
    sprint_number: null,
    required_inputs: [],
    principles_cited: [
      'Front-Loaded-Design',
      'Diligent-Conduct',
      'Graceful-Degradation',
      'Fail-Soft',
      'INST-13',
    ],
    sub_agents: [],
  };
}

async function initHeal(projectRoot) {
  // Per init-spec §1.8 verbatim. Heal returns descriptive strings (not enumerated
  // arrays) for phase_from / phase_to / transitions because heal walks the full
  // graph one step at a time per substance "State transitions" section. D-2 closed
  // at S6.5 (Recommended): heal's init returns descriptive strings; consumers (heal
  // skill) interpret. Init does not pre-judge.
  let sprintNum = null;
  let degradedFlag = false;
  try {
    const { readState } = await stateLib();
    const s = await readState(projectRoot);
    if (s.degraded) {
      degradedFlag = true;
    } else {
      sprintNum = (typeof s.sprint === 'number') ? s.sprint : null;
    }
  } catch (e) {
    degradedFlag = true;
  }
  return {
    skill: 'heal',
    phase_from: '<any phase, including idle, missing-state, or corrupt-state>',
    phase_to: '<any phase reachable from current via legal transitions, one step at a time>',
    transitions: '<heal walks the existing transition graph in references/transitions.yaml; no heal-specific transitions exist>',
    canonical_paths: {
      heal_log_md: '.pipeline/heal/HEAL-LOG.md',
      proposal_yaml: '.pipeline/heal/proposal.yaml',
      heal_archive_dir: '.pipeline/.heal-archive/',
    },
    ordered_steps: maybeOverrideOrderedSteps('heal', [
      'discover-artifacts',
      'infer-phase-and-confidence',
      'propose-walk-forward',
      'await-user-confirm',
      'apply-walk-forward-step-by-step',
      'handoff',
    ]),
    sprint_number: sprintNum,
    required_inputs: [],
    principles_cited: [
      'Graceful-Degradation',
      'Front-Loaded-Design',
      'Diligent-Conduct',
      'Fail-Soft',
      'INST-13',
    ],
    sub_agents: [
      {
        name: 'essense-flow-sub-recognizer',
        cardinality: 'optional, judgment-driven; per-shape parallel when dispatched (SPEC-shape | REQ-shape | ARCH-shape | sprint-output-shape | foreign-tool-prose-shape)',
        brief_template: 'skills/heal/templates/sub-recognizer-brief.md',
        required: false,
        quorum: 'tolerant',
      },
    ],
    degraded: degradedFlag,
  };
}

// ============================================================================
// HEAL-LOG.md atomic-append helper (per cli-spec §5 2026-05-08 Addendum
// state-force-set-phase / cursor-rewind audit-trail discipline). Reads
// existing HEAL-LOG.md (creating with canonical frontmatter shape if absent),
// merges the new entry into the appropriate frontmatter array, writes back.
// HEAL-LOG.md write happens BEFORE the state.yaml mutation in force-set
// (audit-trail-before-state-mutation discipline).
// ============================================================================
async function appendHealLog(projectRoot, arrayKey, entry) {
  // T-972 (D-Rd12-3 (i)): split into two phases —
  //   Phase 1: frontmatter read-modify-write via withLock + tmpName+rename
  //     (YAML structured data cannot be append-extended; must rewrite the
  //     frontmatter block while preserving the existing body).
  //   Phase 2: body append via appendAuditLine (O_APPEND single-line atomic
  //     write per CMC-Rd11-1 + T-971 substrate). Body line is guaranteed
  //     single-line by formatHealLogBodyLine — verified at edit time.
  // The whole-file rewrite pre-T-972 could interleave with concurrent
  // _appendStaleSweepLogLine / _appendApplyDispositionLogLine writers
  // (both use appendAuditLine per T-961), corrupting the audit trail.
  // Wrapping the rewrite in withLock + tmp+rename closes that gap.

  // arrayKey validation BEFORE entering the lock so an invalid call never
  // takes the wx-sentinel mutex.
  if (arrayKey !== 'force_actions' && arrayKey !== 'cursor_rewinds') {
    throw new Error(`appendHealLog: unknown arrayKey '${arrayKey}'`);
  }

  const healDir = path.join(projectRoot, '.pipeline', 'heal');
  const logPath = path.join(healDir, 'HEAL-LOG.md');
  if (!fs.existsSync(healDir)) {
    fs.mkdirSync(healDir, { recursive: true });
  }
  const yamlMod = await yaml();
  const now = new Date().toISOString();

  // Pre-compute the body append line — single-line guaranteed by
  // formatHealLogBodyLine (no embedded \n; see helper body). Computed
  // outside the lock because it is pure and lock-hold time should be
  // minimised per D-Rd12-3 60s cap discipline.
  const bodyAppend = formatHealLogBodyLine(arrayKey, entry, now);

  // Phase 1 — frontmatter read-modify-write inside withLock.
  // The lock serialises concurrent appendHealLog callers at the
  // frontmatter rewrite boundary; tmp+rename gives atomicity within
  // the lock so a crash mid-write leaves the prior file intact.
  await withLock(logPath, async () => {
    // Default frontmatter shape — extends substance "What you produce"
    // shape with force_actions[] + cursor_rewinds[] arrays per cli-spec §5
    // 2026-05-08 Addendum.
    let frontmatter = {
      schema_version: 1,
      last_invocation: now,
      inferred_phase: null,
      confidence: null,
      artifacts_recognized: [],
      artifacts_unrecognized: [],
      force_actions: [],
      cursor_rewinds: [],
    };
    let body = '';

    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, 'utf8');
      const parsed = parseLogFrontmatter(raw);
      if (parsed.frontmatter) {
        // Merge — preserve existing fields, ensure arrays present.
        frontmatter = {
          ...frontmatter,
          ...parsed.frontmatter,
          last_invocation: now,
        };
        if (!Array.isArray(frontmatter.force_actions)) frontmatter.force_actions = [];
        if (!Array.isArray(frontmatter.cursor_rewinds)) frontmatter.cursor_rewinds = [];
        if (!Array.isArray(frontmatter.artifacts_recognized)) frontmatter.artifacts_recognized = [];
        if (!Array.isArray(frontmatter.artifacts_unrecognized)) frontmatter.artifacts_unrecognized = [];
      }
      body = parsed.body;
    }

    // Append entry to the named array (arrayKey pre-validated above).
    frontmatter[arrayKey].push(entry);

    // Rewrite frontmatter portion ONLY; preserve the existing body verbatim
    // (Phase 2 appends the new body line via appendAuditLine after release).
    // The preservedBody is trimmed of trailing whitespace and given exactly
    // one trailing newline so the appendAuditLine append lands on its own
    // line — matches the prior nextBody shape modulo where the new body
    // line gets written.
    const yamlText = yamlMod.dump(frontmatter, { lineWidth: 100, noRefs: true });
    const preservedBody = body.trimEnd();
    const out = `---\n${yamlText}---\n\n${preservedBody}${preservedBody ? '\n' : ''}`;

    // tmp+rename for atomicity within the lock (T-961 + T-972). The lock
    // already serialises against other appendHealLog callers, but the
    // sibling appendAuditLine writers (Phase 2 below + the
    // _appendStaleSweepLogLine + _appendApplyDispositionLogLine writers
    // elsewhere in tools.cjs) operate via O_APPEND on the SAME logPath.
    // tmp+rename means our frontmatter rewrite is an atomic file
    // replacement — never a partial write a concurrent reader could see.
    const tmpPath = tmpName(logPath);
    fs.writeFileSync(tmpPath, out, 'utf8');
    fs.renameSync(tmpPath, logPath);

    // Phase 2 — body append, INSIDE the same lock. O_APPEND is atomic
    // against other appends, but NOT against this function's own
    // tmp+rename in a concurrent caller: a writer that read its snapshot
    // before our append and renamed after it would silently drop our
    // line (observed: 16-way concurrency landing 15 body lines). Holding
    // the lock for the one-line append closes the lost-update window;
    // hold time stays trivially short.
    appendAuditLine(logPath, bodyAppend);
  });

  return logPath;
}

function parseLogFrontmatter(raw) {
  // Tolerant of UTF-8 BOM + CRLF (mirrors extractFrontmatter helper at S9.2)
  const stripped = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const match = stripped.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: stripped };
  }
  try {
    // Lazy require to avoid cycles; yaml() helper already initialised above
    const yamlMod = require('js-yaml');
    const fm = yamlMod.load(match[1]);
    if (fm && typeof fm === 'object') {
      return { frontmatter: fm, body: match[2] || '' };
    }
  } catch (e) {
    // Frontmatter parse failed — preserve body, treat as no frontmatter
  }
  return { frontmatter: null, body: stripped };
}

function formatHealLogBodyLine(arrayKey, entry, now) {
  if (arrayKey === 'force_actions') {
    return `- **${now}** — \`state-force-set-phase\`: ${entry.prior_phase || '<missing>'} → ${entry.new_phase} — reason: ${entry.reason}`;
  }
  if (arrayKey === 'cursor_rewinds') {
    if (entry.no_op) {
      return `- **${now}** — \`cursor-rewind\`: no-op (cursor.yaml absent)`;
    }
    return `- **${now}** — \`cursor-rewind\`: cleared cursor (skill=${entry.prior_cursor_skill || 'null'}, step=${entry.prior_cursor_step || 'null'})`;
  }
  return `- **${now}** — heal action: ${arrayKey}`;
}

// ============================================================================
// state-force-set-phase — heal-only illegal-phase recovery op per cli-spec §5
// 2026-05-08 Addendum §1.6. Bypasses legal-transition assertion; preserves
// canonical-phase-list validation on --value (drift symptom #2 closed at the
// recovery boundary too). Recovery-only guard: refuses if current phase is
// canonical AND state non-degraded (caller must use state-set-phase for normal
// flow). Atomic-append to HEAL-LOG.md FIRST (audit-trail discipline), then
// state.yaml write via writeState({force: true}).
// ============================================================================
async function stateForceSetPhase({ rawValue, reason, projectRoot, allowCanonicalRecovery }) {
  const opName = 'state-force-set-phase';

  if (rawValue === undefined || rawValue === null) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --value required`);
  }
  if (reason === undefined || reason === null) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --reason required`);
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: --reason rejected — empty or whitespace-only`,
    );
  }

  const phases = await canonicalPhases();
  if (!phases.includes(rawValue)) {
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: --value rejected — '${rawValue}' not in canonical phases [${phases.join(', ')}]`,
    );
  }

  validateProjectRoot(projectRoot, opName);

  const { readState, writeState } = await stateLib();
  const current = await readState(projectRoot);

  // D-Rd12-1 (closed 2026-05-14): readState now returns
  // {degraded: 'corrupt', shape_error, ...} marker instead of throwing
  // ShapeValidationError on post-parse shape-validation failure. Explicit
  // branch BEFORE the canonical-recovery guard so the diagnostic names the
  // shape violation (field/observed/expected) at the recovery entry point.
  // priorPhase computation below tolerates corrupt because current.phase may
  // be absent — (current.phase ?? null) handles the missing-key case.
  if (current.degraded === 'corrupt') {
    const se = current.shape_error || {};
    const detailStr = se.details ? ` (${JSON.stringify(se.details)})` : '';
    process.stderr.write(
      `essense-flow-tools ${opName}: state.yaml shape corrupt — ${se.message || 'shape validation failed'}${detailStr}; proceeding with force-recovery\n`,
    );
  }

  // Recovery-only guard (validation step 4): refuse force-set when current
  // phase is canonical AND state non-degraded. Force is for recovery, not for
  // bypass of legal transitions. Closed decision 2026-05-08 sub-decision 3.
  // Note: readState returns degraded='corrupt' when shape validation fails
  // (per D-Rd12-1 marker-return), and degraded='missing' when state.yaml
  // absent. Guard fires only on the (!degraded && canonical) case.
  //
  // S10.5 2026-05-09 Addendum: --allow-canonical-recovery flag bypasses the
  // guard for adversarial-stress-test scenarios (e.g. S10.5 brief Task §11
  // late-stage user-injected requirement post-terminal). Default behavior
  // unchanged (refuse-if-canonical); flag is opt-in only. Bypass recorded
  // in HEAL-LOG.md atomic-append entry as allow_canonical_recovery: true.

  // M-5 round budget per D-Sprint10-4 (closure-plan Sprint 10): the
  // architect-phase loop is capped at 2 rounds per sprint. Round 1 = initial
  // dispatch; round 2 = single amend. Round 3+ requires
  // architecture.escalation_signoff (user-verdict quote) — without it, the
  // op refuses with EXIT_ALIGNMENT_DRIFT (19). Predicate fires ONLY when the
  // target phase is architecture or decomposing (the two architect-family
  // loop phases per references/transitions.yaml). Other phase transitions
  // are unaffected. The current architecture.round is read from state; the
  // prospective round is current+1. Sprint 9 hit round 12 because no
  // hardstop existed — this is the structural forcing function for
  // escalation. Empirical basis: redesign/META-GAP-ROUND-LOOP.md M-5.
  // Predicate runs BEFORE the canonicalRecoveryFiring guard so the round-
  // budget diagnostic surfaces before any canonical-phase refusal — the
  // user-fix path (populate escalation_signoff) is the actionable signal
  // for the round-3+ case regardless of canonical-vs-degraded state.
  if (rawValue === 'architecture' || rawValue === 'decomposing') {
    const archBlock = (current && typeof current.architecture === 'object' && current.architecture !== null)
      ? current.architecture
      : {};
    const currentRound = Number.isInteger(archBlock.round) ? archBlock.round : 0;
    const prospectiveRound = currentRound + 1;
    if (prospectiveRound >= 3) {
      const escalation = archBlock.escalation_signoff;
      const escalationEmpty =
        escalation === null ||
        escalation === undefined ||
        (typeof escalation === 'string' && escalation.trim() === '');
      if (escalationEmpty) {
        return emitFailure(
          EXIT_ALIGNMENT_DRIFT,
          `essense-flow-tools ${opName}: round budget = 2 per D-Sprint10-4 (M-5); ` +
          `prospective round ${prospectiveRound} on architecture block requires ` +
          `architecture.escalation_signoff field present + non-empty string; ` +
          `current value is ${JSON.stringify(escalation)}; ` +
          `populate state.yaml architecture.escalation_signoff (user verdict quote) before retrying`,
        );
      }
    }
  }

  const canonicalRecoveryFiring =
    !current.degraded &&
    phases.includes(current.phase) &&
    allowCanonicalRecovery === true;
  if (!current.degraded && phases.includes(current.phase) && !allowCanonicalRecovery) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: current phase '${current.phase}' is canonical; force-set is for illegal-phase recovery only; use state-set-phase for normal transitions`,
    );
  }

  const priorPhase = current.degraded === 'missing'
    ? null
    : (current.phase ?? null);

  // STEP 1 — append to HEAL-LOG.md FIRST (audit-trail-before-state-mutation
  // discipline per cli-spec §5 2026-05-08 Addendum §1.6 Effect step 4).
  const nowIso = new Date().toISOString();
  let healLogPath;
  try {
    const entry = {
      at: nowIso,
      prior_phase: priorPhase,
      new_phase: rawValue,
      reason: reason.trim(),
    };
    if (canonicalRecoveryFiring) {
      entry.allow_canonical_recovery = true;
    }
    healLogPath = await appendHealLog(projectRoot, 'force_actions', entry);
  } catch (e) {
    return emitFailure(
      EXIT_GENERIC,
      `essense-flow-tools ${opName}: HEAL-LOG.md write failed (${e.message})`,
    );
  }

  // STEP 2 — write state.yaml. Two cases:
  //   (a) state.yaml missing: build fresh state from defaults + new phase.
  //   (b) state.yaml exists (canonical or degraded-corrupt): preserve fields,
  //       overwrite phase. writeState's {force: true} bypasses both
  //       degraded-block and legal-transition assertion.
  let baseState;
  if (current.degraded === 'missing') {
    // Fresh-create from defaults
    const defaultsPath = path.join(PLUGIN_ROOT, 'defaults', 'state.yaml');
    let defaults;
    try {
      const yamlMod = await yaml();
      defaults = yamlMod.load(fs.readFileSync(defaultsPath, 'utf8'));
    } catch (e) {
      return emitFailure(
        EXIT_GENERIC,
        `essense-flow-tools ${opName}: defaults/state.yaml unreadable (${e.message}); HEAL-LOG.md entry written but state.yaml not created`,
      );
    }
    baseState = { ...defaults, phase: rawValue };
  } else {
    // current.degraded is 'corrupt' or null. Strip the read-helper fields.
    const { degraded, path: _statePath, reason: _reason, ...stateCore } = current;
    baseState = { ...stateCore, phase: rawValue };
  }

  // state-force-set-phase is a heal-only repair op — bypass both degraded-
  // block AND legal-transition assertion. Per S10.5 2026-05-09 lib/state.js
  // amendment, the bypassLegalTransition flag explicitly opts in to the
  // "force everything" semantic (closes impl-vs-spec gap noted at this site:
  // earlier inline comment claimed force=true bypassed both checks; in fact
  // it only bypassed the degraded-block).
  const writeResult = await writeState(projectRoot, baseState, { force: true, bypassLegalTransition: true });
  if (!writeResult.ok) {
    return emitFailure(
      EXIT_GENERIC,
      `essense-flow-tools ${opName}: state.yaml write failed (${writeResult.reason}); HEAL-LOG.md entry stands as orphan audit signal`,
    );
  }

  const after = await readState(projectRoot);
  return emitSuccess({
    ok: true,
    op: 'state-force-set-phase',
    prior_phase: priorPhase,
    new_phase: rawValue,
    heal_log_path: path.relative(projectRoot, healLogPath).replace(/\\/g, '/'),
    last_updated: after.last_updated || null,
  });
}

// ============================================================================
// cursor-rewind — heal-only stuck-cursor repair op per cli-spec §5 2026-05-08
// Addendum §1.7. Deletes .pipeline/cursor.yaml if present (idempotent: no-op
// when absent). Atomic-append to HEAL-LOG.md cursor_rewinds[] for audit.
// ============================================================================
async function cursorRewind({ projectRoot }) {
  const opName = 'cursor-rewind';
  validateProjectRoot(projectRoot, opName);
  const cursorPath = path.join(projectRoot, CURSOR_REL);

  let priorSkill = null;
  let priorStep = null;
  let cursorWasPresent = false;

  if (fs.existsSync(cursorPath)) {
    cursorWasPresent = true;
    try {
      const raw = fs.readFileSync(cursorPath, 'utf8');
      const yamlMod = await yaml();
      const parsed = yamlMod.load(raw);
      if (parsed && typeof parsed === 'object') {
        priorSkill = parsed.skill || null;
        priorStep = parsed.current_step || null;
      }
    } catch (e) {
      return emitFailure(
        EXIT_DEGRADED,
        `essense-flow-tools ${opName}: cursor.yaml present but unreadable (${e.message}); not deleted; surface to user`,
      );
    }
    try {
      fs.unlinkSync(cursorPath);
    } catch (e) {
      return emitFailure(
        EXIT_GENERIC,
        `essense-flow-tools ${opName}: cursor.yaml present but delete failed (${e.message})`,
      );
    }
  }

  // Always log — even no-op case carries value as audit trail
  const nowIso = new Date().toISOString();
  let healLogPath;
  try {
    healLogPath = await appendHealLog(projectRoot, 'cursor_rewinds', {
      at: nowIso,
      prior_cursor_skill: priorSkill,
      prior_cursor_step: priorStep,
      no_op: !cursorWasPresent,
    });
  } catch (e) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: cursor ${cursorWasPresent ? 'deleted' : 'absent'} but HEAL-LOG.md write failed (${e.message}); audit-trail incomplete`,
    );
  }

  return emitSuccess({
    ok: true,
    op: 'cursor-rewind',
    cursor_was_present: cursorWasPresent,
    prior_cursor_skill: priorSkill,
    prior_cursor_step: priorStep,
    heal_log_path: path.relative(projectRoot, healLogPath).replace(/\\/g, '/'),
  });
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
  let current = await readState(projectRoot);
  if (current.degraded) {
    // artifacts-first recovery: a missing cache rebuilds from disk when
    // inference is unambiguous; corrupt/ambiguous fails with the inference
    const rec = await reconcileDegradedState(projectRoot, opName, current.degraded);
    if (!rec.ok) return emitFailure(rec.code, rec.message);
    current = rec.state;
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
  let current = await readState(projectRoot);
  if (current.degraded) {
    // artifacts-first recovery: a missing cache rebuilds from disk when
    // inference is unambiguous; corrupt/ambiguous fails with the inference
    const rec = await reconcileDegradedState(projectRoot, opName, current.degraded);
    if (!rec.ok) return emitFailure(rec.code, rec.message);
    current = rec.state;
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
      // Hotfix v0.13.1 (per 2026-05-16 closure-reopening decision): when
      // the predicate template references `<n>` but state.sprint is absent
      // or non-number, the prior path-missing diagnostic pointed at the
      // literal `<n>` path and misdirected the caller toward "file is
      // missing." Surface sprint resolution as the named root cause and
      // tell the caller how to recover (--sprint arg or state-set-sprint
      // op, depending on target-phase acceptance).
      if (predResult.kind === 'sprint-template-unresolved') {
        const observedSprint =
          current.sprint === undefined
            ? 'undefined'
            : current.sprint === null
              ? 'null'
              : `${JSON.stringify(current.sprint)} (type ${typeof current.sprint})`;
        const sprintTargets = ['sprinting', 'sprint-complete'];
        const recovery = sprintTargets.includes(rawValue)
          ? `pass --sprint <int> to this op`
          : `set state.sprint via state-set-sprint --value <int> first (target phase '${rawValue}' does not accept --sprint per cli-spec; predicate auto-resolves from state.sprint)`;
        return emitFailure(
          EXIT_PREREQ_MISSING,
          `essense-flow-tools ${opName}: transition ${current.phase}→${rawValue} predicate template '${predResult.template}' contains '<n>' but state.sprint is ${observedSprint}; expected positive integer. Sprint resolution failed BEFORE path existence check; the literal-<n> path '${predResult.path}' was NOT checked on disk. To recover: ${recovery}.`,
        );
      }
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

// T-953 (round-11 R2-SD1 + R2-SD9 cluster A, D-Rd11-6) — dispatch-sufficiency
// phrase table for the alignment-counter predicate side. Each entry maps a
// transitions.yaml predicate substring (after case-folding + whitespace
// collapsing) to the cursorState key under
// `alignment_lens_dispatches_per_round.<sourceKey>.{observed,threshold}`.
//
// Ordering discipline (longest-prefix first): the 'with sufficient alignment
// lens dispatch' phrase MUST be tested before 'with sufficient lens dispatch'
// — otherwise the shorter 'lens dispatch' phrase would shadow the longer
// 'alignment lens dispatch' phrase via substring containment. The list order
// IS the matching order; do not reorder without re-deriving the longest-
// prefix invariant.
//
// Closed contract: 4 phrases total (alignment_lens, lens, verifier,
// sub_architect). 4th recognizer added by T-1020 (Sprint 10 W6) per the
// closed-decision pair D-Sprint10-5 + DD-2 — extends Skip-IFF
// rule-allowed-skip coverage to the architect sub-dispatch domain. Future
// predicate authors who want to add a 5th phrase MUST surface a paired
// closed decision per cli-spec §5 addendum discipline (mirrors the
// triage/verify phrase-table pattern at TRIAGE_DISPOSITION_PHRASES /
// VERIFY_DIVERGENCE_PHRASES — see precedents below).
//
// Ordering note for the 4th entry: 'with sufficient sub-architect dispatch'
// has no substring conflict with the prior three (sub-architect token is
// disjoint from alignment-lens / lens / verifier), so append-at-end is
// safe for longest-prefix discipline. Placing it last also preserves the
// pre-T-1020 indices for the prior three so legacy tests asserting on
// DISPATCH_PHRASES[0..2] remain valid; new sub_architect lives at index 3.
const DISPATCH_PHRASES = [
  { phrase: 'with sufficient alignment lens dispatch', sourceKey: 'alignment_lens' },
  { phrase: 'with sufficient lens dispatch',           sourceKey: 'lens' },
  { phrase: 'with sufficient verifier dispatch',       sourceKey: 'verifier' },
  { phrase: 'with sufficient sub-architect dispatch',  sourceKey: 'sub_architect' },
];

// T-953 (round-11 D-Rd11-6) — pure-function predicate recognizer.
//
// Returns a discriminated-shape verdict object that callers map to their
// own predicate-result protocol. Shape is closed:
//   { matched: boolean, sufficient: boolean, sourceKey: string|null,
//     observed: number|null, threshold: number|null }
//
// Matching is case-folded + whitespace-collapsed substring. The first
// phrase in DISPATCH_PHRASES that appears in the normalized predicate text
// wins (longest-prefix order — see DISPATCH_PHRASES note above).
//
// Sufficiency is fail-closed (DD-21): if EITHER observed or threshold is
// missing/null on cursorState, sufficient = false. Only when both are
// numbers AND observed >= threshold does sufficient = true. This closes
// the AC-5 fail-closed gate — missing frontmatter MUST NOT silently pass.
//
// cursorState contract: an opaque object with optional path
// `alignment_lens_dispatches_per_round[sourceKey].{observed,threshold}`.
// Caller (evaluatePredicate or future direct invokers) is responsible for
// loading cursorState; this function does no I/O.
//
// T-1020 (Sprint 10 W6) — Skip-IFF rule-allowed-skip bypass per D-Sprint10-5
// + DD-2. Third arg `ruleAllowedSkip` (optional, default null) carries the
// rule-allowed-skip block honored when observed < threshold:
//   ruleAllowedSkip = {
//     skill: 'architect' | 'review' | 'verify',
//     rule_quote: <verbatim Skip-IFF substance from skill-substance/<skill>.md>,
//     citation_source: <closed decision id or session timestamp>,
//   }
// OR null/undefined for the default no-skip path. When the predicate matches
// but observed < threshold, a well-formed ruleAllowedSkip (skill non-empty
// AND rule_quote non-empty AND citation_source non-empty) flips sufficient
// to true and surfaces { rule_allowed_skip_honored: true, rule_quote } in
// the result. A malformed ruleAllowedSkip (any required field empty/missing
// /wrong type) is rejected — fails closed with rule_allowed_skip_honored:
// false. Backward compatibility: omitted/null/undefined ruleAllowedSkip
// preserves the pre-T-1020 return shape semantics (sufficient tracks
// observed >= threshold only); rule_allowed_skip_honored: false surfaces
// in the result for caller diagnostics but does not alter sufficient.
//
// Closed contract on result shape (T-1020 extension):
//   { matched, sufficient, sourceKey, observed, threshold,
//     rule_allowed_skip_honored, rule_quote }
// where rule_quote is null unless rule_allowed_skip_honored === true.
function evalDispatchPredicate(predicateText, cursorState, ruleAllowedSkip = null) {
  if (typeof predicateText !== 'string') {
    return {
      matched: false,
      sufficient: false,
      sourceKey: null,
      observed: null,
      threshold: null,
      rule_allowed_skip_honored: false,
      rule_quote: null,
    };
  }
  // Normalize: lowercase + collapse all whitespace runs to single space + trim.
  // Mirrors transitions.yaml predicate phrase whitespace tolerance used by
  // TRIAGE_DISPOSITION_PHRASES / VERIFY_DIVERGENCE_PHRASES (exact-string
  // tables) but extended here to substring containment for the dispatch
  // family per D-Rd11-6 (alignment phrases are embedded in longer
  // transitions.yaml `requires:` strings, not standalone).
  const norm = predicateText.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const { phrase, sourceKey } of DISPATCH_PHRASES) {
    if (norm.includes(phrase)) {
      const bucket =
        cursorState
        && typeof cursorState === 'object'
        && cursorState.alignment_lens_dispatches_per_round
        && typeof cursorState.alignment_lens_dispatches_per_round === 'object'
          ? cursorState.alignment_lens_dispatches_per_round[sourceKey]
          : null;
      const observed = (bucket && typeof bucket === 'object' && bucket.observed != null)
        ? bucket.observed
        : null;
      const threshold = (bucket && typeof bucket === 'object' && bucket.threshold != null)
        ? bucket.threshold
        : null;
      const thresholdMet = (
        typeof observed === 'number'
        && typeof threshold === 'number'
        && observed >= threshold
      );
      if (thresholdMet) {
        // Threshold met via normal path — rule-allowed-skip is moot here;
        // do not consult ruleAllowedSkip. rule_allowed_skip_honored stays
        // false because the rule was not used.
        return {
          matched: true,
          sufficient: true,
          sourceKey,
          observed,
          threshold,
          rule_allowed_skip_honored: false,
          rule_quote: null,
        };
      }
      // Threshold not met (or missing frontmatter). Check rule-allowed-skip
      // bypass per T-1020 / D-Sprint10-5 / DD-2. A well-formed
      // ruleAllowedSkip requires non-empty string fields for skill,
      // rule_quote, citation_source. Malformed / empty / wrong-type
      // rejects — fails closed per DD-21.
      const wellFormed = (
        ruleAllowedSkip != null
        && typeof ruleAllowedSkip === 'object'
        && typeof ruleAllowedSkip.skill === 'string'
        && ruleAllowedSkip.skill.length > 0
        && typeof ruleAllowedSkip.rule_quote === 'string'
        && ruleAllowedSkip.rule_quote.length > 0
        && typeof ruleAllowedSkip.citation_source === 'string'
        && ruleAllowedSkip.citation_source.length > 0
      );
      if (wellFormed) {
        return {
          matched: true,
          sufficient: true,
          sourceKey,
          observed,
          threshold,
          rule_allowed_skip_honored: true,
          rule_quote: ruleAllowedSkip.rule_quote,
        };
      }
      return {
        matched: true,
        sufficient: false,
        sourceKey,
        observed,
        threshold,
        rule_allowed_skip_honored: false,
        rule_quote: null,
      };
    }
  }
  return {
    matched: false,
    sufficient: false,
    sourceKey: null,
    observed: null,
    threshold: null,
    rule_allowed_skip_honored: false,
    rule_quote: null,
  };
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
//
// T-953 (round-11 D-Rd11-6): accepts an optional 4th arg `cursorState` for
// the dispatch-sufficiency predicate family. When supplied, evalDispatchPredicate
// is consulted FIRST (before path / phrase-table branches) so that a matched
// dispatch phrase resolves to { ok: result.sufficient } without falling
// through to the path-exists or disposition-soft-pass branches below.
// Existing callers that omit cursorState retain prior semantics — when
// cursorState is null/undefined, the dispatch arm is still attempted but
// matched-dispatch with missing frontmatter fail-closes per AC-5 / DD-21.
//
// T-1020 (Sprint 10 W6 — D-Sprint10-5 + DD-2): accepts an optional 5th arg
// `ruleAllowedSkip` for the Skip-IFF rule-allowed-skip bypass. When the
// matched dispatch predicate is under-threshold but a well-formed
// ruleAllowedSkip block is supplied (skill + rule_quote + citation_source
// all non-empty strings), the arm flips to ok=true with kind=
// 'dispatch-sufficient-via-rule-allowed-skip' and surfaces rule_quote +
// citation_source for caller-side diagnostics. Existing callers that omit
// ruleAllowedSkip retain the prior fail-closed semantics. Upstream
// surfaces (state-set-phase, write-round-close) load the
// rule_allowed_skip block from cursor.yaml or artifact frontmatter and
// pass it through.
function evaluatePredicate(predicate, projectRoot, sprint, cursorState = null, ruleAllowedSkip = null) {
  // T-953 dispatch-sufficiency arm (D-Rd11-6) — checked FIRST so that a
  // matched dispatch phrase wins over the path-exists branch even if the
  // predicate text contains both ".pipeline/" and " exists" substrings
  // incidentally. Returns the closed predicate-result shape consistent with
  // the existing { ok, kind, observed? } protocol.
  if (typeof predicate === 'string') {
    const dispatchResult = evalDispatchPredicate(predicate, cursorState, ruleAllowedSkip);
    if (dispatchResult.matched) {
      if (dispatchResult.sufficient) {
        if (dispatchResult.rule_allowed_skip_honored === true) {
          // T-1020 — rule-allowed-skip bypass path. Distinct kind so callers
          // can surface the bypass in audit logs / diagnostics (e.g.
          // state-set-phase records the rule_quote on the cursor write).
          return {
            ok: true,
            kind: 'dispatch-sufficient-via-rule-allowed-skip',
            sourceKey: dispatchResult.sourceKey,
            observed: dispatchResult.observed,
            threshold: dispatchResult.threshold,
            rule_quote: dispatchResult.rule_quote,
          };
        }
        return {
          ok: true,
          kind: 'dispatch-sufficient',
          sourceKey: dispatchResult.sourceKey,
          observed: dispatchResult.observed,
          threshold: dispatchResult.threshold,
        };
      }
      // T-1020 — diagnostic names the rule by sourceKey so CI scripts /
      // refusal handlers can map the failure to the per_skill_skip_threshold
      // rule block in references/transitions.yaml. EXIT_ALIGNMENT_DRIFT=19
      // is keyed on this `dispatch-insufficient` kind upstream
      // (state-set-phase, write-round-close) — see EXIT_ALIGNMENT_DRIFT
      // callsites at tools.cjs:1386 + :3321 + :3398 + :4668.
      return {
        ok: false,
        kind: 'dispatch-insufficient',
        sourceKey: dispatchResult.sourceKey,
        observed: `${dispatchResult.sourceKey} dispatch sufficiency not met: observed=${dispatchResult.observed}, threshold=${dispatchResult.threshold} (fail-closed per AC-5 / DD-21; no rule-allowed-skip honored per T-1020 / D-Sprint10-5 / DD-2)`,
      };
    }
  }
  // Path predicate detection: contains ".pipeline/" + " exists"
  const pathRegex = /\.pipeline\/[^\s]+/g;
  const paths = predicate.match(pathRegex);
  if (paths && predicate.includes(' exists')) {
    // Hotfix v0.13.1 (per 2026-05-16 closure-reopening decision in
    // redesign/06-decisions.md): when the predicate path template contains
    // `<n>` but the resolved sprint is null (state.sprint absent or non-
    // number, and --sprint arg not accepted for the target phase), the
    // substitution silently falls through to a literal `<n>` path and
    // fs.existsSync returns false. Pre-hotfix surface emitted "path-missing"
    // pointing at the literal `<n>` path — misdirects the caller toward
    // "file is missing" when the real failure is sprint resolution. Detect
    // this case explicitly and surface a distinct kind so the call site
    // can emit a diagnostic naming sprint resolution as the root cause.
    const containsSprintTemplate = /<n>/.test(paths[0]);
    const subbed = sprint != null ? paths[0].replace(/<n>/g, String(sprint)) : paths[0];
    const fullPath = path.join(projectRoot, subbed);
    if (!fs.existsSync(fullPath)) {
      if (containsSprintTemplate && sprint == null) {
        return {
          ok: false,
          kind: 'sprint-template-unresolved',
          path: subbed,
          template: paths[0],
        };
      }
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
      // v0.13.4 L1 extension: subtract class_acknowledged count from the
      // observed confirmed_unacknowledged_criticals before comparison. Master
      // computes class_acknowledged by matching each confirmed critical
      // finding against `match_pattern:` entries in acknowledged-ledger.yaml
      // (sprint-spanning ledger keyed by class pattern, not finding_id).
      // Without this, every sprint manufactures new finding_ids and per-id
      // acks never carry forward — the loop self-perpetuates. Field is
      // OPTIONAL in frontmatter; absence defaults to 0 (back-compat with
      // pre-0.13.4 QA-REPORT.md). Mirrors the verify predicate's existing
      // subtractKey: 'acknowledged' pattern (L2250).
      return evalCountPredicate({
        fullPath,
        key: 'confirmed_unacknowledged_criticals',
        operator: cucMatch[1],
        operand: parseInt(cucMatch[2], 10),
        subtractKey: 'class_acknowledged',
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
        subtractKey: 'acknowledged',
      });
    }
    if (/with no confirmed gaps/i.test(predicate)) {
      return evalCountPredicate({
        fullPath,
        key: 'confirmed_gaps',
        operator: '==',
        operand: 0,
        subtractKey: 'acknowledged',
      });
    }
    // S9.6 elicit wire: `status: <scalar>` content-property predicate against
    // SPEC.md frontmatter. Closes the eliciting→research and eliciting→
    // architecture gates. The trailing `AND user routed around research`
    // clause on the eliciting→architecture predicate is the manual-vs-auto
    // signal — that transition is `auto_advance: false`, so the user-routing
    // portion is enforced by the explicit user invocation, not by a content-
    // property check. The CLI op enforces only the structural status portion
    // (`status: build-ready`). Without this lock, master could call
    // `state-set-phase --value research` while SPEC.md was `status: draft` —
    // undermining the Front-Loaded-Design closure gate.
    const statusMatch = predicate.match(/with status:\s*([a-z][a-z0-9-]*)/i);
    if (statusMatch) {
      return evalStatusPredicate({
        fullPath,
        expectedStatus: statusMatch[1],
      });
    }
    // Other content properties not yet exercised — soft-pass with explicit
    // kind name. Future wire-ups append a paired closed decision per
    // cli-spec §5 addendum discipline before adding new branches here.
    if (predicate.includes(' with ')) {
      return { ok: true, kind: 'soft-pass-not-implemented' };
    }
    return { ok: true, kind: 'path-exists' };
  }
  // S10.5 Path A — verify-divergence phrase lookup. Each phrase maps to a
  // VERIFICATION-REPORT.md frontmatter count field (missing|partial|drift);
  // accept iff count > 0. Closes 3 of 4 verify-divergence soft-pass surfaces
  // (the 4th — decomposing→architecture — is logged for S11 polish).
  // Pre-authorized at S10.5 per 06-decisions.md 2026-05-08 first entry
  // sub-decision 1 + cli-spec §5 2026-05-09 Addendum. Without this lock,
  // master could call state-set-phase --value architecture from verifying
  // against an empty / garbage VERIFICATION-REPORT.md — predicate evaluator
  // would rubber-stamp via disposition-soft-pass.
  if (VERIFY_DIVERGENCE_PHRASES.has(predicate)) {
    const fieldKey = VERIFY_DIVERGENCE_PHRASES.get(predicate);
    const verifyReportPath = path.join(
      projectRoot,
      '.pipeline/verify/VERIFICATION-REPORT.md',
    );
    if (!fs.existsSync(verifyReportPath)) {
      return { ok: false, kind: 'path-missing', path: '.pipeline/verify/VERIFICATION-REPORT.md' };
    }
    return evalCountPredicate({
      fullPath: verifyReportPath,
      key: fieldKey,
      operator: '>',
      operand: 0,
    });
  }
  // S9.5 triage wire: disposition predicate (no path) phrase lookup.
  // Closes cli-spec §3.4 TBD per cli-spec §5 2026-05-08 Addendum +
  // 06-decisions.md 2026-05-08 closed decision. Each phrase maps to a
  // TRIAGE-REPORT.md frontmatter `routed_to:` scalar-equality check. Reads
  // the canonical path .pipeline/triage/TRIAGE-REPORT.md (init-spec §1.3
  // canonical_paths.triage_report_md). Without this lock, master could call
  // state-set-phase --value architecture after a triage that wrote
  // routed_to: eliciting — predicate evaluator would soft-pass and the
  // deterministic gate triage exists to enforce would collapse.
  if (TRIAGE_DISPOSITION_PHRASES.has(predicate)) {
    const targetRoute = TRIAGE_DISPOSITION_PHRASES.get(predicate);
    return evalDispositionPredicate({
      projectRoot,
      reportRelPath: '.pipeline/triage/TRIAGE-REPORT.md',
      targetRoute,
    });
  }
  // Disposition predicate not in the locked phrase table — defense-in-depth
  // soft-pass for predicates not yet locked (future heal/elicit phrase
  // additions surface as paired closed decisions per cli-spec §5 addendum
  // discipline; until locked they pass with explicit kind name).
  return { ok: true, kind: 'disposition-soft-pass' };
}

// S9.5 triage wire — phrase table closes cli-spec §3.4 TBD.
// Each entry: transitions.yaml `requires:` string verbatim → target routed_to
// scalar value (frontmatter check key). Locked at S9.5 per cli-spec §5
// 2026-05-08 Addendum + 06-decisions.md 2026-05-08.
const TRIAGE_DISPOSITION_PHRASES = new Map([
  ['triage routed item back for design intent addendum', 'eliciting'],
  ['triage routed item back for further analysis', 'research'],
  ['all triage dispositions resolved; no upstream routes', 'requirements-ready'],
  ['triage routed item to architecture', 'architecture'],
  ['post-build triage routed all items to spec-compliance audit', 'verifying'],
]);

// S10.5 Path A — verify-divergence content-property predicate phrase table.
// Each entry: transitions.yaml verbatim `requires:` string → frontmatter key
// to count-check (operator `>`, operand `0`). Reads canonical
// .pipeline/verify/VERIFICATION-REPORT.md per init-spec §1.7 + cli-spec §5
// 2026-05-09 Addendum. Pre-authorized at S10.5 per 06-decisions.md 2026-05-08
// first entry sub-decision 1 (locked handler-shape table). Closes 3 of 4
// verify-divergence soft-pass surfaces; the 4th (decomposing→architecture
// `open design decision surfaced during decomposition`) is logged for S11
// polish — less-common divergence, S10.5.1-5 do not exercise it.
const VERIFY_DIVERGENCE_PHRASES = new Map([
  ['VERIFICATION-REPORT.md confirms missing implementation', 'missing'],
  ['VERIFICATION-REPORT.md surfaces items needing categorization', 'partial'],
  ['VERIFICATION-REPORT.md confirms spec drift requiring elicit addendum', 'drift'],
]);

// Evaluate a disposition predicate against a markdown file's YAML frontmatter
// `routed_to:` scalar. Per cli-spec §5 2026-05-08 Addendum 11-step procedure.
// Used by triaging→{eliciting,research,requirements-ready,architecture,verifying}
// transitions (S9.5).
function evalDispositionPredicate({ projectRoot, reportRelPath, targetRoute }) {
  const fullPath = path.join(projectRoot, reportRelPath);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, kind: 'predicate-false', observed: `${reportRelPath} missing; cannot read 'routed_to' for disposition predicate` };
  }
  let parsed;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const frontmatter = extractFrontmatter(raw);
    if (frontmatter == null) {
      return {
        ok: false,
        kind: 'predicate-false',
        observed: `${path.basename(fullPath)} has no YAML frontmatter; cannot read 'routed_to'`,
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
  if (!parsed || typeof parsed !== 'object' || !('routed_to' in parsed)) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} frontmatter missing 'routed_to'`,
    };
  }
  const observed = parsed.routed_to;
  if (observed !== targetRoute) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `routed_to=${JSON.stringify(observed)}, predicate requires routed_to == ${JSON.stringify(targetRoute)}`,
    };
  }
  return { ok: true, kind: 'disposition-predicate-pass' };
}

function evalAllTaskSpecsClosed(manifestPath, sprintDir) {
  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    // Multi-doc-tolerant manifest parse (frontmatter + body merge). Sync-by-shape.
    manifest = mergeYamlDocsSync(raw);
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
function evalCountPredicate({ fullPath, key, operator, operand, subtractKey }) {
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
  const rawObserved = parsed[key];
  if (!Number.isFinite(rawObserved)) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} '${key}' is not a number (got ${JSON.stringify(rawObserved)})`,
    };
  }
  // S10.5 2026-05-09 third Addendum (Session 6): when `subtractKey` is supplied
  // (currently only the `confirmed_gaps` predicate path passes 'acknowledged'),
  // read the optional subtract field from the same frontmatter and compute
  // effective = max(0, observed - subtract). The max-clamp prevents negative
  // effective values from author error in frontmatter from crashing the gate;
  // silly inputs become "no remaining gaps" which fails-soft toward letting the
  // transition through, but the gate's reject still fires correctly when
  // effective > 0. The subtractKey is OPTIONAL in frontmatter (defaults to 0).
  // Closes the verifying→complete-with-acknowledged-deferred-missing surface
  // caught at S10.5 Session 6 Step 4c terminal (per cli-spec §5 third 2026-05-09
  // Addendum).
  let observed = rawObserved;
  let subtract = 0;
  if (subtractKey && subtractKey in parsed) {
    const rawSubtract = parsed[subtractKey];
    if (!Number.isFinite(rawSubtract)) {
      return {
        ok: false,
        kind: 'predicate-false',
        observed: `${path.basename(fullPath)} '${subtractKey}' is not a number (got ${JSON.stringify(rawSubtract)})`,
      };
    }
    subtract = rawSubtract;
    observed = Math.max(0, rawObserved - subtract);
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
    const effDescr = subtractKey
      ? `effective_${key}=${observed} (=${rawObserved}-${subtract})`
      : `${key}=${observed}`;
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${effDescr}, predicate requires ${operator} ${operand}`,
    };
  }
  return { ok: true, kind: 'count-predicate-pass' };
}

// S9.6 elicit wire — scalar `status:` content-property check against a
// markdown file's YAML frontmatter. Used by eliciting→{research,architecture}
// transitions where the `status: build-ready` predicate gates the close of
// elicitation. Strict scalar string equality; type-mismatch (non-string) and
// key-missing both fail with `predicate-false` plus a verbatim observed
// payload.
function evalStatusPredicate({ fullPath, expectedStatus }) {
  let parsed;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const frontmatter = extractFrontmatter(raw);
    if (frontmatter == null) {
      return {
        ok: false,
        kind: 'predicate-false',
        observed: `${path.basename(fullPath)} has no YAML frontmatter; cannot read 'status'`,
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
  if (!parsed || typeof parsed !== 'object' || !('status' in parsed)) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} frontmatter missing 'status'`,
    };
  }
  const observed = parsed.status;
  if (typeof observed !== 'string') {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `${path.basename(fullPath)} 'status' is not a string (got ${JSON.stringify(observed)})`,
    };
  }
  if (observed !== expectedStatus) {
    return {
      ok: false,
      kind: 'predicate-false',
      observed: `status="${observed}", predicate requires status == "${expectedStatus}"`,
    };
  }
  return { ok: true, kind: 'status-predicate-pass' };
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
  const manifest = await loadManifestYaml(manifestPath);
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
async function stepAdvance({ skill, nextStep, mode, projectRoot, cursorPathArg }) {
  // T-901 (S9 round-9): new-schema increment branch (D-Rd9-7).
  // When invoked as `step-advance --cursor <path>` with NO --skill / --next-step,
  // operate against the DD-15 cursor schema (skill/step_index/total_steps/
  // step_emitted_at) by incrementing step_index by 1. Sole mutator of the
  // new-schema cursor's step_index per D-Rd9-7 idempotent-replay invariant
  // (next-step never increments). Round-1 grandfathered behaviour for the
  // legacy schema is preserved below — only the no-skill/no-nextstep arg shape
  // routes here.
  if (!skill && !nextStep && cursorPathArg) {
    return await stepAdvanceNewSchema({ cursorPathArg });
  }
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
    const initFn = INIT_DISPATCH[skill] && INIT_DISPATCH[skill]();
    if (!initFn) {
      throw new Error(`init <${skill}> not implemented (all 9 canonical skills should be wired)`);
    }
    initJson = await initFn(projectRoot);

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
    // T-924 (D-Rd10-9): writeCursor consolidated into writeNewCursorAtomic
    // (single canonical cursor.yaml writer surface).
    await writeNewCursorAtomic(cursorPath, newCursor);
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
  // T-924 (D-Rd10-9): writeCursor consolidated into writeNewCursorAtomic
  // (single canonical cursor.yaml writer surface).
  await writeNewCursorAtomic(cursorPath, newCursor);
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

// T-924 (D-Rd10-9): writeCursor function deleted. The non-atomic legacy
// writer collapsed into the single canonical surface writeNewCursorAtomic
// (defined below). All cursor.yaml writes — fresh-init, migration, legacy
// step-advance, new-schema step-advance — route through that one function.

// ============================================================================
// T-901 (S9 round-9) — next-step + new-schema cursor support
// ----------------------------------------------------------------------------
// Per DD-15 + D-Rd9-7 + DD-12-a/b. New op: `next-step --skill <name> --cursor
// <path>`. Parses target SKILL.md body into heading-bounded ordered steps,
// emits step N substance per cursor.yaml step_index, refreshes
// step_emitted_at, and leaves step_index UNCHANGED on emit (idempotent replay
// per D-Rd9-7). step-advance is the sole mutator of step_index.
//
// Cursor schema (DD-15-cursor-schema-extension):
//   { skill, step_index (1-based), total_steps, step_emitted_at }
// Distinct from the legacy round-1 cursor (skill/current_step/step_index
// 0-based/total_steps/last_advanced_at) which step-advance authored before
// round-9. New-schema branch routes through stepAdvanceNewSchema (above).
//
// Skill SKILL.md path: plugins/essense-flow/skills/<skill>/SKILL.md.
// Test fixtures live at redesign/scripts/.test-fixtures/next-step/skill-
// <name>-fixture.md and override the live SKILL.md when env var
// ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR is set (test-only escape hatch — live
// invocations always read the canonical SKILL.md). file_write_contract
// forbids mutating live SKILL.md so fixture-override is the sanctioned cross-
// skill-parity test path per task-spec notes.
// ============================================================================

// Skills supported by the next-step parser per DD-15 verdict "All 6 skills"
// (context/triage/heal excluded — they are CLI-shape skills, not body-emit
// substance candidates).
const NEXT_STEP_SKILLS = ['elicit', 'research', 'architect', 'build', 'verify', 'review'];

// (T-923 round-10 D-Rd10-7 + T-955 round-11 D-Rd11-10): the heading-level
// regex constants (STEP_HEADING_H2 / STEP_HEADING_H3) AND the local body-
// signature parser function that previously lived here have been DELETED.
// Single-source-of-truth parser substrate lives at lib/cursor-schema.cjs
// (HEADING_H2_RX / HEADING_H3_RX + parseSkillStepsFromMarkdown /
// parseSkillSteps). nextStep() consumes the lib via
// parseSkillStepsFromMarkdown(body) — body bytes resolved via
// resolveSkillMdPath() so the test fixture override
// (ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR) keeps working. cursorInit() consumes
// the lib's parseSkillSteps(skill, PLUGIN_ROOT) (file-path entry point).
//
// Per-step body_lines (needed for step-substance emission below; NOT
// returned by the lib's compact {n, title, line} shape) are derived inline
// at the nextStep() call site via a ~6-line shape adapter — see comment +
// code below at "Phase B (continued)". T-955 round-11 consolidation
// (R2-CC6 / D-Rd11-10) deleted the prior named body-slicing helper
// (the "branch (b)" route from T-923); the shape-adapter pattern keeps
// lib API stable (lib canonical; tools.cjs adapts), and removes ~80 LOC of
// helper-fn + doc-comments at the cost of 6 inline lines.

// (F17 dedup, T-921 round-10 D-Rd10-8): the inline explicit-args check helper
// that lived here was deleted per D-Rd10-8 single-surface mandate. The
// canonical lib/explicit-args.cjs `requireExplicitArgs` (imported at top of
// file, line ~113) is the sole surface. Round-9 T-904 closed the helper; the
// inline scaffold was a bootstrap fallback that should not have survived
// T-904's landing. F17 closes the duplicate.

// _loadCursorSchemaLib — DRY helper to dynamically require the cursor-schema
// lib (used by both nextStep + cursorInit). Throws a descriptive
// internal-error if the lib is missing. T-923 round-10 D-Rd10-7.
function _loadCursorSchemaLib() {
  const schemaLibPath = path.join(PLUGIN_ROOT, 'lib', 'cursor-schema.cjs');
  if (!fs.existsSync(schemaLibPath)) {
    const err = new Error(`cursor-schema lib missing at ${schemaLibPath}`);
    err.code = 'CURSOR_SCHEMA_LIB_MISSING';
    err.schemaLibPath = schemaLibPath;
    throw err;
  }
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(schemaLibPath);
}

// T-955 round-11 (R2-CC6 / D-Rd11-10): the local body-slicing helper
// previously here has been DELETED. The body-line slicing is now an inline
// shape-adapter at the nextStep() call site (see Phase B continued below).
// lib/cursor-schema.cjs remains canonical for heading parsing; tools.cjs
// adapts the {n, title, line} shape into the {heading_line, body_lines}
// shape emission needs.

// Resolve the SKILL.md path. If env var ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR is
// set (test-only escape hatch), prefer <override-dir>/skill-<name>-fixture.md.
// Live invocations always read the canonical plugins/essense-flow/skills/
// <name>/SKILL.md. Returns { absolutePath, isOverride }.
function resolveSkillMdPath(skill) {
  const overrideDir = process.env.ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR;
  if (overrideDir) {
    const override = path.join(overrideDir, `skill-${skill}-fixture.md`);
    if (fs.existsSync(override)) {
      return { absolutePath: override, isOverride: true };
    }
  }
  return {
    absolutePath: path.join(PLUGIN_ROOT, 'skills', skill, 'SKILL.md'),
    isOverride: false,
  };
}

// Atomic write helper (tmp + rename) for cursor.yaml — sole canonical writer
// surface post-T-924 (D-Rd10-9). All cursor.yaml writes route through here:
//   - cursor-init fresh init (Phase D step 10)
//   - cursor-init migration (Phase D step 11)
//   - step-advance legacy schema (lines ~2294, ~2352 above)
//   - step-advance new schema (stepAdvanceNewSchema below)
//   - next-step step_emitted_at refresh
//
// Tmp suffix uses tmpName() from lib/atomic-write.cjs (D-Rd10-13: single
// deterministic-uniqueness shape pid+ms+4hex, replaces the four ad-hoc
// .tmp-next-step / .tmp-cursor-init / etc. suffixes).
async function writeNewCursorAtomic(cursorPath, cursor) {
  const dir = path.dirname(cursorPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = require('../lib/atomic-write.cjs').tmpName(cursorPath);
  const yamlBody = await dumpYaml(cursor);
  fs.writeFileSync(tmpPath, yamlBody, 'utf8');
  fs.renameSync(tmpPath, cursorPath);
}

// step-advance new-schema branch — sole mutator of step_index per D-Rd9-7.
// Reads cursor at cursorPathArg; increments step_index by 1; clears
// step_emitted_at to null (since the emit-marker is per-emission, refreshed
// by next-step on the new step). Atomic write back.
async function stepAdvanceNewSchema({ cursorPathArg }) {
  const cursorPath = path.resolve(cursorPathArg);
  if (!fs.existsSync(cursorPath)) {
    return emitFailure(
      EXIT_PREREQ_MISSING,
      `essense-flow-tools step-advance: --cursor '${cursorPathArg}' not found; cannot advance (run next-step or cursor-init first)`,
    );
  }
  let cursor;
  try {
    cursor = await loadYaml(cursorPath);
  } catch (e) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools step-advance: cursor parse failed (${e.message}); run /heal first`,
    );
  }
  if (!cursor || typeof cursor !== 'object') {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools step-advance: cursor at '${cursorPathArg}' empty or not a YAML map`,
    );
  }
  // Detect schema: new schema has step_index as integer >= 1 AND total_steps.
  // Legacy schema has current_step (string) AND step_index 0-based.
  if (typeof cursor.step_index !== 'number' || typeof cursor.total_steps !== 'number') {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools step-advance: cursor at '${cursorPathArg}' missing step_index/total_steps (not a DD-15 cursor); use legacy --skill/--next-step form for round-1 cursor`,
    );
  }
  const next = cursor.step_index + 1;
  if (next > cursor.total_steps) {
    return emitFailure(
      EXIT_OUT_OF_ORDER,
      `essense-flow-tools step-advance: cursor at last step (${cursor.step_index}/${cursor.total_steps}); skill complete`,
    );
  }
  const newCursor = {
    ...cursor,
    step_index: next,
    step_emitted_at: null, // cleared on advance; next-step will refresh on emit
  };
  await writeNewCursorAtomic(cursorPath, newCursor);
  return emitSuccess({
    ok: true,
    op: 'step-advance',
    skill: cursor.skill,
    previous_step_index: cursor.step_index,
    step_index: next,
    total_steps: cursor.total_steps,
    cursor_path: cursorPath,
    skill_complete: false,
  });
}

// ============================================================================
// Op: next-step (T-901 — per task spec behavioral_pseudocode + DD-15)
// ----------------------------------------------------------------------------
// Args: --skill <name> --cursor <path>.
// On success: emits step N substance to stdout (verbatim heading + body lines),
// updates cursor.step_emitted_at, preserves step_index, exit 0.
// ============================================================================
async function nextStep({ skill, cursorPathArg, fromCursor }) {
  const opName = 'next-step';
  // Phase A — argv discipline gate (T-921 round-10 F2 + F17 + F28 fix).
  // Canonical pattern per D-Rd10-8: applyCursorInference -> requireExplicitArgs.
  // applyCursorInference is a no-op unless --from-cursor was passed; in that
  // case it back-fills `skill` from cursor.yaml + echoes the audit-trail line
  // to stdout (DD-18 binding architect-MAY-propose clause). requireExplicitArgs
  // fires AFTER inference so explicit + inferred values both satisfy the gate.
  // DD-18 hard-fail diagnostic + exit 2 on missing flags; canonical surface.
  const _argv = {
    skill,
    cursor: cursorPathArg,
    'from-cursor': fromCursor === true,
  };
  const resolvedCursorPath = cursorPathArg ? path.resolve(cursorPathArg) : undefined;
  applyCursorInference(_argv, ['skill', 'cursor'], resolvedCursorPath, ['skill']);
  // Re-read the (possibly inferred) skill before the required-check fires.
  // applyCursorInference mutates `_argv` in place when inference triggers.
  const resolvedSkill = _argv.skill;
  requireExplicitArgs({ skill: resolvedSkill, cursor: cursorPathArg }, ['skill', 'cursor']);

  if (!NEXT_STEP_SKILLS.includes(resolvedSkill)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --skill '${resolvedSkill}' not in [${NEXT_STEP_SKILLS.join(', ')}]`,
    );
  }

  // Phase B — resolve SKILL.md, parse step boundaries
  const { absolutePath: skillMdPath, isOverride } = resolveSkillMdPath(resolvedSkill);
  if (!fs.existsSync(skillMdPath)) {
    return emitFailure(
      EXIT_TYPE_MISMATCH, // exit code 3 per pseudocode (skill SKILL.md missing)
      `essense-flow-tools ${opName}: skill SKILL.md not at expected path '${skillMdPath}'`,
    );
  }
  const body = fs.readFileSync(skillMdPath, 'utf8');
  // T-923 round-10 D-Rd10-7: single-source-of-truth parser at
  // lib/cursor-schema.cjs. Local body-signature parser deleted; lib's
  // parseSkillStepsFromMarkdown(body) returns {stepCount, headingLevel,
  // steps:[{n,title,line}]}. Two diffs vs the prior local shape:
  //   1. stepCount===0 (no headings) is NOT a throw — the lib returns the
  //      empty shape and lets the caller decide. Translate back to the prior
  //      NO_STEP_HEADINGS exit (exit 4) here so live + test behavior is
  //      preserved.
  //   2. Gap-detection throws a generic Error (no .code='STEP_GAP'); the
  //      message is descriptive — detect via message-prefix + route to the
  //      same EXIT_PROJECT_ROOT_BAD (exit 5).
  // body_lines are sliced from the same `body` inline below (the lib returns
  // only {n, title, line}; emission needs per-step body slices). T-955 round-
  // 11 (R2-CC6 / D-Rd11-10): inline shape adapter — see Phase B (continued).
  let schemaLib;
  try {
    schemaLib = _loadCursorSchemaLib();
  } catch (e) {
    return emitFailure(
      EXIT_GENERIC,
      `essense-flow-tools ${opName}: ${e.message}`,
    );
  }
  let parsed;
  try {
    parsed = schemaLib.parseSkillStepsFromMarkdown(body);
  } catch (e) {
    // Lib throws on heading-sequence gap with a descriptive message.
    if (/sequence has gap|expected N=/.test(e.message)) {
      return emitFailure(
        EXIT_PROJECT_ROOT_BAD, // exit 5 per pseudocode (gap detection)
        `essense-flow-tools ${opName}: ${e.message} in '${skillMdPath}'`,
      );
    }
    return emitFailure(EXIT_GENERIC, `essense-flow-tools ${opName}: ${e.message}`);
  }
  if (parsed.stepCount === 0) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD, // exit 4 per pseudocode (no step headings)
      `essense-flow-tools ${opName}: no ordered step headings found in '${skillMdPath}'`,
    );
  }
  // Phase B (continued) — inline shape adapter: derive per-step
  // {n, title, heading_line, body_lines} from lib's {n, title, line} by
  // slicing `body` between consecutive heading line numbers. Lines before
  // the first heading are prologue — discarded per DD-15 step-bounded-
  // emission rule. T-955 round-11 inline replacement for deleted body-
  // slicing helper (R2-CC6 / D-Rd11-10).
  const _bodyLines = body.split(/\r?\n/);
  const steps = parsed.steps.map((s, i) => {
    const headingIdx = s.line - 1; // lib steps[i].line is 1-indexed
    const nextHeadingIdx = i + 1 < parsed.steps.length
      ? parsed.steps[i + 1].line - 1
      : _bodyLines.length;
    return {
      n: s.n,
      title: s.title,
      heading_line: _bodyLines[headingIdx],
      body_lines: _bodyLines.slice(headingIdx + 1, nextHeadingIdx),
    };
  });
  const K = steps.length;

  // Phase C — cursor load OR init
  const cursorPath = path.resolve(cursorPathArg);
  let cursor;
  if (fs.existsSync(cursorPath)) {
    try {
      cursor = await loadYaml(cursorPath);
    } catch (e) {
      return emitFailure(
        EXIT_DEGRADED,
        `essense-flow-tools ${opName}: cursor parse failed (${e.message}); run /heal first`,
      );
    }
    if (!cursor || typeof cursor !== 'object') {
      // Treat empty-or-non-map as fresh init per AC-5 spirit (auto-init).
      cursor = null;
    }
  }
  if (!cursor) {
    // Phase C step 11 — cursor missing: auto-initialize at step 1 per AC-5
    // (cross-ref T-905 cursor-init contract). Inline init avoids T-905 hard
    // dependency at runtime; T-905 cursor-init op is the canonical entry
    // point for explicit init invocations.
    cursor = {
      skill: resolvedSkill,
      step_index: 1,
      total_steps: K,
      step_emitted_at: null,
    };
  }

  // Cursor schema sanity per DD-15 + D-Rd9-7. Legacy-cursor (current_step
  // present, no DD-15 step_index >=1) routes to a clear diagnostic so the
  // caller knows to migrate via T-905 cursor-init.
  if (typeof cursor.step_index !== 'number' || cursor.step_index < 1) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: cursor at '${cursorPathArg}' is not a DD-15 cursor (missing/invalid step_index); migrate via cursor-init (T-905)`,
    );
  }

  // Skill-mismatch hard check per pseudocode step 12.
  if (cursor.skill && cursor.skill !== resolvedSkill) {
    return emitFailure(
      EXIT_SKILL_OR_MODE_MISMATCH, // exit 6 per pseudocode
      `essense-flow-tools ${opName}: cursor.skill is '${cursor.skill}', --skill is '${resolvedSkill}'; mismatch — prior skill run incomplete`,
    );
  }
  // Backfill skill if cursor was a partial init (defensive — should not happen
  // post-init but T-905 migrates legacy cursors that may lack skill).
  if (!cursor.skill) cursor.skill = resolvedSkill;
  // Backfill total_steps from current parse if missing or stale.
  if (typeof cursor.total_steps !== 'number') cursor.total_steps = K;

  // step_index > K hard check per pseudocode step 13.
  // T-921 round-10 F11 + D-Rd10-4: exit code 9 (NOT 7). Prior EXIT_PREREQ_MISSING
  // (value 7) mis-classified this as a "prereq missing" condition; the truth is
  // the cursor invariant step_index <= total_steps was violated — a validation
  // failure of the cursor schema. Named constant EXIT_STEP_INDEX_EXCEEDS_TOTAL
  // (= 9) replaces the misuse.
  if (cursor.step_index > K) {
    return emitFailure(
      EXIT_STEP_INDEX_EXCEEDS_TOTAL,
      `essense-flow-tools ${opName}: cursor.step_index (${cursor.step_index}) exceeds total_steps (${K}) for skill '${resolvedSkill}'`,
    );
  }

  // Phase D — emit step substance + refresh step_emitted_at
  const step = steps[cursor.step_index - 1];
  const emission = [step.heading_line, ...step.body_lines].join('\n');
  // Trailing newline so consumers + grep tests behave consistently.
  process.stdout.write(emission + (emission.endsWith('\n') ? '' : '\n'));

  // Update step_emitted_at; preserve step_index per D-Rd9-7 idempotent replay.
  const updated = {
    ...cursor,
    step_emitted_at: new Date().toISOString(),
  };
  await writeNewCursorAtomic(cursorPath, updated);

  // Note: nextStep does NOT call emitSuccess (which writes JSON to stdout +
  // exits) because the step substance already went to stdout. Exit 0 here.
  process.exit(EXIT_OK);
  // void return per ESLint; never reached.
  // eslint-disable-next-line no-unreachable
  return { ok: true, isOverride };
}

// ============================================================================
// Op: cursor-init (Round-9 T-905 — per DD-15 cursor schema extension +
// D-Rd9-7 idempotent replay invariant + DD-21 single-sprint pack).
// ----------------------------------------------------------------------------
// Initializes a fresh cursor.yaml at the given path OR migrates a legacy
// cursor (missing optional fields) to the canonical DD-15 schema. Strict on
// type/enum/range malformations (no auto-repair). Atomic write (tmp+rename).
//
// Schema + parser live in lib/cursor-schema.cjs (single-source-of-truth shared
// with next-step op T-901 per Phase E step 12). T-905 owns the schema lib;
// T-901 has its own inline parser body (separate concern — emission, not
// init/migrate). Both ops produce/consume DD-15-shape cursors.
//
// Exit code map (per task T-905 behavioral_pseudocode + AC-Rd9-M1-005-4):
//   0 — success (init OR migrate)
//   2 — missing required flag (--skill or --cursor) — via requireExplicitArgs
//   3 — SKILL.md not found at expected path
//   4 — fresh-init validation failure (post-derive cursor object fails schema)
//   5 — migration skill mismatch (legacy cursor.skill !== argv.skill)
//   6 — malformed cursor (type/enum/range fail; NOT auto-repaired)
//
// Deviation-from-pseudocode (recorded in agent_claim.deviations):
//   Pseudocode Phase B step 4 prescribes total_steps min:1 + step_index
//   <= total_steps invariant. AC-Rd9-M1-005-1 + AC-Rd9-M1-005-3 use --skill
//   verify and --skill build; their SKILL.md files are not yet migrated to
//   the numbered-heading convention DD-15 prescribes (architect SKILL.md is
//   the only one currently carrying `### N. <title>` step headings post-S9.7;
//   the other 5 SKILL.md files are forbidden writes for this sprint per all
//   M1 task specs file_write_contract.forbidden lists). Schema's total_steps
//   min relaxed to 0; D-Rd9-7 invariant special-cased: when total_steps == 0
//   step_index must equal 1 (the hardcoded init default). Architect SKILL.md
//   K=5 case still passes the standard step_index <= total_steps invariant.
//   This keeps both ACs green for the current sprint while preserving the
//   replay-validity intent. Future round migrating the other 5 SKILL.md
//   files to numbered headings will obviate this special case.
// ============================================================================

const CURSOR_INIT_VALID_SKILLS = ['elicit', 'research', 'architect', 'build', 'verify', 'review'];

function _cursorInitDiagnostic(message) {
  process.stderr.write(`essense-flow-tools cursor-init: ${message}\n`);
}

async function cursorInit({ skill, cursorPath }) {
  // Phase A — argv parsing (steps 1-3).
  // requireExplicitArgs (T-904 helper, top-of-file import) emits diagnostic +
  // exit 2 on missing --skill or --cursor. Pass-through on success.
  requireExplicitArgs({ skill, cursor: cursorPath }, ['skill', 'cursor']);

  if (!CURSOR_INIT_VALID_SKILLS.includes(skill)) {
    _cursorInitDiagnostic(
      `--skill '${skill}' not in [${CURSOR_INIT_VALID_SKILLS.join(', ')}]`,
    );
    process.exit(2);
  }

  // Phase B — load schema lib (lib/cursor-schema.cjs) via DRY helper
  // _loadCursorSchemaLib (T-923 round-10 D-Rd10-7; shared with nextStep).
  let schemaLib;
  try {
    schemaLib = _loadCursorSchemaLib();
  } catch (e) {
    _cursorInitDiagnostic(`internal error: ${e.message}`);
    process.exit(1);
  }
  // T-924 (D-Rd10-9): atomicWriteFile no longer pulled here. cursor.yaml
  // writes route through writeNewCursorAtomic (canonical surface). The
  // schemaLib export remains for future non-cursor atomic-write callers
  // (kept for forward-compat per M1-D-Rd10-09).
  const { validateCursorDetailed, parseSkillSteps } = schemaLib;

  // Phase C — total_steps derivation (steps 6-9).
  let parsedSteps;
  try {
    parsedSteps = parseSkillSteps(skill, PLUGIN_ROOT);
  } catch (e) {
    if (e && e.code === 'SKILL_MD_MISSING') {
      _cursorInitDiagnostic(`skill SKILL.md not at expected path: ${e.skillMdPath}`);
      process.exit(3);
    }
    _cursorInitDiagnostic(`SKILL.md parse failed: ${e.message}`);
    process.exit(3);
  }
  const K = parsedSteps.stepCount;

  // Phase D — init OR migrate (steps 10-11).
  const yamlMod = await yaml();
  const cursorAbs = path.resolve(cursorPath);

  if (!fs.existsSync(cursorAbs)) {
    // Step 10 — fresh init.
    const cursor = {
      skill,
      step_index: 1,
      total_steps: K,
      step_emitted_at: null,
    };
    const validation = validateCursorDetailed(cursor);
    if (!validation.valid) {
      _cursorInitDiagnostic(
        `fresh-init cursor failed validation: ${validation.errors.join('; ')}`,
      );
      process.exit(4);
    }
    // T-924 (D-Rd10-9): writes route through writeNewCursorAtomic — pass the
    // JS object directly; dumpYaml handles formatting (single source of truth).
    await writeNewCursorAtomic(cursorAbs, cursor);
    process.stdout.write(
      `initialized cursor at ${cursorAbs} for skill ${skill} (total_steps: ${K})\n`,
    );
    process.exit(0);
    return;
  }

  // Step 11 — cursor exists; migrate-or-reject path.
  let parsedCursor;
  try {
    const raw = fs.readFileSync(cursorAbs, 'utf8');
    parsedCursor = yamlMod.load(raw);
  } catch (e) {
    _cursorInitDiagnostic(`cursor parse failed at ${cursorAbs}: ${e.message}`);
    process.exit(6);
  }

  if (parsedCursor === null || typeof parsedCursor !== 'object' || Array.isArray(parsedCursor)) {
    _cursorInitDiagnostic(
      `cursor at ${cursorAbs} is not a YAML mapping (got ${Array.isArray(parsedCursor) ? 'array' : typeof parsedCursor}); cannot migrate`,
    );
    process.exit(6);
  }

  const initial = validateCursorDetailed(parsedCursor);

  // Step 11c — type/range/enum failures BEFORE migration: hard reject (no auto-repair).
  // We check this BEFORE attempting migration so a malformed step_index (e.g.
  // string "three") cannot be silently overwritten by the migration default.
  if (initial.malformed.length > 0) {
    _cursorInitDiagnostic(
      `malformed cursor at ${cursorAbs}; type/enum/range failures (NOT auto-repaired): ${initial.malformed.join('; ')}`,
    );
    process.exit(6);
  }

  // Step 11b — migration: presence-of-required failures populated with defaults.
  // Per pseudocode 11b: skill must match argv.skill OR diagnostic + exit 5.
  if ('skill' in parsedCursor && parsedCursor.skill !== skill) {
    _cursorInitDiagnostic(
      `migration skill mismatch: cursor.skill is '${parsedCursor.skill}', --skill arg is '${skill}'; refusing to overwrite`,
    );
    process.exit(5);
  }

  const migrated = { ...parsedCursor };
  if (!('skill' in migrated)) migrated.skill = skill;
  if (!('step_index' in migrated)) migrated.step_index = 1;
  if (!('total_steps' in migrated)) migrated.total_steps = K;
  if (!('step_emitted_at' in migrated)) migrated.step_emitted_at = null;

  const migratedValidation = validateCursorDetailed(migrated);
  if (!migratedValidation.valid) {
    _cursorInitDiagnostic(
      `post-migration cursor still invalid: ${migratedValidation.errors.join('; ')}`,
    );
    process.exit(4);
  }

  // T-924 (D-Rd10-9): writes route through writeNewCursorAtomic — pass the
  // JS object directly; dumpYaml handles formatting (single source of truth).
  await writeNewCursorAtomic(cursorAbs, migrated);
  process.stdout.write(`migrated cursor at ${cursorAbs}\n`);
  process.exit(0);
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
  let current = await readState(projectRoot);
  if (current.degraded) {
    // artifacts-first recovery: a missing cache rebuilds from disk when
    // inference is unambiguous; corrupt/ambiguous fails with the inference
    const rec = await reconcileDegradedState(projectRoot, opName, current.degraded);
    if (!rec.ok) return emitFailure(rec.code, rec.message);
    current = rec.state;
  }
  if (!['architecture', 'decomposing'].includes(current.phase)) {
    return emitFailure(
      EXIT_WRONG_PHASE,
      `essense-flow-tools ${opName}: current phase is ${current.phase}; expected one of [architecture, decomposing]`,
    );
  }

  // V2b: pre-pack test-baseline freshness gate (T-1006 / D-Sprint10-5 / DD-7
  // / META-GAP Q3). Fires on the FIRST task-spec-write of a CLI session so
  // the architect cannot land closed task specs without first capturing the
  // pre-pack "what passes today" record. ESF_TEST_BASELINE_GATE_SKIP=1 opts
  // out for harnesses that exercise task-spec-write surface without
  // exercising this gate (kept off the production binary by the same test-
  // mode discipline as ESF_TEST_FAIL_AFTER_TMP).
  if (
    !_testBaselineCheckedThisSession
    && process.env.ESF_TEST_BASELINE_GATE_SKIP !== '1'
  ) {
    const baselineCheck = requireFreshTestBaseline(projectRoot);
    if (!baselineCheck.ok) {
      return emitFailure(
        EXIT_ALIGNMENT_DRIFT,
        `essense-flow-tools ${opName}: pre-pack test baseline ${baselineCheck.reason} `
          + `(per D-Sprint10-5 / META-GAP Q3); run \`essense-flow-tools `
          + `architect-test-baseline-write --project-root ${projectRoot}\` `
          + `before writing task specs for sprint ${sprintInt}; details: ${JSON.stringify(baselineCheck)}`,
      );
    }
    _testBaselineCheckedThisSession = true;
  }

  // V3: read content; YAML parse first so we can consult opt-in
  // forbidden_markers_in_substance flag before scanning (D-Sprint10-14).
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

  // V3b: scan forbidden markers. If spec declares
  // forbidden_markers_in_substance=true AND enumerates each hit in
  // forbidden_markers_audit (per D-Sprint10-14), substance citations of
  // marker names (regex literals, prose references) are admitted.
  const markerScan = scanForbiddenMarkers(contentText, {
    optIn: parsed.forbidden_markers_in_substance === true,
    audit: parsed.forbidden_markers_audit,
  });
  if (markerScan.violation) {
    return emitFailure(
      EXIT_FORBIDDEN_MARKER,
      `essense-flow-tools ${opName}: ${markerScan.message}`,
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

  // V5b: M-2 pseudocode-citation scan (D-Sprint10-5 / T-1002). When
  // agency_level=prescribed, every engine-behavior trigger (throws / emits /
  // returns / produces) in behavioral_pseudocode MUST be supported by a
  // <file>:<line> citation in a 5-line window above or below. Guided + open
  // are exempt (rule scope per substance). Violations exit
  // EXIT_ALIGNMENT_DRIFT (19); diagnostic names the M-2 rule so CI scripts
  // can key on the failure mode without parsing structured findings.
  const m2Scan = scanPseudocodeForUncitedBehavior(
    parsed.behavioral_pseudocode,
    parsed.agency_level,
    projectRoot,
  );
  if (m2Scan && m2Scan.violation) {
    return emitFailure(
      EXIT_ALIGNMENT_DRIFT,
      `essense-flow-tools ${opName}: behavioral_pseudocode line ${m2Scan.line} `
        + `uses engine-behavior trigger '${m2Scan.trigger}' without <file>:<line> `
        + `citation within 5 lines AND agency_level is '${parsed.agency_level}' `
        + `(not 'guided' or 'open'); per M-2 (D-Sprint10-5) prescribed pseudocode `
        + `asserting behavior of EXISTING substrate ('${m2Scan.substrate_path}' is on disk) `
        + `MUST cite the line it read; new-code and library claims are exempt — `
        + `library behavior you cannot execute belongs in the unknowns ledger; `
        + `excerpt: "${m2Scan.excerpt}"`,
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
  const manifest = await loadManifestYaml(manifestPath);
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

// scanPseudocodeForUncitedBehavior(pseudocodeText, agencyLevel, projectRoot)
// — substrate-citation rule, narrowed 2026-06-11 (rebuild Phase 3).
//
// Original intent: stop substrate-blind claims — prescribed pseudocode
// asserting how EXISTING code behaves (throws/emits/returns/produces) must
// cite the <file>:<line> it read. The original rule fired on the trigger
// words alone, which also hit pseudocode describing NEW code — code with no
// file:line to cite — and pushed spec authors toward fabricated citations:
// the exact sin the rule polices.
//
// Narrowed rule: a trigger line needs a citation ONLY when it also names a
// path that EXISTS on disk under projectRoot (existing substrate). Lines
// describing new functions, new files, or third-party library behavior have
// nothing checkable to cite and are exempt here — library/version claims
// the author cannot execute belong in the unknowns ledger instead (see
// references/librarian.md), enforced at the prompt layer.
//
// Rule scope is agency_level=prescribed only — guided + open self-document
// that pseudocode is illustrative.
//
// Returns null when no violation; otherwise { violation: true, line, trigger,
// excerpt, substrate_path } naming the first uncited existing-substrate
// claim. taskSpecWrite converts this to EXIT_ALIGNMENT_DRIFT.
function scanPseudocodeForUncitedBehavior(pseudocodeText, agencyLevel, projectRoot) {
  if (agencyLevel === 'guided' || agencyLevel === 'open') return null;
  if (typeof pseudocodeText !== 'string' || pseudocodeText.trim() === '') return null;

  const lines = pseudocodeText.split('\n');
  const WINDOW = 5;
  const PATH_TOKEN_GLOBAL = new RegExp(CITATION_PATH_TOKEN_RE.source, 'g');
  for (let i = 0; i < lines.length; i++) {
    const match = ENGINE_BEHAVIOR_TRIGGER_RE.exec(lines[i]);
    if (!match) continue;

    // Existing-substrate gate: only lines naming a file that is actually on
    // disk carry a citation obligation. Strip any :line suffix from tokens
    // before the existence probe.
    let substratePath = null;
    if (projectRoot) {
      for (const tok of lines[i].match(PATH_TOKEN_GLOBAL) || []) {
        const rel = tok.replace(/:\d+$/, '');
        const candidate = path.isAbsolute(rel) ? rel : path.join(projectRoot, rel);
        try {
          if (fs.statSync(candidate).isFile()) { substratePath = rel; break; }
        } catch { /* not on disk → not existing substrate */ }
      }
    }
    if (!substratePath) continue; // new code or library claim — exempt

    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(lines.length - 1, i + WINDOW);
    let cited = false;
    for (let j = lo; j <= hi; j++) {
      const lj = lines[j];
      if (CITATION_PATH_LINE_RE.test(lj)) {
        cited = true;
        break;
      }
      // Loose form: `:42` paired with a path-like token on the same line.
      if (CITATION_LOOSE_LINE_RE.test(lj) && CITATION_PATH_TOKEN_RE.test(lj)) {
        cited = true;
        break;
      }
    }
    if (!cited) {
      return {
        violation: true,
        line: i + 1,
        trigger: match[1].toLowerCase(),
        excerpt: lines[i].trim().slice(0, 200),
        substrate_path: substratePath,
      };
    }
  }
  return null;
}

function isGrepTargetCitation(text, markerIdx) {
  if (markerIdx < 0 || markerIdx >= text.length) return false;
  // Locate the containing line — find newline boundaries left + right of idx.
  const lineStart = text.lastIndexOf('\n', markerIdx - 1) + 1;
  let lineEnd = text.indexOf('\n', markerIdx);
  if (lineEnd < 0) lineEnd = text.length;
  const line = text.slice(lineStart, lineEnd);
  const markerOffsetInLine = markerIdx - lineStart;

  // Shape 1: marker inside double-quoted region on a line containing "grep".
  if (/grep/i.test(line)) {
    // Walk the line tracking quote regions; check if markerOffsetInLine
    // falls inside an open double-quote run. Backslash-escaped quotes are
    // treated as ordinary chars (best-effort heuristic — task spec citations
    // do not typically escape).
    let inQuote = false;
    let quoteOpenAt = -1;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteOpenAt = i;
        } else {
          // Closing quote — check if marker fell inside [quoteOpenAt+1 .. i-1].
          if (markerOffsetInLine > quoteOpenAt && markerOffsetInLine < i) {
            return true;
          }
          inQuote = false;
          quoteOpenAt = -1;
        }
      }
    }
    // Unclosed quote (multi-line scalar etc.): admit if past the last open quote.
    if (inQuote && markerOffsetInLine > quoteOpenAt) return true;
  }

  // Shape 2: marker inside `(...)` with at least one `|` separator.
  // Find the nearest `(` to the left of marker (within the line) and the
  // matching `)` to the right; if the enclosed substring contains `|` and
  // the marker offset is inside that span, admit.
  const openParen = line.lastIndexOf('(', markerOffsetInLine);
  if (openParen >= 0) {
    const closeParen = line.indexOf(')', markerOffsetInLine);
    if (closeParen > markerOffsetInLine) {
      const enclosed = line.slice(openParen + 1, closeParen);
      if (enclosed.includes('|')) return true;
    }
  }

  return false;
}

// ============================================================================
// Op: architect-test-baseline-write (Sprint 10 / T-1006 — closes META-GAP Q3 +
//     D-Sprint10-5 + DD-7). Captures pre-pack test suite state into
//     .pipeline/architecture/test-baseline.json. The companion predicate
//     requireFreshTestBaseline (below) gates task-spec-write on baseline
//     freshness so an architect-master cannot pack without first establishing
//     a "what passes today" record.
// ----------------------------------------------------------------------------
// Substrate-verified citations:
//   - lib/atomic-write.cjs: tmpName helper (used here for atomic JSON write).
//   - plugins/essense-flow/test/run-all.cjs: canonical orchestrator entry
//     (substrate-verified extant per CMC-Sprint10-5 + package.json:11
//     "test": "node test/run-all.cjs && node scripts/self-test.js").
// ============================================================================

// Path under project-root where the baseline JSON lives. Single source of
// truth — both the writer (architectTestBaselineWrite) and the reader
// (requireFreshTestBaseline) reference this constant.
const TEST_BASELINE_REL = '.pipeline/architecture/test-baseline.json';

// 1 hour = 3,600,000 ms. Per T-1006 brief: baselines older than this are
// "stale" — re-capture before the next pack. Tuned so a long architect
// session (decide → delegate → synthesize → align → pack) that exceeds the
// hour also exceeds the operator's confidence that "what passed before
// is still what passes now."
const TEST_BASELINE_STALENESS_THRESHOLD_MS = 60 * 60 * 1000;

// Schema version stamped on baseline JSON. Mirrors task-spec / state.yaml
// pattern (schema_version=1 frozen until a structural change forces a bump).
const TEST_BASELINE_SCHEMA_VERSION = 1;

// Process-local guard: requireFreshTestBaseline is invoked at most ONCE
// per CLI invocation. Subsequent in-process callers within the SAME
// session skip the check (the architect's session-first-call gating per
// T-1006 behavioral pseudocode step 3). Per-invocation reset is automatic
// because each CLI op runs as a fresh node process; the flag exists so
// hypothetical in-process re-entrants (e.g. test harness invoking
// taskSpecWrite multiple times in one node run) only pay the check cost
// once.
let _testBaselineCheckedThisSession = false;

// requireFreshTestBaseline: read baseline JSON; return { ok, baseline | reason }.
//   ok=true  => baseline present, parses, age <= staleness threshold.
//   ok=false => reason in { 'baseline-missing', 'baseline-corrupt', 'baseline-stale' }.
// Private helper — not exported. I/O-bearing (fs.readFileSync, fs.existsSync).
function requireFreshTestBaseline(projectRoot) {
  const baselinePath = path.join(projectRoot, TEST_BASELINE_REL);
  if (!fs.existsSync(baselinePath)) {
    return { ok: false, reason: 'baseline-missing', baseline_path: baselinePath };
  }
  let raw;
  try {
    raw = fs.readFileSync(baselinePath, 'utf8');
  } catch (e) {
    return {
      ok: false,
      reason: 'baseline-corrupt',
      baseline_path: baselinePath,
      error: e.message,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      reason: 'baseline-corrupt',
      baseline_path: baselinePath,
      error: e.message,
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      reason: 'baseline-corrupt',
      baseline_path: baselinePath,
      error: 'top-level JSON value must be a mapping',
    };
  }
  const capturedAt = typeof parsed.captured_at === 'string'
    ? Date.parse(parsed.captured_at)
    : NaN;
  if (!Number.isFinite(capturedAt)) {
    return {
      ok: false,
      reason: 'baseline-corrupt',
      baseline_path: baselinePath,
      error: `captured_at '${parsed.captured_at}' not a valid ISO-8601 date`,
    };
  }
  const ageMs = Date.now() - capturedAt;
  if (ageMs > TEST_BASELINE_STALENESS_THRESHOLD_MS) {
    return {
      ok: false,
      reason: 'baseline-stale',
      baseline_path: baselinePath,
      age_ms: ageMs,
      captured_at: parsed.captured_at,
      threshold_ms: TEST_BASELINE_STALENESS_THRESHOLD_MS,
    };
  }
  return { ok: true, baseline: parsed };
}

// architectTestBaselineWrite: spawn the canonical test orchestrator
// (plugins/essense-flow/test/run-all.cjs per CMC-Sprint10-5), parse its
// terminal summary line ("Total: <n>; Failures: <m>"), and atomic-write
// the baseline JSON under <project-root>/.pipeline/architecture/test-baseline.json.
//
// Test-only env var ESF_TEST_BASELINE_SKIP_RUN=1 bypasses the orchestrator
// invocation (records a synthetic baseline mirroring the discovered test
// file count) so the architect-test-baseline.test.cjs harness can verify
// write semantics without recursively re-running the entire plugin suite.
async function architectTestBaselineWrite({ projectRoot }) {
  const opName = 'architect-test-baseline-write';

  // V1: required + sanity args. projectRoot defaulting to process.cwd()
  // happens at the dispatcher entry point; here we only sanity-check.
  if (!projectRoot) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --project-root is required`,
    );
  }
  validateProjectRoot(projectRoot, opName);

  // V2: locate orchestrator. CMC-Sprint10-5 ratifies test/run-all.cjs as
  // the substrate-verified canonical entry. Resolve relative to this
  // tools.cjs file (PLUGIN_ROOT is the plugins/essense-flow root).
  const orchestratorPath = path.join(PLUGIN_ROOT, 'test', 'run-all.cjs');
  if (!fs.existsSync(orchestratorPath)) {
    return emitFailure(
      EXIT_PREREQ_MISSING,
      `essense-flow-tools ${opName}: canonical test orchestrator not found at ${orchestratorPath}; ` +
        'plugin install corrupted',
    );
  }

  // V3: list test files. We pre-count so the baseline JSON's `total`
  // field has a sensible default even if the orchestrator errors before
  // emitting its summary line (defensive — see runnerFailed branch below).
  const testDir = path.join(PLUGIN_ROOT, 'test');
  let testFiles = [];
  try {
    testFiles = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.cjs')).sort();
  } catch (e) {
    return emitFailure(
      EXIT_PREREQ_MISSING,
      `essense-flow-tools ${opName}: cannot list test dir ${testDir}: ${e.message}`,
    );
  }

  // V4: spawn the orchestrator OR record a synthetic baseline when the
  // test-only skip flag is set. Inherit env so any test-mode vars
  // (NODE_ENV, etc.) propagate. Capture stdout+stderr for summary parse.
  const { spawnSync } = require('node:child_process');
  let total = testFiles.length;
  let failing = 0;
  let runnerFailed = false;
  let runnerError = null;

  if (process.env.ESF_TEST_BASELINE_SKIP_RUN === '1') {
    // Synthetic-run path — total mirrors discovered files, failing=0.
    // Used exclusively by architect-test-baseline.test.cjs's AC-1 fixture
    // to avoid recursive suite invocation (a baseline-write op spawning
    // run-all.cjs which then runs this same test file would deadlock).
    failing = 0;
  } else {
    let runResult;
    try {
      runResult = spawnSync(process.execPath, [orchestratorPath], {
        cwd: PLUGIN_ROOT,
        encoding: 'utf8',
        env: process.env,
        // Avoid Windows hanging on a runaway test: cap at 10 minutes.
        timeout: 10 * 60 * 1000,
        // Cap captured output so a runaway test cannot blow memory.
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch (e) {
      return emitFailure(
        EXIT_GENERIC,
        `essense-flow-tools ${opName}: test runner did not start: ${e.message}`,
      );
    }
    if (runResult.error) {
      return emitFailure(
        EXIT_GENERIC,
        `essense-flow-tools ${opName}: test runner did not start: ${runResult.error.message}`,
      );
    }
    // Parse run-all.cjs terminal summary line: "Total: N; Failures: M".
    // We accept the orchestrator's discovery as authoritative (it may
    // differ from our pre-count if a *.test.cjs file is added/removed
    // mid-run — highly unlikely, but the orchestrator's view wins).
    const combined = (runResult.stdout || '') + '\n' + (runResult.stderr || '');
    const summaryMatch = combined.match(/Total:\s*(\d+);\s*Failures:\s*(\d+)/);
    if (summaryMatch) {
      total = Number(summaryMatch[1]);
      failing = Number(summaryMatch[2]);
    } else {
      // Orchestrator crashed before emitting summary — capture failure
      // metadata but still write a baseline (failing tests are NOT a
      // baseline-write failure per behavioral pseudocode step 1). The
      // baseline records `failing == total` pessimistically so any
      // downstream consumer sees the captured-failure signal.
      runnerFailed = true;
      runnerError = `orchestrator summary line not found; exit ${runResult.status}`;
      failing = total;
    }
  }

  const passing = Math.max(0, total - failing);
  // skipped: this plugin does not currently maintain a skip allowlist;
  // record 0 explicitly so the baseline shape carries the field
  // unconditionally (per the 6-required-keys AC-1 check).
  const skipped = 0;
  // known_failing: empty list under current substrate. The T-925 carry-
  // forward cited in the brief is reserved for future use; at v1.0 no
  // known-failing entries exist. Recording the empty array keeps the
  // baseline shape stable across runs.
  const knownFailing = [];

  const baseline = {
    schema_version: TEST_BASELINE_SCHEMA_VERSION,
    total,
    passing,
    failing,
    skipped,
    captured_at: new Date().toISOString(),
    known_failing: knownFailing,
  };

  // V5: atomic write via lib/atomic-write.cjs tmpName + rename pattern.
  // Same single-source-of-truth used by writeNewCursorAtomic (tools.cjs L2687
  // region) and writeStateAndFingerprint per D-Rd10-13.
  const baselinePath = path.join(projectRoot, TEST_BASELINE_REL);
  const baselineDir = path.dirname(baselinePath);
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }
  const { tmpName } = require('../lib/atomic-write.cjs');
  const tmpPath = tmpName(baselinePath);
  const jsonBody = JSON.stringify(baseline, null, 2) + '\n';
  fs.writeFileSync(tmpPath, jsonBody, 'utf8');
  fs.renameSync(tmpPath, baselinePath);

  return emitSuccess({
    ok: true,
    op: opName,
    baseline_path: baselinePath,
    total,
    passing,
    failing,
    skipped,
    captured_at: baseline.captured_at,
    runner_failed: runnerFailed,
    runner_error: runnerError,
  });
}

function scanForbiddenMarkers(text, opts) {
  // Returns { violation: false } on clean OR audited substance citation;
  // { violation: true, message } on drift OR opt-in-without-complete-audit.
  // Opt-in path (D-Sprint10-14): admit substance citations of marker names
  // when spec declares forbidden_markers_in_substance=true AND every hit is
  // enumerated in forbidden_markers_audit by {line, marker}.
  // Context-awareness path (CMC-Sprint10-12 / T-1002): admit marker hits
  // that match grep-target citation shape (double-quoted region in a line
  // with "grep" keyword OR `(...)` regex alternation) without requiring
  // forbidden_markers_in_substance opt-in. Closes the substrate-level
  // scanner-vs-substance loop for T-1009/T-1010/T-1011/T-1013/T-1015 +
  // future drift-prevention specs whose substance enumerates markers.
  const optIn = opts && opts.optIn === true;
  const audit = opts && Array.isArray(opts.audit) ? opts.audit : [];
  const lower = text.toLowerCase();
  const hits = [];
  for (const marker of FORBIDDEN_MARKERS) {
    const ml = marker.toLowerCase();
    let from = 0;
    let idx;
    while ((idx = lower.indexOf(ml, from)) >= 0) {
      // Context-awareness gate: skip the hit when it's a substantive
      // grep-target citation (substrate substance, not drift-leak).
      if (isGrepTargetCitation(text, idx)) {
        from = idx + ml.length;
        continue;
      }
      const line = text.slice(0, idx).split('\n').length;
      hits.push({ marker, line });
      from = idx + ml.length;
    }
  }
  if (hits.length === 0) {
    return { violation: false, audited_count: 0 };
  }
  if (!optIn) {
    const first = hits[0];
    return {
      violation: true,
      message: `--content-file contains forbidden marker '${first.marker}' at line ${first.line}; closed task specs cannot defer fields`,
    };
  }
  // Opt-in declared — every hit must be enumerated by {line, marker_index}
  // (preferred: integer index avoids audit-line self-triggering) or
  // {line, marker} (string form — audit author must avoid the trap).
  const auditKeys = new Set();
  for (const e of audit) {
    if (!e || typeof e !== 'object' || !Number.isInteger(e.line)) continue;
    if (
      Number.isInteger(e.marker_index) &&
      e.marker_index >= 0 &&
      e.marker_index < FORBIDDEN_MARKERS.length
    ) {
      auditKeys.add(`${e.line}:${FORBIDDEN_MARKERS[e.marker_index].toLowerCase()}`);
    } else if (typeof e.marker === 'string') {
      auditKeys.add(`${e.line}:${e.marker.toLowerCase()}`);
    }
  }
  const unaudited = hits.filter((h) => !auditKeys.has(`${h.line}:${h.marker.toLowerCase()}`));
  if (unaudited.length > 0) {
    const first = unaudited[0];
    return {
      violation: true,
      message: `--content-file declares forbidden_markers_in_substance=true but ${unaudited.length} marker hit(s) not enumerated in forbidden_markers_audit (first: marker='${first.marker}' line=${first.line}); each substance-citation must be explicitly enumerated`,
    };
  }
  return { violation: false, audited_count: hits.length };
}

function validateTaskSpecTypes(spec) {
  // Shape rules live in references/schemas/task-spec.schema.yaml — edit the
  // schema, not this function. Error-message contract is pinned by
  // test/schema-validate.test.cjs.
  return validateAgainstSchema(spec, TASK_SPEC_SCHEMA);
}

// ============================================================================
// Op: arch-alignment-check (S9 / Sprint 9 / T-902 — per redesign DD-20 (e))
// ----------------------------------------------------------------------------
// Runs the 6 deterministic alignment criteria from DD-20 (e) against a
// sub-architect return file (markdown w/ YAML frontmatter + fenced ```yaml
// task spec blocks). Emits per-criterion findings list to stdout as YAML.
// Exits 0 on all-pass / 1 on >= 1 finding.
// Source: redesign/06-decisions.md DD-20 (e), DD-12, DD-18, DD-21.
// ============================================================================

const ALIGNMENT_DECISION_ID_PATTERN = /^(D-Rd\d+-[A-Z0-9]+|DD-\d+)$/;
const ALIGNMENT_HARD_CHECK_RE = /HARD CHECK/i;
const ALIGNMENT_HARD_CHECK_CITATION_RE = /(DD-\d+|D-Rd\d+-[A-Z0-9]+|AC-[A-Za-z0-9-]+)/;
const ALIGNMENT_DECISION_LIST_ID_RE = /^\s*-\s+id:\s+(D-(?:Rd\d+-)?[A-Z0-9-]+)/gm;
const ALIGNMENT_SPEC_DD_RE = /^- \*\*(DD-\d+)/gm;
const ALIGNMENT_REQ_FR_RE = /^- \*\*(FR-\d+|NFR-\d+)/gm;
const ALIGNMENT_AC_RE = /\b(AC-[A-Za-z0-9-]+)\b/g;
// T-929 (Round 10, Sprint 9, Module 1) — D-Rd10-15 + DD-21:
//   ALIGNMENT_YAML_FENCE_RE was a module-level /g regex; its shared lastIndex
//   state was a re-entrance hazard. Replaced with a per-use `new RegExp(...)`
//   inside _alignmentParseTaskSpecs (see below). Each invocation gets a fresh
//   regex object with lastIndex === 0 — no cross-invocation state leak.
// T-929 — D-Rd10-15 G5 portability mandate:
//   The prior default-project-dir module-level constant (which hardcoded
//   the closure-plan spike directory) plus the _alignmentResolveProjectRoot
//   helper were silent-misfire surfaces: they made the lens "work" against
//   the wrong project tree. Both deleted; archAlignmentCheck below now
//   delegates to lib/project-dir.cjs resolveProjectDir which hard-fails
//   on missing --project-dir / ESF_PROJECT_DIR (no cwd fallback).

async function _alignmentParseTaskSpecs(rawText) {
  const specs = [];
  const yamlMod = await yaml();
  let m;
  // T-929 (D-Rd10-15 + DD-21): per-use regex construction. Each call gets
  // a fresh RegExp object with lastIndex === 0; no shared state across
  // _alignmentParseTaskSpecs invocations.
  const fenceRe = new RegExp('```yaml\\r?\\n([\\s\\S]*?)\\r?\\n```', 'g');
  while ((m = fenceRe.exec(rawText)) !== null) {
    const blockBody = m[1];
    try {
      const parsed = yamlMod.load(blockBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        specs.push(parsed);
      }
    } catch (e) {
      process.stderr.write(
        `arch-alignment-check: skipped unparseable yaml block: ${e.message}\n`,
      );
    }
  }
  return specs;
}

function _alignmentBuildCorpusIds(projectRoot) {
  const ids = new Set();
  const corpusFiles = [
    { rel: '.pipeline/elicitation/SPEC.md', regexes: [ALIGNMENT_SPEC_DD_RE, ALIGNMENT_AC_RE] },
    { rel: '.pipeline/requirements/REQ.md', regexes: [ALIGNMENT_REQ_FR_RE, ALIGNMENT_AC_RE] },
    { rel: '.pipeline/architecture/decisions.yaml', regexes: [ALIGNMENT_DECISION_LIST_ID_RE, ALIGNMENT_AC_RE] },
    { rel: '.pipeline/architecture/ARCH.md', regexes: [ALIGNMENT_AC_RE] },
  ];
  for (const { rel, regexes } of corpusFiles) {
    const p = path.join(projectRoot, rel);
    if (!fs.existsSync(p)) {
      process.stderr.write(
        `arch-alignment-check: corpus file missing (criterion 2 may under-count): ${rel}\n`,
      );
      continue;
    }
    const txt = fs.readFileSync(p, 'utf8');
    for (const re of regexes) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(txt)) !== null) {
        ids.add(m[1]);
      }
    }
  }
  return ids;
}

function _alignmentParseSeamTable(projectRoot) {
  const boundaries = new Map();
  const seamGrants = [];
  const archPath = path.join(projectRoot, '.pipeline/architecture/ARCH.md');
  if (!fs.existsSync(archPath)) {
    process.stderr.write(
      `arch-alignment-check: ARCH.md missing (criterion 5 may under-flag): .pipeline/architecture/ARCH.md\n`,
    );
    return { boundaries, seamGrants };
  }
  const txt = fs.readFileSync(archPath, 'utf8');
  const startMatch = txt.match(/^##\s+Cross-module seams\s*$/m);
  if (!startMatch) return { boundaries, seamGrants };
  const startIdx = startMatch.index + startMatch[0].length;
  const restAfter = txt.slice(startIdx);
  const nextH2 = restAfter.match(/^##\s+/m);
  const tableSection = nextH2 ? restAfter.slice(0, nextH2.index) : restAfter;
  const rowLines = tableSection
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));
  for (const line of rowLines) {
    if (/Producer/i.test(line) || /---/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((c, i, arr) => {
      return !(c === '' && (i === 0 || i === arr.length - 1));
    });
    if (cells.length < 3) continue;
    const producer = cells[0];
    const seamCell = cells[1];
    const consumer = cells[2];
    const pathPatterns = [];
    const backtickRe = /`([^`]+)`/g;
    let m;
    while ((m = backtickRe.exec(seamCell)) !== null) {
      const lit = m[1];
      if (lit.includes('/') || lit.includes('\\')) {
        pathPatterns.push(_alignmentLiteralToRegex(lit));
      }
    }
    if (!boundaries.has(producer)) boundaries.set(producer, []);
    for (const re of pathPatterns) boundaries.get(producer).push(re);
    if (producer && consumer && producer !== consumer && pathPatterns.length > 0) {
      seamGrants.push({ producer, consumer, pathPatterns });
    }
  }
  return { boundaries, seamGrants };
}

function _alignmentLiteralToRegex(lit) {
  const normalized = lit.replace(/\\/g, '/');
  let escaped = normalized.replace(/[.+^$|()[\]{}\\]/g, '\\$&');
  escaped = escaped.replace(/<n>/g, '\\d+');
  escaped = escaped.replace(/\*/g, '[^/]*');
  return new RegExp('^' + escaped);
}

function _alignmentCriterion1(frontmatter, decisionsCorpusText) {
  const findings = [];
  const entries = Array.isArray(frontmatter && frontmatter.internal_decisions_added)
    ? frontmatter.internal_decisions_added
    : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.internal_only === true) continue;
    const crossRefs = Array.isArray(entry.cross_refs) ? entry.cross_refs : [];
    let hit = false;
    for (const ref of crossRefs) {
      if (typeof ref !== 'string') continue;
      if (decisionsCorpusText && decisionsCorpusText.includes(ref)) { hit = true; break; }
      if (ALIGNMENT_DECISION_ID_PATTERN.test(ref)) { hit = true; break; }
    }
    if (!hit) {
      findings.push({
        criterion: 1,
        item: entry.id || '<no-id>',
        reason: 'no cross-ref + no internal_only flag',
      });
    }
  }
  return findings;
}

function _alignmentCriterion2(taskSpecs, corpusIds) {
  const findings = [];
  for (const task of taskSpecs) {
    const traced = Array.isArray(task.requirements_traced) ? task.requirements_traced : null;
    if (!traced || traced.length === 0) {
      findings.push({
        criterion: 2,
        task: task.task_id || '<no-task-id>',
        item: '<empty>',
        reason: 'requirements_traced empty or missing',
      });
      continue;
    }
    for (const id of traced) {
      if (typeof id !== 'string') continue;
      if (!corpusIds.has(id)) {
        findings.push({
          criterion: 2,
          task: task.task_id || '<no-task-id>',
          item: id,
          reason: 'not in closed DD/FR/D-Rd/AC corpus',
        });
      }
    }
  }
  return findings;
}

function _alignmentCriterion3(frontmatter) {
  const findings = [];
  const cmcs = Array.isArray(frontmatter && frontmatter.cross_module_concerns_surfaced)
    ? frontmatter.cross_module_concerns_surfaced
    : [];
  for (const cmc of cmcs) {
    if (!cmc || typeof cmc !== 'object') continue;
    const am = cmc.affected_modules;
    if (!Array.isArray(am) || am.length < 2) {
      findings.push({
        criterion: 3,
        cmc_id: cmc.concern_id || '<no-concern-id>',
        reason: 'affected_modules.length < 2',
      });
    }
  }
  return findings;
}

function _alignmentCriterion4(taskSpecs) {
  const findings = [];
  for (const task of taskSpecs) {
    const bp = task.behavioral_pseudocode;
    if (typeof bp !== 'string' || bp.length === 0) continue;
    const lines = bp.split('\n');
    for (const line of lines) {
      if (!ALIGNMENT_HARD_CHECK_RE.test(line)) continue;
      if (!ALIGNMENT_HARD_CHECK_CITATION_RE.test(line)) {
        findings.push({
          criterion: 4,
          task: task.task_id || '<no-task-id>',
          line: line.trim(),
          reason: 'HARD CHECK without closed-decision/AC citation',
        });
      }
    }
  }
  return findings;
}

function _alignmentCriterion5(taskSpecs, boundaries, seamGrants) {
  const findings = [];
  for (const task of taskSpecs) {
    const fwc = task.file_write_contract;
    if (!fwc || typeof fwc !== 'object') continue;
    // canonical field is paths (references/schemas/task-spec.schema.yaml);
    // legacy allowed accepted on read for pre-rebuild on-disk specs
    const allowed = Array.isArray(fwc.paths) ? fwc.paths
      : Array.isArray(fwc.allowed) ? fwc.allowed : [];
    const taskModule = task.module;
    if (!taskModule) {
      findings.push({
        criterion: 5,
        task: task.task_id || '<no-task-id>',
        severity: 'critical',
        rationale: 'task.module field missing — alignment criterion 5 cannot evaluate file_write_contract.paths against module boundary',
      });
      continue;
    }
    const ownModuleBoundary = boundaries.get(taskModule) || [];
    for (const p of allowed) {
      if (typeof p !== 'string') continue;
      const norm = p.replace(/\\/g, '/');
      const inOwnBoundary = ownModuleBoundary.some((re) => re.test(norm));
      if (inOwnBoundary) continue;
      const grantHit = seamGrants.some((g) =>
        g.producer === taskModule && g.pathPatterns.some((re) => re.test(norm)),
      );
      if (grantHit) continue;
      if (ownModuleBoundary.length === 0 && !boundaries.has(taskModule)) {
        findings.push({
          criterion: 5,
          task: task.task_id || '<no-task-id>',
          path: p,
          reason: `module '${taskModule}' not in ARCH.md cross-module-seams boundary map`,
        });
        continue;
      }
      findings.push({
        criterion: 5,
        task: task.task_id || '<no-task-id>',
        path: p,
        reason: 'out-of-module write without seam grant',
      });
    }
  }
  return findings;
}

function _alignmentCriterion6(taskSpecs) {
  const findings = [];
  for (const task of taskSpecs) {
    const ev = task.cli_op_evaluation;
    if (!ev || typeof ev !== 'object') {
      findings.push({
        criterion: 6,
        task: task.task_id || '<no-task-id>',
        reason: 'cli_op_evaluation missing inclusion_criterion or rejection_check',
      });
      continue;
    }
    const inc = ev.inclusion_criterion;
    const rej = ev.rejection_check;
    const incOk = typeof inc === 'string' && inc.trim().length > 0;
    const rejOk = typeof rej === 'string' && rej.trim().length > 0;
    if (!incOk || !rejOk) {
      findings.push({
        criterion: 6,
        task: task.task_id || '<no-task-id>',
        reason: 'cli_op_evaluation missing inclusion_criterion or rejection_check',
      });
    }
  }
  return findings;
}

// ============================================================================
// T-959 (Round-11 D-Rd11-6 cluster A reader side; closes R2-C2 + CMC-Rd11-2)
// ----------------------------------------------------------------------------
// _loadAlignmentCounters: reads alignment_lens_dispatches_per_round from 3
// sources (manifest.yaml + state.yaml architecture.round_<N> +
// decisions.yaml round_<N>_sub_architect_dispatches) plus
// sub_architect_dispatches threshold + bootstrap_exemption flag from manifest.
//
// Returns { manifest, state, decisions, sub_architect_dispatches,
//           bootstrap_exemption }. Each counter is int OR null (null = source
// absent OR field absent — per Graceful-Degradation: do NOT fail on absence;
// caller skips absent values from parity check).
//
// Field-name resolution (per task spec):
//   manifest: try `round_<N>_alignment_lens_dispatches_per_round` first
//             (round-specific shape the spec uses); else
//             `alignment_lens_dispatches_per_round_<N>` (actual disk shape
//             observed at round 10+); else top-level
//             `alignment_lens_dispatches_per_round` (round-1/round-9 form).
//   state:    `architecture.round_<N>.alignment_lens_dispatches_per_round`.
//   decisions: prefer document-level
//             `round_<N>_sub_architect_dispatches.alignment_lens_dispatches_per_round`
//             then suffix shape
//             `round_<N>_sub_architect_dispatches.alignment_lens_dispatches_per_round_<N>`.
//   sub_architect_dispatches: from manifest, `round_<N>_sub_architect_dispatches`
//             scalar if N>1; else `sub_architect_dispatches_round_<N>`; else
//             top-level `sub_architect_dispatches`.
//   bootstrap_exemption: prefer manifest `bootstrap_exemption_round_<N>`
//             (round-specific), then top-level `bootstrap_exemption`.
//
// HARD CHECK (DD-21 + D-Rd11-6): roundNumber MUST be positive integer.
// HARD CHECK (DD-19 + Graceful-Degradation): all file reads are absence-safe;
//             missing file = null counter, NOT a throw.
// ============================================================================
function _loadAlignmentCounters(projectRoot, sprintNumber, roundNumber, yamlMod) {
  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    throw new Error(
      `_loadAlignmentCounters: roundNumber must be a positive integer (got ${roundNumber}) — DD-21 + D-Rd11-6`,
    );
  }
  if (!Number.isInteger(sprintNumber) || sprintNumber < 1) {
    throw new Error(
      `_loadAlignmentCounters: sprintNumber must be a positive integer (got ${sprintNumber}) — DD-21 + D-Rd11-6`,
    );
  }
  const pickInt = (v) => (Number.isInteger(v) ? v : null);
  const result = {
    manifest: null,
    state: null,
    decisions: null,
    sub_architect_dispatches: null,
    bootstrap_exemption: false,
  };
  // 1) manifest
  const manifestPath = path.join(
    projectRoot,
    `.pipeline/architecture/sprints/${sprintNumber}/manifest.yaml`,
  );
  if (fs.existsSync(manifestPath)) {
    try {
      const manifestObj = mergeYamlDocsSync(fs.readFileSync(manifestPath, 'utf8')) || {};
      const roundSpecific = manifestObj[`round_${roundNumber}_alignment_lens_dispatches_per_round`];
      const suffixForm = manifestObj[`alignment_lens_dispatches_per_round_${roundNumber}`];
      const topLevel = manifestObj.alignment_lens_dispatches_per_round;
      result.manifest =
        pickInt(roundSpecific) !== null ? pickInt(roundSpecific)
        : pickInt(suffixForm) !== null ? pickInt(suffixForm)
        : pickInt(topLevel);
      // sub_architect_dispatches threshold
      const subDispatchRoundSpecific = manifestObj[`round_${roundNumber}_sub_architect_dispatches`];
      const subDispatchSuffix = manifestObj[`sub_architect_dispatches_round_${roundNumber}`];
      const subDispatchTopLevel = manifestObj.sub_architect_dispatches;
      // round_<N>_sub_architect_dispatches MAY be a mapping (in decisions.yaml
      // shape) OR a scalar (in manifest.yaml shape). Manifest carries scalar.
      const subDispatchCandidates = [
        typeof subDispatchRoundSpecific === 'number' ? subDispatchRoundSpecific : null,
        pickInt(subDispatchSuffix),
        pickInt(subDispatchTopLevel),
      ];
      const firstNonNull = subDispatchCandidates.find((v) => v !== null);
      result.sub_architect_dispatches =
        firstNonNull !== undefined ? firstNonNull : null;
      // bootstrap exemption flag
      const bootstrapRoundSpecific = manifestObj[`bootstrap_exemption_round_${roundNumber}`];
      const bootstrapTopLevel = manifestObj.bootstrap_exemption;
      result.bootstrap_exemption =
        bootstrapRoundSpecific === true ? true
        : (bootstrapRoundSpecific === undefined && bootstrapTopLevel === true) ? true
        : false;
    } catch (e) {
      process.stderr.write(
        `arch-alignment-check: manifest.yaml YAML parse failed at ${manifestPath}: ${e.message}\n`,
      );
    }
  } else {
    process.stderr.write(
      `arch-alignment-check: manifest.yaml absent at .pipeline/architecture/sprints/${sprintNumber}/manifest.yaml (parity reader source 1 skipped)\n`,
    );
  }
  // 2) state.yaml
  const statePath = path.join(projectRoot, '.pipeline/state.yaml');
  if (fs.existsSync(statePath)) {
    try {
      const stateObj = yamlMod.load(fs.readFileSync(statePath, 'utf8')) || {};
      const arch = stateObj.architecture || {};
      const roundBlock = arch[`round_${roundNumber}`] || {};
      result.state = pickInt(roundBlock.alignment_lens_dispatches_per_round);
    } catch (e) {
      process.stderr.write(
        `arch-alignment-check: state.yaml YAML parse failed at ${statePath}: ${e.message}\n`,
      );
    }
  } else {
    process.stderr.write(
      `arch-alignment-check: state.yaml absent at .pipeline/state.yaml (parity reader source 2 skipped)\n`,
    );
  }
  // 3) decisions.yaml
  const decisionsPath = path.join(projectRoot, '.pipeline/architecture/decisions.yaml');
  if (fs.existsSync(decisionsPath)) {
    try {
      const decisionsObj = yamlMod.load(fs.readFileSync(decisionsPath, 'utf8')) || {};
      const subDispatchBlock = decisionsObj[`round_${roundNumber}_sub_architect_dispatches`] || {};
      const docCanonical = subDispatchBlock.alignment_lens_dispatches_per_round;
      const docSuffix = subDispatchBlock[`alignment_lens_dispatches_per_round_${roundNumber}`];
      result.decisions =
        pickInt(docCanonical) !== null ? pickInt(docCanonical) : pickInt(docSuffix);
    } catch (e) {
      process.stderr.write(
        `arch-alignment-check: decisions.yaml YAML parse failed at ${decisionsPath}: ${e.message}\n`,
      );
    }
  } else {
    process.stderr.write(
      `arch-alignment-check: decisions.yaml absent at .pipeline/architecture/decisions.yaml (parity reader source 3 skipped)\n`,
    );
  }
  return result;
}

// ----------------------------------------------------------------------------
// _alignmentCounterParityFindings (T-959):
//   given {manifest, state, decisions, sub_architect_dispatches,
//          bootstrap_exemption}, emit FAIL findings per D-Rd11-6 step 3/4:
//     - alignment-counter-drift   (FATAL) if present_values.length>1 AND
//                                  distinct values across non-null sources
//     - alignment-dispatch-absent (FATAL) if all sources null AND not
//                                  bootstrap_exemption
//     - alignment-dispatch-shortfall (FATAL) if observed < threshold AND
//                                     not bootstrap_exemption
//   `observed` = MAX of non-null present_values (most-recent-canonical per
//   spec).
// ----------------------------------------------------------------------------
function _alignmentCounterParityFindings(counters, sources) {
  const findings = [];
  const present = [];
  const presentSources = [];
  if (counters.manifest !== null) {
    present.push(counters.manifest);
    presentSources.push({ source: 'manifest', path: sources.manifestRel, value: counters.manifest });
  }
  if (counters.state !== null) {
    present.push(counters.state);
    presentSources.push({ source: 'state', path: sources.stateRel, value: counters.state });
  }
  if (counters.decisions !== null) {
    present.push(counters.decisions);
    presentSources.push({ source: 'decisions', path: sources.decisionsRel, value: counters.decisions });
  }
  // Drift (parity): only meaningful when >1 sources have values AND they
  // disagree. Single-source presence is not drift; absence is not drift.
  if (present.length > 1) {
    const distinct = new Set(present);
    if (distinct.size > 1) {
      findings.push({
        kind: 'alignment-counter-drift',
        severity: 'fatal',
        sources: presentSources,
        reason: 'alignment_lens_dispatches_per_round diverges across manifest + state.yaml + decisions.yaml; D-Rd11-6 parity invariant violated',
      });
    }
  }
  // Shortfall / absent checks
  const bootstrapExempt = counters.bootstrap_exemption === true;
  if (present.length === 0) {
    if (!bootstrapExempt) {
      findings.push({
        kind: 'alignment-dispatch-absent',
        severity: 'fatal',
        observed: null,
        threshold: counters.sub_architect_dispatches,
        reason: 'no alignment_lens_dispatches_per_round counter found in any of {manifest, state.yaml, decisions.yaml} AND bootstrap_exemption not set; DD-20 (a) mandatory dispatch unaudited',
      });
    }
  } else {
    const observed = Math.max.apply(null, present);
    const threshold = counters.sub_architect_dispatches;
    if (
      Number.isInteger(threshold) &&
      observed < threshold &&
      !bootstrapExempt
    ) {
      findings.push({
        kind: 'alignment-dispatch-shortfall',
        severity: 'fatal',
        observed,
        threshold,
        reason: `alignment_lens_dispatches_per_round (${observed}) < sub_architect_dispatches (${threshold}); DD-20 (a) mandatory dispatch floor violated`,
      });
    }
  }
  return findings;
}

async function archAlignmentCheck({ subArchReturnPath, projectRootArg }) {
  const opName = 'arch-alignment-check';
  if (!subArchReturnPath) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --sub-arch-return-path required (DD-18)`,
    );
  }
  const absReturnPath = path.resolve(subArchReturnPath);
  if (!fs.existsSync(absReturnPath)) {
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: --sub-arch-return-path '${absReturnPath}' not found (DD-20-e)`,
    );
  }
  // T-929 (D-Rd10-15 G5 portability mandate): delegate to centralized
  // resolveProjectDir which hard-fails on missing --project-dir AND missing
  // ESF_PROJECT_DIR. No implicit cwd fallback. The prior project-root
  // resolver helper (with its hardcoded closure-plan default) was deleted
  // in this round.
  const { resolveProjectDir } = require('../lib/project-dir.cjs');
  const projectRoot = resolveProjectDir({
    argv: { 'project-dir': projectRootArg },
    env: process.env,
  });
  const raw = fs.readFileSync(absReturnPath, 'utf8');
  const fmText = extractFrontmatter(raw);
  let frontmatter = {};
  if (fmText) {
    try {
      frontmatter = await loadYamlString(fmText);
      if (!frontmatter || typeof frontmatter !== 'object') frontmatter = {};
    } catch (e) {
      process.stderr.write(
        `arch-alignment-check: frontmatter YAML parse failed: ${e.message}\n`,
      );
      frontmatter = {};
    }
  }
  const taskSpecs = await _alignmentParseTaskSpecs(raw);
  const corpusIds = _alignmentBuildCorpusIds(projectRoot);
  const decisionsPath = path.join(projectRoot, '.pipeline/architecture/decisions.yaml');
  const decisionsText = fs.existsSync(decisionsPath)
    ? fs.readFileSync(decisionsPath, 'utf8')
    : '';
  const { boundaries, seamGrants } = _alignmentParseSeamTable(projectRoot);
  const findings = [];
  findings.push(..._alignmentCriterion1(frontmatter, decisionsText));
  findings.push(..._alignmentCriterion2(taskSpecs, corpusIds));
  findings.push(..._alignmentCriterion3(frontmatter));
  findings.push(..._alignmentCriterion4(taskSpecs));
  findings.push(..._alignmentCriterion5(taskSpecs, boundaries, seamGrants));
  findings.push(..._alignmentCriterion6(taskSpecs));
  // T-959 (D-Rd11-6 cluster A reader side) — parity + shortfall checks.
  // Reader resolves sprint + architect_round from frontmatter; both required
  // for the 3-source parity check. Per Graceful-Degradation: if either is
  // absent / not a positive integer, skip parity reader entirely (signal on
  // stderr, do NOT fail). Aligned 3 sources / drift / shortfall / bootstrap-
  // exempt / absent-skip scenarios are author-mode covered in
  // test/arch-alignment-check-reader.test.cjs.
  const fmSprintRaw = frontmatter && frontmatter.sprint;
  const fmRoundRaw = frontmatter && (
    frontmatter.architect_round !== undefined
      ? frontmatter.architect_round
      : frontmatter.round
  );
  const fmSprint = Number.isInteger(fmSprintRaw) ? fmSprintRaw : null;
  const fmRound = Number.isInteger(fmRoundRaw) ? fmRoundRaw : null;
  if (fmSprint !== null && fmRound !== null) {
    const yamlMod = await yaml();
    let counters;
    try {
      counters = _loadAlignmentCounters(projectRoot, fmSprint, fmRound, yamlMod);
    } catch (e) {
      process.stderr.write(
        `arch-alignment-check: alignment counter reader threw: ${e.message}\n`,
      );
      counters = null;
    }
    if (counters) {
      const sources = {
        manifestRel: `.pipeline/architecture/sprints/${fmSprint}/manifest.yaml`,
        stateRel: `.pipeline/state.yaml`,
        decisionsRel: `.pipeline/architecture/decisions.yaml`,
      };
      findings.push(..._alignmentCounterParityFindings(counters, sources));
    }
  } else {
    // D-Rd12-5 (ii) — missing-frontmatter WARN-but-fail. Prior behavior emitted
    // stderr + fell through to findings aggregation; if no other criterion
    // produced a finding, handler silently exited 0 (silent-pass). Per INST-13
    // fail-loud-on-missing-input precedent + r11-failmodes-07 closure, the
    // skip is now itself a structured finding that drives non-zero exit.
    process.stderr.write(
      `arch-alignment-check: frontmatter missing sprint (${fmSprintRaw}) or architect_round (${fmRoundRaw}); alignment counter parity reader skipped (Graceful-Degradation) — emitting missing-frontmatter-skip finding (D-Rd12-5 ii)\n`,
    );
    findings.push({
      kind: 'missing-frontmatter-skip',
      severity: 'fatal',
      path: subArchReturnPath,
      observed: { sprint: fmSprintRaw, architect_round: fmRoundRaw },
      reason: 'sub-arch return frontmatter missing required keys (sprint and/or architect_round); alignment counter parity reader cannot run; D-Rd12-5 (ii) WARN-but-fail',
    });
  }
  if (findings.length === 0) {
    process.stdout.write('findings: []\n');
    process.exit(EXIT_OK);
  }
  const yamlOut = await dumpYaml({ findings });
  process.stdout.write(yamlOut);
  // D-Rd12-8 (iii) + CMC-Rd12-M2-1 — discriminate exit code by finding kind.
  // alignment-counter-drift findings get dedicated EXIT_ALIGNMENT_DRIFT=19 so
  // CI scripts can branch on the parity-invariant violation without parsing
  // YAML; other finding kinds (including missing-frontmatter-skip) fall through
  // to EXIT_GENERIC. Per-op spec authority: arch-alignment-check.md §4.7
  // (amended by M2 T-985); shared-constants table at cli-spec.md §3.7.
  const hasAlignmentDrift = findings.some(
    (f) => f && f.kind === 'alignment-counter-drift',
  );
  if (hasAlignmentDrift) {
    process.exit(EXIT_ALIGNMENT_DRIFT);
  }
  process.exit(EXIT_GENERIC);
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
  let current = await readState(projectRoot);
  if (current.degraded) {
    // artifacts-first recovery: a missing cache rebuilds from disk when
    // inference is unambiguous; corrupt/ambiguous fails with the inference
    const rec = await reconcileDegradedState(projectRoot, opName, current.degraded);
    if (!rec.ok) return emitFailure(rec.code, rec.message);
    current = rec.state;
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
  const manifest = await loadManifestYaml(manifestPath);
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
  // Shape rules live in references/schemas/completion-record.schema.yaml —
  // edit the schema, not this function. Error-message contract is pinned by
  // test/schema-validate.test.cjs.
  return validateAgainstSchema(rec, COMPLETION_RECORD_SCHEMA);
}

// (legacy hand-coded body removed; kept here as unreachable would violate
// dead-code policy — deleted outright)

// ============================================================================
// Artifacts-first state recovery (2026-06 rebuild)
// ----------------------------------------------------------------------------
// The artifacts ARE the state; state.yaml is a derived cache of what disk
// already shows. When the cache is MISSING and the artifact tree supports
// exactly one phase inference, ops rebuild the cache from disk (audited to
// HEAL-LOG.md) and proceed — no more dead-ending into "run /heal first" on a
// fresh checkout or a cleaned .pipeline. A CORRUPT cache still hard-fails:
// corruption deserves eyes, not silent repair — but the failure now carries
// the inference so the operator knows what reconcile would do. Ambiguous
// inference NEVER auto-repairs: candidates are listed and a human (or /heal)
// decides.
async function reconcileDegradedState(projectRoot, opName, degradedKind) {
  let inf;
  try {
    inf = inferPhaseFromArtifacts(projectRoot);
  } catch (e) {
    return {
      ok: false,
      code: EXIT_DEGRADED,
      message: `essense-flow-tools ${opName}: current state degraded (${degradedKind}) and artifact inference failed (${e.message}); run /heal`,
    };
  }
  const candidateNote = inf.candidates
    .map((c) => `${c.phase}${c.sprint ? ` (sprint ${c.sprint})` : ''} — ${c.evidence[0]}`)
    .join('; ');
  if (degradedKind !== 'missing') {
    return {
      ok: false,
      code: EXIT_DEGRADED,
      message: `essense-flow-tools ${opName}: current state degraded (${degradedKind}); inspect state.yaml, then run state-reconcile --apply or /heal. Artifacts suggest: ${candidateNote}`,
    };
  }
  if (!inf.confident) {
    return {
      ok: false,
      code: EXIT_DEGRADED,
      message: `essense-flow-tools ${opName}: state.yaml missing and artifact inference is ambiguous — ${candidateNote}. Run state-reconcile or /heal to disposition.`,
    };
  }
  const { loadDefaultState, writeState, statePath } = await stateLib();
  const fresh = await loadDefaultState();
  fresh.phase = inf.phase;
  if (inf.sprint !== null && inf.sprint !== undefined) fresh.sprint = inf.sprint;
  fresh.last_updated = new Date().toISOString();
  // audit-before-mutation discipline (same order force-set uses)
  await appendHealLog(projectRoot, 'force_actions', {
    at: fresh.last_updated,
    prior_phase: null,
    new_phase: inf.phase,
    reason: `state-reconcile (auto, ${opName}): state.yaml missing; cache rebuilt from artifacts — ${inf.candidates[0].evidence.join('; ')}`,
  });
  await writeState(projectRoot, fresh, { force: true, bypassLegalTransition: true });
  return {
    ok: true,
    state: { ...fresh, degraded: null, path: statePath(projectRoot) },
    reconciled: { from: 'missing', phase: inf.phase, sprint: inf.sprint ?? null },
  };
}

// ============================================================================
// Op: state-reconcile (2026-06 rebuild)
// ----------------------------------------------------------------------------
// Compares the state.yaml cache against artifact inference. Report-only by
// default; --apply rewrites the cache from the artifacts when they disagree
// (or when the cache is missing/corrupt) and the inference is confident.
// Artifacts win on conflict — that is the design, not a recovery hack.
async function stateReconcile({ projectRoot, apply }) {
  const opName = 'state-reconcile';
  validateProjectRoot(projectRoot, opName);
  const { readState, writeState, loadDefaultState } = await stateLib();
  // Tolerate a parse-blown cache: reconcile is THE repair tool, so a cache
  // too corrupt for readState's degraded-marker path must not kill it.
  let current;
  try {
    current = await readState(projectRoot);
  } catch (e) {
    current = { phase: 'idle', degraded: 'corrupt', reason: e.message };
  }
  const inf = inferPhaseFromArtifacts(projectRoot);
  const cachedPhase = current.degraded ? null : current.phase;
  const agreement = !current.degraded && inf.confident && current.phase === inf.phase;
  const report = {
    ok: true,
    op: opName,
    cached_phase: cachedPhase,
    degraded: current.degraded || null,
    confident: inf.confident,
    inferred_phase: inf.phase,
    inferred_sprint: inf.sprint === undefined ? null : inf.sprint,
    candidates: inf.candidates,
    agreement,
    applied: false,
  };
  if (!apply || agreement) {
    return emitSuccess(report);
  }
  if (!inf.confident) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: --apply refused — artifact inference is ambiguous (${inf.candidates.map((c) => c.phase).join(', ')}); disposition via /heal or fix artifacts first`,
    );
  }
  // Base doc: keep the cache's fields when readable; defaults when degraded.
  let base;
  if (current.degraded) {
    base = await loadDefaultState();
  } else {
    const { degraded: _d, path: _sp, ...core } = current;
    base = core;
  }
  base.phase = inf.phase;
  if (inf.sprint !== null && inf.sprint !== undefined) base.sprint = inf.sprint;
  base.last_updated = new Date().toISOString();
  await appendHealLog(projectRoot, 'force_actions', {
    at: base.last_updated,
    prior_phase: cachedPhase,
    new_phase: inf.phase,
    reason: `state-reconcile --apply: cache ${current.degraded ? `degraded (${current.degraded})` : `phase '${cachedPhase}'`} vs artifacts '${inf.phase}' — artifacts win; evidence: ${inf.candidates[0].evidence.join('; ')}`,
  });
  await writeState(projectRoot, base, { force: true, bypassLegalTransition: true });
  report.applied = true;
  report.agreement = true;
  return emitSuccess(report);
}

// ============================================================================
// Op: register-add (T-919 — closure-plan round-9 DD-19 + DD-10 + D-Rd9-2)
// ----------------------------------------------------------------------------
// D-Rd9-2 (2026-05-13): set-based register stays sole; no push/pop semantics.
// claimed_at field added per DD-19 for stale-claim sweep (heal-op consumer
// T-918 + drift-10 audit consumer T-913); status field continues to track
// ownership lifecycle (open | in_progress | closed | deferred-to-next-
// increment).
//
// Schema doc: redesign/cli-spec.md §1.7.5 (T-919 amendment landing).
// Backward-compat: legacy entries without claimed_at MUST read OK (no throw).
// ============================================================================
const REGISTER_REL = '.pipeline/outstanding-work-register.yaml';
const REGISTER_HISTORY_REL = '.pipeline/outstanding-work-register-history.yaml';
// Status + target-phase enums derive from references/schemas/register-item.schema.yaml.
const REGISTER_STATUS_VALUES = schemaEnum(REGISTER_ITEM_SCHEMA, 'status');
const REGISTER_TARGET_PHASES = schemaEnum(REGISTER_ITEM_SCHEMA, 'target_phase');

async function registerAdd({
  itemId,
  kind,
  closureCriterion,
  sourceArtifact,
  sourceAnchor,
  targetPhase,
  targetSprint,
  status,
  addedBy,
  projectRoot,
}) {
  const opName = 'register-add';
  validateProjectRoot(projectRoot, opName);

  // Conservative-args HARD CHECK per DD-18: every required field MUST be
  // explicit. NO inference from cursor/state. (claimed_at is NOT a flag —
  // it is a deterministic side-effect of --status.)
  if (!itemId) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --item-id is required`);
  }
  if (!closureCriterion) {
    return emitFailure(EXIT_ARG_MISSING_OR_BAD, `essense-flow-tools ${opName}: --closure-criterion is required`);
  }
  // status defaults to 'open' when omitted (per DD-10 lifecycle default).
  // claimed_at stamping rule keys off in_progress only.
  const resolvedStatus = status || 'open';
  // kind defaults to 'work'; 'unknown' marks librarian-protocol entries
  const resolvedKind = kind || 'work';
  if (!schemaEnum(REGISTER_ITEM_SCHEMA, 'kind').includes(resolvedKind)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --kind '${resolvedKind}' not in [${schemaEnum(REGISTER_ITEM_SCHEMA, 'kind').join(', ')}]`,
    );
  }
  if (!REGISTER_STATUS_VALUES.includes(resolvedStatus)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --status '${resolvedStatus}' not in [${REGISTER_STATUS_VALUES.join(', ')}]`,
    );
  }
  if (targetPhase !== undefined && targetPhase !== null && !REGISTER_TARGET_PHASES.includes(targetPhase)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: --target-phase '${targetPhase}' not in [${REGISTER_TARGET_PHASES.join(', ')}]`,
    );
  }

  const registerPath = path.join(projectRoot, REGISTER_REL);

  // T-961 (D-Rd11-4 + CMC-Rd11-1 + R2-HS3 Cluster E): wrap the read-modify-
  // write boundary in withLock(registerPath, ...) so concurrent register-add
  // invocations (or interleaving with heal --sweep-stale-claims auto-release
  // / heal --apply-disposition) serialise via the wx-sentinel lock at
  // registerPath + '.lock'. Lock-scope HARD CHECK: acquired BEFORE the
  // existsSync→loadYaml read; released AFTER writeStateAndFingerprint +
  // history sidecar write; the stdout emit (emitSuccess / emitFailure) runs
  // OUTSIDE the lock so the JSON envelope cannot tear concurrent writers'
  // disk-state observations. Failure paths return a discriminated result so
  // the withLock callback can return cleanly through its finally clause
  // (process.exit inside the callback would orphan the lock file).
  const result = await withLock(registerPath, async () => {
    let register;
    if (fs.existsSync(registerPath)) {
      try {
        register = await loadYaml(registerPath);
      } catch (e) {
        return {
          kind: 'failure',
          code: EXIT_YAML_PARSE,
          message: `essense-flow-tools ${opName}: ${REGISTER_REL} parse failed: ${e.message}`,
        };
      }
    }
    if (!register || typeof register !== 'object') register = { entries: [] };
    if (!Array.isArray(register.entries)) register.entries = [];

    // Idempotency: reject duplicate item_id (set-based register per D-Rd9-2;
    // future status-transition ops handle re-claim without re-adding).
    if (register.entries.some((e) => e && e.item_id === itemId)) {
      return {
        kind: 'failure',
        code: EXIT_IDEMPOTENCY,
        message: `essense-flow-tools ${opName}: item_id '${itemId}' already present in register; use status-transition op (future) or remove first`,
      };
    }

    const nowIso = new Date().toISOString();
    const entry = {
      item_id: itemId,
      kind: resolvedKind,
      source_artifact: sourceArtifact || null,
      source_anchor: sourceAnchor || null,
      closure_criterion: closureCriterion,
      target_phase: targetPhase || null,
      target_sprint: targetSprint !== undefined && targetSprint !== null
        ? Number(targetSprint)
        : null,
      status: resolvedStatus,
      closure_evidence: null,
      added_by: addedBy || 'cli',
      added_at: nowIso,
    };

    // T-919 claimed_at stamp rule (per DD-19 + cli-spec §1.7.5):
    // when entry.status === 'in_progress', stamp claimed_at = now ISO8601.
    // Else: leave claimed_at unset (legacy-compat for entries created with
    // status: open / deferred / closed). The timestamp is a deterministic
    // side-effect of the explicit --status arg, NOT a separate flag (per
    // DD-18 conservative-args policy: no new flag added to register-add).
    if (entry.status === 'in_progress') {
      entry.claimed_at = nowIso;
    }

    register.entries.push(entry);

    // Atomic write via T-939 writeStateAndFingerprint wrapper (DD-10 audit-
    // trail integrity hash mandate). Wrapper handles tmp+rename + SHA-256
    // fingerprint sidecar at registerPath + '.fingerprint'. DD-19: pass the
    // whole canonical register document, not just the modified entry.
    const dir = path.dirname(registerPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await writeStateAndFingerprint(registerPath, register);

    // Append-only history sidecar (DD-10 audit-trail discipline).
    const historyPath = path.join(projectRoot, REGISTER_HISTORY_REL);
    let history;
    if (fs.existsSync(historyPath)) {
      try {
        history = await loadYaml(historyPath);
      } catch (_e) {
        history = null;
      }
    }
    if (!history || typeof history !== 'object') history = { events: [] };
    if (!Array.isArray(history.events)) history.events = [];
    history.events.push({
      at: nowIso,
      op: 'register-add',
      item_id: itemId,
      status: resolvedStatus,
      claimed_at: entry.claimed_at || null,
    });
    const historyTmp = `${historyPath}.tmp-register-add`;
    fs.writeFileSync(historyTmp, await dumpYaml(history), 'utf8');
    fs.renameSync(historyTmp, historyPath);

    return {
      kind: 'success',
      payload: {
        ok: true,
        op: 'register-add',
        item_id: itemId,
        status: resolvedStatus,
        claimed_at: entry.claimed_at || null,
        register_path: REGISTER_REL,
        entries_count: register.entries.length,
      },
    };
  });

  // Lock released — emit OUTSIDE the lock scope (CMC-Rd11-1 lock-substance
  // preservation: stdout emit cannot tear concurrent observer state).
  if (result.kind === 'failure') {
    return emitFailure(result.code, result.message);
  }
  return emitSuccess(result.payload);
}

// ============================================================================
// Op: register-list (T-919 — closure-plan round-9 DD-10 + backward-compat)
// ----------------------------------------------------------------------------
// Backward-compat HARD CHECK (T-919): when reading entries, if entry.claimed_at
// is undefined, treat as null. NO error, NO warn-fail. Legacy entries persist
// without claimed_at and MUST list cleanly. (Drift-10 audit T-913 + heal-op
// stale-claim sweep T-918 enforce the same rule on their own read paths.)
// ============================================================================
async function registerList({ statusFilter, targetPhase, targetSprint, projectRoot }) {
  const opName = 'register-list';
  validateProjectRoot(projectRoot, opName);

  const registerPath = path.join(projectRoot, REGISTER_REL);
  if (!fs.existsSync(registerPath)) {
    return emitSuccess({
      ok: true,
      op: 'register-list',
      register_path: REGISTER_REL,
      entries: [],
      total: 0,
      filtered: 0,
    });
  }
  let register;
  try {
    register = await loadYaml(registerPath);
  } catch (e) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: ${REGISTER_REL} parse failed: ${e.message}`,
    );
  }
  const allEntries = (register && Array.isArray(register.entries)) ? register.entries : [];

  // Normalise legacy entries: claimed_at undefined → null (no throw, no
  // warn-fail per T-919 backward-compat HARD CHECK).
  const normalised = allEntries.map((e) => {
    const out = Object.assign({}, e || {});
    if (out.claimed_at === undefined) out.claimed_at = null;
    return out;
  });

  let filtered = normalised;
  if (statusFilter) {
    filtered = filtered.filter((e) => e.status === statusFilter);
  }
  if (targetPhase) {
    filtered = filtered.filter((e) => e.target_phase === targetPhase);
  }
  if (targetSprint !== undefined && targetSprint !== null) {
    const sn = Number(targetSprint);
    filtered = filtered.filter((e) => Number(e.target_sprint) === sn);
  }

  return emitSuccess({
    ok: true,
    op: 'register-list',
    register_path: REGISTER_REL,
    entries: filtered,
    total: normalised.length,
    filtered: filtered.length,
  });
}

// ============================================================================
// Op: heal --sweep-stale-claims (T-918 — closure-plan round-9 DD-19 + D-Rd9-6
// + DD-10 + DD-21).
// ----------------------------------------------------------------------------
// Reads `.pipeline/outstanding-work-register.yaml`. For each entry where
// status === 'in_progress' AND claimed_at present AND age > threshold, marks
// the entry as a stale candidate. Threshold per-skill via readSkillThreshold
// (SKILL.md frontmatter `stale_claim_threshold_hours`), default 24h via the
// named DEFAULT_STALE_THRESHOLD_HOURS constant (D-Rd9-6 HARD CHECK).
//
// Modes (DD-19):
//   --auto-release          : batch-release ALL stale candidates (status →
//                              'open', claimed_at → null), one HEAL-LOG entry
//                              per release with disposition=unclaimed-by-auto-
//                              release.
//   (default, no flag)      : per-stale-item AskUserQuestion JSON block on
//                              stdout with options ['unclaim',
//                              'keep claimed (mark not-stale)',
//                              'keep but flag as stale-acknowledged']. Master
//                              forwards via standard contract; this handler
//                              does NOT mutate the register on the no-flag
//                              path (apply-disposition follow-up op deferred —
//                              see surfaced concerns in completion record).
//
// HEAL-LOG entry shape (body line per cli-spec §1.7 audit-trail discipline):
//   "[<iso_timestamp>] STALE_SWEEP item_id=<id> claimed_at=<iso>
//    threshold_hours=<N> disposition=<disp>"
//
// Backward-compat HARD CHECK (DD-10 + T-919): entries without claimed_at are
// SKIPPED — never throw, never warn-fail. Coordinates with drift-11 audit
// (T-913) layered defense per DD-19.
// ============================================================================

const HEAL_LOG_REL = '.pipeline/heal/HEAL-LOG.md';

// Stale-claim sweep dispositions — closed list per DD-19. Named constants per
// CLAUDE.md "no magic strings" rule; downstream consumers grep these tokens.
const DISPOSITION_UNCLAIMED_BY_USER = 'unclaimed-by-user';
const DISPOSITION_UNCLAIMED_BY_AUTO_RELEASE = 'unclaimed-by-auto-release';
const DISPOSITION_KEPT_BY_USER = 'kept-by-user';
const DISPOSITION_KEPT_BUT_FLAGGED_STALE = 'kept-but-flagged-stale';

// Per-stale-item AskUserQuestion options — closed list per DD-19 substance
// (Job 6 of /heal). Order load-bearing: unclaim first (safe default), keep
// last (acknowledged-stale escape hatch).
const STALE_QUESTION_OPTIONS = [
  'unclaim',
  'keep claimed (mark not-stale)',
  'keep but flag as stale-acknowledged',
];

// readSkillThreshold + DEFAULT_STALE_THRESHOLD_HOURS imported from the shared
// staleness lib (T-906 — D-Rd9-10 / CMC-Rd9-M6-1 shared-helper verdict).
// Both M6 sweep (this handler) and M4 drift-11 audit (T-913) consume the
// same thresholds for layered defense per DD-19.
//
// M6 isStale-import discipline (D-Rd10-12 — T-942):
//   Every M6-owned call site (heal --sweep-stale-claims branch +
//   register-subsystem helpers) reaches isStale ONLY through this
//   require. No local copy. Absolute-value extension for future-dated
//   claimed_at (clock skew -> negative age_hours -> false) lives in
//   lib/staleness.cjs (owned by M1, T-928 in W6) and propagates here
//   transitively. Regression locked by test/m6-staleness-import.test.cjs.
const _staleness = require('../lib/staleness.cjs');
const { readSkillThreshold, isStale, DEFAULT_STALE_THRESHOLD_HOURS } = _staleness;

// Map register entry → skill slug for SKILL.md frontmatter lookup. Register
// schema (cli-spec §1.7.5) does NOT carry a top-level `skill` field; the
// canonical signal is `added_by` (e.g. 'round-N elicit' / 'round-N architect'
// / 'adversarial-planning-lens'). Heuristic ordering:
//   1. If added_by contains a known skill slug substring, return that slug.
//   2. Else map target_phase → skill slug via the canonical phase→skill table.
//   3. Else return null (readSkillThreshold(null) returns DEFAULT).
// Documented in skill substance Job 6 (parity with this handler).
const _PHASE_TO_SKILL = {
  eliciting: 'elicit',
  research: 'research',
  triaging: 'triage',
  architecture: 'architect',
  sprinting: 'build',
  reviewing: 'review',
  verifying: 'verify',
};
function _resolveSkillForEntry(entry) {
  if (entry && typeof entry.added_by === 'string') {
    const lower = entry.added_by.toLowerCase();
    for (const slug of SKILLS) {
      if (lower.includes(slug)) return slug;
    }
  }
  if (entry && typeof entry.target_phase === 'string') {
    return _PHASE_TO_SKILL[entry.target_phase] || null;
  }
  return null;
}

// Append a STALE_SWEEP body line to .pipeline/heal/HEAL-LOG.md.
//
// T-961 (D-Rd11-4 + CMC-Rd11-1 + R2-HS3 Cluster E): supersedes the prior
// existsSync→read→append→tmp+rename body with a one-line O_APPEND atomic
// write via appendAuditLine(). The line + '\n' is <= PIPE_BUF on POSIX
// (and effectively atomic on NTFS for line sizes <= 4 KiB per
// AUDIT_LINE_MAX_BYTES); concurrent appenders see no interleaving.
//
// Frontmatter preservation NOTE: appendAuditLine writes raw lines and does
// not maintain the frontmatter `last_invocation` field. The frontmatter is
// preserved when the file pre-exists (we append after it); for a fresh log
// the file is created body-only. Per D-Rd11-4 closure plan, frontmatter
// `last_invocation` is no longer load-bearing for stale-sweep accounting —
// the in-line `[<iso>]` timestamp at the head of every STALE_SWEEP line
// carries the audit instant.
async function _appendStaleSweepLogLine(projectRoot, line) {
  const healDir = path.join(projectRoot, '.pipeline', 'heal');
  const logPath = path.join(healDir, 'HEAL-LOG.md');
  if (!fs.existsSync(healDir)) {
    fs.mkdirSync(healDir, { recursive: true });
  }
  // One-line atomic append, serialized under the HEAL-LOG lock: O_APPEND
  // protects against interleaved appends, but appendHealLog's frontmatter
  // tmp+rename replaces the whole file — an unserialized append can land
  // between a concurrent writer's read and rename and be silently dropped.
  await withLock(logPath, async () => {
    appendAuditLine(logPath, line);
  });
  return logPath;
}

// (T-939 — _writeRegisterAtomic shim removed; heal-sweep release path now
//  calls writeStateAndFingerprint directly. Single canonical writer; no
//  intermediate that could drift away from DD-10's fingerprint mandate.)

// Format the canonical STALE_SWEEP_AUTO_RELEASE body line per T-962 spec AC-3
// (post D-Rd12-6 (i) amend). Token set: STALE_SWEEP_AUTO_RELEASE + item_id +
// prior_status=in_progress + new_status=open + threshold_hours. The prior_status
// and new_status values are constants because auto-release ONLY runs against
// in_progress entries and ONLY transitions to open — the state-transition is
// encoded inline rather than via a separate disposition token. The claimed_at
// value remains available on the success envelope's released[].prior_claimed_at
// for diagnostics; only the audit-line shape changes.
function _formatStaleSweepLine(nowIso, itemId, thresholdHours) {
  return `[${nowIso}] STALE_SWEEP_AUTO_RELEASE item_id=${itemId} prior_status=in_progress new_status=open threshold_hours=${thresholdHours}`;
}

async function healSweepStaleClaims({ autoRelease, projectRoot }) {
  const opName = 'heal --sweep-stale-claims';
  validateProjectRoot(projectRoot, opName);

  const registerPath = path.join(projectRoot, REGISTER_REL);

  // No register → no work. Emit success with zero candidates (idempotent
  // no-op per Fail-Soft principle). No lock needed — nothing to read or
  // mutate.
  if (!fs.existsSync(registerPath)) {
    return emitSuccess({
      ok: true,
      op: 'heal-sweep-stale-claims',
      auto_release: autoRelease === true,
      register_path: REGISTER_REL,
      stale_candidates: [],
      released: [],
      questions_emitted: 0,
    });
  }

  // T-961 (D-Rd11-4 + CMC-Rd11-1 + R2-HS3 Cluster E): wrap the read-modify-
  // write boundary in withLock(registerPath, ...). Lock-scope HARD CHECK:
  // acquired BEFORE loadYaml; released AFTER writeStateAndFingerprint +
  // _appendStaleSweepLogLine (auto-release branch). The stdout emit runs
  // OUTSIDE the lock so a concurrent observer of the disk cannot tear on
  // a half-emitted envelope. Default branch reads under the same lock so
  // the candidate set cannot reflect a partial concurrent register-add /
  // heal --apply-disposition mid-mutation.
  const result = await withLock(registerPath, async () => {
    let register;
    try {
      register = await loadYaml(registerPath);
    } catch (e) {
      return {
        kind: 'failure',
        code: EXIT_YAML_PARSE,
        message: `essense-flow-tools ${opName}: ${REGISTER_REL} parse failed: ${e.message}`,
      };
    }
    if (!register || typeof register !== 'object') register = { entries: [] };
    if (!Array.isArray(register.entries)) register.entries = [];

    const nowMs = Date.now();
    const staleCandidates = [];

    // Pass 1 — identify stale candidates. Backward-compat HARD CHECK per
    // DD-10 + T-919: entries lacking claimed_at are SKIPPED (never throw).
    for (const entry of register.entries) {
      if (!entry || entry.status !== 'in_progress') continue;
      // Treat undefined as null — stale-eligibility requires a claim timestamp.
      const claimedAt = entry.claimed_at == null ? null : entry.claimed_at;
      if (claimedAt === null) continue;

      const skill = _resolveSkillForEntry(entry);
      // readSkillThreshold(null) safely returns DEFAULT_STALE_THRESHOLD_HOURS
      // because the SKILL.md path resolution fails the existsSync check.
      const thresholdHours = skill
        ? readSkillThreshold(skill)
        : DEFAULT_STALE_THRESHOLD_HOURS;

      if (!isStale(claimedAt, thresholdHours, nowMs)) continue;

      const ageHours = (nowMs - Date.parse(claimedAt)) / 3600000;
      staleCandidates.push({
        entry,
        claimed_at: claimedAt,
        skill,
        threshold_hours: thresholdHours,
        age_hours: ageHours,
      });
    }

    // Pass 2 — apply mode-specific disposition.
    if (autoRelease === true) {
      // Batch-release every stale candidate. Per pseudocode 3e: status →
      // 'open', clear claimed_at, append HEAL-LOG line per release.
      const released = [];
      for (const cand of staleCandidates) {
        cand.entry.status = 'open';
        cand.entry.claimed_at = null;
        released.push({
          item_id: cand.entry.item_id,
          prior_claimed_at: cand.claimed_at,
          threshold_hours: cand.threshold_hours,
          age_hours: cand.age_hours,
          disposition: DISPOSITION_UNCLAIMED_BY_AUTO_RELEASE,
        });
      }

      // Persist register mutation BEFORE writing HEAL-LOG entries, so a partial
      // failure leaves either (a) no mutation + no log, or (b) mutation + log,
      // never (c) log without mutation. (Mirrors record-task-completion's
      // "write artifact, then announce" discipline.)
      if (released.length > 0) {
        try {
          // T-939: route through writeStateAndFingerprint (DD-10 audit-trail
          // integrity hash mandate). Wrapper handles tmp+rename + SHA-256
          // fingerprint sidecar. DD-19: pass whole register document.
          const dir = path.dirname(registerPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          await writeStateAndFingerprint(registerPath, register);
        } catch (e) {
          return {
            kind: 'failure',
            code: EXIT_GENERIC,
            message: `essense-flow-tools ${opName}: register write failed (${e.message}); no HEAL-LOG entries written`,
          };
        }

        // Append one HEAL-LOG line per released item (DD-19 audit-trail per
        // sweep). One write per item satisfies AC-6's grep-per-item shape.
        for (const r of released) {
          const nowIso = new Date().toISOString();
          // T-974 (D-Rd12-6 (i)): emit canonical AC-3 token set —
          // STALE_SWEEP_AUTO_RELEASE + item_id + prior_status=in_progress +
          // new_status=open + threshold_hours. prior_claimed_at and disposition
          // are no longer line tokens; both remain on the released[] envelope.
          const line = _formatStaleSweepLine(
            nowIso,
            r.item_id,
            r.threshold_hours,
          );
          try {
            await _appendStaleSweepLogLine(projectRoot, line);
          } catch (e) {
            // HEAL-LOG write failure post-register-mutation is a partial-
            // success state — surface but don't roll back (audit-trail-after
            // mode for sweep; force-set-phase uses audit-trail-before because
            // its mutation is far heavier).
            return {
              kind: 'failure',
              code: EXIT_GENERIC,
              message: `essense-flow-tools ${opName}: register updated but HEAL-LOG append failed for ${r.item_id} (${e.message}); audit-trail incomplete`,
            };
          }
        }
      }

      return {
        kind: 'success',
        payload: {
          ok: true,
          op: 'heal-sweep-stale-claims',
          auto_release: true,
          register_path: REGISTER_REL,
          heal_log_path: HEAL_LOG_REL,
          stale_candidates: staleCandidates.map((c) => ({
            item_id: c.entry.item_id,
            claimed_at: c.claimed_at,
            threshold_hours: c.threshold_hours,
            age_hours: c.age_hours,
          })),
          released,
          questions_emitted: 0,
        },
      };
    }

    // Default (no --auto-release flag) — emit one AskUserQuestion JSON block
    // per stale candidate. Master collects responses via the standard
    // AskUserQuestion contract; apply-disposition is a follow-up call (the
    // current op does not block on stdin — that surface is deferred to an
    // explicit follow-up flag, surfaced as a concern in the completion record).
    const askBlocks = [];
    for (const cand of staleCandidates) {
      const ageRounded = Math.round(cand.age_hours * 10) / 10;
      askBlocks.push({
        type: 'AskUserQuestion',
        question: `Stale claim on ${cand.entry.item_id} claimed ${ageRounded}h ago (threshold ${cand.threshold_hours}h). Action?`,
        options: STALE_QUESTION_OPTIONS,
        item_id: cand.entry.item_id,
        claimed_at: cand.claimed_at,
        threshold_hours: cand.threshold_hours,
        age_hours: cand.age_hours,
      });
    }

    return {
      kind: 'success',
      payload: {
        ok: true,
        op: 'heal-sweep-stale-claims',
        auto_release: false,
        register_path: REGISTER_REL,
        stale_candidates: staleCandidates.map((c) => ({
          item_id: c.entry.item_id,
          claimed_at: c.claimed_at,
          threshold_hours: c.threshold_hours,
          age_hours: c.age_hours,
        })),
        questions: askBlocks,
        questions_emitted: askBlocks.length,
        note: 'Master forwards each AskUserQuestion via standard contract; per-item disposition application is a follow-up op (not implemented this round — see T-918 surfaced concerns).',
      },
    };
  });

  // Lock released — emit OUTSIDE the lock scope (CMC-Rd11-1 lock-substance
  // preservation: stdout emit cannot tear concurrent observer state).
  if (result.kind === 'failure') {
    return emitFailure(result.code, result.message);
  }
  return emitSuccess(result.payload);
}

// ============================================================================
// Op: heal --apply-disposition (T-940 — Sprint 9 round-10 D-Rd10-11 + DD-19 +
// DD-10 + DD-18 + FR-F21)
// ----------------------------------------------------------------------------
// Per-item disposition writer for the stale-claim sweep. Pairs with
// heal --sweep-stale-claims (T-918) as the writer/mutator side of the DD-19
// reader/writer pair. Master surfaces stale items via the sweep's
// AskUserQuestion blocks; the user's per-item choice routes here as one
// invocation per item carrying --item-id <id> --action <release|keep|escalate>.
//
// Action semantics (per per-op spec at redesign/cli-spec/ops/heal-apply-disposition.md
// — authoritative per D-Rd11-2 closing Cluster B / R2-SD5 + R2-SD6):
//   - release:  status -> 'open';   claimed_at -> null.
//   - keep:     status untouched; claimed_at -> new Date().toISOString() (per-op
//                  spec L70 — refreshes the claim timestamp on the user-
//                  affirmed keep so subsequent staleness sweeps re-evaluate
//                  from "now"). HEAL-LOG entry records the keep event (DD-19).
//   - escalate: status -> 'escalated'; escalated_at -> nowIso; claimed_at
//                  preserved (DD-10 audit-trail evidence preservation).
//
// Mutual-exclusion HARD CHECK (DD-18 conservative-args): the heal dispatcher
// at the case-arm site rejects invocations carrying BOTH --sweep-stale-claims
// AND --apply-disposition, exit code 4 with diagnostic citing DD-18. One
// sub-op per invocation.
//
// Audit-trail line shape (mirrors T-918 STALE_SWEEP for grep parity over
// HEAL-LOG.md; tokens deterministic for AC-4 + AC-5):
//   "[<iso>] APPLY_DISPOSITION item_id=<id> prior_status=<observed>
//    prior_claimed_at=<iso-or-null> action=<release|keep|escalate>
//    new_status=<post>"
//
// Register write routes through writeStateAndFingerprint (T-939 wrapper —
// DD-10 audit-trail-integrity hash mandate). HEAL-LOG append routes through
// a sibling of _appendStaleSweepLogLine that reuses the same tmp+rename
// atomic discipline.
// ============================================================================

// Action enum — closed list per D-Rd10-11. Named constants per CLAUDE.md
// "no magic strings" rule.
const APPLY_DISPOSITION_ACTION_RELEASE = 'release';
const APPLY_DISPOSITION_ACTION_KEEP = 'keep';
const APPLY_DISPOSITION_ACTION_ESCALATE = 'escalate';
const APPLY_DISPOSITION_ACTIONS = [
  APPLY_DISPOSITION_ACTION_RELEASE,
  APPLY_DISPOSITION_ACTION_KEEP,
  APPLY_DISPOSITION_ACTION_ESCALATE,
];

// Format the canonical APPLY_DISPOSITION HEAL-LOG body line. Grep-stable
// shape — token order matches AC-4 + AC-5 assertions in
// test/heal-apply-disposition.test.cjs.
function _formatApplyDispositionLine(nowIso, itemId, priorStatus, priorClaimedAt, action, newStatus) {
  const claimedAtToken = priorClaimedAt === null || priorClaimedAt === undefined ? 'null' : priorClaimedAt;
  return `[${nowIso}] APPLY_DISPOSITION item_id=${itemId} prior_status=${priorStatus} prior_claimed_at=${claimedAtToken} action=${action} new_status=${newStatus}`;
}

// Append one APPLY_DISPOSITION line to HEAL-LOG.md.
//
// T-961 (D-Rd11-4 + CMC-Rd11-1 + R2-HS3 Cluster E): supersedes the prior
// existsSync→read→append→tmp+rename body with a one-line O_APPEND atomic
// write via appendAuditLine() — mirrors the sibling _appendStaleSweepLogLine
// substitution so both HEAL-LOG writers share the same lock-substance
// preservation contract.
async function _appendApplyDispositionLogLine(projectRoot, line) {
  const healDir = path.join(projectRoot, '.pipeline', 'heal');
  const logPath = path.join(healDir, 'HEAL-LOG.md');
  if (!fs.existsSync(healDir)) {
    fs.mkdirSync(healDir, { recursive: true });
  }
  // serialized under the HEAL-LOG lock — see _appendStaleSweepLogLine
  await withLock(logPath, async () => {
    appendAuditLine(logPath, line);
  });
}

async function healApplyDisposition({ itemId, action, projectRoot }) {
  const opName = 'heal --apply-disposition';
  validateProjectRoot(projectRoot, opName);

  // Step 2a — required-args HARD CHECK (DD-18 conservative-args). Reuses
  // the T-904 requireExplicitArgs helper for the canonical diagnostic
  // shape (lists missing flags + DD-18 policy line + exit 2). Pass the
  // local-named keys so the diagnostic surfaces "--item-id" / "--action".
  requireExplicitArgs(
    { 'item-id': itemId, action: action },
    ['item-id', 'action'],
  );

  // Step 2b — action whitelist HARD CHECK (D-Rd10-11). The diagnostic
  // cites D-Rd10-11 verbatim and enumerates the allowed actions so the
  // AC-2 stderr regex (/D-Rd10-11/ AND /release|keep|escalate/) matches.
  if (!APPLY_DISPOSITION_ACTIONS.includes(action)) {
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: --action must be one of ${APPLY_DISPOSITION_ACTIONS.join('|')} (D-Rd10-11); got '${action}'`,
    );
  }

  // Step 2c — load register via canonical-yaml.cjs loadYaml.
  const registerPath = path.join(projectRoot, REGISTER_REL);
  if (!fs.existsSync(registerPath)) {
    // No register present — item-not-found surface (the named item
    // cannot exist in a register that does not exist). Exit 6
    // (EXIT_NOT_FOUND semantic per per-op spec §4.3; numerically
    // EXIT_ILLEGAL_TRANSITION in the shared constants table — the heal
    // namespace reuses 6 for not-found because the heal op never
    // surfaces illegal-transition).
    return emitFailure(
      EXIT_ILLEGAL_TRANSITION,
      `essense-flow-tools ${opName}: item_id '${itemId}' not found in register (no register at ${REGISTER_REL})`,
    );
  }

  // T-961 (D-Rd11-4 + CMC-Rd11-1 + R2-HS3 Cluster E): wrap the read-modify-
  // write boundary in withLock(registerPath, ...). Lock-scope HARD CHECK:
  // acquired BEFORE loadYaml; released AFTER writeStateAndFingerprint +
  // _appendApplyDispositionLogLine; stdout emit runs OUTSIDE the lock so
  // the JSON envelope cannot tear a concurrent observer's disk state.
  const result = await withLock(registerPath, async () => {
    let register;
    try {
      register = await loadYaml(registerPath);
    } catch (e) {
      return {
        kind: 'failure',
        code: EXIT_YAML_PARSE,
        message: `essense-flow-tools ${opName}: ${REGISTER_REL} parse failed: ${e.message}`,
      };
    }
    if (!register || typeof register !== 'object') register = { entries: [] };
    if (!Array.isArray(register.entries)) register.entries = [];

    // Step 2d — locate entry.
    const target = register.entries.find((e) => e && e.item_id === itemId);
    if (!target) {
      return {
        kind: 'failure',
        code: EXIT_ILLEGAL_TRANSITION,
        message: `essense-flow-tools ${opName}: item_id '${itemId}' not found in register`,
      };
    }

    // Step 2e — capture priorState snapshot for HEAL-LOG audit trail.
    const priorClaimedAt = target.claimed_at == null ? null : target.claimed_at;
    const priorStatus = target.status;

    // Step 2f — apply action per per-op spec semantics (authoritative per
    // D-Rd11-2 closing Cluster B — per-op spec supersedes the T-940 task-spec
    // divergence for keep claimed_at refresh + stdout shape).
    switch (action) {
      case APPLY_DISPOSITION_ACTION_RELEASE: {
        target.status = 'open';
        target.claimed_at = null;
        break;
      }
      case APPLY_DISPOSITION_ACTION_KEEP: {
        // Refresh claimed_at to "now" per per-op spec L70 (R2-SD5; D-Rd11-2
        // closing Cluster B). Status untouched — remains 'in_progress'. The
        // refresh ensures the next staleness sweep re-evaluates from the
        // user-affirmed keep instant rather than the original (stale) claim,
        // matching the semantic intent of the keep disposition. HEAL-LOG line
        // below records the user-affirmed keep event (audit trail per DD-19).
        target.claimed_at = new Date().toISOString();
        break;
      }
      case APPLY_DISPOSITION_ACTION_ESCALATE: {
        target.status = 'escalated';
        target.escalated_at = new Date().toISOString();
        // claimed_at preserved as evidence per DD-10 audit-trail integrity.
        break;
      }
      default: {
        // Unreachable — whitelist already enforced above. Defense-in-depth:
        // if the whitelist drifts in the future the switch surfaces the
        // gap rather than silently falling through with no mutation.
        return {
          kind: 'failure',
          code: EXIT_TYPE_MISMATCH,
          message: `essense-flow-tools ${opName}: unhandled action '${action}' (internal error — whitelist/switch desync)`,
        };
      }
    }

    // Step 2g — persist via T-939 wrapper (HARD CHECK DD-10 audit-trail
    // integrity hash mandate). writeStateAndFingerprint handles tmp+rename
    // + SHA-256 fingerprint sidecar.
    try {
      const dir = path.dirname(registerPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await writeStateAndFingerprint(registerPath, register);
    } catch (e) {
      return {
        kind: 'failure',
        code: EXIT_GENERIC,
        message: `essense-flow-tools ${opName}: register write failed (${e.message}); no HEAL-LOG entry written`,
      };
    }

    // Step 2h — append HEAL-LOG entry (HARD CHECK DD-19 audit-trail).
    const nowIso = new Date().toISOString();
    const logLine = _formatApplyDispositionLine(
      nowIso,
      itemId,
      priorStatus,
      priorClaimedAt,
      action,
      target.status,
    );
    try {
      await _appendApplyDispositionLogLine(projectRoot, logLine);
    } catch (e) {
      return {
        kind: 'failure',
        code: EXIT_GENERIC,
        message: `essense-flow-tools ${opName}: register updated but HEAL-LOG append failed for ${itemId} (${e.message}); audit-trail incomplete`,
      };
    }

    return {
      kind: 'success',
      payload: {
        ok: true,
        op: 'heal --apply-disposition',
        item_id: itemId,
        action: action,
        prior_status: priorStatus,
        new_status: target.status,
        heal_log_path: path.join('.pipeline', 'heal', 'HEAL-LOG.md'),
        last_updated: nowIso,
      },
    };
  });

  // Lock released — emit OUTSIDE the lock scope (CMC-Rd11-1 lock-substance
  // preservation: stdout emit cannot tear concurrent observer state).
  if (result.kind === 'failure') {
    return emitFailure(result.code, result.message);
  }
  // Step 2i — emit success JSON envelope on stdout, single line, 8 keys
  // per per-op spec heal-apply-disposition.md L106-117 (canonical shape,
  // authoritative per DD-12 (b); D-Rd12-4 (i) closure 2026-05-14T14:30Z
  // aligns live handler to spec — drift keys claimed_at + exit_code
  // removed; canonical ok + op added). Key order matches spec verbatim:
  //   ok, op, item_id, action, prior_status, new_status,
  //   heal_log_path, last_updated.
  process.stdout.write(JSON.stringify(result.payload) + '\n');
  process.exit(EXIT_OK);
}

// ============================================================================
// Op: task-spec-write-section (S9 Round-9 — per task spec T-903 + DD-17)
// ----------------------------------------------------------------------------
// Sole writer of task-spec section-level edits. Co-exists with whole-doc
// task-spec-write per DD-17 binding constraint #2 (no modification to existing
// op surface). Schema-strict reject per DD-17 binding constraint #1: any
// validation failure on the supplied section body emits diagnostic naming the
// failing constraint and exits non-zero — NO soft-warn, NO partial write.
// Atomic write via tmp + rename (target.<section>.tmp-section -> target).
// ============================================================================

// Section names accepted by --section (closed list per behavioral_pseudocode
// step 3). Authored in pseudocode order for grep parity.
const TASK_SPEC_SECTION_NAMES = [
  'goal',
  'requirements_traced',
  'file_write_contract',
  'test_completion_contract',
  'dependencies',
  'agency_level',
  'agency_rationale',
  'behavioral_pseudocode',
  'acceptance_criteria',
  'cli_op_evaluation',
  'propagation_block',
];

const REQ_ID_PREFIX_PATTERN_T903 = /^(FR-|NFR-|DD-|D-Rd|AC-|CMC-)/;

async function taskSpecWriteSection({ taskId, section, body, projectRoot }) {
  const opName = 'task-spec-write-section';
  const _missingT903 = [];
  if (taskId === undefined || taskId === null || taskId === '') _missingT903.push('task-id');
  if (section === undefined || section === null || section === '') _missingT903.push('section');
  if (body === undefined || body === null) _missingT903.push('body');
  if (_missingT903.length > 0) {
    process.stderr.write(
      `essense-flow-tools ${opName}: missing required flags: ${_missingT903.map((f) => '--' + f).join(', ')}\n`,
    );
    process.stderr.write(
      'explicit-args policy (DD-18): NO inference from cursor.yaml or state.yaml. Pass each field explicitly.\n',
    );
    process.exit(EXIT_DEGRADED);
  }
  if (!TASK_ID_PATTERN.test(taskId)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools ${opName}: --task-id '${taskId}' does not match accepted pattern /${TASK_ID_PATTERN.source}/ (uppercase prefix + hyphen + slug per references/schemas/task-spec.schema.yaml)`,
    );
  }
  if (!TASK_SPEC_SECTION_NAMES.includes(section)) {
    return emitFailure(
      EXIT_TYPE_MISMATCH,
      `essense-flow-tools ${opName}: --section '${section}' is not in valid section list [${TASK_SPEC_SECTION_NAMES.join(', ')}]`,
    );
  }
  let bodyText;
  if (body === '-') {
    bodyText = fs.readFileSync(0, 'utf8');
  } else {
    bodyText = String(body);
  }
  const root = projectRoot || process.cwd();
  const searchBaseDirsT903 = [
    path.join(root, '.pipeline', 'architecture', 'sprints'),
    path.join(root, 'architecture', 'sprints'),
    path.join(root, 'sprints'),
  ];
  let targetPath = null;
  for (const baseDir of searchBaseDirsT903) {
    if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) continue;
    for (const sprintEntry of fs.readdirSync(baseDir)) {
      const candidate = path.join(baseDir, sprintEntry, 'tasks', `${taskId}.yaml`);
      if (fs.existsSync(candidate)) {
        targetPath = candidate;
        break;
      }
    }
    if (targetPath) break;
  }
  if (!targetPath) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools ${opName}: target task spec not found for --task-id '${taskId}' under ${root} (searched .pipeline/architecture/sprints/*, architecture/sprints/*, sprints/*)`,
    );
  }
  let parsedTarget;
  try {
    parsedTarget = await loadYaml(targetPath);
  } catch (e) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: target ${targetPath} YAML parse failed: ${e.message}`,
    );
  }
  if (!parsedTarget || typeof parsedTarget !== 'object' || Array.isArray(parsedTarget)) {
    return emitFailure(
      EXIT_YAML_PARSE,
      `essense-flow-tools ${opName}: target ${targetPath} YAML parse failed: top-level value must be a mapping`,
    );
  }
  const SCALAR_STRING_SECTIONS_T903 = new Set([
    'goal', 'agency_rationale', 'behavioral_pseudocode', 'propagation_block', 'agency_level',
  ]);
  let parsedBody;
  if (SCALAR_STRING_SECTIONS_T903.has(section)) {
    parsedBody = bodyText.replace(/\n$/, '');
  } else {
    try {
      parsedBody = await loadYamlString(bodyText);
    } catch (e) {
      return emitFailure(
        EXIT_YAML_PARSE,
        `essense-flow-tools ${opName}: --body YAML parse failed for section '${section}': ${e.message}`,
      );
    }
  }
  const validation = validateTaskSpecSectionBody(section, parsedBody);
  if (!validation.ok) {
    return emitFailure(
      EXIT_PROJECT_ROOT_BAD,
      `essense-flow-tools ${opName}: --body for section '${section}' rejected: ${validation.reason} (no soft-warn per DD-17 strict ship gate)`,
    );
  }
  parsedTarget[section] = parsedBody;
  const canonical = await dumpYaml(parsedTarget);
  const tmpPath = `${targetPath}.tmp-section`;
  fs.writeFileSync(tmpPath, canonical, 'utf8');
  // T-975 (D-Rd12-12): ESF_TEST_FAIL_AFTER_TMP is a test-only mid-write
  // crash hook used by AC-Rd9-M1-003-5 atomicity test. Consolidated to the
  // canonical writeStateAndFingerprint pattern (L329-L334): throw + tmp
  // cleanup (no more process.exit(99) divergent path). isTestMode() gate
  // (D-Rd10-14 opt-in: NODE_ENV=test or ESF_TEST_MODE=1) prevents the
  // production binary from firing the branch on stray env vars. The throw
  // surfaces through the main `.catch` at end-of-file (exit 1 generic).
  if (isTestMode() && process.env.ESF_TEST_FAIL_AFTER_TMP === '1') {
    // Best-effort cleanup of orphan tmp before raising (target file
    // unchanged because rename never happens).
    try { fs.unlinkSync(tmpPath); } catch (_e) { /* ignore */ }
    throw new Error('taskSpecWriteSection: ESF_TEST_FAIL_AFTER_TMP injected fault');
  }
  fs.renameSync(tmpPath, targetPath);
  return emitSuccess({
    ok: true,
    op: 'task-spec-write-section',
    task_id: taskId,
    section,
    target_path: targetPath,
    bytes_written: Buffer.byteLength(canonical, 'utf8'),
  });
}

function validateTaskSpecSectionBody(section, body) {
  switch (section) {
    case 'goal':
      if (typeof body !== 'string' || body.trim() === '') {
        return { ok: false, reason: `goal must be non-empty string, got ${JSON.stringify(body)}` };
      }
      return { ok: true };
    case 'requirements_traced': {
      if (!Array.isArray(body)) {
        return { ok: false, reason: `requirements_traced must be array, got ${typeof body}` };
      }
      if (body.length < 1) {
        return { ok: false, reason: `requirements_traced array length ${body.length} below required minimum 1` };
      }
      for (const entry of body) {
        if (typeof entry !== 'string' || !REQ_ID_PREFIX_PATTERN_T903.test(entry)) {
          return {
            ok: false,
            reason: `requirements_traced entry ${JSON.stringify(entry)} does not match required prefix pattern /${REQ_ID_PREFIX_PATTERN_T903.source}/`,
          };
        }
      }
      return { ok: true };
    }
    case 'file_write_contract': {
      // Canonical shape per references/schemas/task-spec.schema.yaml: `paths`
      // array (+ optional out_of_contract, scratch_space). This case used to
      // require `allowed`/`forbidden` — contradicting validateTaskSpecTypes
      // in this same file. Section writes now validate the same shape whole-
      // doc writes do.
      const res = validateAgainstSchema({ file_write_contract: body }, {
        artifact: 'task-spec-section',
        fields: { file_write_contract: TASK_SPEC_SCHEMA.fields.file_write_contract },
      });
      if (!res.ok) {
        return { ok: false, reason: `${res.key} invalid: expected ${res.expected}, got ${res.observed}` };
      }
      return { ok: true };
    }
    case 'test_completion_contract': {
      // Canonical shape per references/schemas/task-spec.schema.yaml: array
      // of {id, description, check}. This case used to require a
      // {policy, threshold} mapping — a shape nothing else in the pipeline
      // produced or consumed.
      const res = validateAgainstSchema({ test_completion_contract: body }, {
        artifact: 'task-spec-section',
        fields: { test_completion_contract: TASK_SPEC_SCHEMA.fields.test_completion_contract },
      });
      if (!res.ok) {
        return { ok: false, reason: `${res.key} invalid: expected ${res.expected}, got ${res.observed}` };
      }
      return { ok: true };
    }
    case 'dependencies': {
      if (!Array.isArray(body)) {
        return { ok: false, reason: `dependencies must be array (may be empty), got ${typeof body}` };
      }
      for (const d of body) {
        if (typeof d !== 'string' || !TASK_ID_PATTERN.test(d)) {
          return {
            ok: false,
            reason: `dependencies entry ${JSON.stringify(d)} does not match task-id pattern /${TASK_ID_PATTERN.source}/`,
          };
        }
      }
      return { ok: true };
    }
    case 'agency_level':
      if (!TASK_SPEC_AGENCY_LEVELS.includes(body)) {
        return {
          ok: false,
          reason: `agency_level must be one of [${TASK_SPEC_AGENCY_LEVELS.join(', ')}], got ${JSON.stringify(body)}`,
        };
      }
      return { ok: true };
    case 'agency_rationale':
      if (typeof body !== 'string' || body.trim() === '') {
        return { ok: false, reason: `agency_rationale must be non-empty string, got ${JSON.stringify(body)}` };
      }
      return { ok: true };
    case 'behavioral_pseudocode': {
      if (typeof body !== 'string' || body.trim() === '') {
        return { ok: false, reason: `behavioral_pseudocode must be non-empty string, got ${JSON.stringify(body)}` };
      }
      if (!/HARD CHECK/i.test(body)) {
        return {
          ok: false,
          reason: 'behavioral_pseudocode requires at least one /HARD CHECK/i line (DD-17 strict ship gate); pass via stdin with HARD CHECK marker, or use whole-doc task-spec-write for agency_level=open task variants',
        };
      }
      return { ok: true };
    }
    case 'acceptance_criteria': {
      if (!Array.isArray(body) || body.length < 1) {
        return {
          ok: false,
          reason: `acceptance_criteria must be array length>=1, got ${JSON.stringify(body)}`,
        };
      }
      for (const ac of body) {
        if (!ac || typeof ac !== 'object' || Array.isArray(ac)) {
          return { ok: false, reason: `acceptance_criteria entry must be mapping, got ${JSON.stringify(ac)}` };
        }
        for (const k of ['id', 'description', 'bash_check']) {
          if (typeof ac[k] !== 'string' || ac[k].trim() === '') {
            return {
              ok: false,
              reason: `acceptance_criteria entry missing or empty required key '${k}': ${JSON.stringify(ac)}`,
            };
          }
        }
      }
      return { ok: true };
    }
    case 'cli_op_evaluation': {
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { ok: false, reason: `cli_op_evaluation must be mapping, got ${typeof body}` };
      }
      if (typeof body.inclusion_criterion !== 'string' || body.inclusion_criterion.trim() === '') {
        return {
          ok: false,
          reason: `cli_op_evaluation.inclusion_criterion must be non-empty string (per DD-12-a), got ${JSON.stringify(body.inclusion_criterion)}`,
        };
      }
      if (typeof body.rejection_check !== 'string' || body.rejection_check.trim() === '') {
        return {
          ok: false,
          reason: `cli_op_evaluation.rejection_check must be non-empty string (per DD-12-a), got ${JSON.stringify(body.rejection_check)}`,
        };
      }
      return { ok: true };
    }
    case 'propagation_block': {
      if (typeof body !== 'string' || body.trim() === '') {
        return { ok: false, reason: `propagation_block must be non-empty string, got ${JSON.stringify(body)}` };
      }
      const tokens = ['Limits-awareness', 'Positive mindset', 'Quality ownership', 'Propagation'];
      for (const tok of tokens) {
        if (!body.includes(tok)) {
          return {
            ok: false,
            reason: `propagation_block missing required token '${tok}' (4 tokens required: ${tokens.join(', ')})`,
          };
        }
      }
      return { ok: true };
    }
    default:
      return { ok: false, reason: `unknown section '${section}' (internal error; section list / validator desync)` };
  }
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
      'Ops implemented (S7 + S8 + S9.1 + S9.2 + S9.3 + S9.4 + S9.5 + S9.6 + S9.7 — 2026-05-08):',
      '  init context | architect | build | review | verify | research | triage | elicit | heal',
      '  state-reconcile [--apply] --project-root <dir>',
      '      → compares the state.yaml cache against artifact inference (the',
      '        artifacts ARE the state). Report-only by default; --apply rebuilds',
      '        the cache from disk when they disagree and inference is confident.',
      '      → JSON describing skill (canonical paths, ordered_steps, sub_agents).',
      '        context returns multi-mode shape (ordered_steps_by_mode + per_phase_artifact_map).',
      '        heal returns descriptive strings for phase_from/phase_to/transitions (D-2 closed).',
      '  step-advance --skill <name> --next-step <step> [--mode <init|status|next>] [--project-root <p>]',
      '      → advance per-skill cursor at <project-root>/.pipeline/cursor.yaml',
      '        monotonic-by-construction; --mode required for --skill=context only',
      '        --next-step skill-complete + cursor on last step → cursor deleted',
      '  step-advance --cursor <path>   [T-901 round-9 new-schema branch per D-Rd9-7]',
      '      → increments DD-15 cursor.step_index by 1; clears step_emitted_at;',
      '        sole mutator of step_index for new-schema cursors (next-step is read-only).',
      '  next-step --skill <name> --cursor <path>   [T-901 round-9 — DD-15]',
      '      → emits SKILL.md step N substance per cursor.step_index; refreshes',
      '        cursor.step_emitted_at; preserves step_index (idempotent replay D-Rd9-7).',
      '        Skills: elicit | research | architect | build | verify | review.',
      '        Auto-initializes cursor at step 1 when --cursor path missing (cross-ref T-905).',
      '        Test-only: env ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR overrides SKILL.md source dir.',
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
      '  state-force-set-phase --value <phase> --reason <text> [--allow-canonical-recovery]  [heal-only repair op]',
      '      → illegal-phase recovery; bypasses legal-transition assertion BUT preserves',
      '        canonical-phase-list validation. Recovery-only guard: refuses if current phase',
      '        is canonical AND state non-degraded. Atomic-append HEAL-LOG.md FIRST, then state.yaml.',
      '        Per cli-spec §5 2026-05-08 Addendum §1.6.',
      '  cursor-rewind  [heal-only repair op]',
      '      → delete .pipeline/cursor.yaml (idempotent; no-op when absent). Atomic-append',
      '        HEAL-LOG.md cursor_rewinds[]. Per cli-spec §5 2026-05-08 Addendum §1.7.',
      '  cursor-init --skill <name> --cursor <path>   [T-905 round-9 — DD-15 + D-Rd9-7]',
      '      → initialize fresh cursor.yaml at <path> for <skill> (one of elicit, research,',
      '        architect, build, verify, review) OR migrate a legacy cursor missing optional',
      '        fields to the canonical DD-15 schema. total_steps auto-derived by parsing the',
      '        skill SKILL.md numbered headings. Atomic write (tmp+rename). Strict on',
      '        type/enum/range malformation (no auto-repair → exit 6).',
      '  heal --sweep-stale-claims [--auto-release] [--project-root <p>]   [T-918 round-9 DD-19]',
      '      → scan .pipeline/outstanding-work-register.yaml for in_progress entries whose',
      '        claimed_at age > per-skill threshold (SKILL.md `stale_claim_threshold_hours`,',
      '        default 24h via DEFAULT_STALE_THRESHOLD_HOURS). With --auto-release: batch-flips',
      '        stale entries status → open, clears claimed_at, appends one STALE_SWEEP line per',
      '        item to .pipeline/heal/HEAL-LOG.md (disposition=unclaimed-by-auto-release).',
      '        Without --auto-release: emits one AskUserQuestion JSON block per stale candidate',
      '        on stdout (options: unclaim / keep claimed / keep but flag stale-acknowledged).',
      '        Backward-compat: entries lacking claimed_at are SKIPPED, never throw.',
      '  heal --apply-disposition --item-id <id> --action <release|keep|escalate>   [T-940 round-10 D-Rd10-11]',
      '        per-item disposition op; mirrors --sweep-stale-claims --interactive surface;',
      '        emits HEAL-LOG APPLY_DISPOSITION line; updates register via writeStateAndFingerprint.',
      '        Mutually exclusive with --sweep-stale-claims (DD-18 one-sub-op-per-invocation).',
      '',
      'All 9 canonical skills now wired (S9.7 closes the per-skill phase). S10 next.',
      'See redesign/cli-spec.md and redesign/init-spec.md.',
    ].join('\n') + '\n',
  );
}

// ============================================================================
// Test-only exports (T-953 round-11 D-Rd11-6)
// ============================================================================
// The IIFE below runs the CLI dispatcher with side effects (state writes,
// stdout JSON, process.exit). Wrapping it in `require.main === module` lets
// us expose pure-function helpers (evalDispatchPredicate, evaluatePredicate)
// to test files via `require()` WITHOUT triggering CLI dispatch.
//
// Test-export convention: this is the first time tools.cjs exposes a
// module.exports surface. Prior tests interact via spawnSync (see
// test-mode-guard.test.cjs, task-spec-write-section.test.cjs etc.) — that
// pattern remains the convention for CLI behavior tests. The module.exports
// surface below is reserved for pure-function unit tests where spawning is
// wasteful (evalDispatchPredicate has no I/O, no CLI surface, no env-var
// dependence). Future pure helpers may be added here following the same
// principle: I/O-free, CLI-invariant.
module.exports = {
  // T-953 dispatch-sufficiency predicate side (R2-SD1 + R2-SD9 cluster A).
  evalDispatchPredicate,
  // Exported for downstream consumers that want to test the full predicate
  // dispatch including the new dispatch-sufficiency arm. Existing CLI
  // behavior is unchanged when invoked via the binary entry point.
  evaluatePredicate,
  // Exposed for test introspection of the closed phrase table — tests
  // assert exact 3-entry shape + longest-prefix ordering invariant.
  DISPATCH_PHRASES,
  // T-959 (D-Rd11-6 cluster A reader side): pure helpers for the alignment
  // counter parity + shortfall reader. _loadAlignmentCounters is I/O-bearing
  // but takes injected `projectRoot` + `yamlMod` so unit tests can stage
  // fixtures in mkdtempSync sandboxes. _alignmentCounterParityFindings is
  // pure (counters in -> findings out). Exposed for both spawnSync CLI tests
  // and pure-function tests.
  _loadAlignmentCounters,
  _alignmentCounterParityFindings,
  // T-972 (D-Rd12-3 (i)): expose the wrapped appendHealLog substrate so the
  // concurrent-write regression test can spawn N child_process workers each
  // invoking the substrate directly (without piggybacking on a CLI op that
  // has its own state.yaml race conditions). The test asserts that after N
  // concurrent calls the frontmatter parses + all N entries land + all N
  // body lines land — the lock-substance preservation contract per
  // CMC-Rd11-1 extended to M1 per the substance (i) ruling.
  appendHealLog,
  // v0.13.4 L1: expose evalCountPredicate so the class-pattern-ack regression
  // test can stage frontmatter fixtures via mkdtempSync and assert the
  // subtractKey semantics directly without spawning a full CLI op. The
  // function is pure (reads file, returns {ok, kind, observed}); no I/O beyond
  // the explicit `fullPath`. Mirrors evalDispatchPredicate's test-export
  // convention above (pure-function, I/O-injected).
  evalCountPredicate,
};

// ============================================================================
// Main
// ============================================================================
if (require.main === module) (async () => {
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
      if (args._sub && INIT_DISPATCH[args._sub]) {
        const json = await INIT_DISPATCH[args._sub]()(projectRoot);
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
      // S9.7 — last per-skill wire-up. All 9 canonical skills now have init
      // dispatchers above. This branch should be unreachable; emit an
      // internal-error if it fires (would indicate a SKILLS list / dispatcher
      // table desync, the recurrence-pattern row 10 shape that S9.7 closes).
      return emitFailure(
        EXIT_INIT_LOOKUP_FAIL,
        `essense-flow-tools init: skill '${args._sub}' is in canonical SKILLS list but no init dispatcher branch matched; internal error post-S9.7 (see redesign/STATE.md S9.7 row)`,
      );
    }
    case 'step-advance': {
      await stepAdvance({
        skill: args.skill,
        nextStep: args['next-step'],
        mode: args.mode,
        projectRoot,
        // T-901 (S9 round-9): when only --cursor is provided (no --skill /
        // --next-step), route through new-schema increment branch per D-Rd9-7.
        cursorPathArg: args.cursor,
      });
      return;
    }
    case 'next-step': {
      // T-901 (S9 round-9) — DD-15 + D-Rd9-7. New-schema cursor reader/emitter.
      // T-921 round-10 F2 + D-Rd10-3: passes --from-cursor through so nextStep
      // can call applyCursorInference (restoring DD-18 binding architect-MAY-
      // propose opt-in inference path). parseArgs sets bare-flag to `true`.
      await nextStep({
        skill: args.skill,
        cursorPathArg: args.cursor,
        fromCursor: args['from-cursor'] === true,
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
    case 'architect-test-baseline-write': {
      // T-1006 / D-Sprint10-5 / DD-7 / META-GAP Q3: capture pre-pack test
      // baseline JSON. Companion gate lives inside taskSpecWrite (V2b).
      await architectTestBaselineWrite({ projectRoot });
      return;
    }
    case 'task-spec-write-section': {
      // T-903 — section-level task-spec writer. Co-exists with whole-doc
      // task-spec-write per DD-17 binding constraint #2.
      await taskSpecWriteSection({
        taskId: args['task-id'],
        section: args.section,
        body: args.body,
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
    case 'arch-alignment-check': {
      // T-902 (Sprint 9, Module 1) — DD-20 (e) + DD-12 + DD-18 + DD-21.
      // Require --sub-arch-return-path explicitly per DD-18 (no inference).
      // requireExplicitArgs from T-904 helper emits DD-18 diagnostic + exit 2.
      requireExplicitArgs(args, ['sub-arch-return-path']);
      // T-929 (D-Rd10-15): --project-dir is the canonical flag name.
      // --project-root is the stale round-9 scaffold name accepted for the
      // round-10 migration window; cli-spec doc amend (future round, M2)
      // deprecates --project-root. Explicit --project-dir wins.
      await archAlignmentCheck({
        subArchReturnPath: args['sub-arch-return-path'],
        projectRootArg: args['project-dir'] || args['project-root'],
      });
      return;
    }
    case 'state-reconcile': {
      await stateReconcile({ projectRoot: args['project-root'], apply: args.apply === true });
      break;
    }
    case 'state-force-set-phase': {
      await stateForceSetPhase({
        rawValue: args.value,
        reason: args.reason,
        // S10.5 2026-05-09 Addendum: opt-in flag bypasses recovery-only guard
        // for adversarial-stress-test scenarios (see cli-spec §5 2026-05-09
        // Addendum). parseArgs returns true for bare flags (no value follows).
        allowCanonicalRecovery: args['allow-canonical-recovery'] === true,
        projectRoot,
      });
      return;
    }
    case 'cursor-rewind': {
      await cursorRewind({ projectRoot });
      return;
    }
    // ------------------------------------------------------------------
    // T-905 cursor-init (Round-9 DD-15 + D-Rd9-7). Initializes a fresh
    // cursor.yaml at --cursor for the named --skill OR migrates a legacy
    // cursor (missing optional fields) to the canonical DD-15 schema.
    // Schema lives in lib/cursor-schema.cjs (single-source-of-truth shared
    // with next-step T-901). Atomic-write tmp+rename. Per-op spec at
    // redesign/cli-spec/ops/cursor-init.md (DD-12 (b) 8-section standard).
    // ------------------------------------------------------------------
    case 'cursor-init': {
      await cursorInit({
        skill: args.skill,
        cursorPath: args.cursor,
      });
      return;
    }
    // ------------------------------------------------------------------
    // (F1 dead-arm removal, T-921 round-10 D-Rd10-3): the T-904 scaffold
    // duplicate dispatch arm for the next-step op lived here. Deleted in
    // T-921's coordinated rewrite — the FIRST dispatch arm (above, ~line
    // 4875, which delegates to the real nextStep() body) is the surviving
    // canonical dispatch. The scaffold's applyCursorInference +
    // requireExplicitArgs pattern moved INTO nextStep()'s body so it executes
    // on every invocation (the second arm was dead code since JS switch
    // dispatches on the first matching arm). DD-18 binding architect-MAY-
    // propose contract still honored — see nextStep() Phase A.
    // ------------------------------------------------------------------
    // T-919 register-add + register-list (closure-plan round-9 DD-19 +
    // DD-10 + D-Rd9-2). Schema doc at redesign/cli-spec.md §1.7.5.
    // claimed_at stamping rule: status === 'in_progress' → stamp now ISO8601.
    // Backward-compat: legacy entries (no claimed_at) read OK on register-list.
    // D-Rd9-2 set-based-stays-sole verdict: NO push/pop access-pattern ops
    // authored (rejected per D-Rd9-2 — set-based register stays sole).
    // DD-19 cited: claimed_at is the load-bearing field for stale-claim sweep
    // (heal-op T-918) + drift-10 audit (T-913).
    // ------------------------------------------------------------------
    case 'register-add': {
      await registerAdd({
        itemId: args['item-id'],
        kind: args.kind,
        closureCriterion: args['closure-criterion'],
        sourceArtifact: args['source-artifact'],
        sourceAnchor: args['source-anchor'],
        targetPhase: args['target-phase'],
        targetSprint: args['target-sprint'],
        status: args.status,
        addedBy: args['added-by'],
        projectRoot,
      });
      return;
    }
    case 'register-list': {
      await registerList({
        statusFilter: args.status,
        targetPhase: args['target-phase'],
        targetSprint: args['target-sprint'],
        projectRoot,
      });
      return;
    }
    // ------------------------------------------------------------------
    // T-918 heal --sweep-stale-claims (closure-plan round-9 DD-19 +
    // D-Rd9-6 + DD-10 + DD-21). Extends the existing `heal` CLI surface
    // with the required --sweep-stale-claims sub-flag (DD-18 conservative-
    // args policy: explicit flag, no inference). Couples with drift-11
    // audit (M4 T-913) layered defense per DD-19.
    //
    // T-940 heal --apply-disposition (Sprint 9 round-10 D-Rd10-11 + DD-19
    // + DD-10 + DD-18 + FR-F21). Adds the writer/mutator side of the
    // DD-19 stale-claim disposition pair. Master invokes once per stale
    // item carrying --item-id + --action <release|keep|escalate>. Per
    // DD-18 conservative-args policy: explicit flags only, no inference.
    // ------------------------------------------------------------------
    case 'heal': {
      // Sub-op routing — heal carries two routable surfaces after T-940:
      //   1. --sweep-stale-claims (T-918) — read/surface side.
      //   2. --apply-disposition  (T-940) — write/mutate side.
      // Other /heal substance (Discover/Infer/Propose/Apply) is master-
      // driven via init heal + step-advance + state-set-phase / state-
      // force-set-phase / cursor-rewind ops; those do not flow through
      // this case arm.
      //
      // Mutual-exclusion HARD CHECK (DD-18 conservative-args policy):
      // one sub-op per invocation. Master must choose: read OR write,
      // never both in the same call. The combined invocation has no
      // defined semantics (which would win? sweep is read-only, apply
      // is write-only — silent precedence is exactly the failure mode
      // DD-18 exists to close).
      const _sweepFlag = args['sweep-stale-claims'] === true;
      const _applyFlag = args['apply-disposition'] === true;
      if (_sweepFlag && _applyFlag) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          `essense-flow-tools heal: --sweep-stale-claims and --apply-disposition are mutually exclusive (DD-18 conservative-args policy: one sub-op per invocation). Pick one.`,
        );
      }
      if (_applyFlag) {
        await healApplyDisposition({
          itemId: args['item-id'],
          action: args.action,
          projectRoot,
        });
        return;
      }
      if (_sweepFlag) {
        await healSweepStaleClaims({
          autoRelease: args['auto-release'] === true,
          projectRoot,
        });
        return;
      }
      // Neither sub-flag was passed — heal as a top-level op only
      // accepts these two routable surfaces today.
      return emitFailure(
        EXIT_ARG_MISSING_OR_BAD,
        `essense-flow-tools heal: one of --sweep-stale-claims (T-918) or --apply-disposition (T-940) is required (see --help; DD-18 conservative-args policy).`,
      );
    }
    case 'review-pattern-debt-sweep': {
      // round-loop-closure R7 (Move 4 L-8 core). Re-runs prior-sprint rule sweeps;
      // emits recurrence-findings for NEW hits not in prior round's resolved set.
      const projectRoot = args['project-root'] || process.cwd();
      const maxRounds = args['max-rounds'] ? parseInt(args['max-rounds'], 10) : undefined;
      const timeoutMs = args['budget-timeout-ms'] ? parseInt(args['budget-timeout-ms'], 10) : undefined;
      const decisionsFile = args['decisions-file'] || path.join(projectRoot, '.pipeline', 'architecture', 'decisions.yaml');
      const outputFormat = args['output-format'] || 'json';
      const fsLocal = require('node:fs');
      const yamlLocal = await yaml();
      const debtSweeper = require('../lib/pattern-debt-sweep.cjs');
      let decisions = [];
      try {
        const text = fsLocal.readFileSync(decisionsFile, 'utf8');
        const parsed = yamlLocal.load(text);
        decisions = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.decisions) ? parsed.decisions : []);
      } catch (err) {
        // Non-fatal: empty decisions means no rules to replay; pattern-debt still surfaces
        // "rule-not-in-current-decisions" advisories.
      }
      const result = debtSweeper.sweepPatternDebt({projectRoot, decisions, maxRounds, timeoutMs});
      if (!result.ok) {
        return emitFailure(EXIT_VALIDATION_FAIL, `essense-flow-tools review-pattern-debt-sweep: ${result.error}`);
      }
      if (outputFormat === 'json') {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        process.stdout.write(`[review-pattern-debt-sweep] prior_rounds_found: ${result.prior_rounds_found}\n`);
        for (const r of result.replays) {
          process.stdout.write(`  [round ${r.round}] ${r.rule_id} status=${r.status} new_hits=${r.new_hits ? r.new_hits.length : 0}\n`);
          if (r.new_hits) {
            for (const h of r.new_hits) {
              process.stdout.write(`    - ${h.file_path}:${h.line}\n`);
            }
          }
        }
        process.stdout.write(`[review-pattern-debt-sweep] result: ${result.sweep_partial ? 'PARTIAL' : 'COMPLETE'}\n`);
      }
      return;
    }
    case 'review-rule-sweep': {
      // round-loop-closure R6 (Move 4 L-7 core). Run a rule's applies_to sweep
      // across project source; emit candidate hits annotated with intentional_exception.
      const ruleId = args['rule-id'];
      const projectRoot = args['project-root'] || process.cwd();
      const outputFormat = args['output-format'] || 'json';
      const timeoutMs = args['budget-timeout-ms'] ? parseInt(args['budget-timeout-ms'], 10) : undefined;
      const decisionsFile = args['decisions-file'] || path.join(projectRoot, '.pipeline', 'architecture', 'decisions.yaml');
      if (!ruleId) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          "essense-flow-tools review-rule-sweep: --rule-id <id> is required",
        );
      }
      const fsLocal = require('node:fs');
      const yamlLocal = await yaml();
      const sweeper = require('../lib/rule-sweep.cjs');
      const validator = require('../lib/decision-schema-validator.cjs');
      let text;
      try {
        text = fsLocal.readFileSync(decisionsFile, 'utf8');
      } catch (err) {
        return emitFailure(
          EXIT_PROJECT_ROOT_BAD,
          `essense-flow-tools review-rule-sweep: cannot read ${decisionsFile}: ${err.message}`,
        );
      }
      let parsed;
      try { parsed = yamlLocal.load(text); }
      catch (err) {
        return emitFailure(EXIT_YAML_PARSE, `essense-flow-tools review-rule-sweep: YAML parse failed: ${err.message}`);
      }
      const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.decisions) ? parsed.decisions : null);
      if (!list) {
        return emitFailure(EXIT_REQUIRED_KEY, `essense-flow-tools review-rule-sweep: ${decisionsFile} must contain decision list`);
      }
      const rule = list.find((d) => d && d.id === ruleId);
      if (!rule) {
        return emitFailure(EXIT_PREREQ_MISSING, `essense-flow-tools review-rule-sweep: rule '${ruleId}' not found in ${decisionsFile}`);
      }
      const validation = validator.validateDecision(rule);
      if (!validation.ok) {
        return emitFailure(EXIT_VALIDATION_FAIL, `essense-flow-tools review-rule-sweep: rule '${ruleId}' failed schema validation: ${validation.errors.join('; ')}`);
      }
      const result = sweeper.sweepRule(rule, projectRoot, {timeoutMs});
      if (!result.ok) {
        return emitFailure(EXIT_VALIDATION_FAIL, `essense-flow-tools review-rule-sweep: ${result.error}`);
      }
      if (outputFormat === 'json') {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        process.stdout.write(`[review-rule-sweep] rule_id: ${result.rule_id}\n`);
        process.stdout.write(`[review-rule-sweep] kind: ${result.kind}\n`);
        process.stdout.write(`[review-rule-sweep] files_scanned: ${result.files_scanned}\n`);
        process.stdout.write(`[review-rule-sweep] candidates: ${result.candidates.length}\n`);
        for (const c of result.candidates) {
          const tag = c.intentional_exception_candidate ? '[EXEMPT]' : '[CANDIDATE]';
          process.stdout.write(`  ${tag} ${c.file_path}:${c.line}: ${c.surrounding_text}\n`);
        }
        process.stdout.write(`[review-rule-sweep] result: ${result.sweep_partial ? 'PARTIAL' : 'COMPLETE'}\n`);
      }
      return;
    }
    case 'spec-rule-validate': {
      // round-loop-closure R5 (DD-RLC-2). Validates each decision in a
      // decisions.yaml file against references/decision-schema.yaml. Used by
      // L-7 lens before sweep + by alignment-lens criterion-7 (R12).
      const decisionsFile = args['decisions-file'];
      if (!decisionsFile) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          "essense-flow-tools spec-rule-validate: --decisions-file <path> is required",
        );
      }
      const fsLocal = require('node:fs');
      const yamlLocal = await yaml();
      const validator = require('../lib/decision-schema-validator.cjs');
      let text;
      try {
        text = fsLocal.readFileSync(decisionsFile, 'utf8');
      } catch (err) {
        return emitFailure(
          EXIT_PROJECT_ROOT_BAD,
          `essense-flow-tools spec-rule-validate: cannot read ${decisionsFile}: ${err.message}`,
        );
      }
      let parsed;
      try {
        parsed = yamlLocal.load(text);
      } catch (err) {
        return emitFailure(
          EXIT_YAML_PARSE,
          `essense-flow-tools spec-rule-validate: YAML parse failed for ${decisionsFile}: ${err.message}`,
        );
      }
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray(parsed.decisions) ? parsed.decisions : null);
      if (!list) {
        return emitFailure(
          EXIT_REQUIRED_KEY,
          `essense-flow-tools spec-rule-validate: ${decisionsFile} must be a YAML list or have top-level 'decisions:' array`,
        );
      }
      const result = validator.validateDecisionsList(list);
      // Report per-decision PASS/FAIL.
      const lines = [];
      lines.push(`[spec-rule-validate] decisions_file: ${decisionsFile}`);
      lines.push(`[spec-rule-validate] decisions_total: ${result.per_decision.length}`);
      let passCount = 0;
      let failCount = 0;
      for (const d of result.per_decision) {
        if (d.ok) {
          lines.push(`[spec-rule-validate] PASS ${d.id}`);
          passCount++;
        } else {
          lines.push(`[spec-rule-validate] FAIL ${d.id}`);
          for (const e of d.errors) {
            lines.push(`  - ${e}`);
          }
          failCount++;
        }
      }
      lines.push(`[spec-rule-validate] result: ${result.ok ? 'PASS' : 'FAIL'} (${passCount} pass, ${failCount} fail)`);
      process.stdout.write(lines.join('\n') + '\n');
      if (!result.ok) process.exit(EXIT_PREREQ_MISSING);
      return;
    }
    default:
      return emitFailure(
        EXIT_UNKNOWN_OP,
        `essense-flow-tools: unknown op '${args._op}' (run with --help for ops list)`,
      );
  }
})().catch((err) => {
  // T-956 / D-Rd11-11: ShapeValidationError thrown by lib/state.js readState
  // (or its post-parse validateStateShape) exits with EXIT_REQUIRED_KEY (17).
  // Diagnostic carries the field-name + observed/expected shape from the
  // structured error details so the failure surface names the violation
  // precisely (closes Surprise-2 silent-partial-parse failure mode).
  if (err && err.name === 'ShapeValidationError') {
    process.stderr.write(`essense-flow-tools: ${err.message}\n`);
    if (process.env.ESSENSE_FLOW_DEBUG) console.error(err.stack);
    process.exit(EXIT_REQUIRED_KEY);
  }
  process.stderr.write(`essense-flow-tools: unhandled error: ${err.message}\n`);
  if (process.env.ESSENSE_FLOW_DEBUG) console.error(err.stack);
  process.exit(1);
});
