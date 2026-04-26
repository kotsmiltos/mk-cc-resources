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

Run `node skills/context/scripts/status-runner.js [--json] [--history]` from project root.

Flags:
- `--json`: emit full JSON output
- `--history`: include last 10 state transitions in output

## Constraints

- Do NOT modify `.pipeline/state.yaml` or any file
- Do NOT transition state
- If state file missing or corrupt, report error clearly
