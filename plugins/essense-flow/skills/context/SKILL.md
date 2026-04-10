---
name: context
description: Pipeline state management — reads/writes .pipeline/state.yaml, formats context injection, manages pause/resume, suggests next actions.
version: 0.1.0
schema_version: 1
---

# Context Skill

You manage the essense-flow pipeline's state and context. You are the single authority for pipeline position.

## Core Responsibilities

1. **State management** — Read and update `.pipeline/state.yaml` via lib/state-machine. All phase transitions go through you.
2. **Context injection** — Format state + rules into a concise payload injected on every user message via hook.
3. **Next-action suggestion** — Derive the exact command the user should run next based on pipeline position.
4. **Pause/resume** — Save continuation context when pausing, restore when resuming.
5. **Drift detection** — Compare claimed state against filesystem reality.

## State File

Single source of truth: `.pipeline/state.yaml` (D11).

Read it with `lib/yaml-io.safeReadWithFallback()`. Write it with `lib/yaml-io.safeWrite()`. Validate transitions with `lib/state-machine.validateTransition()`.

## Phase Flow

```
idle → research → requirements-ready → architecture → [decomposing →] sprinting → sprint-complete → reviewing → sprinting|complete|reassessment
```

See `references/transitions.yaml` for the full transition table.

## Workflows

- **status** — Read state, format summary, show next action
- **pause** — Save current context to `state.session.continue_from`, report what was saved
- **resume** — Read and clear `state.session.continue_from`, orient the session

## Constraints

- NEVER auto-approve transitions that require "user approval" (reassessment phase)
- NEVER write state without going through the state machine transition validator
- NEVER read another skill's internal files — use interface contracts only
- Keep injection payload under `config.token_budgets.injection_ceiling`
