> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-2/task-10-consistency-integration.md
> **sprint:** 2
> **status:** planned
> **depends_on:** T6, T7
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D3, D9
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 10: Consistency Verification Integration

## Goal
Integrate the consistency check agent prompt template (Sprint 1 T6) into the scope-decompose workflow. After each tiered batch of decomposition agents completes, the workflow spawns a consistency verification agent that reads all sibling specs from the batch and checks cross-module alignment. This task fills in the post-batch verification step in T7's workflow.

## Context
- The consistency check template is already defined at `templates/consistency-check.md` (Sprint 1 T6)
- The template is an agent prompt with placeholders that the orchestrator fills in before spawning
- The consistency check runs AFTER each batch completes, BEFORE the next batch starts
- Per D3: the consistency verifier reads .agent.md files, never writes to INDEX.md
- Per D9: scope coverage uses Owns-list matching (consistency check CHECK 2 already implements this)
- The Sprint 1 QA fixed CHECK 4 (tier/level conflation) — the template now correctly reads tiers from INDEX.md

## Interface Specification

### Inputs
- All .agent.md files from the just-completed batch
- Interface contract files between modules in the batch
- INDEX.md path for module status cross-reference
- Parent .agent.md path (the unit that was decomposed into this batch)

### Outputs
- Consistency report with verdict: CLEAR, WARNINGS, or BLOCKING
- Per-check results (5 checks)
- Summary counts

### Contracts with Other Tasks
- T6 (consistency check template) provides the prompt template
- T7 (workflow) hosts this as the post-batch step
- T8 (spawning) provides the batch results (list of output files)

## Pseudocode

```
POST-BATCH CONSISTENCY VERIFICATION (embedded in workflows/scope-decompose.md,
called by Step 5 after each batch):

FOR each completed batch:
  
  1. COLLECT INPUTS:
     batch_description = "Tier {N}: {comma-separated module names}"
     parent_spec_path = the .agent.md of the parent unit that was decomposed
     batch_spec_paths = list of all .agent.md files produced by agents in this batch
     contract_paths = list of all contracts between modules in this batch
       (glob: contracts/*--{moduleA}.md and contracts/{moduleA}--*.md for each module in batch,
        then deduplicate to only contracts where BOTH modules are in this batch)
     index_path = {scope_root}/INDEX.md

  2. FILL TEMPLATE PLACEHOLDERS:
     Read templates/consistency-check.md
     Replace [BATCH_DESCRIPTION] with batch_description
     Replace [PARENT_AGENT_MD_PATH] with parent_spec_path
     Replace [LIST_OF_AGENT_MD_PATHS] with batch_spec_paths (one per line)
     Replace [LIST_OF_CONTRACT_PATHS] with contract_paths (one per line)
     Replace [INDEX_MD_PATH] with index_path

  3. SPAWN CONSISTENCY VERIFIER:
     Use the Agent tool with the filled template as the prompt
     The agent reads all listed files and runs 5 checks:
       CHECK 1: Interface Alignment (three-way: A provides vs B consumes vs contract)
       CHECK 2: Scope Coverage (parent Owns → child Owns mapping per D9)
       CHECK 3: Pattern Consistency (shared patterns applied uniformly)
       CHECK 4: Dependency Sanity (no cycles, tiers match per INDEX.md)
       CHECK 5: Naming Consistency (slugs, decision IDs, scope name attributes)

  4. PARSE VERDICT:
     Read the agent's output
     Find the "### Verdict" section
     Extract verdict: CLEAR, WARNINGS, or BLOCKING
     Extract issue counts from "### Summary"

  5. ROUTE BASED ON VERDICT:
     CLEAR:
       Log "Consistency check passed for {batch_description}"
       Proceed to next batch or quality gates
     
     WARNINGS:
       Present warnings to user:
         "Consistency check found {N} warnings for {batch_description}:
          {list of warnings from report}
          Proceed anyway? (warnings are noted but don't block)"
       If user approves: proceed
       If user wants to fix: pause, let user edit files, then re-run consistency check
     
     BLOCKING:
       Present blocking issues to user:
         "Consistency check found {N} blocking issues for {batch_description}:
          {list of blocking issues from report}
          These must be resolved before continuing."
       Options:
         a. Re-run affected agents (specify which modules to redo)
         b. User manually fixes the .md and .agent.md files, then re-run check
         c. Escalate to architect for re-decomposition at a higher level
       Do NOT proceed to the next batch until blocking issues are resolved

  6. SAVE REPORT:
     Write the consistency report to:
       {scope_root}/reports/consistency-L{level}-{batch-slug}.md
     This provides an audit trail even if the session ends
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | MODIFY | Add post-batch consistency verification section to Step 5, add report saving logic |

## Acceptance Criteria
- [ ] Post-batch consistency verification section exists in scope-decompose.md Step 5
- [ ] Template placeholders are filled correctly before spawning
- [ ] Contract path collection finds only contracts where BOTH modules are in the current batch
- [ ] Verdict is parsed from the agent's output (CLEAR/WARNINGS/BLOCKING)
- [ ] CLEAR verdict: proceeds silently to next batch
- [ ] WARNINGS verdict: presents to user with proceed/fix options
- [ ] BLOCKING verdict: halts progression, presents resolution options
- [ ] Consistency report saved to disk for audit trail
- [ ] Single-module batch: verifier spawned but reports CLEAR for interface alignment with explanatory note

## Edge Cases
- Batch with 1 module: verifier spawned, most checks report CLEAR with notes
- No contracts between batch modules: CHECK 1 reports CLEAR
- Verifier agent fails (crash, context overflow): report failure to user, offer to skip consistency check or retry
- User chooses to manually fix files: workflow re-runs consistency check on the fixed files
- Blocking issue resolved by re-running one agent: only the affected module's agent re-runs, not the whole batch
