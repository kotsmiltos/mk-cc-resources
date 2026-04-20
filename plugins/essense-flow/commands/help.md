---
name: help
description: Show pipeline overview, all commands, phase descriptions.
---

# /help

Display essense-flow pipeline overview and available commands.

## Instructions

Show:

### Pipeline Overview

essense-flow takes project from vague idea to built, verified code through structured phases. Each phase produces artifacts consumed by the next — no shared memory between phases.

### Pipeline Flow

```
elicit (interactive) → research (autonomous) → triage (auto)
  → architect (interactive) → build (autonomous) → review (autonomous) → triage (auto)
  → [routing: elicit / research / architect / complete]
```

### Commands

| Command | Phase | Type | Description |
|---------|-------|------|-------------|
| `/init` | — | Setup | Initialize pipeline in current project |
| `/elicit` | Eliciting | Interactive | Collaborative design exploration — pitch to spec |
| `/research` | Research | Autonomous | Multi-perspective analysis of design |
| `/architect` | Architecture | Interactive | Wave-based decomposition to decision-free leaves |
| `/build` | Sprinting | Autonomous | Execute leaf tasks in dependency-ordered waves |
| `/review` | Reviewing | Autonomous | Adversarial QA audit with evidence-backed findings |
| `/triage` | Triaging | Autonomous | Categorize gaps/findings and route to correct phase |
| `/status` | — | Read-only | Show current pipeline state and progress |
| `/next` | — | Read-only | Suggest next action based on current state |

### Phase Types

- **Interactive**: You participate — system surfaces design questions, presents options, waits for input. (`/elicit`, `/architect`)
- **Autonomous**: Runs without input — dispatches agents, collects results, produces artifacts. (`/research`, `/build`, `/review`, `/triage`)
- **Auto-advance**: Autonomous phases chain automatically. Interactive phases stop and wait. `/next` tells you what to run.

## Constraints

- Do NOT modify any files — read-only
- Do NOT suggest running commands automatically — only display information
