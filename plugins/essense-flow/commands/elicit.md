---
name: elicit
description: Start or continue exhaustive design exploration — takes a project pitch and develops it into a comprehensive specification through collaborative dialogue.
arguments:
  - name: seed
    description: The project pitch or idea to explore (required for first session, optional for resume)
    required: false
---

# /elicit

Exhaustive design exploration — takes a project pitch and collaboratively develops it into a build-ready specification.

## What it does

1. Takes a project pitch (even a single sentence) as seed input
2. Decomposes it into explicit and implicit features/systems
3. Explores each feature exhaustively: mechanics, flows, edge cases, interdependencies
4. Presents options and tradeoffs when the user is unsure
5. Handles revisions with full ripple analysis
6. Tracks deferred items and revisits before wrap-up
7. Produces `.pipeline/elicitation/SPEC.md` — comprehensive design specification
8. Transitions state: `idle` -> `eliciting` -> `idle` (with SPEC.md)

## Instructions

1. Read `.pipeline/state.yaml` and determine session mode:
   - `idle` + seed argument -> new session or resume (check for existing state)
   - `idle` + no argument -> resume existing session or error
   - `eliciting` -> continue active session
   - Other phase -> report current phase and stop

2. Follow `skills/elicit/workflows/session.md` for the full session flow

3. Use `skills/elicit/scripts/elicit-runner.js` for persistence:
   - `initSession(pipelineDir, seed, config)` — create session state
   - `loadSession(pipelineDir)` — read session metadata
   - `loadExchanges(pipelineDir)` — read full conversation log
   - `saveState(pipelineDir, state)` — persist state after each exchange
   - `appendExchange(pipelineDir, exchange)` — log exchange
   - `writeSpec(pipelineDir, content)` — write final SPEC.md

4. Follow `skills/elicit/SKILL.md` for behavioral identity and constraints

5. On wrap-up: produce SPEC.md, transition to idle, report next action: `/research`

## Flags

- `--wrap-up` — Force early wrap-up, produce SPEC.md from current state
- `--abandon` — Cancel session, return to idle without producing SPEC.md
- `--restart` — Clear existing session, start fresh (requires seed argument)

**Flag precedence:** Only one flag per invocation. If multiple are given, use the first. `--restart` requires a seed argument — reject if missing.

## Constraints

- Do NOT run if pipeline is past `idle`/`eliciting` — report current phase and stop
- Do NOT silently resolve contradictions — surface them for the user
- Do NOT leave implicit requirements unexplored — surface them early
- Do NOT use therapy-speak or filler — be direct and substantive
- Do NOT impose artificial limits on conversation length — go as long as needed
- Do NOT skip deferred items at wrap-up — revisit each one
