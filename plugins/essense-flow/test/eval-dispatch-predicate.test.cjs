// eval-dispatch-predicate.test.cjs — covers AC-1..AC-6 from T-953 (Sprint 9 round-11)
// + T-1020 AC-1..AC-6 (Sprint 10 W6) Skip-IFF rule-allowed-skip bypass coverage.
//
// Runner: node plugins/essense-flow/test/eval-dispatch-predicate.test.cjs
// (must exit 0). Built-in node assert; no external test framework.
//
// Coverage:
//   T-953:
//     AC-1: alignment-lens phrase recognized and routed to alignment_lens sourceKey.
//     AC-2: lens phrase (without alignment) recognized and routed to lens sourceKey
//           (longest-prefix discipline — alignment lens must win over lens when
//           both substrings could match).
//     AC-3: verifier phrase recognized and routed to verifier sourceKey.
//     AC-4: Non-matching predicate text yields matched=false.
//     AC-5: Missing frontmatter section yields matched=true, sufficient=false
//           (fail-closed per DD-21).
//     AC-6: sufficient flag tracks observed >= threshold across boundary cases
//           (observed == threshold, observed > threshold, observed < threshold).
//
//   T-1020 (Sprint 10 W6 — D-Sprint10-5 + DD-2):
//     T1020-AC-1: DISPATCH_PHRASES gains 4th entry — 'with sufficient
//                 sub-architect dispatch' → 'sub_architect' sourceKey.
//     T1020-AC-2: evalDispatchPredicate accepts 3rd arg ruleAllowedSkip;
//                 omitted/null/undefined preserves legacy semantics.
//     T1020-AC-3: rule-allowed-skip with non-empty rule_quote +
//                 citation_source flips sufficient=true even when
//                 observed<threshold; rule_allowed_skip_honored=true;
//                 rule_quote surfaces in result.
//     T1020-AC-4: rule-allowed-skip with empty/malformed rule_quote OR
//                 empty citation_source OR empty skill is REJECTED →
//                 sufficient=false; rule_allowed_skip_honored=false.
//     T1020-AC-5: fixture-corpus walk — refused fixtures (under-threshold +
//                 no rule-quote) yield sufficient=false (caller wires
//                 EXIT_ALIGNMENT_DRIFT=19); allowed-with-rule-quote
//                 fixtures yield sufficient=true. All 6 fixtures
//                 (architect/review/verify × refused/allowed) covered.
//     T1020-AC-6: rule-allowed-skip is MOOT when threshold already met
//                 (existing threshold-met path wins; rule_quote not
//                 consulted; rule_allowed_skip_honored=false).
//
// Closes R2-SD1 + R2-SD9 cluster A predicate-side per D-Rd11-6 +
// closes Skip-IFF rule-allowed-skip per Sprint 10 W6 D-Sprint10-5 + DD-2.
//
// Read this before doing anything:
//   - Limits-awareness: Claude drifts, loses context, finishes prematurely,
//     defers, takes shortcuts. Re-read when uncertain. Preserve specifics —
//     3 phrases EXACT, no 4th recognizer; longest-prefix preserved.
//   - Positive mindset: DISPATCH_PHRASES closed constant; tractable to verify
//     by reading code, not guessing.
//   - Quality ownership: fail-closed (AC-5) is the discriminating gate —
//     a "missing frontmatter -> sufficient=true" regression silently advances
//     state past the alignment-counter check. AC-5 must fail loudly.
//   - Propagation requirement: future predicate authors follow the
//     { matched, sufficient, sourceKey, observed, threshold } return shape.

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TOOLS_MODULE_PATH = path.join(PLUGIN_ROOT, 'bin', 'essense-flow-tools.cjs');
const SKIP_IFF_FIXTURE_DIR = path.join(PLUGIN_ROOT, 'test', '.test-fixtures', 'skip-allowed-iff');

// Fresh require — defensive, in case test-runner has a stale cache from a
// prior test in the same node process invocation.
delete require.cache[require.resolve(TOOLS_MODULE_PATH)];
const tools = require(TOOLS_MODULE_PATH);
const { evalDispatchPredicate, DISPATCH_PHRASES } = tools;

// --------------------------------------------------------------------------
// Test harness — minimal assert wrapper printing per-test pass/fail lines
// (mirrors test-mode-guard.test.cjs convention for consistency with
// run-all.cjs aggregate output).
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

console.log('eval-dispatch-predicate.test.cjs');
console.log(`  tools module: ${TOOLS_MODULE_PATH}`);

// --------------------------------------------------------------------------
// Sanity precondition (not a graded AC but verifies the load-bearing
// invariant the phrase table relies on — longest-prefix discipline).
// --------------------------------------------------------------------------
runTest('precondition: module exports evalDispatchPredicate + DISPATCH_PHRASES', () => {
  assert.strictEqual(typeof evalDispatchPredicate, 'function', 'evalDispatchPredicate must be exported as a function');
  assert.ok(Array.isArray(DISPATCH_PHRASES), 'DISPATCH_PHRASES must be exported as an array');
  // T-1020 (Sprint 10 W6): closed contract extended to 4 entries per
  // D-Sprint10-5 + DD-2 — adds 'with sufficient sub-architect dispatch'
  // → 'sub_architect' sourceKey for the architect Skip-IFF coverage.
  assert.strictEqual(DISPATCH_PHRASES.length, 4,
    'DISPATCH_PHRASES must have exactly 4 entries post-T-1020 (alignment_lens, lens, verifier, sub_architect)');
});

runTest('precondition: DISPATCH_PHRASES preserves longest-prefix order', () => {
  // alignment-lens phrase MUST be at index 0 (before the bare 'lens'
  // phrase at index 1) so substring containment resolves to the longer
  // phrase first. If the order is reversed, AC-2 will catch it — but
  // making the invariant explicit here surfaces the failure mode at
  // load time rather than at first-match time.
  assert.strictEqual(DISPATCH_PHRASES[0].sourceKey, 'alignment_lens',
    'DISPATCH_PHRASES[0] must be alignment_lens (longest-prefix-first invariant)');
  assert.ok(DISPATCH_PHRASES[0].phrase.includes('alignment lens'),
    'DISPATCH_PHRASES[0].phrase must contain "alignment lens" substring');
  assert.strictEqual(DISPATCH_PHRASES[1].sourceKey, 'lens',
    'DISPATCH_PHRASES[1] must be lens (shorter phrase comes after longer)');
  assert.strictEqual(DISPATCH_PHRASES[2].sourceKey, 'verifier',
    'DISPATCH_PHRASES[2] must be verifier');
  // T-1020: 4th entry appended at end — sub-architect token disjoint from
  // alignment-lens / lens / verifier, so append-at-end preserves the
  // longest-prefix invariant without re-deriving order.
  assert.strictEqual(DISPATCH_PHRASES[3].sourceKey, 'sub_architect',
    'DISPATCH_PHRASES[3] must be sub_architect (T-1020 extension)');
  assert.strictEqual(DISPATCH_PHRASES[3].phrase, 'with sufficient sub-architect dispatch',
    'DISPATCH_PHRASES[3].phrase must be "with sufficient sub-architect dispatch" verbatim');
});

// --------------------------------------------------------------------------
// AC-1: alignment-lens phrase recognized and routed to alignment_lens sourceKey.
// --------------------------------------------------------------------------
runTest('AC-1: alignment-lens phrase routes to alignment_lens sourceKey', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      alignment_lens: { observed: 3, threshold: 3 },
      lens:           { observed: 0, threshold: 0 },
      verifier:       { observed: 0, threshold: 0 },
    },
  };
  const result = evalDispatchPredicate(
    'round-close with sufficient alignment lens dispatch',
    cursorState,
  );
  assert.strictEqual(result.matched, true, 'AC-1: matched must be true');
  assert.strictEqual(result.sourceKey, 'alignment_lens',
    'AC-1: sourceKey must be alignment_lens (NOT lens — longest-prefix discipline)');
  assert.strictEqual(result.observed, 3, 'AC-1: observed must be 3 (read from alignment_lens bucket)');
  assert.strictEqual(result.threshold, 3, 'AC-1: threshold must be 3 (read from alignment_lens bucket)');
  assert.strictEqual(result.sufficient, true, 'AC-1: sufficient must be true (observed >= threshold)');
});

// --------------------------------------------------------------------------
// AC-2: lens phrase (without 'alignment' modifier) recognized and routed to
// lens sourceKey. This is the longest-prefix discipline guard: when only the
// shorter phrase is present, lens wins; when the longer 'alignment lens' is
// present, AC-1 ensures alignment_lens wins.
// --------------------------------------------------------------------------
runTest('AC-2: bare lens phrase routes to lens sourceKey (NOT alignment_lens)', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      alignment_lens: { observed: 0, threshold: 99 },
      lens:           { observed: 5, threshold: 5  },
      verifier:       { observed: 0, threshold: 0  },
    },
  };
  // Predicate contains 'with sufficient lens dispatch' but NOT 'alignment lens'.
  const result = evalDispatchPredicate(
    'phase-advance with sufficient lens dispatch',
    cursorState,
  );
  assert.strictEqual(result.matched, true, 'AC-2: matched must be true');
  assert.strictEqual(result.sourceKey, 'lens',
    'AC-2: sourceKey must be lens (alignment is not in the predicate)');
  assert.strictEqual(result.observed, 5, 'AC-2: observed must be 5 (read from lens bucket)');
  assert.strictEqual(result.threshold, 5, 'AC-2: threshold must be 5 (read from lens bucket)');
  assert.strictEqual(result.sufficient, true, 'AC-2: sufficient must be true');
});

// --------------------------------------------------------------------------
// AC-3: verifier phrase recognized and routed to verifier sourceKey.
// --------------------------------------------------------------------------
runTest('AC-3: verifier phrase routes to verifier sourceKey', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      alignment_lens: { observed: 0, threshold: 0 },
      lens:           { observed: 0, threshold: 0 },
      verifier:       { observed: 2, threshold: 1 },
    },
  };
  const result = evalDispatchPredicate(
    'gate-pass with sufficient verifier dispatch',
    cursorState,
  );
  assert.strictEqual(result.matched, true, 'AC-3: matched must be true');
  assert.strictEqual(result.sourceKey, 'verifier', 'AC-3: sourceKey must be verifier');
  assert.strictEqual(result.observed, 2, 'AC-3: observed must be 2 (read from verifier bucket)');
  assert.strictEqual(result.threshold, 1, 'AC-3: threshold must be 1 (read from verifier bucket)');
  assert.strictEqual(result.sufficient, true, 'AC-3: sufficient must be true (2 >= 1)');
});

// --------------------------------------------------------------------------
// AC-4: Non-matching predicate text yields matched=false.
// --------------------------------------------------------------------------
runTest('AC-4: non-matching predicate yields matched=false', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      alignment_lens: { observed: 9, threshold: 1 },
      lens:           { observed: 9, threshold: 1 },
      verifier:       { observed: 9, threshold: 1 },
    },
  };
  const result = evalDispatchPredicate(
    '.pipeline/architecture/sprints/9/manifest.yaml exists',
    cursorState,
  );
  assert.strictEqual(result.matched, false, 'AC-4: matched must be false for path-exists predicate');
  assert.strictEqual(result.sufficient, false, 'AC-4: sufficient must be false when not matched');
  assert.strictEqual(result.sourceKey, null, 'AC-4: sourceKey must be null when not matched');
  assert.strictEqual(result.observed, null, 'AC-4: observed must be null when not matched');
  assert.strictEqual(result.threshold, null, 'AC-4: threshold must be null when not matched');
});

runTest('AC-4 bonus: empty / non-string predicate yields matched=false', () => {
  // Defensive: non-string inputs must not crash, must return safe shape.
  for (const probe of [null, undefined, 0, {}, [], '']) {
    const result = evalDispatchPredicate(probe, {});
    assert.strictEqual(result.matched, false,
      `non-string/empty input must yield matched=false; got ${JSON.stringify(result)} for input ${JSON.stringify(probe)}`);
  }
});

// --------------------------------------------------------------------------
// AC-5: Missing frontmatter section yields matched=true, sufficient=false
// (fail-closed per DD-21).
//
// This is the load-bearing assertion of T-953: when the predicate phrase
// matches BUT the corresponding cursorState bucket is missing, the function
// MUST report matched=true (so the caller knows it owns this predicate)
// AND sufficient=false (so the caller fail-closes the transition).
//
// A regression where missing frontmatter silently yields sufficient=true
// would advance state past the alignment-counter check — exactly the
// drift the predicate exists to prevent.
// --------------------------------------------------------------------------
runTest('AC-5: missing frontmatter section -> matched=true, sufficient=false (fail-closed)', () => {
  // Case 5a: cursorState entirely null.
  {
    const result = evalDispatchPredicate('with sufficient alignment lens dispatch', null);
    assert.strictEqual(result.matched, true, 'AC-5a: matched must be true (phrase recognized)');
    assert.strictEqual(result.sufficient, false, 'AC-5a: sufficient MUST be false (fail-closed)');
    assert.strictEqual(result.sourceKey, 'alignment_lens', 'AC-5a: sourceKey must still surface for caller diagnostics');
    assert.strictEqual(result.observed, null, 'AC-5a: observed must be null');
    assert.strictEqual(result.threshold, null, 'AC-5a: threshold must be null');
  }
  // Case 5b: cursorState present but missing alignment_lens_dispatches_per_round.
  {
    const result = evalDispatchPredicate(
      'with sufficient alignment lens dispatch',
      { some_other_field: 1 },
    );
    assert.strictEqual(result.matched, true, 'AC-5b: matched must be true');
    assert.strictEqual(result.sufficient, false, 'AC-5b: sufficient MUST be false');
  }
  // Case 5c: alignment_lens_dispatches_per_round present but specific sourceKey missing.
  {
    const result = evalDispatchPredicate(
      'with sufficient verifier dispatch',
      {
        alignment_lens_dispatches_per_round: {
          alignment_lens: { observed: 1, threshold: 1 },
          // verifier intentionally absent
        },
      },
    );
    assert.strictEqual(result.matched, true, 'AC-5c: matched must be true (verifier phrase recognized)');
    assert.strictEqual(result.sufficient, false, 'AC-5c: sufficient MUST be false (verifier bucket absent)');
    assert.strictEqual(result.sourceKey, 'verifier', 'AC-5c: sourceKey must still surface');
  }
  // Case 5d: bucket present but missing observed.
  {
    const result = evalDispatchPredicate(
      'with sufficient lens dispatch',
      {
        alignment_lens_dispatches_per_round: {
          lens: { threshold: 3 /* observed absent */ },
        },
      },
    );
    assert.strictEqual(result.matched, true, 'AC-5d: matched must be true');
    assert.strictEqual(result.sufficient, false, 'AC-5d: sufficient MUST be false (observed missing)');
    assert.strictEqual(result.observed, null, 'AC-5d: observed must be null');
    assert.strictEqual(result.threshold, 3, 'AC-5d: threshold must still surface');
  }
  // Case 5e: bucket present but missing threshold.
  {
    const result = evalDispatchPredicate(
      'with sufficient lens dispatch',
      {
        alignment_lens_dispatches_per_round: {
          lens: { observed: 5 /* threshold absent */ },
        },
      },
    );
    assert.strictEqual(result.matched, true, 'AC-5e: matched must be true');
    assert.strictEqual(result.sufficient, false, 'AC-5e: sufficient MUST be false (threshold missing)');
    assert.strictEqual(result.observed, 5, 'AC-5e: observed must still surface');
    assert.strictEqual(result.threshold, null, 'AC-5e: threshold must be null');
  }
});

// --------------------------------------------------------------------------
// AC-6: sufficient flag tracks observed >= threshold across boundary cases.
// --------------------------------------------------------------------------
runTest('AC-6: sufficient = (observed >= threshold) — boundary table', () => {
  const cases = [
    { observed: 0, threshold: 0, expected: true,  label: 'both zero (boundary equal)' },
    { observed: 1, threshold: 0, expected: true,  label: 'observed > threshold' },
    { observed: 5, threshold: 5, expected: true,  label: 'equal (boundary)' },
    { observed: 4, threshold: 5, expected: false, label: 'observed < threshold (off by one)' },
    { observed: 0, threshold: 1, expected: false, label: 'observed=0 threshold=1 (cold start)' },
    { observed: 100, threshold: 3, expected: true, label: 'observed >> threshold (typical)' },
  ];
  for (const c of cases) {
    const result = evalDispatchPredicate(
      'with sufficient alignment lens dispatch',
      {
        alignment_lens_dispatches_per_round: {
          alignment_lens: { observed: c.observed, threshold: c.threshold },
        },
      },
    );
    assert.strictEqual(result.matched, true, `AC-6 [${c.label}]: matched must be true`);
    assert.strictEqual(result.sufficient, c.expected,
      `AC-6 [${c.label}]: sufficient must be ${c.expected} for observed=${c.observed} threshold=${c.threshold}; got ${result.sufficient}`);
    assert.strictEqual(result.observed, c.observed, `AC-6 [${c.label}]: observed must surface verbatim`);
    assert.strictEqual(result.threshold, c.threshold, `AC-6 [${c.label}]: threshold must surface verbatim`);
  }
});

// --------------------------------------------------------------------------
// Extra coverage: predicate normalization (case-fold + whitespace collapse).
// Not a graded AC, but documents the normalization contract so future
// changes that break it surface here rather than in production.
// --------------------------------------------------------------------------
runTest('normalization: case-folded + whitespace-collapsed matching', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      alignment_lens: { observed: 1, threshold: 1 },
    },
  };
  // Mixed case + extra whitespace + leading/trailing whitespace.
  const result = evalDispatchPredicate(
    '   WITH   Sufficient    Alignment\tLens   Dispatch   ',
    cursorState,
  );
  assert.strictEqual(result.matched, true,
    'normalization must collapse whitespace + case-fold for matching');
  assert.strictEqual(result.sourceKey, 'alignment_lens');
});

// ==========================================================================
// T-1020 (Sprint 10 W6 — D-Sprint10-5 + DD-2) Skip-IFF rule-allowed-skip
// bypass coverage.
//
// These tests exercise the 3rd-arg `ruleAllowedSkip` extension to
// evalDispatchPredicate. Substrate-verified against actual current
// tools.cjs line numbers (DISPATCH_PHRASES @ L1918, evalDispatchPredicate
// @ L1944 — task-spec narrated L1793-L1854 region was stale by ~125
// lines; surfaced as SC-T1020-substrate-drift in agent self-report).
// ==========================================================================

// T-1020 AC-1 — DISPATCH_PHRASES has a 4th entry for the architect
// sub-dispatch domain. Predicate routing to sub_architect sourceKey works
// the same as the prior three sourceKeys.
runTest('T1020-AC-1: sub-architect phrase routes to sub_architect sourceKey', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      sub_architect: { observed: 2, threshold: 1 },
    },
  };
  const result = evalDispatchPredicate(
    'decomposing-to-architecture with sufficient sub-architect dispatch',
    cursorState,
  );
  assert.strictEqual(result.matched, true, 'T1020-AC-1: matched must be true');
  assert.strictEqual(result.sourceKey, 'sub_architect',
    'T1020-AC-1: sourceKey must be sub_architect (4th DISPATCH_PHRASES entry)');
  assert.strictEqual(result.observed, 2, 'T1020-AC-1: observed reads from sub_architect bucket');
  assert.strictEqual(result.threshold, 1, 'T1020-AC-1: threshold reads from sub_architect bucket');
  assert.strictEqual(result.sufficient, true,
    'T1020-AC-1: sufficient true via threshold-met path (2 >= 1)');
  assert.strictEqual(result.rule_allowed_skip_honored, false,
    'T1020-AC-1: rule_allowed_skip_honored false (rule not consulted on threshold-met path)');
  assert.strictEqual(result.rule_quote, null,
    'T1020-AC-1: rule_quote null when rule not consulted');
});

// T-1020 AC-2 — 3rd arg ruleAllowedSkip accepted; backward compatibility
// preserved when omitted / null / undefined.
runTest('T1020-AC-2: 3rd arg ruleAllowedSkip accepted; omitted preserves legacy semantics', () => {
  const cursorState = {
    alignment_lens_dispatches_per_round: {
      sub_architect: { observed: 0, threshold: 5 },
    },
  };
  // 2a — third arg omitted entirely; default null. Under-threshold without
  // rule-allowed-skip → sufficient=false.
  {
    const result = evalDispatchPredicate(
      'with sufficient sub-architect dispatch',
      cursorState,
    );
    assert.strictEqual(result.matched, true, 'T1020-AC-2a: matched true (phrase recognized)');
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-2a: omitted ruleAllowedSkip → fail-closed (under-threshold)');
    assert.strictEqual(result.rule_allowed_skip_honored, false,
      'T1020-AC-2a: rule_allowed_skip_honored false when arg omitted');
    assert.strictEqual(result.rule_quote, null,
      'T1020-AC-2a: rule_quote null when rule not consulted');
  }
  // 2b — explicit null.
  {
    const result = evalDispatchPredicate(
      'with sufficient sub-architect dispatch',
      cursorState,
      null,
    );
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-2b: explicit null ruleAllowedSkip → fail-closed');
    assert.strictEqual(result.rule_allowed_skip_honored, false,
      'T1020-AC-2b: rule_allowed_skip_honored false when arg null');
  }
  // 2c — explicit undefined.
  {
    const result = evalDispatchPredicate(
      'with sufficient sub-architect dispatch',
      cursorState,
      undefined,
    );
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-2c: explicit undefined ruleAllowedSkip → fail-closed');
  }
});

// T-1020 AC-3 — well-formed ruleAllowedSkip with non-empty rule_quote +
// citation_source flips sufficient=true even when observed<threshold.
// Asserted across ALL THREE skill domains (architect, review, verify) to
// confirm the bypass is skill-agnostic (works on any matched dispatch
// phrase, not just sub-architect).
runTest('T1020-AC-3: rule-allowed-skip flips sufficient=true under threshold (architect)', () => {
  const result = evalDispatchPredicate(
    'with sufficient sub-architect dispatch',
    {
      alignment_lens_dispatches_per_round: {
        sub_architect: { observed: 0, threshold: 5 },
      },
    },
    {
      skill: 'architect',
      rule_quote: 'modules.length == 1 AND scope == condensed AND user-prior-ratification cited',
      citation_source: 'D-Sprint10-5',
    },
  );
  assert.strictEqual(result.matched, true, 'T1020-AC-3 (architect): matched true');
  assert.strictEqual(result.sufficient, true,
    'T1020-AC-3 (architect): sufficient flipped to true via rule-allowed-skip bypass');
  assert.strictEqual(result.rule_allowed_skip_honored, true,
    'T1020-AC-3 (architect): rule_allowed_skip_honored=true');
  assert.strictEqual(result.rule_quote,
    'modules.length == 1 AND scope == condensed AND user-prior-ratification cited',
    'T1020-AC-3 (architect): rule_quote surfaces verbatim');
  assert.strictEqual(result.observed, 0,
    'T1020-AC-3 (architect): observed still surfaces (was 0)');
  assert.strictEqual(result.threshold, 5,
    'T1020-AC-3 (architect): threshold still surfaces (was 5)');
});

runTest('T1020-AC-3: rule-allowed-skip flips sufficient=true under threshold (review)', () => {
  const result = evalDispatchPredicate(
    'phase-advance with sufficient lens dispatch',
    {
      alignment_lens_dispatches_per_round: {
        lens: { observed: 0, threshold: 6 },
      },
    },
    {
      skill: 'review',
      rule_quote: 'rule-allowed-substance-quote cited (per skill-substance/review.md DD-2 review-lens-dispatch Skip-IFF rule)',
      citation_source: 'D-Sprint10-5',
    },
  );
  assert.strictEqual(result.sufficient, true,
    'T1020-AC-3 (review): rule-allowed-skip honored on lens phrase');
  assert.strictEqual(result.rule_allowed_skip_honored, true,
    'T1020-AC-3 (review): rule_allowed_skip_honored=true');
});

runTest('T1020-AC-3: rule-allowed-skip flips sufficient=true under threshold (verify)', () => {
  const result = evalDispatchPredicate(
    'gate-pass with sufficient verifier dispatch',
    {
      alignment_lens_dispatches_per_round: {
        verifier: { observed: 0, threshold: 1 },
      },
    },
    {
      skill: 'verify',
      rule_quote: 'rule-allowed-substance-quote cited (per skill-substance/verify.md DD-2 verifier-dispatch Skip-IFF rule)',
      citation_source: 'D-Sprint10-5',
    },
  );
  assert.strictEqual(result.sufficient, true,
    'T1020-AC-3 (verify): rule-allowed-skip honored on verifier phrase');
  assert.strictEqual(result.rule_allowed_skip_honored, true,
    'T1020-AC-3 (verify): rule_allowed_skip_honored=true');
});

// T-1020 AC-4 — malformed ruleAllowedSkip is REJECTED → sufficient=false.
// Variants: empty rule_quote, empty citation_source, empty skill,
// missing fields, wrong types.
runTest('T1020-AC-4: malformed rule-allowed-skip rejected (empty rule_quote)', () => {
  const result = evalDispatchPredicate(
    'with sufficient lens dispatch',
    { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
    { skill: 'review', rule_quote: '', citation_source: 'D-Sprint10-5' },
  );
  assert.strictEqual(result.matched, true, 'T1020-AC-4 (empty rule_quote): matched still true');
  assert.strictEqual(result.sufficient, false,
    'T1020-AC-4 (empty rule_quote): MUST reject — sufficient=false');
  assert.strictEqual(result.rule_allowed_skip_honored, false,
    'T1020-AC-4 (empty rule_quote): rule_allowed_skip_honored=false');
  assert.strictEqual(result.rule_quote, null,
    'T1020-AC-4 (empty rule_quote): rule_quote null when rejected');
});

runTest('T1020-AC-4: malformed rule-allowed-skip rejected (empty citation_source)', () => {
  const result = evalDispatchPredicate(
    'with sufficient lens dispatch',
    { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
    { skill: 'review', rule_quote: 'some rule body', citation_source: '' },
  );
  assert.strictEqual(result.sufficient, false,
    'T1020-AC-4 (empty citation_source): MUST reject');
  assert.strictEqual(result.rule_allowed_skip_honored, false,
    'T1020-AC-4 (empty citation_source): rule_allowed_skip_honored=false');
});

runTest('T1020-AC-4: malformed rule-allowed-skip rejected (empty skill)', () => {
  const result = evalDispatchPredicate(
    'with sufficient lens dispatch',
    { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
    { skill: '', rule_quote: 'body', citation_source: 'D-Sprint10-5' },
  );
  assert.strictEqual(result.sufficient, false,
    'T1020-AC-4 (empty skill): MUST reject');
});

runTest('T1020-AC-4: malformed rule-allowed-skip rejected (missing fields / wrong types)', () => {
  // Missing rule_quote field entirely.
  {
    const result = evalDispatchPredicate(
      'with sufficient lens dispatch',
      { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
      { skill: 'review', citation_source: 'D-Sprint10-5' },
    );
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-4 (missing rule_quote): MUST reject');
  }
  // Non-string rule_quote.
  {
    const result = evalDispatchPredicate(
      'with sufficient lens dispatch',
      { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
      { skill: 'review', rule_quote: 12345, citation_source: 'D-Sprint10-5' },
    );
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-4 (non-string rule_quote): MUST reject');
  }
  // Non-object (string passed instead of object).
  {
    const result = evalDispatchPredicate(
      'with sufficient lens dispatch',
      { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
      'not an object',
    );
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-4 (non-object): MUST reject');
  }
  // Array passed instead of object — typeof returns 'object' but lacks fields.
  {
    const result = evalDispatchPredicate(
      'with sufficient lens dispatch',
      { alignment_lens_dispatches_per_round: { lens: { observed: 0, threshold: 6 } } },
      ['skill', 'rule_quote', 'citation_source'],
    );
    assert.strictEqual(result.sufficient, false,
      'T1020-AC-4 (array): MUST reject — array lacks named fields');
  }
});

// T-1020 AC-5 — fixture-corpus walk. Load each cursor.yaml from
// test/.test-fixtures/skip-allowed-iff/, derive the matching predicate
// + bucket + rule_allowed_skip from the fixture, and assert the
// predicate verdict.
//
// Fixture → predicate phrase mapping (per fixture cursor.yaml `skill:`
// field + transitions.yaml per_skill_skip_threshold.<skill>.rule_phrase):
//   architect → 'with sufficient sub-architect dispatch'
//   review    → 'with sufficient lens dispatch'
//   verify    → 'with sufficient verifier dispatch'
//
// IMPORTANT: T-1022 fixtures store dispatch counters under skill-specific
// keys (`review_lens_dispatches_per_round.observed/threshold`,
// `verifier_dispatches_per_round.observed/threshold`) rather than under
// the predicate's `alignment_lens_dispatches_per_round[sourceKey]` shape.
// This test bridges by constructing the predicate-shape cursorState from
// the fixture's flat counters — production callers (state-set-phase,
// write-round-close) will do the same normalization. Surfaced as
// observation in agent self-report.
function deriveFixtureCursorState(fixtureCursor, sourceKey) {
  // Read the fixture's flat dispatch counters and pack them into the
  // alignment_lens_dispatches_per_round[sourceKey] shape that
  // evalDispatchPredicate consumes.
  let observed = null;
  let threshold = null;
  if (sourceKey === 'sub_architect'
      && fixtureCursor.alignment_lens_dispatches_per_round
      && fixtureCursor.alignment_lens_dispatches_per_round.sub_architect) {
    observed = fixtureCursor.alignment_lens_dispatches_per_round.sub_architect.observed;
    threshold = fixtureCursor.alignment_lens_dispatches_per_round.sub_architect.threshold;
  } else if (sourceKey === 'lens' && fixtureCursor.review_lens_dispatches_per_round) {
    observed = fixtureCursor.review_lens_dispatches_per_round.observed;
    threshold = fixtureCursor.review_lens_dispatches_per_round.threshold;
  } else if (sourceKey === 'verifier' && fixtureCursor.verifier_dispatches_per_round) {
    observed = fixtureCursor.verifier_dispatches_per_round.observed;
    threshold = fixtureCursor.verifier_dispatches_per_round.threshold;
  }
  return {
    alignment_lens_dispatches_per_round: {
      [sourceKey]: { observed, threshold },
    },
  };
}

const FIXTURE_MATRIX = [
  // Each entry: { dir, skill, sourceKey, phrase, expectedSufficient,
  // expectedRuleHonored, expectedExitOnRefuse }.
  {
    dir: 'architect-refused',
    skill: 'architect',
    sourceKey: 'sub_architect',
    phrase: 'with sufficient sub-architect dispatch',
    expectedSufficient: false,
    expectedRuleHonored: false,
  },
  {
    dir: 'architect-allowed-with-rule-quote',
    skill: 'architect',
    sourceKey: 'sub_architect',
    phrase: 'with sufficient sub-architect dispatch',
    expectedSufficient: true,
    expectedRuleHonored: true,
  },
  {
    dir: 'review-refused',
    skill: 'review',
    sourceKey: 'lens',
    phrase: 'with sufficient lens dispatch',
    expectedSufficient: false,
    expectedRuleHonored: false,
  },
  {
    dir: 'review-allowed-with-rule-quote',
    skill: 'review',
    sourceKey: 'lens',
    phrase: 'with sufficient lens dispatch',
    expectedSufficient: true,
    expectedRuleHonored: true,
  },
  {
    dir: 'verify-refused',
    skill: 'verify',
    sourceKey: 'verifier',
    phrase: 'with sufficient verifier dispatch',
    expectedSufficient: false,
    expectedRuleHonored: false,
  },
  {
    dir: 'verify-allowed-with-rule-quote',
    skill: 'verify',
    sourceKey: 'verifier',
    phrase: 'with sufficient verifier dispatch',
    expectedSufficient: true,
    expectedRuleHonored: true,
  },
];

runTest('T1020-AC-5: fixture corpus walk — all 6 fixtures yield expected verdicts', () => {
  for (const fx of FIXTURE_MATRIX) {
    const cursorPath = path.join(SKIP_IFF_FIXTURE_DIR, fx.dir, 'cursor.yaml');
    assert.ok(fs.existsSync(cursorPath),
      `T1020-AC-5 [${fx.dir}]: fixture cursor.yaml must exist at ${cursorPath}`);
    const fixtureCursor = yaml.load(fs.readFileSync(cursorPath, 'utf8'));
    const cursorState = deriveFixtureCursorState(fixtureCursor, fx.sourceKey);
    const ruleAllowedSkip = fixtureCursor.rule_allowed_skip || null;

    const result = evalDispatchPredicate(fx.phrase, cursorState, ruleAllowedSkip);
    assert.strictEqual(result.matched, true,
      `T1020-AC-5 [${fx.dir}]: predicate phrase must match`);
    assert.strictEqual(result.sourceKey, fx.sourceKey,
      `T1020-AC-5 [${fx.dir}]: sourceKey must be ${fx.sourceKey}`);
    assert.strictEqual(result.sufficient, fx.expectedSufficient,
      `T1020-AC-5 [${fx.dir}]: sufficient must be ${fx.expectedSufficient}; got ${result.sufficient} (observed=${result.observed}, threshold=${result.threshold}, rule_allowed_skip_present=${ruleAllowedSkip != null})`);
    assert.strictEqual(result.rule_allowed_skip_honored, fx.expectedRuleHonored,
      `T1020-AC-5 [${fx.dir}]: rule_allowed_skip_honored must be ${fx.expectedRuleHonored}`);
    if (fx.expectedRuleHonored) {
      assert.strictEqual(typeof result.rule_quote, 'string',
        `T1020-AC-5 [${fx.dir}]: rule_quote must surface as string when honored`);
      assert.ok(result.rule_quote.length > 0,
        `T1020-AC-5 [${fx.dir}]: rule_quote must be non-empty when honored`);
    } else {
      assert.strictEqual(result.rule_quote, null,
        `T1020-AC-5 [${fx.dir}]: rule_quote must be null when not honored`);
    }
  }
});

// T-1020 AC-5 (b) — fail-closed exit pathway: caller wiring asserts the
// dispatch-insufficient verdict carries diagnostic naming the rule (the
// `observed` field carries a string with "<sourceKey> dispatch sufficiency
// not met" + per-T-1020 rule attribution). EXIT_ALIGNMENT_DRIFT=19 keys
// off this kind upstream. This verifies the wiring at the
// evaluatePredicate boundary (not just evalDispatchPredicate).
runTest('T1020-AC-5b: evaluatePredicate returns dispatch-insufficient with rule attribution on refused fixture', () => {
  const { evaluatePredicate } = tools;
  assert.strictEqual(typeof evaluatePredicate, 'function',
    'T1020-AC-5b: evaluatePredicate must be exported');

  const cursorPath = path.join(SKIP_IFF_FIXTURE_DIR, 'architect-refused', 'cursor.yaml');
  const fixtureCursor = yaml.load(fs.readFileSync(cursorPath, 'utf8'));
  const cursorState = deriveFixtureCursorState(fixtureCursor, 'sub_architect');
  const ruleAllowedSkip = fixtureCursor.rule_allowed_skip || null;

  const verdict = evaluatePredicate(
    'with sufficient sub-architect dispatch',
    null,        // projectRoot — not consulted on dispatch arm
    null,        // sprint — not consulted on dispatch arm
    cursorState,
    ruleAllowedSkip,
  );
  assert.strictEqual(verdict.ok, false,
    'T1020-AC-5b: refused fixture must yield ok=false');
  assert.strictEqual(verdict.kind, 'dispatch-insufficient',
    'T1020-AC-5b: kind must be dispatch-insufficient (the kind EXIT_ALIGNMENT_DRIFT=19 keys on upstream)');
  assert.strictEqual(verdict.sourceKey, 'sub_architect',
    'T1020-AC-5b: sourceKey surfaces sub_architect so diagnostic can name the rule');
  assert.ok(typeof verdict.observed === 'string',
    'T1020-AC-5b: observed surfaces as diagnostic string (not raw number)');
  assert.ok(verdict.observed.includes('sub_architect dispatch sufficiency not met'),
    `T1020-AC-5b: diagnostic must name the sourceKey rule; got "${verdict.observed}"`);
  assert.ok(verdict.observed.includes('no rule-allowed-skip honored'),
    'T1020-AC-5b: diagnostic must surface that rule-allowed-skip was not honored');
});

// T-1020 AC-5b symmetric — allowed fixture takes the bypass arm.
runTest('T1020-AC-5b: evaluatePredicate returns dispatch-sufficient-via-rule-allowed-skip on allowed fixture', () => {
  const { evaluatePredicate } = tools;
  const cursorPath = path.join(SKIP_IFF_FIXTURE_DIR, 'architect-allowed-with-rule-quote', 'cursor.yaml');
  const fixtureCursor = yaml.load(fs.readFileSync(cursorPath, 'utf8'));
  const cursorState = deriveFixtureCursorState(fixtureCursor, 'sub_architect');
  const ruleAllowedSkip = fixtureCursor.rule_allowed_skip;

  const verdict = evaluatePredicate(
    'with sufficient sub-architect dispatch',
    null, null,
    cursorState,
    ruleAllowedSkip,
  );
  assert.strictEqual(verdict.ok, true,
    'T1020-AC-5b (allowed): ok=true via rule-allowed-skip bypass');
  assert.strictEqual(verdict.kind, 'dispatch-sufficient-via-rule-allowed-skip',
    'T1020-AC-5b (allowed): kind names the bypass branch so audit logs can record it');
  assert.strictEqual(typeof verdict.rule_quote, 'string',
    'T1020-AC-5b (allowed): rule_quote surfaces on verdict for audit');
  assert.ok(verdict.rule_quote.length > 0,
    'T1020-AC-5b (allowed): rule_quote non-empty');
});

// T-1020 AC-6 — rule-allowed-skip is MOOT when threshold already met.
// Even when a well-formed ruleAllowedSkip is supplied, if observed >=
// threshold the normal path wins; rule_allowed_skip_honored stays false
// because the rule was not consulted.
runTest('T1020-AC-6: rule-allowed-skip is moot when threshold already met', () => {
  const result = evalDispatchPredicate(
    'with sufficient verifier dispatch',
    {
      alignment_lens_dispatches_per_round: {
        verifier: { observed: 10, threshold: 8 },
      },
    },
    {
      skill: 'verify',
      rule_quote: 'rule-allowed-substance-quote cited',
      citation_source: 'D-Sprint10-5',
    },
  );
  assert.strictEqual(result.matched, true, 'T1020-AC-6: matched true');
  assert.strictEqual(result.sufficient, true,
    'T1020-AC-6: sufficient true (10 >= 8 — threshold-met path wins)');
  assert.strictEqual(result.rule_allowed_skip_honored, false,
    'T1020-AC-6: rule_allowed_skip_honored=false (rule not consulted when threshold met)');
  assert.strictEqual(result.rule_quote, null,
    'T1020-AC-6: rule_quote null (rule not consulted)');
});

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}

console.log('\nall tests passed');
process.exit(0);
