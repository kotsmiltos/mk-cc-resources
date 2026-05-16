// pattern-debt-sweep.test.cjs — round-loop-closure R7 smoke.
//
// T1: no prior rounds → empty replays + prior_rounds_found 0
// T2: 1 prior round with MD-40; current sweep finds Old.cs (resolved) + NewRegression.cs (new).
//     Expected: 1 replay; new_hits=1 (NewRegression); Old.cs filtered out as resolved_hit.

'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const m = require(path.resolve(__dirname, '..', 'lib', 'pattern-debt-sweep.cjs'));
const FIXTURE = path.resolve(__dirname, '..', '..', '..', '..', 'essense-flow-re-imagined', 'round-loop-closure', '.test-fixtures');

let passed = 0, failed = 0;
function test(label, fn) {
  try { fn(); console.log('PASS', label); passed++; }
  catch (e) { console.log('FAIL', label, e.message); failed++; }
}

test('T1 no prior rounds returns empty', () => {
  const r = m.sweepPatternDebt({projectRoot: path.join(FIXTURE, 'r6-regex')});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.prior_rounds_found, 0);
  assert.strictEqual(r.replays.length, 0);
});

test('T2 prior round MD-40 → 1 new recurrence', () => {
  const projectRoot = path.join(FIXTURE, 'r7-debt');
  const yamlText = fs.readFileSync(path.join(projectRoot, '.pipeline', 'architecture', 'decisions.yaml'), 'utf8');
  const yaml = require(path.resolve(__dirname, '..', 'node_modules', 'js-yaml'));
  const decisions = yaml.load(yamlText);
  const r = m.sweepPatternDebt({projectRoot, decisions});
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(r.prior_rounds_found, 1);
  assert.strictEqual(r.replays.length, 1);
  const replay = r.replays[0];
  assert.strictEqual(replay.rule_id, 'MD-40');
  assert.strictEqual(replay.status, 'replayed');
  // NewRegression.cs is new (not resolved in prior round); Old.cs filtered by resolved_hit.
  assert.strictEqual(replay.new_hits.length, 1, `expected 1 new_hit, got ${replay.new_hits.length}: ${JSON.stringify(replay.new_hits)}`);
  assert.ok(replay.new_hits[0].file_path.includes('NewRegression'));
});

console.log(`\nResult: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
