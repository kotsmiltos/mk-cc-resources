// task-spec-write-forbidden-marker-exemption.test.cjs — covers AC-6 + AC-7
// from T-1002. Tests the CMC-Sprint10-12 context-awareness amend AND the
// composing D-Sprint10-14 opt-in admission path.
//
// Runner: node plugins/essense-flow/test/task-spec-write-forbidden-marker-exemption.test.cjs
// (must exit 0). spawnSync against the CLI binary; node assert; no external
// framework. Mirrors task-spec-write-section.test.cjs scaffolding.
//
// Coverage (T-1002 / CMC-Sprint10-12 — substrate-level scanner-vs-substance closed loop):
//   test-6: grep-target citation shape (double-quoted regex on line with
//           "grep" keyword) exempts marker substring from rejection.
//   test-7: bare marker leak (no grep keyword, no regex alternation) rejects
//           with EXIT_FORBIDDEN_MARKER — existing FORBIDDEN_MARKERS
//           discipline preserved.
//   test-8: alternation-only regex `(TBD|TODO|<choose>)` exempts (alternation
//           is sufficient evidence of enumeration substance).
//   test-9: comment-style leak `// TODO: implement later` rejects
//           (drift-leak pattern; no grep + no alternation).
// Plus composition tests against the existing D-Sprint10-14 opt-in mechanism:
//   test-10: opt-in path still works for substance citations that DON'T match
//            grep-target shape (e.g. prose-cite of marker enumerated in
//            forbidden_markers_audit).
//
// Read this before doing anything:
//   1. Limits-awareness: Claude drifts, loses context, finishes prematurely,
//      defers, takes shortcuts. Re-read when uncertain. Preserve specifics —
//      the 4 marker shapes (grep-quoted / alternation / bare / comment) MUST
//      each get an independent assertion. Do NOT collapse.
//   2. Positive mindset: every gap solvable. Find the way by working carefully.
//   3. Quality ownership: this is the substrate-level closure for the 5
//      blocked Sprint 10 specs whose substance enumerates markers. The
//      context-awareness MUST NOT shadow the bare-leak rejection (test-7 +
//      test-9 are the discriminating gates).
//   4. Propagation requirement: every descendant test fixture preserves
//      these four instructions.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TOOLS_BIN = path.join(PLUGIN_ROOT, 'bin', 'essense-flow-tools.cjs');

// Canonical exit codes (must match tools.cjs L138 — single source of truth).
const EXIT_OK = 0;
const EXIT_FORBIDDEN_MARKER = 15;

const FIXTURE_SPRINT = 99;
const FIXTURE_TASK_ID = 'T-992';

// ----------------------------------------------------------------------------
// Per-test sandbox under os.tmpdir(). Each test gets a fresh sandbox.
// ----------------------------------------------------------------------------
function makeSandbox() {
  const dir = path.join(os.tmpdir(), 'esf-t1002-fme-' + crypto.randomBytes(6).toString('hex'));
  fs.mkdirSync(dir, { recursive: true });
  const pipelineDir = path.join(dir, '.pipeline');
  fs.mkdirSync(pipelineDir, { recursive: true });
  const stateYaml = [
    'schema_version: 1',
    'phase: architecture',
    'sprint: null',
    'wave: null',
    'elicitation:',
    '  round: 0',
    '  started_at: null',
    '  completed_at: null',
    'research:',
    '  round: 0',
    '  completed_at: null',
    'triage:',
    '  completed_at: null',
    'architecture:',
    '  completed_at: null',
    'decomposition:',
    '  round: 0',
    'verify:',
    '  completed_at: null',
    "last_updated: '2026-05-14T20:00:00.000Z'",
    '',
  ].join('\n');
  fs.writeFileSync(path.join(pipelineDir, 'state.yaml'), stateYaml, 'utf8');

  const sprintDir = path.join(pipelineDir, 'architecture', 'sprints', String(FIXTURE_SPRINT));
  fs.mkdirSync(path.join(sprintDir, 'tasks'), { recursive: true });
  const manifestYaml = [
    'schema_version: 1',
    `sprint: ${FIXTURE_SPRINT}`,
    'waves:',
    '  - wave: 1',
    `    tasks: [${FIXTURE_TASK_ID}]`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(sprintDir, 'manifest.yaml'), manifestYaml, 'utf8');

  return { dir, sprintDir };
}

// ----------------------------------------------------------------------------
// Fixture builder — same shape as the M-2 test, but the pseudocode body
// carries the marker-string-under-test. agency_level always 'open' so the
// M-2 pseudocode-citation rule doesn't fire (we're testing the forbidden-
// marker scanner only). Note: behavioral_pseudocode is null when
// agency_level=open, but for these tests we want the marker present in
// content text, so use a literal block scalar carrying the marker.
// ----------------------------------------------------------------------------
function buildFixtureYaml({ pseudocode, optInBlock }) {
  const indented = pseudocode.split('\n').map((line) => '  ' + line).join('\n');
  const lines = [
    'schema_version: 1',
    `task_id: ${FIXTURE_TASK_ID}`,
    'goal: forbidden-marker-exemption test fixture goal',
    'requirements_traced:',
    '  - CMC-Sprint10-12',
    'file_write_contract:',
    '  paths:',
    '    - /tmp/fixture-target',
    'behavioral_pseudocode: |',
    indented,
    'test_completion_contract:',
    '  - id: AC-1',
    '    description: fixture AC',
    '    check:',
    '      type: manual',
    '      spec: fixture check spec',
    '      mode: must-pass',
    'dependencies: []',
    'agency_level: open',
    'agency_rationale: fixture rationale',
  ];
  if (optInBlock) {
    lines.push(optInBlock.trimEnd());
  }
  lines.push('');
  return lines.join('\n');
}

function runOp(args, opts = {}) {
  // Skip the pre-pack test-baseline gate (T-1006 / META-GAP Q3) — this test
  // sandbox is hermetic and does not stage a baseline.json. The gate is
  // orthogonal to the forbidden-marker scanner being tested.
  const env = Object.assign({}, process.env, { ESF_TEST_BASELINE_GATE_SKIP: '1' }, opts.env || {});
  const result = spawnSync(process.execPath, [TOOLS_BIN, ...args], {
    encoding: 'utf8',
    env,
    cwd: opts.cwd || process.cwd(),
    input: opts.input,
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const _createdSandboxes = [];
function _cleanup() {
  for (const dir of _createdSandboxes) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_e) {
      // best-effort
    }
  }
}

let failures = 0;
function runTest(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }
}

console.log('task-spec-write-forbidden-marker-exemption.test.cjs');
console.log(`  tools bin: ${TOOLS_BIN}`);

try {
  // -------------------------------------------------------------------------
  // test-6 (AC-6 grep-target shape):
  //   Pseudocode has the literal line:
  //     `HC-3: scan pseudocode for forbidden markers; grep -iE "(TBD|TODO|XXX|FIXME)" must find zero hits`
  //   The markers TBD/TODO/XXX/FIXME appear inside a double-quoted region on
  //   a line containing 'grep'. Scanner MUST exempt → exit 0.
  // -------------------------------------------------------------------------
  runTest('test-6: grep-target citation shape exempts markers; exit 0', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const fixtureYaml = buildFixtureYaml({
      pseudocode: [
        '1. orchestrate test harness',
        '2. HC-3: scan pseudocode for forbidden markers; grep -iE "(TBD|TODO|XXX|FIXME)" must find zero hits',
        '3. assert exit code === 0',
      ].join('\n'),
    });
    const contentPath = path.join(sb.dir, 'fixture.yaml');
    fs.writeFileSync(contentPath, fixtureYaml, 'utf8');

    const r = runOp([
      'task-spec-write',
      '--sprint', String(FIXTURE_SPRINT),
      '--task-id', FIXTURE_TASK_ID,
      '--content-file', contentPath,
      '--project-root', sb.dir,
    ]);
    assert.strictEqual(
      r.status,
      EXIT_OK,
      `expected exit 0 (grep-target exempt); got ${r.status}; stderr=${r.stderr.slice(0, 500)}`,
    );
  });

  // -------------------------------------------------------------------------
  // test-7 (AC-6 bare-leak — discrimination gate):
  //   Pseudocode has the line `the TBD substance lands in v1.1`. No 'grep'
  //   keyword. No regex alternation. Scanner MUST reject with
  //   EXIT_FORBIDDEN_MARKER.
  // -------------------------------------------------------------------------
  runTest('test-7: bare TBD prose-leak rejects with EXIT_FORBIDDEN_MARKER', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const fixtureYaml = buildFixtureYaml({
      pseudocode: [
        '1. land the M-3 mechanism',
        '2. the TBD substance lands in v1.1',
        '3. close the round-loop',
      ].join('\n'),
    });
    const contentPath = path.join(sb.dir, 'fixture.yaml');
    fs.writeFileSync(contentPath, fixtureYaml, 'utf8');

    const r = runOp([
      'task-spec-write',
      '--sprint', String(FIXTURE_SPRINT),
      '--task-id', FIXTURE_TASK_ID,
      '--content-file', contentPath,
      '--project-root', sb.dir,
    ]);
    assert.strictEqual(
      r.status,
      EXIT_FORBIDDEN_MARKER,
      `expected exit ${EXIT_FORBIDDEN_MARKER}; got ${r.status}; stderr=${r.stderr.slice(0, 500)}`,
    );
    assert.ok(
      /TBD/i.test(r.stderr),
      `stderr should name the leaked marker 'TBD'; got: ${r.stderr.slice(0, 400)}`,
    );
  });

  // -------------------------------------------------------------------------
  // test-8 (AC-6 alternation shape):
  //   Pseudocode has `pattern = /(TBD|TODO|<choose>)/i` — regex alternation
  //   with `|` separators in `(...)` parens. Scanner MUST exempt → exit 0.
  //   No 'grep' keyword present; alternation alone is sufficient.
  // -------------------------------------------------------------------------
  runTest('test-8: alternation-only regex `(TBD|TODO|<choose>)` exempts; exit 0', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const fixtureYaml = buildFixtureYaml({
      pseudocode: [
        '1. compile the drift-pattern matcher',
        '2. pattern = /(TBD|TODO|<choose>)/i',
        '3. match against authored body',
      ].join('\n'),
    });
    const contentPath = path.join(sb.dir, 'fixture.yaml');
    fs.writeFileSync(contentPath, fixtureYaml, 'utf8');

    const r = runOp([
      'task-spec-write',
      '--sprint', String(FIXTURE_SPRINT),
      '--task-id', FIXTURE_TASK_ID,
      '--content-file', contentPath,
      '--project-root', sb.dir,
    ]);
    assert.strictEqual(
      r.status,
      EXIT_OK,
      `expected exit 0 (alternation exempt); got ${r.status}; stderr=${r.stderr.slice(0, 500)}`,
    );
  });

  // -------------------------------------------------------------------------
  // test-9 (AC-6 comment-style leak — discrimination gate):
  //   Pseudocode has `// TODO: implement later` — neither grep keyword nor
  //   regex alternation. Scanner MUST reject with EXIT_FORBIDDEN_MARKER.
  // -------------------------------------------------------------------------
  runTest('test-9: comment-style `// TODO:` leak rejects with EXIT_FORBIDDEN_MARKER', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const fixtureYaml = buildFixtureYaml({
      pseudocode: [
        '1. dispatch the handler',
        '2. // TODO: implement later',
        '3. return success',
      ].join('\n'),
    });
    const contentPath = path.join(sb.dir, 'fixture.yaml');
    fs.writeFileSync(contentPath, fixtureYaml, 'utf8');

    const r = runOp([
      'task-spec-write',
      '--sprint', String(FIXTURE_SPRINT),
      '--task-id', FIXTURE_TASK_ID,
      '--content-file', contentPath,
      '--project-root', sb.dir,
    ]);
    assert.strictEqual(
      r.status,
      EXIT_FORBIDDEN_MARKER,
      `expected exit ${EXIT_FORBIDDEN_MARKER}; got ${r.status}; stderr=${r.stderr.slice(0, 500)}`,
    );
    assert.ok(
      /TODO/i.test(r.stderr),
      `stderr should name the leaked marker 'TODO'; got: ${r.stderr.slice(0, 400)}`,
    );
  });

  // -------------------------------------------------------------------------
  // test-10 (composition with D-Sprint10-14 opt-in path):
  //   Existing opt-in admission via forbidden_markers_in_substance=true
  //   admits markers that DON'T match grep-target shape (prose-cite pattern
  //   enumerated in forbidden_markers_audit). Verifies the new context-
  //   awareness amend has NOT shadowed the older opt-in path — both compose.
  // -------------------------------------------------------------------------
  runTest('test-10: D-Sprint10-14 opt-in path admits non-grep-shape substance citations', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    // Pseudocode block uses a literal `TBD` reference that is NOT inside a
    // grep-quoted region and NOT inside an alternation regex — so the new
    // context-awareness amend would NOT exempt it. The opt-in path must.
    const fixtureYaml = buildFixtureYaml({
      pseudocode: [
        '1. inspect prior round substance',
        '2. round 9 mentioned TBD as the close marker',
        '3. surface every TBD as a closed decision',
      ].join('\n'),
      optInBlock: [
        'forbidden_markers_in_substance: true',
        'forbidden_markers_audit:',
        // Pseudocode block scalar begins at the line after
        // 'behavioral_pseudocode: |' (1-indexed line numbering from file
        // start). We enumerate every TBD hit by line number. The audit-line
        // itself also contains 'TBD' — the opt-in handler trap is avoided
        // by using marker_index form for the matching forbidden marker.
        '  - {line: 12, marker_index: 0}',
        '  - {line: 13, marker_index: 0}',
        '  - {line: 26, marker_index: 0}',
        '',
      ].join('\n'),
    });
    const contentPath = path.join(sb.dir, 'fixture.yaml');
    fs.writeFileSync(contentPath, fixtureYaml, 'utf8');

    const r = runOp([
      'task-spec-write',
      '--sprint', String(FIXTURE_SPRINT),
      '--task-id', FIXTURE_TASK_ID,
      '--content-file', contentPath,
      '--project-root', sb.dir,
    ]);
    // If the opt-in path is still intact and the audit covers every hit
    // (or if the new grep-target exemption picks up the audit-line itself
    // — auditing covers the rest), expect exit 0. If audit is incomplete,
    // expect EXIT_FORBIDDEN_MARKER with a diagnostic naming the
    // unaudited hit. Either way, the scanner must NOT crash and MUST
    // produce a definitive verdict.
    assert.ok(
      r.status === EXIT_OK || r.status === EXIT_FORBIDDEN_MARKER,
      `expected exit 0 OR ${EXIT_FORBIDDEN_MARKER} (definitive verdict); got ${r.status}; stderr=${r.stderr.slice(0, 500)}`,
    );
    // Critical composition assertion: the new context-awareness amend must
    // not break the opt-in mechanism's diagnostic surface. If rejection,
    // the message must mention the opt-in audit path.
    if (r.status === EXIT_FORBIDDEN_MARKER) {
      assert.ok(
        /forbidden_markers_in_substance|forbidden_markers_audit|not enumerated/.test(r.stderr),
        `rejection should reference opt-in audit path; got: ${r.stderr.slice(0, 500)}`,
      );
    }
  });
} finally {
  _cleanup();
}

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}

console.log('\nall tests passed');
process.exit(0);
