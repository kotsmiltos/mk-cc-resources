---
workflow: build-execute
skill: build
trigger: /build
phase_requires: sprinting
phase_transitions: sprinting → sprint-complete
---

# Sprint Execution Workflow

## Prerequisites

- Pipeline initialized (`.pipeline/state.yaml` exists)
- State phase is `sprinting`
- Sprint number set in state (`.pipeline/state.yaml` → `sprint`)
- Task specs exist in `.pipeline/sprints/sprint-N/tasks/`
- Each task has both `.md` (source spec) and `.agent.md` (agent brief)

## Steps

### 1. Validate State

Read `.pipeline/state.yaml`. Verify phase is `sprinting` and sprint number is set. If not `sprinting`, report current phase and exit. If no sprint number, report error and exit.

### 2. Load Sprint Tasks

Call `build-runner.loadSprintTasks(pipelineDir, sprintNumber)` to read all task specs from `.pipeline/sprints/sprint-N/tasks/`. Loads every `*.md` not a `.agent.md` derivative.

If no tasks found, report error and exit.

### 3. Verify Leaves

For each task, call `build-runner.verifyLeaf(task.spec)` to check for unresolved design choices.

For any task failing leaf verification:
- Call `build-runner.recordCompletion()` with status `blocked` and reason from `verifyLeaf`
- Remove task from execution list
- Log: "Task {id} blocked: {reason}"

If ALL tasks blocked, skip to step 7 (Sprint Summary).

### 3.5. Detect Orchestrator Tasks

Before leaf verification moves task forward, check each task's YAML frontmatter for `orchestrator_task: true` via `build-runner.extractOrchestratorTaskFlag(task.spec)`.

Tasks marked `orchestrator_task: true` require orchestrator invocation — they call `/essense-flow:*` slash commands, which sub-agent dispatched by `/build` cannot reach. Build runner must NOT dispatch such tasks.

For any task where `extractOrchestratorTaskFlag` returns `true`:
- Call `build-runner.recordCompletion()` with status `deferred` and reason `"requires orchestrator invocation — use the task's explicit command to run"`
- Remove task from execution list
- Log: "Task {id} deferred: orchestrator task — run the task's designated command manually"

Deferred tasks tallied separately from `complete`, `blocked`, `failed` in sprint summary. Must surface in final report so orchestrator knows to follow up.

### 4. Build Waves

Call `build-runner.buildWaves(nonBlockedTasks)` on remaining non-blocked tasks.

Constructs dependency graph, produces execution waves — arrays of task IDs that run in parallel within each wave, waves run sequentially.

If dependency cycle detected, report cycle and exit without transitioning state.

### 4.7. Classify Task Shape

Before wave execution, classify each non-blocked, non-deferred task:

- **Mechanical** — single file in `Files to Create/Modify`, small change (≈ ≤20 lines), no new top-level modules/functions, acceptance criteria verifiable by diff alone. Orchestrator executes **inline** via Edit.
- **Dispatch** — multi-file, new modules, logic requiring running code to verify, or criteria asking for test runs. Spawn code-writing sub-agent with `.agent.md` as prompt.

Record chosen mode in completion record under `execution_mode: inline|dispatch`.

### 5. Execute Waves

For each wave (sequential across waves, parallel within each wave):

**If execution_mode = inline:**
1. **Read source `.md` spec** (NOT `.agent.md`) for objective, files, and acceptance criteria.
2. **Apply edit** using Edit/Write. No sub-agent spawned.
3. **Verify acceptance criteria** by inspecting resulting diff against spec criteria.
4. **Record completion** with `execution_mode: inline`.

**If execution_mode = dispatch:**
1. **Read agent brief** — load `.agent.md` from `task.agentMdPath`. If missing, mark `failed` with reason "agent brief not found".
2. **Dispatch code-writing agent** — spawn sub-agent with `.agent.md` content as prompt. Agent writes code in project (NOT `.pipeline/`).
3. **Verify acceptance criteria** by checking agent's output against task's `.md` spec criteria.
4. **Record completion** with `execution_mode: dispatch`.

Either path calls `build-runner.recordCompletion()` with:
- `status`: `complete` if all criteria met, `failed` if any not
- `files_created`: new files
- `files_modified`: existing files changed
- `acceptance_criteria_met`: passing criteria
- `execution_mode`: `inline` or `dispatch`
- `reason`: (if failed) which criteria not met

Wait for all tasks in current wave before proceeding to next wave.

### 6. Sprint Summary

Call `build-runner.getSprintSummary(pipelineDir, sprintNumber)` to aggregate all completion records.

### 7. Transition State

Use `lib/state-machine.transition()` to move from `sprinting` to `sprint-complete`.

### 8. Auto-Advance: Review

After transitioning to `sprint-complete`, immediately transition to `reviewing` and report that review will begin. Review workflow handles actual QA dispatch.

Note: build does NOT run full review workflow inline — it transitions state and reports. Review is separate phase execution.

### 9. Report

Show user:
- **Total tasks:** count
- **Complete:** count and task IDs
- **Blocked:** count, task IDs, and reasons (need architect attention)
- **Failed:** count, task IDs, and reasons
- **Deferred:** count, task IDs, and command orchestrator must invoke manually
- **Files created/modified:** aggregate list
- **Next step:** suggest `/review` for post-sprint QA, or `/architect` for blocked tasks. If deferred tasks exist, list explicit commands orchestrator needs to run.
