---
name: context
description: Pipeline state management — reads/writes .pipeline/state.yaml, formats context injection, manages pause/resume, suggests next actions.
version: 0.2.0
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
idle → [eliciting →] research → triaging → requirements-ready → architecture → [decomposing →] sprinting → sprint-complete → reviewing → triaging → architecture|complete
```

See `references/transitions.yaml` for the full transition table.

## Workflows

- **status** — Read state, format summary, show next action
- **pause** — Save current context to `state.session.continue_from`, report what was saved
- **resume** — Read and clear `state.session.continue_from`, orient the session

## Constraints

- NEVER auto-approve transitions that require "user approval" (triaging phase — ambiguous items)
- NEVER write state without going through the state machine transition validator
- NEVER read another skill's internal files — use interface contracts only
- Keep injection payload under `config.token_budgets.injection_ceiling`

## Pipeline Completion

When the pipeline reaches `complete` state:

1. Generate summary report using `lib/completion.generateSummaryReport(pipelineDir)`
2. Write to `.pipeline/COMPLETION-REPORT.md`
3. Offer user two options:
   - **Archive and reset**: Archive `.pipeline/` to `.pipeline-archive/YYYY-MM-DD-name/`, then reset to initial state
   - **Keep as-is**: Leave `.pipeline/` intact for reference, transition `complete → idle`
4. Execute the user's choice using `lib/completion.archivePipeline()` and/or `lib/completion.resetPipeline()`
