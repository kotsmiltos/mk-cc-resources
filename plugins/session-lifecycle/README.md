# session-lifecycle

Five skills for not losing what you learned when a session ends.

## Install

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install session-lifecycle@mk-cc-resources
```

## Skills

| Command | What it does |
|---|---|
| `/handoff` | Capture the session at its end — what was done, what remains, the critical context, the blockers. Writes a permanent timestamped file to `.claude/handoffs/` plus an `INDEX.md` ledger, and refreshes `.claude/handoff.md` as the latest one. |
| `/resume` | Restore that context at the start of the next session, validate it against the real branch and pipeline state, and report anything that drifted. The history is preserved, never truncated. |
| `/claude-md-sync` | Read the git diff, find the CLAUDE.md sections it made stale, and propose the edits one at a time for your approval. |
| `/retro` | A retrospective from real data — git, pipeline state, QA reports — gaps before strengths. Scope it to `sprint-N`, `session`, or `all`. |
| `/meta-review` | Diagnose the session itself: where the friction was, what root cause it points at, and where a fix would live. Diagnostic only — it never applies changes. |

## The loop

```
Session end     /handoff        → a permanent handoff + ledger entry (offers /claude-md-sync if docs are stale)
Session start   /resume         → context back, state validated, first action suggested
After a sprint  /retro          → what actually happened, measured
Periodically    /meta-review    → what keeps costing you time
```

## What makes a handoff worth reading

`/handoff` gates its **Critical Context** section: it has to name at least one rejected approach,
gotcha, or discovered constraint *with the reason* — or say explicitly that there is no
non-obvious context and why. An empty section does not pass, because that section is the only
reason the next session avoids repeating the work.

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
