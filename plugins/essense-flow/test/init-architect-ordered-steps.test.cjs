// init-architect-ordered-steps.test.cjs — T-973 (Sprint 9 round-12, wave 11).
//
// Closes D-Rd12-5 (i): initArchitect.ordered_steps drift — the array had 6
// entries (decide, delegate, synthesize, align, pack, finalize) but architect
// SKILL.md L352 canonical sequence has 7 (terminal 'write-round-close'). The
// drift meant step-advance --skill architect --next-step write-round-close
// emitted EXIT_VALIDATION_FAIL (the requested step was not in the allowed
// set). T-973 appends 'write-round-close' as the 7th + terminal entry; this
// test pins the new shape + the round-close advance path.
//
// Runner: node plugins/essense-flow/test/init-architect-ordered-steps.test.cjs
// (built-in node assert; no external test framework).
//
// AC mapping (verbatim from T-973 task_spec test_completion_contract):
//   AC-1: initArchitect emits ordered_steps with length 7; final entry ===
//         'write-round-close'. Invokes via the `init architect` CLI op and
//         asserts on the emitted JSON.
//   AC-2: step-advance --skill architect --next-step write-round-close does
//         NOT exit EXIT_VALIDATION_FAIL on a cursor seeded at step_index=5
//         (current_step='finalize'); legacy 0-based step_index 5 IS the
//         terminal-position before the new step is appended — after T-973
//         the canonical sequence is 7 entries (indices 0..6), so finalize is
//         at index 5 and write-round-close is at index 6, and the advance
//         finalize→write-round-close is the valid penultimate→terminal move.
//
// Read this before doing anything:
//   Limits-awareness: Claude drifts, loses context, finishes prematurely,
//     defers, takes shortcuts. Re-read the spec when uncertain. Preserve
//     specifics. 2 ACs — keep each as its own runTest, do not merge.
//   Positive mindset: D-Rd12-5 (i) is narrow + binary. Every gap solvable.
//   Quality ownership: F6 stepAdvance EXIT_VALIDATION_FAIL closed by this
//     file. Take ownership.
//   Propagation requirement: every descendant artifact (future architect
//     ordered_steps tests) MUST carry these same four instructions.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(PLUGIN_ROOT, 'bin', 'essense-flow-tools.cjs');

// Canonical relative location of cursor.yaml inside a project root. Mirrors
// CURSOR_REL constant in essense-flow-tools.cjs.
const CURSOR_REL = '.pipeline/cursor.yaml';

// Architect skill's expected ordered_steps post-T-973 amend. Verbatim from
// essense-flow-tools.cjs initArchitect() ordered_steps array literal. 7
// steps; terminal = 'write-round-close'; penultimate = 'finalize'.
const ARCHITECT_ORDERED_STEPS = [
  'decide',
  'delegate',
  'synthesize',
  'align',
  'pack',
  'finalize',
  'write-round-close',
];
const ARCHITECT_TOTAL_STEPS = ARCHITECT_ORDERED_STEPS.length; // 7
const ARCHITECT_TERMINAL_STEP = ARCHITECT_ORDERED_STEPS[ARCHITECT_TOTAL_STEPS - 1]; // 'write-round-close'
const ARCHITECT_PENULTIMATE_STEP = ARCHITECT_ORDERED_STEPS[ARCHITECT_TOTAL_STEPS - 2]; // 'finalize'

// EXIT_VALIDATION_FAIL constant mirror (essense-flow-tools.cjs EXIT codes).
// AC-2 asserts the negation — exit MUST NOT equal this value. Pre-T-973 the
// step-advance call emitted this code because 'write-round-close' was absent
// from the allowed set.
const EXIT_VALIDATION_FAIL = 11;

// Per-test scratch dir. Each AC gets its own project-root subdir so AC-1's
// state cannot leak into AC-2.
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'init-architect-ordered-steps-'));

function mkProjectRoot(label) {
  const dir = fs.mkdtempSync(path.join(TMP_ROOT, `${label}-`));
  fs.mkdirSync(path.join(dir, '.pipeline'), { recursive: true });
  return dir;
}

// Seed cursor.yaml at <projectRoot>/.pipeline/cursor.yaml with the legacy-
// schema fields. Mirrors the shape that essense-flow-tools.cjs
// writeNewCursorAtomic emits for the legacy step-advance branch (skill +
// current_step + step_index 0-based + total_steps + last_advanced_at).
function seedLegacyCursor(projectRoot, { skill, currentStep, stepIndex, totalSteps }) {
  const cursorPath = path.join(projectRoot, CURSOR_REL);
  const lines = [
    `schema_version: 1`,
    `skill: ${skill}`,
    `current_step: ${currentStep}`,
    `step_index: ${stepIndex}`,
    `total_steps: ${totalSteps}`,
    `last_advanced_at: '2026-05-14T00:00:00.000Z'`,
  ];
  fs.writeFileSync(cursorPath, lines.join('\n') + '\n', 'utf8');
  return cursorPath;
}

function runCli(args, opts = {}) {
  const env = { ...process.env, ...(opts.env || {}) };
  const result = spawnSync(process.execPath, [TOOL, ...args], {
    env,
    encoding: 'utf8',
    timeout: 30000,
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

let failures = 0;
function runTest(name, fn) {
  try {
    fn();
    process.stdout.write(`PASS  ${name}\n`);
  } catch (err) {
    failures += 1;
    process.stdout.write(`FAIL  ${name}\n`);
    process.stdout.write(`  ${err.message}\n`);
    if (err.stack) {
      process.stdout.write(`  ${err.stack.split('\n').slice(1, 4).join('\n')}\n`);
    }
  }
}

// ---------------------------------------------------------------------------
// AC-1 — initArchitect emits ordered_steps with length 7 + terminal entry
// === 'write-round-close'.
// Invoke the CLI op `init architect` against a fresh sandbox project root
// (no state.yaml present → sprint_number resolves to null; ordered_steps is
// derived from the literal array in initArchitect()). Parse the JSON output
// and assert both shape claims simultaneously: (a) length === 7, (b)
// ordered_steps[6] === 'write-round-close'. The full-array equality
// strengthens the check beyond the spec minimum without expanding scope —
// any unintended reordering of the earlier 6 entries also fails the test.
// ---------------------------------------------------------------------------
runTest("AC-1: init architect emits ordered_steps length 7 with terminal 'write-round-close'", () => {
  const projectRoot = mkProjectRoot('ac1');

  const r = runCli([
    'init', 'architect',
    '--project-root', projectRoot,
  ]);

  assert.strictEqual(
    r.code,
    0,
    `expected exit 0 from init architect, got ${r.code}; stderr: ${r.stderr}`,
  );

  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch (err) {
    assert.fail(`init architect stdout was not valid JSON: ${err.message}; stdout: ${r.stdout}`);
  }

  assert.ok(
    Array.isArray(parsed.ordered_steps),
    `init architect must emit ordered_steps as an array; got ${typeof parsed.ordered_steps}`,
  );
  assert.strictEqual(
    parsed.ordered_steps.length,
    ARCHITECT_TOTAL_STEPS,
    `ordered_steps.length must be ${ARCHITECT_TOTAL_STEPS}; got ${parsed.ordered_steps.length} (entries: ${JSON.stringify(parsed.ordered_steps)})`,
  );
  assert.strictEqual(
    parsed.ordered_steps[ARCHITECT_TOTAL_STEPS - 1],
    ARCHITECT_TERMINAL_STEP,
    `ordered_steps[${ARCHITECT_TOTAL_STEPS - 1}] must be '${ARCHITECT_TERMINAL_STEP}'; got '${parsed.ordered_steps[ARCHITECT_TOTAL_STEPS - 1]}'`,
  );
  // Full-array pin — protects against silent reordering of the 6 prior
  // entries (would not be caught by length + last-entry checks alone).
  assert.deepStrictEqual(
    parsed.ordered_steps,
    ARCHITECT_ORDERED_STEPS,
    `ordered_steps array drifted from canonical sequence; expected ${JSON.stringify(ARCHITECT_ORDERED_STEPS)}, got ${JSON.stringify(parsed.ordered_steps)}`,
  );
});

// ---------------------------------------------------------------------------
// AC-2 — step-advance --skill architect --next-step write-round-close does
// NOT exit EXIT_VALIDATION_FAIL on a cursor seeded at step_index=5
// (current_step='finalize'). Pre-T-973 the call exited EXIT_VALIDATION_FAIL
// (11) because 'write-round-close' was absent from initArchitect's
// ordered_steps allowed set. Post-T-973 the call must succeed (exit 0) as
// the canonical penultimate→terminal advance (finalize at index 5 →
// write-round-close at index 6).
//
// Cursor seed: current_step='finalize', step_index=5 (legacy 0-based; index
// 5 of 7 = penultimate position), total_steps=7. After the call the cursor
// must reflect current_step='write-round-close', step_index=6.
// ---------------------------------------------------------------------------
runTest('AC-2: step-advance to write-round-close from finalize exits 0 (not EXIT_VALIDATION_FAIL)', () => {
  const projectRoot = mkProjectRoot('ac2');
  const cursorPath = seedLegacyCursor(projectRoot, {
    skill: 'architect',
    currentStep: ARCHITECT_PENULTIMATE_STEP, // 'finalize'
    stepIndex: ARCHITECT_TOTAL_STEPS - 2, // 5 (legacy 0-based; penultimate)
    totalSteps: ARCHITECT_TOTAL_STEPS, // 7
  });

  const r = runCli([
    'step-advance',
    '--skill', 'architect',
    '--next-step', ARCHITECT_TERMINAL_STEP, // 'write-round-close'
    '--project-root', projectRoot,
  ]);

  // Primary assertion (spec wording): exit must NOT be EXIT_VALIDATION_FAIL.
  assert.notStrictEqual(
    r.code,
    EXIT_VALIDATION_FAIL,
    `step-advance must NOT exit EXIT_VALIDATION_FAIL (${EXIT_VALIDATION_FAIL}); got ${r.code} (stderr: ${r.stderr})`,
  );
  // Stronger pin: with finalize→write-round-close being the legal
  // penultimate→terminal advance, the call should succeed cleanly (exit 0).
  assert.strictEqual(
    r.code,
    0,
    `expected exit 0 (clean advance finalize → write-round-close), got ${r.code}; stderr: ${r.stderr}`,
  );

  // Cursor file must still exist + reflect the advance to the new terminal.
  assert.ok(fs.existsSync(cursorPath), 'cursor.yaml deleted unexpectedly during AC-2 advance');
  const body = fs.readFileSync(cursorPath, 'utf8');
  assert.match(
    body,
    new RegExp(`current_step:\\s*['\"]?${ARCHITECT_TERMINAL_STEP}['\"]?`),
    `cursor.current_step did not advance to '${ARCHITECT_TERMINAL_STEP}'; got: ${body}`,
  );
  assert.match(
    body,
    new RegExp(`step_index:\\s*${ARCHITECT_TOTAL_STEPS - 1}\\b`),
    `cursor.step_index did not advance to ${ARCHITECT_TOTAL_STEPS - 1}; got: ${body}`,
  );
  assert.match(
    body,
    new RegExp(`total_steps:\\s*${ARCHITECT_TOTAL_STEPS}\\b`),
    `cursor.total_steps drifted from ${ARCHITECT_TOTAL_STEPS}; got: ${body}`,
  );
});

// ---------------------------------------------------------------------------
// Cleanup + report
// ---------------------------------------------------------------------------
try {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
} catch (_err) {
  // best-effort cleanup
}

if (failures > 0) {
  process.stdout.write(`\n${failures} test(s) failed\n`);
  process.exit(1);
}
process.stdout.write('\nAll T-973 init-architect-ordered-steps ACs passed\n');
process.exit(0);
