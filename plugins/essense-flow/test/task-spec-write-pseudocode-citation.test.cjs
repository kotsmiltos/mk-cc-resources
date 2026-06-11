// task-spec-write-pseudocode-citation.test.cjs — substrate-citation rule
// (narrowed 2026-06-11, rebuild Phase 3; original coverage T-1002).
//
// Runner: node plugins/essense-flow/test/task-spec-write-pseudocode-citation.test.cjs
// (must exit 0). Built-in node assert; spawnSync against the CLI binary; no
// external test framework.
//
// The rule under test: prescribed pseudocode asserting engine behavior
// (throws/emits/returns/produces) of a file that EXISTS on disk under the
// project root must carry a <file>:<line> citation within a 5-line window.
// New-code lines (paths not on disk) and third-party library claims (no
// path token) are exempt — they have nothing checkable to cite; library
// behavior the author cannot execute belongs in the unknowns ledger
// (references/librarian.md), enforced at the prompt layer.
//
// Coverage:
//   test-1: uncited trigger naming an EXISTING file → exit 19 + diagnostic
//   test-2: cited existing-file trigger → passes
//   test-3: uncited trigger under guided agency → passes (scope: prescribed)
//   test-4: multiple existing-file triggers → FIRST violation named
//   test-5: uncited trigger naming a NOT-YET-EXISTING file (new code) → passes
//   test-6: uncited trigger with library claim, no path token → passes
//
// Read this before doing anything:
//   1. Limits-awareness: Claude drifts, loses context, finishes prematurely,
//      defers, takes shortcuts. Re-read when uncertain. Preserve specifics —
//      the 4 triggers are CLOSED; the 5-line window is CLOSED; agency_level
//      scope is CLOSED to prescribed; the existing-substrate gate is the
//      2026-06-11 narrowing.
//   2. Positive mindset: every gap solvable. Find the way by working carefully.
//   3. Quality ownership: this is the anti-fabrication firewall — test-5 and
//      test-6 are what keep it from INCENTIVIZING fabricated citations.
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

const EXIT_OK = 0;
const EXIT_ALIGNMENT_DRIFT = 19;

const FIXTURE_SPRINT = 99;
const FIXTURE_TASK_ID = 'T-991';
// Existing-substrate fixture: a real file created inside each sandbox.
const SUBSTRATE_REL = 'src/legacy-parser.js';

function makeSandbox() {
  const dir = path.join(os.tmpdir(), 'esf-t1002-m2-' + crypto.randomBytes(6).toString('hex'));
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

  // existing-substrate file the pseudocode can legitimately claim about
  const substrateAbs = path.join(dir, SUBSTRATE_REL);
  fs.mkdirSync(path.dirname(substrateAbs), { recursive: true });
  fs.writeFileSync(substrateAbs, 'function parse(x) { if (!x) throw new RangeError("empty"); }\n', 'utf8');

  return { dir, sprintDir };
}

function buildFixtureYaml({ pseudocode, agencyLevel }) {
  const indented = pseudocode.split('\n').map((line) => '  ' + line).join('\n');
  return [
    'schema_version: 1',
    `task_id: ${FIXTURE_TASK_ID}`,
    'goal: substrate-citation scanner test fixture goal',
    'requirements_traced:',
    '  - FR-1',
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
    `agency_level: ${agencyLevel}`,
    'agency_rationale: fixture rationale',
    '',
  ].join('\n');
}

function runOp(args, opts = {}) {
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

function writeAndRun(sb, fixtureYaml) {
  const contentPath = path.join(sb.dir, 'fixture.yaml');
  fs.writeFileSync(contentPath, fixtureYaml, 'utf8');
  return runOp([
    'task-spec-write',
    '--sprint', String(FIXTURE_SPRINT),
    '--task-id', FIXTURE_TASK_ID,
    '--content-file', contentPath,
    '--project-root', sb.dir,
  ]);
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

console.log('task-spec-write-pseudocode-citation.test.cjs');
console.log(`  tools bin: ${TOOLS_BIN}`);

try {
  runTest('test-1: uncited trigger naming an EXISTING file rejects with exit 19 + diagnostic', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const r = writeAndRun(sb, buildFixtureYaml({
      pseudocode: [
        '1. parse incoming yaml content',
        `2. ${SUBSTRATE_REL} throws RangeError on empty input`,
        '3. write parsed bytes to destination',
      ].join('\n'),
      agencyLevel: 'prescribed',
    }));
    assert.strictEqual(
      r.status,
      EXIT_ALIGNMENT_DRIFT,
      `expected exit ${EXIT_ALIGNMENT_DRIFT}, got ${r.status}; stderr=${r.stderr.slice(0, 400)}`,
    );
    assert.ok(/M-2/.test(r.stderr), `stderr should name the M-2 rule; got: ${r.stderr.slice(0, 400)}`);
    assert.ok(/throws/i.test(r.stderr), `stderr should name trigger 'throws'; got: ${r.stderr.slice(0, 400)}`);
    assert.ok(
      new RegExp(SUBSTRATE_REL.replace(/[/\\]/g, '[/\\\\]')).test(r.stderr),
      `stderr should name the existing substrate path; got: ${r.stderr.slice(0, 400)}`,
    );
  });

  runTest('test-2: cited existing-file trigger passes', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const r = writeAndRun(sb, buildFixtureYaml({
      pseudocode: [
        '1. parse incoming yaml content',
        `2. ${SUBSTRATE_REL}:1 throws RangeError on empty input (read at line 1)`,
        '3. write parsed bytes to destination',
      ].join('\n'),
      agencyLevel: 'prescribed',
    }));
    assert.strictEqual(r.status, EXIT_OK, `expected exit 0; got ${r.status}; stderr=${r.stderr.slice(0, 400)}`);
  });

  runTest('test-3: uncited existing-file trigger under guided agency passes (scope exempt)', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const r = writeAndRun(sb, buildFixtureYaml({
      pseudocode: [`1. ${SUBSTRATE_REL} throws RangeError on empty input`].join('\n'),
      agencyLevel: 'guided',
    }));
    assert.strictEqual(r.status, EXIT_OK, `expected exit 0; got ${r.status}; stderr=${r.stderr.slice(0, 400)}`);
  });

  runTest('test-4: multiple existing-file triggers — FIRST violation named (fail-fast)', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const r = writeAndRun(sb, buildFixtureYaml({
      pseudocode: [
        '1. parse incoming content',
        `2. ${SUBSTRATE_REL} emits ERROR on bad input`,
        '3. internal state mutation occurs here',
        '4. some unrelated step',
        '5. another unrelated step',
        '6. yet another unrelated step',
        '7. a sixth unrelated step (outside the 5-line window of line 2)',
        `8. ${SUBSTRATE_REL} returns normalized object`,
      ].join('\n'),
      agencyLevel: 'prescribed',
    }));
    assert.strictEqual(
      r.status,
      EXIT_ALIGNMENT_DRIFT,
      `expected exit ${EXIT_ALIGNMENT_DRIFT}; got ${r.status}; stderr=${r.stderr.slice(0, 400)}`,
    );
    assert.ok(/trigger 'emits'/.test(r.stderr), `stderr should name FIRST trigger 'emits'; got: ${r.stderr.slice(0, 400)}`);
    assert.ok(
      !/trigger '(returns|produces)'/.test(r.stderr),
      `stderr should NOT name 'returns' (fail-fast); got: ${r.stderr.slice(0, 400)}`,
    );
  });

  runTest('test-5: uncited trigger naming a NOT-YET-EXISTING file (new code) passes', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const r = writeAndRun(sb, buildFixtureYaml({
      pseudocode: [
        '1. create src/new-validator.js with a validate(input) entry point',
        '2. src/new-validator.js throws SchemaError when input fails the schema',
        '3. returns the validated object otherwise',
      ].join('\n'),
      agencyLevel: 'prescribed',
    }));
    assert.strictEqual(
      r.status,
      EXIT_OK,
      `new-code claims have no file:line to cite and must pass; got ${r.status}; stderr=${r.stderr.slice(0, 400)}`,
    );
  });

  runTest('test-6: uncited library claim (no path token) passes', () => {
    const sb = makeSandbox();
    _createdSandboxes.push(sb.dir);
    const r = writeAndRun(sb, buildFixtureYaml({
      pseudocode: [
        '1. load the document with js-yaml',
        '2. the library throws YAMLException on malformed flow collections',
        '3. catch it and surface a degraded marker instead',
      ].join('\n'),
      agencyLevel: 'prescribed',
    }));
    assert.strictEqual(
      r.status,
      EXIT_OK,
      `library claims are exempt (route to unknowns ledger, prompt-layer); got ${r.status}; stderr=${r.stderr.slice(0, 400)}`,
    );
  });
} finally {
  _cleanup();
}

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}
console.log('\nall tests passed');
