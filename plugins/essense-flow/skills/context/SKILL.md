---
name: context
description: State plumbing for the pipeline — init, status, next-step. Reads pipeline state, validates against transitions.yaml, surfaces degraded states clearly. Used by /init, /status, /next.
version: 1.0.0
schema_version: 1
---

# Context skill

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source per v0.13.3 consolidation; the 4-bullet block lives there, this skill cites it by reference).

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read inputs from canonical paths supplied by `essense-flow-tools init context`. Do not infer paths from prose.
- On degraded inputs (missing/corrupt state file), surface the degradation explicitly, do not refuse work.
- Never silently regenerate the pipeline state file — `init` mode only writes when no state exists; degraded recovery requires `force: true` from a deliberate caller.
- Verify by reading code, not by checking that a file exists.
- State the verifiable check that proves work done.

## Core principle

State is a contract, not a vibe. Every phase write goes through `lib/state.js` and is validated against `references/transitions.yaml`. If the state machine wouldn't accept the transition, the write doesn't happen — and the user sees why.

## Skill operating mechanism (S7 redesign — 2026-05-06)

Path lookups, ordered step list, and the per-phase artifact map are obtained from a single source: the CLI op `essense-flow-tools init context`. Master parses the JSON and uses its fields verbatim — no path inference from prose, no extension guessing, no key invention.

```
node <plugin-root>/bin/essense-flow-tools.cjs init context [--project-root <path>]
```

Cursor bookkeeping for each mode's step sequence is the sole responsibility of:

```
node <plugin-root>/bin/essense-flow-tools.cjs step-advance --skill context --mode <init|status|next> --next-step <step> [--project-root <path>]
```

`step-advance` is monotonic-by-construction: rejects out-of-order, repeated, or skip-ahead advances; rejects the wrong mode for an in-progress run. Reaching the last step of a mode and then calling with `--next-step skill-complete` deletes the cursor file (signals the run finalized cleanly).

## What you produce

Three modes; the only on-disk artifact owned by this skill is the project's pipeline state file (path supplied by `init context`'s `canonical_paths.state_yaml`):

- **init** — write the state file from `defaults/state.yaml`. Refuses if state already exists (caller should run `/heal` instead).
- **status** — read state, render a short human-readable summary: phase, sprint, wave, last_updated, any degradation warning, list of canonical artifact paths the next phase will read.
- **next** — read state, look up `references/phase-command-map.yaml`, return the recommended next slash command + one-line description + inputs it will read. Suggestion only.

## How you work

In every mode below, replace `<state-path>` and `<artifacts-for-phase>` with the values read from `init context`'s JSON (`canonical_paths.state_yaml` and `per_phase_artifact_map[<state.phase>]` respectively). Do not invent these paths.

### init

Ordered steps (per `init context` `ordered_steps_by_mode.init` — also enforced by `step-advance`):

1. `check-no-state-exists` — call `step-advance --skill context --mode init --next-step check-no-state-exists`. Then check the file at `canonical_paths.state_yaml` does not exist. If it does, return `{ok: false, reason: "state already exists; run /heal to reconcile prior work"}`.
2. `init-state-from-defaults` — call `step-advance ... --next-step init-state-from-defaults`. Then call `lib/state.js initState(projectRoot)`. State is written from `defaults/state.yaml`.
3. `surface-recommended-next` — call `step-advance ... --next-step surface-recommended-next`. Surface to the user: state path (from `canonical_paths.state_yaml`), initial phase (idle), and the recommended next move (`/elicit "<your project pitch>"`).
4. Finalize — call `step-advance ... --next-step skill-complete`. Cursor file deleted; init mode complete.

### status

Ordered steps (per `init context` `ordered_steps_by_mode.status`):

1. `read-state` — call `step-advance --skill context --mode status --next-step read-state`. Then call `lib/state.js readState(projectRoot)`. The function reads the file at `canonical_paths.state_yaml` internally; do not duplicate the path here.
2. `render-status-block` — call `step-advance ... --next-step render-status-block`. If `degraded`: emit a warning block naming the degradation and the file path returned by `readState`. Continue — do not refuse. Render:
   - phase + (sprint, wave) if applicable
   - last_updated
   - degradation warning if any
   - canonical artifact paths for the current phase, looked up in `init context`'s `per_phase_artifact_map[<state.phase>]`
   - list of upstream artifacts that should already exist (same source)
   - recommended next command (delegate to next).
3. `delegate-to-next` — call `step-advance ... --next-step delegate-to-next`. Hand off to next-mode logic for the next-command cue.
4. Finalize — call `step-advance ... --next-step skill-complete`. Cursor file deleted; status mode complete.

### next

Ordered steps (per `init context` `ordered_steps_by_mode.next`):

1. `read-state` — call `step-advance --skill context --mode next --next-step read-state`. Then call `lib/state.js readState(projectRoot)`.
2. `lookup-next-command` — call `step-advance ... --next-step lookup-next-command`. Read `references/phase-command-map.yaml` and look up `phases.<phase>`.
3. `emit-cue-no-auto-execute` — call `step-advance ... --next-step emit-cue-no-auto-execute`. Emit the cue: command name, description, input paths it expects to read. Never auto-execute the next command. The user is the gatekeeper.
4. Finalize — call `step-advance ... --next-step skill-complete`. Cursor file deleted; next mode complete.

## Constraints

- Per **Graceful-Degradation**: degraded state never silently auto-repairs. The user always sees the warning and decides whether to `/heal`.
- Per **Fail-Soft**: status and next never block, never refuse. They emit, then continue.
- Per **Diligent-Conduct**: do not invent a phase name that isn't in `transitions.yaml.phases`. If state.phase is unknown, render the degradation warning verbatim.
- Per **Front-Loaded-Design**: context does not own design closure (that's the upstream skills' responsibility). What context owns is making the *current* state visible so closure can happen elsewhere — surfacing a stuck phase via `/status` is the form Front-Loaded-Design takes here.
- Per **INST-13**: no cap on `/status` invocations or `/next` polling. Both are read-only and idempotent — no budget governs their use.

## Scripts

- `bin/essense-flow-tools.cjs` for `init context` (canonical paths + ordered steps + per-phase map) and `step-advance` (cursor bookkeeping). Sole authority for path lookups and ordered-step validation.
- `lib/state.js` for state read/write (called via `readState` / `initState`). No sub-agents are dispatched.

## State transitions

This skill writes state for `init` only (no transition — initial write). `status` and `next` are read-only.

| from | to | trigger | auto |
|------|----|---------|------|
| (no state) | idle | init | n/a |

## Per-phase canonical artifact map

The map lives in `essense-flow-tools init context`'s `per_phase_artifact_map` field (keyed by canonical phase name). Master reads it from there, not from a prose table here. Phase-name keys are the canonical values from `references/transitions.yaml.phases`. The S7 redesign removed the prose table from this file to close the path-inference seam — see `redesign/spike-notes-S7.md` for the rationale.
