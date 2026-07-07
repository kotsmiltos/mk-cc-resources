---
name: handoff
description: Generate session handoff document — what was done (with file/commit refs), what remains (priority-ordered), critical context (decisions, gotchas, rejected approaches), blockers. Saves a NEW timestamped handoff to .claude/handoffs/ each time (history is never overwritten), updates the .claude/handoffs/INDEX.md ledger, and refreshes .claude/handoff.md as the latest-alias /resume reads. Triggers /claude-md-sync if more than 10 files changed or impact-map sections touched. Use when ending a session, pausing mid-task, or switching projects.
disable-model-invocation: true
argument-hint: "[--sync] [optional notes to include in handoff]"
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
- If `.pipeline/state.yaml` exists, read it for `phase`, `sprint`, `wave`, `last_updated`. For the recommended next command, use the essense-flow-tools `next` op or `/next` (essense-flow).
- If `.planning/STATE.md` or `context/STATE.md` exists, read for project state.
- Check for open tasks, TODOs, or in-progress work markers.

## 2. Check CLAUDE.md staleness

Count files changed in session (from git diff + git log above). If:
- More than 10 files changed, OR
- Changes touch directories listed in CLAUDE.md impact map / shared modules / file locations

Then inform the user: "CLAUDE.md may need sync. Run `/claude-md-sync` or I can trigger it now."
If the user confirms (or passed `--sync` in arguments), invoke the `claude-md-sync` skill via the Skill tool before generating handoff.

## 3. Generate handoff document

Handoffs are an append-only HISTORY — never overwrite a prior one. Compute a filesystem-safe stamp `<fs-ts>` from the `timestamp` value (ISO 8601 with `:` replaced by `-`, e.g. `2026-06-25T14-32-09Z`). Then write the document to BOTH:

1. `.claude/handoffs/handoff-<fs-ts>.md` — the **permanent** copy (one per handoff; never overwritten).
2. `.claude/handoff.md` — the **latest alias** (`/resume` reads this; same content as the permanent copy).

Use this exact structure for both:

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

<!-- Quality gate — this section is why the handoff exists (a next session that repeats a
     rejected approach or re-hits a solved gotcha lost exactly what should have been captured
     here). ANTI-SIGNAL: the section is empty, or only restates What Was Done — you are
     under-capturing; re-scan the session for one decision with a discarded alternative, one
     gotcha that cost time, one constraint discovered. EXIT: the section names at least one
     rejected approach/gotcha/constraint WITH its why — or explicitly states "no non-obvious
     context this session" plus the reason that's true (e.g. pure mechanical batch). -->

## Blockers
<Anything preventing progress. External dependencies, open questions, missing info. "None" if clear.>

## Branch State
- Uncommitted changes: <yes/no, what>
- Tests passing: <yes/no/unknown>
- Pipeline: <phase + recommended next command (from /next), or "no pipeline">

## Notes
<User-provided notes from $ARGUMENTS, or "None">
```

## 4. Update the handoff index

Maintain `.claude/handoffs/INDEX.md` — the newest-first ledger of every handoff. PREPEND one line for this handoff under the header (never rewrite existing lines):

```markdown
# Handoff index

- `<timestamp>` · `<branch>` · <one-line summary: the top remaining item, or the session's headline>  → `handoffs/handoff-<fs-ts>.md`
```

If the file does not exist, create it with the header + this first line. If it exists, insert the new line directly under the `# Handoff index` header so the most recent is first. The index is the durable track record — it is never truncated.

## 5. Confirm

Report: saved `.claude/handoffs/handoff-<fs-ts>.md` (permanent) + refreshed `.claude/handoff.md` (latest) + indexed in `.claude/handoffs/INDEX.md`. State the verifiable check: "handoff contains N accomplishments, M remaining items, branch is X; index now lists K handoffs; Critical Context carries ≥1 rejected-approach/gotcha/constraint with its why (or an explicit reasoned 'none')." A handoff whose Critical Context fails that last clause is not done — go back to step 3 and re-scan the session.

</instructions>
