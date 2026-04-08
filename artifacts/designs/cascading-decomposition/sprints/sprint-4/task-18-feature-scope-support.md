> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-4/task-18-feature-scope-support.md
> **sprint:** 4
> **status:** planned
> **depends_on:** T17
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D6
> **open_questions:** none

# Task 18: Feature Scope Directory Support

## Goal
Ensure scope-decompose handles the feature directory structure (`artifacts/scope/features/<slug>/`) correctly. The workflow was built for greenfield (`artifacts/scope/`); this task verifies and patches it for feature flow where the scope_root is nested under features/.

## Context
- Requirements Section 5 (File Structure): Feature on Existing Project layout
- T17 (scope-discover) produces discovery output at `features/<slug>/discovery/`
- scope-decompose reads scope_root from INDEX.md/STATE.md — if scope_root is `artifacts/scope/features/auth/`, all paths should resolve correctly
- D6 (backward compatibility): feature flow is additive; greenfield continues to work

## Interface Specification

### Inputs
- INDEX.md at `artifacts/scope/features/<slug>/INDEX.md`
- scope_root set to `artifacts/scope/features/<slug>/`
- Discovery artifacts at `features/<slug>/discovery/`

### Outputs
- Verified scope-decompose handles feature paths without error
- Any path-resolution bugs fixed
- architecture/ and modules/ created under feature scope_root

### Contracts with Other Tasks
- T17 (scope-discover) produces discovery output → this task ensures scope-decompose reads it
- T7 (scope-decompose) is the workflow being patched → changes must preserve greenfield behavior

## Pseudocode

```
VERIFY AND PATCH scope-decompose.md for feature flow:

1. VERIFY Step 1 intake:
   - Does INDEX.md reading work with scope_root = "artifacts/scope/features/auth/"?
   - Does QG1 (file inventory vs disk) resolve paths relative to feature scope_root?
   CHECK: all path constructions use {scope_root} prefix, not hardcoded "artifacts/scope/"

2. VERIFY Step 2 target identification:
   - At Level 0 for feature flow: discovery output exists at {scope_root}/discovery/
   - The workflow should read codebase-snapshot.agent.md and impact-map.agent.md
   ADD: If {scope_root}/discovery/ exists:
     Read codebase-snapshot.agent.md for existing architecture context
     Read impact-map.agent.md for impacted modules list
     Use impacted modules as the decomposition targets (not starting from scratch)
     Include existing patterns from codebase-snapshot in agent prompts

3. VERIFY Step 3 spawning:
   - Agent prompts should include discovery context (existing patterns, conventions)
   - Module boundaries should respect existing code boundaries from impact map
   ADD to agent prompt (feature flow):
     <existing_codebase>
       <architecture>{from codebase-snapshot.agent.md}</architecture>
       <impact>{from impact-map.agent.md — what this module touches}</impact>
       <patterns>{existing patterns to follow}</patterns>
     </existing_codebase>

4. VERIFY Step 7 output paths:
   - All output goes under {scope_root}/architecture/ and {scope_root}/modules/
   - INDEX.md written to {scope_root}/INDEX.md (not top-level artifacts/scope/)
   CHECK: no hardcoded paths that bypass scope_root

5. VERIFY Phase values:
   - Feature flow should use same phases as greenfield
   - INDEX.md phase: discovery-complete -> (L0 decomposition) -> architecture -> decomposition-L1 -> etc.
   ADD "discovery-complete" to the phase enumeration in INDEX.md template conventions
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | MODIFY | Add discovery context reading at Level 0, existing_codebase section in agent prompts for feature flow |
| `plugins/architect/skills/architect/templates/index.md` | MODIFY | Add "discovery-complete" to phase enumeration in conventions |

## Acceptance Criteria
- [ ] scope-decompose reads discovery artifacts when {scope_root}/discovery/ exists at Level 0
- [ ] Level 0 agent prompts include `<existing_codebase>` section with architecture, impact, and patterns from discovery
- [ ] All path constructions in scope-decompose use {scope_root} prefix (no hardcoded "artifacts/scope/")
- [ ] INDEX.md QG1 resolves paths relative to feature scope_root
- [ ] INDEX.md template conventions list "discovery-complete" as a valid phase
- [ ] Greenfield flow (no discovery/ directory) is unchanged — no regression
- [ ] Feature flow Level 0 uses impacted modules from impact-map as decomposition targets

## Edge Cases
- Discovery directory exists but is empty (incomplete discovery) — warn user, suggest re-running /architect scope discover
- Discovery was done but user wants to re-do Level 0 — existing architecture/ output should be overwritten
- Feature touches modules that don't exist yet (new module for feature) — these get "new" status, not "impacted"
