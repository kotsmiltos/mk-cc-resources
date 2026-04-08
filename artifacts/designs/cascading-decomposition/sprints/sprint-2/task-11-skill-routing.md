> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-2/task-11-skill-routing.md
> **sprint:** 2
> **status:** planned
> **depends_on:** T7
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D1, D6, D8
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 11: Architect SKILL.md Routing Update

## Goal
Update the architect's SKILL.md to add routing for scope decomposition commands. The user should be able to invoke `/architect scope level-N [target]` and the architect routes to the scope-decompose workflow. The routing must coexist with existing plan/review/ask/audit workflows (per D6: backward compatibility).

## Context
- The architect SKILL.md is at `plugins/architect/skills/architect/SKILL.md`
- Read the current SKILL.md's `<intake>`, `<routing>`, `<workflows_index>`, `<templates_index>`, and `<artifact_locations>` sections
- Per D1: explicit per-level commands (`/architect scope level-N [target]`)
- Per D6: scope/ and designs/ both work — check for `artifacts/scope/INDEX.md` first, fall through to existing plan.md workflow if absent
- Per D8: STATE.md gets `scope_root` field for pipeline routing, stage values: `scope-L0`, `scope-L1`, etc.

## Interface Specification

### Inputs
- User command (e.g., `/architect scope level-0`, `/architect scope level-1 auth`)
- STATE.md Pipeline Position (if scope stages are active)

### Outputs
- Routes to the correct workflow file (scope-decompose.md for scope commands, existing workflows for everything else)

### Contracts with Other Tasks
- T7 (scope-decompose workflow) is the target workflow for scope commands
- All existing workflows (plan.md, review.md, ask.md, audit.md) continue to work unchanged

## Pseudocode

```
UPDATES TO SKILL.md:

1. ADD to <routing> section (before existing routes):
   Route 0: User said "scope" — read workflows/scope-decompose.md. STOP.
   
   This catches: "architect scope level-0", "architect scope level-1 auth",
   "architect scope", "architect decompose"

2. ADD to <intake> section (check for scope mode):
   After checking Pipeline Position:
   - If stage starts with "scope-L": route to scope-decompose workflow
   - Check for INDEX.md at artifacts/scope/INDEX.md
   - If INDEX.md exists AND user didn't specify a non-scope command: suggest scope workflow
   - If INDEX.md does not exist: fall through to existing intake logic

3. ADD to <workflows_index> table:
   | scope-decompose.md | Cascading decomposition — read inputs, assign tiers, spawn parallel agents, verify consistency, update INDEX.md |

4. ADD to <templates_index> table:
   | index.md | INDEX.md structure — master routing table for scope decomposition |
   | agent-brief-decompose.md | Decomposition agent brief — YAML+XML contract for breaking down modules |
   | agent-brief-implement.md | Implementation agent brief — YAML+XML contract for leaf task execution |
   | decision-record.md | Individual decision record — immutable architectural decision |
   | interface-contract.md | Interface contract between module pairs — bidirectional signatures + guarantees |
   | cross-cutting-pattern.md | Cross-cutting pattern — concrete code examples for consistent implementation |
   | consistency-check.md | Consistency verification agent prompt — 5 cross-module checks |
   | system-map.md | System map — top-level architecture overview with module definitions |

5. ADD to <artifact_locations> table:
   | Scope index | `artifacts/scope/INDEX.md` | miltiaze (created), architect (updated) | architect, ladder-build |
   | Scope briefs | `artifacts/scope/brief/` | miltiaze | architect (scope-decompose) |
   | Scope architecture | `artifacts/scope/architecture/` | architect (L0) | architect (L1+), ladder-build |
   | Scope modules | `artifacts/scope/modules/*/` | architect (L1+) | architect (next level), ladder-build |
   | Consistency reports | `artifacts/scope/reports/` | architect (scope-decompose) | architect, user |

6. ADD STATE.md Pipeline Position stages to the canonical stages reference:
   Document these additional stages:
   - scope-L0: architecture decomposition in progress
   - scope-L1, scope-L2, ...: module/component decomposition at level N
   - scope-L0-complete, scope-L1-complete, ...: level N decomposition done, ready for review
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/SKILL.md` | MODIFY | Add scope routing, templates_index entries, workflows_index entry, artifact_locations entries |
| `plugins/mk-flow/skills/state/templates/state.md` | CHECK | Verify canonical pipeline stages section supports scope-LN stages. Add if missing. |

## Acceptance Criteria
- [ ] SKILL.md routing section includes "scope" keyword detection as highest-priority route
- [ ] SKILL.md intake checks for INDEX.md at artifacts/scope/ and suggests scope workflow if found
- [ ] SKILL.md workflows_index includes scope-decompose.md
- [ ] SKILL.md templates_index includes all 8 new templates (index, agent-brief-decompose, agent-brief-implement, decision-record, interface-contract, cross-cutting-pattern, consistency-check, system-map)
- [ ] SKILL.md artifact_locations includes scope/, scope/brief/, scope/architecture/, scope/modules/, scope/reports/
- [ ] Existing routing (plan, review, ask, audit) is unchanged and still works
- [ ] STATE.md canonical stages support scope-L0 through scope-L5 and scope-LN-complete variants
- [ ] `/architect scope level-0` routes to scope-decompose workflow
- [ ] `/architect plan` still routes to plan.md (backward compatibility per D6)

## Edge Cases
- User says "architect scope" without specifying a level: workflow detects missing level, reads INDEX.md to infer the next level
- User says "architect scope level-3" but INDEX.md shows level 1 not complete: workflow warns about level mismatch
- User says "architect plan" on a project that has both designs/ and scope/: routes to plan.md (existing behavior, not scope-decompose)
- STATE.md doesn't exist: fall through to manual detection (existing behavior)

## Notes
- This task touches the SKILL.md which is the main entry point for the architect skill. Changes must be additive — no existing routes or tables should be removed or reordered.
- The STATE.md template check is a consistency verification — the template should already support arbitrary stage values, but if it has an explicit enum, scope-LN stages need to be added.
