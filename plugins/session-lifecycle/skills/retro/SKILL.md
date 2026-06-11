---
name: retro
description: Metrics-driven retrospective — commits, files changed, lines +/-, tasks completed vs failed, drift items, blockers carried over. Reads git log, .pipeline/ sprint records, QA reports, handoff archives. Gaps and failures listed FIRST, then patterns, then what worked. Concrete recommendations for next session. Use after sprint completion or significant work session.
disable-model-invocation: true
argument-hint: "[sprint-N | session | all]"
---

<objective>
Produce an honest, metrics-backed retrospective. Gaps and failures first, strengths second. Specific numbers, not vibes.
</objective>

## Git history

```!
git log --oneline --since="7 days ago" 2>/dev/null || git log --oneline -30 2>/dev/null || echo "no git"
```

## Branch info

- **Branch:** !`git branch --show-current 2>/dev/null`
- **Commits in last 7 days:** !`git rev-list --count --since="7 days ago" HEAD 2>/dev/null || echo "unknown"`

<instructions>

## 1. Determine scope

Based on `$ARGUMENTS`:
- **`sprint-N`**: Read `.pipeline/build/sprints/N/` completion records + SPRINT-REPORT.md, and the QA report at `.pipeline/review/sprints/N/QA-REPORT.md`.
- **`session`**: Use git log from today (or since last handoff timestamp from `.claude/handoff-*.md`).
- **`all`**: Read all available sprint data + full git history on branch.
- **No argument**: Default to `session`.

## 2. Gather metrics

Collect what's available (skip what doesn't exist):

**From git:**
- Total commits in scope
- Files changed (count + list)
- Lines added / removed
- Commit frequency pattern (bursts vs steady)

**From pipeline (if `.pipeline/` exists):**
- Tasks attempted vs completed vs failed vs blocked
- Drift items found (from QA-REPORT.md or sprint reports)
- Verify verdicts (`implemented | partial | missing | drift | manual`) and build per-task verdicts (`verified / drifted / paused / contradiction / synthetic`)
- Wave count and wave sizes

**From handoff archives (if `.claude/handoff-*.md` exist):**
- Blockers that persisted across sessions
- Remaining items that carried over (scope creep signal)

## 3. Generate retrospective

Write output in this structure (to stdout, not a file, unless user asks to save):

```markdown
## Retrospective: <scope>
**Period:** <date range>
**Branch:** <branch>

### Metrics
| Metric | Value |
|--------|-------|
| Commits | N |
| Files changed | N |
| Lines +/- | +N / -N |
| Tasks completed | N/M |
| Drift items | N |
| Blockers | N |

### Gaps & Failures (address first)
<Numbered list. Each: what went wrong, why, impact. Be specific — file names, task IDs, error messages.>

### What Drifted
<Items where implementation diverged from spec/plan. Include: what was expected, what happened, whether it was resolved.>

### Patterns
<Recurring themes: types of bugs, common drift causes, bottleneck areas, tools that helped/hindered.>

### What Worked
<Specific things that went well. Approaches, tools, decisions that paid off.>

### Recommendations
<Concrete suggestions for next session/sprint. Each: what to do differently + expected impact.>
```

## 4. Offer to save

Ask user if they want the retro saved. If yes, write to:
- `.planning/retros/retro-<date>.md` (if `.planning/` exists)
- Or `.claude/retros/retro-<date>.md` (fallback)

</instructions>
