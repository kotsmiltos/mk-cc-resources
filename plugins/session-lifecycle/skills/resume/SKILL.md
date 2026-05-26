---
name: resume
description: Resume from previous session handoff. Reads .claude/handoff.md, validates branch matches, checks for commits since handoff, compares pipeline phase, reports any state drift. Presents remaining work priority-ordered and recommends the single best first action. Archives consumed handoffs (keeps last 3). Use at session start.
disable-model-invocation: true
---

<objective>
Restore context from `.claude/handoff.md` so work continues without information loss. Validate nothing drifted since handoff was written.
</objective>

## Handoff content

!`cat .claude/handoff.md 2>/dev/null || echo "ERROR: No handoff found at .claude/handoff.md"`

## Current state

- **Branch:** !`git branch --show-current 2>/dev/null`
- **Latest commits since handoff:**
```!
git log --oneline -5 2>/dev/null
```
- **Uncommitted changes:**
```!
git diff --stat 2>/dev/null || echo "clean"
```

<instructions>

## 1. Validate handoff exists

If handoff content shows "ERROR: No handoff found", inform user and stop. Suggest running `/handoff` in their previous session next time, or ask what they were working on to manually restore context.

## 2. Validate state consistency

Compare handoff expectations against current state:
- **Branch match:** Is current branch same as handoff's `branch` frontmatter? If not, report discrepancy.
- **New commits:** Are there commits after the handoff timestamp not mentioned in handoff? If so, summarize what changed.
- **Pipeline state:** If handoff lists a pipeline phase, check `.pipeline/state.yaml` — has phase advanced or regressed?

Report all discrepancies clearly before proceeding.

## 3. Present context

Summarize for the user in this format:

```
## Session Resume

**Last session:** <timestamp from handoff>
**Branch:** <branch> <match/mismatch indicator>

### Completed previously
<from handoff "What Was Done">

### Remaining work (priority order)
<from handoff "What Remains">

### Critical context to keep in mind
<from handoff "Critical Context">

### Blockers
<from handoff "Blockers">

### State discrepancies since handoff
<any drift found in step 2, or "None — state matches handoff">
```

## 4. Suggest first action

Based on remaining work priority + blockers + pipeline state:
- Recommend the single most impactful next action.
- If pipeline exists and has a `next_action`, factor that in.
- If blockers exist, suggest addressing the blocker first.

## 5. Archive handoff

After presenting, rename `.claude/handoff.md` to `.claude/handoff-<date>.md` (ISO date from frontmatter) so it doesn't get re-consumed. Keep last 3 archived handoffs; delete older ones.

</instructions>
