> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** Task 3, Task 4
> **estimated_size:** M

# Task 6: End-to-End Integration Test

## Goal
Create an integration test (`tests/e2e-pipeline.test.js`) that exercises the full pipeline with simulated agent outputs: init → research (simulated) → architecture (simulated) → build (simulated) → review (simulated) → complete. Verifies state transitions, artifact creation, and data flow between phases.

## Context
Read existing integration tests (`tests/architecture-integration.test.js`, `tests/build-integration.test.js`) for patterns. Uses simulated agent outputs with XML envelopes — no actual LLM calls.

## Pseudocode

```
DESCRIBE "End-to-End Pipeline":

  BEFORE ALL:
    - Create TMP_DIR as .pipeline/ directory
    - Copy defaults/config.yaml to TMP_DIR/config.yaml with project name set
    - Create initial state.yaml at phase "idle"
    - Copy references/transitions.yaml for state machine

  TEST "research phase produces requirements":
    - Create a problem statement fixture
    - Call research-runner.assemblePerspectiveBriefs(problemStatement, pluginRoot, config)
    - Verify 4 briefs produced
    - Simulate agent outputs (XML envelopes with findings, risks, constraints)
    - Call research-runner.parseAgentOutputs(simulatedOutputs)
    - Call research-runner.synthesizeAndGenerate(parsedOutputs, pluginRoot, null)
    - Verify REQ.md content has FR-NNN entries
    - Write REQ.md to TMP_DIR/requirements/

  TEST "architecture phase produces task specs":
    - Read REQ.md from TMP_DIR
    - Call architect-runner.planArchitecture(reqContent, pluginRoot, config)
    - Verify 4 architecture briefs
    - Simulate architecture agent outputs
    - Call architect-runner.synthesizeArchitecture(outputs, reqContent, config)
    - Verify ARCH.md produced with module map
    - Create fixture task specs in TMP_DIR/sprints/sprint-1/tasks/

  TEST "build phase executes tasks in waves":
    - Create fixture .md + .agent.md pairs in TMP_DIR/sprints/sprint-1/tasks/
    - Call build-runner.planExecution(sprintDir, config)
    - Verify waves constructed correctly
    - Call build-runner.assembleWaveBriefs for each wave
    - Simulate agent outputs for each task
    - Call build-runner.recordCompletion for each
    - Call build-runner.generateCompletionReport
    - Verify completion report written with correct counts

  TEST "review phase produces QA report":
    - Simulate QA agent outputs (4 perspectives with mixed severity findings)
    - Call architect-runner.runReview(parsedOutputs, 1, TMP_DIR, config)
    - Verify QA-REPORT.md written
    - Verify findings categorized by severity

  TEST "full pipeline state transitions are valid":
    - Verify state file reflects correct phase at each stage
    - Verify artifacts exist at expected paths after each phase

  AFTER ALL:
    - Clean up TMP_DIR
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `tests/e2e-pipeline.test.js` | CREATE | Full pipeline integration test |

## Acceptance Criteria

- [ ] Test exercises all 4 pipeline phases (research, architecture, build, review)
- [ ] Simulated outputs use proper XML envelope with sentinel
- [ ] State transitions verified at each phase
- [ ] Artifacts (REQ.md, ARCH.md, completion report, QA report) written and readable
- [ ] `npm test` runs all Sprint 1-6 tests together
- [ ] Test passes without actual LLM calls
