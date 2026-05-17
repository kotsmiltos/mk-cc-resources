---
name: triage
description: The sorting hat. Looks at items the pipeline produced (research gaps, review findings, verify drift) and answers one question per item — which phase needs to handle this. Categorizes, never resolves. Surfaces ambiguity to the user, never papers over it.
version: 1.0.0
schema_version: 1
---

# Triage skill

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

- Read SPEC.md (required), REQ.md (when entered from research), QA-REPORT.md (when entered from review), VERIFICATION-REPORT.md (when entered from verify). Identify the input set from the prior phase.
- Verify `state.phase == triaging`.
- Triage NEVER resolves items — it only places them.
- Every input item gets exactly one disposition. Zero silent drops.
- Items the categorizer cannot place confidently are routed to the user with the reason exposed.
- Use the narrow CLI surface (`essense-flow-tools state-set-phase`, `essense-flow-tools state-set-triage-completed`) and ordinary `Write` to canonical paths from `init triage` JSON. Do **not** call `lib/finalize.js` (deprecated for this skill — see Skill operating mechanism below).

## Skill operating mechanism (S9.5 redesign — 2026-05-08)

This skill is wired against the narrow CLI surface and registered subagents introduced in the structural-containment redesign. The substance below (Core principle, How you work, Constraints, State transitions) is preserved verbatim per the 2026-05-05 preservation contract; only the state-write paths and path-lookup paths are re-routed through the new mechanisms.

**Path lookups via `init triage`.** Master MUST call `essense-flow-tools init triage` and parse the returned JSON for the canonical path of TRIAGE-REPORT.md. Do NOT infer the path from prose. The init JSON also returns the canonical `ordered_steps` list (8 steps; `step-advance --skill triage --next-step <step>` validates against it monotonically) and the `transitions` list (5 legal exits from `triaging`).

**What you write directly with `Write`:**
- `.pipeline/triage/TRIAGE-REPORT.md` — frontmatter (per `templates/triage-report.md`) carries `routed_to:` scalar that the disposition predicate evaluator reads. Frontmatter MUST include `schema_version`, `entered_from`, `items_count`, `dispositions` counts (`to_eliciting`, `to_research`, `to_architecture`, `to_user`, `accepted`, `carried_to_next_round`), `routed_to`. Body sections: Dispositions table, User-bound items, Carried items, Routing decision.

**What you write through CLI ops (NEVER `Write` on `.pipeline/state.yaml` directly):**
- `essense-flow-tools state-set-phase --value <target>` — advances `triaging → <target>` for `target ∈ {eliciting, research, requirements-ready, architecture, verifying}`. Op runs four checks at the CLI layer: (1) target is in the canonical 12-phase list (drift symptom #2 closes — invented values like `triaged`/`routed`/`done` reject with exit 3); (2) the `triaging → <target>` transition is legal per `transitions.yaml` (illegal targets reject with exit 6); (3) the disposition predicate fires (per cli-spec §5 2026-05-08 Addendum: reads TRIAGE-REPORT.md frontmatter `routed_to:` scalar; rejects with exit 7 if the scalar mismatches the locked phrase-table mapping); (4) the per-task-record gate is **not** applicable (no `--sprint` argument; triage is sprint-spanning). Exit codes per cli-spec §1.1 + §1.2.
- `essense-flow-tools state-set-triage-completed --value <ISO 8601 datetime with millisecond precision>` — stamps `triage.completed_at`. ISO 8601 must include the millisecond suffix (e.g. `2026-05-08T10:00:00.000Z`); loose ISO without millis rejects with exit 3.

**Why the disposition predicate matters.** Without a structural check at the `triaging → <target>` boundary, master could (under drift) call `state-set-phase --value architecture` after a triage run that wrote `routed_to: eliciting` to TRIAGE-REPORT.md frontmatter — collapsing the deterministic gate triage exists to enforce. The predicate evaluator reads the report, sees `routed_to: eliciting`, and rejects: `routed_to="eliciting", predicate requires routed_to == "architecture"`. The frontmatter scalar is the single source of truth for the routing decision; the body section's `Routing decision` rationale is human-readable companion text, not the gate.

**Sub-agent dispatch via registered agent (`essense-flow-sub-triager`).** Optional, judgment-driven (per `redesign/skill-substance/triage.md` "Sub-agent dispatches"). For small input sets, triage runs cleanly in main context and dispatch costs more than it saves. For large input sets, master MUST dispatch per-class sub-triagers in parallel via the `Agent` tool with `subagent_type: essense-flow-sub-triager`, one agent per item class master picks (bug, drift, gap, ambiguity, missing-analysis — picked from what the upstream batch actually contains; no hard list). Each agent receives `{{item_class}}, {{item_class_description}}, {{spec_path}}, {{items_in_class}}, {{sentinel}}` substituted into `templates/sub-triager-brief.md`. Agents return YAML with per-item disposition + rationale + spec/signal evidence. Quorum: `all-required` — every dispatched class must return; missing class becomes a synthetic record (`unclassifiable` for items in the missing class with rationale "class X did not return; deferred to next round"). Master cross-references each disposition against SPEC.md with fresh context BEFORE computing the routing decision (per Diligent-Conduct: master STILL re-checks each disposition against SPEC before routing).

**Cursor advancement via `step-advance`.** After each ordered step, master calls `essense-flow-tools step-advance --skill triage --next-step <next-step-name>`. The op writes `<project-root>/.pipeline/cursor.yaml` monotonically — out-of-order jumps reject with exit 13 (`'<step>' is not the immediate successor of '<current>'; expected '<next-canonical>'`). The `skill-complete` sentinel on the last step (`finalize`) deletes the cursor file. Drift symptoms #7 (skips ordered-step loop) and #9 (loses cursor) close structurally.

**Deprecated for triage:** `lib/finalize.js` (atomic write+transition helper) and `lib/dispatch.js` (advisory sub-agent dispatch helper). Triage's state writes go through `state-set-phase` + `state-set-triage-completed` + ordinary `Write` to canonical paths from `init triage`; sub-agent dispatch goes through the registered `essense-flow-sub-triager` agent (when judgment says dispatch). Calling the deprecated helpers from triage SKILL.md is a regression — the structural-containment guarantee depends on the narrow CLI surface being the only state-write path.

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

### Setup (`identify-entry-point` + `read-spec-and-upstream` + `extract-items`)

1. Identify entry point (research, review, or verify) from `state.phase` history + canonical artifacts present.
2. Read SPEC.md (always) + the upstream artifact (REQ.md / QA-REPORT.md / VERIFICATION-REPORT.md).
3. Extract every item needing disposition — accept whatever shape the upstream phase produced.

### Per-item categorization (`categorize-items`)

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

### Deterministic signal precedence (`apply-deterministic-signal-precedence`)

When the upstream phase carries an explicit deterministic signal (e.g. review's `confirmed_unacknowledged_criticals`, verify's `confirmed_gaps`, research's `source_count: 1 (low-confidence)`), that signal **drives routing** — no keyword guessing layered on top. Heuristics are tie-breakers, not primary categorizers.

### Re-read verification (`reread-verification`)

After producing the dispositions table, **re-read it from a simple, piercing examination perspective.** For each disposition: does the rationale make sense given the item content and SPEC context? If anything looks fishy, fix it. Hold nothing back.

### Routing decision (`compute-routing-decision`)

The pipeline advances to **the earliest phase any item needs**. Earliest means: `eliciting < research < architecture < verifying`.

- If any item needs `eliciting`: route there.
- Otherwise if any item needs `research`: route there.
- Otherwise if any item needs `architecture`: route there.
- Otherwise if items are post-build verify items only: route to `verifying`.
- If all items resolved (accepted only, no upstream routes): route to `requirements-ready`.

If all items are user-bound, surface the user-bound list and stay in `triaging` (self-transition not needed; user resolves via direct interaction or `/triage` re-invocation).

Write `routed_to: <chosen target>` into TRIAGE-REPORT.md frontmatter. This scalar is what `state-set-phase`'s disposition predicate evaluator reads to validate the next call.

### Finalize (`finalize`)

1. Write TRIAGE-REPORT.md to `.pipeline/triage/TRIAGE-REPORT.md` (canonical path from `init triage`'s `canonical_paths.triage_report_md`) using ordinary `Write`. Frontmatter MUST include `routed_to: <chosen target>` matching the routing decision; predicate evaluator reads this scalar.
2. Call `essense-flow-tools state-set-triage-completed --value <ISO 8601 with millis>` to stamp `triage.completed_at`.
3. Call `essense-flow-tools state-set-phase --value <chosen target>` (no `--sprint`; triage is sprint-spanning). The op fires the disposition predicate evaluator at the CLI layer; rejects (exit 7) if frontmatter `routed_to:` does not match the legal phrase for `triaging → <target>`.
4. Call `essense-flow-tools step-advance --skill triage --next-step skill-complete` to delete the cursor file.

The TRIAGE-REPORT.md write is required regardless of which target phase you chose — it carries the per-item disposition rationale and the `routed_to:` scalar the gate reads.

## Why delegation is mandatory (when judgment says dispatch)

Per `redesign/skill-substance/triage.md` "Sub-agent dispatches" + INST-13: no count threshold triggers this. The choice is judgment-driven, not arithmetic. If item categorization feels like pattern-matching (consistent dispositions but stopped reflecting the actual SPEC cross-reference), delegate. If it feels like reading and deciding, stay in main.

For small input sets (a handful of gaps from research, a few findings from review), triage runs cleanly in main context. Dispatching sub-agents would cost more than it saves.

For large input sets (a heavy review batch, post-research with many gaps, post-verify with many drift items), per-item categorization in main context burns through working memory. The disciplinary rule (every item gets one disposition; ambiguity surfaces to the user; deterministic signals beat heuristics) starts to drift. Symptom: dispositions become consistent in shape but stop reflecting the actual SPEC cross-reference — the categorizer is pattern-matching, not analyzing. **That's when dispatch is mandatory** — per-class sub-triagers in parallel through the `Agent` tool with `subagent_type: essense-flow-sub-triager`, one agent per item kind master picks, each receiving SPEC.md plus its slice. Master cross-references each disposition against SPEC.md with fresh context before computing the routing decision.

Use `templates/sub-triager-brief.md`. Quorum: `all-required` — every dispatched class must return, missing → synthetic record. The classes to dispatch are picked from what the upstream batch actually contains — no hard list.

Per **Diligent-Conduct**: when delegating, master STILL re-checks each disposition against SPEC before routing. Sub-triagers categorize per-class; master applies the cross-reference rule with fresh context.

## Constraints

- Per **Front-Loaded-Design**: triage's job is to ensure unresolved items don't leak past the architect. Items that look like architecture-decisions in disguise must be routed back, not forward.
- Per **Diligent-Conduct**: zero silent drops. Every input item appears in the dispositions table.
- Per **Graceful-Degradation**: when an upstream artifact is partial or corrupt, triage operates on what's present and surfaces the gap as its own item — never refuses to triage what's there.
- Per **Fail-Soft**: missing input fields do not refuse the skill. Triage fills what it can categorize, routes the rest to the user, and emits a stderr warning naming the missing field. Refusing on shape variance is a fail-closed regression.
- Per **INST-13**: no cap on item count. Every input item is processed. Deferral to the next round is a deliberate `carried_to_next_round` disposition (logged), never a silent budget enforcement.
- Triage NEVER resolves the items it triages. Resolution belongs to the routed phase.

## Outputs

`.pipeline/triage/TRIAGE-REPORT.md` (canonical path from `init triage`'s `canonical_paths.triage_report_md`) — frontmatter + body sections per "What you produce" above.

State writes (via CLI ops, not `lib/finalize.js`):
- `triage.completed_at` (ISO 8601 with millis) via `state-set-triage-completed`.
- `phase` advanced to one of `{eliciting, research, requirements-ready, architecture, verifying}` via `state-set-phase`. The op's disposition predicate evaluator reads TRIAGE-REPORT.md frontmatter `routed_to:` to validate.
- `last_updated` server-stamped on every state write.

Cursor file at `.pipeline/cursor.yaml` advances monotonically through the 8 ordered steps (`identify-entry-point → read-spec-and-upstream → extract-items → categorize-items → apply-deterministic-signal-precedence → reread-verification → compute-routing-decision → finalize`); deleted on `skill-complete` sentinel.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| triaging | eliciting | item routed for design intent | no |
| triaging | research | item routed for further analysis | no |
| triaging | architecture | item routed for decomposition | no |
| triaging | requirements-ready | all items accepted | yes |
| triaging | verifying | post-build items routed to spec compliance audit | no |

## Before you finalize

Last block — read it just before you act.

**Phase targets** (verbatim from `references/transitions.yaml`):

- `triaging → eliciting` — design intent gap; route back to elicit
- `triaging → research` — needs further analysis
- `triaging → architecture` — routed for decomposition
- `triaging → requirements-ready` — all items accepted, no upstream routes
- `triaging → verifying` — post-build items routed to spec compliance audit

Not legal: `triaged`, `routed`, `done` (these reject at CLI exit 3 with the canonical 12-phase list).

**The exact mechanism call sequence** for any `triaging → X` transition:

```
1. Write TRIAGE-REPORT.md to .pipeline/triage/TRIAGE-REPORT.md
   (frontmatter MUST include routed_to: <X> matching target X)
2. essense-flow-tools state-set-triage-completed --value <ISO 8601 with millis>
3. essense-flow-tools state-set-phase --value <X>
   (predicate evaluator reads TRIAGE-REPORT.md frontmatter routed_to;
    rejects exit 7 if routed_to mismatches the locked phrase for triaging → X)
4. essense-flow-tools step-advance --skill triage --next-step skill-complete
   (deletes cursor file at .pipeline/cursor.yaml)
```

The TRIAGE-REPORT.md write is required regardless of which target phase you chose — it carries the per-item disposition rationale AND the `routed_to:` scalar the disposition predicate evaluator reads.

**Self-check before the call:**

1. Is the `--value` arg to `state-set-phase` exactly one of the legal targets above (`eliciting`, `research`, `architecture`, `requirements-ready`, `verifying`)? Past-tense forms (`triaged`, `routed`, `done`) reject at the CLI.
2. Does TRIAGE-REPORT.md exist at the canonical path with frontmatter `routed_to:` set to the same target you're passing to `state-set-phase`? Items with no disposition mean triage is incomplete — don't transition. Mismatched `routed_to:` rejects the predicate at the CLI layer.
3. If item volume was large, did you dispatch **per-class sub-triagers** via the registered `essense-flow-sub-triager` agent (one per item kind: bug, drift, gap, ambiguity, missing-analysis)? Master cross-references against SPEC.md and routes; sub-triagers categorize per-class.
4. Are ambiguous items surfaced to the user, not silently classified?
5. Are you calling `state-set-phase` (CLI op) and `state-set-triage-completed` (CLI op), NOT `Write` on `.pipeline/state.yaml` and NOT `lib/finalize.js`?

If any answer is `no`, stop. Re-read.

The CLI op rejects on the gate path (illegal phase, illegal transition, frontmatter `routed_to:` mismatch, ISO without millis); reject messages quote the predicate failure verbatim so you can see exactly which check failed.
