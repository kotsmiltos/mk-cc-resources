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
- Call `essense-flow-tools init elicit` first thing. Parse the JSON; use `canonical_paths.spec_md` for the SPEC.md write, `transitions` to choose the legal target phase, `ordered_steps` to drive the step cursor.
- Write SPEC.md to the canonical path with ordinary `Write`; advance phase via `essense-flow-tools state-set-phase` (not `lib/finalize.js`); record the elicitation start / completion timestamps via `essense-flow-tools state-set-elicitation-started` / `state-set-elicitation-completed`; advance the round counter (on an `eliciting → eliciting` resume loop) via `essense-flow-tools state-set-elicitation-round`. Step-cursor advances via `essense-flow-tools step-advance --skill elicit`.

## Skill operating mechanism (S9.6 redesign — 2026-05-08)

This skill runs against the narrow CLI surface (`bin/essense-flow-tools.cjs`). The redesigned mechanism replaces the old `lib/finalize.js` advisory surface that allowed master to drift the schema, paths, extensions, and phase values. Elicit dispatches **no** sub-agents — runs main-context only.

**What you call (in order):**

1. `essense-flow-tools init elicit` — JSON describing the elicit skill: `canonical_paths.spec_md` (`.pipeline/elicitation/SPEC.md`), `transitions` (4 — `idle-to-eliciting`, `eliciting-to-eliciting`, `eliciting-to-research`, `eliciting-to-architecture`), `phase_from`/`phase_to`, `ordered_steps` (7 — `read-pitch-or-resume, transition-or-resume, elicitation-loop, build-ready-reread, set-build-ready-status, assess-complexity, finalize`), `sub_agents` (empty — main-context only), `principles_cited` (5), `required_inputs` (empty — caller-provided pitch is text). `sprint_number` is `null` — elicit is whole-project (pre-sprint).
2. `essense-flow-tools step-advance --skill elicit --next-step <step>` — seven steps in order. The cursor file `.pipeline/cursor.yaml` enforces monotonic-by-construction order; calling out-of-order rejects with exit 13.
3. **Read pitch or resume.** If `state.phase == idle`, read pitch from caller (or ask via `AskUserQuestion` if missing). If `state.phase == eliciting`, read existing SPEC.md, identify open threads, resume the loop.
4. **Transition `idle → eliciting`** via `essense-flow-tools state-set-phase --value eliciting` on first entry. Stamp the elicitation-started timestamp via `state-set-elicitation-started --value <iso8601>` (millisecond-precision required, e.g. `2026-05-08T12:00:00.000Z`). On resume, no phase write — phase already `eliciting`.
5. **Elicitation loop.** For each open thread (problem framing → goals → non-goals → constraints → design choices → risks): pick the next open thread; decide whether the thread can close from existing inputs; if multiple shapes plausible, emit `AskUserQuestion` with arrow-key options (never inline A/B/C); recurse on deeper gaps; re-read SPEC after every user answer to catch prior-section invalidations. On a multi-round resumption, advance `elicitation.round` via `essense-flow-tools state-set-elicitation-round --value <int>` — round counter is monotonic-by-construction at the setter (parses non-neg int, writes literal value); master is responsible for incrementing.
6. **Build-ready re-read.** Re-read SPEC end-to-end. If a new question surfaces on re-read, the work is **not done** — recurse on that question. If clean, set `status: build-ready` in frontmatter; assess complexity (`flat | shallow | deep` + `touch_surface` + `unknown_count`).
7. Write SPEC.md to `canonical_paths.spec_md` via ordinary `Write`. Frontmatter MUST include `schema_version`, `status: build-ready`, `complexity.{assessment,touch_surface,unknown_count}`, `project_name`. Body covers Problem statement, Goals, Non-goals, Constraints, Design decisions, Open questions (ideal: empty by build-ready), Risks.
8. `essense-flow-tools state-set-elicitation-completed --value <iso8601>` — stamp the elicitation exit timestamp (only on the exit-to-research / exit-to-architecture path).
9. `essense-flow-tools state-set-phase --value research` — default route, auto-advance. CLI predicate evaluator checks `.pipeline/elicitation/SPEC.md exists with status: build-ready`; missing or wrong status → exit 7 with `predicate-false: status="<observed>", predicate requires status == "build-ready"`. The `evalStatusPredicate` helper hard-evaluates frontmatter; the deterministic gate elicit exists to enforce is structurally enforced at the CLI op layer rather than via master's gut-check.
10. `essense-flow-tools state-set-phase --value architecture` — alternative route for trivial flat work (user explicitly routed around research). Manual transition (`auto_advance: false`); the "AND user routed around research" clause of the predicate is satisfied by the explicit user invocation rather than by a content-property check (the CLI op enforces only the structural `status: build-ready` portion).
11. `essense-flow-tools step-advance --skill elicit --next-step skill-complete` — cursor deletes; skill exits.

**What you write directly with `Write`** (not via CLI ops):

- `.pipeline/elicitation/SPEC.md` (canonical path from init JSON; the artifact whose existence-with-`status: build-ready` justifies the `eliciting → research` (or `→ architecture`) transition).

**What you do NOT touch:**

- `lib/finalize.js` — DEPRECATED for elicit (CLI ops `state-set-phase` + `state-set-elicitation-started` + `state-set-elicitation-completed` + `state-set-elicitation-round` supersede; old helper remains in tree for unmigrated skills).
- `.pipeline/state.yaml` directly — never `Write` to it; the only legal mutators are `state-set-*` CLI ops.

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
2. Transition `idle → eliciting` via `essense-flow-tools state-set-phase --value eliciting`; stamp `state-set-elicitation-started --value <iso8601>`. Write a stub SPEC.md with `status: draft` to the canonical path via ordinary `Write`.
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
5. Write SPEC.md to `.pipeline/elicitation/SPEC.md` via ordinary `Write`. Stamp `state-set-elicitation-completed --value <iso8601>`. Then advance phase via `state-set-phase --value research` (default) or `--value architecture` (if user explicitly routed around research, e.g. trivial flat work).

### Degraded states

- **User aborts mid-loop.** Write partial SPEC.md with `status: draft`. Do not transition phase. Return `{ok: false, reason: "user aborted; SPEC remains draft"}`.
- **Existing SPEC.md corrupt.** Warn to stderr, prompt user via `AskUserQuestion` to overwrite or repair. Never silently regenerate.

## Constraints

- Per **Front-Loaded-Design**: a SPEC with `unknown_count > 0` cannot be `build-ready`. Either close the question with the user, or stay in `eliciting`.
- Per **Diligent-Conduct**: do not fabricate goals, constraints, or design decisions. If the user did not say it, do not write it.
- Per **Graceful-Degradation**: a draft SPEC is a valid resting state. Refusing to persist progress because the SPEC is incomplete violates this rule.
- Per **Fail-Soft**: a corrupt prior SPEC.md does not refuse the skill. It surfaces the corruption to stderr and asks the user via `AskUserQuestion` whether to overwrite or repair. Refusing on parse failure is a fail-closed regression.
- Per **INST-13**: no cap on elicitation rounds. The loop ends when threads close, not when a counter expires. A long elicitation is a real signal about scope, not a budget violation.

## Scripts

- `essense-flow-tools` (CLI router) — narrow ops: `init elicit`, `step-advance --skill elicit`, `state-set-phase`, `state-set-elicitation-started`, `state-set-elicitation-completed`, `state-set-elicitation-round`. The only legal mutators of `.pipeline/state.yaml`.
- `lib/finalize.js` — DEPRECATED for elicit (replaced by `state-set-phase` + `state-set-elicitation-*` CLI ops + ordinary `Write` on the canonical path from init JSON). Kept in tree for unmigrated skills until S9.7.
- `lib/state.js` — DEPRECATED direct read for elicit (use `essense-flow-tools init elicit` JSON instead). Kept for backward compat.
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

Not legal: `elicited`, `spec-ready`, `done`. The CLI rejects all three at exit 3 (`--value rejected — '<value>' not in canonical phases [...]`).

**The exact CLI op sequence** for the eliciting→research transition (post-S9.6 redesign):

```bash
# Step 7 of 7 — finalize
# (1) write SPEC.md via ordinary Write at the canonical path from `init elicit`:
#       .pipeline/elicitation/SPEC.md  (frontmatter MUST include schema_version,
#                                       status: build-ready, complexity.{...},
#                                       project_name)

# (2) stamp the elicitation-completed timestamp (millisecond-precision ISO 8601):
essense-flow-tools state-set-elicitation-completed --value 2026-05-08T13:00:00.000Z

# (3) advance phase; CLI predicate evaluator checks SPEC.md frontmatter
#     status == "build-ready"; mismatch → exit 7 with predicate-false message
#     `status="<observed>", predicate requires status == "build-ready"`:
essense-flow-tools state-set-phase --value research

# (4) cursor cleanup:
essense-flow-tools step-advance --skill elicit --next-step skill-complete
```

For the route-around-research alternative (`eliciting → architecture`), substitute step (3):

```bash
essense-flow-tools state-set-phase --value architecture
```

Same predicate gate (`status: build-ready`); the `AND user routed around research` clause of the eliciting→architecture predicate is satisfied by the explicit user invocation (transition is `auto_advance: false`, so this only fires on manual user direction).

For an in-loop iteration (`eliciting → eliciting`), do NOT advance phase. Instead:

```bash
essense-flow-tools state-set-elicitation-round --value <int>
# (cursor stays on the in-progress step; no skill-complete sentinel)
```

**Self-check before the call:**

1. Is `--value` for `state-set-phase` exactly one of `eliciting`, `research`, `architecture`? (The only legal exit targets per the init JSON `phase_to`.)
2. Does SPEC.md exist at the canonical path with `status: build-ready` in frontmatter before you call `state-set-phase --value research` (or `--value architecture`)? The CLI's predicate evaluator will reject otherwise — but the self-check catches it before the rejection.
3. For an iteration, did you advance `elicitation.round` rather than changing `phase`?
4. Are you calling `state-set-phase`, not `Write` on `.pipeline/state.yaml`? The only legal state mutators are `state-set-*` CLI ops.
5. Are ISO 8601 timestamps millisecond-precision (`2026-05-08T13:00:00.000Z`, not `2026-05-08T13:00:00Z`)? The setter does a strict round-trip check via `Date.toISOString()`; second-precision rejects with exit 3.

If any answer is `no`, stop. Re-read.

The CLI emits a one-line stderr message + exit 7 if the predicate fails (SPEC.md missing or status != build-ready); the failure is loud, not advisory.
