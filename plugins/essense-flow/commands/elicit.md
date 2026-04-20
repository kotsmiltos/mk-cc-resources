---
name: elicit
description: Design exploration — takes project pitch, develops into build-ready spec through dialogue.
arguments:
  - name: seed
    description: Project pitch or idea (required for first session, optional for resume)
    required: false
---

# /elicit

Exhaustive design exploration — pitch to build-ready spec through collaborative dialogue.

## What it does

1. Takes project pitch (even one sentence) as seed
2. Decomposes into explicit and implicit features/systems
3. Explores each feature: mechanics, flows, edge cases, interdependencies
4. Presents options and tradeoffs when user is unsure
5. Handles revisions with full ripple analysis
6. Tracks deferred items, revisits before wrap-up
7. Produces `.pipeline/elicitation/SPEC.md`
8. Transitions: `idle` -> `eliciting` -> `idle` (with SPEC.md)

## Instructions

1. Read `.pipeline/state.yaml`, determine session mode:
   - `idle` + seed → new session or resume (check for existing state)
   - `idle` + no argument → resume existing or error
   - `eliciting` → continue active session
   - Other phase → report current phase and stop

2. Follow `skills/elicit/workflows/session.md` for full session flow

3. Use `skills/elicit/scripts/elicit-runner.js` for persistence:
   - `initSession(pipelineDir, seed, config)` — create session state
   - `loadSession(pipelineDir)` — read session metadata
   - `loadExchanges(pipelineDir)` — read full conversation log
   - `saveState(pipelineDir, state)` — persist after each exchange
   - `appendExchange(pipelineDir, exchange)` — log exchange
   - `writeSpec(pipelineDir, content)` — write final SPEC.md

4. Follow `skills/elicit/SKILL.md` for behavioral identity and constraints

5. On wrap-up: produce SPEC.md, transition to idle, report next: `/research`

## Flags

- `--wrap-up` — Force early wrap-up, produce SPEC.md from current state
- `--abandon` — Cancel session, return to idle without SPEC.md
- `--restart` — Clear existing session, start fresh (requires seed)

**Flag precedence:** One flag per invocation. If multiple given, use first. `--restart` requires seed — reject if missing.

## Constraints

- Do NOT run if past `idle`/`eliciting` — report current phase and stop
- Do NOT silently resolve contradictions — surface for user
- Do NOT leave implicit requirements unexplored — surface early
- Do NOT use therapy-speak or filler — be direct and substantive
- Do NOT impose artificial limits on conversation length
- Do NOT skip deferred items at wrap-up — revisit each one
