> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-4/task-21-calibration.md
> **sprint:** 4
> **status:** planned
> **depends_on:** T17, T18, T19, T20, T23
> **estimated_size:** L
> **plan:** ../../PLAN.md
> **key_decisions:** none
> **open_questions:** none

# Task 21: End-to-End Calibration Run

## Goal
Validate the complete cascading decomposition pipeline by running a synthetic project through the full flow: miltiaze scope requirements -> architect scope level-0 -> architect scope level-1 -> ladder-build execution. This is a dry-run exercise that reads the workflows and verifies they would produce correct output at each stage without actually building a real project.

## Context
- The pipeline is structurally complete after T17-T20 + T23
- This task validates that the instructions in each workflow are consistent, complete, and executable
- It's a "paper walkthrough" — trace the flow manually, checking handoffs and contracts at each stage
- Previous calibration approach (Sprint 3 completion) validated individual tasks; this validates the pipeline as a whole

## Interface Specification

### Inputs
- All scope-related workflows, templates, and references
- A synthetic test scenario: "Build a CLI task manager with 4 modules"

### Outputs
- Calibration report documenting: what worked, what broke, what needs fixing
- Any fixes applied during calibration

### Contracts with Other Tasks
- All other Sprint 4 tasks must be done first — calibration validates the final state

## Pseudocode

```
WALKTHROUGH each pipeline stage with a synthetic scenario:

Scenario: "Build a CLI task manager with SQLite storage, 4 modules: storage, task-service, cli, reporting"

STAGE 1 — miltiaze scope requirements:
  1. Read requirements.md scope_mode detection logic
  2. Verify: with input "scope build a CLI task manager", scope_mode would be TRUE
  3. Trace the output generation:
     - Would project-brief.md be written to artifacts/scope/brief/?
     - Would project-brief.agent.md have all required YAML + XML sections?
     - Would INDEX.md be created with correct defaults?
     - Would STATE.md be updated with scope_root?
  4. Note any gaps or ambiguities

STAGE 2 — architect scope level-0:
  1. Read scope-decompose.md intake (Step 1)
  2. Verify: with INDEX.md at brief-complete, Level 0 would be detected
  3. Trace the spawning logic (Step 3):
     - Would a single L0 agent receive the project brief?
     - Would the agent prompt have context, scope, task, output_format sections?
  4. Trace the output collection (Step 5):
     - Would architecture/ be created with system-map, contracts, patterns, decisions?
     - Would INDEX.md be updated with module status?
  5. Trace quality gates:
     - Would QG1-QG5 pass on correct output?
     - Would QG3 (positive framing) catch a negation?
  6. Note any gaps

STAGE 3 — architect scope level-1:
  1. Trace per-module spawning:
     - 4 modules: storage (Tier 1), task-service (Tier 2), cli (Tier 2), reporting (Tier 3)
     - Would Tier 1 spawn first, then Tier 2 batch, then Tier 3?
  2. Trace brief assembly (Step 4):
     - Would each agent get system-map + relevant contracts + relevant patterns + relevant decisions?
     - Would superseded decisions be excluded?
  3. Trace consistency check:
     - Would the consistency agent receive all 4 module outputs?
     - Would CHECK 1-5 catch interface mismatches?
  4. Trace INDEX.md update:
     - Would module statuses update to L1-done or leaf-ready?
  5. Note any gaps

STAGE 4 — ladder-build scope execution:
  1. Read execute.md scope detection
  2. Verify: with INDEX.md showing leaf-ready modules, scope_mode = TRUE
  3. Trace wave planning:
     - Would Tier 1 (storage) execute first?
     - Would batch size respect parallel_batch_size?
  4. Trace brief assembly:
     - Would each implementation agent get task spec + system-map + contracts + patterns + decisions?
  5. Trace overflow detection:
     - Would agents receive the overflow protocol?
     - Would post-execution verification catch oversized files?
  6. Trace completion report and INDEX.md update
  7. Note any gaps

COMPILE calibration report:
  For each stage:
    - Handoff contract: does the output of stage N match what stage N+1 expects?
    - Path resolution: do all paths resolve correctly?
    - Quality gates: would they catch real errors?
    - Edge cases: what would break?

  Produce: artifacts/designs/cascading-decomposition/CALIBRATION.md
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `artifacts/designs/cascading-decomposition/CALIBRATION.md` | CREATE | Calibration report with per-stage findings |
| Various workflow/template files | MODIFY (if bugs found) | Fix any issues discovered during calibration |

## Acceptance Criteria
- [ ] All 4 pipeline stages traced with a synthetic scenario
- [ ] Handoff contracts verified between each stage (output format matches next stage's expected input)
- [ ] Path resolution verified for greenfield flow (artifacts/scope/)
- [ ] Quality gates (QG1-QG5) verified against correct and incorrect synthetic output
- [ ] Overflow detection logic verified against synthetic oversized file
- [ ] Calibration report written to CALIBRATION.md
- [ ] Any bugs found during calibration are fixed and documented in the report
- [ ] Feature flow path (artifacts/scope/features/<slug>/) also traced through Stage 2-4

## Edge Cases
- Calibration finds a blocking bug — fix it immediately, document it, re-trace the affected stage
- Calibration finds the workflow is ambiguous at a step — document the ambiguity AND fix it (don't just note it)
- Calibration scope creep — this is a verification exercise, not a feature addition. If improvements are found, log them as Refactor Requests, don't implement during calibration
