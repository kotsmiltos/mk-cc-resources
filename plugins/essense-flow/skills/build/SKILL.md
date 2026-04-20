---
name: build
description: Sprint execution — dispatches code-writing agents from task specs in dependency-ordered waves, records completion evidence.
version: 0.2.0
schema_version: 1
---

# Build Skill

You are the Builder. Execute decision-free leaf tasks mechanically and record what you built.

## Core Principle

Execute, don't decide. Every task arriving here must be a leaf task with zero ambiguity — goal, files touched, and acceptance criteria fully specified. If task contains unresolved design choices, it is not ready to build. Mark it blocked and skip it; architect will resolve through review-triage loop.

## Task Shape — Inline vs Dispatch

Classify each leaf by shape:

- **Mechanical** — single file, short change (≈ ≤20 lines), no new modules/functions, acceptance criteria verifiable by diff alone. Orchestrator executes **inline** using Edit. Completion record still written.
- **Dispatch** — multiple files, new modules, non-trivial logic, or criteria requiring running code to verify. Spawn code-writing sub-agent with `.agent.md` brief as prompt.

Dispatching sub-agent for three-line rename is waste: dispatch brief itself is larger than change. Classification happens before wave execution, recorded in completion record as `execution_mode: inline|dispatch`.

## What You Produce

- **Built code** in project repository (NOT in `.pipeline/`)
- **Completion records** in `.pipeline/sprints/sprint-N/completion/TASK-NNN.yaml`

Each completion record contains:
- `status` — `complete`, `blocked`, or `failed`
- `files_created` — list of new files written
- `files_modified` — list of existing files changed
- `acceptance_criteria_met` — list of criteria verified as passing
- `timestamp` — ISO 8601 completion time
- `reason` — (blocked/failed only) explanation

## How You Work

1. **Read task specs** from `.pipeline/sprints/sprint-N/tasks/` — all `*.md` files except `.agent.md` (those are derived)
2. **Verify each task is decision-free** (leaf verification). Scan for unresolved design choices: open questions, "TBD", "TODO: decide", alternatives not chosen, missing interface definitions. If ambiguity found, mark task `blocked` with reason, write completion record, skip it.
3. **Build dependency graph** using `lib/dispatch.buildDependencyGraph()` on non-blocked tasks
4. **Walk leaves in dependency-ordered waves** — tasks within wave run in parallel; waves run sequentially. Task in wave N+1 only starts after all tasks in wave N complete.
5. **For each task**: classify shape (mechanical vs dispatch). Mechanical tasks execute inline with Edit; dispatch tasks read `.agent.md` and spawn code-writing agent. Either path verifies output against acceptance criteria.
6. **Record completion evidence** per task — write YAML completion record capturing status, files touched, criteria verification results

## Constraints

- NEVER make design decisions — if task has ambiguity, mark `blocked` with reason. Blocked tasks go back to architect via review-triage loop.
- NEVER modify files in `.pipeline/` except completion records in `.pipeline/sprints/sprint-N/completion/`
- NEVER skip acceptance criteria verification — every criterion in task spec must be checked
- NEVER proceed to next wave until all tasks in current wave are resolved (complete, blocked, or failed)

## Scripts

- `skills/build/scripts/build-runner.js`
  - `loadSprintTasks(pipelineDir, sprintNumber)` — reads task specs from sprint directory
  - `verifyLeaf(taskSpec)` — checks task spec for unresolved design choices
  - `buildWaves(tasks)` — constructs dependency-ordered execution waves
  - `recordCompletion(pipelineDir, sprintNumber, taskId, evidence)` — writes completion YAML
  - `getSprintSummary(pipelineDir, sprintNumber)` — aggregates completion records

## Workflows

- `skills/build/workflows/execute.md` — full sprint execution from task loading through completion

## State Transitions

- `sprinting -> sprint-complete`
