> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/task-22-qa-hardening.md
> **sprint:** 3
> **status:** planned
> **depends_on:** T7, T8, T9, T11
> **estimated_size:** M (8 small fixes bundled)
> **plan:** ../../PLAN.md
> **key_decisions:** D5, D10, D11
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 22: Sprint 2 QA Hardening

## Goal
Apply 8 non-blocking improvements identified by Sprint 2 adversarial QA. These are all small, isolated fixes to existing files that close gaps found during verification. Bundled into one task because each is S-effort and they share no dependencies between them.

## Context
- Sprint 2 QA report: `artifacts/designs/cascading-decomposition/sprints/sprint-2/QA-REPORT.md`
- Findings H4, H5, H6, M2, M3, M4, M5, M6 — all accepted by user
- All fixes target files created/modified in Sprint 1-2; no new files needed

## Interface Specification

### Inputs
- QA-REPORT.md findings with specific file locations and recommendations

### Outputs
- 8 fixes applied to existing files
- All acceptance criteria verifiable by reading the modified files

### Contracts with Other Tasks
- T12-T16 (other Sprint 3 tasks) are independent — no ordering dependency
- These fixes prevent runtime failures when the workflow is first used

## Pseudocode

```
FIX H4 — Parent scope filename convention:
  In references/scope-decomposition.md:
    Replace "overview.agent.md" with "{slug}.agent.md" in the brief assembly Step 7
    Replace "spec.agent.md" with "{slug}.agent.md" for component parents
  In workflows/scope-decompose.md:
    Remove the "OR overview.agent.md" fallback in assembly Step 7
    Use only "{parent}.agent.md" / "{parent-component}.agent.md"
  Convention: the filename always matches the directory slug

FIX H5 — Routing disambiguation:
  In SKILL.md <routing> section Route 0:
    Change trigger from: 'User said "scope", "decompose", or stage starts with "scope-L"'
    To: 'User command starts with "/architect scope" or "/architect decompose", or stage starts with "scope-L"'
    This prevents "architect plan scope" from triggering the scope workflow

FIX H6 — Windows crash recovery:
  In workflows/scope-decompose.md Step 7 (atomic write):
    Add recovery note after the Windows delete-then-rename instruction:
    "Recovery: if INDEX.md is missing but INDEX.md.tmp exists at intake (Step 1),
     rename INDEX.md.tmp to INDEX.md before proceeding."
  Also add this check to Step 1 intake before the INDEX.md existence check.

FIX M2 — Decision ID padding convention:
  In references/scope-decomposition.md <decision_numbering> or appropriate section:
    Document: "Decision IDs use 3-digit zero-padding: D001, D002, ..., D999.
    The next_decision_id field in INDEX.md Decomposition Config stores the raw
    integer (e.g., 1, 15, 100). The orchestrator pads when constructing file paths
    and agent prompt references."
  In templates/index.md Decomposition Config table:
    Add note to Next decision ID description: "(raw integer; pad to 3 digits for file paths)"

FIX M3 — QG5 Level 0 exception:
  In workflows/scope-decompose.md Step 6 QG5:
    Add: "Level 0 exception: skip QG5 at Level 0. The project brief may not contain
    an aggregate implementation estimate. Scope conservation applies from Level 1
    onward where parent modules have estimated_lines."

FIX M4 — Forced-leaf size warning:
  In workflows/scope-decompose.md Step 2 item 6 (depth cap):
    After "force ALL remaining targets to leaf tasks. Report to user." add:
    "For each forced leaf, check estimated_lines against the overflow threshold (300).
    If exceeded, add a prominent warning: 'Module {name} forced to leaf at depth cap
    but estimates {N} lines (threshold: 300). Consider restructuring Level 1-2 boundaries.'"

FIX M5 — <scope name> attribute in assembly:
  In workflows/scope-decompose.md Step 4 assembly Step 8 section c:
    Change: '<scope>' to '<scope name="{target}">'
    Add note: "The name attribute is required — the consistency check (CHECK 5) validates
    that it matches the target field in YAML frontmatter."

FIX M6 — Decision ID block overflow parsing:
  In workflows/scope-decompose.md Step 5 "Collect Results" section:
    Add to the collection list: "Decision ID block overflow flags (agent reported exhausting its reserved block)"
    Add handling: "If any agent flagged overflow, assign additional blocks and note the
    extended range for INDEX.md update in Step 7."
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/references/scope-decomposition.md` | MODIFY | H4: filename convention, M2: padding convention |
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | MODIFY | H4: remove fallback, H6: crash recovery, M3: QG5 L0 exception, M4: forced-leaf warning, M5: scope name attr, M6: overflow parsing |
| `plugins/architect/skills/architect/SKILL.md` | MODIFY | H5: routing trigger refinement |
| `plugins/architect/skills/architect/templates/index.md` | MODIFY | M2: padding note in Decomposition Config |

## Acceptance Criteria
- [ ] H4: scope-decomposition.md uses `{slug}.agent.md` consistently (no `overview.agent.md` or `spec.agent.md`)
- [ ] H4: scope-decompose.md assembly Step 7 uses `{parent}.agent.md` without fallback
- [ ] H5: SKILL.md Route 0 requires command pattern `/architect scope` or `/architect decompose`, not bare keyword match
- [ ] H5: "architect plan scope" does NOT trigger Route 0
- [ ] H6: Step 1 intake checks for INDEX.md.tmp and recovers before checking INDEX.md existence
- [ ] H6: Step 7 documents the crash recovery note
- [ ] M2: Decision ID padding convention documented in scope-decomposition.md (3-digit, D001 format)
- [ ] M2: INDEX.md template Decomposition Config notes raw integer + padding instruction
- [ ] M3: QG5 explicitly skips at Level 0 with documented reason
- [ ] M4: Depth cap forced-leaf includes size warning when estimated_lines > overflow threshold
- [ ] M5: Assembly Step 8c produces `<scope name="{target}">` with name attribute
- [ ] M6: Result collection includes decision ID block overflow flag parsing and extended block assignment

## Edge Cases
- H5: "architect scope review" should still route to scope-decompose (contains "scope" in command position)
- M2: Decision count exceeding D999 — document behavior (unlikely but note it)
- M3: Level 1+ with a parent that has no estimated_lines — QG5 should warn, not fail
