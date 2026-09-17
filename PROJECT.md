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

- HEAD on `main`, eight commits ahead of origin, NOT pushed. Tree clean.
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

1. **Live with the subtraction for five sittings in this repo.** Check: `PROJECT.md` rewritten at
   the end of each sitting (git log shows it); `harness-stats --root .` hook bytes per prompt
   under 3 KB; no "recap this for me" ask.
2. **Decide push + fleet.** If (1) holds: push, then apply the same subtraction to aithseis,
   twin-game, ar-mystery-game-demo (their `.steward/` models become each project's page).
   Check: each repo has a `PROJECT.md` under 100 lines and its old `.steward/` archived in git.
3. **Ship turn-end with `page` as the default duty set** and retire the six others from the
   defaults (they stay available by config). Check: a fresh install shows one Stop question.

## Open decisions (default first)

- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt):
  fold their four lines into the global CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
- **Design duty at `@ship`** (measured code-convergence gate): keep on the list, build after (1).
