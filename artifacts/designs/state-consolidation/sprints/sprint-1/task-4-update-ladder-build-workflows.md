# Task 4: Update Ladder-build Workflows — Remove Plan Status Writes

> **Sprint:** 1
> **Status:** planned
> **Depends on:** Task 1, Task 2
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Update the ladder-build execute, build-milestone, and continue workflows to stop writing status to PLAN.md and BUILD-PLAN.md. Current sprint/milestone identity is read from STATE.md instead of plan Status fields. Workflows still update STATE.md (that's the whole point — STATE.md is the only living status document).

## Context

Read these files before starting:
- `plugins/ladder-build/skills/ladder-build/workflows/execute.md` — executes architect-planned sprints
- `plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md` — executes standalone milestones
- `plugins/ladder-build/skills/ladder-build/workflows/continue.md` — identifies and continues next milestone
- `artifacts/designs/state-consolidation/PLAN.md` — Decisions D2, D4

Key changes:
- execute.md currently writes to PLAN.md Sprint Tracking AND STATE.md. After: STATE.md only (plus write-once Completed count to PLAN.md).
- build-milestone.md currently writes `**Status:**` to BUILD-PLAN.md AND STATE.md. After: STATE.md only.
- continue.md currently reads BUILD-PLAN.md Status to find next milestone. After: reads STATE.md.

## Interface Specification

### Inputs
- Current ladder-build workflow files
- New BUILD-PLAN.md template structure (from Task 1): no Status fields

### Outputs
- Updated `plugins/ladder-build/skills/ladder-build/workflows/execute.md`
- Updated `plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md`
- Updated `plugins/ladder-build/skills/ladder-build/workflows/continue.md`

### Contracts with Other Tasks
- Task 1 defines new BUILD-PLAN.md template (no Status) — this task's instructions must align
- Task 2 updates the status workflow and cross-references — consistent terminology
- Task 3 makes parallel changes in architect workflows for the same reason

## Pseudocode

```
FOR execute.md:
    1. Read the file
    2. Find step_1_find_task_specs:
       a. Current: "check Sprint Tracking table" to find current sprint
       b. Change to: "Read STATE.md Pipeline Position `current_sprint` field to identify the current sprint. Then read PLAN.md for the sprint's task specs, architecture context, and interface contracts."
    3. Find step_6_update_state:
       a. Current: "Update the PLAN.md Sprint Tracking table: Mark the sprint's task count as completed. Note any deviations."
       b. Change to: "Update PLAN.md Sprint Tracking: fill in the Completed count for this sprint (e.g., 3/3). Do NOT write a Status column — status lives in STATE.md only."
       c. Keep the STATE.md Pipeline Position update (stage: sprint-N-complete) — this is correct
    4. Find success_criteria section:
       a. If it says "PLAN.md...updated" ambiguously, clarify: "PLAN.md Sprint Tracking Completed column updated"
    5. Save

FOR build-milestone.md:
    1. Read the file
    2. Find step_3b_context_health_check:
       a. Current line ~81: "Update BUILD-PLAN.md milestone status to 'needs verification — session handoff'"
       b. Change to: "Update STATE.md Current Focus to: 'Milestone [N] [name]: needs verification — session handoff. See [path to .continue-here.md].'"
    3. Find step_6_update_state:
       a. Verify it updates STATE.md (should already be correct)
       b. Verify it does NOT write **Status:** to BUILD-PLAN.md
    4. Find step_7_reassess_and_adapt:
       a. Current: "Mark the completed milestone as done" (referring to BUILD-PLAN.md **Status:** field)
       b. Remove the status write. Keep structural updates to BUILD-PLAN.md (adding new milestones, reordering, updating "Done when" criteria) — these are plan intent changes, not status changes.
       c. The milestone completion is already recorded in STATE.md (step 6) and the milestone report (step 5)
    5. Find success_criteria:
       a. If it says "Build plan is updated with current state" — change to "Build plan is updated with structural changes (new milestones, reordering). Status tracked in STATE.md only."
    6. Save

FOR continue.md:
    1. Read the file
    2. Find step 2 (identify current/next milestone):
       a. Current: reads BUILD-PLAN.md Status fields to find the first "pending" milestone
       b. Change to: "Read STATE.md Current Focus and Done (Recent) to identify the current milestone. Read BUILD-PLAN.md for milestone structure (goals, done-when criteria, dependencies) — but NOT for status."
    3. Save
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | Read sprint from STATE.md; remove PLAN.md Status write; keep Completed count write |
| `plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md` | MODIFY | Write handoff to STATE.md not BUILD-PLAN.md; remove milestone Status write |
| `plugins/ladder-build/skills/ladder-build/workflows/continue.md` | MODIFY | Read next milestone from STATE.md, not BUILD-PLAN.md Status fields |

## Acceptance Criteria

- [ ] execute.md reads current sprint from STATE.md Pipeline Position, not PLAN.md Sprint Tracking
- [ ] execute.md does NOT write a Status value to PLAN.md (writes Completed count only)
- [ ] execute.md still updates STATE.md Pipeline Position to `sprint-N-complete`
- [ ] build-milestone.md does NOT write `**Status:**` to BUILD-PLAN.md in any step
- [ ] build-milestone.md writes session handoff status to STATE.md, not BUILD-PLAN.md
- [ ] build-milestone.md still updates STATE.md Current Focus and Done (Recent)
- [ ] continue.md identifies next milestone from STATE.md, not BUILD-PLAN.md Status fields
- [ ] `grep -c 'Status.*completed\|Status.*pending\|mark.*done.*BUILD-PLAN\|BUILD-PLAN.*status' plugins/ladder-build/skills/ladder-build/workflows/*.md` returns 0

## Edge Cases

- build-milestone.md step 7 says "Mark the completed milestone as done" but also does legitimate structural updates to BUILD-PLAN.md (adding discovered milestones, reordering, updating "Done when" criteria). Only remove the Status write — keep the structural update instructions.
- execute.md's step 6 writes both the Completed count and STATE.md update. The Completed count is a write-once evidence value in PLAN.md, not a status field. This is intentionally kept.
- continue.md may have fallback logic ("if no BUILD-PLAN.md found..."). Keep fallback paths — only change the primary path from reading Status to reading STATE.md.

## Notes

The BUILD-PLAN.md `## Status` section (top-level summary with "Current milestone," "Completed X of Y") was removed by Task 1. The build-milestone.md workflow may reference updating this section. Remove those references — the equivalent information lives in STATE.md Current Focus.
