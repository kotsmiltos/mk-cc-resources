---
name: triage
description: Gap/finding categorization and routing — cross-references against SPEC.md, categorizes items, routes to the correct phase.
version: 0.2.0
schema_version: 1
---

# Triage Skill

## Core Principle

Categorize, don't resolve. Triage reads research gaps or review findings, cross-references them against the design specification, and routes the pipeline to whichever phase can address them. Triage never fixes anything — it sorts and directs.

## What You Produce

- `.pipeline/triage/TRIAGE-REPORT.md` — categorized findings with routing decision and rationale
- `.pipeline/triage/queued-findings.yaml` — findings deferred to later phases, re-evaluated each pass

## How You Work

### Pre-Categorization: Findings Revalidation

Before categorizing, re-validate each incoming finding against current state:

- **Bug finding** (from review) — confirm the cited file/line exists and the cited verbatim quote still matches. If the file was moved/deleted or the quoted code no longer appears, mark the finding `stale: file-not-found` or `stale: quote-mismatch` and drop it from categorization.
- **Gap finding** (from research) — confirm the cited gap isn't already covered by current SPEC.md or ARCH.md. If it is, mark `stale: covered-elsewhere` and drop it.

Log every dropped finding with its stale reason and the trust source (review agent id or research perspective id). Repeat drops from the same source are a trust breach — surface to the user.

This step exists because triage previously trusted its input unconditionally, letting fabricated or obsolete findings propagate through routing. Grounded review (see review skill) reduces the incoming fabrication rate but does not eliminate staleness from prior sessions or spec drift.

### Categorization Algorithm

1. Cross-reference each surviving gap/finding against SPEC.md traceability
2. **No spec coverage** → design gap → route to `/elicit`
3. **Spec exists, no architecture/task coverage** → design decision → route to `/architect`
4. **Task spec exists, implementation diverges** → implementation bug → route to `/architect` (architect creates fix sprint)
5. **Domain concern not in REQ.md** → missing analysis → route to `/research`
6. **Ambiguous** → surface to user with candidate categories and evidence
7. **Acceptable limitation** → route to complete with documented known issues

### Multi-Category Routing

When findings span multiple categories, route to the **earliest required phase** (elicit < research < architect < complete). Address all findings for that phase. Queue remaining findings for later phases — they carry forward and are re-evaluated on the next triage pass.

### Input Detection

Triage determines its input based on which artifact was most recently produced:
- After research: read `.pipeline/requirements/REQ.md`
- After review: read latest `.pipeline/reviews/sprint-N/QA-REPORT.md`

## Increment 1 Behavior

For the initial pipeline (before full categorization is implemented), triage defaults to routing all gaps as implementation tasks: `triaging -> requirements-ready`. This provides a functional pass-through while the full algorithm is built in Increment 2.

## Constraints

- NEVER resolve or fix gaps — only categorize and route
- NEVER drop findings — everything is either routed or queued
- NEVER modify artifacts from other phases
- When categorization is ambiguous, ALWAYS surface to the user with evidence

## Scripts

- `skills/triage/scripts/triage-runner.js`
  - `revalidateFindings(items, pipelineDir)` — pre-categorization staleness check; returns `{ surviving, dropped }`
  - `categorizeItems(survivingItems, specContent)` — apply categorization algorithm to revalidated items only
  - `determineRoute(categorized)` — select target phase from earliest-phase rule
  - `writeTriage(pipelineDir, report, queued, dropped)` — write output artifacts including dropped stale findings

## State Transitions

- `research -> triaging` (auto-advance after research)
- `reviewing -> triaging` (auto-advance after review)
- `triaging -> eliciting` (design gaps found)
- `triaging -> requirements-ready` (all implementation tasks)
- `triaging -> research` (missing domain analysis)
- `triaging -> architecture` (design decisions or bugs)
- `triaging -> complete` (all acceptable)
