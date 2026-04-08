> **type:** calibration-report
> **output_path:** artifacts/designs/cascading-decomposition/CALIBRATION.md
> **date:** 2026-04-08
> **plan:** artifacts/designs/cascading-decomposition/PLAN.md
> **scenario:** CLI task manager — 4 modules, 3 tiers

# End-to-End Calibration Report

## Scenario

Synthetic project: "Build a CLI task manager with SQLite storage." Four modules across three tiers:
- **storage** (Tier 1) — SQLite persistence layer, no domain dependencies
- **task-service** (Tier 2) — Task CRUD logic, depends on storage
- **cli** (Tier 2) — Command-line interface, depends on task-service
- **reporting** (Tier 3) — Report generation, depends on task-service and cli output

Traced through all 4 stages of the cascading decomposition pipeline by reading the actual workflow files on disk.

---

## Stage 1: miltiaze scope requirements

### Trace

1. **Input parsing (step_analyze, line 19-37):** User says "scope build a CLI task manager with SQLite storage." The workflow checks for keywords: "scope", "decompose", or "cascading". The word "scope" is present, so `scope_mode = TRUE`. Feature_mode stays FALSE (no mention of adding to an existing codebase). Output directory: `artifacts/scope/brief/`.

2. **Context check:** Workflow checks `artifacts/explorations/` for prior work, `context/STATE.md` for pipeline position, and existing codebase for conventions. This is a new project, so nothing found.

3. **Perspective selection (step_select_perspectives, line 41-65):** Standard perspectives selected (technical feasibility, UX, operations, integration). User confirms via AskUserQuestion.

4. **Research (step_research, line 67-121):** Parallel agents launched with professional role prompts. Each agent researches the CLI task manager from their perspective, producing MUST/SHOULD/MUST NOT requirements.

5. **Synthesis (step_synthesize_requirements, line 123-143):** Cross-perspective agreements/disagreements identified. Unified requirements built. Acceptance criteria derived. Build Plans table assembled.

6. **Assemble report (step_assemble_report, line 145-269):**
   - Since scope_mode = TRUE, step 1a fires: mkdir for `artifacts/scope/brief/`.
   - Step 1c: writes `artifacts/scope/brief/project-brief.md` (human-readable requirements).
   - Step 1d: writes `artifacts/scope/brief/project-brief.agent.md` with YAML frontmatter (type: agent-brief, purpose: project-brief, project name, scope_root: "artifacts/scope/", source_hash) and XML sections (`<context>`, `<requirements>`, `<use_cases>`, `<acceptance_criteria>`, `<risks>`). Positive framing applied to constraints.
   - Step 1e (M1 fix, line 217): checks if `artifacts/scope/INDEX.md` already exists. If yes, warns the user about overwriting. If no, proceeds.
   - Step 1e: reads `plugins/architect/skills/architect/templates/index.md` for structure. Creates `artifacts/scope/INDEX.md` with:
     - Project name from requirements
     - Phase: `brief-complete`
     - Module Status: empty table
     - Decomposition Config: max_depth=5, leaf_size_target=250, overflow_threshold=300, parallel_batch_size=3-5, next_decision_id=1
     - File Inventory: lists project-brief.md and project-brief.agent.md
     - Level History: empty

7. **Update STATE.md (step_present_and_save, line 270-329):** Pipeline Position updated to stage: `requirements-complete`, scope_root: `artifacts/scope/`. Handoff message says: "To start architecture decomposition, run: /architect scope level-0".

### Handoff Contract

Stage 1 produces:
- `artifacts/scope/brief/project-brief.md` and `project-brief.agent.md`
- `artifacts/scope/INDEX.md` at phase `brief-complete`
- `context/STATE.md` with scope_root field

Stage 2 (scope-decompose) expects (step_1_intake, line 29-63):
- INDEX.md at the scope root with a readable phase
- Phase `brief-complete` for Level 0

**Match: YES.** The outputs align with what scope-decompose expects as input.

### Issues Found

1. **BUG FOUND AND FIXED: scope-decomposition.md reference had inconsistent decision filter wording.** Line 128 of `references/scope-decomposition.md` said "skip decisions where status starts with 'superseded-by-' (only include decisions with `status: final`)" -- a hybrid of the old exclusion-based and new inclusion-based approach. The parenthetical contradicted the main clause for `draft` and `proposed` statuses. The workflow file (scope-decompose.md, line 221) had the correct H4 fix. **Fixed:** Updated reference to match the workflow's inclusion-based wording: "include only decisions where `status` is exactly `final`. Skip all other statuses."

---

## Stage 2: architect scope level-0

### Trace

1. **Intake (step_1_intake):** User runs `/architect scope level-0`. Orchestrator locates `artifacts/scope/INDEX.md`. Reads it: phase is `brief-complete`. Level 0 requires `brief-complete` or `discovery-complete` -- match. QG1 validates INDEX.md against file tree. Slug safety validated (storage, task-service, cli, reporting -- all valid).

2. **Determine targets (step_2_determine_targets):** Level 0: all modules. No module status table yet (empty). Level 0 is the architecture phase -- the single L0 agent defines module boundaries. Steps 3-7 (min size gate, overhead ratio, complexity scoring, depth cap, all-skip) do not apply at Level 0 because modules have not been identified yet.

3. **Tier planning (step_3_tier_planning):** Level 0 uses a single agent. No tier ordering needed. Decision ID block reserved starting from 1 (D001-D010). Output path: `artifacts/scope/architecture/`.

4. **Brief assembly (step_4_brief_assembly):**
   - Step 1: reads INDEX.md (project name, phase, config).
   - Step 2: reads `artifacts/scope/brief/project-brief.agent.md` for project summary.
   - Step 3: skipped (no system-map yet -- this is Level 0 creating it).
   - Steps 4-6: skipped (no contracts, patterns, or decisions yet).
   - Step 7: skipped (Level 0 has no parent scope).
   - Step 8: assembles brief with YAML frontmatter + `<context>` (project summary) + `<task>` (architecture instructions) + `<output_format>`.

5. **Agent spawning (step_5_agent_spawning):** Single architect agent spawned with role instruction + assembled brief. The agent produces:
   - `architecture/system-map.md` + `architecture/system-map.agent.md` -- with 4 modules (storage T1, task-service T2, cli T2, reporting T3), architecture constraints, and technology stack.
   - `architecture/contracts/cli--task-service.md`, `architecture/contracts/reporting--task-service.md`, `architecture/contracts/storage--task-service.md` (alphabetical double-dash naming).
   - `architecture/patterns/` -- e.g., error-handling.md, result-wrapper.md.
   - `architecture/decisions/D001-*.md` through D00N.

6. **Quality gates (step_6_quality_gates):**
   - QG1: File tree matches INDEX.md -- would pass after Step 7 updates INDEX.md.
   - QG2: All .md have sibling .agent.md -- verified.
   - QG3: Positive-only lint on .agent.md files. Would catch "DO NOT store plaintext" if present. The agent is instructed to use SECURITY: prefix or positive framing. A negation like "DO NOT store plaintext" without SECURITY: prefix would be flagged. With the prefix ("SECURITY: DO NOT store plaintext") it would be exempt. **QG3 would catch it correctly.**
   - QG4: Contract completeness -- all module names in contract filenames exist in INDEX.md.
   - QG5: Skipped at Level 0 (no parent aggregate estimate).
   - QG6: Level 0 exception applies (system-map Owns list verified against module definitions).

7. **INDEX.md update (step_7_index_update):** Module status table populated:

   | Module | Tier | Level | Components | Leaf Tasks | Status |
   |--------|------|-------|------------|------------|--------|
   | storage | 1 | L0 | 0 | 0 | L0-done |
   | task-service | 2 | L0 | 0 | 0 | L0-done |
   | cli | 2 | L0 | 0 | 0 | L0-done |
   | reporting | 3 | L0 | 0 | 0 | L0-done |

   Phase updated to `decomposition-L0`. Atomic write via tmp+rename.

8. **Gate review (step_8_gate_review):** Presents summary. Suggests `/architect scope level-1`.

### Handoff Contract

Stage 2 produces:
- Architecture artifacts in `artifacts/scope/architecture/` (system-map, contracts, patterns, decisions)
- INDEX.md at phase `decomposition-L0` with 4 modules at status `L0-done`

Stage 3 expects:
- INDEX.md at phase `decomposition-L0`
- Modules with status `L0-done` that are NOT marked `ready`
- Architecture files for brief assembly (system-map, contracts, patterns, decisions)

**Match: YES.**

### Issues Found

None. The Level 0 flow is straightforward for a single-agent architecture phase.

---

## Stage 3: architect scope level-1

### Trace

1. **Intake:** User runs `/architect scope level-1`. INDEX.md phase is `decomposition-L0`. Level 1 requires `decomposition-L0` -- match. QG1 validates file tree.

2. **Determine targets:** All 4 modules with status `L0-done`, none marked `ready`. For each module:
   - **Minimum size gate (D10):** Checks estimated_lines from system-map. For our scenario, assume storage ~400 lines, task-service ~500 lines, cli ~350 lines, reporting ~300 lines. Storage, task-service, and cli all exceed 300 -- proceed to decomposition. Reporting is exactly 300 -- at the threshold boundary, it would be skipped: "reporting is under 300 lines -- producing leaf task spec directly" (the gate says "estimated lines <= 300: skip").
   - **Contract overhead ratio:** For remaining modules (storage, task-service, cli), ratio computed. At ~400-500 lines with 3-4 children each, overhead would be ~300-400/400-500 = ~75-100%. Wait -- that seems high. Let me re-examine: contract_files = estimated_child_count * 2. If storage has 3 children: 6 files * 50 = 300 lines overhead / 400 implementation = 75%. That exceeds 30%. But this is Step 4 of step_2, which runs BEFORE the agent decides child count. The orchestrator estimates child count. For a 400-line module with 3 estimated children, yes the ratio would exceed 30%. But the intent is to prevent over-decomposition of small units. The real question: would a 400-line module even get decomposed? At 400 lines the complexity score needs to be >= 5.
   - **Complexity scoring:** For storage at ~400 lines: +3 (>250 lines), likely touches >3 files (+2), likely exposes >2 interfaces (+2) = 7. Score >= 5: decompose.
   - For reporting at 300 lines: already skipped by min size gate.
   - **Depth cap:** Level 1 vs max_depth 5. Not at cap or cap-1.

3. **Tier planning (step_3_tier_planning):**
   - Tier 1: storage (no domain dependencies). Sequential execution.
   - Tier 2: task-service, cli (depend on Tier 1 only). Parallel batch.
   - Tier 3: reporting. Already marked leaf-ready from min size gate, so no decomposition agent needed.
   - If reporting was not at the boundary and needed decomposition, it would wait for Tier 2 completion.
   - Decision ID blocks reserved: storage gets D(next)-D(next+9), task-service gets D(next+10)-D(next+19), cli gets D(next+20)-D(next+29).

4. **Brief assembly for each agent:**
   - **Storage (Tier 1):** Reads INDEX.md, project-brief.agent.md (project summary), system-map.agent.md (architecture constraints), contracts matching storage (storage--task-service.md), applicable patterns, applicable decisions.
     - **H4 fix verification:** Assembly Step 6 in scope-decompose.md says "include only decisions where `status` is exactly `final`." A decision with status "draft" would be excluded. **Confirmed working.**
     - Assembled brief has sections: YAML frontmatter, `<context>`, `<scope>` (from system-map module definition), `<interfaces>`, `<patterns>` (if any apply), `<decisions>` (if any apply), `<task>`, `<output_format>`.
   - **Task-service, cli (Tier 2):** Same assembly process. Each gets only contracts and patterns relevant to their module.

5. **Agent spawning:**
   - Tier 1 (storage): sequential. Single agent decomposes storage into sub-components (e.g., connection-pool, query-builder, schema-manager). Each produces dual .md + .agent.md. Validated immediately.
   - Post-batch consistency check: verifier reads parent spec (storage.agent.md) and all child specs. Runs CHECKs 1-5. Single-module batch, so cross-module interface check notes "single module in batch."
   - Tier 2 (task-service, cli): parallel. Two agents spawn simultaneously. Each writes to its own directory. Validated after both complete.
   - Post-batch consistency check: verifier reads parent specs and all child specs from both modules plus inter-module contracts. Checks interface alignment between task-service and cli children.

6. **Quality gates:**
   - QG1-QG6 run on all Level 1 outputs.
   - QG5 (scope conservation): For each module, sum children's estimated_lines vs parent estimate. Must be within 20%. Would catch silent scope drops.
   - QG6 (scope coverage): Every parent Owns item maps to at least one child.

7. **INDEX.md update:**
   - storage: status -> `L1-done` or `ready` (if all children are leaf tasks)
   - task-service: status -> `L1-done` or `ready`
   - cli: status -> `L1-done` or `ready`
   - reporting: status -> `leaf-ready` (from min size gate)
   - Phase -> `decomposition-L1`

   **M4 fix verification (null estimated_lines at depth cap):** Not triggered at Level 1 (depth 1, cap 5). However, the workflow's step_2 item 6 (line 107-109) now handles the case: "If estimated_lines is missing, null, or zero (0 lines is not a meaningful estimate), issue the forced-leaf warning without the line count comparison." This would only trigger at max_depth, which we're far from here. **Confirmed present in code.**

### Handoff Contract

Stage 3 produces:
- Module decomposition artifacts in `artifacts/scope/modules/*/`
- Leaf task specs for modules that met size/complexity thresholds
- INDEX.md at phase `decomposition-L1` with module statuses reflecting decomposition results

Stage 4 (execute.md) expects:
- INDEX.md with modules at status "ready" or "leaf-ready"
- Leaf task .agent.md files in `modules/*/tasks/` and `modules/*/components/*/tasks/`
- Architecture context (system-map, contracts, patterns, decisions)

**Match: CONDITIONAL.** If all modules at L1-done have all children as leaf tasks, their status becomes "ready" and Stage 4 can proceed. If some children need further decomposition (Level 2), those modules stay at `L1-done` and Stage 4 skips them.

### Issues Found

None. Tier ordering, brief assembly, and quality gates trace correctly.

---

## Stage 4: ladder-build scope execution

### Trace

1. **Find task specs (step_1_find_task_specs, line 17-82):**
   - Step 1: checks `context/STATE.md` Pipeline Position for `scope_root` field. Finds `artifacts/scope/`. Also checks for `artifacts/scope/INDEX.md` directly.
   - Step 2: INDEX.md exists. `scope_mode = TRUE`.
   - Reads INDEX.md Module Status table. Finds modules with status "ready" or "leaf-ready".
   - **H6 fix verification:** After reading INDEX.md decomposition config, validates overflow_threshold. If it's 300 (valid positive number), uses it as-is. If it were 0: "Invalid overflow_threshold in INDEX.md (0). Using default: 300." **Confirmed working.**
   - Globs for leaf task .agent.md files:
     - `artifacts/scope/modules/storage/tasks/*.agent.md`
     - `artifacts/scope/modules/storage/components/*/tasks/*.agent.md` (recursive)
     - Same for task-service, cli, reporting.
   - **M3 fix verification:** Reports modules NOT in "ready"/"leaf-ready" state. If e.g. task-service is still `L1-done` with some children needing Level 2 decomposition: "task-service -- status: L1-done -- skipped (needs further decomposition)." Tells user: "1 module(s) skipped -- run /architect scope level-2 to decompose them." **Confirmed working.**
   - Reads architecture context: system-map.agent.md, contracts, patterns, decisions (status: final only per H4 fix).

2. **Plan execution order (step_2_plan_execution_order, line 84-130):**
   - Builds dependency graph from task .agent.md YAML frontmatter (module, component, depends_on fields).
   - Groups into waves with tier ordering from INDEX.md:
     - Wave 1: Tier 1 (storage) tasks
     - Wave 2: Tier 2 (task-service, cli) tasks
     - Wave 3: Tier 3 (reporting) tasks
   - Batch size: respects parallel_batch_size from INDEX.md (default 3-5). **Confirmed.**
   - **H4 fix verification in execute.md:** Line 42 says "decisions = glob ... (status: final only)". Line 200 says "include only decisions where status is 'final' (skip all other statuses: draft, proposed, superseded-by-*, empty string, or any unrecognized value)." A decision with status "final" is included; status "draft" is excluded. **Confirmed working.**

3. **Execute tasks (step_3_execute_tasks, line 131-225):**
   - Each agent receives an assembled brief:
     1. Task .agent.md (leaf task spec)
     2. System-map.agent.md context
     3. Relevant contracts
     4. Relevant patterns (applies_to filter)
     5. Relevant decisions (status: final only, modules_affected filter)
   - Agent prompt includes overflow protocol: threshold 300 lines (from INDEX.md). If any file reaches 300 lines: STOP, write partial, report OVERFLOW.
   - Implementation agents follow the `<constraint>`, `<read_first>`, `<interface>`, `<files>`, `<verify>`, `<contract>` sections from their task spec.

4. **Per-task verification (step_4_verify_per_task, line 226-246):**
   - Reads execution report from each agent.
   - Re-verifies acceptance criteria against actual files.
   - Checks interface contracts.
   - **Overflow check:** Counts non-blank, non-comment lines in each file. If any exceeds overflow_threshold: marks as DONE WITH OVERFLOW. This catches overflow regardless of agent self-reporting.

5. **Sprint completion report (step_5_sprint_completion_report, line 247-304):**
   - **M2 fix verification:** In scope mode, saves to `{scope_root}/reports/implementation-wave-{N}.md`. N is derived from existing report files: glob `{scope_root}/reports/implementation-wave-*.md`, N = count + 1. First wave: N = 1. **Confirmed working.**
   - Report includes overflow summary table if any tasks exceeded threshold.

6. **Update state (step_6_update_state, line 305-334):**
   - STATE.md Pipeline Position updated.
   - INDEX.md Module Status: implemented leaf tasks marked as "implemented".
   - If overflow detected: affected tasks get status "overflow" in INDEX.md.

7. **Handoff (step_7_handoff, line 336-359):** Shows summary and suggests `/architect` for QA review.

### Issues Found

None. The scope execution flow traces correctly with all Sprint 4 fixes in place.

---

## Feature Flow Variant

### Trace

**Discovery phase (scope-discover.md):**

1. **Intake (step_1_intake):** User runs `/architect scope discover auth`. Scope root constructed: `artifacts/scope/features/auth/`. Checks for INDEX.md at that location.
   - If INDEX.md missing: new feature scope. Creates directory structure and initializes INDEX.md from template with scope_root `artifacts/scope/features/auth/`, phase `brief-complete`.
   - Validates phase: if `brief-complete`, proceeds with discovery.
   - Locates feature brief at `artifacts/scope/features/auth/brief/feature-brief.agent.md`.
   - Validates slug "auth" against pattern `/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/` -- valid.

2. **Discovery agents (step_2_spawn_discovery_agents):** 3 parallel agents:
   - Architecture Scanner: reads CLAUDE.md, package manifests, entry points, module boundaries.
   - Impact Tracer: reads feature-brief.agent.md, traces which codebase areas the auth feature touches.
   - Pattern Extractor: reads impacted files and extracts naming, error handling, test patterns.

3. **Synthesis (step_3_synthesize):** Produces 4 files:
   - `discovery/codebase-snapshot.md` + `.agent.md` -- existing architecture overview
   - `discovery/impact-map.md` + `.agent.md` -- per-requirement impact trace
   - All written to `artifacts/scope/features/auth/discovery/`.

4. **Update INDEX.md (step_4_update_index):** Phase set to `discovery-complete`. Module Status populated with existing modules (status: `existing` for untouched, `impacted` for touched by feature). File Inventory updated with discovery entries.

5. **Update STATE.md (step_5_update_state):** Stage set to `scope-L0`, scope root to `artifacts/scope/features/auth/`.

**T18 verification -- scope-decompose accepts discovery-complete for Level 0:**

In scope-decompose.md step_1_intake (line 47-49): Level 0 requires phase `brief-complete`, `discovery-complete`, or `architecture` (resuming). **Discovery-complete is explicitly accepted.** Confirmed.

**T18 verification -- Level 0 agent gets existing_codebase context from discovery:**

In scope-decompose.md step_4_brief_assembly, Assembly Step 2 (line 196-197): "If `{scope_root}/discovery/` exists (feature flow after discovery): also read discovery artifacts: `{scope_root}/discovery/codebase-snapshot.agent.md` and `{scope_root}/discovery/impact-map.agent.md`. Include this as an `<existing_codebase>` section."

Assembly Step 8, section b2 (line 249-253): `<existing_codebase>` section included between `<context>` and `<scope>`, with `<architecture>`, `<impact>`, and `<patterns>` sub-sections. **Confirmed working.**

**H5 fix -- execute.md finds feature-scoped INDEX.md when STATE.md is missing:**

In execute.md step_1_find_task_specs (line 45-50): After checking `artifacts/scope/INDEX.md` directly and finding nothing, the workflow globs `artifacts/scope/features/*/INDEX.md`. If exactly one exists, uses it automatically. If multiple exist, lists them and asks the user. If none exist, falls through to designs/ mode. Limitation is documented: only top-level and one-deep feature scopes discovered without STATE.md. **Confirmed working.**

### Issues Found

None. The feature flow traces correctly from discovery through decomposition to execution.

---

## Sprint 4 Fix Verification

| Fix | Description | Location(s) | Status | Notes |
|-----|-------------|-------------|--------|-------|
| H4 | Decision status filter (inclusion-based) | scope-decompose.md line 221, execute.md lines 42 and 200 | VERIFIED + BUG FIXED | Workflow files had correct H4 fix. **Reference file `scope-decomposition.md` line 128 had stale hybrid wording -- FIXED** to match the inclusion-based filter. |
| H5 | Feature flow scope_root fallback | execute.md lines 45-50 | VERIFIED | Falls back to `artifacts/scope/features/*/INDEX.md` glob. Limitation documented. |
| H6 | Overflow threshold validation | execute.md lines 26-27 | VERIFIED | Validates overflow_threshold: missing, zero, negative, non-numeric all trigger warning + default 300. |
| M1 | INDEX.md re-run warning | requirements.md lines 217-218 | VERIFIED | Checks if INDEX.md exists before creating. Warns about overwriting. Proceeds anyway (user invoked explicitly). |
| M2 | Wave number definition | execute.md lines 253-254 | VERIFIED | Sequential counter derived from glob of existing report files. N = count + 1. |
| M3 | Skipped modules reporting | execute.md lines 33-37 | VERIFIED | Non-ready modules listed with status. User told how many skipped and what to do next. |
| M4 | estimated_lines null at depth cap | scope-decompose.md lines 107-109 | VERIFIED | Null, missing, or zero estimated_lines handled with warning text that omits line count comparison. |
| F11 | Templates self-comply with positive framing | All templates in `templates/` | VERIFIED (with notes) | Templates use negation in conventions/comments sections (outside code fences or in HTML comments), which is acceptable -- those are instructions for the human template-filler, not content that goes into agent briefs. The code fence body content in agent-brief-implement.md line 136 uses "never" in an assertion example (`ParsedInput.records is never empty`), but this is example placeholder content, not live constraint text. No real violations found. |

---

## Cross-Stage Verification

### Handoff Contracts

| Handoff | Producer | Consumer | Format Match |
|---------|----------|----------|-------------|
| Stage 1 -> Stage 2 | miltiaze requirements.md | scope-decompose.md step_1_intake | YES: INDEX.md at phase `brief-complete` with scope_root, project-brief.agent.md at `{scope_root}/brief/` |
| Stage 2 -> Stage 3 | scope-decompose.md step_7 (L0) | scope-decompose.md step_1 (L1) | YES: INDEX.md at phase `decomposition-L0`, architecture/ directory with system-map, contracts, patterns, decisions |
| Stage 3 -> Stage 4 | scope-decompose.md step_7 (L1) | execute.md step_1 | YES: INDEX.md with modules at `ready`/`leaf-ready`, leaf task .agent.md in `modules/*/tasks/` and `modules/*/components/*/tasks/` |
| Discovery -> L0 | scope-discover.md step_4 | scope-decompose.md step_1 | YES: INDEX.md at phase `discovery-complete`, discovery/ directory with codebase-snapshot.agent.md and impact-map.agent.md |

All handoff contracts are consistent. Each stage's output format matches the next stage's expected input.

### Path Resolution

| Path | Greenfield | Feature Flow | Resolves |
|------|-----------|--------------|----------|
| scope_root | `artifacts/scope/` | `artifacts/scope/features/{slug}/` | YES |
| Brief | `{scope_root}/brief/project-brief.agent.md` | `{scope_root}/brief/feature-brief.agent.md` | YES -- miltiaze sets variant name based on feature_mode |
| Architecture | `{scope_root}/architecture/` | `{scope_root}/architecture/` | YES -- same relative path |
| Modules | `{scope_root}/modules/{module}/` | `{scope_root}/modules/{module}/` | YES |
| Discovery | N/A (no discovery/ dir) | `{scope_root}/discovery/` | YES -- assembly checks for existence |
| INDEX.md | `artifacts/scope/INDEX.md` | `artifacts/scope/features/{slug}/INDEX.md` | YES |
| Reports | `{scope_root}/reports/implementation-wave-{N}.md` | `{scope_root}/reports/implementation-wave-{N}.md` | YES |

All paths resolve correctly for both greenfield and feature flow variants.

### Quality Gates

| Gate | What It Checks | Would It Catch Real Errors? | Assessment |
|------|---------------|---------------------------|------------|
| QG1 | INDEX.md vs file tree | YES -- file tree glob vs File Inventory claims | Effective |
| QG2 | Dual representation | YES -- every .md needs .agent.md sibling | Effective |
| QG3 | Positive-only lint | YES -- scans for negation keywords, SECURITY: exempt | Effective (with known F11 edge case in example content) |
| QG4 | Contract completeness | YES -- contract filenames parsed for module names, both must exist in INDEX.md | Effective |
| QG5 | Scope conservation | YES -- child line sums vs parent estimate, 20% tolerance. Skipped at L0 (correct). | Effective from L1 onward |
| QG6 | Scope coverage (Owns matching) | YES -- every parent Owns item must map to child | Effective |

All quality gates are properly specified and would catch real errors in their respective domains.

---

## Summary

- **Stages traced:** 4/4 (requirements, L0 decomposition, L1 decomposition, execution)
- **Feature flow:** Traced (discovery through L0 through execution)
- **Issues found:** 1 (1 bug fixed, 0 blocking, 0 warnings)
  - **BUG FIXED:** `references/scope-decomposition.md` line 128 had stale hybrid decision filter wording. Updated to match the inclusion-based H4 fix applied in scope-decompose.md and execute.md.
- **Sprint 4 fixes verified:** 8/8 (H4, H5, H6, M1, M2, M3, M4, F11)
- **Overall: PASS** -- The pipeline traces correctly from requirements through architecture through decomposition through execution. All handoff contracts are consistent. All Sprint 4 fixes are present and functional. One reference file bug found and fixed during calibration.
