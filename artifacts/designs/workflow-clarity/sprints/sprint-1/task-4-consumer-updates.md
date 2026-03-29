# Task 4: STATE.md Consumer Updates

> **Sprint:** 1
> **Status:** planned
> **Depends on:** Tasks 1, 3
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Align all STATE.md consumers with the new template structure: workflows write state-descriptive Current Focus, pause uses Pipeline Position snapshot instead of free-text What's Next, resume runs drift-check before acting, and all SKILL.md routing sections reference the canonical stage spec instead of maintaining local copies. After this task, the ground truth (Task 1) and its distribution mechanism (Task 3) are fully connected to all consumers.

## Context

Read first:
- Task 1 output: the modified `state.md` template with renamed sections, promoted canonical spec
- Task 3 output: the modified `intent-inject.sh` with expanded routing
- Audit findings: MF-1, MF-2 (Current Focus as action), MF-8 (resume trusts STATE.md without drift-check), AC-5, AC-8 (local stage lists), LB-8

This task touches 7 files across 3 plugins. The changes are small per-file (1-3 lines each) but spread across the codebase. The risk is missing one file — the cross-reference rules (`stage-names`, `pipeline-handoff-contracts`) list the consumers.

**Files to modify (from canonical consumer list):**
1. `plugins/architect/skills/architect/workflows/plan.md` — step 7b Current Focus
2. `plugins/architect/skills/architect/workflows/review.md` — step 5 Current Focus
3. `plugins/mk-flow/skills/state/workflows/pause.md` — .continue-here.md template
4. `plugins/mk-flow/skills/state/workflows/resume.md` — add drift-check step
5. `plugins/architect/skills/architect/SKILL.md` — intake routing
6. `plugins/ladder-build/skills/ladder-build/SKILL.md` — intake routing
7. `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` — handoff stage reference

## Interface Specification

### Inputs
- Modified state.md template (Task 1) — the canonical stage spec location and section names
- Modified intent-inject.sh (Task 3) — routing alignment

### Outputs
- 7 modified files with STATE.md consumer alignment

### Contracts with Other Tasks
- Sprint 2 tasks further modify some of these files (adding metadata, adversarial sections). Sprint 2 changes are additive and won't conflict with Sprint 1 changes.
- Sprint 3 Task 2 (drift-check) validates the Pipeline Position field consistency that this task's consumers now respect.

## Pseudocode

```
1. MODIFY architect/workflows/plan.md — step 7b (STATE.md update):
   Find the step that writes Current Focus after plan creation.
   OLD instruction: writes action-oriented text like "Sprint 1 ready for execution"
   NEW instruction: "Update Current Focus to: 'Plan complete for [feature], Sprint 1 scoped.'
   Write Current Focus as a state description — what IS, not what to DO.
   Pipeline Position handles routing; Current Focus describes context."

   Also update the "Planned Work" reference (was "Next Up"):
   If step 7b mentions "Next Up", change to "Planned Work".

2. MODIFY architect/workflows/review.md — step 5 (STATE.md update):
   Find the step that writes Current Focus after sprint review.
   OLD instruction: writes action-oriented text like "Sprint N+1 ready for execution"
   NEW instruction: "Update Current Focus to: 'Sprint [N] reviewed. [QA result summary]. Sprint [N+1] scoped.'
   State description, not action. Pipeline Position handles routing."

   Also update any "Next Up" references to "Planned Work".

3. MODIFY mk-flow/skills/state/workflows/pause.md — .continue-here.md template:
   Find the section that defines what gets written to .continue-here.md.
   OLD: Has a "What's Next" field with free-text action description
   NEW: Replace "What's Next" with a Pipeline Position snapshot:
   "## Resume Context
   **Pipeline Position at pause:**
   - Stage: [current stage from STATE.md]
   - Plan: [path from Pipeline Position]
   - Sprint: [current sprint from Pipeline Position]

   **In-progress work:**
   [What was being worked on when paused — files, tasks, partial state]

   **To resume:**
   Run the appropriate pipeline skill based on Pipeline Position above."

   Remove any "What's Next" or "Next action" free-text fields.

4. MODIFY mk-flow/skills/state/workflows/resume.md — add drift-check step:
   Find the section where resume reads STATE.md to determine what to do.
   ADD step BEFORE acting on STATE.md data:
   "Before acting on STATE.md, run drift-check to verify state accuracy:
   bash [drift-check-script-path]
   If drift-check reports DRIFT, fix state first (drift-check --fix), then proceed.
   Do not act on unverified state."

   This addresses MF-8: resume currently trusts STATE.md without verification.

5. MODIFY architect/SKILL.md — intake routing section:
   Find the intake step that lists Pipeline Position stages.
   OLD: Maintains a local list of ~5 stages with routing logic
   NEW: "Read Pipeline Position from STATE.md. Route based on stage value.
   See canonical pipeline stages in the STATE.md template
   (plugins/mk-flow/skills/state/templates/state.md, Canonical Pipeline Stages section)
   for the authoritative stage list and valid transitions."

   Remove the inline stage list. Keep the routing logic (what to do for each stage)
   but reference the canonical spec for stage names.

6. MODIFY ladder-build/SKILL.md — intake routing section:
   Same pattern as #5:
   OLD: Maintains a local stage list
   NEW: Reference canonical spec for stage names. Keep routing logic.

7. MODIFY miltiaze/workflows/requirements.md — handoff stage:
   Find where the requirements workflow writes Pipeline Position after completion.
   Verify it writes "requirements-complete" (should already be correct).
   ADD reference: "Stage name 'requirements-complete' is from the canonical pipeline
   stages spec (STATE.md template)."
   This is a small annotation, not a structural change.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/plan.md` | MODIFY | step 7b: state-descriptive Current Focus, "Planned Work" reference |
| `plugins/architect/skills/architect/workflows/review.md` | MODIFY | step 5: state-descriptive Current Focus, "Planned Work" reference |
| `plugins/mk-flow/skills/state/workflows/pause.md` | MODIFY | .continue-here.md template: Pipeline Position snapshot replaces "What's Next" |
| `plugins/mk-flow/skills/state/workflows/resume.md` | MODIFY | Add drift-check step before acting on STATE.md |
| `plugins/architect/skills/architect/SKILL.md` | MODIFY | Intake routing: reference canonical spec, remove local stage list |
| `plugins/ladder-build/skills/ladder-build/SKILL.md` | MODIFY | Intake routing: reference canonical spec, remove local stage list |
| `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` | MODIFY | Handoff: annotate stage name as canonical |
| `context/STATE.md` | CHECK | Verify live STATE.md uses "Planned Work" (or update if template change requires it) |

## Acceptance Criteria

- [ ] plan.md step 7b writes Current Focus as state description ("Plan complete for [feature], Sprint 1 scoped")
- [ ] review.md step 5 writes Current Focus as state description
- [ ] Neither plan.md nor review.md use action verbs (ready, execute, run, start) in Current Focus instructions
- [ ] pause.md writes Pipeline Position snapshot to .continue-here.md (no "What's Next" free-text)
- [ ] resume.md runs drift-check BEFORE acting on STATE.md
- [ ] architect/SKILL.md intake references canonical stage spec, does not maintain local stage list
- [ ] ladder-build/SKILL.md intake references canonical stage spec, does not maintain local stage list
- [ ] miltiaze/requirements.md annotates stage name as canonical
- [ ] No file modified in this task contains a local copy of the stage enum — all reference the canonical spec
- [ ] All "Next Up" references in modified files changed to "Planned Work"

## Edge Cases

- **plan.md and review.md have multiple STATE.md update points:** Read each file carefully — there may be conditional branches (e.g., "if all sprints complete" vs "if more sprints remain") that each have their own Current Focus update. All branches must use state-descriptive language.
- **resume.md drift-check path may vary:** The drift-check script path is already expanded via `$DRIFT_CHECK_SCRIPT` in the hook. In resume.md, reference it as `bash ${DRIFT_CHECK_SCRIPT}` (matching the existing pattern in the hook's status_query instructions) or as the full relative path `plugins/mk-flow/skills/state/scripts/drift-check.sh`.
- **SKILL.md intake may reference stages for purposes other than routing:** Some stages may be checked to validate state (e.g., "if stage is sprint-N but no plan exists, error"). Keep validation logic — only remove the local stage DEFINITION. Replace it with a reference to the canonical spec.

## Notes

- This task has the most file spread (7 files, 3 plugins). Each individual change is small (1-5 lines). The risk is missing a file or leaving an inconsistent reference. After implementing, grep for "Next Up" across all modified files to verify none remain.
- The live `context/STATE.md` in this project should be updated during Sprint 1 review to match the new template (rename "Next Up" to "Planned Work"). Don't update it during this task — wait for review to confirm the template changes are correct.
- Sprint 2 will further modify plan.md, review.md, and other workflows to add adversarial sections and metadata. The changes made here (Current Focus language, canonical references) are in different sections and won't conflict.
