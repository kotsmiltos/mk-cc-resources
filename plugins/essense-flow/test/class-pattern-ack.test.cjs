// class-pattern-ack.test.cjs — v0.13.4 L1 regression coverage for
// evalCountPredicate's subtractKey: 'class_acknowledged' extension on the
// review predicate path (bin/essense-flow-tools.cjs:2227-2245).
//
// Runner: node plugins/essense-flow/test/class-pattern-ack.test.cjs
// (must exit 0). Built-in node assert; no external test framework.
//
// Read this before doing anything
//   - Limits-awareness: Claude drifts. Per-finding-id acks already worked
//     pre-0.13.4 (verify skill's `acknowledged` subtractKey path is the
//     prior art at L2250). This extension adds the SECOND subtractKey
//     'class_acknowledged' on the review path so master can class-ack a
//     pattern (not a finding_id) and the next sprint's CLI gate honors it.
//     Without these tests, a one-character typo in the cucMatch branch could
//     silently revert L1 to legacy semantics — every sprint manufactures
//     fresh finding_ids; per-id acks never carry forward; loop reignites.
//   - Positive mindset: pure-function evalCountPredicate is tractable to
//     exhaustively unit-test without spawning the CLI. Fixtures are tiny.
//   - Quality ownership: AC-1 (raw 5 - class 5 = effective 0 → predicate
//     `== 0` passes) is the load-bearing gate; AC-3 (no class_acknowledged
//     field → default 0 → back-compat preserved for pre-0.13.4 frontmatter)
//     is the back-compat gate. Both must hold.
//   - Propagation requirement: future predicate authors follow the
//     {ok, kind, observed} return shape; subtractKey extensions on other
//     predicate paths follow the verify/review precedent.
//
// Coverage:
//   AC-1: confirmed_unacknowledged_criticals=5 + class_acknowledged=5
//         → predicate `== 0` PASSES (effective_observed = max(0, 5-5) = 0).
//   AC-2: confirmed_unacknowledged_criticals=5 + class_acknowledged=3
//         → predicate `== 0` FAILS (effective = 2; kind=predicate-false).
//   AC-3: confirmed_unacknowledged_criticals=5 + NO class_acknowledged field
//         → predicate `== 0` FAILS (default 0 subtraction; effective = 5;
//         back-compat with pre-0.13.4 frontmatter).
//   AC-4: confirmed_unacknowledged_criticals=5 + class_acknowledged=10
//         → predicate `== 0` PASSES (max-clamp at 0; effective = 0 not -5).
//   AC-5: confirmed_unacknowledged_criticals=3 + class_acknowledged=0
//         → predicate `> 0` PASSES (effective = 3 > 0; triaging path
//         honored — when class-acks don't cover the criticals, sprint
//         routes to triaging, not verifying).
//   AC-6: confirmed_unacknowledged_criticals=3 + class_acknowledged=3
//         → predicate `> 0` FAILS (effective = 0; triaging predicate
//         REJECTS — class-acks DID cover the criticals, so route is
//         verifying not triaging; symmetric drift closed).
//   AC-7: class_acknowledged is a string (malformed frontmatter) → predicate
//         returns kind=predicate-false with observed naming the offending
//         field. Fail-loud over silent-zero.
//
// Closes v0.13.4 L1 regression coverage per redesign/06-decisions.md
// 2026-05-18 "Decision: terminate pipeline review-loop via L1+L2+L4
// structural fix".

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TOOLS_MODULE_PATH = path.join(PLUGIN_ROOT, 'bin', 'essense-flow-tools.cjs');

delete require.cache[require.resolve(TOOLS_MODULE_PATH)];
const tools = require(TOOLS_MODULE_PATH);
const { evalCountPredicate } = tools;

assert.strictEqual(
  typeof evalCountPredicate,
  'function',
  'evalCountPredicate must be exported for L1 regression coverage; check ' +
    'bin/essense-flow-tools.cjs module.exports surface',
);

// --------------------------------------------------------------------------
// Test harness — minimal assert wrapper printing per-test pass/fail lines
// (mirrors test-mode-guard.test.cjs convention for consistency with
// run-all.cjs aggregate output).
// --------------------------------------------------------------------------
let failures = 0;
function runTest(name, fn) {
  try {
    fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (e) {
    failures++;
    process.stdout.write(`FAIL ${name}\n`);
    process.stdout.write(`  ${e.message}\n`);
    if (e.stack) {
      process.stdout.write(`  ${e.stack.split('\n').slice(1, 4).join('\n  ')}\n`);
    }
  }
}

// --------------------------------------------------------------------------
// Fixture helper — write a QA-REPORT.md with the given frontmatter and
// return its absolute path. Tear-down is per-test (mkdtempSync per AC).
// --------------------------------------------------------------------------
function stageReport(frontmatterYaml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'class-ack-test-'));
  const reportPath = path.join(dir, 'QA-REPORT.md');
  fs.writeFileSync(
    reportPath,
    `---\n${frontmatterYaml}\n---\n\n# QA report (test fixture)\n`,
    'utf8',
  );
  return { dir, reportPath };
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* best-effort */ }
}

// --------------------------------------------------------------------------
// AC-1: raw 5 - class 5 = effective 0 → predicate `== 0` PASSES.
// Load-bearing: this is the "class-ack covered all criticals, advance to
// verifying" path. Without subtractKey honoring, this would have returned
// predicate-false with observed=5.
// --------------------------------------------------------------------------
runTest('AC-1: raw=5 class=5 == 0 → ok=true (effective=0)', () => {
  const { dir, reportPath } = stageReport(
    'schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 5\nclass_acknowledged: 5',
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '==',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, true, `expected ok=true; got ${JSON.stringify(r)}`);
    assert.strictEqual(r.kind, 'count-predicate-pass');
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// AC-2: raw 5 - class 3 = effective 2 → predicate `== 0` FAILS.
// Partial class-ack does NOT advance; the remaining 2 unacked criticals
// keep the gate closed.
// --------------------------------------------------------------------------
runTest('AC-2: raw=5 class=3 == 0 → ok=false (effective=2)', () => {
  const { dir, reportPath } = stageReport(
    'schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 5\nclass_acknowledged: 3',
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '==',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.kind, 'predicate-false');
    assert.ok(
      /effective_confirmed_unacknowledged_criticals=2/.test(r.observed),
      `expected observed to name effective=2; got ${r.observed}`,
    );
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// AC-3: no class_acknowledged field → default 0 → effective = raw → back-
// compat with pre-0.13.4 QA-REPORT.md. Frontmatter authored by master
// running pre-0.13.4 review skill must keep working under 0.13.4 CLI.
// --------------------------------------------------------------------------
runTest('AC-3: raw=5 no-class-field == 0 → ok=false (back-compat; effective=5)', () => {
  const { dir, reportPath } = stageReport(
    'schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 5',
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '==',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.kind, 'predicate-false');
    // No subtractKey was found in frontmatter; observed should report raw
    // value without the "effective_" prefix (subtractKey was OPTIONAL).
    assert.ok(
      /confirmed_unacknowledged_criticals=5/.test(r.observed),
      `expected observed to name raw=5; got ${r.observed}`,
    );
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// AC-4: max-clamp at 0 — class_acknowledged > confirmed_unacknowledged_
// criticals must NOT produce a negative effective value. Author error in
// ledger should fail-soft toward "no remaining criticals," not crash.
// --------------------------------------------------------------------------
runTest('AC-4: raw=5 class=10 == 0 → ok=true (max-clamp; effective=0 not -5)', () => {
  const { dir, reportPath } = stageReport(
    'schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 5\nclass_acknowledged: 10',
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '==',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.kind, 'count-predicate-pass');
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// AC-5: triaging predicate path — operator `>`. When class-acks don't
// cover the criticals, the route is triaging (effective > 0).
// --------------------------------------------------------------------------
runTest('AC-5: raw=3 class=0 > 0 → ok=true (triaging route; effective=3)', () => {
  const { dir, reportPath } = stageReport(
    'schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 3\nclass_acknowledged: 0',
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '>',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.kind, 'count-predicate-pass');
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// AC-6: triaging predicate REJECTS when class-acks covered the criticals.
// Symmetric drift closed: master tries `--value triaging` after class-
// acking everything → predicate refuses → master must call `--value
// verifying` instead. The CLI op is the structural gate.
// --------------------------------------------------------------------------
runTest('AC-6: raw=3 class=3 > 0 → ok=false (verifying route; effective=0)', () => {
  const { dir, reportPath } = stageReport(
    'schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 3\nclass_acknowledged: 3',
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '>',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.kind, 'predicate-false');
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// AC-7: malformed class_acknowledged field (string instead of number) →
// fail-loud, not silent-zero. The existing evalCountPredicate Number.is
// Finite guard catches this; this AC asserts the guard applies to the
// subtractKey field too, not just the primary key.
// --------------------------------------------------------------------------
runTest('AC-7: class_acknowledged="abc" → ok=false (malformed; named)', () => {
  const { dir, reportPath } = stageReport(
    "schema_version: 1\nsprint: 1\nconfirmed_unacknowledged_criticals: 5\nclass_acknowledged: 'abc'",
  );
  try {
    const r = evalCountPredicate({
      fullPath: reportPath,
      key: 'confirmed_unacknowledged_criticals',
      operator: '==',
      operand: 0,
      subtractKey: 'class_acknowledged',
    });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.kind, 'predicate-false');
    assert.ok(
      /class_acknowledged/.test(r.observed) && /not a number/.test(r.observed),
      `expected malformed-named diagnostic; got ${r.observed}`,
    );
  } finally { cleanup(dir); }
});

// --------------------------------------------------------------------------
// Aggregate report — exit propagates failure count for run-all.cjs.
// --------------------------------------------------------------------------
process.stdout.write(`\nTotal: 7; Failures: ${failures}\n`);
process.exit(failures > 0 ? 1 : 0);
