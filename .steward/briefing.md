# mk-cc-resources — briefing (2026-07-26, post 19-commit ship)
Ship position: local main == origin/main == 71a0b0a, PUSHED (19 commits). kb 0.4.0→0.7.0 in three waves + essense-flow 0.26.1; marketplace 2.37.0, bundle 2.26.0, rows verified equal. kb tests 460 across six suites; all other suites green.
Last change: kb became the whole memory organ — pull core + per-prompt hint lines + a rolling session digest (short-term) + a kb-scribe Stop-block (enforced writes) + 0.7.0 self-running: coverage-driven re-seed, presence self-activation, digest rotation.
BUT NOTHING IS LIVE: installed kb is 0.3.0 and hooks register at INSTALL time — every "it maintains itself" claim is proven only in tests and piped runs.
Next 3 tasks:
1. Update the kb plugin + RESTART, then prove it off disk: a new kb-session-start line, a "digest":true pull line, and an MCP-tool line in .claude/kb/trace.jsonl (baseline: 21 lines, none of those). kb-scribe writes NO trace — its proof is the block + the digest.
2. Crowd-game: commit its uncommitted .claude/kb.json, then deep /kb-seed with `kb coverage` first — first foreign corpus, and the miss list rungs 2/3 gate on.
3. Fix our own briefing over-cap defect (steward): enforce the budget at write time + a marker naming the dropped chars.
Decisions waiting: Q10 — who forces the RECOMPUTE? crowd-game went a full session stale; captures land, integration doesn't. Default: narrow enforced sync reusing kb-scribe's contract.
Watch: ambient kb use still unproven (T13: trigger visible, no query fired); counts-in-prose drift (CLAUDE.md says statusline 12, suite runs 16).
