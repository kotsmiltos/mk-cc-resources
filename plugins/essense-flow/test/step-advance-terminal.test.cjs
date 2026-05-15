// step-advance-terminal.test.cjs — T-964 (Sprint 9 round-11, wave 8).
// T-1007 (Sprint 10 round-12 D-Rd12-10 reconcile): AC-3 rewired to exercise
// the legacy step-advance override path now wired through
// maybeOverrideOrderedSteps (tools.cjs:437). AC-4 + AC-5 added to assert
// fixture-naming convention + regression-safety. AC-1 + AC-2 unchanged.
//
// Closes F41 boundary: step-advance must emit EXIT_OUT_OF_ORDER=13 at the
// step_index+1 > total_steps boundary (i.e. cursor already at the terminal
// step of the skill's ordered_steps).
//
// Runner: node --test plugins/essense-flow/test/step-advance-terminal.test.cjs
// Built-in node assert; no external test framework.
//
// AC mapping:
//   AC-1 (terminal): cursor at terminal step + step-advance --next-step <name>
//                    exits 13 (EXIT_OUT_OF_ORDER) with stderr matching
//                    /OUT_OF_ORDER|terminal|last step/.
//   AC-2 (penultimate→terminal): cursor at total_steps-1 + step-advance
//                    --next-step <terminal-name> exits 0 + cursor advances
//                    to total_steps (current_step = terminal name, step_index
//                    = orderedSteps.length - 1 in legacy 0-based schema).
//   AC-3 (legacy override / skill-complete): with ESF_TEST_MODE=1 +
//                    ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR pointing at a tmpdir
//                    containing skill-architect-fixture.md with a custom
//                    ordered_steps sequence, cursor seeded at the fixture's
//                    terminal step + --next-step skill-complete exits 0 +
//                    deletes the cursor (legacy stepAdvance honors the
//                    override via maybeOverrideOrderedSteps wired into
//                    initArchitect — T-1007 / D-Rd12-10).
//   AC-4 (fixture-naming convention): the fixture file MUST be named
//                    skill-<name>-fixture.md (matches resolveSkillMdPath
//                    shape at tools.cjs:2722); placing the fixture under a
//                    different name (e.g. SKILL.md) does NOT activate the
//                    override (legacy ordered_steps remain in effect).
//   AC-5 (regression-safe / no env vars): when ESF_TEST_MODE / OVERRIDE_DIR
//                    are NOT set, legacy step-advance uses the in-code
//                    ordered_steps verbatim (architect = decide → … →
//                    write-round-close).
//
// Read this before doing anything:
//   Limits-awareness: Claude drifts, loses context, finishes prematurely,
//     defers, takes shortcuts. Re-read the spec when uncertain. Preserve
//     specifics. 5 scenarios — keep each as its own runTest, do not inflate
//     or merge.
//   Positive mindset: F41 + D-Rd12-10 are narrow + binary. Every gap solvable.
//   Quality ownership: T-1007 closes Sprint-9 round-12 T-979 drift; the
//     override path now applies uniformly to the legacy step-advance code.
//     Take ownership.
//   Propagation requirement: every descendant artifact (future step-advance
//     terminal-boundary or fixture-override tests) MUST carry these same
//     four instructions.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(PLUGIN_ROOT, 'bin', 'essense-flow-tools.cjs');

// Canonical relative location of cursor.yaml inside a project root.
// Mirrors CURSOR_REL constant in essense-flow-tools.cjs line 243.
const CURSOR_REL = '.pipeline/cursor.yaml';

// Per-test scratch dir for tmp project-root isolation. Use os.tmpdir() so
// tests behave identically on Windows + POSIX. Each AC gets its own
// project-root subdir via mkdtempSync (per-scenario isolation prevents
// AC-1's cursor seed from leaking into AC-2 etc.). Critical: do NOT touch
// the tmp-spike-CLOSURE live cursor (step_index 2 for build skill);
// per-tmpdir --project-root isolation guarantees this.
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'step-advance-terminal-'));

// Build skill's ordered_steps (verbatim from essense-flow-tools.cjs
// initBuild() lines 588-597). Used by AC-1 + AC-2. 8 steps; terminal =
// 'finalize'; penultimate = 'assemble-sprint-report'.
const BUILD_ORDERED_STEPS = [
  'read-manifest',
  'build-wave-order',
  'per-wave-dispatch',
  'per-task-return-and-verify',
  'out-of-contract-write-check',
  'drift-pause-or-continue',
  'assemble-sprint-report',
  'finalize',
];
const BUILD_TOTAL_STEPS = BUILD_ORDERED_STEPS.length; // 8
const BUILD_TERMINAL_STEP = BUILD_ORDERED_STEPS[BUILD_TOTAL_STEPS - 1]; // 'finalize'
const BUILD_PENULTIMATE_STEP = BUILD_ORDERED_STEPS[BUILD_TOTAL_STEPS - 2]; // 'assemble-sprint-report'

// Architect skill's in-code ordered_steps (verbatim from
// essense-flow-tools.cjs initArchitect() — wrapped by maybeOverrideOrderedSteps
// per T-1007 D-Rd12-10). Used by AC-5 (regression-safe / no env vars).
const ARCHITECT_DEFAULT_ORDERED_STEPS = [
  'decide',
  'delegate',
  'synthesize',
  'align',
  'pack',
  'finalize',
  'write-round-close',
];
const ARCHITECT_DEFAULT_TERMINAL = ARCHITECT_DEFAULT_ORDERED_STEPS[
  ARCHITECT_DEFAULT_ORDERED_STEPS.length - 1
]; // 'write-round-close'

// AC-3 / AC-4 override fixture step names. The fixture authors headings
// whose first token IS the slug (per maybeOverrideOrderedSteps slugify
// rule at tools.cjs: lowercase + take chars up to first whitespace or '(').
// Terminal step intentionally distinct from any in-code architect default
// so AC-3 can prove the override took effect (cursor seeded at 'omega' —
// a name that does NOT exist in ARCHITECT_DEFAULT_ORDERED_STEPS — would
// hard-fail with the in-code list).
const ARCHITECT_OVERRIDE_ORDERED_STEPS = ['alpha', 'beta', 'gamma', 'omega'];
const ARCHITECT_OVERRIDE_TERMINAL = ARCHITECT_OVERRIDE_ORDERED_STEPS[
  ARCHITECT_OVERRIDE_ORDERED_STEPS.length - 1
]; // 'omega'

// EXIT_OUT_OF_ORDER constant — mirrors essense-flow-tools.cjs line 136.
const EXIT_OUT_OF_ORDER = 13;

// Make a fresh per-AC project-root subdir + .pipeline/ inside TMP_ROOT and
// return the absolute path. The caller seeds cursor.yaml at
// <projectRoot>/.pipeline/cursor.yaml.
function mkProjectRoot(label) {
  const dir = fs.mkdtempSync(path.join(TMP_ROOT, `${label}-`));
  fs.mkdirSync(path.join(dir, '.pipeline'), { recursive: true });
  return dir;
}

// Seed cursor.yaml at <projectRoot>/.pipeline/cursor.yaml with the given
// legacy-schema fields. Mirrors the shape that essense-flow-tools.cjs
// writeNewCursorAtomic emits for the legacy step-advance branch (skill +
// current_step + step_index (0-based) + total_steps + last_advanced_at).
function seedLegacyCursor(projectRoot, { skill, currentStep, stepIndex, totalSteps, extra }) {
  const cursorPath = path.join(projectRoot, CURSOR_REL);
  const lines = [
    `schema_version: 1`,
    `skill: ${skill}`,
    `current_step: ${currentStep}`,
    `step_index: ${stepIndex}`,
    `total_steps: ${totalSteps}`,
    `last_advanced_at: '2026-05-14T00:00:00.000Z'`,
  ];
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      lines.push(`${k}: ${v}`);
    }
  }
  fs.writeFileSync(cursorPath, lines.join('\n') + '\n', 'utf8');
  return cursorPath;
}

// Spawn the CLI with --project-root <tmp> isolation. No fixture override
// needed (step-advance reads init <skill>'s ordered_steps from the live
// SKILL.md / source-of-truth init function in tools.cjs, NOT from a
// fixture).
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
// AC-1 — terminal boundary exceeded.
// Cursor seeded at the terminal step of build skill (current_step='finalize',
// step_index = total_steps - 1 in legacy 0-based schema, i.e. 7 of 8). Then
// invoke step-advance --skill build --next-step finalize: the legacy
// stepAdvance code path (essense-flow-tools.cjs lines 2331-2349) computes
// currentIdx = indexOf('finalize') = 7; expectedSuccessor = orderedSteps[8]
// = undefined → emits EXIT_OUT_OF_ORDER with the canonical "cursor at last
// step ... pass --next-step 'skill-complete' to finalize" diagnostic. The
// task spec's "step_index = total_steps" phrasing reflects the DD-15 1-
// based new-schema convention; the LEGACY cli-form's 0-based step_index
// equivalent is total_steps - 1 (the boundary value where cursor.current_
// step IS the terminal step name).
// ---------------------------------------------------------------------------
runTest('AC-1: terminal boundary exceeded exits 13 (EXIT_OUT_OF_ORDER)', () => {
  const projectRoot = mkProjectRoot('ac1');
  seedLegacyCursor(projectRoot, {
    skill: 'build',
    currentStep: BUILD_TERMINAL_STEP,
    stepIndex: BUILD_TOTAL_STEPS - 1, // 7 (legacy 0-based; terminal)
    totalSteps: BUILD_TOTAL_STEPS, // 8
  });

  // --next-step = the terminal step itself: any valid step name reaches the
  // currentIdx + 1 boundary check because cursor.current_step is already
  // terminal. Passing the terminal name keeps the diagnostic crisp + matches
  // the spec's "next-after-terminal" intent (there IS no step after
  // terminal; any non-skill-complete value fires the same EXIT_OUT_OF_ORDER
  // arm).
  const r = runCli([
    'step-advance',
    '--skill', 'build',
    '--next-step', BUILD_TERMINAL_STEP,
    '--project-root', projectRoot,
  ]);

  assert.strictEqual(
    r.code,
    EXIT_OUT_OF_ORDER,
    `expected exit ${EXIT_OUT_OF_ORDER} (EXIT_OUT_OF_ORDER), got ${r.code}; stderr: ${r.stderr}`,
  );
  // Diagnostic must surface the OUT_OF_ORDER / terminal / last-step semantic.
  // The canonical message at tools.cjs line 2342 is "cursor at last step
  // '<name>'; pass --next-step 'skill-complete' to finalize" — match any
  // of the three load-bearing words.
  assert.match(
    r.stderr,
    /OUT_OF_ORDER|terminal|last step/i,
    `stderr must surface OUT_OF_ORDER|terminal|last-step semantic; got: ${r.stderr}`,
  );
});

// ---------------------------------------------------------------------------
// AC-2 — penultimate → terminal advances cleanly.
// Cursor seeded at the penultimate step (current_step='assemble-sprint-
// report', step_index = total_steps - 2 in legacy 0-based = 6 of 8). Invoke
// step-advance --skill build --next-step finalize: legacy code path lines
// 2331-2373 computes currentIdx=6, expectedSuccessor='finalize', match →
// writes updated cursor with current_step='finalize', step_index=7. The
// task spec's "cursor advances to total_steps" phrasing uses the DD-15
// 1-based convention; in the legacy 0-based form this is step_index = 7 =
// total_steps - 1 (cursor now AT the terminal step, not past it).
// ---------------------------------------------------------------------------
runTest('AC-2: penultimate→terminal advances cleanly to total_steps', () => {
  const projectRoot = mkProjectRoot('ac2');
  const cursorPath = seedLegacyCursor(projectRoot, {
    skill: 'build',
    currentStep: BUILD_PENULTIMATE_STEP,
    stepIndex: BUILD_TOTAL_STEPS - 2, // 6 (legacy 0-based; penultimate)
    totalSteps: BUILD_TOTAL_STEPS, // 8
  });

  const r = runCli([
    'step-advance',
    '--skill', 'build',
    '--next-step', BUILD_TERMINAL_STEP, // 'finalize'
    '--project-root', projectRoot,
  ]);

  assert.strictEqual(
    r.code,
    0,
    `expected exit 0 (clean advance), got ${r.code}; stderr: ${r.stderr}`,
  );

  // Cursor file must still exist + reflect the advance.
  assert.ok(fs.existsSync(cursorPath), 'cursor.yaml deleted unexpectedly');
  const body = fs.readFileSync(cursorPath, 'utf8');
  // current_step now terminal.
  assert.match(
    body,
    new RegExp(`current_step:\\s*['\"]?${BUILD_TERMINAL_STEP}['\"]?`),
    `cursor.current_step did not advance to '${BUILD_TERMINAL_STEP}'; got: ${body}`,
  );
  // step_index = total_steps - 1 = 7 (legacy 0-based; terminal position).
  // Per the legacy stepAdvance code (line 2356: step_index: currentIdx + 1),
  // currentIdx = indexOf('assemble-sprint-report') = 6, so new step_index = 7.
  assert.match(
    body,
    new RegExp(`step_index:\\s*${BUILD_TOTAL_STEPS - 1}\\b`),
    `cursor.step_index did not advance to ${BUILD_TOTAL_STEPS - 1}; got: ${body}`,
  );
  // total_steps preserved.
  assert.match(
    body,
    new RegExp(`total_steps:\\s*${BUILD_TOTAL_STEPS}\\b`),
    `cursor.total_steps drifted; got: ${body}`,
  );
});

// ---------------------------------------------------------------------------
// AC-3 — legacy step-advance honors override fixture (T-1007 / D-Rd12-10).
// Closes the T-979 drift: round-12 D-Rd12-10 assumed
// ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR applied to legacy ordered_steps
// resolution, but the legacy path consulted hardcoded in-code arrays inside
// init<Skill> functions, NOT the override. T-1007 introduces the
// maybeOverrideOrderedSteps helper (tools.cjs:437) and wires it into every
// init<Skill> return. This AC proves the wiring: with ESF_TEST_MODE=1 +
// override dir + a skill-architect-fixture.md publishing a CUSTOM
// ordered_steps sequence ('alpha', 'beta', 'gamma', 'omega'), the legacy
// step-advance code consults that sequence, and a cursor seeded at the
// fixture's terminal step ('omega') deletes cleanly via --next-step
// skill-complete. Crucially, 'omega' is NOT in the architect in-code
// defaults, so if the override did not take effect the cursor seed would
// produce EXIT_DEGRADED (tools.cjs cursor.current_step not in
// ordered_steps).
// ---------------------------------------------------------------------------
runTest('AC-3: legacy step-advance honors ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR fixture for architect (T-1007)', () => {
  const projectRoot = mkProjectRoot('ac3-t1007');
  const overrideDir = fs.mkdtempSync(path.join(TMP_ROOT, 'override-ac3-'));
  // Fixture authored per resolveSkillMdPath shape (tools.cjs:2722):
  // <override-dir>/skill-${skill}-fixture.md. The body uses `## N. <slug>`
  // headings parsed by parseSkillStepsFromMarkdown (lib/cursor-schema.cjs:204);
  // each title's first token is the slug (rule at tools.cjs:455-461).
  const fixturePath = path.join(overrideDir, 'skill-architect-fixture.md');
  const fixtureBody = [
    '---',
    'name: architect',
    'description: T-1007 override fixture; exercises legacy step-advance override path.',
    'version: 1.0.0',
    'schema_version: 1',
    '---',
    '# architect (T-1007 AC-3 override fixture)',
    '',
    '## Read this before doing anything',
    '',
    '- Limits-awareness: drift, premature finish, defers, shortcuts.',
    '- Positive mindset: every gap solvable.',
    '- Quality ownership: this fixture is load-bearing for T-1007 AC-3.',
    '- Propagation requirement: descendants carry these forward.',
    '',
    '## 1. alpha',
    'first step body.',
    '',
    '## 2. beta',
    'second step body.',
    '',
    '## 3. gamma',
    'third step body.',
    '',
    '## 4. omega',
    'terminal step body.',
    '',
  ].join('\n');
  fs.writeFileSync(fixturePath, fixtureBody, 'utf8');

  // Seed cursor at the OVERRIDE fixture's terminal step ('omega'). This step
  // name is intentionally absent from ARCHITECT_DEFAULT_ORDERED_STEPS — if
  // the override does not activate, legacy step-advance would compute
  // currentIdx = -1 and emit EXIT_DEGRADED. The fact that --next-step
  // skill-complete exits 0 proves maybeOverrideOrderedSteps swapped the
  // in-code defaults for the fixture-parsed list.
  const cursorPath = seedLegacyCursor(projectRoot, {
    skill: 'architect',
    currentStep: ARCHITECT_OVERRIDE_TERMINAL,
    stepIndex: ARCHITECT_OVERRIDE_ORDERED_STEPS.length - 1, // legacy 0-based
    totalSteps: ARCHITECT_OVERRIDE_ORDERED_STEPS.length,
  });

  // Pre-check: cursor file exists before invocation.
  assert.ok(fs.existsSync(cursorPath), 'precondition: cursor.yaml must exist before AC-3 invocation');

  const r = runCli(
    [
      'step-advance',
      '--skill', 'architect',
      '--next-step', 'skill-complete',
      '--project-root', projectRoot,
    ],
    {
      env: {
        ESF_TEST_MODE: '1',
        ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR: overrideDir,
      },
    },
  );

  assert.strictEqual(
    r.code,
    0,
    `expected exit 0 (skill-complete success), got ${r.code}; stderr: ${r.stderr}; stdout: ${r.stdout}`,
  );
  assert.ok(
    !fs.existsSync(cursorPath),
    `cursor.yaml must be deleted after --next-step skill-complete; still present at ${cursorPath}`,
  );
});

// ---------------------------------------------------------------------------
// AC-4 — fixture-naming convention is skill-<name>-fixture.md, NOT SKILL.md.
// Proves the resolveSkillMdPath shape (tools.cjs:2722) is honored end-to-end:
// placing the fixture at <override-dir>/SKILL.md (the WRONG convention used
// by round-12 D-Rd12-10's pseudocode) does NOT activate the override —
// legacy step-advance falls back to in-code architect defaults, and a cursor
// seeded at 'omega' (not in defaults) produces EXIT_DEGRADED. This is the
// regression that proves AC-3's override activation is binding on the
// canonical fixture path.
// ---------------------------------------------------------------------------
runTest('AC-4: fixture-naming convention is skill-<name>-fixture.md (wrong-named fixture does not activate override)', () => {
  const projectRoot = mkProjectRoot('ac4-t1007');
  const overrideDir = fs.mkdtempSync(path.join(TMP_ROOT, 'override-ac4-'));
  // Wrong-named fixture: place at <override-dir>/SKILL.md (the round-12
  // D-Rd12-10 pseudocode convention). resolveSkillMdPath looks for
  // skill-architect-fixture.md and will NOT find this, so isOverride=false,
  // helper returns defaults, legacy step-advance uses in-code architect
  // ordered_steps.
  const wrongNamedPath = path.join(overrideDir, 'SKILL.md');
  fs.writeFileSync(
    wrongNamedPath,
    '## 1. alpha\nbody\n\n## 2. omega\nterminal\n',
    'utf8',
  );

  // Cursor seeded at 'omega' — not in architect defaults. If override
  // activated, this would be valid + --next-step skill-complete would exit 0.
  // Because override does NOT activate (wrong filename), legacy step-advance
  // computes currentIdx of 'omega' in [decide, delegate, ...] → -1 → emits
  // EXIT_DEGRADED (tools.cjs L2589-2592).
  seedLegacyCursor(projectRoot, {
    skill: 'architect',
    currentStep: ARCHITECT_OVERRIDE_TERMINAL, // 'omega'
    stepIndex: ARCHITECT_OVERRIDE_ORDERED_STEPS.length - 1,
    totalSteps: ARCHITECT_OVERRIDE_ORDERED_STEPS.length,
  });

  const r = runCli(
    [
      'step-advance',
      '--skill', 'architect',
      '--next-step', 'skill-complete',
      '--project-root', projectRoot,
    ],
    {
      env: {
        ESF_TEST_MODE: '1',
        ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR: overrideDir,
      },
    },
  );

  // Override did NOT activate. Cursor.current_step 'omega' triggers a
  // skill-complete-sentinel-branch rejection: "requires cursor at last step
  // 'write-round-close', got 'omega'" (tools.cjs L2515). This proves the
  // in-code architect defaults are in effect (terminal is the default
  // 'write-round-close', not the fixture's 'omega'). If the override HAD
  // activated, exit would be 0 + cursor deleted (the AC-3 success path).
  assert.notStrictEqual(
    r.code,
    0,
    `expected non-zero exit (override should NOT activate for wrong-named SKILL.md fixture); got 0; stdout: ${r.stdout}`,
  );
  // Stderr must reference architect's IN-CODE terminal ('write-round-close'),
  // proving the in-code defaults — not the fixture's 'omega' — are the
  // effective ordered_steps.
  assert.match(
    r.stderr,
    /write-round-close/,
    `stderr must reference architect's in-code terminal 'write-round-close' (proves defaults in effect, not fixture override); got: ${r.stderr}`,
  );
});

// ---------------------------------------------------------------------------
// AC-5 — regression-safe: when env vars NOT set, legacy step-advance uses
// in-code ordered_steps (architect defaults). Cursor seeded at the in-code
// terminal ('write-round-close') + --next-step skill-complete exits 0 +
// deletes cursor. Proves maybeOverrideOrderedSteps short-circuits on missing
// env vars (ESF_TEST_MODE !== '1' OR OVERRIDE_DIR unset).
// ---------------------------------------------------------------------------
runTest('AC-5: no env vars → legacy step-advance uses in-code ordered_steps (regression-safe)', () => {
  const projectRoot = mkProjectRoot('ac5-t1007');
  // Cursor at architect's in-code terminal 'write-round-close'.
  const cursorPath = seedLegacyCursor(projectRoot, {
    skill: 'architect',
    currentStep: ARCHITECT_DEFAULT_TERMINAL, // 'write-round-close'
    stepIndex: ARCHITECT_DEFAULT_ORDERED_STEPS.length - 1, // 6 (legacy 0-based)
    totalSteps: ARCHITECT_DEFAULT_ORDERED_STEPS.length, // 7
  });

  // Run with the test process's existing env BUT strip any ESF_TEST_MODE /
  // OVERRIDE_DIR that might leak in from the parent shell (defensive).
  const cleanEnv = { ...process.env };
  delete cleanEnv.ESF_TEST_MODE;
  delete cleanEnv.ESSENSE_FLOW_SKILL_MD_OVERRIDE_DIR;

  // runCli's default env-merge would re-add them via { ...process.env, ... };
  // call spawnSync directly here to fully override env.
  const result = spawnSync(
    process.execPath,
    [
      TOOL,
      'step-advance',
      '--skill', 'architect',
      '--next-step', 'skill-complete',
      '--project-root', projectRoot,
    ],
    {
      env: cleanEnv,
      encoding: 'utf8',
      timeout: 30000,
    },
  );

  assert.strictEqual(
    result.status,
    0,
    `expected exit 0 (architect default terminal advance), got ${result.status}; stderr: ${result.stderr}`,
  );
  assert.ok(
    !fs.existsSync(cursorPath),
    `cursor.yaml must be deleted after --next-step skill-complete; still present at ${cursorPath}`,
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
process.stdout.write('\nAll T-964 step-advance terminal-boundary ACs passed\n');
process.exit(0);
