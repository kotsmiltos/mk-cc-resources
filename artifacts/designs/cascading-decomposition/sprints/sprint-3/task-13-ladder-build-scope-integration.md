> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/task-13-ladder-build-scope-integration.md
> **sprint:** 3
> **status:** planned
> **depends_on:** T2, T7
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D6, D9
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 13: ladder-build Scope Integration

## Goal
Extend the ladder-build execute workflow to detect scope mode (INDEX.md present), read leaf task specs from the scope directory tree, assemble full agent briefs from scope artifacts (patterns, decisions, contracts, task specs), and execute implementation agents with assembled context. This makes ladder-build the implementation engine for the cascading decomposition pipeline.

## Context
- Current execute workflow: `plugins/ladder-build/skills/ladder-build/workflows/execute.md` — reads task specs from `artifacts/designs/[slug]/sprints/sprint-N/`
- Scope-decompose workflow: `plugins/architect/skills/architect/workflows/scope-decompose.md` — produces leaf task .agent.md files in `artifacts/scope/modules/*/[components/*/]tasks/`
- D6 (backward compatibility): scope/ and designs/ pipelines coexist. ladder-build detects mode from INDEX.md presence. If no INDEX.md, falls through to current designs/ behavior.
- D9 (traceability): owns-list semantic matching handles traceability. traces_to is human-facing only.
- The assembly algorithm in scope-decompose.md (Steps 1-9) defines how to read scope files. ladder-build follows the same algorithm but for implementation agents (not decomposition agents).
- Agent brief format for implementation: `plugins/architect/skills/architect/templates/agent-brief-implement.md`

## Interface Specification

### Inputs
- `artifacts/scope/INDEX.md` — module status table shows which modules have leaf tasks ready
- Leaf task specs at `artifacts/scope/modules/{mod}/[components/{comp}/]tasks/task-NN-{slug}.agent.md`
- Architecture artifacts: `artifacts/scope/architecture/` (system-map, contracts, patterns, decisions)
- STATE.md Pipeline Position with scope_root field

### Outputs
- Implemented source files (per task specs)
- Per-task execution reports (same format as current execute.md)
- Sprint completion report at `artifacts/scope/reports/implementation-wave-N.md`
- Updated INDEX.md module status: leaf tasks marked `implemented`

### Contracts with Other Tasks
- T7 (scope-decompose) produces the leaf .agent.md files → this task reads them
- T2 (agent brief templates) defines the implementation brief format → this task assembles conforming briefs
- T14 (overflow detection) adds overflow handling → depends on this task establishing scope execution flow

## Pseudocode

```
MODIFY execute.md — add scope mode detection and scope-based execution:

IN step_1_find_task_specs (existing):
  ADD scope mode detection at the TOP, before designs/ detection:

  1. Check for scope root:
     IF context/STATE.md Pipeline Position has scope_root field:
       scope_root = STATE.md scope_root value
     ELSE:
       Check for artifacts/scope/INDEX.md directly
     
     IF scope_root exists AND {scope_root}/INDEX.md exists:
       scope_mode = true
       Read INDEX.md
       Extract module status table
       
       Find ready leaf tasks:
       FOR each module in INDEX.md where status is "ready" or "leaf-ready":
         Glob {scope_root}/modules/{module}/tasks/*.agent.md
         AND  {scope_root}/modules/{module}/components/*/tasks/*.agent.md (recursive)
         Collect all .agent.md files as task specs
       
       IF no leaf tasks found:
         Tell user: "INDEX.md shows modules as ready but no leaf task specs found.
         Run /architect scope level-N to decompose further."
         STOP.
       
       Read architecture context:
         system_map = {scope_root}/architecture/system-map.agent.md
         contracts = glob {scope_root}/architecture/contracts/*.md
         patterns = glob {scope_root}/architecture/patterns/*.md
         decisions = glob {scope_root}/architecture/decisions/D*.md (status: final only)
       
       CONTINUE to step_2 with scope task list
     
     ELSE:
       scope_mode = false
       Fall through to existing designs/ detection (current behavior unchanged)

IN step_2_plan_execution_order:
  IF scope_mode:
    Build dependency graph from task .agent.md YAML frontmatter:
    Each task has: module, component, depends_on fields
    
    Group into waves:
    Wave 1: tasks with no unmet dependencies
    Wave 2: tasks depending on Wave 1
    etc.
    
    Apply tier ordering from INDEX.md:
    Tier-1 (core) modules execute before Tier-2 (feature) modules
    Tier-3 (integration) modules execute last
    
    Batch size: INDEX.md decomposition_config.parallel_batch_size (default 5)

IN step_3_execute_tasks:
  IF scope_mode:
    FOR each task in current wave:
      ASSEMBLE full agent brief:
        1. Read task .agent.md (the leaf task spec)
        2. Extract module and component from YAML frontmatter
        3. Read system-map.agent.md — extract <architecture_constraints>
        4. Find relevant contracts:
           glob contracts/*--{module}.md AND contracts/{module}--*.md
        5. Find relevant patterns:
           read each pattern, include if applies_to contains module or "all"
        6. Find relevant decisions:
           read each D*.md, include if modules_affected contains module
           AND status is "final" (skip superseded)
        7. Compose assembled brief:
           <context> from system-map
           <constraint> from task spec (already positive-only)
           <read_first> from task spec
           <interface> from task spec
           <patterns> from architecture patterns
           <decisions> from architecture decisions
           <files> from task spec
           <verify> from task spec
           <contract> from architecture contracts
      
      LAUNCH Agent subagent with assembled brief
      (Same agent prompt pattern as current execute.md, but with assembled scope context)

IN step_5_sprint_completion_report:
  IF scope_mode:
    Save to: {scope_root}/reports/implementation-wave-{N}.md
    (Instead of artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md)
    Same content format as current completion report.

IN step_6_update_state:
  IF scope_mode:
    Update INDEX.md:
      - Mark implemented leaf tasks as status "implemented"
      - Update module status if all leaf tasks in module are implemented
    
    Update STATE.md Pipeline Position:
      Stage: sprint-N-complete (same as current)
      Scope root: keep existing value

  ELSE:
    Current behavior unchanged

MODIFY SKILL.md quick_start — add scope detection:
  ADD before step 1:
    0. Check for artifacts/scope/INDEX.md — if exists AND has leaf tasks with
       status "ready", read workflows/execute.md. STOP.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | Add scope mode detection in step_1, scope-based brief assembly in step_3, scope report path in step_5, INDEX.md update in step_6 |
| `plugins/ladder-build/skills/ladder-build/SKILL.md` | MODIFY | Add scope detection to quick_start (check INDEX.md before designs/ check) |

## Acceptance Criteria
- [ ] When `artifacts/scope/INDEX.md` exists with ready leaf tasks, execute.md reads from scope/ instead of designs/
- [ ] Leaf task specs are discovered by globbing `modules/*/tasks/*.agent.md` and `modules/*/components/*/tasks/*.agent.md` recursively
- [ ] Each implementation agent receives an assembled brief containing: task spec + system-map constraints + relevant contracts + relevant patterns + relevant decisions
- [ ] Assembly follows the same file-discovery logic as scope-decompose.md (contracts by module name, patterns by applies_to, decisions by modules_affected and status)
- [ ] Superseded decisions (status starts with "superseded-by-") are excluded from assembled briefs
- [ ] Wave-based execution respects dependency ordering and tier ordering from INDEX.md
- [ ] Batch size respects INDEX.md decomposition_config.parallel_batch_size
- [ ] Completion report saved to `{scope_root}/reports/implementation-wave-N.md`
- [ ] INDEX.md updated with implementation status after wave completion
- [ ] Legacy mode (no INDEX.md) preserves current execute.md behavior exactly
- [ ] SKILL.md quick_start checks for INDEX.md before checking for designs/ task specs

## Edge Cases
- Mixed state: some modules have leaf tasks ready, others still need decomposition — only execute ready modules, report pending ones
- Empty wave: all tasks in a tier depend on unfinished work — skip with clear message, don't block
- Task .agent.md references a contract that doesn't exist on disk — warn but don't fail (the contract may have been intentionally omitted)
- Scope root in STATE.md differs from `artifacts/scope/` — trust STATE.md value, it may be a feature-scoped root like `artifacts/scope/features/<slug>/`
