# Task 1: Update Templates — Remove Status Fields

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Remove all mutable status fields from the PLAN.md and BUILD-PLAN.md templates. Plans become immutable intent documents — they define what to build, not whether it's done. This is the foundation task: all other Sprint 1 tasks reference the new template structure.

## Context

Read these files before starting:
- `plugins/architect/skills/architect/templates/plan.md` — current PLAN.md template
- `plugins/ladder-build/skills/ladder-build/templates/build-plan.md` — current BUILD-PLAN.md template
- `artifacts/designs/state-consolidation/PLAN.md` — Decisions D2, D3, D4

The Sprint Tracking table currently has: `Sprint | Status | Tasks | Completed | QA Result | Key Changes`. The Status column is what drifts. Completed and QA Result are write-once evidence — they stay.

The Task Index currently has: `Task | Sprint | Status | File | Depends On | Blocked By`. Same problem.

BUILD-PLAN.md has both per-milestone `**Status:**` fields and a top-level `## Status` summary section. Both go.

## Interface Specification

### Inputs
- Current template files (read existing structure)

### Outputs
- Updated `plugins/architect/skills/architect/templates/plan.md` — no Status columns
- Updated `plugins/ladder-build/skills/ladder-build/templates/build-plan.md` — no Status fields

### Contracts with Other Tasks
- Task 3 (architect workflows) references the PLAN.md template structure — must match
- Task 4 (ladder-build workflows) references the BUILD-PLAN.md template structure — must match

## Pseudocode

```
FOR plan.md template:
    1. Read the file
    2. In Sprint Tracking table:
       a. Remove "Status" from the header row: `| Sprint | Tasks | Completed | QA Result | Key Changes |`
       b. Remove the Status column value from the sample data row
       c. Remove the separator column for Status
    3. In Task Index table:
       a. Remove "Status" from the header row: `| Task | Sprint | File | Depends On | Blocked By |`
       b. Remove the Status column value from the sample data row
       c. Remove the separator column for Status
    4. In conventions section:
       a. Remove the line: `**Sprint status markers:** PLANNED, IN PROGRESS, DONE, BLOCKED (with reason).`
       b. Remove the line: `**Task status markers:** planned, in-progress, done, blocked.`
    5. Save

FOR build-plan.md template:
    1. Read the file
    2. Find and remove the entire `## Status` section (contains:
       `- **Current milestone:** [N] — [name]`
       `- **Completed:** [X] of [Y] milestones`
       `- **Last updated:** [YYYY-MM-DD]`
       )
    3. In each milestone section (### Milestone N: Name):
       a. Remove the `**Status:** completed | pending | in progress | blocked` line
    4. In conventions section (if present):
       a. Remove any status marker documentation
    5. Save
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/plan.md` | MODIFY | Remove Status column from Sprint Tracking table, remove Status column from Task Index table, remove status markers from conventions |
| `plugins/ladder-build/skills/ladder-build/templates/build-plan.md` | MODIFY | Remove `## Status` section, remove `**Status:**` from milestone definitions, remove status markers from conventions |

## Acceptance Criteria

- [ ] PLAN.md template Sprint Tracking table has columns: Sprint, Tasks, Completed, QA Result, Key Changes (NO Status)
- [ ] PLAN.md template Task Index table has columns: Task, Sprint, File, Depends On, Blocked By (NO Status)
- [ ] PLAN.md template conventions section has no "Sprint status markers" or "Task status markers" lines
- [ ] BUILD-PLAN.md template has no `## Status` section
- [ ] BUILD-PLAN.md template milestone definitions have no `**Status:**` line
- [ ] Both templates remain valid markdown (no broken table formatting)
- [ ] `grep -c '| Status |' plugins/architect/skills/architect/templates/plan.md` returns 0

## Edge Cases

- The conventions section may reference Status in ways beyond the two lines listed (e.g., "QA results: PASS, PASS (N notes), FAIL..."). These QA-related conventions should be KEPT — only sprint/task status markers are removed.
- The plan.md template may have Status mentioned in comments or descriptions outside the tables. Only remove it from table headers, sample rows, and the status markers convention lines.

## Notes

Per Decision D5, the task-spec.md template retains its `> **Status:** planned | in-progress | done | blocked` line. That's within-session execution state, not cross-session drift.
