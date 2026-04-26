---
name: context
description: Pipeline state management — reads/writes .pipeline/state.yaml, formats context injection, manages pause/resume, suggests next actions.
version: 0.2.0
schema_version: 1
---

# Context Skill

Manage essense-flow pipeline state and context. Single authority for pipeline position.

## Operating Contract

Before producing any output: think it through.
Before injecting state: verify the context_map matches actual `.pipeline/` state — not a stale snapshot.
Before reporting the next action: trace it through state-machine transitions, not from memory.
Before handing off: confirm `state.yaml` reflects what actually happened, not what was intended.

This is not a checklist. It is how this skill operates.

## Core Responsibilities

1. **State management** — Read/update `.pipeline/state.yaml` via lib/state-machine. All phase transitions go through here.
2. **Context injection** — Format state + rules into concise payload injected on every user message via hook.
3. **Next-action suggestion** — Derive exact command user should run next based on pipeline position.
4. **Pause/resume** — Save continuation context when pausing, restore when resuming.
5. **Drift detection** — Compare claimed state against filesystem reality.

## State File

Single source of truth: `.pipeline/state.yaml` (D11).

Read with `lib/yaml-io.safeReadWithFallback()`. Write with `lib/yaml-io.safeWrite()`. Validate transitions with `lib/state-machine.validateTransition()`.

## Phase Flow

```
idle → [eliciting →] research → triaging → requirements-ready → architecture → [decomposing →] sprinting → sprint-complete → reviewing → triaging → architecture|complete
```

See `references/transitions.yaml` for full transition table.

## Workflows

- **status** — Read state, format summary, show next action
- **pause** — Save current context to `state.session.continue_from`, report what was saved
- **resume** — Read and clear `state.session.continue_from`, orient the session

## Scripts

- `scripts/context-manager.js` — formats `state.yaml` + rules into per-turn injection payload; derives next-action hint; backs session-orient hook.
- `scripts/drift-check.js` — compares claimed state against filesystem reality, reports divergences (used on pause/resume and doctor-style checks).
- `scripts/init.js` — initializes fresh `.pipeline/` tree (state.yaml, config.yaml, rules.yaml) for new project; invoked by `/init`.

## Constraints

- NEVER auto-approve transitions requiring "user approval" (triaging phase — ambiguous items)
- NEVER write state without going through state machine transition validator
- NEVER read another skill's internal files — use interface contracts only
- Keep injection payload under `config.token_budgets.injection_ceiling`

## Pipeline Completion

When pipeline reaches `complete` state:

1. Generate summary report using `lib/completion.generateSummaryReport(pipelineDir)`
2. Write to `.pipeline/COMPLETION-REPORT.md`
3. Offer user two options:
   - **Archive and reset**: Archive `.pipeline/` to `.pipeline-archive/YYYY-MM-DD-name/`, reset to initial state
   - **Keep as-is**: Leave `.pipeline/` intact for reference, transition `complete → idle`
4. Execute user's choice using `lib/completion.archivePipeline()` and/or `lib/completion.resetPipeline()`
