# session-lifecycle — release history (pre-CHANGELOG entries, verbatim)

These are the entries older than the five most recent, moved VERBATIM out of
`plugins/session-lifecycle/RELEASE-NOTES.md` when it became
`plugins/session-lifecycle/CHANGELOG.md` (2026-09-11). Nothing was edited or summarised — the
engineering detail lives here so the changelog can speak to the people who INSTALL the
plugin. Newest first, same order as before.

## 1.0.0 — Initial release

Five skills for cross-session continuity and workflow self-improvement:
- **handoff** — capture session state to `.claude/handoff.md` (what was done, what remains, critical context, blockers); optionally triggers /claude-md-sync if CLAUDE.md appears stale
- **resume** — restore context from prior handoff, validate against current state, suggest first action, archive consumed handoffs
- **claude-md-sync** — scan git diff, identify stale CLAUDE.md sections, propose targeted edits for approval (callable standalone or by /handoff)
- **retro** — metrics-driven retrospective (commits, files changed, tasks done/failed/drifted) with gaps-before-strengths discipline; accepts sprint-N / session / all scope
- **meta-review** — mine session for skill improvement opportunities

Designed as cohesive set: handoff produces what resume consumes; meta-review proposes skill evolution from observed patterns.
