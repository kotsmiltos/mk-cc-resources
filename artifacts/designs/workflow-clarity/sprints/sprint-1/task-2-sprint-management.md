# Task 2: Sprint-Management.md D9 Rewrite

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Rewrite the sprint-management.md reference to align with D9: "Sprints serve the product, not the process — break only at decision gates or context limits." The current document uses fixed task-count sizing (S=1-3, M=3-5, L=5+) as the primary split criterion, which directly contradicts D9. After this task, decision gates and context health are primary, task count is a secondary signal.

## Context

Read first:
- `plugins/architect/skills/architect/references/sprint-management.md` — the current reference (149 lines)
- Audit findings AC-1, AC-10 in `artifacts/audits/2026-03-29-coherence-audit-report.md`
- Design decision D9 in `artifacts/explorations/2026-03-29-workflow-clarity-exploration.md`

This reference is read by the architect's plan.md workflow when designing sprints. Changing the framing here changes how all future sprints are structured. The internal contradiction (AC-10) between the principles section ("each sprint produces working, verifiable output") and the sizing section ("total tasks exceed 5 → split") must be resolved in favor of D9.

The rewrite must preserve the sizing vocabulary (S/M/L) and context-health guardrail function — these are useful secondary signals. The goal is to invert the hierarchy: boundaries are set by decision gates and context limits, then task count signals whether context pressure is a concern.

## Interface Specification

### Inputs
- Current `sprint-management.md` at `plugins/architect/skills/architect/references/sprint-management.md`

### Outputs
- Modified `sprint-management.md` with D9-aligned framing

### Contracts with Other Tasks
- Sprint 2 Task 2 (Architect Templates) will add boundary rationale to plan.md template — that task references this reference for sprint design guidance
- No other task in Sprint 1 depends on this

## Pseudocode

```
1. Open plugins/architect/skills/architect/references/sprint-management.md

2. REWRITE <principles> section:
   KEEP: "A sprint is a set of tasks that can be executed and verified as a unit"
   KEEP: "Each sprint produces working, verifiable output"
   KEEP: "Sprint size is bounded by context window health"
   ADD: "Sprint boundaries are set by decision gates, context limits, or natural scope boundaries — not by task count"
   ADD: "A sprint ends when: a decision must be made before proceeding, context health would degrade, or the work forms a complete verifiable capability"
   ADD: "If the next sprint requires unresolved decisions, the boundary is a decision gate — pause and present the decision"

3. REWRITE <sizing_guidelines> section:
   OLD framing: S/M/L defined by task count ranges (1-3, 3-5, 5+) as primary sizing
   NEW framing:
   - S/M/L describe COMPLEXITY, not task count
   - S: Single focused capability. One component or feature. Clear verification.
   - M: A few connected components. Some research or iteration needed. Moderate context load.
   - L: A subsystem or major feature. High context load. Consider splitting if decision gates exist within.
   - Task count is a SECONDARY signal for context pressure:
     "If a sprint has many tasks (roughly 5+), check whether context health is at risk.
     If so, look for a natural decision gate to split. The count itself is not a boundary — it's a prompt to verify context health."

4. REWRITE "When to split a sprint":
   OLD: First criterion is "Total tasks exceed 5 (context pressure)"
   NEW: Primary criteria:
   - A decision gate exists within the sprint (user or architect input needed before continuing)
   - Context health would degrade before all tasks complete
   - Two subsets of tasks form independently verifiable capabilities
   - A task has significant uncertainty that shouldn't block the rest
   SECONDARY signal:
   - High task count suggests context pressure — verify health before proceeding

5. KEEP "When to merge sprints" section — already product-driven (small sprints with shared context, trivial standalone tasks)

6. KEEP <task_design> section — already self-contained, contract-driven, acceptance-criteria-focused. No changes needed.

7. KEEP <dependency_management> section — already correct.

8. KEEP <reassessment> section — already correct.

9. KEEP <parallel_execution> section — already correct.

10. REWRITE <context_health> <monitoring> section:
    KEEP: All degradation signs (skimming files, assuming behavior, etc.)
    ADD: "When these signs appear, the sprint has exceeded its context budget.
    This is one reason sprint boundaries exist — a boundary should appear
    BEFORE context degrades, not after."

11. KEEP <context_health> <recovery> section — already correct.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/references/sprint-management.md` | MODIFY | Reframe principles, sizing, split criteria from task-count-primary to decision-gate-primary |

## Acceptance Criteria

- [ ] Principles section includes "sprint boundaries are set by decision gates, context limits, or natural scope boundaries"
- [ ] S/M/L sizing defined by complexity, not task count ranges
- [ ] "When to split" primary criteria are decision gates, context health, independent verifiability
- [ ] Task count ("5+") appears only as a secondary context-health signal, not a split trigger
- [ ] No contradiction between principles section and sizing section (AC-10 resolved)
- [ ] Context-health guardrail function preserved — degradation signs, recovery steps still present
- [ ] Boundary rationale concept introduced ("sprint ends because [decision gate / context limit / scope boundary]")

## Edge Cases

- **Existing PLAN.md artifacts with old-style sizing:** The reference change is advisory — it affects future sprint design, not existing plans. No migration needed.
- **S/M/L labels still appear in task specs and plan templates:** The labels are retained as complexity descriptors. They continue to work in all existing contexts. Only the definition changes.

## Notes

- This is a relatively safe change: sprint-management.md is a reference document read by the plan workflow, not a runtime component. The risk is in the wording — the rewrite must clearly convey that decision gates are primary without making task count irrelevant. Context health is a real concern and task count is a useful proxy for it.
- The existing `<context_health>` section is the strongest part of the current document. Preserve it fully.
