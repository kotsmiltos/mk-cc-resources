> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-2/task-7-scope-decompose-workflow.md
> **sprint:** 2
> **status:** planned
> **depends_on:** T1-T6
> **estimated_size:** L
> **plan:** ../../PLAN.md
> **key_decisions:** D1, D3, D5, D8, D9, D10, D11
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 7: Create scope-decompose Workflow

## Goal
Create the core workflow for cascading hierarchical decomposition. This is the central new workflow that the architect uses to decompose any unit (project, module, component) at any level (L0-L5). It reads INDEX.md to determine current state, orchestrates decomposition through tiered batches of parallel agents, enforces quality gates between levels, and updates INDEX.md atomically. This workflow replaces the need for manual per-level orchestration.

## Context
- Read `references/scope-decomposition.md` (Sprint 1 T4) — this is the required reading that defines all rules
- Read `references/sprint-management.md` for context health patterns
- Read all Sprint 1 templates (`templates/index.md`, `templates/agent-brief-decompose.md`, `templates/agent-brief-implement.md`, `templates/decision-record.md`, `templates/interface-contract.md`, `templates/cross-cutting-pattern.md`, `templates/consistency-check.md`)
- This workflow is invoked by the architect's routing when the user runs `/architect scope level-N [target]`
- The workflow delegates to T8 (spawning), T9 (brief assembly), and T10 (consistency verification) — those tasks fill in specific sections marked as placeholders here

**Bundled QA improvements from Sprint 1 review:**
- Depth 3+ path convention (document recursive nesting)
- Slug validation rules (alphanumeric + hyphens, max 30 chars)
- Decision ID tracking (`next_decision_id` field in INDEX.md Decomposition Config)
- `<interface>` vs `<interfaces>` distinction documentation

## Interface Specification

### Inputs
- User command: `/architect scope level-N [target]` where N is the decomposition level and target is optional (defaults to all pending modules at that level)
- INDEX.md at scope_root (created by miltiaze or previous levels)
- All scope/ artifacts from prior levels

### Outputs
- New `.md` + `.agent.md` files for each decomposed unit
- Updated INDEX.md with module status, file inventory, level history
- Quality gate report (passed or failed with details)
- Gate review summary for user

### Contracts with Other Tasks
- T8 (parallel spawning) fills in the `<step_agent_spawning>` section
- T9 (brief assembly) provides the assembly logic called during `<step_brief_assembly>`
- T10 (consistency verification) provides the post-batch verification called during `<step_post_batch>`
- T11 (SKILL.md routing) reads this workflow and adds routing entries

## Pseudocode

```
WORKFLOW STRUCTURE (workflows/scope-decompose.md):

Use XML section tags matching existing workflow conventions.
Include <required_reading> at the top per plan.md workflow pattern.

<required_reading>
Read references/scope-decomposition.md NOW before proceeding.
</required_reading>

<process>

<step_1_intake>
  1. Read INDEX.md at scope_root
     - If INDEX.md doesn't exist: STOP. Tell user to run miltiaze requirements first.
     - Extract: phase, module status table, decomposition config, level history
  2. Determine requested level from user command
     - If level-0 and phase is brief-complete: proceed to architecture decomposition
     - If level-N and phase is decomposition-L(N-1): proceed to next-level decomposition
     - If phase doesn't match level: WARN user about level mismatch, confirm before proceeding
  3. Validate INDEX.md consistency (QG1):
     - Glob file tree under scope_root
     - Compare to INDEX.md File Inventory claims
     - If mismatch: report discrepancies, ask user to fix before proceeding
  4. Validate slug safety:
     - Check all module/component slugs against: /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/ (lowercase alphanumeric + hyphens, 2-30 chars)
     - Reject slugs containing path separators, dots, or Unicode
</step_1_intake>

<step_2_determine_targets>
  1. Read module status table from INDEX.md
  2. If user specified a target module: decompose only that module
  3. If no target: identify all modules at the current level needing decomposition
     - For level 0: all modules (none decomposed yet)
     - For level N: modules with status L(N-1)-done that are NOT marked "ready"
  4. For each target, check minimum size gate (D10):
     - If estimated implementation < 300 lines: skip decomposition, mark as leaf-ready
     - Report skipped modules to user
  5. For each remaining target, check contract overhead ratio:
     - If ratio > 30%: skip decomposition, produce leaf task spec directly
     - Report skipped modules to user
  6. For each remaining target, compute complexity score:
     - Apply the 6-factor scoring from scope-decomposition reference
     - Score >= 5: confirm decomposition
     - Score < 5: convert to leaf task
  7. Check depth cap (D5):
     - If current level == max_depth (default 5): force all remaining to leaf tasks
     - If current level == max_depth - 1: WARN about high depth, suggest reviewing decomposition quality
</step_2_determine_targets>

<step_3_tier_planning>
  1. Assign each target to a tier per scope-decomposition reference rules:
     - Tier 1: no domain-specific dependencies
     - Tier 2: depends on Tier 1 only
     - Tier 3: depends on Tier 2 outputs
     - Circular dependency: STOP, escalate to user
  2. Plan execution batches:
     - Tier 1 batch: sequential (1-2 agents)
     - Tier 2 batches: parallel (groups of 3-5 modules)
     - Tier 3 batch: after Tier 2 complete
  3. Reserve decision ID blocks per scope-decomposition reference:
     - Read next_decision_id from INDEX.md Decomposition Config
     - Assign blocks of 10 per agent (agent A: D{next}-D{next+9}, agent B: D{next+10}-D{next+19}, ...)
     - Update next_decision_id in memory (written to INDEX.md in Step 7)
  4. Determine path structure for outputs:
     - Level 0: artifacts/scope/architecture/ (system-map, contracts, patterns, decisions)
     - Level 1: artifacts/scope/modules/{module-slug}/
     - Level 2: artifacts/scope/modules/{module-slug}/components/{component-slug}/
     - Level 3+: artifacts/scope/modules/{module}/components/{comp}/components/{sub-comp}/
       (recursive nesting — each level adds a components/ subdirectory)
</step_3_tier_planning>

<step_4_brief_assembly>
  [T9 defines the detailed assembly logic. This step calls it.]
  For each agent to spawn in the current batch:
    1. Call the brief assembly algorithm (T9) with:
       - target name
       - scope_root path
       - decomposition level
       - reserved decision ID block
    2. Receive assembled brief text
    3. Validate assembled brief (T9 Step 9)
    4. Store assembled brief for the spawning step
</step_4_brief_assembly>

<step_5_agent_spawning>
  [T8 defines the detailed spawning logic. This step calls it.]
  For each batch (Tier 1 first, then Tier 2 batches, then Tier 3):
    1. Spawn agents per T8 logic
    2. Wait for all agents in batch to complete
    3. Validate agent outputs per INDEX.md update protocol Step 2:
       - Both .md and .agent.md exist
       - YAML frontmatter has required fields
       - Required XML sections present
         - Decomposition briefs: <context>, <scope>, <interfaces>, <patterns>, <decisions>, <task>, <output_format>
         - Implementation briefs: <constraint>, <read_first>, <interface>, <files>, <verify>, <contract>
       - source_hash matches sibling .md
       Note: <interface> (singular) is for implementation function signatures.
             <interfaces> (plural) is for decomposition module contracts.
    4. If any agent failed: report failure, offer to retry or skip
    5. Run post-batch consistency check (T10)
</step_5_agent_spawning>

<step_6_quality_gates>
  Run all quality gates from scope-decomposition reference:
  QG1: INDEX.md consistency (glob vs claims)
  QG2: Dual representation completeness (every .md has .agent.md)
  QG3: Positive-only constraint lint (scan .agent.md for negation, exempt SECURITY:)
  QG4: Contract completeness (both contract modules exist in INDEX.md)
  QG5: Scope conservation (children sum within 20% of parent)
  QG6: Scope coverage via Owns-list matching (per D9)
  
  If any gate fails: follow gate failure protocol
  Present results to user at gate review
</step_6_quality_gates>

<step_7_index_update>
  Update INDEX.md per the update protocol in scope-decomposition reference:
  1. Update module status table (level, components, leaf tasks, status)
  2. Update file inventory (new artifact counts)
  3. Append to level history (date, modules processed, agents spawned, amendments)
  4. Update decomposition config: next_decision_id = highest used + 1
  5. Update phase field (decomposition-LN)
  6. Atomic write (temp file + rename)
</step_7_index_update>

<step_8_gate_review>
  Present to user:
  - Level N decomposition complete
  - Modules processed: [count]
  - Quality gates: [passed/failed summary]
  - Consistency check: [CLEAR/WARNINGS/BLOCKING]
  
  Ask user to:
  - Approve: proceed to next level or implementation
  - Reject module(s): specify which modules to redo
  - Correct: user edits .md files, then re-derives .agent.md
  
  After approval:
  - Identify modules ready for implementation (all children are leaf tasks)
  - Identify modules needing further decomposition
  - Suggest next command: /architect scope level-(N+1) or /ladder-build
</step_8_gate_review>

</process>
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | CREATE | Core decomposition workflow with all 8 steps |
| `plugins/architect/skills/architect/references/scope-decomposition.md` | MODIFY | Add depth 3+ path convention (recursive components/), slug validation regex, `<interface>` vs `<interfaces>` tag distinction note, task ID format documentation (D11) |
| `plugins/architect/skills/architect/templates/index.md` | MODIFY | Add `next_decision_id` row to Decomposition Config table (default: 1) |

## Acceptance Criteria
- [ ] Workflow file exists at `workflows/scope-decompose.md`
- [ ] Workflow follows existing workflow conventions (`<required_reading>`, `<process>`, step tags)
- [ ] Step 1 reads and validates INDEX.md (QG1)
- [ ] Step 2 checks minimum size gate (300 lines per D10), contract overhead ratio (30%), and complexity score
- [ ] Step 3 assigns tiers and plans batches per scope-decomposition reference rules
- [ ] Step 3 reserves decision ID blocks for parallel agents
- [ ] Step 4 calls T9's brief assembly logic (marked as delegation, not reimplemented)
- [ ] Step 5 calls T8's spawning logic (marked as delegation, not reimplemented)
- [ ] Step 5 validates agent output including both `<interface>` and `<interfaces>` tag variants with documented distinction
- [ ] Step 6 runs all quality gates QG1-QG6 including QG6 redefined per D9 (Owns-list matching)
- [ ] Step 7 updates INDEX.md atomically including next_decision_id
- [ ] Step 8 presents gate review to user with approve/reject/correct options
- [ ] Depth 3+ path convention documented: recursive `components/*/components/*/` nesting
- [ ] Slug validation regex added to scope-decomposition reference
- [ ] `next_decision_id` added to INDEX.md template Decomposition Config table
- [ ] Workflow handles level 0 (architecture) differently from level 1+ (decomposition)

## Edge Cases
- Level 0 with no brief: INDEX.md exists but brief/ is empty — STOP, tell user to run miltiaze first
- All modules skip decomposition (all under 300 lines): report all as leaf-ready, skip to implementation suggestion
- Single module in a tier: batch of 1 is valid — no parallelism needed
- User specifies target that doesn't exist in INDEX.md: error with list of valid targets
- Depth 4 warning: present warning but allow user to proceed
- User runs level N before level N-1 is complete: warn about level mismatch, confirm before proceeding

## Notes
- This task creates the workflow skeleton. T8, T9, T10 fill in specific delegated sections.
- The workflow references the scope-decomposition reference as required reading — all rules live there, not duplicated in the workflow.
- The 3 QA improvements (depth paths, slug validation, decision tracking) are small additions to existing files, bundled here to avoid micro-tasks.
