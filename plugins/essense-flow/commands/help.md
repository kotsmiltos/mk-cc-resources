---
name: help
description: Show pipeline overview, all commands, phase descriptions.
---

# /help

Display essense-flow pipeline overview and available commands.

## Instructions

Run `node skills/context/scripts/help-runner.js [--json]` from project root.

Flags:
- `--json`: emit JSON with `phase` and `commands` array (each entry: `command`, `description`, `available`, `reason?`, `example`)

## Constraints

- Do NOT modify any files — read-only
- Do NOT suggest running commands automatically — only display information
