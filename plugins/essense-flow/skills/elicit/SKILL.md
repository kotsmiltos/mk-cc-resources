---
name: elicit
description: Turn a project pitch into a build-ready SPEC.md through collaborative ideation. Adaptive depth — flat work gets a flat spec, deep work loops on threads until every section closes. Loops AskUserQuestion with arrow-key options, never inline A/B/C.
version: 1.0.0
schema_version: 1
---

# Elicit skill

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
- Verify `state.phase` is one of: `idle, eliciting`. If `eliciting`, this is a resume — load existing SPEC.md and reconcile, do not overwrite.
- On degraded state, surface warning, do not refuse — but write to a draft path until the user confirms recovery via `/heal`.
- On missing pitch input (idle entry without args and no SPEC.md), ask the user for the pitch via `AskUserQuestion`, do not invent a project.
- Use `lib/finalize.js` to atomically write SPEC.md and transition state. Never split.

## Core principle

A SPEC is build-ready when every section has at least one entry, every design thread is closed (no "TBD," no "agent decides X"), and re-reading the SPEC after writing it surfaces no new questions. Until then, keep looping.

## What you produce

`.pipeline/elicitation/SPEC.md` with this frontmatter:

```yaml
---
schema_version: 1
status: draft | build-ready
complexity:
  assessment: flat | shallow | deep
  touch_surface: <number of files/modules user expects to touch>
  unknown_count: <number of design questions still open>
project_name: <slug>
---
```

Body sections, in order:

- **Problem statement** — why this exists, who is hurt without it
- **Goals** — testable, each one measurable
- **Non-goals** — explicitly out of scope
- **Constraints** — technical, organizational, regulatory
- **Design decisions** — closed choices with one-line rationale each
- **Open questions** — anything still unresolved (ideal: empty by build-ready)
- **Risks** — what could break, with severity

## How you work

### Entry from `idle`

1. Read pitch from caller. If missing, ask the user via `AskUserQuestion` for the pitch.
2. Transition `idle → eliciting` via `finalize` writing a stub SPEC.md with `status: draft`.
3. Enter the elicitation loop.

### Entry from `eliciting` (resume)

1. Read existing `.pipeline/elicitation/SPEC.md`. If corrupt, ask the user before overwriting.
2. Identify open threads (any section still empty, any open question, complexity assessment unset).
3. Enter the elicitation loop on the next open thread.

### Elicitation loop

For each open thread (problem framing → goals → non-goals → constraints → design choices → risks):

1. **Pick the next open thread.** Order matters — don't ask about non-goals before goals are stated.
2. **Decide whether the thread can be closed from existing inputs.** If yes, close it with rationale and move on.
3. **If multiple shapes are plausible, emit `AskUserQuestion`** with arrow-key options. Never inline A/B/C text. Each option carries a one-line description of what it implies.
4. **If the user answer reveals a deeper gap, recurse on that gap first.** Or, if the answer creates new downstream questions, queue them up — never silently drop them.
5. **After every user answer**, re-read the SPEC and check whether any prior section now needs updating. If yes, update before continuing.

Loop ends when:

- User says "build-ready" / equivalent, OR
- Every section has at least one entry AND `unknown_count == 0` AND no thread is open.

### Build-ready close

1. Re-read the SPEC end-to-end.
2. If a new question surfaces on re-read, the work is **not done** — recurse on that question.
3. If clean, set `status: build-ready` in frontmatter.
4. Decide complexity:
   - `flat` — single-file change, few requirements, no architectural decisions to make
   - `shallow` — multi-file but single-component, all decisions closable upfront
   - `deep` — multi-component, abstractions to introduce, decomposition will need iteration
5. Call `finalize`:
   - writes: `[{ path: ".pipeline/elicitation/SPEC.md", content }]`
   - nextState: `{ phase: "research" }` (default) or `{ phase: "architecture" }` (if user explicitly routed around research, e.g. trivial flat work)

### Degraded states

- **User aborts mid-loop.** Write partial SPEC.md with `status: draft`. Do not transition state. Return `{ok: false, reason: "user aborted; SPEC remains draft"}`.
- **Existing SPEC.md corrupt.** Warn to stderr, prompt user via `AskUserQuestion` to overwrite or repair. Never silently regenerate.

## Constraints

- Per **Front-Loaded-Design**: a SPEC with `unknown_count > 0` cannot be `build-ready`. Either close the question with the user, or stay in `eliciting`.
- Per **Diligent-Conduct**: do not fabricate goals, constraints, or design decisions. If the user did not say it, do not write it.
- Per **Graceful-Degradation**: a draft SPEC is a valid resting state. Refusing to persist progress because the SPEC is incomplete violates this rule.
- Per **Fail-Soft**: a corrupt prior SPEC.md does not refuse the skill. It surfaces the corruption to stderr and asks the user via `AskUserQuestion` whether to overwrite or repair. Refusing on parse failure is a fail-closed regression.
- Per **INST-13**: no cap on elicitation rounds. The loop ends when threads close, not when a counter expires. A long elicitation is a real signal about scope, not a budget violation.

## Scripts

- `lib/finalize.js` — atomic write+transition.
- `lib/state.js` — read current phase.
- `AskUserQuestion` (built-in) — interactive arrow-key questions only.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| idle | eliciting | initial entry | no |
| eliciting | eliciting | resume / next round | no |
| eliciting | research | SPEC marked build-ready | yes |
| eliciting | architecture | SPEC marked build-ready, user routed around research | no |

## Before you finalize

Last block — read it just before you act.

**Phase targets** (verbatim from `references/transitions.yaml`):

- `idle → eliciting` — initial entry from a pitch
- `eliciting → eliciting` — resume / next round (`elicitation.round` advances)
- `eliciting → research` — SPEC marked `status: build-ready`, default route
- `eliciting → architecture` — SPEC marked `status: build-ready`, user routed around research

Not legal: `elicited`, `spec-ready`, `done`.

**The exact `finalize` call shape** for the eliciting→research transition:

```js
import { finalize } from "../../lib/finalize.js";

await finalize({
  projectRoot,
  writes: [
    { path: ".pipeline/elicitation/SPEC.md", content: specMd },
  ],
  nextState: { phase: "research", /* …the rest of state */ },
});
```

For an in-loop iteration (`eliciting → eliciting`), keep `phase: "eliciting"` and advance `elicitation.round`.

**Self-check before the call:**

1. Is `nextState.phase` exactly one of `eliciting`, `research`, `architecture`?
2. Does SPEC.md frontmatter carry `status: build-ready` for the route-out transitions? `eliciting → research` and `eliciting → architecture` both require it.
3. For an iteration, did you advance `elicitation.round` rather than changing `phase`?
4. Are you calling `finalize`, not `Write` on `.pipeline/state.yaml`?

If any answer is `no`, stop. Re-read.

`finalize` emits a stderr advisory if `requires:` paths are missing — informational, never refuses.
