---
name: elicit
description: Turn project pitch into build-ready SPEC.md through interactive questions. Loops on open design questions until every section closes. Output is testable and unambiguous — no "TBD" or "agent decides X". First step of the pipeline. Run before /research.
version: 1.0.0
schema_version: 1
---

# Elicit skill

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source — the 4-bullet block lives there; this skill cites it by reference).

## Conduct

Canonical conduct lives at `references/principles.md` `## Conduct` — read it there; it is not duplicated here. The three lines that govern every step of this skill: no shortcuts or deferrals of scope; sub-agents get agency, clear goals, and parallel dispatch; thorough on substance, lean on ceremony.

## Operating contract

- Read inputs from canonical paths.
- Verify `state.phase` is one of: `idle, eliciting`. If `eliciting`, this is a resume — load existing SPEC.md and reconcile, do not overwrite.
- On degraded state, surface warning, do not refuse — but write to a draft path until the user confirms recovery via `/heal`.
- On missing pitch input (idle entry without args and no SPEC.md), ask the user for the pitch via `AskUserQuestion`, do not invent a project.
- Call `essense-flow-tools init elicit` first thing. Parse the JSON; use `canonical_paths.spec_md` for the SPEC.md write, `transitions` to choose the legal target phase, `ordered_steps` to drive the step cursor.
- Write SPEC.md to the canonical path with ordinary `Write`; advance phase via `essense-flow-tools state-set-phase` (not `lib/finalize.js`); record the elicitation start / completion timestamps via `essense-flow-tools state-set-elicitation-started` / `state-set-elicitation-completed`; advance the round counter (on an `eliciting → eliciting` resume loop) via `essense-flow-tools state-set-elicitation-round`. Step-cursor advances via `essense-flow-tools step-advance --skill elicit`.

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

Runs main-context (no sub-agents) against `essense-flow-tools.cjs`. All state writes via CLI ops; SPEC.md writes via ordinary `Write`. Follow the `ordered_steps` from `init elicit` JSON in order; `step-advance --skill elicit --next-step <step>` at each boundary — the cursor file `.pipeline/cursor.yaml` enforces monotonic order (out-of-order rejects with exit 13). The CLI is the source of truth: structural gates (predicate evaluator, ISO 8601 round-trip, phase enum) are enforced at the CLI op layer, not by master's gut-check.

### 0. Initialize

```bash
essense-flow-tools init elicit
```

Parse the JSON. Note `canonical_paths.spec_md` (`.pipeline/elicitation/SPEC.md`), `transitions` (4 legal targets), `ordered_steps` (the 7 anchors below), `sub_agents` (empty — main-context only). `sprint_number` is `null` — elicit is pre-sprint.

### Entry from `idle`

1. Read pitch from caller. If missing, ask user via `AskUserQuestion` — do not invent a project.
2. Transition + stamp start:
   ```bash
   essense-flow-tools state-set-phase --value eliciting
   essense-flow-tools state-set-elicitation-started --value <iso8601-ms>
   ```
   ISO 8601 must be millisecond-precision (`2026-05-08T12:00:00.000Z`); second-precision rejects with exit 3.
3. Write stub SPEC.md with `status: draft` to the canonical path via ordinary `Write`.
4. Enter the elicitation loop.

### Entry from `eliciting` (resume)

1. Read existing SPEC.md at the canonical path. If corrupt: warn to stderr, prompt user via `AskUserQuestion` before overwriting. Never silently regenerate.
2. Identify open threads (empty sections, open questions, unset complexity assessment).
3. On multi-round resumption, advance the round counter:
   ```bash
   essense-flow-tools state-set-elicitation-round --value <int>
   ```
   Setter parses non-negative int and writes literal value. Master increments from the prior value.
4. Enter the elicitation loop on the next open thread.

### Elicitation loop

For each open thread (problem framing → goals → non-goals → constraints → design choices → risks):

1. **Pick the next open thread.** Order matters — don't ask about non-goals before goals are stated.
2. **Decide whether the thread can close from existing inputs.** If yes, close it with rationale and move on.
3. **If multiple shapes plausible**, emit `AskUserQuestion` with arrow-key options. Never inline A/B/C text. Each option carries a one-line description of what it implies.
4. **If the user answer reveals a deeper gap**, recurse on that gap first. If the answer creates new downstream questions, queue them up — never silently drop them.
5. **After every user answer**, re-read the SPEC and check whether any prior section now needs updating.

Loop ends when:
- User says "build-ready" / equivalent, OR
- Every section has at least one entry AND `unknown_count == 0` AND no thread is open.

### Build-ready close

1. Re-read SPEC end-to-end. If a new question surfaces, the work is **not done** — recurse on that question.
2. If clean, set `status: build-ready` in frontmatter.
3. Assess complexity:
   - `flat` — single-file change, few requirements, no architectural decisions
   - `shallow` — multi-file but single-component, all decisions closable upfront
   - `deep` — multi-component, abstractions to introduce, decomposition will need iteration
4. Finalize sequence:
   ```bash
   # (1) Write SPEC.md to canonical_paths.spec_md via ordinary Write.
   #     Frontmatter MUST include: schema_version, status: build-ready,
   #     complexity.{assessment, touch_surface, unknown_count}, project_name.

   # (2) Stamp the elicitation-completed timestamp:
   essense-flow-tools state-set-elicitation-completed --value <iso8601-ms>

   # (3) Advance phase. Default route to research:
   essense-flow-tools state-set-phase --value research
   # OR alternative route (user explicitly routed around research, trivial flat work):
   essense-flow-tools state-set-phase --value architecture

   # (4) Cursor cleanup:
   essense-flow-tools step-advance --skill elicit --next-step skill-complete
   ```
   CLI predicate gate: `state-set-phase --value research|architecture` checks SPEC.md frontmatter `status == "build-ready"`. Missing or wrong status → exit 7 with `predicate-false: status="<observed>", predicate requires status == "build-ready"`. Loud, not advisory.

### Degraded states

- **User aborts mid-loop.** Write partial SPEC.md with `status: draft`. Do NOT transition phase. Return `{ok: false, reason: "user aborted; SPEC remains draft"}`.
- **Existing SPEC.md corrupt.** Warn to stderr, prompt user via `AskUserQuestion` to overwrite or repair. Never silently regenerate.
- **Missing pitch on `idle` entry.** Ask user via `AskUserQuestion`; do not invent a project.

### Self-check before finalize

1. Is `--value` for `state-set-phase` exactly one of `eliciting`, `research`, `architecture`? (Per init JSON `phase_to`.)
2. Does SPEC.md exist at canonical path with `status: build-ready` before calling `state-set-phase --value research|architecture`?
3. For an iteration (`eliciting → eliciting`), did you advance `elicitation.round` rather than changing `phase`?
4. Are you calling `state-set-phase`, NOT `Write` on `.pipeline/state.yaml`? Only `state-set-*` CLI ops legally mutate state.
5. Are ISO 8601 timestamps millisecond-precision (`...000Z`)? The setter does a strict `Date.toISOString()` round-trip; second-precision rejects with exit 3.

If any answer is `no`, stop and re-read.

### What you do NOT touch

- `lib/finalize.js` — DEPRECATED for elicit (CLI ops supersede). Kept in tree for unmigrated skills.
- `.pipeline/state.yaml` directly — never `Write` to it; only `state-set-*` CLI ops legally mutate state.

## Constraints

- Per **Front-Loaded-Design**: a SPEC with `unknown_count > 0` cannot be `build-ready`. Either close the question with the user, or stay in `eliciting`.
- Per **Diligent-Conduct**: do not fabricate goals, constraints, or design decisions. If the user did not say it, do not write it.
- Per **Graceful-Degradation**: a draft SPEC is a valid resting state. Refusing to persist progress because the SPEC is incomplete violates this rule.
- Per **Fail-Soft**: a corrupt prior SPEC.md does not refuse the skill. It surfaces the corruption to stderr and asks the user via `AskUserQuestion` whether to overwrite or repair. Refusing on parse failure is a fail-closed regression.
- Per **No-Resource-Caps** (`references/principles.md` "No Resource Caps"): no cap on elicitation rounds. The loop ends when threads close, not when a counter expires. A long elicitation is a real signal about scope, not a budget violation.

## Scripts

- `essense-flow-tools` (CLI router) — narrow ops: `init elicit`, `step-advance --skill elicit`, `state-set-phase`, `state-set-elicitation-started`, `state-set-elicitation-completed`, `state-set-elicitation-round`. The only legal mutators of `.pipeline/state.yaml`.
- `lib/finalize.js` — DEPRECATED for elicit (replaced by `state-set-phase` + `state-set-elicitation-*` CLI ops + ordinary `Write` on the canonical path from init JSON). Kept in tree for unmigrated skills.
- `lib/state.js` — DEPRECATED direct read for elicit (use `essense-flow-tools init elicit` JSON instead). Kept for backward compat.
- `AskUserQuestion` (built-in) — interactive arrow-key questions only.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| idle | eliciting | initial entry | no |
| eliciting | eliciting | resume / next round | no |
| eliciting | research | SPEC marked build-ready | yes |
| eliciting | architecture | SPEC marked build-ready, user routed around research | no |

## Numbered step sequence (ordered_steps anchors)

The seven blocks below are the addressable anchors consumed by
`essense-flow-tools next-step --skill elicit`. Each `## N. <step-name>`
heading mirrors a slot in the `ordered_steps` array returned by
`essense-flow-tools init elicit` (verbatim). Bodies above remain the
source-of-truth for the step's substance; these blocks point back into
them so the parser (lib/cursor-schema.cjs `parseSkillStepsFromMarkdown`)
can slice the emission window cleanly — steps emit one at a time so
consumed steps drop out of context, and the cursor advances only on an
explicit step-advance, never on emission. The heading shape is the
parser's contract: SKILL.md files conform to it; the parser never
loosens to chase free-form prose.

## 1. read-pitch-or-resume

Step 1 of 7 for the elicit skill (ordered_steps anchor).

Read the project pitch from the caller (or ask via `AskUserQuestion` if
missing), OR if `state.phase == eliciting`, load the existing SPEC.md and
identify open threads to resume from.

See the existing skill body section "How you work" → "Entry from `idle`"
+ "Entry from `eliciting` (resume)" for the full substance. This heading
is the addressable anchor for `essense-flow-tools next-step --skill
elicit` which emits the body bounded between this H2 and the next
numbered step heading.

## 2. transition-or-resume

Step 2 of 7 for the elicit skill (ordered_steps anchor).

On fresh entry, transition `idle → eliciting` via `state-set-phase
--value eliciting`; stamp `state-set-elicitation-started`. On resume, no
phase write — phase already `eliciting`.

See the existing skill body section "Skill operating mechanism" step 4
("Transition `idle → eliciting`...") for the full substance. This
heading is the addressable anchor for `next-step --skill elicit` body
emission bounded by the next numbered heading.

## 3. elicitation-loop

Step 3 of 7 for the elicit skill (ordered_steps anchor).

Iterate the open-thread loop (problem → goals → non-goals → constraints
→ design → risks): pick the next thread, close from existing inputs
where possible, otherwise emit `AskUserQuestion` with arrow-key options
(never inline A/B/C); recurse on deeper gaps; re-read SPEC after every
user answer.

See the existing skill body section "How you work" → "Elicitation loop"
for the full substance. This heading is the addressable anchor for
`next-step --skill elicit` body emission bounded by the next numbered
heading.

## 4. build-ready-reread

Step 4 of 7 for the elicit skill (ordered_steps anchor).

Re-read the SPEC end-to-end. If a new question surfaces on re-read, the
work is NOT done — recurse on that question.

See the existing skill body section "How you work" → "Build-ready close"
steps 1-2 for the full substance. This heading is the addressable
anchor for `next-step --skill elicit` body emission bounded by the next
numbered heading.

## 5. set-build-ready-status

Step 5 of 7 for the elicit skill (ordered_steps anchor).

Once the re-read is clean, set `status: build-ready` in the SPEC.md
frontmatter (the load-bearing field for the CLI predicate evaluator at
`state-set-phase --value research|architecture`).

See the existing skill body section "How you work" → "Build-ready close"
step 3 for the full substance. This heading is the addressable anchor
for `next-step --skill elicit` body emission bounded by the next
numbered heading.

## 6. assess-complexity

Step 6 of 7 for the elicit skill (ordered_steps anchor).

Decide complexity (`flat | shallow | deep`) and stamp `complexity`,
`touch_surface`, `unknown_count` into the SPEC.md frontmatter.

See the existing skill body section "How you work" → "Build-ready close"
step 4 for the full substance. This heading is the addressable anchor
for `next-step --skill elicit` body emission bounded by the next
numbered heading.

## 7. finalize

Step 7 of 7 for the elicit skill (ordered_steps anchor).

Write SPEC.md to the canonical path via ordinary `Write`. Stamp
`state-set-elicitation-completed`. Advance phase via `state-set-phase
--value research` (default) or `--value architecture` (route-around-
research alternative). Cursor cleanup via `step-advance --skill elicit
--next-step skill-complete`.

See the existing skill body section "Before you finalize" + "Skill
operating mechanism" steps 7-11 for the full substance. This heading is
the addressable anchor for `next-step --skill elicit` body emission;
since this is the last step (N == K == 7), the emission window runs
from this heading to end-of-file.
