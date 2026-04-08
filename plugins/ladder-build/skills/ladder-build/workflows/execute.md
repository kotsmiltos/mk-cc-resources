<required_reading>
Read these reference files NOW:
1. references/verification-standards.md
2. references/impact-analysis.md
3. templates/milestone-report.md
</required_reading>

<context>
This workflow executes architect-planned sprints. Unlike kickoff/build-milestone (where ladder-build self-decomposes and plans), here the architect has already designed everything: PLAN.md, sprint structure, and individual task specs with pseudocode, interfaces, and acceptance criteria. Ladder-build's job is to BUILD what the architect specified, verify against the task specs, and report completion.

The architect invokes this after producing task specs via `/architect`. After execution, the architect runs its review workflow for QA and reassessment.
</context>

<process>

<step_1_find_task_specs>
**Scope mode detection (check FIRST, before designs/ path):**

1. Check for scope root:
   - If `context/STATE.md` Pipeline Position has a `scope_root` field → use that value
   - Otherwise check for `artifacts/scope/INDEX.md` directly
   
2. If scope root exists AND `{scope_root}/INDEX.md` exists:
   - scope_mode = TRUE
   - Read INDEX.md and extract Module Status table
   - Validate overflow_threshold from Decomposition Config: if the value is missing, zero, negative, or non-numeric (e.g., a text string like "three hundred"), use default 300 and warn: "Invalid overflow_threshold in INDEX.md ({value}). Using default: 300." If the value is a valid positive number, use it as-is.
   - Find ready leaf tasks:
     FOR each module where status is "ready" or "leaf-ready":
       Glob `{scope_root}/modules/{module}/tasks/*.agent.md`
       AND `{scope_root}/modules/{module}/components/*/tasks/*.agent.md` (recursive)
       Collect all .agent.md files as task specs
   - If no leaf tasks found: tell user "INDEX.md shows modules as ready but no leaf task specs found. Run /architect scope level-N to decompose further." STOP.
   - Report modules NOT included in this wave:
     FOR each module in INDEX.md where status is NOT "ready" and NOT "leaf-ready":
       List in the execution plan: "{module} — status: {status} — skipped (needs further decomposition)"
     If any modules were skipped, tell the user: "{N} module(s) skipped — run /architect scope level-N to decompose them."
     If all modules are ready: no skip report, proceed normally.
   - Read architecture context:
     - system_map = `{scope_root}/architecture/system-map.agent.md`
     - contracts = glob `{scope_root}/architecture/contracts/*.md`
     - patterns = glob `{scope_root}/architecture/patterns/*.md`
     - decisions = glob `{scope_root}/architecture/decisions/D*.md` (status: final only)
   - CONTINUE to step_2 with scope task list.

3. If no direct INDEX.md found (step 1 and 2 produced nothing), check for feature-scoped roots:
   - Glob `artifacts/scope/features/*/INDEX.md` for feature-scoped scope roots.
   - If multiple feature INDEX.md files exist: list them and ask the user which feature to execute. Wait for selection before proceeding.
   - If exactly one exists: use it automatically as the scope root and continue to step 2 logic above.
   - If none exist: fall through to step 4.
   - Limitation: if STATE.md is missing, only top-level (`artifacts/scope/INDEX.md`) and one-deep feature scopes (`artifacts/scope/features/*/INDEX.md`) are discovered. Deeper nesting requires STATE.md with an explicit `scope_root` field.

4. If no scope root / no INDEX.md / no feature INDEX.md → scope_mode = FALSE, fall through to existing designs/ detection below.

---

Locate the architect's task specs:

1. Read `context/STATE.md` Pipeline Position `current_sprint` field to identify the current sprint.

If STATE.md doesn't exist: Tell the user — 'No STATE.md found. Run `/mk-flow-init` to set up state tracking, then `/architect` to plan.' Do not proceed without knowing which sprint to execute.

Then read the PLAN.md in `[cwd]/artifacts/designs/` for:
   - The sprint's task specs: `artifacts/designs/[slug]/sprints/sprint-N/`
   - Architecture context, interface contracts, and fitness functions

2. Read ALL task specs for the current sprint. For each, note:
   - Task name and goal
   - Dependencies (which tasks must complete first)
   - Estimated size
   - Files to create/modify
   - Acceptance criteria

3. If no task specs are found:
   - Check if PLAN.md exists but sprint tasks haven't been created yet → tell the user to run `/architect` first
   - If there's a BUILD-PLAN.md but no PLAN.md → this is a standalone build, route to workflows/build-milestone.md instead

4. Read the architect's PLAN.md for context:
   - Vision (what we're building overall)
   - Architecture overview
   - Interface contracts (data flowing between tasks)
   - Fitness functions (architectural assertions to maintain)
</step_1_find_task_specs>

<step_2_plan_execution_order>
Analyze task dependencies and plan execution:

**2a. Build the dependency graph:**
From each task spec's "Depends on" field, map which tasks can run first, which must wait.

**2b. Identify parallel opportunities:**
Tasks with NO dependencies on each other can execute simultaneously via Agent subagents. Group into waves:
- **Wave 1:** Tasks with no dependencies (or dependencies already met by previous sprints)
- **Wave 2:** Tasks that depend on Wave 1 output
- **Wave 3:** Tasks that depend on Wave 2 output
- etc.

**2c. Verify feasibility:**
- For each task, confirm its input dependencies exist (files from previous tasks/sprints)
- Check interface contracts — does the input format match what the task spec expects?
- Flag any tasks that can't start because their inputs are missing

**If scope_mode:**
Build dependency graph from task .agent.md YAML frontmatter (each has module, component, depends_on fields).

Group into waves:
- Wave 1: tasks with no unmet dependencies
- Wave 2: tasks depending on Wave 1
- etc.

Apply tier ordering from INDEX.md Module Status table:
- Tier-1 (core) modules execute before Tier-2 (feature)
- Tier-3 (integration) modules execute last

Batch size: INDEX.md decomposition_config.parallel_batch_size (default 5).

Present the same wave plan format as non-scope mode.

Present the execution plan briefly:
```
Sprint [N]: [count] tasks

Wave 1 (parallel): Task [A], Task [B]
Wave 2 (sequential): Task [C] (depends on A)
Wave 3 (parallel): Task [D], Task [E] (depend on C)

Ready to execute?
```

Don't wait for confirmation — start executing unless there's a dependency issue.
</step_2_plan_execution_order>

<step_3_execute_tasks>
Execute tasks wave by wave.

**For parallel tasks (same wave, no dependencies):**
Launch each task as a separate Agent subagent:

```
Execute this task from the architect's sprint plan.

TASK SPEC: [Full content of the task spec]
PROJECT CONTEXT: [PLAN.md vision, relevant architecture, interface contracts]
CODEBASE: [Key structural info — existing patterns, conventions from CLAUDE.md]

Instructions:
1. Read the task spec completely — goal, context, interfaces, pseudocode, acceptance criteria
2. Read any existing files referenced in the "Context" section
3. Follow the pseudocode to implement the task
4. Create/modify all files listed in "Files Touched"
5. Verify every acceptance criterion
6. Handle all edge cases listed in the spec
7. OVERFLOW PROTOCOL:
   Track the total lines of NEW code you write (exclude blank lines and comment-only lines).
   If you reach {overflow_threshold} lines (default: 300) in any single file:
     a. STOP implementation of that file
     b. Write what you have so far (partial is better than nothing)
     c. Add to your execution report:
        OVERFLOW: {filename} reached {N} lines (threshold: {overflow_threshold}).
        This task needs further decomposition before implementation can complete.
     d. Continue with other files in the task (they may be under threshold)

Requirements:
- Follow the pseudocode faithfully — it's a contract, not a suggestion
- Respect interface contracts — your outputs must match the specified format
- If you encounter something the spec didn't anticipate, implement the most reasonable behavior AND flag it in your report
- Do NOT make architectural decisions — those are the architect's job. If a decision is needed, flag it.

Return:
## Task [K]: [Name] — Execution Report

### What Was Built
[Specific description of what was implemented]

### Files Changed
- `path/file` — CREATE/MODIFY — [what changed]

### Acceptance Criteria Results
- [x] [Criterion] — PASS
- [ ] [Criterion] — FAIL: [why]

### Deviations from Spec
[Anything that differed from the pseudocode and why]

### Flags for Architect
[Decisions needed, unexpected discoveries, edge cases not in spec]

### Overflow Flags
- [filename] — [N] lines (threshold: [overflow_threshold]) — needs further decomposition
OR "None" if all files are under threshold.
```

**Scope mode brief assembly:**

If scope_mode, each agent receives an ASSEMBLED brief instead of a raw task spec:
1. Read the task .agent.md (leaf task spec)
2. Extract module and component from YAML frontmatter
3. Read system-map.agent.md — extract architecture constraints
4. Find relevant contracts: glob `contracts/*--{module}.md` AND `contracts/{module}--*.md`
5. Find relevant patterns: read each pattern, include if applies_to contains the module or "all"
6. Find relevant decisions: read each D*.md, include only decisions where status is "final" (skip all other statuses: draft, proposed, superseded-by-*, empty string, or any unrecognized value). Then filter to decisions where modules_affected contains the module.
7. Compose assembled brief:
   - `<context>` from system-map
   - `<constraint>` from task spec (already positive-only)
   - `<read_first>` from task spec
   - `<interface>` from task spec
   - `<patterns>` from architecture patterns
   - `<decisions>` from architecture decisions
   - `<files>` from task spec
   - `<verify>` from task spec
   - `<contract>` from architecture contracts

The agent prompt uses the same format as above but with the assembled brief replacing the raw TASK SPEC section.

**For sequential tasks:**
Execute one at a time. After each completes, verify its output before starting the dependent task.

**Deviation rules (same as build-milestone.md):**

| Level | Type | Action |
|-------|------|--------|
| 1 | Typos, minor formatting, trivial bugs | Auto-fix, note in report |
| 2 | Missing imports, broken tests, small omissions | Auto-fix, note in report |
| 3 | Critical missing functionality for THIS task | Auto-fix, note in report, explain |
| 4 | Architecture changes, new dependencies, scope changes | **STOP — flag for architect** |
</step_3_execute_tasks>

<step_4_verify_per_task>
After each task (or wave) completes:

1. **Read the execution report** from each agent
2. **Verify acceptance criteria** — re-check each criterion against the actual files
3. **Check interface contracts** — does this task's output match what downstream tasks expect?
4. **Check fitness functions** from PLAN.md — are architectural properties preserved?
5. **Check for regressions** — did this task break anything from previous tasks/sprints?
6. **Overflow check** — for each file created/modified by the agent:
   - Count non-blank, non-comment lines
   - If any file exceeds the overflow threshold (300 lines default, or INDEX.md decomposition_config.overflow_threshold in scope mode):
     - Mark task as DONE WITH OVERFLOW (not FAILED — partial work is preserved)
     - The overflow items need further decomposition, not re-implementation
   - This check catches overflow regardless of whether the agent self-reported it

If a task FAILED:
- If it's a Level 1-3 deviation, fix it immediately
- If it's a Level 4 deviation, flag it and continue with other tasks (don't block the sprint)
- Note all failures in the sprint completion report
</step_4_verify_per_task>

<step_5_sprint_completion_report>
After all tasks in the sprint are executed and verified, produce a sprint completion report.

Save to: `[cwd]/artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md`

If scope_mode: save to `{scope_root}/reports/implementation-wave-{N}.md` instead.
In scope mode, N is a sequential counter starting from 1, incremented for each implementation wave executed against this scope. Derive N from existing report files: glob `{scope_root}/reports/implementation-wave-*.md`, N = count + 1. If no existing reports, N = 1.
Same content format.

```markdown
> **type:** completion-report
> **output_path:** artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md
> **key_decisions:** [decisions or deviations during execution, or "none"]
> **open_questions:** [flags for architect review, or "none"]
> **date:** YYYY-MM-DD
> **plan:** [Path to PLAN.md]
> **tasks_executed:** [N] of [N]

# Sprint [N] Completion Report

## Task Results

### Task [K]: [Name]
- **Status:** DONE / DONE WITH DEVIATIONS / FAILED
- **Acceptance criteria:** [X/Y] passed
- **Deviations:** [List or "None"]
- **Flags for architect:** [List or "None"]

### Task [K+1]: [Name]
[Same structure]

## Sprint Summary
- Tasks completed: [N/N]
- Total acceptance criteria: [X/Y] passed
- Deviations from spec: [count]
- Flags for architect: [count]
- Files created: [count]
- Files modified: [count]

## Architect Review Items
[Aggregated list of all flags from all tasks — things the architect needs to address in the review workflow]

## Overflow Summary
[N] task(s) exceeded the overflow threshold ({overflow_threshold} lines):

| Task | File | Lines | Threshold | Action Needed |
|------|------|-------|-----------|---------------|
| [task] | [file] | [N] | [threshold] | Further decomposition at next level |

Recommendation: Run `/architect scope level-{N+1} {module}` to decompose
the oversized tasks before continuing implementation.

IF no overflows: "No overflow detected — all files within threshold."

## Ready for QA
Sprint execution complete. Recommend running `/architect` for QA review and reassessment.
```
</step_5_sprint_completion_report>

<step_6_update_state>
If `context/STATE.md` exists, update the Pipeline Position section with exact values:
```markdown
## Pipeline Position
- **Stage:** sprint-N-complete
- **Requirements:** [keep existing value]
- **Audit:** [keep existing value]
- **Plan:** [keep existing value — path to PLAN.md]
- **Current sprint:** N
- **Build plan:** —
- **Task specs:** [keep existing value — path to sprint's task spec directory]
- **Completion evidence:** artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md
- **Last verified:** —
```
Also update **Current Focus** to: "Sprint N executed for [feature]. Architect QA review pending."

Write Current Focus as a state description — what IS, not what to DO. Pipeline Position handles routing.

Update PLAN.md Sprint Tracking: fill in the Completed count for this sprint (e.g., 3/3). Do NOT write a Status column — status lives in STATE.md only.

**Scope mode additional updates:**
If scope_mode:
- Update INDEX.md Module Status: mark implemented leaf tasks as status "implemented"
- If all leaf tasks in a module are implemented, update module status accordingly
- Keep existing scope_root value in STATE.md Pipeline Position
- If overflow detected in scope_mode: update INDEX.md leaf task status to "overflow" for affected tasks (they need to return to scope-decompose for further decomposition)
- Add overflow count to STATE.md Current Focus if any overflows occurred
</step_6_update_state>

<step_7_handoff>
Present a summary with the exact next command:

```
Sprint [N] executed: [X/Y] tasks complete.

[If all passed:]
All acceptance criteria met. No deviations.

[If deviations:]
[N] deviations from spec — see COMPLETION.md.
[N] flags for architect review.

Completion report: [path]

To continue the pipeline, run:
   /architect

The architect will run QA review and plan sprint [N+1].
You can /clear first to free up context — all state is on disk.
```

The executor's job is done. QA and reassessment are the architect's responsibility.
</step_7_handoff>

</process>

<success_criteria>
- Task specs were read from architect's sprint directory
- Dependency graph was built and execution was parallelized where possible
- Each task was executed following its pseudocode and interface contracts
- Each task's acceptance criteria were verified
- Deviations were handled per deviation rules (1-3 auto-fixed, 4 flagged)
- Fitness functions checked after execution
- Sprint completion report saved to disk
- PLAN.md Sprint Tracking Completed column updated
- STATE.md Pipeline Position updated to sprint-N-complete
- Architect handoff suggested for QA review
</success_criteria>
