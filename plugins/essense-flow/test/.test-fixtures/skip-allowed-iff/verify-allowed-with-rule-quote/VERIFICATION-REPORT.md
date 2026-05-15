---
schema_version: 1
skill: verify
phase: verifying
verify:
  items_total: 8
verifier_dispatches_per_round:
  observed: 0
  threshold: 1
rule_allowed_skip:
  skill: verify
  rule_quote: 'rule-allowed-substance-quote cited (per skill-substance/verify.md DD-2 verifier-dispatch Skip-IFF rule)'
  citation_source: D-Sprint10-5
---

# VERIFICATION-REPORT — allowed fixture (verify-allowed-with-rule-quote)

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.

## Substance

Minimal VERIFICATION-REPORT stand-in exercising the OR branch of
per_skill_skip_threshold.verify.skip_iff_substance. items_total == 8
(deliberately non-zero — exercises the rule-quote OR-branch rather than
the zero-items short-circuit), zero verifier dispatches against threshold
1, but rule_allowed_skip block present with rule_quote + citation_source
D-Sprint10-5.
