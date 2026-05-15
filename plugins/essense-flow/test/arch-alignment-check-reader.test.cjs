// arch-alignment-check-reader.test.cjs — covers AC-1..AC-5 from T-959 (Sprint 9 round-11).
//
// Runner: node --test plugins/essense-flow/test/arch-alignment-check-reader.test.cjs
//   (must exit 0 for must-pass policy).
// Built-in node:test + node:assert; js-yaml from plugin's own node_modules
// (the plugin declares js-yaml ^4.1.0 as a direct dep).
//
// Coverage:
//   AC-1: 3 sources parity — all equal value 3, threshold 3, no bootstrap →
//         no FAIL kind in {alignment-counter-drift, alignment-dispatch-shortfall,
//         alignment-dispatch-absent}.
//   AC-2: divergent sources (manifest=3, state=2, decisions=3) → FAIL
//         alignment-counter-drift emitted (severity fatal).
//   AC-3: shortfall (observed=2, threshold=3, bootstrap_exemption=false) →
//         FAIL alignment-dispatch-shortfall (NOT alignment-counter-drift).
//   AC-4: bootstrap_exemption=true + observed=0 (no counters in any source) →
//         no FAIL kind (bootstrap suppresses both shortfall + absent).
//   AC-5: state.yaml absent / state field absent → skip from parity (so
//         parity does NOT fire even when manifest != state in absence); the
//         shortfall check proceeds against present sources.
//
// Closes R2-C2 cluster A reader-side per D-Rd11-6.
//
// Read this before doing anything:
//   - Limits-awareness: Claude drifts, loses context, finishes prematurely,
//     defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
//     5 ACs each get one binary check; do NOT collapse.
//   - Positive mindset: every parity/shortfall edge has a defined kind; the
//     reader covers them all.
//   - Quality ownership: round-close discipline gate — drift hides if this
//     test is shy. Be specific.
//   - Propagation requirement: future readers / sources MUST preserve the
//     { kind, severity, sources/observed/threshold, reason } finding shape.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// --- Path constants (no magic strings per repo CLAUDE.md) ----------------
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TOOLS_PATH = path.join(PLUGIN_ROOT, 'bin', 'essense-flow-tools.cjs');
// js-yaml resolves from the plugin's own node_modules — same convention as
// arch-alignment-check.test.cjs (the plugin declares js-yaml ^4.1.0 as a
// direct dep). We require by name; node resolves into PLUGIN_ROOT/node_modules.
const yaml = require('js-yaml');

const FIXTURE_SPRINT = 9;
const FIXTURE_ROUND = 11;
const COUNTER_FIELD = 'alignment_lens_dispatches_per_round';
const SUB_DISPATCH_THRESHOLD = 3;
const SUB_ARCH_RETURN_NAME = 'sub-arch-return.md';

// --- Helpers -------------------------------------------------------------

// Build a minimal sub-arch return markdown file with frontmatter carrying
// `sprint` + `architect_round` (the two fields the reader consults to
// resolve which round_<N> block to read from each source).
function buildSubArchReturnContent({ sprint, architectRound }) {
  // Empty internal_decisions_added + cross_module_concerns_surfaced so the
  // pre-existing criterion 1/3 readers do NOT emit findings. No fenced
  // task-spec yaml blocks => criterion 2/4/5/6 do not emit either.
  // Reader-only failures surface deterministically.
  const fm = {
    schema_version: 1,
    sprint,
    architect_round: architectRound,
    module: 'M0',
    internal_decisions_added: [],
    cross_module_concerns_surfaced: [],
  };
  return [
    '---',
    yaml.dump(fm).trimEnd(),
    '---',
    '',
    '# Sub-arch return (test fixture)',
    '',
    '(no task specs — reader-only test)',
    '',
  ].join('\n');
}

// Build manifest.yaml content with the 3 counter-affecting fields:
//   - alignment_lens_dispatches_per_round_<N>  (suffix-form, present on disk
//      for rounds >= 10) AND/OR round_<N>_alignment_lens_dispatches_per_round
//      (round-prefix form per spec). Tests use the suffix form because that
//      matches the actual disk shape observed in tmp-spike-CLOSURE.
//   - sub_architect_dispatches  (threshold; top-level when N=initial round)
//   - bootstrap_exemption_round_<N>  (round-specific bootstrap flag).
// Pass null for `alignmentDispatches` to omit the manifest counter entirely
// (AC-5 absence semantics).
function buildManifestContent({ sprint, round, alignmentDispatches, threshold, bootstrapExempt }) {
  const obj = {
    schema_version: 1,
    sprint,
  };
  if (alignmentDispatches !== null && alignmentDispatches !== undefined) {
    obj[`alignment_lens_dispatches_per_round_${round}`] = alignmentDispatches;
  }
  if (threshold !== null && threshold !== undefined) {
    obj.sub_architect_dispatches = threshold;
  }
  if (bootstrapExempt === true) {
    obj[`bootstrap_exemption_round_${round}`] = true;
  } else if (bootstrapExempt === false) {
    obj[`bootstrap_exemption_round_${round}`] = false;
  }
  return yaml.dump(obj);
}

// Build state.yaml content with architecture.round_<N>.alignment_lens_dispatches_per_round.
// Pass null to omit the field entirely (AC-5 absence semantics).
function buildStateContent({ round, alignmentDispatches }) {
  const obj = {
    schema_version: 1,
    phase: 'architecture',
    last_updated: '2026-05-14T00:00:00.000Z',
    architecture: {},
  };
  if (alignmentDispatches !== null && alignmentDispatches !== undefined) {
    obj.architecture[`round_${round}`] = {
      alignment_lens_dispatches_per_round: alignmentDispatches,
    };
  } else {
    obj.architecture[`round_${round}`] = {};
  }
  return yaml.dump(obj);
}

// Build decisions.yaml content with round_<N>_sub_architect_dispatches.alignment_lens_dispatches_per_round.
function buildDecisionsContent({ round, alignmentDispatches }) {
  const obj = {};
  if (alignmentDispatches !== null && alignmentDispatches !== undefined) {
    obj[`round_${round}_sub_architect_dispatches`] = {
      alignment_lens_dispatches_per_round: alignmentDispatches,
    };
  }
  return yaml.dump(obj);
}

// Stage a sandbox project root with optional manifest / state / decisions
// files plus a sub-arch return markdown file. Returns the sandbox root +
// the sub-arch return path. Caller is responsible for cleanup via the
// returned cleanup function.
function stageSandbox({
  manifestSpec,
  stateSpec,
  decisionsSpec,
  subArchSpec,
  omitManifest = false,
  omitState = false,
  omitDecisions = false,
}) {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-align-reader-'));
  const pipelineDir = path.join(sandboxRoot, '.pipeline');
  const archDir = path.join(pipelineDir, 'architecture');
  const sprintDir = path.join(archDir, 'sprints', String(FIXTURE_SPRINT));
  fs.mkdirSync(sprintDir, { recursive: true });
  if (!omitManifest && manifestSpec) {
    fs.writeFileSync(path.join(sprintDir, 'manifest.yaml'), buildManifestContent(manifestSpec));
  }
  if (!omitState && stateSpec) {
    fs.writeFileSync(path.join(pipelineDir, 'state.yaml'), buildStateContent(stateSpec));
  }
  if (!omitDecisions && decisionsSpec) {
    fs.writeFileSync(path.join(archDir, 'decisions.yaml'), buildDecisionsContent(decisionsSpec));
  }
  const returnPath = path.join(sandboxRoot, SUB_ARCH_RETURN_NAME);
  fs.writeFileSync(returnPath, buildSubArchReturnContent(subArchSpec));
  return {
    sandboxRoot,
    returnPath,
    cleanup() {
      try { fs.rmSync(sandboxRoot, { recursive: true, force: true }); } catch (_e) { /* ignore */ }
    },
  };
}

function runArchAlignmentCheck({ sandboxRoot, returnPath }) {
  const result = spawnSync('node', [
    TOOLS_PATH,
    'arch-alignment-check',
    '--sub-arch-return-path', returnPath,
    '--project-dir', sandboxRoot,
  ], {
    encoding: 'utf8',
    shell: false,
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function parseFindings(stdout) {
  try {
    const parsed = yaml.load(stdout);
    if (!parsed || !Array.isArray(parsed.findings)) {
      throw new Error(`stdout did not carry findings array: ${stdout}`);
    }
    return parsed.findings;
  } catch (e) {
    throw new Error(`stdout YAML parse failed: ${e.message}\nstdout was:\n${stdout}`);
  }
}

function findingKindsOf(findings) {
  return findings
    .map((f) => f && f.kind)
    .filter((k) => typeof k === 'string');
}

// --------------------------------------------------------------------------
// AC-1: 3 sources parity yields no FAIL.
// --------------------------------------------------------------------------
test('AC-1: 3 sources parity (all=3, threshold=3, no bootstrap) yields no reader FAIL', () => {
  const stage = stageSandbox({
    manifestSpec: {
      sprint: FIXTURE_SPRINT,
      round: FIXTURE_ROUND,
      alignmentDispatches: 3,
      threshold: SUB_DISPATCH_THRESHOLD,
      bootstrapExempt: false,
    },
    stateSpec: { round: FIXTURE_ROUND, alignmentDispatches: 3 },
    decisionsSpec: { round: FIXTURE_ROUND, alignmentDispatches: 3 },
    subArchSpec: { sprint: FIXTURE_SPRINT, architectRound: FIXTURE_ROUND },
  });
  try {
    const result = runArchAlignmentCheck(stage);
    // Exit MAY be 0 (no findings) — none of the reader's kinds should fire.
    const findings = result.code === 0
      ? []
      : parseFindings(result.stdout);
    const readerKinds = findingKindsOf(findings).filter((k) =>
      ['alignment-counter-drift', 'alignment-dispatch-shortfall', 'alignment-dispatch-absent'].includes(k),
    );
    assert.deepEqual(
      readerKinds,
      [],
      `AC-1: expected no reader FAIL kinds, got ${JSON.stringify(readerKinds)} (stderr: ${result.stderr})`,
    );
    // Belt-and-suspenders: AC-1 happy path should exit 0 (no other criterion
    // fires either — empty internal_decisions / cmcs / task specs).
    assert.equal(result.code, 0, `AC-1: expected exit 0 on all-pass, got ${result.code} (stdout: ${result.stdout}, stderr: ${result.stderr})`);
  } finally {
    stage.cleanup();
  }
});

// --------------------------------------------------------------------------
// AC-2: drift (manifest=3, state=2, decisions=3) → FAIL alignment-counter-drift.
// --------------------------------------------------------------------------
test('AC-2: divergent sources emit alignment-counter-drift FAIL', () => {
  const stage = stageSandbox({
    manifestSpec: {
      sprint: FIXTURE_SPRINT,
      round: FIXTURE_ROUND,
      alignmentDispatches: 3,
      threshold: SUB_DISPATCH_THRESHOLD,
      bootstrapExempt: false,
    },
    stateSpec: { round: FIXTURE_ROUND, alignmentDispatches: 2 },
    decisionsSpec: { round: FIXTURE_ROUND, alignmentDispatches: 3 },
    subArchSpec: { sprint: FIXTURE_SPRINT, architectRound: FIXTURE_ROUND },
  });
  try {
    const result = runArchAlignmentCheck(stage);
    // Drift => findings present => exit non-zero.
    assert.notEqual(result.code, 0, `AC-2: expected non-zero exit on drift, got 0 (stdout: ${result.stdout}, stderr: ${result.stderr})`);
    const findings = parseFindings(result.stdout);
    const driftFindings = findings.filter((f) => f && f.kind === 'alignment-counter-drift');
    assert.equal(driftFindings.length, 1, `AC-2: expected exactly 1 alignment-counter-drift finding, got ${driftFindings.length} (findings: ${JSON.stringify(findings)})`);
    assert.equal(driftFindings[0].severity, 'fatal', 'AC-2: drift severity must be fatal');
    // Verify the sources list carries all 3 non-null values for forensic
    // traceability (D-Rd11-6 sources contract).
    assert.ok(Array.isArray(driftFindings[0].sources), 'AC-2: drift finding must carry sources array');
    assert.equal(driftFindings[0].sources.length, 3, `AC-2: drift sources should carry all 3 non-null counters, got ${driftFindings[0].sources.length}`);
  } finally {
    stage.cleanup();
  }
});

// --------------------------------------------------------------------------
// AC-3: shortfall observed < threshold not bootstrap-exempt emits alignment-dispatch-shortfall.
// All 3 sources agree on the shortfall value (so drift does NOT also fire);
// threshold is higher.
// --------------------------------------------------------------------------
test('AC-3: shortfall (observed=2, threshold=3, no bootstrap) emits alignment-dispatch-shortfall FAIL', () => {
  const stage = stageSandbox({
    manifestSpec: {
      sprint: FIXTURE_SPRINT,
      round: FIXTURE_ROUND,
      alignmentDispatches: 2,
      threshold: SUB_DISPATCH_THRESHOLD,
      bootstrapExempt: false,
    },
    stateSpec: { round: FIXTURE_ROUND, alignmentDispatches: 2 },
    decisionsSpec: { round: FIXTURE_ROUND, alignmentDispatches: 2 },
    subArchSpec: { sprint: FIXTURE_SPRINT, architectRound: FIXTURE_ROUND },
  });
  try {
    const result = runArchAlignmentCheck(stage);
    assert.notEqual(result.code, 0, `AC-3: expected non-zero exit on shortfall, got 0 (stdout: ${result.stdout}, stderr: ${result.stderr})`);
    const findings = parseFindings(result.stdout);
    const shortfallFindings = findings.filter((f) => f && f.kind === 'alignment-dispatch-shortfall');
    assert.equal(shortfallFindings.length, 1, `AC-3: expected exactly 1 alignment-dispatch-shortfall finding, got ${shortfallFindings.length} (findings: ${JSON.stringify(findings)})`);
    assert.equal(shortfallFindings[0].observed, 2, 'AC-3: shortfall.observed must be 2 (max of present non-null sources)');
    assert.equal(shortfallFindings[0].threshold, SUB_DISPATCH_THRESHOLD, 'AC-3: shortfall.threshold must equal sub_architect_dispatches');
    // Drift MUST NOT fire — all sources agreed.
    const driftFindings = findings.filter((f) => f && f.kind === 'alignment-counter-drift');
    assert.equal(driftFindings.length, 0, `AC-3: drift must NOT fire when sources agree; got ${driftFindings.length} drift findings`);
  } finally {
    stage.cleanup();
  }
});

// --------------------------------------------------------------------------
// AC-4: bootstrap_exemption_round_<N>=true + observed=0 (no counters in
// any source) → no FAIL kind. Bootstrap suppresses both shortfall AND
// absent. Threshold present so the suppression is the discriminating gate.
// --------------------------------------------------------------------------
test('AC-4: bootstrap exemption suppresses shortfall + absent FAILs even when observed=0', () => {
  const stage = stageSandbox({
    manifestSpec: {
      sprint: FIXTURE_SPRINT,
      round: FIXTURE_ROUND,
      alignmentDispatches: null,  // omit field — manifest counter null
      threshold: SUB_DISPATCH_THRESHOLD,
      bootstrapExempt: true,
    },
    stateSpec: { round: FIXTURE_ROUND, alignmentDispatches: null },  // omit
    decisionsSpec: { round: FIXTURE_ROUND, alignmentDispatches: null },  // omit
    subArchSpec: { sprint: FIXTURE_SPRINT, architectRound: FIXTURE_ROUND },
  });
  try {
    const result = runArchAlignmentCheck(stage);
    // All 3 absent => present.length === 0; bootstrap_exemption=true => no
    // absent FAIL. Result: no reader findings => exit 0.
    const findings = result.code === 0 ? [] : parseFindings(result.stdout);
    const readerKinds = findingKindsOf(findings).filter((k) =>
      ['alignment-counter-drift', 'alignment-dispatch-shortfall', 'alignment-dispatch-absent'].includes(k),
    );
    assert.deepEqual(
      readerKinds,
      [],
      `AC-4: bootstrap exemption must suppress reader FAILs; got ${JSON.stringify(readerKinds)} (stderr: ${result.stderr})`,
    );
    assert.equal(result.code, 0, `AC-4: expected exit 0 (no findings under bootstrap), got ${result.code} (stdout: ${result.stdout}, stderr: ${result.stderr})`);
  } finally {
    stage.cleanup();
  }
});

// --------------------------------------------------------------------------
// AC-5: state.yaml lacks the field (architecture.round_<N> missing the
// alignment_lens_dispatches_per_round entry) → state source is null,
// skipped from parity check. Parity check only fires when >1 sources
// disagree; with state null, manifest=3 and decisions=3 (both equal),
// parity does NOT fire. Shortfall check proceeds: observed=3 >= threshold=3
// => no shortfall either. So AC-5 happy path is: state absent yet remaining
// 2 sources agree + meet threshold => no reader FAIL.
// --------------------------------------------------------------------------
test('AC-5: state source absent → skip from parity; shortfall check proceeds against present sources', () => {
  const stage = stageSandbox({
    manifestSpec: {
      sprint: FIXTURE_SPRINT,
      round: FIXTURE_ROUND,
      alignmentDispatches: 3,
      threshold: SUB_DISPATCH_THRESHOLD,
      bootstrapExempt: false,
    },
    stateSpec: { round: FIXTURE_ROUND, alignmentDispatches: null },  // state lacks field
    decisionsSpec: { round: FIXTURE_ROUND, alignmentDispatches: 3 },
    subArchSpec: { sprint: FIXTURE_SPRINT, architectRound: FIXTURE_ROUND },
  });
  try {
    const result = runArchAlignmentCheck(stage);
    const findings = result.code === 0 ? [] : parseFindings(result.stdout);
    const readerKinds = findingKindsOf(findings).filter((k) =>
      ['alignment-counter-drift', 'alignment-dispatch-shortfall', 'alignment-dispatch-absent'].includes(k),
    );
    assert.deepEqual(
      readerKinds,
      [],
      `AC-5: state absent must be skipped from parity; remaining sources agree + meet threshold => no reader FAIL. Got ${JSON.stringify(readerKinds)} (stderr: ${result.stderr})`,
    );
    assert.equal(result.code, 0, `AC-5: expected exit 0, got ${result.code} (stdout: ${result.stdout}, stderr: ${result.stderr})`);
  } finally {
    stage.cleanup();
  }
});
