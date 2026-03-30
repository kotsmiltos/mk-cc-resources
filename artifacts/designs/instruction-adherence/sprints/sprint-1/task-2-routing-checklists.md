> **type:** task-spec
> **output_path:** artifacts/designs/instruction-adherence/sprints/sprint-1/task-2-routing-checklists.md
> **sprint:** 1
> **status:** complete
> **depends_on:** Task 0, Task 1
> **estimated_size:** M
> **plan:** ../PLAN.md
> **key_decisions:** none
> **open_questions:** none

# Task 2: Convert routing tables to imperative checklists

## Goal
Every multi-mode skill's `<routing>` section currently uses markdown tables. Tables are read as documentation, not as instructions. Convert them to numbered checklists with STOP gates that match the quick_start pattern.

## Context
The audit found that routing tables get ~40% adherence vs ~95% for imperative checklists. The `<routing>` sections remain as reference material, but the critical routing logic is now in quick_start (Tasks 0 and 1). This task converts the remaining routing sections to match, so even if Claude reads past quick_start, the routing section reinforces the same imperative pattern.

## Skills to convert

Only multi-mode skills with routing tables:
1. `plugins/miltiaze/skills/miltiaze/SKILL.md` — 4-row table
2. `plugins/architect/skills/architect/SKILL.md` — 4-row table
3. `plugins/ladder-build/skills/ladder-build/SKILL.md` — 4-row table (quick_start fixed, routing table still a table)

Single-mode skills (state, mk-flow-init, mk-flow-update, repo-audit, safe-commit, schema-scout, project-structure, alert-sounds) — no changes needed.

## Pseudocode

```
FOR EACH skill in [miltiaze, architect, ladder-build]:
  1. Read the current <routing> section
  2. Replace the markdown table with a numbered checklist:

  CURRENT FORMAT:
    | Signal | Workflow | File |
    |--------|----------|------|
    | condition A | Name | file.md |
    | condition B | Name | file.md |
    Default: ...

  NEW FORMAT:
    <routing>
    CHECK THESE IN ORDER. First match wins:
    1. [condition A] → Read workflows/file.md. STOP.
    2. [condition B] → Read workflows/file.md. STOP.
    3. Otherwise → Read workflows/default.md.
    </routing>

  3. Preserve all conditions — don't remove any routing paths
  4. The "Default" line becomes the last numbered step (no "Default:" label)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/miltiaze/skills/miltiaze/SKILL.md` | MODIFY | Replace routing table with checklist |
| `plugins/architect/skills/architect/SKILL.md` | MODIFY | Replace routing table with checklist |
| `plugins/ladder-build/skills/ladder-build/SKILL.md` | MODIFY | Replace routing table with checklist |

## Acceptance Criteria

- [ ] All 3 skills have routing sections as numbered checklists, not tables
- [ ] Each checklist item ends with "STOP" or is the final fallback
- [ ] All original routing conditions are preserved (no dropped paths)
- [ ] The checklist order matches priority (most specific first, default last)
