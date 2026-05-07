---
name: verify
description: Top-down spec compliance audit. Walks SPEC.md from start to finish; for every design decision, verifies the implementation matches by reading code at the cited locator. Distinct from review (which is adversarial bug-hunt on sprint output) — verify is the final gate before complete.
version: 1.0.0
schema_version: 1
---

# Verify skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read SPEC.md (required) + ARCH.md + decisions.yaml (required) + the codebase under audit.
- Verify `state.phase == verifying`.
- Verify by reading code, not by checking that a file exists. **Existence is a precondition for reading, not a substitute.**
- Call `essense-flow-tools init verify` first thing. Parse the JSON; use `canonical_paths` for every artifact write, `transitions` to choose the legal target phase, `sub_agents` for the registered agent names.
- Dispatch `essense-flow-extractor` (Job 1, single, all-required) and `essense-flow-item-verifier` (Job 2, per-item parallel, all-required) via the **registered agent dispatch** path (not `lib/dispatch.js`). Briefs assembled from registered agent contract + per-item input data.
- Write artifacts to canonical paths with ordinary `Write`; advance phase via `essense-flow-tools state-set-phase` (not `lib/finalize.js`); record verify-completed timestamp via `essense-flow-tools state-set-verify-completed`. Step-cursor advances via `essense-flow-tools step-advance --skill verify`.

## Skill operating mechanism (S9.3 redesign — 2026-05-07)

This skill runs against the narrow CLI surface (`bin/essense-flow-tools.cjs`) and registered subagents (`agents/essense-flow-extractor.md`, `agents/essense-flow-item-verifier.md`). The redesigned mechanism replaces the old `lib/dispatch.js` + `lib/finalize.js` advisory surface that allowed master to drift the schema, paths, extensions, and dispatch.

**What you call (in order):**

1. `essense-flow-tools init verify` — JSON describing the verify skill: `canonical_paths.verification_report_md` (`.pipeline/verify/VERIFICATION-REPORT.md`), `canonical_paths.extracted_items_yaml` (`.pipeline/verify/extracted-items.yaml`), `transitions` (4 — `verifying-to-complete`, `-eliciting`, `-architecture`, `-triaging`), `phase_from`/`phase_to`, `ordered_steps` (6 — `extract-spec-decisions, per-item-verification-dispatch, aggregate-verdicts, compute-confirmed-gaps, set-completion-status, finalize`), `sub_agents` (2 registered roles), `principles_cited` (5), `required_inputs` (3 — SPEC, ARCH, decisions). `sprint_number` is `null` — verify is whole-codebase audit, not sprint-scoped.
2. `essense-flow-tools step-advance --skill verify --next-step <step>` — six steps in order. The cursor file `.pipeline/cursor.yaml` enforces monotonic-by-construction order; calling out-of-order rejects with exit 13.
3. **Job 1 — Dispatch `essense-flow-extractor`** (Agent tool with `subagent_type: essense-flow-extractor`). Single agent. Brief assembled from `extraction-brief.md` template substituting `{{spec_path}}` (`.pipeline/elicitation/SPEC.md`), `{{arch_path}}` (`.pipeline/architecture/ARCH.md`), and `{{sentinel}}`. Returns flat list of items (yaml). Master writes the list to `extracted_items_yaml` (canonical path from init JSON) using ordinary `Write`.
4. **Job 2 — Dispatch `essense-flow-item-verifier`** (Agent tool with `subagent_type: essense-flow-item-verifier`), one per extracted item, **in parallel** (single message, multiple Agent tool calls). **Brief is the extracted item itself** (per `redesign/agent-spec.md` §3.3 + init-spec §7 Addendum 2026-05-06): master concatenates the item's `item_id`, `source`, `description`, `locator_hint`, `expected_behavior`, `acceptance_criteria`, plus `{{sentinel}}`, into the dispatch prompt. There is no dedicated brief template file — the file `templates/verification-report.md` is the report-output shape master rolls verdicts into, NOT a brief read by the agent. Per-item verdicts return as text (verifiers have NO `Write`/`Edit`).
5. **Aggregate** — master rolls per-item verdicts into VERIFICATION-REPORT.md. Compute `confirmed_gaps = missing + drift`. Compute frontmatter counts (`items_total, implemented, partial, missing, drift, confirmed_gaps, completion_status`). Set `completion_status`: `complete` if `confirmed_gaps == 0`; `drift_present` if `drift > 0`; `missing_present` if `missing > 0`.
6. Write VERIFICATION-REPORT.md + extracted-items.yaml to `canonical_paths.*` via ordinary `Write`.
7. `essense-flow-tools state-set-verify-completed --value <iso8601>` — stamp the verify exit timestamp.
8. `essense-flow-tools state-set-phase --value <complete|eliciting|architecture|triaging>` — advance phase. The deterministic gate fires here: for `verifying → complete`, the CLI's predicate evaluator reads VERIFICATION-REPORT.md frontmatter, parses `confirmed_gaps`, hard-evaluates `== 0` (mapped from the transitions.yaml verbatim phrase "with no confirmed gaps"). Non-zero gaps → exit 7 with `confirmed_gaps=<n>, predicate requires == 0`. The structural gate stops master from advancing to `complete` over unresolved gaps. The other three target phases (`eliciting`, `architecture`, `triaging`) carry disposition predicates (no path) — the CLI accepts as `disposition-soft-pass`; master's choice of route is recorded in VERIFICATION-REPORT.md "Recommended routing".
9. `essense-flow-tools step-advance --skill verify --next-step skill-complete` — cursor deletes; skill exits.

**What you write directly with `Write`** (not via CLI ops):

- `.pipeline/verify/VERIFICATION-REPORT.md` (canonical path from init JSON; carries the deterministic-gate frontmatter the predicate evaluator reads).
- `.pipeline/verify/extracted-items.yaml` (canonical path from init JSON; the input that drove Job 2's dispatch fan-out).

**What you do NOT touch:**

- `lib/dispatch.js` — DEPRECATED for verify (registered agent dispatch supersedes; old helpers remain in tree for unmigrated skills).
- `lib/finalize.js` — DEPRECATED for verify (CLI ops `state-set-phase` + `state-set-verify-completed` supersede; old helper remains in tree).
- `.pipeline/state.yaml` directly — never `Write` to it; the only legal mutators are `state-set-*` CLI ops.

## Core principle

Top-down audit. Every spec decision must be traceable to implementing code. A decision that lives in the spec but is missing from code is drift; drift is the gate condition.

## What you produce

- `.pipeline/verify/extracted-items.yaml` — every spec decision extracted, with locator hint, expected behavior, and acceptance criteria
- `.pipeline/verify/VERIFICATION-REPORT.md` — per-item verdict (`implemented` | `partial` | `missing` | `drift`) with evidence

VERIFICATION-REPORT.md frontmatter:

```yaml
---
schema_version: 1
items_total: <count>
implemented: <count>
partial: <count>
missing: <count>
drift: <count>
completion_status: complete | drift_present | missing_present
confirmed_gaps: <count>   # missing + drift, the gate count
---
```

## How you work

### Job 1 — Extract

Walk SPEC.md + ARCH.md + decisions.yaml top-down. Emit one item per design decision with this shape:

```yaml
item_id: <slug>
source: spec | arch | decision
description: "<what was decided>"
locator_hint: "<where in code this should live>"
expected_behavior: "<what should be true>"
acceptance_criteria:
  - "<testable check>"
```

Run as a parallel agent — extraction is mechanical and benefits from a fresh eye. Quorum: `all-required`.

### Job 2 — Verify

For every extracted item, dispatch a verification agent (parallel, `all-required`):

1. Read the code at the locator hint. Trace from the public seam down to the private logic.
2. Run the acceptance criteria checks where automatable.
3. Verdict:
   - **implemented** — the decision is fully in code, criteria pass.
   - **partial** — some of the decision is in code, but not all.
   - **missing** — the decision is not in code at the locator (or anywhere reachable).
   - **drift** — code exists but disagrees with the spec.
4. Each verdict carries:
   - `evidence`: file paths + code excerpts read
   - `criteria_results`: per-AC pass/fail/manual
   - `notes`: any context

### Anti-fabrication discipline

Same rules as review. Verify never fabricates a verdict to look thorough. If a verification agent cannot determine the verdict from the code, it returns `manual` with the reason — the user resolves.

### Synthesis

After all verification agents return:

1. Aggregate per-item verdicts into VERIFICATION-REPORT.md.
2. Compute `confirmed_gaps = missing + drift`. That count is the gate.
3. Set `completion_status`:
   - `complete` — confirmed_gaps == 0
   - `drift_present` — drift > 0
   - `missing_present` — missing > 0

### Finalize

Advance phase via `essense-flow-tools state-set-phase`. Routing:

- `confirmed_gaps == 0` → `verifying → complete` (auto-advance; CLI predicate evaluator hard-checks `confirmed_gaps == 0` against VERIFICATION-REPORT.md frontmatter — non-zero rejects exit 7).
- `drift > 0` → `verifying → eliciting` (spec drift requires elicit addendum) OR `verifying → triaging` (let triage decide which upstream phase fixes it).
- `missing > 0` → `verifying → architecture` (missing implementation needs decomposition) OR `verifying → triaging`.

Default: route to `triaging` so the categorizer decides which upstream phase handles each gap. Direct routes (`verifying → eliciting`, `verifying → architecture`) are escape hatches when the gap class is uniform.

## Constraints

- Per **Diligent-Conduct**: existence ≠ implementation. Every verdict reads code, not just file paths.
- Per **Fail-Soft**: extraction or verification crashes produce synthetic items/findings — never silently dropped.
- Per **Front-Loaded-Design**: drift surfaced at verify is the legitimate place for it to surface (the implementation actually built what's there, but the spec said something else). Verify is where intent and reality reconcile.
- Per **INST-13**: no cap on items. The spec defines the item count.
- Per **Graceful-Degradation**: an item whose locator hint cannot be resolved verdicts as `missing`, not as "cannot determine." Verify always produces a per-item verdict — uncertainty surfaces as `manual` for user resolution, never silently dropped.

## Why delegation is mandatory here

Without parallel extraction + verification agents, the verify substance — extracting every spec decision then checking each against code — would run in master context. By the time the gate computes, the rule (existence ≠ implementation; every verdict reads code at the locator hint) drifts under the spec text plus the codebase being audited. Drift symptom: "file exists" becomes evidence; verdicts skew toward `implemented` without actually reading the function bodies; uncertain items get verdicts instead of `manual` flags.

Delegation keeps the rule loud at synthesis. Each per-item verifier reads code in a clean context for one item only; master rolls up `confirmed_gaps` with the existence-vs-implementation distinction still vivid because the master never read code in bulk.

## Scripts

- `lib/dispatch.js` — DEPRECATED for verify (replaced by registered `essense-flow-extractor` + `essense-flow-item-verifier` agent dispatch via the Agent tool with `subagent_type`). Kept in tree for unmigrated skills until S9.7.
- `lib/brief.js` — DEPRECATED for verify (Job 1 brief assembled from `extraction-brief.md` template; Job 2 has no template — extracted-item IS the brief).
- `lib/finalize.js` — DEPRECATED for verify (replaced by `state-set-phase` + `state-set-verify-completed` CLI ops + ordinary `Write` on canonical paths from init JSON).

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| verifying | complete | confirmed_gaps == 0 | yes |
| verifying | eliciting | confirmed drift requires elicit addendum | no |
| verifying | architecture | confirmed missing implementation | no |
| verifying | triaging | items need categorization (default route on gaps) | no |

## Before you finalize

Last block — read it just before you act.

**Phase targets** (verbatim from `references/transitions.yaml`):

- `verifying → complete` — no confirmed gaps; project ships
- `verifying → eliciting` — drift requires a SPEC.md addendum
- `verifying → architecture` — missing implementation found; back to design+decompose
- `verifying → triaging` — items need categorization (default route when gaps exist)

Not legal: `verified`, `done`, `shipped`. The terminal phase is `complete`.

**The exact CLI op sequence** for the verifying→complete transition (post-S9.3 redesign):

```bash
# Step 6 of 6 — finalize
# (1) write the report+items via ordinary Write at canonical paths from `init verify`:
#       .pipeline/verify/VERIFICATION-REPORT.md  (frontmatter MUST include confirmed_gaps)
#       .pipeline/verify/extracted-items.yaml

# (2) stamp the verify-completed timestamp:
essense-flow-tools state-set-verify-completed --value 2026-05-07T12:34:56Z

# (3) advance phase; CLI predicate evaluator reads VERIFICATION-REPORT.md frontmatter
#     `confirmed_gaps`, hard-checks `== 0` (mapped from "with no confirmed gaps"):
essense-flow-tools state-set-phase --value complete

# (4) cursor cleanup:
essense-flow-tools step-advance --skill verify --next-step skill-complete
```

For `verifying → architecture` / `eliciting` / `triaging`, swap `--value` accordingly. The VERIFICATION-REPORT.md write is still required regardless of route — it's the artifact that justifies the route + (for `complete`) carries the predicate-load-bearing `confirmed_gaps: 0` frontmatter.

**Self-check before the call:**

1. Is `--value` exactly one of `complete`, `eliciting`, `architecture`, `triaging` (no past tense like `verified`, no `done`, no `shipped`)?
2. Does VERIFICATION-REPORT.md exist on disk at `.pipeline/verify/VERIFICATION-REPORT.md` with frontmatter (`schema_version: 1`, all six counts populated, `completion_status` set, `confirmed_gaps` populated) before you call `state-set-phase`? It is the trace that justifies the transition AND (for `--value complete`) the predicate-load-bearing source.
3. Did **per-item verifiers** read code at the locator? Existence ≠ implementation. Master synthesizes per-item verdicts; master does not declare an item `implemented` without a verifier reading the function body. Did you dispatch via `subagent_type: essense-flow-item-verifier` (registered agent), one per extracted item, in parallel?
4. Items with unresolved locator hints get verdict `manual`, not `cannot-determine`. No silent drops.
5. Are you calling `essense-flow-tools state-set-phase` (NOT `Write` on `.pipeline/state.yaml` and NOT `lib/finalize.js`)? `state-set-verify-completed` stamps the timestamp; it is NOT a substitute for `state-set-phase`.

If any answer is `no`, stop. Re-read.

The CLI predicate evaluator emits `predicate requires == 0` (exit 7) if `confirmed_gaps > 0` at `state-set-phase --value complete` — structural gate, not advisory.
