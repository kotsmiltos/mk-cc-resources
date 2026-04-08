> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/task-1-index-template.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D3, D8
> **open_questions:** none

# Task 1: Create INDEX.md Template

## Goal
Create the INDEX.md template — the master routing table that every fresh session reads first to understand the scope/ project state. This is the spine of the decomposition system. A fresh Claude session reads INDEX.md and immediately knows: what the project is, what's been decided, what's been decomposed, and what needs to happen next.

## Context
- INDEX.md lives at `artifacts/scope/INDEX.md` (greenfield) or `artifacts/scope/features/<slug>/INDEX.md` (feature)
- It is the ONLY file a fresh session needs to read to orient itself
- Per D3: only the orchestrator writes to INDEX.md, never parallel agents
- Per D8: INDEX.md is authoritative for scope state; STATE.md tracks pipeline position

Read existing templates for format conventions:
- `plugins/architect/skills/architect/templates/plan.md` — similar routing concept (PLAN.md is the living document for the old pipeline)
- `plugins/mk-flow/skills/state/templates/state.md` — STATE.md template for pipeline stages

## Interface Specification

### Inputs
- Created by miltiaze (brief-complete stage) or by architect (scope-level-0+)
- Updated by the orchestrator after each decomposition level

### Outputs
- Read by every fresh session entering scope-decompose, scope-discover, or ladder-build execute
- Read by STATE.md integration for pipeline routing

### Contracts with Other Tasks
- T2 (agent brief templates) will reference INDEX.md as the entry point for context assembly
- T4 (scope-decomposition reference) will reference INDEX.md as the state tracking mechanism
- All Sprint 2+ tasks depend on this template's structure

## Pseudocode

```
INDEX.md structure:

METADATA BLOCKQUOTE:
  type: scope-index
  scope_root: artifacts/scope/ (or artifacts/scope/features/<slug>/)
  project: [project name]
  created: [date]
  last_updated: [date]
  phase: brief-complete | architecture | decomposition-LN | implementation | verification | complete

SECTION 1 — Status Summary:
  One-paragraph description of current state.
  What level we're at. What's ready. What's pending.

SECTION 2 — Module Status Table:
  Columns: Module | Tier | Decomposition Level | Components | Leaf Tasks | Status
  Status values: pending | in-progress | L0-done | L1-done | LN-done | ready | implementing | complete
  Tier values: 1 (core/foundation) | 2 (feature) | 3 (integration)

SECTION 3 — File Inventory:
  Brief: brief/project-brief.md
  Architecture: architecture/system-map.md
  Contracts: [count] files in architecture/contracts/
  Patterns: [count] files in architecture/patterns/
  Decisions: [count] files in architecture/decisions/
  Modules: [list of module directories]

SECTION 4 — Decomposition Config:
  Max depth: [default 5, configurable]
  Leaf size target: 250 lines
  Overflow threshold: 300 lines
  Parallel batch size: 3-5

SECTION 5 — Level History:
  Table: Level | Date | Modules Processed | Agents Spawned | Amendments | Notes
  One row per completed decomposition level. Audit trail.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/index.md` | CREATE | New template file defining INDEX.md structure |

## Acceptance Criteria
- [ ] Template file exists at `plugins/architect/skills/architect/templates/index.md`
- [ ] Template contains all 5 sections (Status Summary, Module Status Table, File Inventory, Decomposition Config, Level History)
- [ ] Metadata blockquote follows existing convention (> **field:** value)
- [ ] Module Status Table has all specified columns
- [ ] Status values are enumerated (not free-text)
- [ ] Template includes inline comments explaining each section's purpose
- [ ] Template is valid markdown that renders correctly

## Edge Cases
- Empty project: Module Status Table can be empty (no modules yet — brief-complete phase only has the brief)
- Feature flow: scope_root points to features/<slug>/ instead of root scope/
- Very large project: Module Status Table with 20+ modules — table must remain scannable
