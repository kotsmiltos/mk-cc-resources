# Task 2: drift-check Pipeline Extension

> **Sprint:** 3
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Extend `drift-check.sh` to handle architect-planned pipeline builds (`artifacts/designs/*/PLAN.md`) in addition to standalone ladder-build plans (`artifacts/builds/*/BUILD-PLAN.md`). Currently drift-check only parses BUILD-PLAN.md format, so the `verify-before-reporting` rule silently fails for pipeline-mode projects. Addresses FP-3.

## Context

Read these files first:
- `plugins/mk-flow/skills/state/scripts/drift-check.sh` — the current drift-check implementation
- `artifacts/designs/audit-remediation/PLAN.md` — a pipeline-mode PLAN.md (the one we're executing now)
- `artifacts/builds/mk-flow/BUILD-PLAN.md` — a standalone BUILD-PLAN.md (for comparison)
- `context/rules.yaml` — the `verify-before-reporting` rule that invokes drift-check

The key difference:
- **BUILD-PLAN.md** (standalone): Uses `### Milestone N: Name` headers with `**Status:**` and `**Done when:**` fields
- **PLAN.md** (pipeline/architect): Uses `## Sprint Tracking` table with `| Sprint | Status | Tasks | Completed | QA Result |` columns, plus `## Task Index` table

drift-check needs a second parser for the pipeline format. The two formats coexist — a project may have both `artifacts/builds/` and `artifacts/designs/` directories.

## Pseudocode

```
EXTEND drift-check.sh:

1. After the existing BUILD-PLAN.md discovery (auto_discover_build_plans function):
   Add a new function: auto_discover_design_plans()
   - Glob: artifacts/designs/*/PLAN.md
   - For each found PLAN.md, add to a DESIGN_PLANS array

2. Add a new parser function: parse_design_plan()
   Input: path to a PLAN.md file
   Output: list of sprints with status and task counts

   Parse the Sprint Tracking table:
   - Find the line "## Sprint Tracking"
   - Skip the header row and separator
   - For each data row: extract sprint number, status, task count, completed count
   - A sprint is "complete" if Status column contains "DONE"
   - A sprint is "in progress" if Status contains "IN PROGRESS" or "PLANNED" with completed > 0

3. Add a new verification function: verify_design_plan()
   For each sprint marked DONE:
   - Check that sprints/sprint-N/ directory exists
   - Check that COMPLETION.md exists in that directory
   - Check that task-*.md files exist matching the task count
   For each sprint marked PLANNED:
   - No verification needed (hasn't started)

4. In the main flow:
   After processing BUILD-PLAN files, also process DESIGN_PLAN files
   - If both exist, process both (they represent different build tracks)
   - Output format should be the same: "CLEAN" or "DRIFT" with specifics

5. Update exit codes:
   - 0: all plans verified, no drift
   - 1: drift detected
   - 2: no plans found (neither BUILD-PLAN nor PLAN.md) — unchanged
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/scripts/drift-check.sh` | MODIFY | Add design plan discovery, parser, and verification functions |
| `skills/` | N/A | drift-check.sh is in mk-flow (hook-bearing plugin, no mirror) |

## Acceptance Criteria

- [ ] drift-check discovers `artifacts/designs/*/PLAN.md` files
- [ ] drift-check parses the Sprint Tracking table from PLAN.md format
- [ ] For sprints marked DONE: verifies COMPLETION.md exists in `sprints/sprint-N/`
- [ ] For sprints marked DONE: verifies task spec files exist matching task count
- [ ] Running drift-check on current repo (which has `artifacts/designs/audit-remediation/PLAN.md` with 2 done sprints) produces CLEAN output for those sprints
- [ ] Existing BUILD-PLAN.md parsing is unchanged (no regression)
- [ ] Both BUILD-PLAN and PLAN.md can coexist — both are checked
- [ ] Exit code 0 when all plans verify clean
- [ ] Exit code 1 when drift is detected (e.g., missing COMPLETION.md)
- [ ] Exit code 2 when no plans of either type are found

## Edge Cases

- **PLAN.md with no Sprint Tracking table:** Skip with a warning, don't error. The file may be a plan-in-progress.
- **Sprint marked DONE but COMPLETION.md missing:** Report as DRIFT.
- **Sprint marked PLANNED with task specs present:** Not drift — specs are created before execution.
- **Both BUILD-PLAN and PLAN.md exist in same project:** Process both independently. They represent different build tracks.
- **PLAN.md Sprint Tracking table with extra columns:** Parse by position (Sprint is col 1, Status is col 2, Tasks is col 3, Completed is col 4). Ignore extra columns.

## Notes

- This does NOT need to parse the full PLAN.md document. Only the Sprint Tracking table matters for drift detection.
- The parser should be robust against markdown formatting variations (extra spaces, different cell alignment).
- drift-check.sh is in the mk-flow plugin (hook-bearing) — no skills/ mirror sync needed.
