---
name: build
description: Execute current sprint — dispatch tasks in dependency waves, record completions, generate report.
---

# /build

Execute current sprint tasks in dependency-ordered waves.

## What it does

1. Reads task specs from `.pipeline/sprints/sprint-N/tasks/`
2. Builds dependency graph, constructs execution waves
3. Dispatches each wave's tasks (parallel within wave, sequential across waves)
4. Records completion evidence per task
5. Generates sprint completion report
6. Transitions: `sprinting` → `sprint-complete`

## Instructions

1. Read `.pipeline/state.yaml`, verify phase is `sprinting`
2. Get sprint number from `state.pipeline.sprint`
3. Use `skills/build/scripts/build-runner.js` (canonical /build path — every step below is part of the contract, not a menu):
   - `planExecution(sprintDir, config)` — build waves from .agent.md files
   - For each wave:
     - `executeWave(state, waveIndex, waves, pipelineDir, config)` — mark tasks RUNNING
     - `assembleWaveBriefs(wave, briefs, archContext, config)` — prepare briefs
     - Dispatch agents for each task in wave
     - **`recordCompletion(pipelineDir, sprintNumber, taskId, rawOutput)` — MANDATORY single call PER TASK.** Parses agent output, writes `sprints/sprint-N/completion/<taskId>.completion.yaml`. Skipping this leaves /review with no input — `enterReview` refuses, autopilot loops. The bug shape is: orchestrator writes a top-level summary directly and never calls recordCompletion per task. Do not do this.
     - `checkOverflow(completionRecord, config)` — verify file sizes
   - **`completeSprintExecution(pipelineDir, sprintNumber, completions, config, pluginRoot)` — MANDATORY single call.** Atomic: validates all completion records present on disk, writes `completion-report.md`, transitions `sprinting → sprint-complete` via `state-machine.writeState` (audited as `trigger: "build-skill"`). Returns `{ok, status, reason, report, nextAction}`. If `!ok`, do NOT proceed to /review — diagnose and re-run; phase stays at `sprinting` for safe retry.
4. Report: sprint complete, next: `/review` or `/architect`

## Constraints

- Do NOT run if not in `sprinting` phase — report and stop
- Do NOT modify architecture or requirements — only write to `.pipeline/sprints/`
- Flag deviations in completion records, never hide them
- Stop and report if any file exceeds `overflow.file_lines_backstop`
- All briefs under `BRIEF_TOKEN_CEILING`
- **Do NOT call `lib/state-machine.writeState` directly to transition `sprinting → sprint-complete`.** That bypasses `completeSprintExecution`'s precondition check (per-task records on disk) and produces a stuck pipeline that /review cannot proceed against. The canonical transition is `completeSprintExecution` only.
- **Do NOT write `SPRINT-REPORT.md` or any top-level sprint summary.** The canonical output is `completion-report.md` written by `completeSprintExecution`. Per-task evidence belongs in `sprints/sprint-N/completion/*.completion.yaml` via `recordCompletion`. Skipping per-task records and writing a summary is the reproducible build-skip bug across multiple projects (sprint-3.4, sprint-4) — the producer-side gate now refuses, the orchestrator must run the canonical sequence.
