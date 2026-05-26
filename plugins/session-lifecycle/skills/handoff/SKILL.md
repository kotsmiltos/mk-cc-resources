---
name: handoff
description: Generate session handoff document — what was done (with file/commit refs), what remains (priority-ordered), critical context (decisions, gotchas, rejected approaches), blockers. Saves to .claude/handoff.md. Triggers /claude-md-sync if 10+ files changed or impact-map sections touched. Use when ending a session, pausing mid-task, or switching projects.
disable-model-invocation: true
argument-hint: "[optional notes to include in handoff]"
---

<objective>
Produce a structured `.claude/handoff.md` that lets the next session pick up cold with full context. Optionally trigger `/claude-md-sync` if CLAUDE.md is stale.
</objective>

## Current session state

- **Branch:** !`git branch --show-current 2>/dev/null || echo "not a git repo"`
- **Uncommitted changes:**
```!
git diff --stat 2>/dev/null || echo "no git"
```
- **Recent commits (this session):**
```!
git log --oneline -15 2>/dev/null || echo "no git history"
```
- **Staged files:**
```!
git diff --cached --stat 2>/dev/null || echo "none"
```

<instructions>

## 1. Gather context

Read the injected git state above. Then:
- If `.pipeline/state.yaml` exists, read it for pipeline phase, sprint, blocked_on, next_action.
- If `.planning/STATE.md` or `context/STATE.md` exists, read for project state.
- Check for open tasks, TODOs, or in-progress work markers.

## 2. Check CLAUDE.md staleness

Count files changed in session (from git diff + git log above). If:
- More than 10 files changed, OR
- Changes touch directories listed in CLAUDE.md impact map / shared modules / file locations

Then inform the user: "CLAUDE.md may need sync. Run `/claude-md-sync` or I can trigger it now."
If the user confirms (or passed `--sync` in arguments), invoke the `claude-md-sync` skill via the Skill tool before generating handoff.

## 3. Generate handoff document

Write `.claude/handoff.md` with this exact structure:

```markdown
---
branch: <current branch>
timestamp: <ISO 8601>
pipeline_phase: <phase or "none">
---

## What Was Done
<Bulleted list of concrete accomplishments. Reference specific files, functions, commits.>

## What Remains
<Bulleted list ordered by priority. Each item: what needs doing + why it matters.>

## Critical Context
<Non-obvious things the next session MUST know. Decisions made, constraints discovered, gotchas hit, approaches tried and rejected with WHY they failed.>

## Blockers
<Anything preventing progress. External dependencies, open questions, missing info. "None" if clear.>

## Branch State
- Uncommitted changes: <yes/no, what>
- Tests passing: <yes/no/unknown>
- Pipeline: <phase + next action, or "no pipeline">

## Notes
<User-provided notes from $ARGUMENTS, or "None">
```

## 4. Confirm

Report: saved `.claude/handoff.md`. State the verifiable check: "handoff contains N accomplishments, M remaining items, branch is X."

</instructions>
