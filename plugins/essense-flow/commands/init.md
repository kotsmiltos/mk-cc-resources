---
name: init
description: Initialize the essense-flow pipeline in the current project.
arguments:
  - name: project-name
    description: Name for the project (defaults to directory name)
    required: false
---

# /init

Initialize the essense-flow pipeline for this project.

## What it does

1. Creates `.pipeline/` directory with subdirectories: requirements/, architecture/, sprints/, reviews/, decisions/
2. Copies default config (`config.yaml`) with project name and timestamp
3. Creates initial state (`state.yaml`) at phase "idle"
4. Creates empty rules, decisions index

## Instructions

Run the init script:

```bash
node {{PLUGIN_ROOT}}/skills/context/scripts/init.js "{{project-name}}"
```

After initialization, report:
- Pipeline directory created
- Project name set
- Next action: `/research`

## Constraints

- Do NOT overwrite an existing pipeline — if `.pipeline/state.yaml` already exists, report and stop
- Do NOT modify any files outside `.pipeline/`
