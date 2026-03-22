# Task 5: Rewrite drift-check Core — Evidence-Based Validation

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Sprint 1
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Rewrite drift-check.sh to validate STATE.md against filesystem evidence instead of reading Status fields from plan documents. For PLAN.md (design plans): detect the new column layout (no Status column), infer sprint completion from COMPLETION.md existence and task-file counts. For BUILD-PLAN.md: infer milestone completion from milestone report existence instead of reading `**Status:**` fields. Both old-format and new-format plans must be handled gracefully.

## Context

Read these files before starting:
- `plugins/mk-flow/skills/state/scripts/drift-check.sh` — current implementation
- `artifacts/designs/state-consolidation/PLAN.md` — Decisions D1, D6 (existing artifacts keep old fields), D8 (backup), D9 (atomic bump)
- `context/STATE.md` — the file drift-check validates

**Why this is critical now:** Sprint 1 removed Status columns from templates. drift-check.sh still expects them:
- `parse_design_sprints()` line 382-433: expects `Sprint | Status | Tasks | Completed | ...` — new format has `Sprint | Tasks | Completed | QA Result | Key Changes` (no Status column). `col_status` receives Tasks value, emitting "UNKNOWN STATUS: 4".
- `parse_milestones()` line 88: expects `**Status:** completed|pending` — new BUILD-PLAN.md has no `**Status:**` field. `milestone_status` stays empty, emitting "UNKNOWN STATUS: ".

**Backward compatibility (Decision D6):** Old plans (e.g., audit-remediation PLAN.md) retain their Status columns. drift-check must handle BOTH formats.

## Interface Specification

### Inputs
- Plan files: `artifacts/designs/*/PLAN.md` and `artifacts/builds/*/BUILD-PLAN.md`
- Evidence files: `COMPLETION.md` in sprint directories, milestone report files in `artifacts/builds/*/milestones/`
- STATE.md: `context/STATE.md` (read for Pipeline Position)

### Outputs
- Stdout: formatted drift-check results (same visual format as today)
- Exit code: 0 = no drift, 1 = drift found, 2 = no plans found
- No file writes in this task (--fix is Task 6)

### Contracts with Other Tasks
- Task 6 depends on this task's parsing output format: `SPRINT|<num>|<evidence_status>|<tasks>|<completed>`
- Task 7 is independent (different files)

## Pseudocode

```
# --- PLAN.md (design plans) ---

parse_design_sprints(file):
    1. Find "## Sprint Tracking" section
    2. Read the HEADER row to detect format:
       a. Count columns by splitting on |
       b. OLD format (6+ columns): Sprint | Status | Tasks | Completed | QA Result | Key Changes
          - col_status_index = 1 (zero-based after stripping leading |)
       c. NEW format (5 columns): Sprint | Tasks | Completed | QA Result | Key Changes
          - No Status column. Set col_status_index = -1
    3. For each data row:
       a. Split on | into fields
       b. IF old format: read col_status from index 1
       c. IF new format: col_status = "" (will be inferred from evidence)
       d. Read col_sprint, col_tasks, col_completed from correct indices
    4. Emit: SPRINT|<sprint_num>|<status_or_empty>|<tasks>|<completed>

verify_design_plan(plan_file):
    plan_dir = dirname(plan_file)

    FOR each SPRINT record from parse_design_sprints():
        sprint_dir = plan_dir/sprints/sprint-{num}
        completion_file = sprint_dir/COMPLETION.md

        IF status field is populated (old format):
            # Use existing logic — check status against evidence
            IF status == "DONE":
                Verify sprint_dir AND completion_file exist
                If both exist: CONFIRMED
                If missing: DRIFT — marked DONE but evidence missing
            ELIF status == "PLANNED":
                Verify task files count against tasks column
                (existing logic — works correctly)
            ELSE:
                UNKNOWN STATUS

        ELIF status field is empty (new format):
            # Evidence-based inference — the core change
            IF completion_file exists:
                evidence_status = "done"
                # Still verify sprint_dir exists (sanity check)
                If sprint_dir missing: DRIFT — COMPLETION.md without sprint dir (anomaly)
                Else: CONFIRMED DONE (evidence: COMPLETION.md)
            ELIF sprint_dir exists:
                # Sprint dir exists but no COMPLETION.md
                Count task-*.md files
                IF task_files > 0:
                    evidence_status = "in-progress or planned"
                    CONFIRMED PLANNED ({count}/{tasks} task files present)
                ELSE:
                    CONFIRMED PLANNED (sprint dir exists, no task files yet)
            ELSE:
                # No sprint dir, no completion file
                CONFIRMED PLANNED (sprint not yet started)

# --- BUILD-PLAN.md ---

parse_milestones(file):
    # KEEP existing parsing for **Status:** line (backward compatibility with old plans)
    # ADD: if milestone ends without a **Status:** line, milestone_status stays ""
    # No change needed — this already happens. The "" case just wasn't handled in process_build_plan().

process_build_plan(plan_file):
    plan_name = dirname(plan_file)

    FOR each MILESTONE from parse_milestones():
        IF status == "pending":
            # Existing logic — works correctly
        ELIF status == "completed":
            # Existing logic — works correctly
        ELIF status == "" (empty — new format, no **Status:** field):
            # Evidence-based inference
            # Check for milestone report in artifacts/builds/{plan_name}/milestones/
            milestone_report_pattern = "milestone-{num}-*.md"
            IF milestone report file exists:
                evidence_status = "completed"
                # Verify deliverables as with "completed" status
                (run same deliverable path checking as "completed" branch)
                If deliverables confirmed: CONFIRMED DONE (evidence: milestone report)
                If deliverables missing: DRIFT — milestone report exists but deliverables missing
            ELSE:
                evidence_status = "pending"
                # Verify deliverables as with "pending" status
                (run same deliverable path checking as "pending" branch)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/scripts/drift-check.sh` | MODIFY | Rewrite `parse_design_sprints()` with header-based format detection; add evidence-based inference to `verify_design_plan()` and `process_build_plan()` for empty-status cases |

## Acceptance Criteria

- [ ] `parse_design_sprints()` correctly parses NEW format PLAN.md (5 columns, no Status): test against `artifacts/designs/state-consolidation/PLAN.md`
- [ ] `parse_design_sprints()` correctly parses OLD format PLAN.md (6 columns, with Status): test against `artifacts/designs/audit-remediation/PLAN.md` (if exists) or create a test fixture
- [ ] `verify_design_plan()` for a sprint with COMPLETION.md reports "CONFIRMED DONE (evidence: COMPLETION.md)" — not "UNKNOWN STATUS"
- [ ] `verify_design_plan()` for a sprint WITHOUT COMPLETION.md but WITH task files reports "CONFIRMED PLANNED"
- [ ] `process_build_plan()` for milestones WITHOUT `**Status:**` field infers status from milestone report existence
- [ ] `process_build_plan()` for milestones WITH `**Status:**` field (old format) still works as before
- [ ] Running `drift-check.sh` in auto-discovery mode processes BOTH old-format and new-format plans without errors
- [ ] Running `drift-check.sh artifacts/designs/state-consolidation/PLAN.md` produces correct verdicts (not "UNKNOWN STATUS")
- [ ] Exit codes unchanged: 0 = no drift, 1 = drift found, 2 = no plans found
- [ ] No "UNKNOWN STATUS" output when processing any existing plan in the repo

## Edge Cases

- A PLAN.md with the header row `| Sprint | Tasks | ...` (no "Status" word) could theoretically be an old plan missing columns. Use column COUNT as the primary discriminant: 5 columns = new, 6+ = old.
- A PLAN.md with both old sprints (with Status) and new sprints (without Status): this shouldn't happen since the format is per-table, not per-row. But if someone manually edits a row to have fewer columns, handle gracefully (skip malformed rows).
- Old BUILD-PLAN.md files in `artifacts/builds/mk-flow/BUILD-PLAN.md` have `**Status:**` fields — these must continue to work exactly as before (Decision D6).
- The milestone report path pattern (`milestone-{num}-*.md`) must handle both `milestone-1-some-name.md` and variations. Use glob matching.

## Notes

- The header detection approach is the simplest backward-compatible solution. Alternative: check for the word "Status" in the header row. But column count is more robust — it doesn't depend on header text.
- Decision D1: "Report-only by default" — this task only reports. The `--fix` flag is Task 6.
- Keep the same visual output format — only change what's inside the verdict strings.
