# Task 3: Update Architect Workflows — Remove Plan Status Writes

> **Sprint:** 1
> **Status:** planned
> **Depends on:** Task 1
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Update the architect's plan, review, and ask workflows to stop writing status to PLAN.md and to read current sprint information from STATE.md instead of the Sprint Tracking Status column. The architect still writes to PLAN.md — but only write-once evidence columns (Completed, QA Result, Key Changes), never the Status column that caused drift.

## Context

Read these files before starting:
- `plugins/architect/skills/architect/workflows/plan.md` — creates PLAN.md
- `plugins/architect/skills/architect/workflows/review.md` — post-sprint QA, updates PLAN.md
- `plugins/architect/skills/architect/workflows/ask.md` — decision escalation
- `artifacts/designs/state-consolidation/PLAN.md` — Decisions D2, D3

Key change: the review workflow currently identifies the completed sprint by reading PLAN.md Sprint Tracking Status column. After this change, it reads STATE.md Pipeline Position `current_sprint` field instead.

## Interface Specification

### Inputs
- Current architect workflow files
- New PLAN.md template structure (from Task 1): Sprint Tracking has no Status column

### Outputs
- Updated `plugins/architect/skills/architect/workflows/plan.md`
- Updated `plugins/architect/skills/architect/workflows/review.md`
- Verified `plugins/architect/skills/architect/workflows/ask.md`

### Contracts with Other Tasks
- Task 1 defines the new Sprint Tracking table structure (no Status column) — this task's instructions must align
- Task 4 (ladder-build) makes parallel changes for the same reason

## Pseudocode

```
FOR plan.md workflow:
    1. Read the file
    2. Find step_4_design_sprints, substep 4d (Write the PLAN.md)
    3. If it references "Sprint Tracking table" with status values:
       a. Update any example/reference to show the new columns:
          Sprint | Tasks | Completed | QA Result | Key Changes
       b. Remove any mention of populating a Status column
    4. Verify step_7_save_and_handoff (7b) updates STATE.md — this should already be correct
    5. Save

FOR review.md workflow:
    1. Read the file
    2. Find the section where it identifies which sprint just completed:
       a. Current: "Read PLAN.md. Identify which sprint just completed by checking Sprint Tracking table"
       b. Change to: "Read STATE.md Pipeline Position `current_sprint` field to identify which sprint just completed. Read PLAN.md for the sprint's task specs and architecture context."
    3. Find step_4 (reassess and plan next), substep 4a or wherever it updates Sprint Tracking:
       a. Current: "Sprint Tracking: Mark completed sprint as DONE with QA result"
       b. Change to: "Update PLAN.md Sprint Tracking for sprint N: fill in Completed count (e.g., 3/3), QA Result (e.g., PASS), and Key Changes. Do NOT write a Status column — status lives in STATE.md only."
    4. If review.md has any other references to "mark as DONE" or "update Status column" in Sprint Tracking:
       a. Remove or redirect to STATE.md Pipeline Position update (step 5)
    5. Verify step_5_update_state updates STATE.md — should already be correct
    6. Save

FOR ask.md workflow:
    1. Read the file
    2. Search for any reference to "Sprint Tracking Status" or "mark as DONE" or "update PLAN.md status"
    3. If found:
       a. Remove the status-write instruction
       b. If the ask workflow affects sprint scope (adding/removing sprints), keep those instructions — they're structural changes, not status updates
    4. Save (or no changes needed)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/plan.md` | MODIFY | Update Sprint Tracking references to exclude Status column |
| `plugins/architect/skills/architect/workflows/review.md` | MODIFY | Read current sprint from STATE.md; write only Completed/QA Result to PLAN.md, not Status |
| `plugins/architect/skills/architect/workflows/ask.md` | CHECK | Verify no Status writes to PLAN.md; remove if present |

## Acceptance Criteria

- [ ] plan.md workflow does not instruct populating a Status column in Sprint Tracking
- [ ] review.md identifies the current sprint from STATE.md Pipeline Position, not PLAN.md Sprint Tracking
- [ ] review.md writes Completed and QA Result to PLAN.md Sprint Tracking but NOT a Status value
- [ ] review.md does not contain "Mark completed sprint as DONE" or equivalent
- [ ] ask.md has no references to updating Sprint Tracking Status
- [ ] `grep -i 'status.*DONE\|mark.*DONE\|Status.*PLANNED' plugins/architect/skills/architect/workflows/*.md` returns no matches related to Sprint Tracking writes

## Edge Cases

- review.md references Sprint Tracking in multiple places (step 1 for reading, step 4a for writing, step 5 for STATE.md). Each reference needs individual attention — don't bulk-replace "Sprint Tracking" because it's still a valid table, just without the Status column.
- The plan.md workflow says "Using templates/plan.md, create the full plan document." This naturally picks up the template changes from Task 1. But if the workflow has inline examples with Status values, those examples need updating too.
- The conventions reference in plan.md template (handled by Task 1) removes "Sprint status markers: PLANNED, IN PROGRESS, DONE, BLOCKED." The review workflow may reference these markers in its instructions. Remove those references.
