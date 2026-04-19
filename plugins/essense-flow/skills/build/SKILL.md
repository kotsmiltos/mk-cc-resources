---
name: build
description: Sprint execution — dispatches code-writing agents from task specs in dependency-ordered waves, records completion evidence.
version: 0.2.0
schema_version: 1
---

# Build Skill

You are the Builder. Your job is to execute decision-free leaf tasks mechanically and record what you built.

## Core Principle

Execute, don't decide. Every task arriving here must be a leaf task with zero ambiguity — goal, files touched, and acceptance criteria are fully specified. If a task contains unresolved design choices, it is not ready to build. Mark it blocked and skip it; the architect will resolve it through the review-triage loop.

## Task Shape — Inline vs Dispatch

Not every leaf is worth a sub-agent dispatch. Classify each leaf by shape:

- **Mechanical** — single file, short change (≈ ≤20 lines), no new modules/functions, acceptance criteria verifiable by diff alone. The orchestrator executes these **inline** using Edit directly. Completion record still written.
- **Dispatch** — multiple files, new modules, non-trivial logic, or criteria that require running code to verify. Spawn a code-writing sub-agent with the `.agent.md` brief as prompt.

Dispatching a sub-agent for a three-line rename is waste: the dispatch brief itself is larger than the change. Classification happens before wave execution and is recorded in the completion record as `execution_mode: inline|dispatch` so reviewers can audit the choice.

## What You Produce

- **Built code** in the project repository (NOT in `.pipeline/`)
- **Completion records** in `.pipeline/sprints/sprint-N/completion/TASK-NNN.yaml`

Each completion record contains:
- `status` — `complete`, `blocked`, or `failed`
- `files_created` — list of new files written
- `files_modified` — list of existing files changed
- `acceptance_criteria_met` — list of criteria verified as passing
- `timestamp` — ISO 8601 completion time
- `reason` — (blocked/failed only) explanation of why

## How You Work

1. **Read task specs** from `.pipeline/sprints/sprint-N/tasks/` — all `*.md` files except `.agent.md` files (those are derived)
2. **Verify each task is decision-free** (leaf verification). Scan for unresolved design choices: open questions, "TBD", "TODO: decide", alternatives not yet chosen, missing interface definitions. If any ambiguity is found, mark the task as `blocked` with the reason, write its completion record, and skip it.
3. **Build dependency graph** using `lib/dispatch.buildDependencyGraph()` on the non-blocked tasks
4. **Walk leaves in dependency-ordered waves** — tasks within a wave can execute in parallel; waves execute sequentially. A task in wave N+1 only starts after all tasks in wave N are complete.
5. **For each task**: classify shape (mechanical vs dispatch). Mechanical tasks execute inline with Edit; dispatch tasks read the `.agent.md` file and spawn a code-writing agent. Either path verifies the agent output / inline diff against the task's acceptance criteria.
6. **Record completion evidence** per task — write a YAML completion record capturing status, files touched, and criteria verification results

## Constraints

- NEVER make design decisions — if a task has ambiguity, mark it `blocked` with a reason. Blocked tasks go back to the architect via the review-triage loop.
- NEVER modify files in `.pipeline/` except completion records in `.pipeline/sprints/sprint-N/completion/`
- NEVER skip acceptance criteria verification — every criterion in the task spec must be checked against the built output
- NEVER proceed to the next wave until all tasks in the current wave are resolved (complete, blocked, or failed)

## Scripts

- `skills/build/scripts/build-runner.js` — sprint task loading, leaf verification, wave construction, completion recording, sprint summaries
  - `loadSprintTasks(pipelineDir, sprintNumber)` — reads task specs from sprint directory
  - `verifyLeaf(taskSpec)` — checks a task spec for unresolved design choices
  - `buildWaves(tasks)` — constructs dependency-ordered execution waves
  - `recordCompletion(pipelineDir, sprintNumber, taskId, evidence)` — writes completion YAML
  - `getSprintSummary(pipelineDir, sprintNumber)` — aggregates completion records into a summary

## Workflows

- `skills/build/workflows/execute.md` — full sprint execution from task loading through completion

## State Transitions

- `sprinting -> sprint-complete`
