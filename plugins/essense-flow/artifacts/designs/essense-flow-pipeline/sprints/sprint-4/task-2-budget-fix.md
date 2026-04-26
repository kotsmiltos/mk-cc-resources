> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-2-budget-fix.md
> **sprint:** 4
> **status:** planned
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** None
> **open_questions:** none

# Task 2: Fix Budget Check to Measure Final Brief

## Goal
Fix `assembleBrief()` in `lib/brief-assembly.js` so the token budget is checked against the actual assembled brief (metadata header + resolved template), not just the caller-provided `sections` object. Currently a brief with substantial template boilerplate could exceed the ceiling despite sections passing individually.

## Context
Read `lib/brief-assembly.js` lines 130-175 (`assembleBrief`). QA finding H2: the `sections` parameter is checked against the budget, but the final brief string includes the metadata header (from `formatMetadataHeader`) and the resolved template body (from `resolvePlaceholders`). These aren't counted. The spec (BRIEF-PROTOCOL.md Section 2, step 3-4) says the total brief token count should be checked.

## Interface Specification

### Inputs
- Same `assembleBrief(options)` signature — no change

### Outputs
- Same return shape — but `budget.total` now reflects the actual brief size, not just sections
- New field in return: `budget.briefTokens` — actual token count of the final assembled brief

### Contracts with Other Tasks
- No downstream changes — callers already check `result.ok`

## Pseudocode

```
FUNCTION assembleBrief(options):
  1. Load/resolve template (existing)
  2. Resolve placeholders (existing)
  3. Check per-section budgets (existing — keep for early rejection)
  4. Stamp metadata header (existing)
  5. Assemble final brief string (existing)
  6. NEW: Count tokens on final brief string
  7. NEW: If final brief tokens > effective ceiling, return { ok: false } with breakdown
  8. Return { ok: true, brief, budget: { ...sectionBudget, briefTokens } }
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/brief-assembly.js` | MODIFY | Add post-assembly token check in `assembleBrief` |
| `tests/brief-assembly.test.js` | MODIFY | Add test where sections pass but final brief exceeds ceiling due to boilerplate |

## Acceptance Criteria

- [ ] `assembleBrief` returns `budget.briefTokens` with the actual token count of the assembled brief string
- [ ] If the final brief exceeds the effective ceiling (even though sections individually pass), `assembleBrief` returns `{ ok: false }` with an error mentioning the actual token count
- [ ] Existing tests still pass (no regression in normal cases)
- [ ] `budget.total` in the return still reflects section-level totals (for diagnostics)

## Edge Cases

- **Template boilerplate is very large:** Should be caught by the post-assembly check even if sections are small
- **Metadata header is large (many fields):** Counted in the post-assembly total
- **Brief exactly at ceiling:** Should pass (boundary condition)

## Notes
QA finding H2 from sprint 3 review. Simple fix — add one token count + comparison after assembly.
