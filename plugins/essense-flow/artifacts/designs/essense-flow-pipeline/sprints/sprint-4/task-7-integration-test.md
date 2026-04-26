> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-7-integration-test.md
> **sprint:** 4
> **status:** planned
> **depends_on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D9
> **open_questions:** none

# Task 7: Architecture Integration Test

## Goal
Build an integration test that validates the full architecture pipeline: requirements input → perspective agent dispatch → synthesis → architecture document → sprint decomposition → task spec generation → .agent.md transform. Uses simulated agent outputs (same pattern as Sprint 3's research integration test).

## Context
Read `tests/research-integration.test.js` for the testing pattern: simulated XML agent outputs, end-to-end pipeline, file output verification.

This test validates that:
1. The architect runner correctly orchestrates all Sprint 3+4 libs
2. Requirements flow through to task specs with traceability (D10)
3. The dependency graph is validated as a DAG
4. Generated .agent.md files are valid and within token budget
5. Consistency verification catches known conflict patterns

## Interface Specification

### Inputs
- Fixture: simulated REQ.md (valid requirements with FR-NNN, NFR-NNN)
- Fixture: simulated perspective agent outputs (4 architecture agents returning structured analysis)
- Config: test pipeline config

### Outputs
- Test verdicts: pass/fail for each integration scenario
- Temp files: ARCH.md, task specs, .agent.md files (cleaned up after test)

### Contracts with Other Tasks
- Tests all lib/ modules: brief-assembly, agent-output, synthesis, dispatch, consistency, transform
- Tests architect-runner.js orchestration functions
- Validates interface contracts from PLAN.md

## Pseudocode

```
DESCRIBE "Architecture Integration":

  TEST "planArchitecture assembles 4 perspective briefs":
    1. Create fixture REQ.md with 3 FRs, 2 NFRs
    2. Call planArchitecture(reqPath, pluginRoot, config)
    3. Assert: 4 briefs returned (infra, interface, testing, security)
    4. Assert: each brief contains requirement content
    5. Assert: each brief is within token budget

  TEST "synthesizeArchitecture produces valid ARCH.md":
    1. Provide 4 simulated architecture agent outputs
    2. Call synthesizeArchitecture(outputs, requirements, config)
    3. Assert: result contains module map
    4. Assert: result contains interface contracts
    5. Assert: result contains FR → module traceability
    6. Assert: result contains decisions log
    7. Assert: quorum check passes (all 4 agents returned)

  TEST "consistency verifier catches interface mismatch":
    1. Provide 2 sibling outputs with conflicting interface contracts
    2. Call consistency.verify(siblings)
    3. Assert: status = "FAIL"
    4. Assert: issue category = "interface-mismatch"
    5. Assert: issue severity = "blocking"

  TEST "consistency verifier passes clean siblings":
    1. Provide 2 sibling outputs with compatible contracts
    2. Call consistency.verify(siblings)
    3. Assert: status = "PASS"

  TEST "decomposeIntoSprints produces valid DAG waves":
    1. Provide architecture with module dependencies
    2. Call decomposeIntoSprints(architecture, requirements, config)
    3. Assert: dependency graph is valid DAG
    4. Assert: waves respect dependency ordering
    5. Assert: independent modules are in the same wave

  TEST "createTaskSpecs generates .md + .agent.md pairs":
    1. Provide sprint plan with 3 tasks
    2. Call createTaskSpecs(sprint, architecture, config)
    3. Assert: 3 .md specs generated with all required sections
    4. Assert: 3 .agent.md files generated with 7 brief blocks
    5. Assert: all .agent.md within token budget
    6. Assert: FR → TASK traceability preserved

  TEST "dispatch lib validates DAG and detects cycles":
    1. Provide tasks with circular dependency A->B->C->A
    2. Call dispatch.validateDAG(graph)
    3. Assert: valid = false
    4. Assert: cycle nodes identified

  TEST "dispatch lib constructs correct waves":
    1. Provide: A->B, A->C, B->D, C->D (diamond)
    2. Call dispatch.constructWaves(graph, order)
    3. Assert: wave 0 = [A], wave 1 = [B, C], wave 2 = [D]

  TEST "transform produces valid .agent.md from task spec":
    1. Load a fixture task spec .md
    2. Call transform.transformToAgentMd(spec, context, config)
    3. Assert: output has IDENTITY, CONSTRAINTS, CONTEXT, TASK, OUTPUT FORMAT, ACCEPTANCE CRITERIA, SENTINEL blocks
    4. Assert: Notes section is stripped
    5. Assert: pseudocode preserved verbatim
    6. Assert: acceptance criteria preserved verbatim
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `tests/architecture-integration.test.js` | CREATE | Full integration test with fixtures and simulated outputs |
| `tests/dispatch.test.js` | CHECK | Ensure unit tests exist from Task 3 |
| `tests/consistency.test.js` | CHECK | Ensure unit tests exist from Task 4 |
| `tests/transform.test.js` | CHECK | Ensure unit tests exist from Task 5 |

## Acceptance Criteria

- [ ] All integration test scenarios pass
- [ ] Simulated agent outputs follow the XML envelope format from BRIEF-PROTOCOL.md
- [ ] The test validates the full pipeline: REQ.md → ARCH.md → task specs → .agent.md
- [ ] Dispatch DAG validation is tested with both valid and invalid graphs
- [ ] Consistency verification is tested with both clean and conflicting outputs
- [ ] Transform is tested with a realistic task spec fixture
- [ ] All temp files are cleaned up after tests
- [ ] `npm test` runs all Sprint 3 + Sprint 4 tests together

## Edge Cases

- **Fixture REQ.md with zero requirements:** Pipeline should handle gracefully
- **All simulated agents return identical analysis:** Synthesis should classify as consensus
- **Architecture with only one module:** Single-wave sprint plan

## Notes
This test is the sprint 4 boundary test (from PLAN.md Sprint Tracking: "architecture must produce valid task specs before build depends on them"). It proves the architecture phase works end-to-end with simulated agent outputs, just as the Sprint 3 research integration test proved the research phase.
