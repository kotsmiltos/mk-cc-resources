> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** Task 4, Task 5
> **estimated_size:** S

# Task 7: Sprint Completion + State Transitions

## Goal
Wire up the build skill's state transitions: `sprinting` during execution, `sprint-complete` when all waves done, and integration with the completion report as evidence.

## Pseudocode

```
FUNCTION completeSprintExecution(pipelineDir, sprintNumber, completions, config):
  1. Generate completion report
  2. Verify all acceptance criteria checked
  3. Transition state: sprinting → sprint-complete
  4. Update state with completion evidence path
  5. Return { ok, report, nextAction: "/architect review" }
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/build/scripts/build-runner.js` | MODIFY | Add `completeSprintExecution` |
| `skills/build/workflows/execute.md` | MODIFY | Add completion steps |

## Acceptance Criteria

- [ ] State transitions from `sprinting` to `sprint-complete` after all waves
- [ ] Completion evidence path written to state
- [ ] Next action suggests `/architect` for review
- [ ] State not transitioned if any wave is terminal (failed)
