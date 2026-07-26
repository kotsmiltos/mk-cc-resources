# mk-cc-resources — briefing (2026-07-27, post-ship fixes)
Ship position: local main == origin/main == 817b472, PUSHED — the 19-commit batch plus three fix commits. kb 0.7.0 · essense-flow 0.26.1 · plugin-toolkit 1.7.2 · marketplace 2.38.0 · bundle 2.26.0. kb tests 462 across six suites; all other suites green.
Last change: 817b472 — skill-path fix done RIGHT: `"${CLAUDE_PROJECT_DIR:-.}/plugins/"*/` survives BOTH doc unknowns (substitution inside a shell block? its cwd?); executed in 4 scenarios — subdirectory/env-unset is the row bare-relative would have shipped broken. Plus .planning/rebuild scrubbed + the 1.7.2 cascade.
BUT NOTHING IS LIVE: installed kb is 0.3.0 and hooks register at INSTALL time — every "it maintains itself" claim is proven only in tests and piped runs.
Next 3 tasks:
1. Update the kb plugin + RESTART, then prove it off disk in .claude/kb/trace.jsonl (baseline: 21 lines, all kb-pull-hook, all "digest":false): expect a kb-session-start line, a "digest":true line, an MCP-tool line, AND a kb-scribe-hook "blocked":true line.
2. Crowd-game: commit its uncommitted .claude/kb.json, then deep /kb-seed with `kb coverage` first — first foreign corpus, and the miss list rungs 2/3 gate on.
3. Fix our own briefing over-cap defect (steward): enforce the budget at write time + a marker naming the dropped chars.
Decisions waiting: Q10 — who forces the RECOMPUTE? Crowd-game went a session stale; THIS model just lagged too (recomputed against a moving tree). Default: narrow enforced sync reusing kb-scribe's contract.
Watch: `.steward/` is COMMITTED + public — 7 essense-flow test files still leak absolute paths (tasks #17); ambient kb use still unproven (T13).
