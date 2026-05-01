---
name: context
description: State plumbing for the pipeline — init, status, next-step. Reads .pipeline/state.yaml, validates against transitions.yaml, surfaces degraded states clearly. Used by /init, /status, /next.
version: 1.0.0
schema_version: 1
---

# Context skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read inputs from canonical paths.
- On degraded inputs (missing/corrupt state.yaml), surface the degradation explicitly, do not refuse work.
- Never silently regenerate `.pipeline/state.yaml` — `init` only writes when no state exists; degraded recovery requires `force: true` from a deliberate caller.
- Verify by reading code, not by checking that a file exists.
- State the verifiable check that proves work done.

## Core principle

State is a contract, not a vibe. Every phase write goes through `lib/state.js` and is validated against `references/transitions.yaml`. If the state machine wouldn't accept the transition, the write doesn't happen — and the user sees why.

## What you produce

Three modes, no artifacts of its own beyond `.pipeline/state.yaml`:

- **init** — write `.pipeline/state.yaml` from `defaults/state.yaml`. Refuses if state already exists (caller should run `/heal` instead).
- **status** — read state, render a short human-readable summary: phase, sprint, wave, last_updated, any degradation warning, list of canonical artifact paths the next phase will read.
- **next** — read state, look up `references/phase-command-map.yaml`, return the recommended next slash command + one-line description + inputs it will read. Suggestion only.

## How you work

### init

1. Check `.pipeline/state.yaml` does not exist. If it does, return `{ok: false, reason: "state already exists; run /heal to reconcile prior work"}`.
2. Call `lib/state.js initState(projectRoot)`. State is written from `defaults/state.yaml`.
3. Surface to the user: state path, initial phase (idle), and the recommended next move (`/elicit "<your project pitch>"`).

### status

1. Call `lib/state.js readState(projectRoot)`.
2. If `degraded`: emit a warning block naming the degradation and the file. Continue — do not refuse.
3. Render:
   - phase + (sprint, wave) if applicable
   - last_updated
   - degradation warning if any
   - canonical artifact paths for the current phase (look up in the per-phase map below)
   - list of upstream artifacts that should already exist
   - recommended next command (delegate to next).

### next

1. Read state.
2. Look up `phases.<phase>` in `references/phase-command-map.yaml`.
3. Emit the cue: command name, description, input paths it expects to read.
4. Never auto-execute the next command. The user is the gatekeeper.

## Constraints

- Per **Graceful-Degradation**: degraded state never silently auto-repairs. The user always sees the warning and decides whether to `/heal`.
- Per **Fail-Soft**: status and next never block, never refuse. They emit, then continue.
- Per **Diligent-Conduct**: do not invent a phase name that isn't in `transitions.yaml.phases`. If state.phase is unknown, render the degradation warning verbatim.
- Per **Front-Loaded-Design**: context does not own design closure (that's the upstream skills' responsibility). What context owns is making the *current* state visible so closure can happen elsewhere — surfacing a stuck phase via `/status` is the form Front-Loaded-Design takes here.
- Per **INST-13**: no cap on `/status` invocations or `/next` polling. Both are read-only and idempotent — no budget governs their use.

## Scripts

`lib/state.js` for read/write. No sub-agents are dispatched.

## State transitions

This skill writes state for `init` only (no transition — initial write). `status` and `next` are read-only.

| from | to | trigger | auto |
|------|----|---------|------|
| (no state) | idle | init | n/a |

## Per-phase canonical artifact map

| phase | artifacts the next phase will read |
|-------|----------------------------------|
| idle | none |
| eliciting | `.pipeline/elicitation/SPEC.md` |
| research | `.pipeline/elicitation/SPEC.md`, `.pipeline/requirements/REQ.md` |
| triaging | `.pipeline/elicitation/SPEC.md`, `.pipeline/requirements/REQ.md`, `.pipeline/triage/TRIAGE-REPORT.md` |
| requirements-ready | `.pipeline/requirements/REQ.md` |
| architecture | `.pipeline/architecture/ARCH.md`, `.pipeline/architecture/sprints/<n>/manifest.yaml` |
| decomposing | `.pipeline/architecture/ARCH.md` (in flux) |
| sprinting | `.pipeline/architecture/sprints/<n>/manifest.yaml`, per-task specs |
| sprint-complete | `.pipeline/build/sprints/<n>/SPRINT-REPORT.md`, completion records |
| reviewing | `.pipeline/review/sprints/<n>/QA-REPORT.md` |
| verifying | `.pipeline/verify/VERIFICATION-REPORT.md`, `.pipeline/verify/extracted-items.yaml` |
| complete | `.pipeline/state.yaml` |
