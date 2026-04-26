---
name: triage
description: Gap/finding categorization and routing — cross-references against SPEC.md, categorizes items, routes to correct phase.
version: 0.2.0
schema_version: 1
---

# Triage Skill

## Operating Contract

Before producing any output: think it through.
Before handing off TRIAGE-REPORT.md: verify it against `templates/triage-report.md` PASS criteria.
Before routing: confirm the finding count from `blocks_advance_count` in QA-REPORT frontmatter — not from reading severity labels in prose.
Before declaring "ambiguous routing": apply the deterministic rule from the template; surface to user only when the rule genuinely cannot resolve.

This is not a checklist. It is how this skill operates.

## Core Principle

Categorize, don't resolve. Read research gaps or review findings, cross-reference against design spec, route pipeline to phase that can address them. Never fixes — sorts and directs.

## What You Produce

- `.pipeline/triage/TRIAGE-REPORT.md` — categorized findings with routing decision and rationale
- `.pipeline/triage/queued-findings.yaml` — findings deferred to later phases, re-evaluated each pass

## How You Work

### Pre-Categorization: Findings Revalidation

Before categorizing, re-validate each incoming finding:

- **Bug finding** (from review) — confirm cited file/line exists and cited verbatim quote still matches. If file moved/deleted or quoted code no longer appears, mark `stale: file-not-found` or `stale: quote-mismatch` and drop from categorization.
- **Gap finding** (from research) — confirm cited gap isn't already covered by current SPEC.md or ARCH.md. If it is, mark `stale: covered-elsewhere` and drop it.

Log every dropped finding with stale reason and trust source (review agent id or research perspective id). Repeat drops from same source are trust breach — surface to user.

This step exists because triage previously trusted input unconditionally, letting fabricated or obsolete findings propagate through routing. Grounded review reduces incoming fabrication rate but does not eliminate staleness from prior sessions or spec drift.

### Categorization Algorithm

1. Cross-reference each surviving gap/finding against SPEC.md traceability
2. **No spec coverage** → design gap → route to `/elicit`
3. **Spec exists, no architecture/task coverage** → design decision → route to `/architect`
4. **Task spec exists, implementation diverges** → implementation bug → route to `/architect` (architect creates fix sprint)
5. **Domain concern not in REQ.md** → missing analysis → route to `/research`
6. **Ambiguous** → surface to user with candidate categories and evidence
7. **Acceptable limitation** → route to **verifying** with documented known issues

### Multi-Category Routing

When findings span multiple categories, route to **earliest required phase** (elicit < research < architect < complete). Address all findings for that phase. Queue remaining findings for later phases — carry forward and re-evaluated on next triage pass.

### Input Detection

Triage determines input based on most recently produced artifact:
- After research: read `.pipeline/requirements/REQ.md`
- After review: read latest `.pipeline/reviews/sprint-N/QA-REPORT.md`

## Increment 1 Behavior

For initial pipeline (before full categorization implemented), triage defaults to routing all gaps as implementation tasks: `triaging -> requirements-ready`. Functional pass-through while full algorithm built in Increment 2.

## Constraints

- NEVER resolve or fix gaps — only categorize and route
- NEVER drop findings — everything is either routed or queued
- NEVER modify artifacts from other phases
- When categorization is ambiguous, ALWAYS surface to user with evidence

## Scripts

- `skills/triage/scripts/triage-runner.js`
  - `revalidateFindings(items, pipelineDir)` — pre-categorization staleness check; returns `{ surviving, dropped }`
  - `categorizeItems(survivingItems, specContent)` — apply categorization algorithm to revalidated items only
  - `routeFinal(qaReportPath, categorized)` — **PRIMARY ROUTING ENTRY POINT.** Reads `blocks_advance_count` from QA-REPORT frontmatter as deterministic primary signal; falls back to `determineRoute(categorized)` when count is `> 0` or QA-REPORT is absent. Returns `{ route, signal }` where `signal.source` is `blocks_advance | category | missing` — log for audit visibility.
  - `routeByBlocksAdvance(qaReportPath)` — deterministic-only signal; returns `{ source, route, reason }`. Used internally by `routeFinal`.
  - `readBlocksAdvanceCount(qaReportPath)` — read `blocks_advance_count` from QA-REPORT frontmatter; returns `null` if missing.
  - `determineRoute(categorized)` — category-based routing fallback (earliest-phase rule). Used by `routeFinal` when deterministic signal is unavailable; can be called directly when no QA-REPORT exists (e.g. research-driven triage).
  - `writeTriage(pipelineDir, report, queued, dropped)` — write output artifacts including dropped stale findings

## State Transitions

- `research -> triaging` (auto-advance after research)
- `reviewing -> triaging` (auto-advance after review)
- `triaging -> eliciting` (design gaps found)
- `triaging -> requirements-ready` (all implementation tasks)
- `triaging -> research` (missing domain analysis)
- `triaging -> architecture` (design decisions or bugs)
- `triaging -> verifying` (all acceptable — spec compliance check required before pipeline can close)

## Validator Round Integration

Validator verdicts feed triage categorization after each review cycle:

- **CONFIRMED criticals** — routed as critical findings; trigger triage investigation
- **Unacknowledged NEEDS_CONTEXT criticals** — block PASS; appear in triage as implementation gaps
- **FALSE_POSITIVEs** — discarded; do not enter triage queue; recorded in false-positives.yaml
- **acknowledged.yaml** — human-authored acknowledgments for NC criticals; acknowledged items do not block PASS or generate triage items. The runner reads but never writes this file.
- **confirmed-findings.yaml** — prior ledger passed to QA agents in re-review; enables FIND-ID matching across sprints
