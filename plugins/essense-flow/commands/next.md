---
name: next
description: Suggest next pipeline command based on current state.
---

# /next

Suggest next action based on current pipeline phase. Read-only.

## What it does

1. Reads `.pipeline/state.yaml`
2. Maps current phase to recommended next command

## Instructions

Run `node skills/context/scripts/next-runner.js [--json]` from project root.

Flags:
- `--json`: emit JSON with `next_command`, `why`, `prerequisites`, `scope` fields

## Constraints

- Do NOT modify `.pipeline/state.yaml` or any file
- Do NOT transition state
- Do NOT auto-execute suggested command — only suggest
