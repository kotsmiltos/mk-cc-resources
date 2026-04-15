---
name: triage
description: Manually re-run gap/finding categorization and routing. Also runs automatically after research and review.
---

# /triage

Categorize gaps or findings and route the pipeline to the correct phase. Runs automatically after `/research` and `/review` as part of auto-advance. This command is for manual re-runs — useful after new context or when re-entering a stale pipeline state.

## What it does

1. Reads the latest research gaps (REQ.md) or review findings (QA-REPORT.md)
2. Cross-references each gap/finding against SPEC.md traceability
3. Categorizes each item:
   - **No spec coverage** → design gap → route to `/elicit`
   - **Spec exists, no architecture** → design decision → route to `/architect`
   - **Task spec exists, implementation diverges** → implementation bug → route to `/architect`
   - **Domain concern not in REQ.md** → missing analysis → route to `/research`
   - **Ambiguous** → surface to user with candidate categories
   - **Acceptable limitation** → route to complete
4. Routes to the earliest required phase when multiple categories present
5. Queues findings for later phases (not dropped)

## Instructions

1. Read `.pipeline/state.yaml` — verify phase is `triaging` (or a phase where manual triage makes sense)
2. Determine the input source:
   - If coming from research: read `.pipeline/requirements/REQ.md`
   - If coming from review: read the latest `.pipeline/reviews/sprint-N/QA-REPORT.md`
3. Read `.pipeline/elicitation/SPEC.md` if it exists (for cross-referencing)
4. Apply the categorization algorithm from the triage skill
5. Write results to `.pipeline/triage/TRIAGE-REPORT.md` and `.pipeline/triage/queued-findings.yaml`
6. Transition to the target phase based on routing decision
7. Report: categorization summary, routing decision, queued items count

## Constraints

- Do NOT resolve gaps — only categorize and route them
- Do NOT modify any artifacts other than triage output files and state.yaml
- When multiple categories exist, route to the EARLIEST phase (elicit < research < architect < complete)
