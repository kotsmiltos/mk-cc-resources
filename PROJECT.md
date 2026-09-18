# mk-cc-resources — the page

Rewritten whole at the end of every sitting. States only what IS. History lives in git and
`DECISIONS.md`. Under 100 lines. (Owner ruling 2026-09-18: subtract — one page, one decisions
list, one Stop question.)

## What this is

The owner's Claude Code plugin marketplace: the toolkit that lets them chat freely with Claude,
have a vision built into well-made software, and have progress captured. Public repo; built
first for the owner's own ~40 production codebases.

## Laws (must stay true)

1. No work in the owner's absence.
2. Quality over speed. A mechanism that silently delivers nothing is a quality failure.
3. Mechanisms, not text. Deterministic before LLM. Fold before add. Fire conditionally.
4. Recompute, never accrete. This page is rewritten, never appended.
5. Never an unverified "done": every work turn names the check that proved it.
6. In-environment delivery, fewest clicks: content in the terminal, decisions as one-keystroke
   choices with the default first, never a file to read.
7. Nothing personal in shipped files (repo-guard's `leaked-path` enforces it).
8. Decoupled, open-for-extension code; measured per project, never across plugins.

## Where we are (2026-09-18)

- `main` is ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`). Tree clean.
- Running in the toolkit's own repo: **the subtraction**, built this sitting. turn-end 0.14.0
  ships the `page` duty (presence-gated on this file; check: turn-end suite 240/240, +7 page
  checks; live probe of the Stop hook from this root read page ON and the seven others OFF).
  Enabled here (`.claude/settings.local.json`, machine-local): turn-end with ONE duty,
  thorough-mode (`@prompt`, `@ship`), prism, elicit, plugin-toolkit (dev gates), caveman,
  statusline, alert-sounds. Disabled here: kb, steward, verifiability-lens, patterns, reuse-gate,
  essense-flow, essense-autopilot, session-lifecycle. Takes effect at the next session start.
- `@PROJECT.md` is imported by CLAUDE.md, so this page loads natively every session and again
  after compaction. `.steward/` stays on disk as history until the fleet decision below.
- Last shipped (unpushed): kb 0.16.1, steward 0.7.1, turn-end 0.13.1 — hints off by default,
  the garden, preamble stripped from injections, recall engine switch, steward on sonnet. All
  gates green: test-all 36/36 (2213 checks), registry-check 0, repo-guard clean.
- Measured this week (whole-life, four projects): push text 9–16 KB per prompt vs 2 KB on a
  project without the toolkit; kb-hints followed 0–7.5%; the recall judge picked nothing on 81%
  of fires after its timeout was raised; one steward pass cost 214k tokens for two notes. The
  pull tool (`kb_query`) and the steward model were the only parts measured as used.

## Next (each with its check)

1. **Measure context per session** (owner 2026-09-18: "530K tokens in messages looks
   excessive"). Add `context-composition` to harness-stats: per session, context at the last
   call from the transcript's real `usage` counters, split by tool results / writes / hook
   injections / thinking / instructions, with `harness_share` and `tool_result_share`. This
   session measured: 604K at the last call, harness 13%, Bash results 21%, WebFetch 11%,
   my writes 17%, thinking 11%. Check: the source reproduces those figures for this session's
   transcript within 5%; `--line` prints `ctx.last` + `ctx.harness_pct`.
2. **With / without eval** (`claude plugin eval`, built in): hand-written suites for steward,
   kb, turn-end (page, recall, self-check) and thorough-mode, each case with a fixture and a
   grader for one of the three wants (progress captured · prior decisions honoured · verified
   done); run with a sonnet judge, three runs per arm, a cost ceiling, `--no-publish`. Check:
   one table per plugin, WITH / W/OUT / Δ / seconds, in the terminal. Windows: no Bash in
   cases (no sandbox); Write/Edit granted.
3. **Live with the subtraction for five sittings here.** Check: `PROJECT.md` rewritten each
   sitting (git log); `ctx.harness_pct` under 3%; no "recap this for me" ask.
4. **Decide push + fleet.** If (3) holds: push, then the same subtraction on aithseis,
   twin-game, ar-mystery-game-demo (their `.steward/` becomes each project's page). Check:
   each repo has a `PROJECT.md` under 100 lines.
5. **Ship turn-end with `page` as the default duty set**; the six others stay available by
   config. Check: a fresh install shows one Stop question.

## Open decisions (default first)

- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt):
  fold their four lines into the global CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
- **Design duty at `@ship`** (measured code-convergence gate): keep on the list, build after (1).
