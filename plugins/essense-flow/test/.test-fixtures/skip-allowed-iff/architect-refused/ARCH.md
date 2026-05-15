---
schema_version: 1
skill: architect
phase: decomposing
decomposition:
  modules: [M1, M2, M3, M4, M5]
  scope: full
sub_architect_dispatches:
  observed: 0
  threshold: 5
rule_allowed_skip: null
---

# ARCH — refused fixture (architect-refused)

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.

## Substance

Minimal ARCH stand-in for predicate evaluation under T-1020 + T-1021. Five
modules declared (M1..M5), scope full, zero sub-architect dispatches observed
against threshold 5, and no rule_allowed_skip block — fixture intentionally
satisfies the refused branch of the per_skill_skip_threshold rule (observed
< threshold AND no rule-quote → EXIT_ALIGNMENT_DRIFT = 19).
