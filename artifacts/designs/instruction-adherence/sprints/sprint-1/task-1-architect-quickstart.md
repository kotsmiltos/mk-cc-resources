> **type:** task-spec
> **output_path:** artifacts/designs/instruction-adherence/sprints/sprint-1/task-1-architect-quickstart.md
> **sprint:** 1
> **status:** complete
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../PLAN.md
> **key_decisions:** D1
> **open_questions:** none

# Task 1: Fix architect quick_start routing gate

## Goal
Replace architect's quick_start with an imperative gate that checks STATE.md Pipeline Position FIRST, before checking artifacts/designs/. The intake section already does this correctly — quick_start needs to match it.

## Context
Current quick_start says "Check for existing design artifacts in artifacts/designs/" first. The intake section (line 60+) correctly checks Pipeline Position first. But quick_start runs before intake and sets direction. A bare `/architect` after a sprint completes might check for PLAN.md instead of reading the pipeline stage.

Read the current quick_start at `plugins/architect/skills/architect/SKILL.md` line 10-12.

## Pseudocode

```
REPLACE quick_start content with:

<quick_start>
BEFORE ANYTHING ELSE — check Pipeline Position:
1. Read context/STATE.md Pipeline Position stage.
2. If stage is sprint-N-complete: read workflows/review.md. STOP.
3. If stage is requirements-complete or audit-complete: read workflows/plan.md. STOP.
4. If user said "audit" or "assess": read workflows/audit.md. STOP.

Only if no Pipeline Position or stage is idle/complete:
5. Check for existing PLAN.md in artifacts/designs/
6. Check for miltiaze output in artifacts/explorations/
7. If nothing exists, ask user what to build or audit
</quick_start>
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/SKILL.md` | MODIFY | Replace quick_start section |
| `plugins/architect/.claude-plugin/plugin.json` | MODIFY | Bump version |

## Acceptance Criteria

- [ ] quick_start is a numbered checklist, not a paragraph
- [ ] Step 1 reads STATE.md pipeline position FIRST
- [ ] Steps 2-4 have STOP gates for each routing decision
- [ ] Steps 5-7 are conditional on "no Pipeline Position or idle/complete"
- [ ] Plugin version bumped
