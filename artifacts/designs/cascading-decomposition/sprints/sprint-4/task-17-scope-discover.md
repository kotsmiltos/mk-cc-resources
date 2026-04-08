> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-4/task-17-scope-discover.md
> **sprint:** 4
> **status:** planned
> **depends_on:** T7
> **estimated_size:** L
> **plan:** ../../PLAN.md
> **key_decisions:** D6
> **open_questions:** none

# Task 17: scope-discover Workflow

## Goal
Create a new architect workflow for the "feature flow" entry point — scanning an existing codebase to map its current architecture, trace the impact of a proposed feature, and produce a discovery report that feeds into scope-decompose at Level 0. This enables the cascading decomposition pipeline to work on existing codebases, not just greenfield projects.

## Context
- Requirements Section 2.7 (Feature Flow): discovery phase scans existing codebase
- Requirements Phase 2 (Discovery): spawns discovery agents, maps existing architecture, traces impact
- Requirements UC2 (Large Feature on Existing Project) and UC3 (Complex Refactor)
- The feature flow directory structure: `artifacts/scope/features/<slug>/discovery/`
- scope-decompose workflow already handles feature flow once discovery is complete (the architecture phase maps features ONTO existing code)
- D6 (backward compatibility): this is an additive workflow, doesn't change existing behavior

## Interface Specification

### Inputs
- User command: `/architect scope discover <feature-slug>` or `/architect scope discover`
- Feature brief at `artifacts/scope/features/<slug>/brief/feature-brief.agent.md` (produced by miltiaze in feature mode)
- Existing codebase (the project the feature is being added to)

### Outputs
- `artifacts/scope/features/<slug>/discovery/codebase-snapshot.md` — human doc: existing architecture as understood
- `artifacts/scope/features/<slug>/discovery/codebase-snapshot.agent.md` — agent brief: structured architecture snapshot
- `artifacts/scope/features/<slug>/discovery/impact-map.md` — human doc: which files/modules the feature touches
- `artifacts/scope/features/<slug>/discovery/impact-map.agent.md` — agent brief: structured impact trace
- Updated INDEX.md: phase `discovery-complete`, File Inventory updated

### Contracts with Other Tasks
- T12 (miltiaze scope output) produces the feature brief in feature mode → this task reads it
- T7 (scope-decompose) will consume discovery output at Level 0 when architect does feature architecture
- T18 (feature scope directory support) ensures scope-decompose handles the feature directory structure

## Pseudocode

```
CREATE workflows/scope-discover.md:

<step_1_intake>
  1. Read INDEX.md from feature scope root (artifacts/scope/features/<slug>/)
  2. Verify phase is brief-complete (discovery hasn't been done yet)
  3. Read the feature brief .agent.md for project context and requirements
  4. If INDEX.md phase is already discovery-complete:
     Tell user: "Discovery already complete. Run /architect scope level-0 to start decomposition."
     STOP.
</step_1_intake>

<step_2_spawn_discovery_agents>
  Spawn 3 parallel discovery agents:

  Agent 1 — Architecture Scanner:
    Read the project's CLAUDE.md, package manifests, and key entry points.
    Map: modules/packages, their boundaries, dependency direction, key interfaces.
    Output: structured architecture snapshot (module list, boundary map, dependency graph).

  Agent 2 — Impact Tracer:
    Read the feature brief requirements.
    For each requirement, trace which existing files/functions it touches.
    Grep for related patterns (API endpoints, data models, service calls).
    Output: impact table (requirement → file → function → change type: modify/extend/wrap).

  Agent 3 — Pattern Extractor:
    Read example files in the codebase that the feature will touch.
    Extract: naming conventions, error handling patterns, test patterns, import organization.
    Output: pattern catalog that implementation agents must follow.

  All 3 agents include team values block from references/team-culture.md.
</step_2_spawn_discovery_agents>

<step_3_synthesize>
  Read all 3 agent outputs. Produce:

  1. codebase-snapshot.md (human):
     - Architecture overview (modules, boundaries, dependencies)
     - Key patterns and conventions
     - Technology stack and constraints
     - Questions for user (things the scanner couldn't determine)

  2. codebase-snapshot.agent.md:
     YAML: type, purpose, project, scope_root, source_hash
     XML: <architecture>, <modules>, <dependencies>, <patterns>, <constraints>

  3. impact-map.md (human):
     - Per-requirement impact trace
     - Affected files with change descriptions
     - Risk assessment (high-impact changes, cross-cutting effects)
     - Recommended approach (new files vs modifications)

  4. impact-map.agent.md:
     YAML: type, purpose, feature, scope_root, source_hash
     XML: <impact>, <affected_files>, <new_files>, <risks>, <approach>

  Both .agent.md files use positive-only framing (F3 compliance).
</step_3_synthesize>

<step_4_update_index>
  Update INDEX.md:
  - Phase: discovery-complete
  - File Inventory: add all 4 discovery files
  - Module Status: populate with existing modules from architecture scan
    (status: "existing" for untouched, "impacted" for feature-touched)
  Atomic write (same pattern as scope-decompose Step 7).
</step_4_update_index>

<step_5_update_state>
  Update STATE.md Pipeline Position:
  - Stage: scope-L0 (ready for architecture phase)
  - Scope root: keep existing value

  Present to user:
  "Discovery complete. Impact map shows {N} files affected across {M} modules.
   Discovery artifacts at {feature_scope_root}/discovery/.

   Review the impact map, then run:
      /architect scope level-0

   You can /clear first — all state is on disk."
</step_5_update_state>
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/scope-discover.md` | CREATE | New workflow: feature flow discovery with 3 parallel agents |
| `plugins/architect/skills/architect/SKILL.md` | MODIFY | Add scope-discover to routing and workflows_index |

## Acceptance Criteria
- [ ] `workflows/scope-discover.md` exists with step_1 through step_5 process structure
- [ ] 3 parallel discovery agents spawned: architecture scanner, impact tracer, pattern extractor
- [ ] Agent prompts include team values block from references/team-culture.md
- [ ] codebase-snapshot.md + .agent.md produced in dual format at `discovery/`
- [ ] impact-map.md + .agent.md produced in dual format at `discovery/`
- [ ] .agent.md files use positive-only framing (F3 compliance)
- [ ] .agent.md files have source_hash matching sibling .md
- [ ] INDEX.md updated to phase `discovery-complete` with File Inventory
- [ ] INDEX.md Module Status populated with existing modules (status: existing/impacted)
- [ ] STATE.md Pipeline Position updated to scope-L0
- [ ] SKILL.md Route 0 handles "discover" as a scope sub-command
- [ ] If discovery already complete, workflow tells user to proceed to level-0

## Edge Cases
- Codebase has no CLAUDE.md or project docs — scanner relies on file structure and package manifests only
- Very large codebase (1000+ files) — scanner should focus on entry points and module boundaries, not every file
- Feature doesn't touch existing code (pure addition) — impact map shows new files only, no modifications
- Feature scope root doesn't exist yet — create it before writing discovery files
