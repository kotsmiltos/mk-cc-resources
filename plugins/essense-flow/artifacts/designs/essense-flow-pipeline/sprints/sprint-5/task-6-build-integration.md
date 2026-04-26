> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** Task 4, Task 5
> **estimated_size:** M

# Task 6: Build Integration Test

## Goal
Integration test validating the full build pipeline: read task specs → construct waves → simulate agent dispatch → record completions → generate report. Uses simulated agent outputs following the XML envelope format.

## Pseudocode

```
DESCRIBE "Build Integration":

  TEST "planExecution constructs waves from task specs":
    Fixture: 3 .agent.md files with dependencies A→B, A→C
    Assert: waves = [[A], [B, C]]

  TEST "assembleWaveBriefs prepares briefs within budget":
    Assert: each brief under token ceiling

  TEST "recordCompletion writes .completion.yaml":
    Fixture: simulated agent output with XML envelope
    Assert: completion file written, deviations captured

  TEST "generateCompletionReport produces summary":
    Assert: report includes task count, deviations, pass/fail

  TEST "overflow detection flags large files":
    Fixture: simulated completion with >300 line file
    Assert: overflow flagged

  TEST "wave failure handling detects terminal state":
    Fixture: all agents in wave FAILED
    Assert: terminal = true
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `tests/build-integration.test.js` | CREATE | Full build pipeline integration tests |

## Acceptance Criteria

- [ ] All test scenarios pass
- [ ] Simulated outputs use XML envelope with sentinel
- [ ] Overflow detection tested with fixture exceeding backstop
- [ ] Terminal failure state tested
- [ ] `npm test` runs all Sprint 1-5 tests together
