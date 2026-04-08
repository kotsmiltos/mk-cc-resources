> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/task-12-miltiaze-scope-output.md
> **sprint:** 3
> **status:** planned
> **depends_on:** T1, T2
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D4, D6
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 12: miltiaze Scope Output

## Goal
Extend the miltiaze requirements workflow to output project briefs in dual format (.md + .agent.md) to the scope directory and create the initial INDEX.md routing table. This is the entry point for the cascading decomposition pipeline — miltiaze produces the brief that the architect's scope-decompose workflow consumes at Level 0.

## Context
- Current requirements workflow: `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` — outputs to `artifacts/explorations/` as a single .md file
- INDEX.md template: `plugins/architect/skills/architect/templates/index.md` — defines the master routing table format
- Agent brief template: `plugins/architect/skills/architect/templates/agent-brief-decompose.md` — defines the .agent.md format for decomposition agents
- D6 (backward compatibility): scope/ and designs/ pipelines coexist. miltiaze detects scope mode and outputs accordingly. Legacy output to explorations/ remains the default.
- D4 (dual representation): agents co-author both .md and .agent.md in a single pass
- Refactor request from Sprint 1: INDEX.md File Inventory hardcodes `project-brief.md` — must also note `feature-brief.md` variant for feature flow

## Interface Specification

### Inputs
- User's project idea or feature description (same as current requirements workflow)
- User signals scope mode via explicit mention of "scope", "decompose", or "cascading" in their request to miltiaze

### Outputs
- `artifacts/scope/brief/project-brief.md` — human-readable requirements document (same content as current requirements output, adapted path)
- `artifacts/scope/brief/project-brief.agent.md` — agent-facing brief with YAML frontmatter + XML sections, positive-only constraints, structured for scope-decompose to consume
- `artifacts/scope/INDEX.md` — initial routing table with phase `brief-complete`, file inventory, decomposition config defaults
- Feature flow variant: `artifacts/scope/features/<slug>/brief/feature-brief.md` + `.agent.md` + INDEX.md

### Contracts with Other Tasks
- T1 (INDEX.md template) provides the format → this task creates a conforming INDEX.md instance
- T2 (agent brief templates) provides the .agent.md format → this task produces a conforming project-brief.agent.md
- T7 (scope-decompose workflow) will consume the INDEX.md and project-brief.agent.md at Level 0

## Pseudocode

```
MODIFY requirements.md — add scope mode detection and dual output:

IN step_analyze (existing):
  ADD scope mode detection:
    scope_mode = user input contains "scope" OR "decompose" OR "cascading"
                 OR context/STATE.md Pipeline Position stage is "idle" AND user
                 explicitly requests scope pipeline

IN step_assemble_report (existing):
  IF scope_mode:
    1. Set output_dir:
       - Greenfield: "artifacts/scope/brief/"
       - Feature (user mentioned existing codebase): "artifacts/scope/features/{slug}/brief/"
    
    2. Write the human doc:
       - Same content as current requirements report
       - Save to: {output_dir}/project-brief.md (or feature-brief.md)
       - Update metadata output_path field accordingly
    
    3. Co-author the agent brief (D4):
       Write {output_dir}/project-brief.agent.md with:
       ```yaml
       ---
       type: agent-brief
       purpose: project-brief
       project: "{project name}"
       scope_root: "artifacts/scope/"
       source_hash: "{SHA-256 of project-brief.md}"
       ---
       ```
       ```xml
       <context>
         <project>{3-5 sentence project summary}</project>
         <target_users>{who uses this}</target_users>
       </context>
       
       <requirements>
         <functional>
           {MUST requirements as bullet items}
         </functional>
         <non_functional>
           {NFR items}
         </non_functional>
         <constraints>
           {Implementation constraints — positive framing only}
         </constraints>
       </requirements>
       
       <use_cases>
         {Each use case as a <case name="..."> block}
       </use_cases>
       
       <acceptance_criteria>
         {Testable assertions from the requirements}
       </acceptance_criteria>
       
       <risks>
         {Aggregated risks with likelihood and mitigation}
       </risks>
       ```
       Positive framing only — convert "MUST NOT" to "USE ONLY" equivalents.
       Front-load constraints (primacy bias).
    
    4. Create INDEX.md:
       Read templates/index.md for structure.
       Write {scope_root}/INDEX.md with:
       - Project name from requirements
       - Phase: brief-complete
       - Module Status: empty table (populated at Level 0)
       - Decomposition Config: max_depth=5, leaf_size_target=250,
         overflow_threshold=300, parallel_batch_size=5, next_decision_id=1
       - File Inventory: list project-brief.md and project-brief.agent.md
         (OR feature-brief.md/feature-brief.agent.md for feature flow)
       - Level History: empty (Level 0 not yet started)
    
    5. Ensure artifacts/scope/ directory exists (mkdir -p equivalent).

  ELSE (legacy mode):
    Current behavior unchanged — save to artifacts/explorations/

IN step_present_and_save (existing):
  IF scope_mode:
    Update STATE.md Pipeline Position:
      Stage: requirements-complete
      Requirements: {path to project-brief.md in scope/}
      Scope root: artifacts/scope/
    
    Handoff message:
      "Requirements complete and saved to {scope_root}/brief/.
       INDEX.md created at {scope_root}/INDEX.md.
       
       To start architecture decomposition, run:
          /architect scope level-0
       
       You can /clear first — all state is on disk."
  ELSE:
    Current handoff unchanged

MODIFY SKILL.md — no routing changes needed.
  The routing already sends "requirements" / "spec" / "build" to requirements.md.
  Scope mode is detected INSIDE the workflow, not at routing level.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` | MODIFY | Add scope mode detection in step_analyze, dual output (.md + .agent.md) in step_assemble_report, INDEX.md creation, scope-aware STATE.md update and handoff in step_present_and_save |
| `plugins/miltiaze/skills/miltiaze/SKILL.md` | CHECK | Verify routing still works — no changes expected since scope detection is inside the workflow |

## Acceptance Criteria
- [ ] When user mentions "scope" or "decompose" in requirements request, output goes to `artifacts/scope/brief/` instead of `artifacts/explorations/`
- [ ] project-brief.md is written with same quality as current requirements output
- [ ] project-brief.agent.md is written with YAML frontmatter (type, purpose, project, scope_root, source_hash) and XML sections (context, requirements, use_cases, acceptance_criteria, risks)
- [ ] Agent brief uses positive-only framing — no "DO NOT", "don't", "never", "avoid", "must not" (F3 compliance)
- [ ] Agent brief front-loads constraints before use cases and acceptance criteria
- [ ] source_hash in .agent.md matches SHA-256 of sibling .md file
- [ ] INDEX.md is created at `artifacts/scope/INDEX.md` with phase `brief-complete`
- [ ] INDEX.md Decomposition Config contains all 5 default fields (max_depth, leaf_size_target, overflow_threshold, parallel_batch_size, next_decision_id)
- [ ] INDEX.md File Inventory lists both .md and .agent.md files
- [ ] Feature flow variant: output to `artifacts/scope/features/<slug>/brief/` with feature-brief.md naming
- [ ] STATE.md Pipeline Position updated with `scope_root` field when in scope mode
- [ ] Legacy mode (no "scope" signal) preserves current behavior exactly — output to explorations/

## Edge Cases
- User says "scope" but in a non-trigger context (e.g., "what's the scope of this project?") — treat as scope mode since it's in a requirements workflow context; the intent is already requirements-oriented
- Feature flow: user describes adding to an existing codebase — use `features/<slug>/` path structure
- INDEX.md already exists (user re-runs requirements) — overwrite with fresh state, warn user that previous scope data will be orphaned
- Very short requirements (user gives one sentence) — still produce dual format; the agent brief will just have minimal content
