---
name: build
description: Execution phase. Closed task specs in, working code out. Dispatches task agents in dependency-ordered waves with no concurrency cap. Verifies every agent's completion record against disk before persisting it. Drift surfaces loudly, never silently.
version: 1.0.0
schema_version: 1
---

# Build skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read sprint manifest at `.pipeline/architecture/sprints/<n>/manifest.yaml` (required) + every task spec at `.pipeline/architecture/sprints/<n>/tasks/<id>.yaml`. On missing/corrupt: refuse to start, return `{ok: false, reason}`.
- Verify `state.phase == sprinting`.
- Build does NOT re-read SPEC.md or REQ.md to "fix" a task spec mid-flight. Task specs are the contract. If a task spec is wrong, surface the gap in the completion record and pause the sprint.
- Dispatch in dependency-ordered waves. Within a wave, every task runs in parallel — **no concurrency cap**.
- For every task agent's completion record, call `lib/verify-disk.js validateCompletion(...)` before persisting. The record stored is `{ agent_claim, runner_verification, drift }`. Both shapes preserved.
- On drift, the sprint pauses. Build does NOT silently retry, soften criteria, or rewrite scope.
- Use `lib/finalize.js` to write the SPRINT-REPORT and transition `sprinting → sprint-complete` once all tasks in the sprint resolve.

## Core principle

Trust task specs, verify agents. The architect's contracts are ground truth. The implementing agents' self-reports are not — they are hypotheses that the runner re-validates against the filesystem.

## What you produce

- `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml` — one per task. Contains agent_claim + runner_verification + drift flag.
- `.pipeline/build/sprints/<n>/SPRINT-REPORT.md` — synthesized rollup. Becomes input to review.

Completion record:

```yaml
schema_version: 1
task_id: <id>
agent_claim:
  files_modified: [...]
  criteria: [{ id, status, check }]
  notes: "<agent's prose>"
runner_verification:
  files_validated: [{ path, exists, mtime, fresh }]
  per_criterion_verdicts: [{ id, agent_status, runner_status, evidence }]
  drift:
    files: [...]
    criteria: [...]
verified: true | false
task_started_at: <iso>
task_completed_at: <iso>
```

SPRINT-REPORT.md frontmatter:

```yaml
---
schema_version: 1
sprint: <n>
tasks_attempted: <count>
tasks_verified: <count>
tasks_drifted: <count>
tasks_paused: <count>
---
```

## How you work

### Setup

1. Read manifest. Confirm every task referenced has a spec file. If anything missing, refuse to start with a clear error.
2. Build the wave order from `manifest.waves` (already dependency-ordered by architect).

### Per wave

1. **Dispatch.** For every task in the wave, in parallel:
   - Brief the task agent with the full task spec (goal, requirements_traced, file_write_contract, behavioral_pseudocode, test_completion_contract, agency_level + rationale).
   - Record `task_started_at` before dispatch.
   - Dispatch via `Agent` tool with the brief envelope.
2. **No concurrency cap.** Run the whole wave at once. Resource pressure surfaces as advisory warnings (per Fail-Soft), never as rejected work.

### Per task return

For each task agent that returns:

1. Parse the completion claim it returned.
2. Call `lib/verify-disk.js validateCompletion({ projectRoot, claim, taskStartTime: task_started_at })`.
3. Write the completion record at `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml` with both agent_claim and runner_verification.
4. **Out-of-contract write check.** Compare runner_verification.files_validated against task spec's file_write_contract.allowed. Any path written that's not in `allowed` (or is in `forbidden`) — flag in the completion record. **Do not silently re-permit.**

### On drift

When `runner_verification.drift.files` or `runner_verification.drift.criteria` is non-empty:

1. Mark the task `paused`.
2. Write the completion record with the drift visible.
3. **Pause the sprint.** Surface to the user (or the review/heal phase) that the sprint paused on drift. Loud, not silent.
4. Build does NOT:
   - re-dispatch the task with adjusted parameters
   - silently retry
   - soften the criterion
   - re-permit out-of-contract writes

### On contradiction in task spec

If the agent reports it cannot satisfy the task spec (pseudocode won't compile, two requirements conflict, an AC is unsatisfiable):

1. The agent surfaces the contradiction in its claim notes.
2. Build records the contradiction in the completion record.
3. **Sprint pauses.** Surface the contradiction. The architect (or the user via triage routing) decides how to resolve. Build does not silently rewrite scope.

### Sprint complete

Once every task in the sprint has either:
- `verified: true`, OR
- a paused completion record (drift / contradiction surfaced),

assemble SPRINT-REPORT.md:

- Summary of what was attempted.
- Per task: verdict (verified / drifted / paused / contradiction).
- List of out-of-contract writes (if any).
- Recommended next move (review, or back to architecture if drift is widespread).

Call `finalize`:
- writes: SPRINT-REPORT.md + (if any tasks paused, the report carries them)
- nextState: `{ phase: "sprint-complete" }`

### Auto-synthesis safety net

If a task agent crashes without returning any record, build does NOT skip the task. Build writes a synthetic completion record:

```yaml
agent_claim:
  files_modified: []
  criteria: []
  notes: "agent crashed without returning"
runner_verification:
  ...as observed from disk
verified: false
synthetic: true
```

Per Diligent-Conduct: missing signals surface, never hide.

## Constraints

- Per **INST-13**: NO concurrency cap on wave dispatch. NO budget enforcement. NO max-tasks-per-wave gate. The architect sized the wave; build runs it.
- Per **Front-Loaded-Design**: build trusts task specs as closed. Agents that can't satisfy a spec surface contradictions; they do not improvise scope.
- Per **Diligent-Conduct**: every completion record stores both agent_claim AND runner_verification. Trust drift is auditable. No silent overwrites of agent reports with "corrected" runner data — both shapes are preserved.
- Per **Fail-Soft**: out-of-contract writes are flagged, not blocked. The flag travels to review.
- Per **Graceful-Degradation**: a missing or partial completion record from a crashed task agent produces a synthetic record (`synthetic: true`) and a paused-task verdict. The sprint surfaces the gap loudly; build does not pretend the task succeeded and does not silently skip it.

## Scripts

- `lib/dispatch.js` — task agent fan-out (mode: `task-by-task`).
- `lib/brief.js` — task brief assembly.
- `lib/verify-disk.js` — re-validation of every completion record.
- `lib/finalize.js` — sprint-end atomic write+transition.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| sprinting | sprinting | next wave | no |
| sprinting | sprint-complete | all tasks resolved (verified or paused with surface) | yes |
