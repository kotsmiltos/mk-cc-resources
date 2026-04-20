---
name: init
description: Initialize essense-flow pipeline in current project.
arguments:
  - name: project-name
    description: Name for the project (defaults to directory name)
    required: false
---

# /init

Initialize essense-flow pipeline for this project.

## What it does

1. Creates `.pipeline/` with subdirs: requirements/, architecture/, sprints/, reviews/, decisions/
2. Copies default config (`config.yaml`) with project name and timestamp
3. Creates initial state (`state.yaml`) at phase "idle"
4. Creates empty rules, decisions index

## Instructions

Run init script:

```bash
node {{PLUGIN_ROOT}}/skills/context/scripts/init.js "{{project-name}}"
```

After init, report:
- Pipeline directory created
- Project name set
- Next: `/research`

## Constraints

- Do NOT overwrite existing pipeline — if `.pipeline/state.yaml` exists, report and stop
- Do NOT modify any files outside `.pipeline/`
