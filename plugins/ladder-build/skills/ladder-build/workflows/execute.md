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
Locate the architect's task specs:

1. Check `[cwd]/artifacts/designs/` for a PLAN.md. Read it and identify:
   - Which sprint is current (check Sprint Tracking table)
   - Where the task specs live: `artifacts/designs/[slug]/sprints/sprint-N/`

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
```

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

If a task FAILED:
- If it's a Level 1-3 deviation, fix it immediately
- If it's a Level 4 deviation, flag it and continue with other tasks (don't block the sprint)
- Note all failures in the sprint completion report
</step_4_verify_per_task>

<step_5_sprint_completion_report>
After all tasks in the sprint are executed and verified, produce a sprint completion report.

Save to: `[cwd]/artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md`

```markdown
# Sprint [N] Completion Report

> **Date:** YYYY-MM-DD
> **Plan:** [Path to PLAN.md]
> **Tasks executed:** [N] of [N]

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

## Ready for QA
Sprint execution complete. Recommend running `/architect` for QA review and reassessment.
```
</step_5_sprint_completion_report>

<step_6_update_state>
If `context/STATE.md` exists and has a Pipeline Position section:
- Update stage to `sprint-N-complete`
- Note: "Sprint N executed. Awaiting architect review."

Update the PLAN.md Sprint Tracking table:
- Mark the sprint's task count as completed
- Note any deviations
</step_6_update_state>

<step_7_handoff>
Present a summary to the user:

```
Sprint [N] executed: [X/Y] tasks complete.

[If all passed:]
All acceptance criteria met. No deviations.

[If deviations:]
[N] deviations from spec — see COMPLETION.md.
[N] flags for architect review.

Completion report: [path]
Next step: `/architect` for QA review and sprint [N+1] planning.
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
- PLAN.md and STATE.md updated
- Architect handoff suggested for QA review
</success_criteria>
