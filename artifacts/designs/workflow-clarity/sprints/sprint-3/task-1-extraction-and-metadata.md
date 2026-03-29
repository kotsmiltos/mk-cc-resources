# Task 1: Format-Agnostic Extraction + Metadata Normalization

> **type:** task-spec
> **output_path:** artifacts/designs/workflow-clarity/sprints/sprint-3/task-1-extraction-and-metadata.md
> **sprint:** 3
> **status:** planned
> **depends_on:** Sprint 2
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D2 (metadata format), QA M2 (metadata placement)
> **open_questions:** none

## Goal

Create a reusable extraction pattern for reading standardized metadata from any pipeline artifact, and normalize metadata placement across all templates to metadata-first (before the `# Title` line). After this task, any tool or script can find the 4 core metadata fields (type, output_path, key_decisions, open_questions) in a consistent position across all pipeline outputs. This also addresses the QA M2 finding from Sprint 2 (metadata placement inconsistency).

## Context

Read first:
- All 10 pipeline template files (see PLAN.md Module Map)
- `plugins/ladder-build/skills/ladder-build/workflows/execute.md` lines 155-168 (inline completion-report template)
- `plugins/architect/skills/architect/workflows/review.md` lines 244-253 (inline QA-report template)
- PLAN.md Interface Contracts (metadata field schema)
- Sprint 2 QA-REPORT.md findings M2 (placement inconsistency), L1 (split blockquotes), L3 (referential values), L4 (field naming)

**Current state after Sprint 2:**
- 4 templates have metadata BEFORE `# Title`: exploration-report, requirements-report, state, continue-here
- 5 templates have metadata AFTER `# Title`: plan, task-spec, audit-report, build-plan, milestone-report
- 2 inline templates have metadata AFTER `# Title`: QA-report (review.md), completion-report (execute.md)
- Domain-specific fields use mixed casing: `End Goal` (Title Case), `Build plan` (Sentence case), core fields use snake_case
- build-plan.md and milestone-report.md split metadata into multiple blockquote groups separated by blank lines

## Interface Specification

### Inputs
- All 10 pipeline template files
- 2 inline templates in workflows (execute.md, review.md)

### Outputs
- Normalized templates: all metadata-first (before `# Title`)
- Documentation of extraction pattern in PLAN.md Interface Contracts (update the metadata field schema section)

### Contracts with Other Tasks
- Task 3 (Fitness Functions) will verify metadata consistency as FF-1, FF-18, FF-19
- Task 4 (Version Bumps) will document the metadata convention in CLAUDE.md

## Pseudocode

```
1. NORMALIZE metadata placement in 5 template files + 2 inline templates:

   For each template where metadata appears AFTER the # Title line:
     a. READ the file
     b. MOVE the metadata blockquote block (all lines starting with `> **`)
        to appear BEFORE the # Title line
     c. Keep exactly one blank line between the metadata block and the # Title
     d. Preserve all other content in the same order

   Files to modify:
   - plugins/architect/skills/architect/templates/plan.md
     BEFORE: # Plan: [Name]  → then metadata
     AFTER:  metadata → then # Plan: [Name]

   - plugins/architect/skills/architect/templates/task-spec.md
     BEFORE: # Task [K]: [Name]  → then metadata
     AFTER:  metadata → then # Task [K]: [Name]

   - plugins/architect/skills/architect/templates/audit-report.md
     BEFORE: # Audit Report: [Name]  → then metadata
     AFTER:  metadata → then # Audit Report: [Name]

   - plugins/ladder-build/skills/ladder-build/templates/build-plan.md
     BEFORE: # Build Plan: [Name]  → then metadata (split groups)
     AFTER:  all metadata (merged into single blockquote group) → then # Build Plan:
     Note: merge the split blockquote groups (core 4 + End Goal + Source)
     into a single continuous blockquote block. No blank lines within metadata.

   - plugins/ladder-build/skills/ladder-build/templates/milestone-report.md
     BEFORE: # Milestone [N]: [Name]  → then metadata (split groups)
     AFTER:  all metadata (merged) → then # Milestone [N]:
     Note: same merge as build-plan.

   - plugins/ladder-build/skills/ladder-build/workflows/execute.md
     (inline completion-report template at lines 157-167)
     BEFORE: # Sprint [N] Completion Report → then core 4 → blank → Date/Plan/Tasks
     AFTER:  all metadata (merged) → then # Sprint [N] Completion Report

   - plugins/architect/skills/architect/workflows/review.md
     (inline QA-report template at lines 244-253)
     Verify it already has metadata-first or normalize.

2. NORMALIZE domain-specific field casing:

   The core 4 fields are snake_case: type, output_path, key_decisions, open_questions.
   Domain-specific fields should also use lowercase with underscores:

   - build-plan.md: `End Goal` → `end_goal`, `Source` → `source`
   - milestone-report.md: `Status` → `status`, `Build plan` → `build_plan`
   - completion-report (execute.md): `date` and `plan` already lowercase (fixed in Sprint 2 QA)
     Add: `Tasks executed` → `tasks_executed`
   - QA-report (review.md): `date`, `plan`, `overall_result` already lowercase. Verify.

3. UPDATE PLAN.md Interface Contracts:
   Add to the metadata field schema section:
   "Extraction pattern: the metadata block is always the FIRST set of consecutive
   blockquote lines in the file (before the # Title). Core fields (type, output_path,
   key_decisions, open_questions) are always present. Domain-specific fields may follow.
   All field names use snake_case. Parse by field name, not by position."
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/plan.md` | MODIFY | Move metadata block before `# Plan:` title |
| `plugins/architect/skills/architect/templates/task-spec.md` | MODIFY | Move metadata block before `# Task [K]:` title |
| `plugins/architect/skills/architect/templates/audit-report.md` | MODIFY | Move metadata block before `# Audit Report:` title |
| `plugins/ladder-build/skills/ladder-build/templates/build-plan.md` | MODIFY | Merge split blockquotes, move before title, normalize field casing |
| `plugins/ladder-build/skills/ladder-build/templates/milestone-report.md` | MODIFY | Merge split blockquotes, move before title, normalize field casing |
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | Normalize inline completion-report template: metadata-first, merge blockquotes, normalize `tasks_executed` |
| `plugins/architect/skills/architect/workflows/review.md` | MODIFY | Verify/normalize inline QA-report template metadata placement |
| `artifacts/designs/workflow-clarity/PLAN.md` | MODIFY | Update Interface Contracts with extraction pattern documentation |

## Acceptance Criteria

- [ ] All 10 pipeline templates have metadata block BEFORE the `# Title` line
- [ ] Both inline templates (completion-report, QA-report) have metadata before title
- [ ] No template has split blockquote groups within the metadata block (all fields in one continuous blockquote)
- [ ] All metadata field names use snake_case (no Title Case, no Sentence case with spaces)
- [ ] Core 4 fields (type, output_path, key_decisions, open_questions) present in every template
- [ ] PLAN.md Interface Contracts updated with extraction pattern documentation
- [ ] No "For: [SkillName]" consumer-naming directive in any template (FF-4)
- [ ] Metadata format still matches Decision #1: blockquote (`> **field:** value`)

## Edge Cases

- **Template files are wrapped in fenced code blocks:** The metadata lives inside the ```` ```markdown ```` fence. This is template instruction, not literal output. Moving metadata before the title inside the fence is the correct action — don't move it outside the fence.
- **build-plan.md has `End Goal` and `Source` in a separate blockquote group after a blank line:** Merge all into one continuous blockquote block. No blank lines between metadata fields.
- **state.md uses referential values for key_decisions/open_questions:** This is intentional (see Sprint 2 Task 4 spec). Document it in the extraction pattern as a known variant: "state.md uses referential values ('see section below') instead of inline values."
- **Existing artifacts won't have metadata-first placement:** Only future outputs follow the new convention. No migration of existing artifacts needed.

## Notes

- This task combines the original "Format-Agnostic Extraction" plan with the Sprint 2 QA finding about metadata placement. The normalization makes extraction trivial: "first consecutive blockquote in the file is always metadata."
- The extraction pattern is documented, not implemented as a script. Skills and tools can use the pattern by grepping for `> **type:**` at the top of any artifact file. A formal extraction script could be added later if needed, but the pattern itself is the deliverable.
