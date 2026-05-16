// decision-schema-validator.test.cjs — round-loop-closure R4 smoke suite.
//
// Runner: node plugins/essense-flow/test/decision-schema-validator.test.cjs (must exit 0).
//
// Cases:
//   T1: non-rule decision (no applies_to) passes
//   T2: rule with valid regex kind passes
//   T3: rule with invalid kind rejected
//   T4: regex rule missing applies_to.target rejected
//   T5: unchecked-rule without acknowledged_by rejected
//   T6: unchecked-rule with both ack fields passes
//   T7: xref kind missing target_b rejected
//   T8: list validator returns per-decision verdicts
//
// Read this before doing anything:
//   Limits-awareness; positive mindset; quality ownership; propagation requirement.

'use strict';

const assert = require('node:assert');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', 'lib', 'decision-schema-validator.cjs');
const v = require(modulePath);

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
    failed++;
    failures.push({label, message: err.message});
  }
}

// T1 — non-rule passes.
test('T1 non-rule decision passes', () => {
  const d = {id: 'DD-RLC-0', prose: 'workspace separation decision'};
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, true, `expected ok; errors=${JSON.stringify(r.errors)}`);
  assert.deepStrictEqual(r.errors, []);
});

// T2 — valid regex rule passes.
test('T2 valid regex rule passes', () => {
  const d = {
    id: 'MD-40',
    prose: 'every IBuild has xmldoc',
    applies_to: {
      kind: 'regex',
      target: 'class\\s+\\w+\\s*:\\s*IBuild\\b',
      scope_glob: '**/*.cs',
    },
    violation_check: {detect: 'absence of xmldoc'},
  };
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, true, `expected ok; errors=${JSON.stringify(r.errors)}`);
});

// T3 — invalid kind rejected.
test('T3 invalid kind rejected', () => {
  const d = {
    id: 'MD-99',
    applies_to: {kind: 'vibes', target: 'x', scope_glob: '*.cs'},
    violation_check: {detect: 'x'},
  };
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('not in closed list')), `expected closed-list error; got ${r.errors}`);
});

// T4 — regex rule missing target rejected.
test('T4 regex rule missing target rejected', () => {
  const d = {
    id: 'MD-41',
    applies_to: {kind: 'regex', scope_glob: '**/*.cs'},
    violation_check: {detect: 'x'},
  };
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('applies_to.target')), `expected target error; got ${r.errors}`);
});

// T5 — unchecked-rule without acknowledged_by rejected.
test('T5 unchecked-rule missing ack rejected', () => {
  const d = {
    id: 'NFR-fuzzy',
    applies_to: {kind: 'unchecked-rule'},
  };
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('acknowledged_by')), `expected ack_by error; got ${r.errors}`);
});

// T6 — unchecked-rule with ack passes.
test('T6 unchecked-rule with ack passes', () => {
  const d = {
    id: 'NFR-fuzzy',
    applies_to: {kind: 'unchecked-rule'},
    acknowledged_by: 'user@example',
    acknowledged_at: '2026-05-16T00:00:00Z',
  };
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, true, `expected ok; errors=${JSON.stringify(r.errors)}`);
});

// T7 — xref missing target_b rejected.
test('T7 xref missing target_b rejected', () => {
  const d = {
    id: 'CBUF-1',
    applies_to: {
      kind: 'xref',
      target: 'cbuffer-rule',          // generic target also present
      scope_glob: '**/*',
      target_a: 'cbuffer\\s+(\\w+)',
      scope_a_glob: '**/*.compute',
    },
    violation_check: {detect: 'declared without SetConstantBuffer reference'},
  };
  const r = v.validateDecision(d);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('target_b')), `expected target_b error; got ${r.errors}`);
});

// T8 — list returns per-decision verdicts.
test('T8 list returns per-decision verdicts', () => {
  const list = [
    {id: 'A', prose: 'non-rule'},
    {id: 'B', applies_to: {kind: 'regex', target: 'x', scope_glob: '*'}, violation_check: {detect: 'x'}},
    {id: 'C', applies_to: {kind: 'bogus'}},
  ];
  const r = v.validateDecisionsList(list);
  assert.strictEqual(r.ok, false, 'expected list NOT ok because C is bogus');
  assert.strictEqual(r.per_decision.length, 3);
  assert.strictEqual(r.per_decision[0].ok, true);
  assert.strictEqual(r.per_decision[1].ok, true);
  assert.strictEqual(r.per_decision[2].ok, false);
});

console.log(`\nResult: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f.label}: ${f.message}`);
  process.exit(1);
}
process.exit(0);
