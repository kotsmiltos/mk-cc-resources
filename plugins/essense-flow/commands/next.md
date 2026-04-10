---
name: next
description: Suggest the next pipeline command based on current state.
---

# /next

Suggest what to do next based on the current pipeline phase. Read-only — does not modify state.

## What it does

1. Reads `.pipeline/state.yaml`
2. Maps current phase to the recommended next command

## Instructions

1. Read `.pipeline/state.yaml` using `lib/yaml-io.safeReadWithFallback()`
2. If no state file exists, suggest: `/init`
3. Map phase to next action:

| Current Phase | Next Command | Explanation |
|---------------|-------------|-------------|
| `idle` | `/research` | Start with research to understand the problem |
| `research` | _(wait)_ | Research in progress — wait for completion |
| `requirements-ready` | `/architect` | Requirements done — plan the architecture |
| `architecture` | _(wait)_ | Architecture in progress — wait for completion |
| `decomposing` | _(wait)_ | Decomposition in progress — wait for completion |
| `sprinting` | `/build` | Sprint ready — execute tasks |
| `sprint-complete` | `/review` or `/architect` | Sprint done — run QA review |
| `reviewing` | _(wait)_ | Review in progress — wait for completion |
| `reassessment` | `/architect` (with user approval) | Reassessment needed — re-plan |
| `complete` | "Pipeline complete" | All work done |

4. Report the suggestion with a brief explanation

## Constraints

- Do NOT modify `.pipeline/state.yaml` or any other file
- Do NOT transition state
- Do NOT auto-execute the suggested command — only suggest it
