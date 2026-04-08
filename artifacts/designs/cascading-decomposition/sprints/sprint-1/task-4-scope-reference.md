> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/task-4-scope-reference.md
> **sprint:** 1
> **status:** planned
> **depends_on:** T1, T2, T3
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D3, D5, D7, D8
> **open_questions:** none

# Task 4: Create Scope Decomposition Reference

## Goal
Create the reference document that defines the rules, stopping criteria, tier ordering, brief assembly algorithm, and quality gates for the decomposition system. This is the "how-to" that the scope-decompose workflow follows at every level. It is to scope-decompose what sprint-management.md is to the existing plan.md workflow.

## Context
- This reference is read by the scope-decompose workflow (Sprint 2) as `<required_reading>`
- It codifies the rules from the exploration research and requirements refinements
- The brief assembly algorithm is the most complex piece — it must be specified precisely enough that the workflow can follow it mechanically
- Read existing reference format: `plugins/architect/skills/architect/references/sprint-management.md`
- Read the exploration doc for research-backed rules: `artifacts/explorations/2026-04-07-cascading-decomposition-exploration.md`

## Interface Specification

### Inputs
- Referenced by scope-decompose workflow as required reading

### Outputs
- Provides rules that scope-decompose follows: stopping criteria, tier ordering, assembly algorithm, quality gates

### Contracts with Other Tasks
- T1, T2, T3 define the templates this reference describes how to use
- T6 (consistency check) follows the consistency verification rules defined here
- Sprint 2 T7 (scope-decompose workflow) reads this as required reading

## Pseudocode

```
REFERENCE STRUCTURE (references/scope-decomposition.md):

Use XML section tags following existing reference conventions.

SECTION 1 — Stopping Criteria:
  Complexity score system:
    +3: estimated lines > 250
    +2: touches > 3 files
    +2: exposes > 2 new interfaces
    +1: non-trivial state management
    +1: conditional branching in requirements
    +2: agent confidence < 80%
  Score >= 5: decompose further
  Score < 5: implement directly (leaf task)
  
  Hard depth cap: configurable (default 5, per D5)
    At max depth: MUST produce leaf task regardless of score
    At depth 4: WARN that depth is high, suggest reviewing decomposition quality
  
  Minimum size gate: if estimated total implementation < 400 lines,
    skip decomposition entirely — produce leaf task specs directly

SECTION 2 — Tier Ordering:
  Tier 1 (core/foundation): Data models, shared types, base abstractions
    Decompose FIRST, sequentially (1-2 agents)
    Their specs become constraints for Tier 2+
  
  Tier 2 (feature): Independent feature modules
    Decompose in parallel (batches of 3-5)
    Each agent handles exactly 1 module
  
  Tier 3 (integration): Modules that connect Tier 2 outputs
    Decompose LAST (need Tier 2 specs as input)

  Tier assignment rules:
    Module has no domain-specific dependencies -> Tier 1
    Module depends on Tier 1 only -> Tier 2
    Module depends on Tier 2 outputs -> Tier 3
    Circular dependency between modules -> STOP, escalate for re-decomposition

SECTION 3 — Brief Assembly Algorithm:
  INPUT: target module/component, scope_root path
  OUTPUT: single assembled agent brief (text)
  
  STEPS:
    1. Read INDEX.md at scope_root -> get project name, phase, config
    2. Read brief/project-brief.agent.md -> extract project context (first 3-5 sentences)
    3. Read architecture/system-map.agent.md -> extract architecture constraints section
    4. Identify relevant contracts:
       - Glob architecture/contracts/*--{target}*.md AND architecture/contracts/{target}--*.md
       - Include all matching contracts
    5. Identify relevant patterns:
       - Read each architecture/patterns/*.md
       - Include if applies_to is "all" or includes the target module
    6. Identify relevant decisions:
       - Read each architecture/decisions/*.md
       - Include if modules_affected includes the target module
    7. Read parent scope (if level > 0):
       - modules/{parent}/overview.agent.md or components/{parent}/spec.agent.md
    8. Assemble in this order (constraints first for primacy bias):
       a. YAML frontmatter (type, purpose, target, level, scope_root)
       b. <context> (project summary + architecture constraints)
       c. <scope> (from parent or system-map entry for this module)
       d. <interfaces> (from relevant contracts)
       e. <patterns> (from relevant pattern files)
       f. <decisions> (from relevant decision files)
       g. <task> (decomposition instructions for this level)
       h. <output_format> (file locations and naming conventions)
    9. Validate assembled brief:
       - All referenced decision IDs exist
       - All referenced contract modules exist in INDEX.md
       - No orphaned references

SECTION 4 — Quality Gates (run after each level):
  QG1: INDEX.md consistency — glob file tree, compare to INDEX.md claims
  QG2: Dual representation completeness — every .md has a sibling .agent.md
  QG3: Positive-only constraint lint — scan .agent.md for negation keywords
  QG4: Contract completeness — both sides of every contract exist
  QG5: Scope conservation — children estimated lines sum to parent within 20%
  QG6: Acceptance criteria traceability — every leaf traces_to a parent criterion

SECTION 5 — Contract Overhead Ratio:
  Before decomposing a task, estimate:
    contract_files = number of new .md + .agent.md files
    contract_lines = contract_files * 50 (average template size)
    implementation_lines = estimated leaf task total
  If contract_lines / implementation_lines > 0.30:
    SKIP decomposition — implement directly
  This prevents over-decomposition of small tasks.

SECTION 6 — Decision Numbering Convention:
  Global sequential: D001, D002, D003...
  When parallel agents might create decisions simultaneously:
    Reserve blocks per module: agent for module A gets D010-D019, module B gets D020-D029
    The orchestrator assigns the blocks before spawning
  
SECTION 7 — INDEX.md Update Protocol:
  Per D3: ONLY the orchestrator updates INDEX.md
  Parallel agents write to their own directories (modules/<name>/)
  After a batch completes, the orchestrator:
    1. Reads all agent outputs (new files in modules/*/)
    2. Validates each output against expected template structure
    3. Updates INDEX.md module status table atomically
    4. Writes INDEX.md to temp file first, then renames (atomic write)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/references/scope-decomposition.md` | CREATE | New reference document with all decomposition rules |

## Acceptance Criteria
- [ ] Reference file exists at the specified path
- [ ] Contains all 7 sections: Stopping Criteria, Tier Ordering, Brief Assembly Algorithm, Quality Gates, Contract Overhead Ratio, Decision Numbering, INDEX.md Update Protocol
- [ ] Stopping criteria include the complexity score table with specific thresholds
- [ ] Tier ordering specifies the 3 tiers with assignment rules
- [ ] Brief assembly algorithm is step-by-step with specific file paths and glob patterns
- [ ] Quality gates QG1-QG6 are defined with specific checks
- [ ] Contract overhead ratio formula is explicit (30% threshold)
- [ ] Decision numbering reservation scheme handles parallel agents
- [ ] INDEX.md update protocol specifies atomic writes
- [ ] References D3, D5, D7 decisions by ID

## Edge Cases
- Module with no contracts: assembly step 4 returns empty list — brief has empty interfaces section
- No patterns applicable: assembly step 5 returns empty list — brief omits patterns section entirely
- All modules in same tier: no ordering needed — all parallel in one batch
