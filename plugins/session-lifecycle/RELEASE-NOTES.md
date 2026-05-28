# Release notes — session-lifecycle

## 1.1.0 — Meta-review diagnostic refocus + description refinements

**meta-review refactored to diagnostic-only.** Old version proposed diffs and offered to apply fixes; new version identifies issues + root causes + points to where fixes live, never applies changes. Key reframing: "repeated manual steps" → "multi-step workflow chains" with explicit examples of what IS/IS NOT a chain (3+ deliberate actions, not single tool calls — `git log` alone is not a skill candidate). Added scope modes — `session` (default), `wide` (handoffs + memory + recent commits), or specific topic. Added mk-cc-resources plugin ecosystem analysis — checks which plugins fit session work but went unused, why they didn't fire (description mismatch, wrong trigger, unknown). Constraint added: never fabricate findings; trivial sessions return "nothing to report" rather than padding.

**Description refinements (all 5 skills).** Frontmatter descriptions sharpened for natural-query discovery and explicit trigger context:
- handoff: names concrete output (`.claude/handoff.md`), trigger condition for /claude-md-sync auto-fire
- resume: names validation steps (branch match, commits since handoff, pipeline phase compare)
- claude-md-sync: names specific CLAUDE.md sections it audits (impact map, shared modules, file locations)
- retro: names data sources (git, .pipeline/, QA reports, handoff archives) and accepted scopes
- meta-review: see above

No behavioral changes to handoff/resume/claude-md-sync/retro bodies — description refinements only.

## 1.0.0 — Initial release

Five skills for cross-session continuity and workflow self-improvement:
- **handoff** — capture session state to `.claude/handoff.md` (what was done, what remains, critical context, blockers); optionally triggers /claude-md-sync if CLAUDE.md appears stale
- **resume** — restore context from prior handoff, validate against current state, suggest first action, archive consumed handoffs
- **claude-md-sync** — scan git diff, identify stale CLAUDE.md sections, propose targeted edits for approval (callable standalone or by /handoff)
- **retro** — metrics-driven retrospective (commits, files changed, tasks done/failed/drifted) with gaps-before-strengths discipline; accepts sprint-N / session / all scope
- **meta-review** — mine session for skill improvement opportunities

Designed as cohesive set: handoff produces what resume consumes; meta-review proposes skill evolution from observed patterns.
