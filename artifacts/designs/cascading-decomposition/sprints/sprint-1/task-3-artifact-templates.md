> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/task-3-artifact-templates.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D7
> **open_questions:** none

# Task 3: Create Small Artifact Templates (Decision, Contract, Pattern)

## Goal
Create three templates for the individual files that live in `architecture/decisions/`, `architecture/contracts/`, and `architecture/patterns/`. These are the building blocks that get assembled into agent briefs. Each file is small, focused, and has one job.

## Context
- The exploration found that Design by Contract, Consumer-Driven Contracts, and WBS principles all apply
- Each decision, contract, and pattern gets its own file (many-small-files principle)
- These files are assembled into agent briefs at spawn time — their format must be parseable
- Read existing PLAN.md Decisions Log format for continuity: `plugins/architect/skills/architect/templates/plan.md`
- Read the requirements doc Section 6 for contract and amendment format examples

## Interface Specification

### Inputs
- Created by architect during Level 0 (architecture phase) and refined during subsequent levels

### Outputs
- Read by brief assembly logic when constructing agent briefs
- Read by consistency verification agent when checking cross-module alignment
- Read by users during review gates

### Contracts with Other Tasks
- T2 (agent brief templates) references these as the source files that get included in `<decisions>`, `<interfaces>`, and `<patterns>` sections
- T4 (scope-decomposition reference) defines how these files are discovered and assembled

## Pseudocode

```
DECISION RECORD (architecture/decisions/DNNN-slug.md):

METADATA BLOCKQUOTE:
  type: decision
  id: D001 (sequential numbering, global across scope/)
  decided_at: level-0 | level-1 | level-N
  status: final | superseded-by-DNNN
  modules_affected: [list of module names this constrains]

CONTENT:
  # Decision DNNN: [Title]
  
  ## Decision
  [What was decided — 1-3 sentences]
  
  ## Rationale
  [Why — tied to project constraints, user requirements, or technical evidence]
  
  ## Alternatives Considered
  - [Alternative 1] — rejected because [reason]
  - [Alternative 2] — rejected because [reason]
  
  ## Constraints This Creates
  - [Constraint 1 — what downstream work must follow]
  - [Constraint 2]
  
  ## This is final. No implementation agent may revisit this.

---

INTERFACE CONTRACT (architecture/contracts/module-a--module-b.md):

METADATA BLOCKQUOTE:
  type: interface-contract
  between: [module-a, module-b]
  version: 1 (increments when amended)
  created_at: level-0
  last_modified: level-1

CONTENT:
  # Contract: [module-a] <-> [module-b]
  
  ## [module-a] provides to [module-b]:
  - function_name(param: type) -> return_type
    Guarantee: [what the caller can rely on]
  
  ## [module-b] provides to [module-a]:
  - function_name(param: type) -> return_type
    Guarantee: [what the caller can rely on]
  
  ## Data Formats
  [Shared types, structures, schemas that cross the boundary]
  
  ## Error Handling
  [What happens when calls fail — specific error types, not "handle errors"]

---

CROSS-CUTTING PATTERN (architecture/patterns/pattern-name.md):

METADATA BLOCKQUOTE:
  type: pattern
  name: [pattern name]
  applies_to: [all | list of specific modules]
  created_at: level-0

CONTENT:
  # Pattern: [Name]
  
  ## When To Use
  [Concrete trigger — "every endpoint handler", "every database access", etc.]
  
  ## The Pattern
  ```[language]
  [CONCRETE CODE — not abstract guidelines. Copy-pasteable example.]
  ```
  
  ## Variations
  [If the pattern has module-specific variations, show each]
  
  ## Positive Constraints
  - USE ONLY [specific imports/functions]
  - FOLLOW [specific convention]
  - SECURITY: [negation allowed here if needed]
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/decision-record.md` | CREATE | Decision record template |
| `plugins/architect/skills/architect/templates/interface-contract.md` | CREATE | Interface contract template |
| `plugins/architect/skills/architect/templates/cross-cutting-pattern.md` | CREATE | Cross-cutting pattern template |

## Acceptance Criteria
- [ ] All three template files exist at the specified paths
- [ ] Decision record has: metadata, decision, rationale, alternatives, constraints, finality statement
- [ ] Interface contract has: metadata with version, bidirectional provides sections, data formats, error handling
- [ ] Cross-cutting pattern has: metadata, concrete code example (not abstract), positive constraints
- [ ] All metadata blockquotes follow existing convention
- [ ] Decision record includes the "This is final" statement
- [ ] Contract template shows bidirectional interface (A->B and B->A)
- [ ] Pattern template includes both the code example AND the positive constraint framing
- [ ] All templates include inline guidance comments

## Edge Cases
- Unidirectional contract: One module provides to another but not vice versa — template handles this (B->A section can say "None")
- Pattern that applies to only one module: applies_to field handles this
- Superseded decision: status field shows "superseded-by-DNNN" with reference to replacement
