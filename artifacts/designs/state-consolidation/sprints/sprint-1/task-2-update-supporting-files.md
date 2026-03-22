# Task 2: Update Supporting Files — State Workflow, Hook, Cross-References

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Update all supporting infrastructure that references plan-based status tracking. The status workflow stops correcting BUILD-PLAN.md. The hook stops mentioning BUILD-PLAN.md status fields. Cross-references stop requiring status sync between plans and STATE.md. The state SKILL.md description reflects the new drift-check purpose.

## Context

Read these files before starting:
- `plugins/mk-flow/skills/state/workflows/status.md` — status query workflow
- `plugins/mk-flow/skills/state/SKILL.md` — state skill definition
- `plugins/mk-flow/hooks/intent-inject.sh` — hook that injects context
- `context/cross-references.yaml` — cross-reference rules

The status workflow's step 2 currently tells Claude to "Update BUILD-PLAN.md status fields to match the drift-check verdicts." Since BUILD-PLAN.md will no longer have status fields (Task 1), this instruction must be removed.

The intent-inject.sh hook's status_query routing mentions "BUILD-PLAN.md status fields." This reference must be updated since plans no longer carry status.

## Interface Specification

### Inputs
- Current supporting files (read existing content)

### Outputs
- Updated `plugins/mk-flow/skills/state/workflows/status.md`
- Updated `plugins/mk-flow/skills/state/SKILL.md`
- Updated `plugins/mk-flow/hooks/intent-inject.sh`
- Updated `context/cross-references.yaml`

### Contracts with Other Tasks
- Task 3 and Task 4 depend on the intent-inject.sh routing text being consistent with the new architecture
- Sprint 2 (drift-check rewrite) depends on the status workflow accurately describing drift-check's role

## Pseudocode

```
FOR status.md workflow:
    1. Read the file
    2. In step_2_fix_drift:
       a. Remove or replace "Update BUILD-PLAN.md status fields to match the drift-check verdicts"
       b. Keep "Update STATE.md to reflect the corrected status"
       c. The step should say: "Update STATE.md Pipeline Position and Current Focus to match drift-check verdicts"
    3. Verify step_1 still says "Run drift-check" and "do NOT read STATE.md or BUILD-PLAN.md status fields directly"
       — change to "do NOT rely on plan documents for status — STATE.md is the single source of truth, validated by drift-check"
    4. Save

FOR state SKILL.md:
    1. Read the file
    2. Find the scripts_index or description section that mentions drift-check.sh
    3. Update the description from referencing "BUILD-PLAN.md milestone statuses" or "plan status fields"
       to "project status against filesystem evidence (COMPLETION.md, milestone reports)"
    4. Save

FOR intent-inject.sh:
    1. Read the file
    2. Find the status_query routing section (around lines 186-190)
    3. Current text: "Do NOT read STATE.md or BUILD-PLAN.md status fields directly"
       Change to: "Do NOT rely on plan documents for status — STATE.md is the single source of truth, validated by drift-check against filesystem evidence"
    4. Save

FOR cross-references.yaml:
    1. Read the file
    2. Find the build-plan-milestones rule (or similarly named)
    3. If it says "Build plan status and project state must stay in sync" or similar:
       a. Change to: "Build plan milestone structure and project state must reference the same work items"
       b. Remove any "check" items that reference BUILD-PLAN.md Status fields
    4. Save
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/workflows/status.md` | MODIFY | Remove BUILD-PLAN.md correction from step 2, update step 1 language |
| `plugins/mk-flow/skills/state/SKILL.md` | MODIFY | Update drift-check description |
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | Update status_query routing text |
| `context/cross-references.yaml` | MODIFY | Update build-plan-milestones rule to remove status sync |

## Acceptance Criteria

- [ ] status.md step 2 does not mention "BUILD-PLAN.md status fields"
- [ ] status.md step 1 says STATE.md is the single source of truth (not "do NOT read STATE.md")
- [ ] state SKILL.md describes drift-check as validating STATE.md against evidence
- [ ] intent-inject.sh status_query routing references STATE.md as single source of truth
- [ ] cross-references.yaml does not require "status sync" between BUILD-PLAN.md and STATE.md
- [ ] No file references "BUILD-PLAN.md status" as something that should be written to

## Edge Cases

- The status.md step 1 currently says "do NOT read STATE.md or BUILD-PLAN.md status fields directly" — this is confusingly worded (sounds like "don't read STATE.md"). The intent is "don't trust status fields without drift-check validation." Reword to make this clearer: STATE.md is the source of truth, but drift-check validates it.
- cross-references.yaml may have multiple rules that reference status tracking. Check all rules, not just the build-plan-milestones one.
- intent-inject.sh: only modify the INSTRUCTION heredoc text, not the bash logic. The bash logic for reading STATE.md (lines 45-51) is correct and unchanged.
