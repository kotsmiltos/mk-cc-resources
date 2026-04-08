> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/task-14-overflow-detection.md
> **sprint:** 3
> **status:** planned
> **depends_on:** T13
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D10
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 14: Overflow Detection

## Goal
Add overflow detection to the ladder-build execute workflow so that implementation agents stop and report back when their output exceeds 300 lines (D10 threshold). This prevents underestimated leaf tasks from producing oversized, low-quality implementations — the agent flags the overflow and the task gets sent back for further decomposition.

## Context
- Requirements Section 2.6: "Overflow detection at implementation time — agent stops at 300 lines and reports back for further decomposition"
- Requirements Section 4 Phase 6: ">300 lines = stop, report, needs further decomposition"
- D10: Minimum size gate threshold is 300 lines. Same threshold used for overflow.
- T13 establishes the scope execution flow — this task adds overflow handling on top of it
- Current execute.md has no line count checking — agents implement until done regardless of size
- Overflow detection applies to BOTH scope mode and legacy mode (it's a general quality gate)

## Interface Specification

### Inputs
- Implementation agent's output (files created/modified)
- Overflow threshold: 300 lines (from INDEX.md decomposition_config.overflow_threshold in scope mode, or hardcoded 300 in legacy mode)

### Outputs
- Overflow flag in agent execution report (new field)
- Overflow summary in sprint completion report
- Recommendation to user: which tasks need further decomposition

### Contracts with Other Tasks
- T13 (ladder-build scope integration) provides the scope execution flow → this task adds overflow checking to the agent prompt and post-execution verification
- T7 (scope-decompose workflow) will re-decompose flagged tasks at the next level

## Pseudocode

```
MODIFY execute.md — add overflow detection in two places:

1. IN step_3_execute_tasks, agent prompt:
   ADD to the "Instructions" section of the agent prompt:
   
   OVERFLOW PROTOCOL:
   Track the total lines of NEW code you write (exclude imports, blank lines, comments).
   If you reach {overflow_threshold} lines (default: 300) in any single file:
     1. STOP implementation of that file
     2. Write what you have so far (partial is better than nothing)
     3. Add to your execution report:
        OVERFLOW: {filename} reached {N} lines (threshold: {overflow_threshold}).
        This task needs further decomposition before implementation can complete.
     4. Continue with other files in the task (they may be under threshold)
   
   ADD to the "Return" format:
   ### Overflow Flags
   - [filename] — [N] lines (threshold: [overflow_threshold]) — needs further decomposition
   OR "None" if all files are under threshold.

2. IN step_4_verify_per_task:
   ADD overflow check AFTER acceptance criteria verification:
   
   FOR each file created by the agent:
     line_count = count non-blank, non-comment lines in file
     IF line_count > overflow_threshold:
       overflow_detected = true
       ADD to overflow_list: {file, line_count, task_name}
   
   IF overflow_detected:
     Mark task as DONE WITH OVERFLOW (not FAILED — partial work is valid)
     The overflow items need further decomposition, not re-implementation

3. IN step_5_sprint_completion_report:
   ADD "Overflow Summary" section after "Architect Review Items":
   
   ## Overflow Summary
   [N] task(s) exceeded the overflow threshold ({overflow_threshold} lines):
   
   | Task | File | Lines | Threshold | Action Needed |
   |------|------|-------|-----------|---------------|
   | [task] | [file] | [N] | [threshold] | Further decomposition at next level |
   
   Recommendation: Run `/architect scope level-{N+1} {module}` to decompose
   the oversized tasks before continuing implementation.
   
   IF no overflows:
     "No overflow detected — all files within threshold."

4. IN step_6_update_state:
   IF overflow_detected AND scope_mode:
     Update INDEX.md: mark overflowed leaf tasks as status "overflow"
     (They need to go back to scope-decompose for further decomposition)
   
   STATE.md note in Current Focus: mention overflow count if any
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | Add overflow protocol to agent prompt (step_3), overflow verification (step_4), overflow summary in completion report (step_5), INDEX.md overflow status (step_6) |

## Acceptance Criteria
- [ ] Agent prompt includes overflow protocol with threshold instruction
- [ ] Agents are instructed to stop and report when any single file exceeds overflow_threshold lines
- [ ] Post-execution verification independently counts lines in created files (does not rely solely on agent self-report)
- [ ] Overflow threshold reads from INDEX.md decomposition_config.overflow_threshold in scope mode (default 300)
- [ ] Overflow tasks are marked as DONE WITH OVERFLOW, not FAILED (partial work is preserved)
- [ ] Completion report includes an "Overflow Summary" section with specific file/line/action table
- [ ] Completion report recommends `/architect scope level-N` for overflowed tasks
- [ ] INDEX.md leaf task status updated to "overflow" for affected tasks (scope mode only)
- [ ] No overflow = "No overflow detected" in completion report (not absent section)
- [ ] Line counting excludes blank lines and comment-only lines

## Edge Cases
- Agent ignores overflow instruction and produces 500+ lines — post-execution verification catches it regardless of agent compliance
- Multiple files in one task overflow — each file reported separately in the overflow table
- Task has one file under threshold and one over — task is DONE WITH OVERFLOW (not fully failed)
- Overflow threshold is 0 or negative in INDEX.md — ignore invalid value, use default 300
- Legacy mode (no INDEX.md) — use hardcoded threshold of 300 lines
