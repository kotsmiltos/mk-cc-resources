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
- Sprint number is set in state (`.pipeline/state.yaml` → `sprint`)
- Task specs exist in `.pipeline/sprints/sprint-N/tasks/`
- Each task has both `.md` (source spec) and `.agent.md` (agent brief)

## Steps

### 1. Validate State

Read `.pipeline/state.yaml`. Verify phase is `sprinting` and a sprint number is set. If phase is not `sprinting`, report the current phase and exit. If no sprint number is set, report the error and exit.

### 2. Load Sprint Tasks

Call `build-runner.loadSprintTasks(pipelineDir, sprintNumber)` to read all task specs from `.pipeline/sprints/sprint-N/tasks/`. This loads every `*.md` file that is not a `.agent.md` derivative.

If no tasks are found, report the error and exit.

### 3. Verify Leaves

For each loaded task, call `build-runner.verifyLeaf(task.spec)` to check for unresolved design choices.

For any task that fails leaf verification:
- Call `build-runner.recordCompletion()` with status `blocked` and the reason from `verifyLeaf`
- Remove the task from the execution list
- Log: "Task {id} blocked: {reason}"

If ALL tasks are blocked, skip to step 7 (Sprint Summary).

### 3.5. Detect Orchestrator Tasks

Before leaf verification moves the task forward, check each task's YAML frontmatter for `orchestrator_task: true` by calling `build-runner.extractOrchestratorTaskFlag(task.spec)`.

Tasks marked `orchestrator_task: true` require orchestrator invocation because they call `/essense-flow:*` slash commands, which a sub-agent dispatched by `/build` cannot reach. The build runner must NOT attempt to dispatch such tasks.

For any task where `extractOrchestratorTaskFlag` returns `true`:
- Call `build-runner.recordCompletion()` with status `deferred` and reason `"requires orchestrator invocation — use the task's explicit command to run"`
- Remove the task from the execution list
- Log: "Task {id} deferred: orchestrator task — run the task's designated command manually"

Deferred tasks are tallied separately from `complete`, `blocked`, and `failed` in the sprint summary and must be surfaced in the final report so the orchestrator knows to follow up.

### 4. Build Waves

Call `build-runner.buildWaves(nonBlockedTasks)` on the remaining non-blocked tasks.

This constructs a dependency graph and produces execution waves — arrays of task IDs that can run in parallel within each wave, with waves executed sequentially.

If a dependency cycle is detected, report the cycle and exit without transitioning state.

### 4.7. Classify Task Shape

Before wave execution, classify each non-blocked, non-deferred task by shape:

- **Mechanical** — single file in `Files to Create/Modify`, estimated change is small (≈ ≤20 lines), no new top-level modules/functions, acceptance criteria verifiable by diff alone. The orchestrator will execute these **inline** via Edit.
- **Dispatch** — multi-file, new modules, logic changes that require running code to verify, or criteria asking for test runs. Spawn a code-writing sub-agent with `.agent.md` as prompt.

Record the chosen mode in each task's completion record under `execution_mode: inline|dispatch`. The rationale for inline is the source spec itself — short, single-file, verifiable-by-diff — so no extra justification is required.

### 5. Execute Waves

For each wave (sequential across waves, parallel within each wave), per task:

**If execution_mode = inline:**
1. **Read the source `.md` spec** (NOT the `.agent.md`) for objective, files, and acceptance criteria.
2. **Apply the edit** using Edit/Write directly. No sub-agent is spawned.
3. **Verify acceptance criteria** by inspecting the resulting diff against the spec criteria.
4. **Record completion** with `execution_mode: inline`.

**If execution_mode = dispatch:**
1. **Read the agent brief** — load the `.agent.md` file from `task.agentMdPath`. If missing, mark `failed` with reason "agent brief not found".
2. **Dispatch code-writing agent** — spawn a sub-agent with the `.agent.md` content as prompt. The agent writes code in the project (NOT `.pipeline/`).
3. **Verify acceptance criteria** by checking the agent's output against the task's `.md` spec criteria.
4. **Record completion** with `execution_mode: dispatch`.

Either path calls `build-runner.recordCompletion()` with:
- `status`: `complete` if all acceptance criteria are met, `failed` if any are not
- `files_created`: new files
- `files_modified`: existing files changed
- `acceptance_criteria_met`: list of passing criteria
- `execution_mode`: `inline` or `dispatch`
- `reason`: (if failed) which criteria were not met

Wait for all tasks in the current wave to finish before proceeding to the next wave.

### 6. Sprint Summary

Call `build-runner.getSprintSummary(pipelineDir, sprintNumber)` to aggregate all completion records.

### 7. Transition State

Use `lib/state-machine.transition()` to move from `sprinting` to `sprint-complete`.

### 8. Auto-Advance: Review

This transition auto-advances. After transitioning to `sprint-complete`, immediately transition to `reviewing` and report that review will begin. The review workflow handles the actual QA dispatch.

Note: build does NOT run the full review workflow inline — it transitions state and reports. The review is a separate phase execution.

### 9. Report

Show the user:
- **Total tasks:** count
- **Complete:** count and list of task IDs
- **Blocked:** count, task IDs, and reasons (these need architect attention)
- **Failed:** count, task IDs, and reasons
- **Deferred:** count, task IDs, and the command the orchestrator must invoke manually (orchestrator tasks)
- **Files created/modified:** aggregate list
- **Next step:** suggest `/review` to run post-sprint QA, or `/architect` to address blocked tasks. If deferred tasks exist, list the explicit commands the orchestrator needs to run.
