---
name: triage
description: Manually re-run gap/finding categorization and routing. Also runs automatically after research and review.
---

# /triage

Categorize gaps or findings and route pipeline to correct phase. Runs automatically after `/research` and `/review`. This command is for manual re-runs — useful after new context or re-entering stale pipeline state.

## What it does

1. Reads latest research gaps (REQ.md) or review findings (QA-REPORT.md)
2. Cross-references each gap/finding against SPEC.md traceability
3. Categorizes each item:
   - **No spec coverage** → design gap → route to `/elicit`
   - **Spec exists, no architecture** → design decision → route to `/architect`
   - **Task spec exists, implementation diverges** → implementation bug → route to `/architect`
   - **Domain concern not in REQ.md** → missing analysis → route to `/research`
   - **Ambiguous** → surface to user with candidate categories
   - **Acceptable limitation** → route to complete
4. Routes to earliest required phase when multiple categories present
5. Queues findings for later phases (not dropped)

## Instructions

1. Read `.pipeline/state.yaml` — verify phase is `triaging` (or phase where manual triage makes sense)
2. Determine input source:
   - Coming from research: read `.pipeline/requirements/REQ.md`
   - Coming from review: read latest `.pipeline/reviews/sprint-N/QA-REPORT.md`
3. Read `.pipeline/elicitation/SPEC.md` if exists (for cross-referencing)
4. Apply categorization algorithm from triage skill
5. Write results to `.pipeline/triage/TRIAGE-REPORT.md` and `.pipeline/triage/queued-findings.yaml`
6. Transition to target phase based on routing decision
7. Report: categorization summary, routing decision, queued items count

## Constraints

- Do NOT resolve gaps — only categorize and route
- Do NOT modify any artifacts other than triage output files and state.yaml
- When multiple categories exist, route to EARLIEST phase (elicit < research < architect < complete)
