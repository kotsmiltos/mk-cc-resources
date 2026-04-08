> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-2/task-8-parallel-spawning.md
> **sprint:** 2
> **status:** planned
> **depends_on:** T7
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D3, D4, D7, D11
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 8: Parallel Agent Spawning Logic

## Goal
Define the agent spawning mechanism within the scope-decompose workflow. This task fills in Step 5 of T7's workflow with the concrete logic for spawning decomposition agents in tiered parallel batches, constructing their prompts from assembled briefs, handling agent failures, and collecting results.

## Context
- The spawning logic lives INSIDE T7's workflow (`workflows/scope-decompose.md` Step 5)
- Read `references/scope-decomposition.md` — tier ordering, batch sizes, concurrent safety rules
- Read `templates/agent-brief-decompose.md` — the output format agents must produce
- Per D3: agents write only to their own directories, never INDEX.md
- Per D4: agents co-author both .md and .agent.md in a single pass
- Per D7: agent prompts use positive framing (SECURITY: prefix for exceptions)
- Per D11: task IDs use `{module}-t{NN}` format

## Interface Specification

### Inputs
- Assembled briefs from T9 (one per agent to spawn)
- Tier plan from T7 Step 3 (batch assignments, execution order)
- Reserved decision ID blocks from T7 Step 3

### Outputs
- Agent output files in `scope_root/modules/{module}/` (or deeper for component-level)
- Success/failure status per agent
- Collected outputs for T10 consistency verification

### Contracts with Other Tasks
- T7 provides: tier plan, assembled briefs, decision ID blocks
- T9 provides: assembled brief text for each agent
- T10 consumes: agent outputs for consistency verification
- This task's spawning section is integrated into T7's workflow Step 5

## Pseudocode

```
SPAWNING LOGIC (embedded in workflows/scope-decompose.md Step 5):

FOR each batch in tier plan (Tier 1 first, Tier 2 batches, Tier 3 last):

  CONSTRUCT AGENT PROMPTS:
  For each target in batch:
    prompt = assembled_brief (from T9)
    
    Prepend role instruction:
      "You are a decomposition agent. Your job is to break down ONE module/component
       into sub-units. You produce two files per sub-unit: a human-facing .md (with
       rationale) and an agent-facing .agent.md (contract only, positive framing).
       
       Write ONLY to your assigned directory: {output_dir}/
       Write BOTH .md and .agent.md for every unit you identify.
       Compute the SHA-256 hash of each .md and include it as source_hash in the
       sibling .agent.md YAML frontmatter.
       
       Task IDs follow {module}-t{NN} format (per D11).
       Decision IDs: use only your reserved block D{start}-D{end}.
       
       Team values — follow these unconditionally:
       - Be thorough. Surface everything you find.
       - Be direct. No filler, no hedging.
       - Nothing is too small to note or too big to attempt."
    
    Append output instructions:
      "Output directory: {scope_root}/modules/{target-slug}/
       For each sub-component:
         {target-slug}/components/{component-slug}/{component-slug}.md
         {target-slug}/components/{component-slug}/{component-slug}.agent.md
       For leaf tasks (score < 5):
         {target-slug}/tasks/{task-id}.md
         {target-slug}/tasks/{task-id}.agent.md
       
       Report at the end: component count, leaf task count, estimated total lines,
       decisions created (list IDs), any items scoring >= 5 needing further decomposition."

  SPAWN AGENTS:
  If batch is Tier 1 (sequential):
    For each target in batch:
      Spawn 1 agent with the Agent tool (subagent_type not needed — general purpose)
      Wait for completion
      Validate output immediately
      If failed: report error, ask user to retry or skip
  
  If batch is Tier 2/3 (parallel):
    Spawn all agents in batch simultaneously using multiple Agent tool calls in one message
    Each agent gets its own assembled brief + role instruction
    Wait for ALL agents to return
    
    For each agent result:
      If agent succeeded:
        Read agent output files from its target directory
        Validate: .md + .agent.md pairs exist, YAML frontmatter valid, required XML sections present
      If agent failed:
        Log failure reason
        Mark module as "failed" in batch results
        Present to user: "Agent for module {name} failed: {reason}. Retry or skip?"

  COLLECT RESULTS:
  Gather from all successful agents:
    - List of new files created (paths)
    - Component counts per module
    - Leaf task counts per module
    - Decisions created (IDs + files)
    - Modules flagged for further decomposition
  
  Pass results to T10 consistency check before proceeding to next batch
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | MODIFY | Fill in Step 5 (agent spawning) section with spawning logic, prompt templates, error handling |

## Acceptance Criteria
- [ ] Step 5 in scope-decompose.md contains the full spawning logic
- [ ] Tier 1 agents spawn sequentially (one at a time)
- [ ] Tier 2/3 agents spawn in parallel (multiple Agent tool calls in one message)
- [ ] Agent prompts include role instruction with team values
- [ ] Agent prompts include output directory and file naming conventions
- [ ] Agent prompts include reserved decision ID block range
- [ ] Agent prompts include task ID format convention (D11: `{module}-t{NN}`)
- [ ] Agent prompts use positive framing only (D7)
- [ ] Failed agents are reported with retry/skip option
- [ ] Agent output validation checks: dual files, YAML frontmatter, XML sections, source_hash
- [ ] Results collected per agent: file list, component count, leaf count, decisions, further-decomposition flags
- [ ] Consistency check (T10) runs after each batch completes

## Edge Cases
- Agent produces .md but forgets .agent.md: validation catches it, reports as failed
- Agent writes to wrong directory: validation finds no files in expected directory, reports as failed
- Agent creates decision outside reserved block: detected during INDEX.md update, flagged as warning
- All agents in a batch fail: report to user, offer to retry entire batch or abort
- Agent output exceeds context window: agent should use the context health recovery protocol
