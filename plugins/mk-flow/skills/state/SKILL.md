---
name: state
description: Per-project state tracking with status, pause, and resume workflows. Maintains STATE.md as a living document updated inside workflows (not hooks). Detects stale state at session start. Generates copy-paste handoff commands for fresh context starts.
---

<objective>
Track where you are in any project across sessions. STATE.md is the single source of truth — current focus, what's done, what's blocked, decisions made, and amendments pending. Updated inside workflows (not hooks) so it's always reliable. Provides status summaries, pause snapshots, and resume context loading.
</objective>

<quick_start>
If the user asks "where am I?", "what's the status?", "what's going on?" → route to workflows/status.md
If the user says "pause", "save context", "I'm stopping" → route to workflows/pause.md
If the user says "resume", "continue", "pick up where I left off" → route to workflows/resume.md
If this is the first interaction of a session, check STATE.md age and offer stale detection.
</quick_start>

<essential_principles>
<core_rules>
1. **State updates happen inside workflows, not hooks.** After completing milestones, explorations, or significant decisions — not as cleanup.
2. **STATE.md stays under 50 lines.** Keep it scannable. Move detailed history to milestone reports or notes.
3. **Stale detection on first interaction.** If STATE.md is older than 24 hours, prompt: "STATE.md is [N] days old. [Last known state]. Still accurate?"
4. **Handoff commands are copy-paste ready.** Include: which skill, what's done, what's next, which files to read.
5. **Note-tracker is optional context.** If present, pull open items for status summaries. If not, STATE.md is sufficient.
6. **.continue-here.md is for explicit pauses.** Written by the pause workflow, consumed by resume. More detailed than STATE.md.
7. **drift-check is the verification mechanism.** The status workflow runs `scripts/drift-check.sh` to verify project status against filesystem evidence (COMPLETION.md, milestone reports). STATE.md is the single source of truth, validated by drift-check — do not rely on plan documents for status.
</core_rules>
</essential_principles>

<workflows_index>
All in `workflows/`:

| Workflow | Purpose |
|----------|---------|
| status.md | Run drift-check, fix drift, present verified status |
| pause.md | Write .continue-here.md snapshot + handoff command |
| resume.md | Load snapshot, show summary, route to next action |
</workflows_index>

<scripts_index>
All in `scripts/`:

| Script | Purpose |
|--------|---------|
| drift-check.sh | Verify project status against filesystem evidence (COMPLETION.md, milestone reports). Exit 0 = no drift, 1 = drift found, 2 = error. |
</scripts_index>

<templates_index>
All in `templates/`:

| Template | Purpose |
|----------|---------|
| state.md | STATE.md format — under 50 lines, updated in workflows |
| continue-here.md | Pause snapshot format with resume command |
</templates_index>

<routing>
| Signal | Workflow |
|--------|----------|
| "where am I", "status", "what's going on", "what's next" | workflows/status.md |
| "pause", "save context", "stopping", "ending session" | workflows/pause.md |
| "resume", "continue", "pick up", "where did we leave off" | workflows/resume.md |
| First interaction + stale STATE.md | Stale detection prompt, then status |
</routing>

<success_criteria>
- STATUS shows: current focus, done items, blocked items, pending amendments, next up
- STATUS pulls from note-tracker when available (open bugs, pending questions)
- PAUSE writes .continue-here.md with all sections filled
- PAUSE generates copy-paste resume command
- RESUME reads .continue-here.md, shows summary, routes to next action
- Stale detection triggers when STATE.md is older than 24 hours
- STATE.md stays under 50 lines
</success_criteria>
