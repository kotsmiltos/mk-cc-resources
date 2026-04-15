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

### Categorization Algorithm

1. Cross-reference each gap/finding against SPEC.md traceability
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
  - `categorizeItems(items, specContent)` — apply categorization algorithm
  - `determineRoute(categorized)` — select target phase from earliest-phase rule
  - `writeTriage(pipelineDir, report, queued)` — write output artifacts

## State Transitions

- `research -> triaging` (auto-advance after research)
- `reviewing -> triaging` (auto-advance after review)
- `triaging -> eliciting` (design gaps found)
- `triaging -> requirements-ready` (all implementation tasks)
- `triaging -> research` (missing domain analysis)
- `triaging -> architecture` (design decisions or bugs)
- `triaging -> complete` (all acceptable)
