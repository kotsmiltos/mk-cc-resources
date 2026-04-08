> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-4/task-19-documentation.md
> **sprint:** 4
> **status:** planned
> **depends_on:** T17, T18, T23
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** none
> **open_questions:** none

# Task 19: CLAUDE.md Update

## Goal
Update the repository's CLAUDE.md to document the complete cascading decomposition pipeline — new files, workflows, templates, cross-references, and the updated pipeline flow. This is the primary documentation artifact that any fresh session reads to understand the codebase.

## Context
- CLAUDE.md currently documents the pre-scope pipeline: miltiaze -> architect -> ladder-build via designs/
- Sprint 1-4 added: 8 new templates, 2 new workflows (scope-decompose, scope-discover), scope-decomposition reference, cross-references, .gitignore entry
- The Architecture section file listings, Pipeline table, and Cross-Reference Patterns table all need updates
- F11 template language review — check agent-brief-decompose.md line 107 "do not decompose further" for positive reframing

## Interface Specification

### Inputs
- Current CLAUDE.md
- All files created/modified in Sprints 1-4
- Fitness function F11 finding (negation in template code fence)

### Outputs
- Updated CLAUDE.md with complete scope pipeline documentation

### Contracts with Other Tasks
- T23 (QA hardening) fixes referenced in cross-references must be done first
- T17 (scope-discover) and T18 (feature support) add the final workflow — document after they're done

## Pseudocode

```
1. UPDATE Architecture section — architect plugin file listings:
   Add to architect/ section:
   - workflows/scope-decompose.md (cascading decomposition at any level)
   - workflows/scope-discover.md (feature flow: existing codebase discovery)
   - references/scope-decomposition.md (decomposition rules, stopping criteria, assembly)
   - templates/index.md (INDEX.md master routing table)
   - templates/agent-brief-decompose.md (agent brief for decomposition agents)
   - templates/agent-brief-implement.md (agent brief for implementation agents)
   - templates/system-map.md (architecture system map)
   - templates/decision-record.md (architectural decision records)
   - templates/interface-contract.md (module interface contracts)
   - templates/cross-cutting-pattern.md (cross-cutting concern patterns)
   - templates/consistency-check.md (consistency verification agent prompt)

2. UPDATE Pipeline table:
   Add scope pipeline flow alongside existing designs/ pipeline:
   | Stage | Skill | Mode | Output | Next |
   | Scope Research | miltiaze | requirements.md (scope mode) | artifacts/scope/brief/ + INDEX.md | /architect scope level-0 |
   | Discovery (features only) | architect | scope-discover.md | artifacts/scope/features/<slug>/discovery/ | /architect scope level-0 |
   | Architecture (L0) | architect | scope-decompose.md | artifacts/scope/architecture/ | /architect scope level-1 |
   | Decomposition (L1+) | architect | scope-decompose.md | artifacts/scope/modules/*/ | /architect scope level-N or /ladder-build |
   | Implementation | ladder-build | execute.md (scope mode) | source code + reports/ | /architect review |

3. UPDATE Cross-Reference Patterns table:
   Verify all scope-related rows added in T16 are still accurate after T17/T18 changes.
   Add scope-discover.md to relevant entries if it's a new consumer/producer.

4. ADD to Dependency Highlights:
   Note that scope pipeline is pure markdown (no runtime dependencies beyond existing skills).

5. FIX F11 — Check agent-brief-decompose.md line 107:
   If it still says "do not decompose further", reframe to positive:
   "= LEAF (produce a leaf task spec directly)" or similar.

6. UPDATE Conventions section:
   Add: "Scope artifacts live in artifacts/scope/ (gitignored by default per D2)"
   Add: "Every scope artifact has dual representation (.md human + .agent.md agent)"
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `CLAUDE.md` | MODIFY | Architecture section file listings, Pipeline table, Cross-Reference table verification, Conventions, Dependency Highlights |
| `plugins/architect/skills/architect/templates/agent-brief-decompose.md` | MODIFY | F11: reframe negation to positive |

## Acceptance Criteria
- [ ] CLAUDE.md Architecture section lists all scope-related files in the architect plugin
- [ ] CLAUDE.md Pipeline table includes the scope pipeline flow (5 stages)
- [ ] CLAUDE.md Cross-Reference Patterns table includes scope-discover.md where relevant
- [ ] CLAUDE.md Conventions mentions scope/ directory and dual representation
- [ ] agent-brief-decompose.md line 107 uses positive framing (no "do not")
- [ ] No stale file paths in CLAUDE.md — every listed file exists on disk

## Edge Cases
- CLAUDE.md is already long — keep additions concise, don't duplicate what's in PLAN.md
- Cross-reference table rows should not duplicate cross-references.yaml entries verbatim — table is high-level summary
