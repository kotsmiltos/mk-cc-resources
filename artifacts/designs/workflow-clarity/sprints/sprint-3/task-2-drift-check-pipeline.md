# Task 2: Drift-Check Pipeline Awareness

> **type:** task-spec
> **output_path:** artifacts/designs/workflow-clarity/sprints/sprint-3/task-2-drift-check-pipeline.md
> **sprint:** 3
> **status:** planned
> **depends_on:** Sprint 2
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D3 (canonical stage spec in state.md), Audit Action 9
> **open_questions:** none

## Goal

Extend drift-check.sh to validate Pipeline Position field completeness (fields match stage expectations) and verify the canonical stage list is consistent between STATE.md, intent-inject.sh, and SKILL.md routing sections. After this task, drift-check catches stale or incomplete Pipeline Position data before skills act on it, and verifies the pipeline state machine is internally consistent.

## Context

Read first:
- `plugins/mk-flow/skills/state/scripts/drift-check.sh` — current drift-check (handles BUILD-PLAN.md and PLAN.md verification)
- `plugins/mk-flow/skills/state/templates/state.md` — canonical stage list (lines 34-53) and Pipeline Position fields (lines 55-63)
- `plugins/mk-flow/hooks/intent-inject.sh` — routing rules (lines 199-222) that must match the canonical stage list
- PLAN.md FF-8 (Pipeline Position completeness), FF-14 (drift-check dual mode), FF-15 (all 9 fields)

**Current state:**
- drift-check.sh validates BUILD-PLAN.md milestones and PLAN.md sprint completion
- It does NOT validate Pipeline Position field completeness (e.g., stage is `sprint-2` but `task_specs` is empty)
- It does NOT verify the canonical stage list is consistent across consumers
- The `--fix` flag can correct STATE.md sprint status fields

## Interface Specification

### Inputs
- `context/STATE.md` — Pipeline Position section to validate
- `plugins/mk-flow/skills/state/templates/state.md` — canonical field list and stage list
- `plugins/mk-flow/hooks/intent-inject.sh` — routing rules to cross-check

### Outputs
- Extended drift-check.sh with Pipeline Position validation
- Extended drift-check.sh with canonical stage consistency check
- Exit codes: existing behavior preserved (0 = clean, 1 = drift, 2 = no plans)

### Contracts with Other Tasks
- Task 3 (Fitness Functions) will test drift-check's new validations
- Task 1 (Metadata) normalizes the metadata format that drift-check could optionally validate

## Pseudocode

```
1. ADD Pipeline Position field validation to drift-check.sh:

   a. DEFINE stage-to-required-fields mapping:
      STAGE_FIELDS is an associative concept (implemented as case statement):
        "idle"                → no required fields (all can be "—")
        "research"            → no required fields
        "requirements-complete" → requirements must be non-empty
        "audit-complete"      → audit must be non-empty
        "sprint-N"            → plan, current_sprint, task_specs must be non-empty
        "sprint-N-complete"   → plan, current_sprint, completion_evidence must be non-empty
        "reassessment"        → plan must be non-empty
        "complete"            → plan must be non-empty

   b. PARSE Pipeline Position from context/STATE.md:
      Extract: stage, requirements, audit, plan, current_sprint,
               build_plan, task_specs, completion_evidence, last_verified
      Use grep for `- **Stage:**`, `- **Requirements:**`, etc.
      Handle the "—" (em-dash) value as "empty/not set."

   c. VALIDATE each required field for the current stage:
      For each field expected non-empty:
        If field is "—" or empty:
          Report: "DRIFT: Pipeline Position field '[field]' is empty but stage '[stage]' requires it"
          Set drift flag

   d. OPTIONALLY validate that artifact paths exist:
      If plan field has a path → check the file exists
      If task_specs field has a path → check the directory exists
      If completion_evidence field has a path → check the file exists
      Missing files = DRIFT (the state claims something exists that doesn't)

   e. ADD --fix handling:
      If --fix flag is set and Pipeline Position fields are empty but should be populated:
        For plan field: search artifacts/designs/*/PLAN.md and artifacts/builds/*/BUILD-PLAN.md
        For task_specs: derive from plan path + current_sprint
        For completion_evidence: look for COMPLETION.md in the expected sprint directory
        Update STATE.md with found paths
        Report: "FIXED: Pipeline Position field '[field]' set to '[path]'"

2. ADD canonical stage consistency check:

   a. EXTRACT the canonical stage list from state.md template:
      Grep the fenced code block in the "Canonical Pipeline Stages" section.
      Expected format: lines containing stage names (idle, research, etc.)

   b. EXTRACT routing rules from intent-inject.sh:
      Grep for stage names in the routing section (lines 199-222).
      Build a list of stages that have routing rules.

   c. COMPARE:
      For each canonical stage: check it has a routing rule in intent-inject.sh
      For each routing rule: check it references a canonical stage
      Mismatches = DRIFT
      Report: "DRIFT: Stage '[name]' is canonical but has no routing rule"
      Report: "DRIFT: Routing rule references stage '[name]' not in canonical list"

   d. This check runs only in auto-discover mode (no specific plan file argument).
      It's a cross-file consistency check, not a plan-specific check.

3. INTEGRATE into existing drift-check flow:

   a. Pipeline Position validation runs AFTER plan-specific checks
   b. Canonical stage check runs AFTER Pipeline Position validation
   c. Both contribute to the overall exit code (any drift = exit 1)
   d. Output format matches existing drift-check style:
      [PASS] Pipeline Position: all fields consistent with stage "sprint-2"
      [DRIFT] Pipeline Position: "task_specs" is empty but stage "sprint-2" requires it
      [PASS] Canonical stages: all 8 stages have routing rules
      [DRIFT] Canonical stages: "reassessment" has no routing rule in intent-inject.sh
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/scripts/drift-check.sh` | MODIFY | Add Pipeline Position field validation, canonical stage consistency check, --fix handling for Pipeline Position fields |

## Acceptance Criteria

- [ ] drift-check validates Pipeline Position field completeness based on current stage
- [ ] drift-check reports which specific fields are empty when they shouldn't be
- [ ] drift-check validates artifact paths exist when Pipeline Position references them
- [ ] drift-check --fix can populate empty Pipeline Position fields from discovered artifacts
- [ ] drift-check compares canonical stage list (state.md) against routing rules (intent-inject.sh)
- [ ] drift-check reports mismatches between canonical stages and routing rules
- [ ] Existing drift-check behavior unchanged (BUILD-PLAN.md milestones, PLAN.md sprints)
- [ ] Exit codes preserved: 0 = clean, 1 = drift, 2 = no plans
- [ ] Output uses existing drift-check formatting ([PASS], [DRIFT], colors)
- [ ] Stage-to-field mapping handles all 8 canonical stages
- [ ] "—" (em-dash) treated as empty/not-set for validation purposes
- [ ] Windows-compatible (no GNU-specific commands, CRLF-safe)

## Edge Cases

- **No context/STATE.md:** Skip Pipeline Position validation entirely. Report: "No STATE.md found — Pipeline Position validation skipped."
- **Pipeline Position section missing from STATE.md:** Skip validation. Report the absence.
- **Stage not in canonical list:** Report as a finding ("unknown stage '[value]'") but don't fail on it — the hook's catch-all rule handles unknown stages.
- **Artifact path exists but file is empty:** Treat as PASS — the file exists, content is not drift-check's concern.
- **Multiple PLAN.md files in artifacts/designs/:** --fix should use the path in Pipeline Position if set, or prompt ambiguity if multiple exist and Pipeline Position is empty.
- **intent-inject.sh format changes:** The canonical stage extraction uses grep, which is fragile to format changes. Use generous patterns (grep for stage name strings, not exact line formats). Document the expected format as a comment in drift-check.sh.

## Notes

- This task makes drift-check the single enforcement point for Pipeline Position completeness (per Solution A in the exploration: "validated by drift-check, not by skills — single enforcement point").
- The canonical stage consistency check is a static analysis — it compares files, not runtime behavior. It catches drift between the state machine definition and its consumers.
- Keep the implementation compatible with the existing drift-check style: bash, portable, CRLF-safe, colored output optional.
