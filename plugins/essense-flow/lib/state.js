// state.js — read/write .pipeline/state.yaml, validate transitions.
//
// Honours degraded states explicitly:
//   missing   → returns { phase: 'idle', degraded: 'missing' }
//   corrupt   → returns { phase: 'idle', degraded: 'corrupt', reason }
//   valid     → returns the parsed state with degraded: null
//
// Per Graceful-Degradation: degraded reads never throw. Callers see the
// degradation state and decide what to do — typically emit a warning and
// continue with looser permissions.
//
// Per Fail-Soft: writeState rejects only illegal transitions (a state
// machine integrity violation). Resource conditions never reject.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const STATE_PATH_REL = ".pipeline/state.yaml";
const TRANSITIONS_PATH = join(PLUGIN_ROOT, "references/transitions.yaml");
const DEFAULT_STATE_PATH = join(PLUGIN_ROOT, "defaults/state.yaml");

// ---- T-956 / D-Rd11-11 / R2-HS8: state.yaml shape validator ----
//
// Post-parse shape validation rejects malformed state.yaml at the parse
// boundary instead of letting downstream consumers hit undefined-field at
// runtime far from the failure site. Closes Surprise-2 regression (mis-
// indented tool_results_paths silently accepted as partial structure).
//
// Contract per D-Rd11-11 (closed 2026-05-14):
//   - REQUIRED: schema_version (=1), phase (in transitions.phases),
//               last_updated (ISO8601 string).
//   - OPTIONAL: sprint, wave, sprint_complete_at, sprint_summary,
//               known_open_concerns, elicitation, research, triage,
//               architecture, sprinting, decomposition, verify,
//               halt_resolution-history (literal hyphenated key).
//   - Required missing OR type-mismatch -> throw ShapeValidationError
//     (with observed-shape diagnostic; tools.cjs main catch exits 17).
//   - Unknown top-level key -> WARN to stderr; do NOT throw (preserves
//     Graceful-Degradation + forward-compat).

const REQUIRED_SCHEMA_VERSION = 1;
const ISO8601_RX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
// ALLOWED_PHASES is sourced fresh from references/transitions.yaml on the
// first validate call (canonical transitions module per cli-spec §3.1).
// loadTransitions() below caches the parsed yaml; we mirror that cache here
// to avoid sync-vs-async re-entry. If transitions yaml is unreadable at
// validate time the validator surfaces an explicit ShapeValidationError
// naming the canonical-source failure rather than silently inventing a list.
const REQUIRED_KEYS = new Set(["schema_version", "phase", "last_updated"]);
const OPTIONAL_KEYS = new Set([
  "sprint",
  // Hotfix v0.13.1 DD-15 (per 2026-05-16 closure-reopening decision in
  // redesign/06-decisions.md): sprint_iteration is a positive-int counter
  // for re-runs of the same sprint number (fix-only follow-ups). Closes
  // the user pattern of inventing string sprint labels like "3-PATCH-2".
  // Type-checked in validateStateShape below; default null per defaults/
  // state.yaml until first iteration is recorded by a CLI op.
  "sprint_iteration",
  "wave",
  "sprint_complete_at",
  "sprint_summary",
  "known_open_concerns",
  "elicitation",
  "research",
  "triage",
  "architecture",
  "sprinting",
  "decomposition",
  "verify",
  "halt_resolution-history",
  // D-Rd12-2 (closed 2026-05-14): halt_* keys legitimately ship in
  // defaults/state.yaml + are runtime-emitted by halt-recovery / drift-
  // tracking surfaces. Enumerate here to eliminate spurious WARN on every
  // CLI invocation against /init-fresh state. Forward-compat WARN-but-don't-
  // fail on unknown keys preserved per D-Rd11-11.
  "halt_resolution",
  "halted_on_drift",
  "halt_reason",
]);

export class ShapeValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ShapeValidationError";
    this.code = "ESHAPE";
    this.details = details || {};
  }
}

// Hotfix v0.13.2 F1 helpers — module-scope so they allocate once at module
// load rather than on every validateStateShape call. Each helper throws
// ShapeValidationError with details.field naming the offender (dotted form
// for nested fields). Used by validateStateShape below to mirror the typed-
// parser contracts enforced by the SETTERS map at
// bin/essense-flow-tools.cjs:1704-1748.

function checkOptionalObject(stateObj, parentName) {
  if (!(parentName in stateObj)) return null;
  const v = stateObj[parentName];
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) {
    throw new ShapeValidationError(
      `state-shape: ${parentName} must be null or an object; got ${JSON.stringify(v)} (type ${typeof v})`,
      {
        field: parentName,
        expected: "null | object",
        observed: v,
      },
    );
  }
  return v;
}

function checkNestedNonNegInt(parent, parentName, field) {
  if (parent === null) return;
  if (!(field in parent)) return;
  const v = parent[field];
  if (v === null) return;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new ShapeValidationError(
      `state-shape: ${parentName}.${field} must be null or a non-negative integer; got ${JSON.stringify(v)} (type ${typeof v}). Set via the matching state-set-* CLI op rather than direct YAML edit.`,
      {
        field: `${parentName}.${field}`,
        expected: "null | non-negative integer",
        observed: v,
      },
    );
  }
}

function checkNestedIso8601(parent, parentName, field) {
  if (parent === null) return;
  if (!(field in parent)) return;
  const v = parent[field];
  if (v === null) return;
  if (typeof v !== "string" || !ISO8601_RX.test(v)) {
    throw new ShapeValidationError(
      `state-shape: ${parentName}.${field} must be null or an ISO8601 UTC string (e.g. '2026-05-14T07:30:00.000Z'); got ${JSON.stringify(v)} (type ${typeof v}). Set via the matching state-set-* CLI op rather than direct YAML edit.`,
      {
        field: `${parentName}.${field}`,
        expected: "null | ISO8601 UTC string",
        observed: v,
      },
    );
  }
}

// validateStateShape — synchronous post-parse validator. `allowedPhases`
// MUST be provided by the caller (typically readState, which already
// awaits loadTransitions()). Synchronous to keep the throw site one step
// away from the parse — no async boundary swallows the diagnostic.
export function validateStateShape(stateObj, allowedPhases) {
  // Top-level type guard. Null / non-object inputs are an immediate shape
  // failure — distinct from "empty state.yaml" which readState handles via
  // its own degraded path BEFORE calling validate.
  if (stateObj === null || typeof stateObj !== "object" || Array.isArray(stateObj)) {
    throw new ShapeValidationError(
      `state-shape: expected object at top level; got ${stateObj === null ? "null" : typeof stateObj}`,
      { expected: "object", observed: stateObj === null ? "null" : typeof stateObj },
    );
  }

  const observedKeys = Object.keys(stateObj);

  // Required-key presence. Throw on FIRST missing key; include observed
  // top-level key list in the diagnostic so failure points name the
  // surrounding shape (critical for surprise-2-style mis-indented YAML
  // where the wrong keys are surfaced at top level).
  for (const k of REQUIRED_KEYS) {
    if (!(k in stateObj)) {
      throw new ShapeValidationError(
        `state-shape: missing required key '${k}'; observed top-level keys: [${observedKeys.join(", ")}]`,
        {
          missing: k,
          expected: Array.from(REQUIRED_KEYS),
          observed: observedKeys,
        },
      );
    }
  }

  // schema_version must equal the locked constant.
  if (stateObj.schema_version !== REQUIRED_SCHEMA_VERSION) {
    throw new ShapeValidationError(
      `state-shape: schema_version must equal ${REQUIRED_SCHEMA_VERSION}; got ${JSON.stringify(stateObj.schema_version)} (type ${typeof stateObj.schema_version})`,
      {
        field: "schema_version",
        expected: REQUIRED_SCHEMA_VERSION,
        observed: stateObj.schema_version,
      },
    );
  }

  // phase must be one of the canonical transitions phases. If the caller
  // failed to pass an allowedPhases list, that's a programming error in
  // the caller (readState always passes it). Surface as ShapeValidationError
  // so the diagnostic propagates the same way as data-shape failures.
  if (!Array.isArray(allowedPhases) || allowedPhases.length === 0) {
    throw new ShapeValidationError(
      "state-shape: validator invoked without allowedPhases; canonical transitions list unavailable",
      { field: "phase", expected: "non-empty array", observed: allowedPhases },
    );
  }
  if (!allowedPhases.includes(stateObj.phase)) {
    throw new ShapeValidationError(
      `state-shape: phase '${stateObj.phase}' not in canonical transitions; allowed: [${allowedPhases.join(", ")}]`,
      {
        field: "phase",
        expected: allowedPhases,
        observed: stateObj.phase,
      },
    );
  }

  // last_updated must be an ISO8601 UTC string. The transitions.yaml +
  // record format both stamp ISO8601 with milliseconds; accept either
  // millisecond-precision or seconds-precision forms via the regex.
  if (typeof stateObj.last_updated !== "string" || !ISO8601_RX.test(stateObj.last_updated)) {
    throw new ShapeValidationError(
      `state-shape: last_updated must be an ISO8601 UTC string (e.g. '2026-05-14T07:30:00.000Z'); got ${JSON.stringify(stateObj.last_updated)} (type ${typeof stateObj.last_updated})`,
      {
        field: "last_updated",
        expected: "ISO8601 UTC string",
        observed: stateObj.last_updated,
      },
    );
  }

  // Hotfix v0.13.1 Fix-3 (per 2026-05-16 closure-reopening decision in
  // redesign/06-decisions.md): when present, `sprint` must be a positive
  // integer. Closes the asymmetry between the CLI write op
  // `state-set-sprint` (which already enforces parsePositiveIntOrNull at
  // bin/essense-flow-tools.cjs:1707) and the shape validator (previously
  // accepted any value for sprint). Direct YAML writes that placed string
  // sprint ids like "3-PATCH-2" into state.yaml previously passed shape
  // validation and broke `<n>` substitution downstream at
  // bin/essense-flow-tools.cjs:1844 + :2159.
  if ("sprint" in stateObj && stateObj.sprint !== null) {
    if (
      typeof stateObj.sprint !== "number" ||
      !Number.isInteger(stateObj.sprint) ||
      stateObj.sprint < 1
    ) {
      throw new ShapeValidationError(
        `state-shape: sprint must be null or a positive integer; got ${JSON.stringify(stateObj.sprint)} (type ${typeof stateObj.sprint}). Set via 'state-set-sprint --value <int>' rather than direct YAML edit. Re-runs of the same sprint number use the sprint_iteration field (DD-15, optional int) instead of suffix naming like '3-PATCH-2'.`,
        {
          field: "sprint",
          expected: "null | positive integer",
          observed: stateObj.sprint,
        },
      );
    }
  }

  // Hotfix v0.13.1 DD-15 (per 2026-05-16 closure-reopening decision):
  // `sprint_iteration` is an optional positive-integer counter for re-runs
  // of the SAME sprint number (e.g. fix-only sprint follow-ups). Sprint id
  // stays a positive int; iteration counts independently. Closes the user
  // pattern of inventing string sprint labels like "3-PATCH-2". Predicate
  // path templates remain on `<n>` for sprint id only — iteration does NOT
  // enter canonical paths unless a future increment adds it.
  if ("sprint_iteration" in stateObj && stateObj.sprint_iteration !== null) {
    if (
      typeof stateObj.sprint_iteration !== "number" ||
      !Number.isInteger(stateObj.sprint_iteration) ||
      stateObj.sprint_iteration < 1
    ) {
      throw new ShapeValidationError(
        `state-shape: sprint_iteration must be null or a positive integer; got ${JSON.stringify(stateObj.sprint_iteration)} (type ${typeof stateObj.sprint_iteration})`,
        {
          field: "sprint_iteration",
          expected: "null | positive integer",
          observed: stateObj.sprint_iteration,
        },
      );
    }
  }

  // Hotfix v0.13.2 F1 (per 2026-05-16 v0.13.2 closure-reopening decision in
  // redesign/06-decisions.md): mirror the typed-parser contracts enforced by
  // the SETTERS map at bin/essense-flow-tools.cjs:1704-1748. Closes BS-4
  // asymmetry pattern-class beyond v0.13.1 Fix-3 sprint — wave, the 3 round
  // fields (elicitation.round / research.round / decomposition.round), and
  // the 6 ISO8601 *_at fields (elicitation.started_at + elicitation.
  // completed_at + research.completed_at + triage.completed_at + architecture
  // .completed_at + verify.completed_at) all carried CLI-write-op contracts
  // (parsePositiveIntOrNull / parseNonNegInt / parseIso8601) that were not
  // mirrored in the shape validator; direct YAML writes that bypassed the
  // state-set-* family could place malformed values that broke downstream
  // consumers silently — same structural shape as sprint asymmetry which
  // Fix-3 closed for one field at a time.
  //
  // Type-mismatch surfaces as ShapeValidationError with details.field naming
  // the offender — dotted form for nested fields (e.g. 'elicitation.round',
  // 'architecture.completed_at'). Field-check order: wave first (top-level),
  // then per-parent block (elicitation, research, triage, architecture,
  // decomposition, verify). Within each parent: validate parent is null or
  // object, then validate each contracted child field. Each parent key is
  // OPTIONAL at the top level + each child key is OPTIONAL within the
  // parent — absence is accepted (defaults/state.yaml carries each parent
  // with null child values).

  // wave: null or positive integer (mirrors parsePositiveIntOrNull at
  // bin/essense-flow-tools.cjs:1711).
  if ("wave" in stateObj && stateObj.wave !== null) {
    if (
      typeof stateObj.wave !== "number" ||
      !Number.isInteger(stateObj.wave) ||
      stateObj.wave < 1
    ) {
      throw new ShapeValidationError(
        `state-shape: wave must be null or a positive integer; got ${JSON.stringify(stateObj.wave)} (type ${typeof stateObj.wave}). Set via 'state-set-wave --value <int>' rather than direct YAML edit.`,
        {
          field: "wave",
          expected: "null | positive integer",
          observed: stateObj.wave,
        },
      );
    }
  }

  // Nested-field checks. Each parent key may be absent / null / a populated
  // object; only populated-object case triggers child-field checks. Helpers
  // hoisted to module scope above to avoid per-call re-allocation.

  const elicitation = checkOptionalObject(stateObj, "elicitation");
  checkNestedNonNegInt(elicitation, "elicitation", "round");
  checkNestedIso8601(elicitation, "elicitation", "started_at");
  checkNestedIso8601(elicitation, "elicitation", "completed_at");

  const research = checkOptionalObject(stateObj, "research");
  checkNestedNonNegInt(research, "research", "round");
  checkNestedIso8601(research, "research", "completed_at");

  const triage = checkOptionalObject(stateObj, "triage");
  checkNestedIso8601(triage, "triage", "completed_at");

  const architecture = checkOptionalObject(stateObj, "architecture");
  checkNestedIso8601(architecture, "architecture", "completed_at");
  // architecture.round + architecture.escalation_signoff have NO CLI write op
  // — per D-Sprint10-4 M-5 round budget, the round counter is read at
  // bin/essense-flow-tools.cjs:1376 with a defensive
  // `Number.isInteger(archBlock.round) ? archBlock.round : 0` guard so non-
  // int values default to 0 (no silent breakage of the round-budget gate).
  // BS-4 mirror does NOT apply here because there is no write-op contract
  // to mirror. Out of v0.13.2 F1 scope; future-increment may add either a
  // state-set-architecture-round op + mirror, OR validator-only enforcement
  // without a CLI op. Same reasoning applies to escalation_signoff (read at
  // :1379 expecting null or non-empty string).

  const decomposition = checkOptionalObject(stateObj, "decomposition");
  checkNestedNonNegInt(decomposition, "decomposition", "round");

  const verify = checkOptionalObject(stateObj, "verify");
  checkNestedIso8601(verify, "verify", "completed_at");

  // Unknown top-level keys: WARN-only, do NOT throw. Forward-compat per
  // D-Rd11-11 (Graceful-Degradation principle preserved).
  const unknownKeys = observedKeys.filter(
    (k) => !REQUIRED_KEYS.has(k) && !OPTIONAL_KEYS.has(k),
  );
  if (unknownKeys.length > 0) {
    process.stderr.write(
      `state-shape WARN: unknown top-level key(s) in state.yaml: [${unknownKeys.join(", ")}]; ignoring (forward-compat). If these are intentional, add to lib/state.js OPTIONAL_KEYS.\n`,
    );
  }

  return true;
}

let _transitionsCache = null;

export async function loadTransitions() {
  if (_transitionsCache) return _transitionsCache;
  const raw = await readFile(TRANSITIONS_PATH, "utf8");
  _transitionsCache = yaml.load(raw);
  return _transitionsCache;
}

export async function loadDefaultState() {
  const raw = await readFile(DEFAULT_STATE_PATH, "utf8");
  return yaml.load(raw);
}

export function statePath(projectRoot) {
  return join(projectRoot, STATE_PATH_REL);
}

export async function readState(projectRoot) {
  const path = statePath(projectRoot);
  if (!existsSync(path)) {
    return { phase: "idle", degraded: "missing", path };
  }
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    // Filesystem read errors (permission, EIO) stay on the degraded='corrupt'
    // path — they are I/O failures, not shape failures. Heal/recovery flows
    // that read with {force: true} expect this branch to still surface a
    // structured object rather than throw.
    return {
      phase: "idle",
      degraded: "corrupt",
      reason: `read failed: ${err.code || err.message}`,
      path,
    };
  }
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    // T-956 / AC-7: yaml-parse failure is wrapped as ShapeValidationError
    // (was: degraded='corrupt'). Per D-Rd11-11 the parse-error case shares
    // the same exit-17 fate as shape-validation failures — both surface
    // structural state.yaml problems that downstream consumers must NOT
    // silently inherit.
    throw new ShapeValidationError(
      `state-shape: yaml parse failed for ${path}: ${err.message}`,
      { field: "yaml", reason: err.message, path },
    );
  }
  if (parsed === null || parsed === undefined || typeof parsed !== "object") {
    // Empty file or scalar root — same fate as parse failure.
    throw new ShapeValidationError(
      `state-shape: state file is empty or not an object at ${path}`,
      { field: "root", observed: typeof parsed, path },
    );
  }
  // Canonical transitions list sourced fresh from references/transitions.yaml
  // (loadTransitions caches in-process). Synchronous validateStateShape runs
  // post-parse.
  //
  // D-Rd12-1 (closed 2026-05-14): shape-validation failure no longer raises
  // through readState. Catch the ShapeValidationError and return a degraded
  // marker so downstream consumers (writeState force:true recovery,
  // state-force-set-phase handler, context-inject + next-step hooks) can
  // branch on `degraded === 'corrupt'` without try/catch. Layered defense
  // preserved: stderr WARN carries the diagnostic; tools.cjs catch sites
  // previously exiting on ShapeValidationError throw retained for IMPORT-
  // time failures only (path NOT FOUND, parse error pre-shape-validation).
  //
  // Throw sites preserved (NOT wrapped here):
  //   - yaml.load throw -> rewrapped as ShapeValidationError (field:'yaml')
  //     at L223 above; still throws (parse-error path).
  //   - empty/non-object root -> ShapeValidationError (field:'root') at
  //     L230 above; still throws.
  // Only the validateStateShape(...) post-parse-success branch converts.
  const transitions = await loadTransitions();
  try {
    validateStateShape(parsed, transitions.phases);
  } catch (err) {
    if (err && err.name === "ShapeValidationError") {
      process.stderr.write(
        `state-shape WARN: ${err.message} (returning degraded marker per D-Rd12-1)\n`,
      );
      // Conditional spread: if parsed somehow fails the object guard (defensive
      // — validateStateShape already gates this), spread an empty object so the
      // returned shape stays addressable. Consumers branch on degraded='corrupt'
      // + shape_error fields; they MUST tolerate absent canonical keys.
      const safeParsed =
        parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      return {
        ...safeParsed,
        degraded: "corrupt",
        shape_error: {
          name: err.name,
          code: err.code,
          message: err.message,
          details: err.details || {},
        },
        path,
      };
    }
    throw err;
  }
  return { ...parsed, degraded: null, path };
}

export async function assertLegalTransition(from, to) {
  const transitions = await loadTransitions();
  if (from === to) return { ok: true, transition: null, identity: true, requires: null };
  for (const [name, t] of Object.entries(transitions.transitions)) {
    if (t.from === from && t.to === to) {
      return {
        ok: true,
        transition: name,
        identity: false,
        requires: t.requires || null,
      };
    }
  }
  return {
    ok: false,
    reason: `no legal transition from ${from} to ${to}`,
    transition: null,
    requires: null,
  };
}

export async function writeState(projectRoot, nextState, options = {}) {
  const path = statePath(projectRoot);
  const current = await readState(projectRoot);

  // From a degraded read, allow heal/init to repair via {force: true}.
  // Without force, a degraded current state blocks transition writes
  // (a corrupt state file is a state-machine integrity violation —
  // exactly the kind of thing that warrants explicit recovery, not a
  // silent overwrite).
  if (current.degraded && !options.force) {
    return {
      ok: false,
      reason: `current state is degraded (${current.degraded}); pass {force: true} to overwrite`,
      degraded: current.degraded,
    };
  }

  const fromPhase = current.degraded ? null : current.phase;
  const toPhase = nextState.phase;

  // S10.5 2026-05-09 — bypassLegalTransition option for heal-only repair ops
  // (state-force-set-phase). The comment in essense-flow-tools.cjs documented
  // intent "{force: true} bypasses both degraded-block AND legal-transition
  // assertion", but the implementation only bypassed the degraded-block. This
  // option closes the impl-vs-spec gap explicitly: callers that need full
  // recovery semantics pass both flags. Default behavior (force only) still
  // enforces legal-transition assertion to preserve finalize.js / legacy
  // caller correctness.
  if (fromPhase !== null && fromPhase !== undefined && !options.bypassLegalTransition) {
    const legal = await assertLegalTransition(fromPhase, toPhase);
    if (!legal.ok) {
      return { ok: false, reason: legal.reason };
    }
  }

  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const merged = {
    ...nextState,
    last_updated: new Date().toISOString(),
  };
  const yamlText = yaml.dump(merged, { lineWidth: 100, noRefs: true });
  await writeFile(path, yamlText, "utf8");
  return { ok: true, path, phase: toPhase };
}

export async function initState(projectRoot) {
  const path = statePath(projectRoot);
  if (existsSync(path)) {
    return { ok: false, reason: "state already exists", path };
  }
  const defaults = await loadDefaultState();
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const yamlText = yaml.dump(
    { ...defaults, last_updated: new Date().toISOString() },
    { lineWidth: 100, noRefs: true },
  );
  await writeFile(path, yamlText, "utf8");
  return { ok: true, path };
}

// Test-only: clear the transitions cache so a test can swap fixtures.
export function _resetTransitionsCache() {
  _transitionsCache = null;
}
