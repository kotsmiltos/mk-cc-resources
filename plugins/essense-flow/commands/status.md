---
name: status
description: Display current pipeline state — phase, sprint, last action, next recommended action.
---

# /status

Show the current pipeline status. Read-only — does not modify state.

## What it does

1. Reads `.pipeline/state.yaml`
2. Reports current phase, sprint number, last update timestamp
3. Suggests next recommended action

## Instructions

1. Read `.pipeline/state.yaml` using `lib/yaml-io.safeReadWithFallback()`
2. If no state file exists, report: "Pipeline not initialized. Run `/init` first."
3. Display:
   - **Phase:** current pipeline phase
   - **Sprint:** current sprint number (if applicable)
   - **Last updated:** timestamp
   - **Completion evidence:** path (if applicable)
   - **Next action:** derived from phase (see `/next` mapping)

## Constraints

- Do NOT modify `.pipeline/state.yaml` or any other file
- Do NOT transition state
- If state file is missing or corrupt, report the error clearly
