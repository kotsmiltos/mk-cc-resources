---
name: triage
description: The sorting hat. Looks at items the pipeline produced (research gaps, review findings, verify drift) and answers one question per item — which phase needs to handle this. Categorizes, never resolves. Surfaces ambiguity to the user, never papers over it.
version: 1.0.0
schema_version: 1
---

# Triage skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read SPEC.md (required), REQ.md (when entered from research), QA-REPORT.md (when entered from review), VERIFICATION-REPORT.md (when entered from verify). Identify the input set from the prior phase.
- Verify `state.phase == triaging`.
- Triage NEVER resolves items — it only places them.
- Every input item gets exactly one disposition. Zero silent drops.
- Items the categorizer cannot place confidently are routed to the user with the reason exposed.
- Use `lib/finalize.js` to atomically write TRIAGE-REPORT.md and transition state.

## Core principle

Categorize, don't resolve. Triage is the single place that promises every item produced by the pipeline gets seen, categorized, and routed. Every other downstream phase is then free of the "did this item belong to me?" question.

## What you produce

`.pipeline/triage/TRIAGE-REPORT.md` with this frontmatter:

```yaml
---
schema_version: 1
entered_from: research | review | verify
items_count: <total>
dispositions:
  to_eliciting: <count>
  to_research: <count>
  to_architecture: <count>
  to_user: <count>
  accepted: <count>
  carried_to_next_round: <count>
routed_to: eliciting | research | architecture | requirements-ready | verifying | user
---
```

Body sections:

- **Dispositions table** — every input item with id, summary, category, rationale (one line), routed_to
- **User-bound items** — items that need user resolution, rephrased as questions
- **Carried items** — items not handled this round (re-enter next triage)
- **Routing decision** — the single phase the pipeline advances to next, picked as the earliest phase any item needs

## How you work

### Setup

1. Identify entry point (research, review, or verify) from `state.phase` history + canonical artifacts present.
2. Read SPEC.md (always) + the upstream artifact (REQ.md / QA-REPORT.md / VERIFICATION-REPORT.md).
3. Extract every item needing disposition — accept whatever shape the upstream phase produced.

### Per-item categorization

For each item:

1. **Cross-reference against SPEC.md.** Is this item already addressed by a closed decision? An open question? An accepted limitation?
2. **Categorize.**
   - **Design intent missing** → route to `eliciting` for an addendum.
   - **Design decision missing or wrong** → route to `architecture`.
   - **Implementation bug** → route to `architecture` (as a new task spec) → eventually `build`.
   - **Analysis missing** → route to `research` or `verify`.
   - **Genuinely ambiguous** → route to `user`.
   - **Real but acceptable** → mark `accepted`, no further routing.
3. **Honest rationale.** One line. When the categorization is uncertain, the rationale must say so. Triage never papers over uncertainty by picking a "best guess" silently.

### Deterministic signal precedence

When the upstream phase carries an explicit deterministic signal (e.g. review's `confirmed_unacknowledged_criticals`), that signal **drives routing** — no keyword guessing layered on top. Heuristics are tie-breakers, not primary categorizers.

### Re-read verification

After producing the dispositions table, **re-read it from a simple, piercing examination perspective.** For each disposition: does the rationale make sense given the item content and SPEC context? If anything looks fishy, fix it. Hold nothing back.

### Routing decision

The pipeline advances to **the earliest phase any item needs**. Earliest means: `eliciting < research < architecture < verifying`.

- If any item needs `eliciting`: route there.
- Otherwise if any item needs `research`: route there.
- Otherwise if any item needs `architecture`: route there.
- Otherwise if items are post-build verify items only: route to `verifying`.
- If all items resolved (accepted only, no upstream routes): route to `requirements-ready`.

If all items are user-bound, surface the user-bound list and stay in `triaging` (self-transition not needed; user resolves via direct interaction or `/triage` re-invocation).

### Finalize

Call `finalize` with:
- writes: `[{ path: ".pipeline/triage/TRIAGE-REPORT.md", content }]`
- nextState: `{ phase: <routed_to> }`

## Constraints

- Per **Front-Loaded-Design**: triage's job is to ensure unresolved items don't leak past the architect. Items that look like architecture-decisions in disguise must be routed back, not forward.
- Per **Diligent-Conduct**: zero silent drops. Every input item appears in the dispositions table.
- Per **Graceful-Degradation**: when an upstream artifact is partial or corrupt, triage operates on what's present and surfaces the gap as its own item — never refuses to triage what's there.
- Per **Fail-Soft**: missing input fields do not refuse the skill. Triage fills what it can categorize, routes the rest to the user, and emits a stderr warning naming the missing field. Refusing on shape variance is a fail-closed regression.
- Per **INST-13**: no cap on item count. Every input item is processed. Deferral to the next round is a deliberate `carried_to_next_round` disposition (logged), never a silent budget enforcement.
- Triage NEVER resolves the items it triages. Resolution belongs to the routed phase.

## Scripts

- `lib/finalize.js` — atomic write+transition.
- `lib/state.js` — read current phase + last upstream artifact path.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| triaging | eliciting | item routed for design intent | no |
| triaging | research | item routed for further analysis | no |
| triaging | architecture | item routed for decomposition | no |
| triaging | requirements-ready | all items accepted | yes |
| triaging | verifying | post-build items routed to spec compliance audit | no |
