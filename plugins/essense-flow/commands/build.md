---
name: build
description: Execute the current sprint — dispatch tasks in dependency waves, record completions, generate report.
---

# /build

Execute the current sprint's tasks in dependency-ordered waves.

## What it does

1. Reads task specs from `.pipeline/sprints/sprint-N/tasks/`
2. Builds dependency graph and constructs execution waves
3. Dispatches each wave's tasks (parallel within wave, sequential across waves)
4. Records completion evidence per task
5. Generates sprint completion report
6. Transitions state: `sprinting` → `sprint-complete`

## Instructions

1. Read `.pipeline/state.yaml` and verify phase is `sprinting`
2. Get current sprint number from `state.pipeline.sprint`
3. Use `skills/build/scripts/build-runner.js`:
   - `planExecution(sprintDir, config)` — build waves from .agent.md files
   - For each wave:
     - `executeWave(state, waveIndex, waves, pipelineDir, config)` — mark tasks RUNNING
     - `assembleWaveBriefs(wave, briefs, archContext, config)` — prepare briefs
     - Dispatch agents for each task in the wave
     - `recordCompletion(pipelineDir, sprintNumber, taskId, rawOutput)` — parse and persist
     - `checkOverflow(completionRecord, config)` — verify file sizes
   - `completeSprintExecution(pipelineDir, sprintNumber, completions, config, pluginRoot)` — report + transition
4. Report: sprint complete, next action: `/review` or `/architect`

## Constraints

- Do NOT run if pipeline is not in `sprinting` phase — report and stop
- Do NOT modify architecture or requirements — only write to `.pipeline/sprints/`
- Flag deviations in completion records, never hide them
- Stop and report if any file exceeds `overflow.file_lines_backstop`
- All briefs under `BRIEF_TOKEN_CEILING`
