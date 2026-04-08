<workflow>

<required_reading>
Read ALL of these before proceeding. They define the rules, formats, and constraints for every step below.

- references/scope-decomposition.md — stopping criteria, tier ordering, brief assembly, quality gates, decision numbering, task ID format, INDEX.md update protocol
- references/sprint-management.md — context health patterns, reassessment triggers
- templates/index.md — INDEX.md structure and conventions
- templates/agent-brief-decompose.md — decomposition agent output format
- templates/agent-brief-implement.md — implementation agent (leaf task) output format
- templates/decision-record.md — decision record format
- templates/interface-contract.md — interface contract format
- templates/cross-cutting-pattern.md — pattern file format
- templates/consistency-check.md — consistency verifier agent prompt
- templates/system-map.md — system-map format (architecture overview)
</required_reading>

<overview>
Cascading hierarchical decomposition workflow. Decomposes any unit (project, module, component) at any level (L0-L5) through tiered parallel agents, quality gates, and atomic INDEX.md updates. Invoked by `/architect scope level-N [target]`.

Level 0 produces architecture: system-map, contracts, patterns, decisions, module boundaries.
Level 1+ decomposes modules and components into smaller units until leaf task size is reached.

Each level follows the same 8-step process. The orchestrator (this workflow) controls INDEX.md. Parallel agents write only to their own directories.
</overview>

<process>

<step_1_intake>

1. **Locate scope root.**
   Check for INDEX.md at the scope root. The scope root is `artifacts/scope/` for greenfield projects or `artifacts/scope/features/<slug>/` for feature-scoped work. Check both locations, preferring a feature scope root if a slug was provided in the command.
   - If INDEX.md missing but `{scope_root}/INDEX.md.tmp` exists: rename INDEX.md.tmp to INDEX.md. This recovers from a previous session crash during the atomic write step.
   - If INDEX.md exists: read it. Extract `scope_root`, `phase`, module status table, decomposition config, level history.
   - If INDEX.md missing (and no .tmp): STOP. Tell user: "No scope index found. Run miltiaze requirements first to produce the project brief and initialize INDEX.md."

2. **Parse user command.**
   Extract level number N from `/architect scope level-N [target]`.
   - If no level specified: infer from INDEX.md phase.
     - `brief-complete` -> suggest level-0
     - `discovery-complete` -> suggest level-0
     - `decomposition-LN` -> suggest level-(N+1)
     - `architecture` -> suggest level-1
   - If target specified: validate it exists in INDEX.md module status table. If not found: STOP with error listing valid module names.

3. **Validate level-phase alignment.**
   - Level 0 requires phase `brief-complete`, `discovery-complete`, or `architecture` (resuming).
   - Level N requires phase `decomposition-L(N-1)` or `decomposition-LN` (resuming).
   - If phase does not match: WARN user about level mismatch. Show current phase and requested level. Confirm before proceeding.

4. **Validate INDEX.md consistency (QG1).**
   Glob the file tree under scope_root. Compare discovered files to INDEX.md File Inventory claims.
   - If mismatch: report discrepancies (files on disk not in INDEX.md, INDEX.md entries pointing to missing files).
   - Ask user to fix before proceeding. Do not silently ignore.

5. **Validate slug safety.**
   Check all module/component slugs against: `/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/`
   - Lowercase alphanumeric + hyphens only
   - Length: 2-30 characters
   - Must start and end with alphanumeric (no leading/trailing hyphens)
   - Reject slugs containing path separators, dots, spaces, or Unicode
   If any invalid slug found: STOP with specific slug and validation failure reason.

</step_1_intake>

<step_2_determine_targets>

1. **Read module status table** from INDEX.md.

2. **Identify targets.**
   - If user specified a target module: decompose only that module.
   - If no target specified:
     - Level 0: all modules listed (none decomposed yet).
     - Level 0 with discovery context: if INDEX.md phase was `discovery-complete`, modules already have status `existing` or `impacted` from discovery. Use impacted modules as the primary decomposition targets. Existing (untouched) modules are included in the system map but may not need full decomposition. Modules with status `new` (created for the feature, not yet in the codebase) are also decomposition targets alongside impacted modules.
     - Level N: modules with status `L(N-1)-done` that are NOT marked `ready`.

3. **Apply minimum size gate (D10).**
   For each target, read its estimated implementation lines.
   - If estimated lines <= 300: skip decomposition. Mark as leaf-ready.
   - Report skipped modules to user: "[module] is under 300 lines — producing leaf task spec directly."

4. **Apply contract overhead ratio check.**
   For each remaining target:
   ```
   contract_files = estimated child count * 2 (one .md + one .agent.md per child)
   contract_lines = contract_files * 50
   overhead_ratio = contract_lines / estimated_implementation_lines
   ```
   - If overhead_ratio > 0.30: skip decomposition. Produce leaf task spec directly.
   - Report skipped modules to user: "[module] overhead ratio is [X]% — implementing directly."

5. **Apply complexity scoring.**
   For each remaining target, compute the 6-factor complexity score from scope-decomposition.md:

   | Factor | Score |
   |--------|-------|
   | Estimated implementation > 250 lines | +3 |
   | Touches > 3 files | +2 |
   | Exposes > 2 new interfaces | +2 |
   | Non-trivial state management | +1 |
   | Conditional branching in requirements | +1 |
   | Agent confidence < 80% | +2 |

   - Score >= 5: confirm decomposition.
   - Score < 5: convert to leaf task.
   - Report conversions to user.

6. **Check depth cap (D5).**
   - If current level == max_depth (from Decomposition Config, default 5): force ALL remaining targets to leaf tasks. Report to user. For each forced leaf, check estimated_lines against the overflow threshold (300). If estimated_lines is missing, null, zero, or negative (none are meaningful estimates), issue the forced-leaf warning without the line count comparison: "Module {name} forced to leaf at depth cap with unknown size estimate. Consider restructuring if implementation produces overflow." If estimated_lines is a valid positive number and exceeds the threshold, add a prominent warning: "Module {name} forced to leaf at depth cap but estimates {N} lines (threshold: 300). Consider restructuring Level 1-2 boundaries."
   - If current level == max_depth - 1: WARN about high depth. Suggest reviewing decomposition quality. If most siblings score >= 5, module boundaries at an earlier level were likely wrong — recommend restructuring over pushing deeper.

7. **Handle "all skip" case.**
   If all targets were skipped/converted to leaf tasks: report all as leaf-ready. Suggest `/ladder-build` for implementation. Skip Steps 3-8.

</step_2_determine_targets>

<step_3_tier_planning>

1. **Assign tiers** per scope-decomposition.md tier assignment rules:
   - Module has no domain-specific dependencies -> Tier 1 (core/foundation)
   - Module depends on Tier 1 outputs only -> Tier 2 (feature)
   - Module depends on Tier 2 outputs -> Tier 3 (integration)
   - Circular dependency detected -> STOP. Escalate to user for re-decomposition.

   When all modules fall into the same tier: treat as a single parallel batch.

2. **Plan execution batches.**
   - Tier 1 batch: sequential (1-2 agents). Foundation modules share types — parallelism risks inconsistency.
   - Tier 2 batches: parallel (groups of 3-5 modules). One agent per module is a hard rule.
   - Tier 3 batch: after Tier 2 complete.

3. **Reserve decision ID blocks.**
   Read `next_decision_id` from INDEX.md Decomposition Config.
   Assign blocks of 10 per agent:
   ```
   Agent A: D{next}-D{next+9}
   Agent B: D{next+10}-D{next+19}
   Agent C: D{next+20}-D{next+29}
   ...
   ```
   Track highest assigned for INDEX.md update in Step 7.

4. **Determine output path structure.**
   - Level 0: `{scope_root}/architecture/` (system-map, contracts/, patterns/, decisions/)
   - Level 1: `{scope_root}/modules/{module-slug}/`
   - Level 2: `{scope_root}/modules/{module-slug}/components/{component-slug}/`
   - Level 3+: recursive nesting — each level adds a `components/` subdirectory:
     `{scope_root}/modules/{mod}/components/{comp}/components/{sub-comp}/`
   - General formula for depth D (D >= 2):
     `{scope_root}/modules/{level-1-slug}/components/{level-2-slug}/.../components/{level-D-slug}/`

</step_3_tier_planning>

<step_4_brief_assembly>
<!-- T9 defines the detailed assembly logic. This step calls it. -->

For each agent to spawn in the current batch:

1. Call the brief assembly procedure (defined below in this workflow) with:
   - target: module or component name
   - scope_root: path from INDEX.md
   - level: current decomposition level
   - decision_id_block: reserved block range from Step 3

2. Receive assembled brief text.

3. Validate assembled brief (assembly procedure Step 9):
   - All decision IDs referenced exist in architecture/decisions/
   - All contract modules exist in INDEX.md module status table
   - source_hash of each referenced .agent.md matches its sibling .md
   - No orphaned references

4. If validation fails: report error with specifics. Do not spawn the agent until the source files are fixed.

5. Store validated brief for the spawning step.

<!-- BRIEF ASSEMBLY PROCEDURE -->

The assembly constructs a single, self-contained agent brief from many small files on disk.
The agent reads ONE document — the orchestrator assembles it at spawn time.

Follows the algorithm in scope-decomposition.md Brief Assembly section exactly.

**Assembly Step 1 — Read INDEX.md.**
Read `{scope_root}/INDEX.md`. Extract: project name, current phase, decomposition config
(max depth, leaf size target, overflow threshold, parallel batch size, next_decision_id).

**Assembly Step 2 — Read project brief.**
Read `{scope_root}/brief/project-brief.agent.md`.
Extract the first 3-5 sentences as project summary for the `<context>` section.
Feature flow variant: read `{scope_root}/brief/feature-brief.agent.md` instead.

If `{scope_root}/discovery/` exists (feature flow after discovery): also read discovery artifacts:
  - `{scope_root}/discovery/codebase-snapshot.agent.md` — existing architecture context
  - `{scope_root}/discovery/impact-map.agent.md` — feature impact on existing code
Include this as an `<existing_codebase>` section in the assembled brief (after `<context>`, before `<scope>`).
If `{scope_root}/discovery/` exists but is empty or missing expected files: WARN user — "Discovery directory exists but artifacts are incomplete. Consider re-running `/architect scope discover` before proceeding." Allow user to continue or abort.

**Assembly Step 3 — Read system map.**
Read `{scope_root}/architecture/system-map.agent.md`.
Extract the `<architecture_constraints>` section content. These are hard constraints
injected into every agent brief's `<context>`.

**Assembly Step 4 — Find relevant contracts.**
Glob `{scope_root}/architecture/contracts/*--{target}.md`
AND  `{scope_root}/architecture/contracts/{target}--*.md`
(Contracts use double-dash separator with alphabetical module ordering.)
The first glob pattern uses exact suffix match to prevent false matches
(e.g., target "api" must not match "api-gateway").
Read each matching file, extract interface definitions.
If no contracts match: `<interfaces>` section says "No cross-module interfaces — this module is self-contained."

**Assembly Step 5 — Find relevant patterns.**
Read each file in `{scope_root}/architecture/patterns/*.md`.
Check the `applies_to` field in the metadata blockquote.
Include the pattern if `applies_to` is "all" OR the comma-separated list includes {target}.
If no patterns match: omit `<patterns>` section entirely (do not include an empty section).

**Assembly Step 6 — Find relevant decisions.**
Read each file in `{scope_root}/architecture/decisions/D*.md`.
Check `status` field — include only decisions where `status` is exactly `final`. Skip all other statuses (draft, proposed, superseded-by-*, empty string, or any unrecognized value).
Check `modules_affected` field in the metadata blockquote.
Include if {target} is listed in modules_affected.
Extract decision ID + outcome only (agents receive "what was decided", not rationale or alternatives).
If no decisions apply: omit `<decisions>` section entirely.

**Assembly Step 7 — Read parent scope (levels > 0 only).**
Level 1: read `{scope_root}/modules/{parent}/{parent}.agent.md`
Level 2: read `{scope_root}/modules/{parent-module}/components/{parent-component}/{parent-component}.agent.md`
Level 3+: follow the recursive components/ path per path_structure in scope-decomposition.md.
Extract the scope definition for the target from the parent's component breakdown.
Level 0: SKIP this step — scope comes from the system map directly.

**Assembly Step 8 — Assemble in section order.**
Section order is load-bearing. Constraints come first for primacy bias.

```
a. YAML frontmatter
   - type: agent-brief
   - purpose: decompose-module | decompose-component | implement
   - target: "{target name}"
   - level: {current decomposition level}
   - scope_root: "{scope_root path}"
   - source_hash: "{SHA-256 of corresponding .md file}"

b. <context>
   Project summary (from Step 2) + architecture constraints (from Step 3)

b2. <existing_codebase> (CONDITIONAL — only when {scope_root}/discovery/ exists)
   <architecture>{from codebase-snapshot.agent.md}</architecture>
   <impact>{from impact-map.agent.md — filtered to what this module touches}</impact>
   <patterns>{existing patterns to follow from discovery}</patterns>
   This section is omitted entirely for greenfield flow (no discovery/ directory).

c. <scope name="{target}">
   Ownership, boundaries, exclusions for this target
   (from parent scope in Step 7, or from system-map module entry for L0)
   The name attribute is required — the consistency check (CHECK 5) validates
   that it matches the target field in YAML frontmatter.

d. <interfaces>
   All relevant contracts (from Step 4)
   If empty: "No cross-module interfaces — this module is self-contained."

e. <patterns>
   All relevant patterns (from Step 5)
   If empty: OMIT this section entirely

f. <decisions>
   Decision ID + outcome pairs (from Step 6)
   If empty: OMIT this section entirely

g. <task>
   Decomposition or implementation instructions
   Include stopping criteria thresholds, decision ID block range, task ID format
   Include output location and naming conventions

h. <output_format>
   Exact file paths for the agent's output
   Specify both .md and .agent.md paths (dual representation per D4)
```

**Assembly Step 9 — Validate.**
Before handing the brief to the agent:
- All decision IDs referenced (e.g., D001, D003) exist in `{scope_root}/architecture/decisions/`
- All contract modules referenced exist in the INDEX.md module status table
- source_hash in each referenced .agent.md matches the SHA-256 of its sibling .md
- No orphaned references (a contract referencing a module not in INDEX.md)
If validation fails: report error with specifics. Fix source files before spawning.
</step_4_brief_assembly>

<step_5_agent_spawning>
<!-- T8 defines the detailed spawning logic. This step calls it. -->

For each batch (Tier 1 first, then Tier 2 batches, then Tier 3):

1. Construct agent prompts from assembled briefs (Step 4 output).
2. Spawn agents per tier rules:
   - Tier 1: sequential (one agent at a time, wait for completion before next).
   - Tier 2/3: parallel (multiple Agent tool calls in one message).
3. Wait for all agents in batch to complete.
4. Validate agent outputs:
   - Both .md and .agent.md exist for each produced unit.
   - YAML frontmatter has required fields per brief type:
     - Decomposition briefs: type, purpose, target, level, scope_root, source_hash
     - Implementation briefs: type, purpose, task, module, component, source_hash
   - Required XML sections present:
     - Decomposition briefs — required: `<context>`, `<scope>`, `<interfaces>`, `<task>`, `<output_format>`
     - Decomposition briefs — optional (omit when empty per assembly Steps 5-6): `<patterns>`, `<decisions>`
     - Implementation briefs: `<constraint>`, `<read_first>`, `<interface>`, `<files>`, `<verify>`, `<contract>`
     - Note: `<interface>` (singular) is for implementation function signatures.
       `<interfaces>` (plural) is for decomposition module contracts.
       These are intentionally different tags for different purposes.
   - source_hash in .agent.md matches SHA-256 of sibling .md.
5. If any agent failed: report failure with reason. Offer retry or skip.
6. Run post-batch consistency check (defined below).

<!-- SPAWNING LOGIC -->

**Agent Prompt Construction:**

For each target in the current batch, construct the agent prompt from:

1. **Role instruction** (prepended to every agent prompt):

```
You are a decomposition agent. Your job is to break down ONE module/component
into sub-units. You produce two files per sub-unit: a human-facing .md (with
rationale, tradeoffs, design discussion) and an agent-facing .agent.md
(YAML frontmatter + XML section contract, positive framing only).

Write ONLY to your assigned directory: {output_dir}/
Write BOTH .md and .agent.md for every unit you identify.
Compute the SHA-256 hash of each .md and include it as source_hash in the
sibling .agent.md YAML frontmatter.

Task IDs follow {module}-t{NN} format (per D11).
  Module-level: {module}-t01, {module}-t02, ...
  Component-level: {module}-{component}-t01, ...
Decision IDs: use only your reserved block D{start}-D{end}.
  If you exhaust the block, flag the overflow — the orchestrator will assign more.

Team values — follow these unconditionally:
- Be thorough. Surface everything you find.
- Be direct. No filler, no hedging.
- Nothing is too small to note or too big to attempt.

Positive framing: state what TO DO, not what to avoid. The only exception
is the SECURITY: prefix for security-critical prohibitions.
```

2. **Assembled brief** (from Step 4 — the full assembled context for this target).

3. **Existing codebase context** (CONDITIONAL — only for feature flow when `{scope_root}/discovery/` exists):

```xml
<existing_codebase>
  <architecture>{from codebase-snapshot.agent.md}</architecture>
  <impact>{from impact-map.agent.md — filtered to what this module touches}</impact>
  <patterns>{existing patterns to follow from discovery}</patterns>
</existing_codebase>
```

This section is injected between the assembled brief and output instructions. It is omitted entirely for greenfield flow (no discovery/ directory). For Level 0 agents, include the full impact map. For Level 1+ agents, filter the impact map to entries relevant to the target module only.

4. **Output instructions** (appended to every agent prompt):

```
Output directory: {output_dir}
For each sub-component (complexity score >= 5):
  {target-slug}/components/{component-slug}/{component-slug}.md
  {target-slug}/components/{component-slug}/{component-slug}.agent.md

For leaf tasks (complexity score < 5):
  {target-slug}/tasks/{task-id}.md
  {target-slug}/tasks/{task-id}.agent.md

Report at the end:
- Component count (units needing further decomposition)
- Leaf task count (units ready for implementation)
- Estimated total implementation lines
- Decisions created (list IDs used from your reserved block)
- Items scoring >= 5 that need further decomposition (list names + scores)
```

**Batch Execution:**

FOR each batch in tier plan (Tier 1 first, then Tier 2 batches, then Tier 3):

  **Tier 1 (sequential):**
  For each target in the Tier 1 batch:
    1. Spawn 1 agent with the Agent tool using the constructed prompt.
    2. Wait for the agent to complete.
    3. Validate output immediately:
       - Read the agent's output directory.
       - Check: every .md has a sibling .agent.md.
       - Check: YAML frontmatter contains required fields (type, purpose, target, level, scope_root, source_hash).
       - Check: required XML sections present (per brief type — see Step 5 validation rules above).
       - Check: source_hash matches SHA-256 of sibling .md.
    4. If validation fails: report specific errors to user. Offer: retry this agent, or skip this module.
    5. If agent crashed or returned no output: report failure. Offer retry or skip.

  **Tier 2/3 (parallel):**
  Spawn all agents in the batch simultaneously using multiple Agent tool calls in a single message.
  Each agent gets its own assembled brief + role instruction + output instructions.
  Wait for ALL agents in the batch to return.

  For each agent result:
    If agent succeeded:
      1. Read agent output files from its target directory.
      2. Validate (same checks as Tier 1 Step 3 above).
      3. If validation fails: mark module as "failed" in batch results.
    If agent failed (crash, timeout, context overflow):
      1. Log failure reason.
      2. Mark module as "failed" in batch results.

  Present failed modules to user (if any):
  ```
  Agent for module {name} failed: {reason}.
  Options:
    a. Retry this module only
    b. Skip this module (mark as needs-manual-decomposition)
    c. Retry entire batch
  ```
  If ALL agents in a batch failed: offer to retry entire batch or abort decomposition.

**Collect Results:**

After each successful batch, gather from all agents:
- List of new files created (full paths)
- Component counts per module (units needing further decomposition)
- Leaf task counts per module (units ready for implementation)
- Decisions created (IDs + file paths)
- Decision ID block overflow flags (agent reported exhausting its reserved block)
- Modules flagged for further decomposition (names + complexity scores)

If any agent flagged overflow, assign additional blocks and note the extended range for INDEX.md update in Step 7.

Pass results to consistency check (below) before proceeding to the next batch.

<!-- POST-BATCH CONSISTENCY VERIFICATION -->

After each batch completes (and agent outputs are validated), run consistency verification:

**1. Collect inputs for the verifier.**
  - `batch_description`: "Tier {N}: {comma-separated module names}"
  - `parent_spec_path`: the .agent.md of the parent unit that was decomposed into this batch
    - Level 0: use `{scope_root}/brief/project-brief.agent.md`
    - Level 1+: use the parent module/component .agent.md
  - `batch_spec_paths`: list of ALL .agent.md files produced by agents in this batch
  - `contract_paths`: list of contracts between modules in this batch
    - Glob: `contracts/*--{moduleA}.md` and `contracts/{moduleA}--*.md` for each module in batch
    - Deduplicate: only include contracts where BOTH modules are in this batch
  - `index_path`: `{scope_root}/INDEX.md`

**2. Fill template placeholders.**
  Read `templates/consistency-check.md`.
  Replace placeholders:
  - `[BATCH_DESCRIPTION]` -> batch_description
  - `[PARENT_AGENT_MD_PATH]` -> parent_spec_path
  - `[LIST_OF_AGENT_MD_PATHS]` -> batch_spec_paths (one path per line)
  - `[LIST_OF_CONTRACT_PATHS]` -> contract_paths (one path per line)
  - `[INDEX_MD_PATH]` -> index_path

**3. Spawn consistency verifier.**
  Use the Agent tool with the filled template as the prompt.
  The agent reads all listed files and runs 5 checks:
  - CHECK 1: Interface Alignment (three-way: A provides vs B consumes vs contract)
  - CHECK 2: Scope Coverage (parent Owns -> child Owns mapping, per D9)
  - CHECK 3: Pattern Consistency (shared patterns applied uniformly)
  - CHECK 4: Dependency Sanity (no cycles, tiers match per INDEX.md)
  - CHECK 5: Naming Consistency (slugs, decision IDs, scope name attributes)

**4. Parse verdict.**
  Read the agent's output. Find the "### Verdict" section.
  Extract verdict: CLEAR, WARNINGS, or BLOCKING.
  Extract issue counts from "### Summary".

**5. Route based on verdict.**

  **CLEAR:**
  Log "Consistency check passed for {batch_description}."
  Proceed to next batch or quality gates.

  **WARNINGS:**
  Present warnings to user:
  ```
  Consistency check found {N} warnings for {batch_description}:
  {list of warnings from report}

  Proceed anyway? (Warnings are noted but do not block.)
  ```
  If user approves: proceed.
  If user wants to fix: pause. Let user edit files. Re-run consistency check on the fixed files.

  **BLOCKING:**
  Present blocking issues to user:
  ```
  Consistency check found {N} blocking issues for {batch_description}:
  {list of blocking issues from report}

  These must be resolved before continuing. Options:
    a. Re-run affected agents (specify which modules to redo)
    b. Manually fix the .md and .agent.md files, then re-run check
    c. Escalate to architect for re-decomposition at a higher level
  ```
  Do NOT proceed to the next batch until blocking issues are resolved.

**6. Save report.**
  Write the consistency report to:
  `{scope_root}/reports/consistency-L{level}-{batch-slug}.md`
  where batch-slug is derived from the tier and module names (e.g., `tier-1-core`, `tier-2-auth-parser-storage`).
  This provides an audit trail even if the session ends.

**Verifier failure handling:**
  If the consistency verifier agent itself fails (crash, context overflow):
  Report to user: "Consistency verifier failed: {reason}. Options: skip check (proceed at risk), retry."
  Skipping the check does NOT skip quality gates in Step 6 — those still run independently.
</step_5_agent_spawning>

<step_6_quality_gates>

Run all quality gates from scope-decomposition.md after the final batch completes:

**QG1 — INDEX.md consistency.**
Glob the file tree under scope_root. Compare discovered files to INDEX.md File Inventory claims. Flag any discrepancy.

**QG2 — Dual representation completeness.**
For every .md under scope_root (excluding INDEX.md), verify a sibling .agent.md exists with the same base name.

**QG3 — Positive-only constraint lint.**
Scan all .agent.md files produced in this level for negation keywords: "DO NOT", "don't", "never", "avoid", "must not", "should not", "cannot", "won't".
- Lines prefixed with `SECURITY:` are exempt.
- Flag any non-exempt negation with file path and line.

**QG4 — Contract completeness.**
For every file in architecture/contracts/, parse the filename `{module-a}--{module-b}.md`. Verify both modules exist in INDEX.md module status table.

**QG5 — Scope conservation.**
Level 0 exception: skip QG5 at Level 0. The project brief may not contain an aggregate implementation estimate. Scope conservation applies from Level 1 onward where parent modules have estimated_lines.
For each parent decomposed in this level: sum estimated implementation lines of all children. Compare to parent's estimate. Must be within 20% tolerance. Flag silent scope drops (significantly less) or inflation (significantly more).
Level 1+ with a parent that has no estimated_lines: warn and skip rather than fail — the estimate may have been omitted, not zero.

**QG6 — Scope coverage via Owns-list matching (D9).**
For every parent decomposed: read parent's `<scope>` Owns list. Read each child's `<scope>` Owns list. Every parent Owns item must map to at least one child. Unmapped items = scope gaps.

**Gate failure protocol:**
1. Log specific failures (which files, which criteria, what mismatch).
2. Present failures to user.
3. Do NOT proceed to Step 7 until failures are resolved.
4. Minor failures (1-2 missing .agent.md): fix in place.
5. Structural failures (scope conservation, orphaned contracts): revisit decomposition at the level that produced the error.

</step_6_quality_gates>

<step_7_index_update>

Update INDEX.md per the update protocol in scope-decomposition.md:

1. **Read all agent outputs.**
   Scan directories where agents wrote. Collect: new files, component counts, leaf task counts, estimated lines.

2. **Update module status table.**
   For each processed module:
   - Decomposition Level: L(N)-done
   - Components: count discovered
   - Leaf Tasks: count of leaf-ready tasks
   - Status: `L(N)-done`, or `ready` if all children are leaf tasks

3. **Update file inventory.**
   Add new entries for newly created artifact directories. Update file counts.

4. **Append to level history.**
   Add row: level N, date, modules processed count, agents spawned count, any amendments, notes.

5. **Update decomposition config.**
   Set `next_decision_id` = highest decision ID used in this level + 1.

6. **Update phase.**
   Set phase to `decomposition-LN`.

7. **Atomic write.**
   Write updated INDEX.md to `INDEX.md.tmp` first, then rename to `INDEX.md`.
   On Windows: delete target first, then rename (delete-then-rename sequence).
   Recovery: if a future session finds INDEX.md missing but INDEX.md.tmp present, the .tmp file is the most recent valid state — rename it to INDEX.md. Step 1 intake handles this automatically.

</step_7_index_update>

<step_8_gate_review>

Present to user:

```
Level [N] decomposition complete.
- Modules processed: [count]
- Quality gates: [passed/failed summary per QG1-QG6]
- Consistency check: [CLEAR / WARNINGS (count) / BLOCKING (count)]
- Leaf tasks ready: [count] across [module count] modules
- Modules needing further decomposition: [count]
```

Ask user to choose:
- **Approve:** proceed. Suggest next command based on state:
  - All children are leaf tasks -> `/ladder-build` for implementation
  - Some modules need further decomposition -> `/architect scope level-(N+1)`
  - Mixed -> show both options
- **Reject module(s):** user specifies which modules to redo. Re-run Steps 4-6 for those modules only.
- **Correct:** user edits .md files manually, then orchestrator re-derives .agent.md and re-runs quality gates.

After approval, update STATE.md Pipeline Position:
- Stage: `scope-LN-complete`
- Scope root: `{scope_root}` (reflects the actual scope root used — greenfield or feature)

</step_8_gate_review>

</process>

<level_0_specifics>

Level 0 (architecture phase) has unique behavior:

1. **No parent scope.** The system-map IS the top-level scope. Step 7 of brief assembly (read parent scope) is skipped.

2. **Outputs go to architecture/.** Not modules/. The Level 0 agent produces:
   - `architecture/system-map.md` + `architecture/system-map.agent.md`
   - `architecture/contracts/{mod-a}--{mod-b}.md` for each module pair
   - `architecture/patterns/{pattern-name}.md` for cross-cutting patterns
   - `architecture/decisions/D{NNN}-{slug}.md` for architectural decisions

3. **Single agent.** Level 0 is typically a single architect agent that designs the entire system. Tier ordering is not applicable — all modules are defined simultaneously.

4. **Module definitions.** The system-map's module list becomes the INDEX.md module status table. Each module gets: name, tier, estimated lines, ownership scope.

5. **Phase transition.** After Level 0: phase changes from `brief-complete` (or `discovery-complete` in feature flow) to `decomposition-L0`. All modules start with status `L0-done`.

</level_0_specifics>

</workflow>
