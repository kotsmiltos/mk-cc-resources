# Release notes — session-lifecycle

## 1.2.0 — Handoffs are an append-only history (no more overwrite)

Handoffs were being lost: `/handoff` overwrote a single `.claude/handoff.md` every run, and `/resume` archived only the last 3 (deleting older ones). You couldn't look back across a project's handoffs. Now they accumulate.

- **`/handoff` writes a NEW permanent file each time** — `.claude/handoffs/handoff-<ts>.md` (filesystem-safe timestamp) — and PREPENDS a newest-first line to `.claude/handoffs/INDEX.md` (the durable ledger, never truncated). It still refreshes `.claude/handoff.md` as the **latest-alias**, so nothing downstream breaks.
- **`/resume` preserves history.** It reads `.claude/handoff.md` (unchanged), and instead of the old keep-last-3-delete-older archive, it just marks the latest consumed — the permanent copies + ledger in `.claude/handoffs/` are never deleted. A pre-1.2.0 single-file handoff is **migrated** into the history on first resume rather than discarded.
- **Fully backward-compatible / no backtrack.** `.claude/handoff.md` stays the canonical latest pointer (resume's contract unchanged); everything else is additive. Existing sessions behave identically; you simply gain the permanent indexed history.

## 1.1.1 — Portability + dead-field cleanup

**meta-review made portable and audience-neutral.** Injected plugin listing no longer hardcodes a machine-specific absolute path (username leak) — now resolves the plugins root via `${CLAUDE_PLUGIN_ROOT}/../`. Repo-coupling removed: skill discovery uses the available-skills list already in context (plus each plugin's SKILL.md under the plugins root for deeper reading) instead of assuming cwd = mk-cc-resources and reading marketplace.json; "mk-cc-resources plugins" reframed as "installed plugins"; fix locations phrased as "in the plugin's source repository (for marketplace authors)". Memory path described generically (per-project memory directory under `~/.claude/projects/`, munged project path). Stale thorough-mode pointer fixed — its HINTS table lives in `plugins/thorough-mode/hooks/thorough-mode.js` (hooks-only plugin now).

**Dead essense-flow state fields dropped.** handoff and resume referenced `blocked_on` / `next_action`, which don't exist in essense-flow's `state.yaml`. handoff now reads `phase, sprint, wave, last_updated` and gets the recommended next command from the essense-flow-tools `next` op or `/next`; resume suggests running `/next` when a pipeline exists.

**handoff↔resume contract closed.** resume now consumes everything handoff writes: surfaces handoff's `## Notes` verbatim in the resume report, and compares `## Branch State` (tests-passing flag, uncommitted-changes claim) against current reality, flagging drift.

**Cosmetics.** handoff description aligned to body ("more than 10 files"); `--sync` flag added to handoff's argument-hint; resume heading corrected to "Recent commits (last 5)"; resume archive name now uses full timestamp `handoff-<YYYY-MM-DDTHH-mm>.md` (filesystem-safe, no same-day collisions — existing `handoff-*.md` globs in retro/meta-review still match); retro verdict vocab updated to real essense-flow verdicts (verify: `implemented | partial | missing | drift | manual`; build: `verified / drifted / paused / contradiction / synthetic`); retro QA-report location corrected to `.pipeline/review/sprints/<n>/QA-REPORT.md`; claude-md-sync notes the `|| git diff --stat` fallback covers uncommitted-only changes when history < 20 commits.

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
