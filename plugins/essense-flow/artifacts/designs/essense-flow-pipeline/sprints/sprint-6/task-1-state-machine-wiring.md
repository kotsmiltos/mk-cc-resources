> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** None
> **estimated_size:** S

# Task 1: Wire completeSprintExecution to State Machine

## Goal
Replace the direct `state.pipeline.phase` mutation in `completeSprintExecution()` with a proper call to `lib/state-machine.transition()`. This enforces the transition table (`references/transitions.yaml`) and ensures the `sprinting → sprint-complete` transition is validated through the centralized state contract.

## Context
Read `lib/state-machine.js` for the `transition()` function signature. Read `references/transitions.yaml` for the `sprinting-to-sprint-complete` transition entry. The current `completeSprintExecution` at `skills/build/scripts/build-runner.js:357-390` writes phase directly.

## Pseudocode

```
FUNCTION completeSprintExecution(pipelineDir, sprintNumber, completions, config):
  1. Generate completion report (unchanged)
  2. Check for failed tasks (unchanged)
  3. If no failures:
     a. Load transition map from transitions.yaml:
        transitionsPath = path to references/transitions.yaml (resolve from pluginRoot)
        transitionMap = stateMachine.loadTransitions(transitionsPath)
     b. Call stateMachine.transition(stateFilePath, "sprint-complete", transitionMap, pipelineDir)
     c. Re-read state and add completion_evidence field, then re-save
  4. Return result (unchanged)
```

Note: `transition()` requires the `pipelineDir` for requirement checking. The `sprinting-to-sprint-complete` transition has `requires: "at least one task spec exists in current sprint dir"` — this is a free-text requirement that `checkRequirements` treats as unverifiable. Either:
- Option A: Remove the requirement from transitions.yaml (simplest)
- Option B: Skip requirement check by wrapping in try/catch and noting it
- Option C: Implement a custom requirement check for task spec existence

**Recommended: Option A** — the check is redundant since `completeSprintExecution` is only called after tasks are already executed.

The function also needs `pluginRoot` as a new parameter to locate transitions.yaml.

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/build/scripts/build-runner.js` | MODIFY | Import state-machine, update `completeSprintExecution` to use `transition()` |
| `references/transitions.yaml` | MODIFY | Change `sprinting-to-sprint-complete` requires from free-text to `null` |
| `tests/build.test.js` | MODIFY | Update `completeSprintExecution` tests to pass pluginRoot |

## Acceptance Criteria

- [ ] `completeSprintExecution` uses `stateMachine.transition()` instead of direct phase mutation
- [ ] Transition table is loaded from `references/transitions.yaml`
- [ ] Invalid transitions (e.g., `idle → sprint-complete`) are rejected with error
- [ ] Existing tests updated and passing
- [ ] `sprinting-to-sprint-complete` transition requires field is `null` (not free-text)
