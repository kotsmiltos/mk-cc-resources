---
schema_version: 1
skill: review
phase: reviewing
sprint:
  task_count: 10
review_lens_dispatches_per_round:
  lenses_dispatched: []
  observed: 0
  threshold: 6
rule_allowed_skip:
  skill: review
  rule_quote: 'rule-allowed-substance-quote cited (per skill-substance/review.md DD-2 review-lens-dispatch Skip-IFF rule)'
  citation_source: D-Sprint10-5
---

# QA-REPORT — allowed fixture (review-allowed-with-rule-quote)

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.

## Substance

Minimal QA-REPORT stand-in exercising the OR branch of
per_skill_skip_threshold.review.skip_iff_substance. Sprint task_count == 10
(deliberately outside the <=2 window — exercises the rule-quote OR-branch
rather than the small-sprint short-circuit), zero review lenses dispatched
against threshold 6, but rule_allowed_skip block present with rule_quote +
citation_source D-Sprint10-5.
