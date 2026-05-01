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
- Use `lib/dispatch.js` for parallel extraction + verification agents.
- Use `lib/finalize.js` to atomically write the verification report and transition state.

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

Call `finalize` with both artifacts. Routing:

- `confirmed_gaps == 0` → `verifying → complete` (auto-advance).
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

- `lib/dispatch.js` — extraction + verification agent fan-out (mode: `all-required`).
- `lib/brief.js` — extraction brief + verification brief assembly.
- `lib/finalize.js` — atomic write+transition.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| verifying | complete | confirmed_gaps == 0 | yes |
| verifying | eliciting | confirmed drift requires elicit addendum | no |
| verifying | architecture | confirmed missing implementation | no |
| verifying | triaging | items need categorization (default route on gaps) | no |
