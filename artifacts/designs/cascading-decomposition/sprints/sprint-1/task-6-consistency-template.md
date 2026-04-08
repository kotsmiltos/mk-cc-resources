> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/task-6-consistency-template.md
> **sprint:** 1
> **status:** planned
> **depends_on:** T2
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D3
> **open_questions:** none

# Task 6: Create Consistency Check Prompt Template

## Goal
Create the prompt template for the consistency verification agent that runs after each batch of parallel decomposition agents. This agent reads all sibling module/component specs from a batch and checks that their interfaces align, their patterns are consistent, and their scope boundaries don't overlap or leave gaps.

## Context
- The consistency verifier is the sole automated quality mechanism between decomposition levels
- It runs AFTER each tiered batch (after Tier 1, after each Tier 2 batch, after Tier 3)
- It reads the .agent.md files from the batch (not the .md files — it's checking the agent contracts, not the rationale)
- Its output is a structured report that the user reviews at the gate
- The agent is spawned by the orchestrator (scope-decompose workflow) as a subagent
- Read how existing QA agents work: `plugins/architect/skills/architect/workflows/review.md`

## Interface Specification

### Inputs
- All .agent.md files from the current batch (sibling module/component specs)
- The architecture contracts that define interfaces between these modules
- INDEX.md for module status context

### Outputs
- A consistency report listing: mismatches found, gaps identified, or "all clear"

### Contracts with Other Tasks
- T2 (agent brief templates) defines the format this agent reads
- T3 (contract template) defines the interface contract format
- T4 (scope-decomposition reference) defines when this agent runs (after each batch)

## Pseudocode

```
TEMPLATE STRUCTURE (templates/consistency-check.md):

The template defines the PROMPT given to the consistency verification agent.
It is an agent prompt template, not a document template.

PROMPT STRUCTURE:
  ROLE: You are a consistency verifier checking cross-module alignment.
  
  INPUTS PROVIDED (by the orchestrator):
    - Architecture contracts relevant to this batch
    - All .agent.md specs from the current batch
    - INDEX.md module status
  
  CHECK 1 — Interface Alignment:
    For each contract between modules A and B:
      Read A's .agent.md -> find what A says it provides
      Read B's .agent.md -> find what B says it consumes from A
      VERIFY: A's provides matches B's consumes (name, types, guarantees)
      If mismatch: record the specific mismatch (what A says vs what B says)
  
  CHECK 2 — Scope Gaps:
    For each parent acceptance criterion:
      Find which children trace_to this criterion
      If no child traces to it: FLAG as scope gap
      If multiple children trace to it: VERIFY they're complementary, not overlapping
  
  CHECK 3 — Pattern Consistency:
    For each cross-cutting pattern that applies to multiple modules in this batch:
      Verify each module's spec references the pattern correctly
      Flag any module that defines its own variant of a shared pattern
  
  CHECK 4 — Dependency Sanity:
    Check for circular dependencies between modules in this batch
    Verify tier assignments match actual dependency directions
  
  CHECK 5 — Naming Consistency:
    Verify module slugs in contracts match module directory names
    Verify decision IDs referenced exist in architecture/decisions/
  
  OUTPUT FORMAT:
    ## Consistency Report: [Batch description]
    
    ### Interface Alignment
    [PASS or list of mismatches with specific details]
    
    ### Scope Coverage
    [PASS or list of uncovered parent criteria]
    
    ### Pattern Consistency
    [PASS or list of pattern deviations]
    
    ### Dependency Sanity
    [PASS or list of issues]
    
    ### Naming Consistency
    [PASS or list of mismatches]
    
    ### Summary
    - Total checks: [N]
    - Passed: [N]
    - Issues: [N] (with severity: blocking | warning)
    
    ### Verdict
    CLEAR — no issues found
    WARNINGS — [N] warnings, can proceed with user acknowledgment
    BLOCKING — [N] blocking issues, must resolve before next level
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/consistency-check.md` | CREATE | Consistency verification agent prompt template |

## Acceptance Criteria
- [ ] Template file exists at the specified path
- [ ] Contains all 5 check categories (Interface Alignment, Scope Coverage, Pattern Consistency, Dependency Sanity, Naming Consistency)
- [ ] Each check specifies what to compare and what constitutes a mismatch
- [ ] Output format includes Summary with counts and Verdict with three levels (CLEAR, WARNINGS, BLOCKING)
- [ ] Template is structured as an agent prompt (ROLE + INPUTS + CHECKS + OUTPUT), not a document template
- [ ] Interface alignment check specifies comparing provides vs consumes with type matching
- [ ] Scope coverage check implements the WBS 100% rule via traces_to chains

## Edge Cases
- Batch with only 1 module: Interface alignment has nothing to cross-check — report as CLEAR with note "single module in batch"
- Module with no contracts: Skip interface alignment for that module
- All checks pass: Report CLEAR, do not pad with observations about what was checked
