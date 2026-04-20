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

1. Read `.pipeline/state.yaml` using `lib/yaml-io.safeReadWithFallback()`
2. If no state file exists, suggest: `/init`
3. Map phase to next action:

| Current Phase | Next Command | Explanation |
|---------------|-------------|-------------|
| `idle` | `/elicit` or `/research` | Start with elicitation or research directly |
| `eliciting` | `/elicit` | Continue design exploration |
| `research` | _(auto-advancing to triage)_ | Research in progress |
| `requirements-ready` | `/architect` | Requirements done — plan architecture |
| `architecture` | _(wait)_ | Architecture in progress |
| `decomposing` | _(wait)_ | Decomposition in progress |
| `sprinting` | `/build` | Sprint ready — execute tasks |
| `sprint-complete` | _(auto-advancing to review)_ | Sprint done |
| `reviewing` | _(auto-advancing to triage)_ | Review in progress |
| `triaging` | _(auto-advancing to target phase)_ | Triage in progress |
| `verifying` | `/verify` | Run spec compliance check |
| `complete` | "Pipeline complete" | All work done |

4. Report suggestion with brief explanation

## Constraints

- Do NOT modify `.pipeline/state.yaml` or any file
- Do NOT transition state
- Do NOT auto-execute suggested command — only suggest
