---
name: status
description: Display current pipeline state — phase, sprint, last action, next recommended action.
---

# /status

Show current pipeline status. Read-only.

## What it does

1. Reads `.pipeline/state.yaml`
2. Reports current phase, sprint number, last update timestamp
3. Suggests next recommended action

## Instructions

1. Read `.pipeline/state.yaml` using `lib/yaml-io.safeReadWithFallback()`
2. If no state file, report: "Pipeline not initialized. Run `/init` first."
3. Display:
   - **Phase:** current pipeline phase
   - **Sprint:** current sprint number (if applicable)
   - **Last updated:** timestamp
   - **Completion evidence:** path (if applicable)
   - **Next action:** derived from phase (see `/next` mapping)

### Live Progress

After showing state, check for active progress files:

1. Call `lib/progress.readProgress(pipelineDir, currentPhase, sprintNumber)`
2. If progress data exists, display:
   - Phase name and elapsed time
   - Agent statuses (running/complete/failed) with timing
   - Task completion count (tasks_complete/tasks_total)
3. Format as compact summary:
   ```
   Live: research (2m 14s)
     research-security: running (1m 30s)
     research-scalability: complete (44s)
     Tasks: 1/4
   ```
4. If no progress file, skip section

## Constraints

- Do NOT modify `.pipeline/state.yaml` or any file
- Do NOT transition state
- If state file missing or corrupt, report error clearly
