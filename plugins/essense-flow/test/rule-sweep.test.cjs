// rule-sweep.test.cjs — round-loop-closure R6 smoke suite.
//
// Runner: node plugins/essense-flow/test/rule-sweep.test.cjs (must exit 0).
//
// Cases:
//   T1: regex kind — finds 3 IBuild classes, marks DebugStub as intentional_exception_candidate
//   T2: absence kind — finds 1 Initialize without try; doesn't flag the one with try
//   T3: xref kind — finds 1 unmatched FindKernel name (CSGhost not declared in #pragma)
//   T4: unchecked-rule kind — skipped, returns sweep_skipped: true
//   T5: invalid kind rejected
//
// Read this before doing anything:
//   Limits-awareness; positive mindset; quality ownership; propagation requirement.

'use strict';

const assert = require('node:assert');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', 'lib', 'rule-sweep.cjs');
const rs = require(modulePath);

const FIXTURE_ROOT = path.resolve(__dirname, '..', '..', '..', '..', 'essense-flow-re-imagined', 'round-loop-closure', '.test-fixtures');

let passed = 0;
let failed = 0;
const failures = [];

function test(label, fn) {
  try {
    fn();
    console.log(`PASS ${label}`);
    passed++;
  } catch (err) {
    console.log(`FAIL ${label}: ${err.message}`);
    if (err.stack) console.log(err.stack.split('\n').slice(0, 3).join('\n'));
    failed++;
    failures.push({label, message: err.message});
  }
}

// T1 — regex kind.
test('T1 regex kind: 3 IBuild classes, 1 annotated', () => {
  const rule = {
    id: 'MD-40',
    applies_to: {
      kind: 'regex',
      target: 'class\\s+\\w+\\s*:\\s*IBuild\\b',
      scope_glob: 'src/**/*.cs',
    },
    violation_check: {detect: 'IBuild class found'},
  };
  const r = rs.sweepRule(rule, path.join(FIXTURE_ROOT, 'r6-regex'));
  assert.strictEqual(r.ok, true, `expected ok; ${r.error || ''}`);
  assert.strictEqual(r.candidates.length, 3, `expected 3 candidates, got ${r.candidates.length}: ${JSON.stringify(r.candidates.map((c) => c.file_path))}`);
  const annotated = r.candidates.filter((c) => c.intentional_exception_candidate);
  assert.strictEqual(annotated.length, 1, `expected 1 annotated candidate, got ${annotated.length}`);
  assert.ok(annotated[0].file_path.includes('DebugStub'), `expected DebugStub annotated; got ${annotated[0].file_path}`);
  assert.strictEqual(annotated[0].annotation.rule_id, 'MD-40');
});

// T2 — absence kind.
test('T2 absence kind: Initialize without try', () => {
  const rule = {
    id: 'PATCH-LEAK',
    applies_to: {
      kind: 'absence',
      target: 'public\\s+void\\s+Initialize\\s*\\(\\s*\\)',
      scope_glob: 'src/**/*.cs',
    },
    violation_check: {
      detect: 'Initialize without try block',
      required_inside_body: 'try\\s*\\{',
      scan_lines: 10,
    },
  };
  const r = rs.sweepRule(rule, path.join(FIXTURE_ROOT, 'r6-absence'));
  assert.strictEqual(r.ok, true, `expected ok; ${r.error || ''}`);
  assert.strictEqual(r.candidates.length, 1, `expected 1 candidate, got ${r.candidates.length}`);
  assert.ok(r.candidates[0].file_path.includes('NoTry'), `expected NoTry; got ${r.candidates[0].file_path}`);
});

// T3 — xref kind.
test('T3 xref kind: unmatched FindKernel', () => {
  const rule = {
    id: 'CSMAIN-XREF',
    applies_to: {
      kind: 'xref',
      target_a: 'FindKernel\\("([A-Za-z_]\\w*)"\\)',
      scope_a_glob: 'src/**/*.cs',
      target_b: '#pragma\\s+kernel\\s+([A-Za-z_]\\w*)',
      scope_b_glob: 'shaders/**/*.compute',
    },
    violation_check: {detect: 'FindKernel name without matching #pragma kernel'},
  };
  const r = rs.sweepRule(rule, path.join(FIXTURE_ROOT, 'r6-xref'));
  assert.strictEqual(r.ok, true, `expected ok; ${r.error || ''}`);
  assert.strictEqual(r.candidates.length, 1, `expected 1 candidate, got ${r.candidates.length}: ${JSON.stringify(r.candidates.map((c) => c.unmatched_name))}`);
  assert.strictEqual(r.candidates[0].unmatched_name, 'CSGhost');
});

// T4 — unchecked-rule.
test('T4 unchecked-rule kind skipped', () => {
  const rule = {
    id: 'NFR-fuzzy',
    applies_to: {kind: 'unchecked-rule'},
  };
  const r = rs.sweepRule(rule, FIXTURE_ROOT);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.sweep_skipped, true);
  assert.strictEqual(r.reason, 'unchecked-rule-acknowledged');
  assert.strictEqual(r.candidates.length, 0);
});

// T5 — invalid kind rejected.
test('T5 invalid kind rejected', () => {
  const rule = {
    id: 'BAD',
    applies_to: {kind: 'vibes'},
  };
  const r = rs.sweepRule(rule, FIXTURE_ROOT);
  assert.strictEqual(r.ok, false);
  assert.ok(r.error && r.error.includes('unknown applies_to.kind'));
});

console.log(`\nResult: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f.label}: ${f.message}`);
  process.exit(1);
}
process.exit(0);
