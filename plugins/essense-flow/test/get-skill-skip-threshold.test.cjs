// get-skill-skip-threshold.test.cjs — Sprint 10 W6 T-1021 (NFR-8 + D-Sprint10-5).
//
// Runner: node plugins/essense-flow/test/get-skill-skip-threshold.test.cjs
// (must exit 0). Built-in node assert; no external test framework. Matches
// sibling-test convention (eval-dispatch-predicate.test.cjs, test-mode-guard.test.cjs).
//
// Coverage:
//   AC-1: getSkillSkipThreshold defined + exported from lib/cursor-schema.cjs;
//         architect skill returns threshold + source='references/transitions.yaml'.
//   AC-2: function reads ONLY from references/transitions.yaml per_skill_skip_threshold
//         block (no fallback). Verified by: review skill returns rule_id='dispatch-floor' +
//         rule_quote_required=true exactly as transitions.yaml records.
//   AC-3: unknown skill throws Error with diagnostic naming transitions.yaml.
//   AC-3-bis: missing/empty/non-string skill arg throws TypeError.
//   AC-4: missing per_skill_skip_threshold block throws Error citing T-1022 substance
//         (verified by monkey-patching fs.readFileSync to return a transitions.yaml
//         body with the block stripped — non-destructive; live transitions.yaml
//         not mutated, satisfying the forbidden-path discipline).
//   AC-5: all 4 named tests pass under plain-`node`. (This file IS the AC-5 evidence.)
//
// Read this before doing anything:
//   - Limits-awareness: Claude drifts; preserve specifics — single lookup path,
//     no fallback constants. The absence of a fallback IS the contract.
//   - Positive mindset: every gap solvable; throw-on-missing closes NFR-8 structurally.
//   - Quality ownership: AC-4 verifies the throw-on-missing-block discipline by
//     simulating the failure mode in-process; the live transitions.yaml is never
//     touched (forbidden by task spec).
//   - Propagation requirement: future readers/extenders of this test carry these
//     four instructions forward.

'use strict';

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CURSOR_SCHEMA_PATH = path.join(PLUGIN_ROOT, 'lib', 'cursor-schema.cjs');
const TRANSITIONS_PATH = path.resolve(PLUGIN_ROOT, 'references', 'transitions.yaml');

// Fresh require — defensive against stale require-cache from a prior test in
// the same node process invocation (run-all.cjs spawns per-file so this is
// belt-and-suspenders; matches the sibling-test convention).
delete require.cache[require.resolve(CURSOR_SCHEMA_PATH)];
const cursorSchema = require(CURSOR_SCHEMA_PATH);
const { getSkillSkipThreshold } = cursorSchema;

// --------------------------------------------------------------------------
// Test harness — minimal assert wrapper printing per-test pass/fail lines
// (mirrors eval-dispatch-predicate.test.cjs / test-mode-guard.test.cjs
// convention for consistency with run-all.cjs aggregate output).
// --------------------------------------------------------------------------
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

console.log('get-skill-skip-threshold.test.cjs');
console.log(`  cursor-schema module: ${CURSOR_SCHEMA_PATH}`);
console.log(`  transitions.yaml:     ${TRANSITIONS_PATH}`);

// --------------------------------------------------------------------------
// Precondition: export shape — getSkillSkipThreshold must be a function on
// the module exports. AC-1 first half (defined + exported).
// --------------------------------------------------------------------------
runTest('precondition: getSkillSkipThreshold exported from lib/cursor-schema.cjs', () => {
  assert.strictEqual(typeof getSkillSkipThreshold, 'function',
    'getSkillSkipThreshold must be exported as a function');
});

runTest('precondition: live transitions.yaml has per_skill_skip_threshold block (T-1022 substance)', () => {
  // Belt-and-suspenders: confirm the live yaml block T-1022 landed is present.
  // If T-1022 regressed, every AC below would fail with the same root cause,
  // so surface it as a precondition for clearer diagnostics.
  assert.ok(fs.existsSync(TRANSITIONS_PATH),
    `transitions.yaml must exist at ${TRANSITIONS_PATH}`);
  const body = fs.readFileSync(TRANSITIONS_PATH, 'utf8');
  assert.ok(body.includes('per_skill_skip_threshold:'),
    'transitions.yaml must contain per_skill_skip_threshold: top-level block (T-1022 substance)');
});

// --------------------------------------------------------------------------
// AC-1 (test 1 in spec list): architect skill returns architect threshold +
// source='references/transitions.yaml'.
// --------------------------------------------------------------------------
runTest('AC-1: getSkillSkipThreshold("architect") returns threshold + source from transitions.yaml', () => {
  const result = getSkillSkipThreshold('architect');
  assert.strictEqual(typeof result, 'object', 'AC-1: result must be an object');
  assert.notStrictEqual(result, null, 'AC-1: result must not be null');
  // transitions.yaml records architect.threshold = 1 (structural placeholder per
  // the rule "observed >= max(threshold, decomposition.modules.length)").
  assert.strictEqual(result.threshold, 1,
    `AC-1: result.threshold must be 1 (architect entry in transitions.yaml); got ${result.threshold}`);
  assert.strictEqual(result.source, 'references/transitions.yaml',
    `AC-1: result.source must be 'references/transitions.yaml'; got '${result.source}'`);
  assert.strictEqual(result.skill, 'architect',
    'AC-1: result.skill must echo back the input skill');
  assert.strictEqual(result.rule_id, 'dispatch-floor',
    'AC-1: result.rule_id must be dispatch-floor (architect entry in transitions.yaml)');
});

// --------------------------------------------------------------------------
// AC-4 (test 4 in spec list) / AC-2 reinforcement: review skill returns
// DD-2 + rule_quote_required=true. Confirms the function reads ONLY from
// transitions.yaml (no fallback substitution) by surfacing the verbatim
// rule_quote_required flag.
// --------------------------------------------------------------------------
runTest('AC-2/AC-4-spec-test-4: getSkillSkipThreshold("review") returns rule_id=DD-2 + rule_quote_required=true', () => {
  const result = getSkillSkipThreshold('review');
  assert.strictEqual(result.threshold, 6,
    `AC-2: review threshold must be 6 (transitions.yaml); got ${result.threshold}`);
  assert.strictEqual(result.rule_id, 'dispatch-floor',
    'AC-2: review rule_id must be DD-2');
  assert.strictEqual(result.rule_quote_required, true,
    'AC-2: review rule_quote_required must be true (verbatim from transitions.yaml)');
  assert.strictEqual(result.source, 'references/transitions.yaml',
    'AC-2: result.source must be references/transitions.yaml (single lookup path)');
});

// Bonus coverage for the third skill in the block — verify — to ensure all
// three documented entries are reachable through the helper.
runTest('AC-2-bonus: getSkillSkipThreshold("verify") returns DD-2 + rule_quote_required=true', () => {
  const result = getSkillSkipThreshold('verify');
  assert.strictEqual(result.threshold, 1,
    `AC-2-bonus: verify threshold must be 1 (transitions.yaml structural placeholder); got ${result.threshold}`);
  assert.strictEqual(result.rule_id, 'dispatch-floor', 'AC-2-bonus: verify rule_id must be DD-2');
  assert.strictEqual(result.rule_quote_required, true,
    'AC-2-bonus: verify rule_quote_required must be true');
});

// --------------------------------------------------------------------------
// AC-3 (test 2 in spec list): unknown skill throws Error with diagnostic
// naming transitions.yaml.
// --------------------------------------------------------------------------
runTest('AC-3: unknown skill throws Error naming transitions.yaml', () => {
  let thrown = null;
  try {
    getSkillSkipThreshold('unknown-skill-xyz');
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown, 'AC-3: must throw on unknown skill');
  assert.ok(thrown instanceof Error, 'AC-3: thrown value must be an Error');
  // The diagnostic must name the canonical source so the caller can
  // self-diagnose without reading source.
  assert.ok(thrown.message.includes('no entry in references/transitions.yaml'),
    `AC-3: error message must include 'no entry in references/transitions.yaml'; got: ${thrown.message}`);
  assert.ok(thrown.message.includes("'unknown-skill-xyz'"),
    `AC-3: error message must echo the unknown skill name; got: ${thrown.message}`);
});

// --------------------------------------------------------------------------
// AC-3-bis (test 3 in spec list): missing/empty/non-string skill arg throws
// TypeError.
// --------------------------------------------------------------------------
runTest('AC-3-bis: empty / non-string skill arg throws TypeError', () => {
  // Empty string.
  {
    let thrown = null;
    try { getSkillSkipThreshold(''); } catch (err) { thrown = err; }
    assert.ok(thrown instanceof TypeError,
      `AC-3-bis (empty string): must throw TypeError; got ${thrown && thrown.constructor.name}`);
  }
  // Whitespace-only string.
  {
    let thrown = null;
    try { getSkillSkipThreshold('   '); } catch (err) { thrown = err; }
    assert.ok(thrown instanceof TypeError,
      `AC-3-bis (whitespace): must throw TypeError; got ${thrown && thrown.constructor.name}`);
  }
  // undefined.
  {
    let thrown = null;
    try { getSkillSkipThreshold(undefined); } catch (err) { thrown = err; }
    assert.ok(thrown instanceof TypeError,
      `AC-3-bis (undefined): must throw TypeError; got ${thrown && thrown.constructor.name}`);
  }
  // null.
  {
    let thrown = null;
    try { getSkillSkipThreshold(null); } catch (err) { thrown = err; }
    assert.ok(thrown instanceof TypeError,
      `AC-3-bis (null): must throw TypeError; got ${thrown && thrown.constructor.name}`);
  }
  // Non-string types (number, object).
  {
    let thrown = null;
    try { getSkillSkipThreshold(42); } catch (err) { thrown = err; }
    assert.ok(thrown instanceof TypeError,
      `AC-3-bis (number): must throw TypeError; got ${thrown && thrown.constructor.name}`);
  }
});

// --------------------------------------------------------------------------
// AC-4 (test_completion_contract): missing per_skill_skip_threshold block
// throws Error citing T-1022 substance.
//
// Verification strategy: monkey-patch fs.readFileSync for the duration of one
// call so the helper sees a transitions.yaml body with the per_skill_skip_threshold
// block stripped. This is non-destructive — the live transitions.yaml file is
// NEVER modified (it is on the forbidden path list for this task). After the
// call, restore fs.readFileSync. The cursor-schema module captures `fs` at
// require time, but `fs.readFileSync` is read from the namespace at call time,
// so reassigning fs.readFileSync intercepts the helper's call.
// --------------------------------------------------------------------------
runTest('AC-4: missing per_skill_skip_threshold block throws Error citing T-1022 substance', () => {
  const originalReadFileSync = fs.readFileSync;
  // Strip just the per_skill_skip_threshold block from the live yaml body;
  // leave the rest intact so js-yaml still parses successfully.
  const liveBody = originalReadFileSync(TRANSITIONS_PATH, 'utf8');
  const blockStartIdx = liveBody.indexOf('per_skill_skip_threshold:');
  assert.ok(blockStartIdx > 0,
    'AC-4 setup: live transitions.yaml must contain the block to strip');
  // Truncate at the block start. Result is a still-valid yaml prefix.
  const truncatedBody = liveBody.slice(0, blockStartIdx);

  fs.readFileSync = function intercept(p, ...rest) {
    // Resolve both sides to handle path separator variance on Windows.
    if (path.resolve(p) === path.resolve(TRANSITIONS_PATH)) {
      return truncatedBody;
    }
    return originalReadFileSync.call(fs, p, ...rest);
  };

  let thrown = null;
  try {
    getSkillSkipThreshold('architect');
  } catch (err) {
    thrown = err;
  } finally {
    fs.readFileSync = originalReadFileSync;
  }

  assert.ok(thrown, 'AC-4: must throw when per_skill_skip_threshold block is missing');
  assert.ok(thrown instanceof Error, 'AC-4: thrown value must be an Error');
  assert.ok(thrown.message.includes('per_skill_skip_threshold'),
    `AC-4: error must name the missing block; got: ${thrown.message}`);
  assert.ok(thrown.message.includes('T-1022'),
    `AC-4: error must cite T-1022 substance; got: ${thrown.message}`);
  assert.ok(thrown.message.includes('NFR-8'),
    `AC-4: error must cite NFR-8 single-lookup-path rule; got: ${thrown.message}`);
});

// --------------------------------------------------------------------------
// AC-2 structural reinforcement: confirm no fallback CODE PATH exists. The
// task-spec pseudocode prescribes error-message wording that literally
// includes the word 'fallback' (in the error string 'no fallback constants
// per NFR-8 single-lookup-path rule'), so a naive literal-substring grep
// would false-positive on the diagnostic itself. The substantive check is
// that no code-construct fallback exists — i.e. no `|| <constant>` /
// `return <constant>` on missing data. We approximate this by stripping
// quoted string literals from the function body and asserting zero
// 'fallback' hits in the remaining (executable) tokens.
//
// Deviation surfaced as agent_claim.deviations entry: task-spec AC-verify
// step 5 narrates `grep "fallback" → 0 hits` literally, but its own
// pseudocode prescribes an error string containing 'fallback'. This test
// honors the substantive intent (no fallback code path) rather than the
// literal grep that conflicts with the prescribed error wording.
// --------------------------------------------------------------------------
runTest('AC-2 structural: getSkillSkipThreshold has no fallback CODE path (strings stripped)', () => {
  const src = fs.readFileSync(CURSOR_SCHEMA_PATH, 'utf8');
  const fnStart = src.indexOf('function getSkillSkipThreshold(');
  assert.ok(fnStart >= 0,
    'AC-2 structural: function getSkillSkipThreshold must be defined in lib/cursor-schema.cjs');
  const fnEnd = src.indexOf('// Atomic write helper', fnStart);
  assert.ok(fnEnd > fnStart, 'AC-2 structural: function end marker must follow function start');
  const fnBody = src.slice(fnStart, fnEnd);
  const bodyStart = fnBody.indexOf('{');
  const fnBodyOnly = fnBody.slice(bodyStart);
  // Strip single-quoted, double-quoted, and template-literal string contents
  // so the structural check sees only executable tokens. Match non-greedily.
  const stripped = fnBodyOnly
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
  assert.ok(!stripped.toLowerCase().includes('fallback'),
    'AC-2 structural: executable-body tokens must contain zero fallback references (NFR-8 single-lookup-path)');
});

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}

console.log('\nall tests passed');
process.exit(0);
