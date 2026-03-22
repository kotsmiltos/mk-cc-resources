# Sprint 2 Completion — State Consolidation

> **Completed:** 2026-03-22
> **Plan:** ../../PLAN.md
> **Tasks:** 3/3

## Summary

Rewrote drift-check.sh for evidence-based validation and added --fix flag with backup. Fixed 5 stale references and defensive patterns from Sprint 1 QA.

## Tasks Completed

### Task 5: Rewrite drift-check core — evidence-based validation
- `parse_design_sprints()` now detects header format by column count (5 = new, 6+ = old)
- `verify_design_plan()` infers sprint status from COMPLETION.md existence when no Status column
- `process_build_plan()` infers milestone status from milestone report existence when no `**Status:**` field
- Both old-format (audit-remediation) and new-format (state-consolidation) plans handled correctly
- Zero "UNKNOWN STATUS" across all 6 plans in the repo

### Task 6: Add --fix flag with backup
- `drift-check.sh --fix` creates `.STATE.md.bak` before any correction
- Corrects `stage:` and `current_sprint:` in Pipeline Position only
- Preserves `plan:`, `requirements:`, `audit:`, and all other sections unchanged
- Idempotent: second run reports "already matches evidence"
- Without `--fix`, script never writes to any file

### Task 7: Fix stale references + defensive patterns (QA)
- parsing-rules.md: "statuses" -> "structure. Read STATE.md for current status"
- mk-flow-init SKILL.md: verification protocol uses filesystem evidence (milestone reports, COMPLETION.md) instead of plan status fields
- execute.md: STATE.md-missing fallback added (tells user to run /mk-flow-init)
- review.md: STATE.md-missing fallback with PLAN.md sprint analysis fallback
- build-milestone.md: step 1 reads STATE.md Current Focus for milestone identity
- defaults/rules.yaml: version bumped from 0.5.0 to 0.6.0

## Verification

- `drift-check.sh` auto-discovery: NO DRIFT across 6 plans (4 BUILD-PLAN.md + 2 PLAN.md)
- `drift-check.sh artifacts/designs/state-consolidation/PLAN.md`: correct verdicts (no UNKNOWN STATUS)
- `drift-check.sh artifacts/designs/audit-remediation/PLAN.md`: backward-compatible (4 CONFIRMED)
- `drift-check.sh --fix`: tested with simulated drift (sprint-1-complete -> sprint-2), verified idempotent
- `grep 'BUILD-PLAN.md.*status'` in intake/mk-flow-init: no stale references
- All 6 QA fixes verified in target files
