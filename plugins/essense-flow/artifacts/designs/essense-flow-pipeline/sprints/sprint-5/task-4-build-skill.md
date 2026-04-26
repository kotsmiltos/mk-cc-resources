> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** Task 1, Task 2, Task 3
> **estimated_size:** L

# Task 4: Build Skill

## Goal
Build the build skill (`skills/build/`) — the execution engine that reads task specs, builds dependency graphs, dispatches agents in waves, verifies acceptance criteria, and reports results. The builder follows specs mechanically, flags deviations, and stops on ambiguity.

## Context
Read `essence/MENTAL-MODEL.md` Section 3 (The Builder). Read `essence/BRIEF-PROTOCOL.md` Section 3 (Dispatch Patterns). Read `lib/dispatch.js` for wave construction. Read `lib/transform.js` for .agent.md loading. Read `skills/research/` and `skills/architect/` for skill structure patterns.

## Interface Specification

### Inputs
- `.pipeline/sprints/sprint-N/tasks/*.agent.md` — agent briefs from architect
- `.pipeline/architecture/ARCH.md` — architecture context
- `.pipeline/config.yaml` — pipeline config
- `.pipeline/state.yaml` — current state

### Outputs
- `.pipeline/sprints/sprint-N/completion/TASK-NNN.completion.yaml` — per-task completion evidence
- `.pipeline/sprints/sprint-N/completion-report.md` — sprint-level summary

## Pseudocode

```
MODULE build-runner.js:

FUNCTION planExecution(sprintDir, config):
  1. Read all .agent.md files from sprint tasks directory
  2. Extract dependencies from corresponding .md specs
  3. Build dependency graph with dispatch.buildDependencyGraph
  4. Validate DAG with dispatch.validateDAG
  5. Construct waves with dispatch.constructWaves
  6. Return { waves, briefs, graph }

FUNCTION assembleWaveBriefs(wave, briefs, archContext, config):
  1. For each task in the wave:
     a. Read the .agent.md file
     b. Wrap architecture context in data-block
     c. Check token budget
  2. Return assembled briefs for dispatch

FUNCTION recordCompletion(pipelineDir, sprintNumber, taskId, result):
  1. Parse agent output with agent-output lib
  2. Extract: files written, deviations, verification results
  3. Write TASK-NNN.completion.yaml using yaml-io.safeWrite
  4. Return completion record

FUNCTION generateCompletionReport(pipelineDir, sprintNumber, completions):
  1. Aggregate all task completions
  2. Count: completed, deviations, failures
  3. Write completion-report.md
  4. Return summary
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/build/SKILL.md` | CREATE | Skill definition: role, workflows, constraints |
| `skills/build/scripts/build-runner.js` | CREATE | Execution: plan, wave dispatch, completion recording |
| `skills/build/workflows/execute.md` | CREATE | Execution workflow: read specs → waves → dispatch → verify → report |

## Acceptance Criteria

- [ ] SKILL.md defines the builder role with clear constraints (zero creative freedom, flag deviations)
- [ ] `planExecution` reads .agent.md files and constructs wave execution plan
- [ ] `assembleWaveBriefs` prepares briefs for a single wave's tasks
- [ ] `recordCompletion` parses agent output and writes .completion.yaml
- [ ] `generateCompletionReport` produces sprint-level summary
- [ ] State transition: `sprinting` maintained during execution
- [ ] Deviations from spec are flagged in completion records, not hidden
- [ ] File size backstop from config checked (overflow.file_lines_backstop)
