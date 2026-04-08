<scope_decomposition>

<overview>
How the architect decomposes scope through cascading levels, decides when to stop, orders work by tiers, assembles agent briefs, and validates output quality. This reference is used by the scope-decompose workflow as required reading at every decomposition level. It is to scope-decompose what sprint-management.md is to the plan workflow.
</overview>

<stopping_criteria>

The agent at each node evaluates whether to decompose further or produce a leaf task. Two mechanisms govern this: a complexity score and a set of hard gates.

<complexity_score>
Compute a complexity score for each unit under consideration:

| Factor | Score | Rationale |
|--------|-------|-----------|
| Estimated implementation lines > 250 | +3 | Exceeds single-agent quality threshold |
| Touches > 3 files | +2 | Cross-file coordination increases error risk |
| Exposes > 2 new interfaces | +2 | Interface design deserves its own contract |
| Non-trivial state management | +1 | State logic is error-prone and hard to verify |
| Conditional branching in requirements | +1 | Multiple code paths increase scope ambiguity |
| Agent confidence < 80% | +2 | Self-assessment escape valve for uncertain scope |

**Score >= 5:** Decompose further. The unit is too complex for a single implementation agent.
**Score < 5:** Produce a leaf task. A single agent can implement this directly.

Line count alone is unreliable — LLMs underestimate by 30-50%. Files touched and interface count are stronger signals. When in doubt, the files-touched factor should weigh heaviest.
</complexity_score>

<depth_cap>
Maximum decomposition depth is configurable per project. The default is 5 (per D5).

- **At max depth:** The node MUST produce a leaf task regardless of complexity score. No further decomposition is allowed.
- **At depth 4 (max minus 1):** WARN that depth is high. The orchestrator should review whether the decomposition tree is healthy or whether an earlier level made poor boundary choices. If most siblings at depth 4 still score >= 5, the Level 1 or Level 2 module boundaries were likely wrong — escalate for restructuring rather than pushing deeper.
- **Depth values:** Level 0 = architecture phase (system-level modules). Level 1 = module decomposition. Level 2+ = component and sub-component decomposition. The depth is tracked in the INDEX.md Decomposition Config table and in each agent brief's YAML frontmatter `level` field.
</depth_cap>

<minimum_size_gate>
If the estimated total implementation for a unit is under 300 lines, skip decomposition entirely — produce leaf task specs directly.

This prevents over-decomposition of small units where contract overhead would exceed the implementation itself. The 300-line threshold aligns with the overflow threshold — units at or below 300 lines are valid leaf tasks, units above 300 lines should be decomposed. This eliminates the dead zone between leaf size and minimum decomposition size.
</minimum_size_gate>

<slug_validation>
All module and component slugs must match: `/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/`

Rules:
- Lowercase alphanumeric characters and hyphens only
- Length: 2-30 characters
- Must start and end with alphanumeric (no leading/trailing hyphens)
- Reject: path separators (`/`, `\`), dots (`.`), spaces, underscores, Unicode characters
- Single character slugs are invalid (minimum 2 characters)

Why: slugs become directory names and appear in file paths. Invalid characters cause path traversal risks, cross-platform failures (Windows path limits), and broken glob patterns. The 30-character limit keeps full paths under PATH_MAX even at depth 5.

The orchestrator validates all slugs at intake (Step 1) and rejects any that fail before spawning agents.
</slug_validation>

</stopping_criteria>

<tier_ordering>

Modules are assigned to tiers based on their dependency relationships. Tier determines build order: lower tiers are decomposed and built first because higher tiers depend on their outputs.

<tier_definitions>

**Tier 1 — Core / Foundation:**
Data models, shared types, base abstractions, utility libraries. These modules have no domain-specific dependencies — they are consumed by everything else.

- Decompose FIRST
- Execute sequentially (1-2 agents) — foundation modules often share types, so parallelism risks inconsistency
- Their completed specs become hard constraints for Tier 2 and Tier 3 agents

**Tier 2 — Feature:**
Independent feature modules that implement primary functionality. Each depends on Tier 1 outputs but not on other Tier 2 modules.

- Decompose AFTER Tier 1 is complete
- Execute in parallel (batches of 3-5 agents)
- Each agent handles exactly 1 module — one agent per module is a hard rule to prevent primacy bias and lazy tail degradation on items 4+ (per research in requirements doc)

**Tier 3 — Integration:**
Modules that connect, orchestrate, or compose Tier 2 outputs. These are the glue: API gateways, orchestration layers, aggregation services.

- Decompose LAST — these agents need Tier 2 specs as input context
- Execute after Tier 2 modules are at least spec-complete (implementation can overlap if interfaces are stable)

</tier_definitions>

<tier_assignment_rules>

Apply these rules to assign each module to a tier:

1. **Module has no domain-specific dependencies** (only stdlib, language primitives, or external packages) → **Tier 1**
2. **Module depends on Tier 1 outputs only** (consumes types, models, or utilities from Tier 1 modules but nothing from other feature modules) → **Tier 2**
3. **Module depends on Tier 2 outputs** (consumes interfaces, data, or behavior from two or more Tier 2 modules) → **Tier 3**
4. **Circular dependency between two modules** → **STOP.** Escalate to the user for re-decomposition. Circular dependencies indicate the module boundaries are wrong — the two modules should be merged or a shared dependency should be extracted into Tier 1.

When all modules fall into the same tier (common for small projects with no internal dependencies), no ordering is needed — decompose them all in parallel as a single batch.

</tier_assignment_rules>

</tier_ordering>

<brief_assembly>

The brief assembly algorithm constructs a single, self-contained agent brief for a decomposition or implementation agent. The agent reads ONE document, not 15 scattered files. The orchestrator assembles this brief at spawn time from the many-small-files on disk.

<algorithm>

**INPUT:** Target module or component name, `scope_root` path (from INDEX.md metadata).
**OUTPUT:** A single assembled agent brief (markdown text) ready to be given to the spawned agent.

**Step 1 — Read INDEX.md.**
Read `{scope_root}/INDEX.md`. Extract: project name, current phase, decomposition config (max depth, leaf size target, parallel batch size), and the module status table. This orients the assembly to the current project state.

**Step 2 — Read project brief.**
Read `{scope_root}/brief/project-brief.agent.md`. Extract the first 3-5 sentences as the project summary. This goes into the `<context>` section of the assembled brief. For feature flow, read `{scope_root}/brief/feature-brief.agent.md` instead.

**Step 3 — Read system map.**
Read `{scope_root}/architecture/system-map.agent.md`. Extract the architecture constraints section. These are hard constraints that every agent must follow.

**Step 4 — Identify relevant contracts.**
Glob `{scope_root}/architecture/contracts/*--{target}.md` AND `{scope_root}/architecture/contracts/{target}--*.md` (contracts use double-dash separator with alphabetical module ordering). The first pattern uses an exact suffix match to prevent false matches (e.g., target "api" matching "api-gateway"). Include all matching contracts. If no contracts match, the `<interfaces>` section of the brief will be empty — write "No cross-module interfaces — this module is self-contained."

**Step 5 — Identify relevant patterns.**
Read each file in `{scope_root}/architecture/patterns/*.md`. Check the `applies_to` field in the metadata blockquote. Include the pattern if `applies_to` is "all" OR if the comma-separated list includes the target module name. Omit the `<patterns>` section entirely if no patterns apply.

**Step 6 — Identify relevant decisions.**
Read each file in `{scope_root}/architecture/decisions/D*.md`. Check the `status` field — include only decisions where `status` is exactly `final`. Skip all other statuses (draft, proposed, superseded-by-*, empty string, or any unrecognized value). Check the `modules_affected` field in the metadata blockquote. Include the decision if `modules_affected` includes the target module name. Extract only the decision ID and outcome — agents receive "what was decided", not the rationale or alternatives.

**Step 7 — Read parent scope (levels > 0 only).**
For Level 1+, the target has a parent module or component. Read the parent's agent brief:
- Module-level target: `{scope_root}/modules/{parent}/{parent}.agent.md`
- Component-level target: `{scope_root}/modules/{parent-module}/components/{parent-component}/{parent-component}.agent.md`
Extract the scope definition for the target from the parent's component breakdown.

**Step 8 — Assemble in order.**
Section order is load-bearing. Constraints come first for primacy bias — instructions seen first are followed most reliably.

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

c. <scope>
   Ownership, boundaries, and exclusions for this target
   (from parent scope in Step 7, or from system-map entry for L0 modules)

d. <interfaces>
   All relevant contracts (from Step 4)
   If empty: "No cross-module interfaces — this module is self-contained."

e. <patterns>
   All relevant pattern files (from Step 5)
   If empty: omit this section entirely

f. <decisions>
   All relevant decisions as ID + outcome pairs (from Step 6)

g. <task>
   Decomposition or implementation instructions for this level
   Include stopping criteria thresholds and output location

h. <output_format>
   Exact file paths and naming conventions for the agent's output
   Specify both .md and .agent.md paths (dual representation per D4)
```

**Step 9 — Validate assembled brief.**
Before handing the brief to the agent, verify:
- All decision IDs referenced (e.g., D001, D003) exist in `{scope_root}/architecture/decisions/`
- All contract modules referenced exist in the INDEX.md module status table
- No orphaned references (a contract referencing a module not listed in INDEX.md)

- Verify `source_hash` in each referenced .agent.md matches the SHA-256 of its sibling .md. If any hash mismatches, the .agent.md is stale — do not assemble until it is regenerated from the current .md.

If validation fails, the brief has an integrity problem. Fix the source files before spawning the agent.

</algorithm>

<edge_cases>
- **Module with no contracts:** Step 4 returns an empty list. The brief's `<interfaces>` section contains the self-contained note. This is valid — not every module has cross-module interfaces.
- **No patterns applicable:** Step 5 returns an empty list. The `<patterns>` section is omitted entirely from the brief. Presence of an empty patterns section wastes tokens and attention.
- **No decisions for this module:** Step 6 returns an empty list. The `<decisions>` section is omitted entirely.
- **Root-level module (level 0):** Step 7 is skipped. The scope comes from the system map directly.
- **Feature flow:** Step 2 reads `feature-brief.agent.md` instead of `project-brief.agent.md`. Step 3 reads `feature-map.agent.md` if it exists (feature architecture), falling back to `system-map.agent.md`.
</edge_cases>

</brief_assembly>

<quality_gates>

Quality gates run after each decomposition level completes. The orchestrator executes these checks before updating INDEX.md and before proceeding to the next level. A failed gate blocks progression.

<gate_definitions>

**QG1 — INDEX.md consistency.**
Glob the actual file tree under `{scope_root}`. Compare the discovered files to what INDEX.md claims exists in its File Inventory and Module Status table. Flag any discrepancy: files on disk not listed in INDEX.md, or INDEX.md entries pointing to non-existent files.

**QG2 — Dual representation completeness.**
For every `.md` file under `{scope_root}` (excluding INDEX.md itself), verify a sibling `.agent.md` exists with the same base name. Every human doc must have an agent counterpart (per D4). Flag any unpaired files.

**QG3 — Positive-only constraint lint.**
Scan all `.agent.md` files produced in this level for general negation keywords: "DO NOT", "don't", "never", "avoid", "must not", "should not", "cannot", "won't". Lines prefixed with `SECURITY:` are exempt — security constraints are the only place negation is permitted (per D7). Flag any non-exempt negation.

**QG4 — Contract completeness.**
For every file in `{scope_root}/architecture/contracts/`, parse the filename `{module-a}--{module-b}.md`. Verify both `module-a` and `module-b` exist in the INDEX.md module status table. Flag orphaned contracts where one or both modules are missing.

**QG5 — Scope conservation.**
For each parent that was decomposed in this level: sum the estimated implementation lines of all its children. Compare to the parent's own estimate. The sum must be within 20% of the parent (the WBS 100% rule with tolerance for estimation error). If children sum to significantly less, scope was silently dropped. If significantly more, scope was inflated.

**QG6 — Scope coverage via Owns-list matching.**
For every parent decomposed in this level, read its `<scope>` Owns list. For each child produced, read its `<scope>` Owns list. Every parent Owns item must map to at least one child's Owns items. Unmapped parent items indicate scope gaps — something the parent owned that no child is responsible for. This aligns with the consistency check's CHECK 2 approach. The `traces_to` field in task-spec.md provides human-facing traceability but is not used for automated gate enforcement.

</gate_definitions>

<gate_failure_protocol>
When a gate fails:
1. Log the specific failures (which files, which criteria, what mismatch)
2. Present failures to the orchestrator (or user, depending on context)
3. Do NOT proceed to the next level until the failures are resolved
4. Minor failures (1-2 missing .agent.md files) can be fixed in place
5. Structural failures (scope conservation violation, orphaned contracts) require revisiting the decomposition at the level that produced the error
</gate_failure_protocol>

</quality_gates>

<contract_overhead_ratio>

Before decomposing any unit, estimate the overhead that decomposition would introduce and compare it to the implementation it governs.

<formula>

```
contract_files = number of new .md + .agent.md files the decomposition would create
contract_lines = contract_files * 50  (average template size per file)
implementation_lines = estimated total leaf task implementation lines

overhead_ratio = contract_lines / implementation_lines
```

**If overhead_ratio > 0.30 (30%):** Skip decomposition. Implement the unit directly as a leaf task.

This gate prevents the system from spending more effort describing work than doing work. A 300-line task decomposed into 4 subtasks generates ~8 contract files (~400 lines of contracts) to govern ~300 lines of code — a ratio over 100%. That is pure overhead.

The 30% threshold is deliberately conservative. Research shows decomposition starts paying off at ~400-500 implementation lines. Below that, a single agent is faster, cheaper, and more accurate.

</formula>

<when_to_check>
Run this check:
- Before the orchestrator spawns decomposition agents for any unit
- After Step 1 of the assembly algorithm (when estimated sizes are known from INDEX.md)
- At every level, not just the first — a component at Level 3 might be small enough to implement directly even though its parent at Level 2 was large enough to decompose
</when_to_check>

</contract_overhead_ratio>

<decision_numbering>

Decision IDs are globally sequential across the entire scope directory: D001, D002, D003, and so on. They are NOT scoped per-module — a single namespace prevents ID collisions and makes cross-references unambiguous.

Decision IDs use 3-digit zero-padding in file paths and agent prompt references: D001, D002, ..., D999. The `next_decision_id` field in INDEX.md Decomposition Config stores the raw integer (e.g., 1, 15, 100). The orchestrator pads to 3 digits when constructing file paths (e.g., `D001-auth-strategy.md`) and agent prompt references. IDs beyond D999 use 4+ digits as needed.

<sequential_assignment>
The orchestrator (or architect agent in single-agent mode) assigns decision IDs by checking `{scope_root}/architecture/decisions/` for the highest existing number and incrementing.

When decisions are created during the architecture phase (Level 0), this is straightforward — a single agent assigns them sequentially.
</sequential_assignment>

<parallel_reservation>
When parallel agents might create decisions simultaneously (during Level 1+ decomposition with multiple agents running in the same batch), the orchestrator reserves ID blocks before spawning:

```
Module A agent: reserved D010-D019
Module B agent: reserved D020-D029
Module C agent: reserved D030-D039
```

- The orchestrator determines the next available ID, then assigns contiguous blocks of 10 per agent
- Each agent uses IDs only from its reserved block, starting from the lowest
- Unused IDs in a block are simply skipped — gaps in the sequence are acceptable
- After the batch completes, the orchestrator notes the highest used ID for the next batch's reservation

The block size of 10 is a practical default. Most modules produce 1-3 decisions per decomposition level. If an agent exhausts its block (unlikely — that would mean 10+ architectural decisions for a single module), it flags the overflow and the orchestrator assigns an additional block.
</parallel_reservation>

</decision_numbering>

<task_id_format>

Task IDs follow the format `{module}-t{NN}` where:
- `{module}` is the module slug (matching the directory name under `modules/`)
- `t` is a literal separator
- `{NN}` is a zero-padded sequential number within the module (01, 02, ...)

For component-level tasks: `{module}-{component}-t{NN}` (e.g., `auth-jwt-t01`).

This format:
- Encodes module context directly in the ID (no lookup needed)
- Maps naturally to file slugs: `task-auth-t01-token-service.md`
- Is sortable within a module
- Avoids global numbering collision during parallel decomposition

The orchestrator assigns task IDs when creating leaf task specs. Parallel agents within the same module use the block reservation pattern (similar to decision IDs): agent A gets t01-t10, agent B gets t11-t20.

</task_id_format>

<index_update_protocol>

INDEX.md is the single source of truth for scope decomposition state. Per D3, ONLY the orchestrator writes to INDEX.md. Parallel agents never modify it directly.

<write_sequence>

After a decomposition batch completes, the orchestrator updates INDEX.md following this sequence:

**Step 1 — Read all agent outputs.**
Scan the directories where agents wrote their results (e.g., `{scope_root}/modules/{module-name}/` for Level 1 agents). Collect: new files created, component counts, leaf task counts, estimated line counts.

**Step 2 — Validate each output.**
For each agent's output, verify:
- Both .md and .agent.md files exist (dual representation)
- The .agent.md contains required YAML frontmatter fields (type, purpose, target, level, scope_root, source_hash)
- The .agent.md contains required XML sections for its purpose:
    - Decomposition briefs: `<context>`, `<scope>`, `<interfaces>`, `<patterns>`, `<decisions>`, `<task>`, `<output_format>`
    - Implementation briefs: `<constraint>`, `<read_first>`, `<interface>`, `<files>`, `<verify>`, `<contract>`
    - Note: `<patterns>` and `<decisions>` may be omitted from decomposition briefs when no patterns/decisions apply (see brief assembly Steps 5-6). All other sections are required.
    - Note: `<interface>` (singular) is for implementation function signatures. `<interfaces>` (plural) is for decomposition module contracts. See tag_distinction in this reference.
- source_hash in .agent.md matches the SHA-256 of the sibling .md

**Step 3 — Update INDEX.md module status table.**
For each processed module:
- Update the Decomposition Level column (e.g., L0-done to L1-done)
- Update the Components column with the count discovered
- Update the Leaf Tasks column with the count of leaf-ready tasks
- Update the Status column (e.g., in-progress to L1-done, or to ready if all tasks are leaf-ready)

**Step 4 — Update INDEX.md file inventory.**
Add new entries for newly created artifact directories and update file counts.

**Step 5 — Append to level history.**
Add a row to the Level History table: level number, date, modules processed, agents spawned, any amendments, and notes.

**Step 6 — Atomic write.**
Write the updated INDEX.md to a temporary file first (`INDEX.md.tmp`), then rename to `INDEX.md`. This prevents partial writes from corrupting the file if the session crashes mid-update. On Windows, this requires deleting the target first — the orchestrator handles this as a delete-then-rename sequence.

</write_sequence>

<concurrent_safety>
- Parallel agents write ONLY to their own directories: `{scope_root}/modules/{their-module-name}/`
- No two agents share an output directory
- The orchestrator waits for ALL agents in a batch to complete before reading any output
- If an agent crashes, its directory may contain partial output — the validation in Step 2 catches this, and the orchestrator flags the module for retry
</concurrent_safety>

</index_update_protocol>

<path_structure>

Output paths follow a recursive nesting convention based on decomposition depth:

| Level | Path Pattern | Example |
|-------|-------------|---------|
| 0 | `{scope_root}/architecture/` | `artifacts/scope/architecture/system-map.md` |
| 1 | `{scope_root}/modules/{module}/` | `artifacts/scope/modules/auth/` |
| 2 | `{scope_root}/modules/{module}/components/{component}/` | `artifacts/scope/modules/auth/components/jwt/` |
| 3 | `.../components/{comp}/components/{sub-comp}/` | `.../jwt/components/token-store/` |
| 4+ | Recursive `components/` nesting continues | `.../token-store/components/cache/` |

General formula for depth D (D >= 2): each level beyond 1 adds a `components/` subdirectory under its parent.

```
{scope_root}/modules/{level-1-slug}/components/{level-2-slug}/components/{level-3-slug}/...
```

At each nesting level, the unit's files follow the same convention:
- `{slug}/{slug}.md` + `{slug}/{slug}.agent.md` — overview/spec
- `{slug}/tasks/` — leaf task specs (if any children are leaf-ready)
- `{slug}/components/` — sub-components (if further decomposition is needed)

The depth cap (default 5) bounds the maximum nesting to prevent PATH_MAX issues. With 30-character slugs, the worst-case greenfield path at depth 5 is approximately 250 characters — within Windows PATH_MAX (260) with margin.

**Feature flow path budget:** Feature-scoped roots (`artifacts/scope/features/{slug}/`) add ~30 characters to every path compared to greenfield (`artifacts/scope/`). At depth 5 with long slugs, feature flow paths can exceed 260 characters. Mitigations:
- Use short feature slugs (prefer `auth` over `user-authentication-system`)
- For feature flow, the effective safe depth is 4 (not 5) with typical slug lengths
- The orchestrator should warn at depth 3+ in feature flow if the cumulative path length exceeds 220 characters

</path_structure>

<tag_distinction>

Two similar but distinct XML tags exist across templates:

**`<interface>` (singular)** — used in implementation agent briefs (`agent-brief-implement.md`).
Contains exact function signatures the agent must implement. Each function is defined with name, params, returns, and mechanical steps. This is a code-level contract.

**`<interfaces>` (plural)** — used in decomposition agent briefs (`agent-brief-decompose.md`).
Contains cross-module interface descriptions: contract names, directions (provides/consumes), signatures, and guarantees. This is a module-level contract.

These are intentionally different tags for different purposes:
- `<interface>` answers: "What functions do I write?"
- `<interfaces>` answers: "How does my module connect to other modules?"

Downstream consumers (consistency check, brief assembly, output validation) must check the correct tag for each brief type. Confusing them would validate implementation briefs against decomposition rules or vice versa.

</tag_distinction>

</scope_decomposition>
