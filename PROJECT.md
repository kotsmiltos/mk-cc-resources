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
9. **A kickoff prompt carries the owner's words verbatim, names what it adds, and states its
   cost; it never grants itself "ask nothing"** (thorough-mode 1.14.0: the `@prompt` contract +
   the receiving-side `[kickoff-guard]`, one keystroke before the first sub-agent dispatch).

## Where we are (2026-09-20, third sitting — the deepwell measure)

- `main` is ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`).
- **The owner's ask:** test building a simple webapp from different angles, with and without the
  plugins. postit-board (a CRUD app the prompt fully specifies) could not separate arms; the
  owner asked for a survival-automation game without quests instead. **deepwell**: dig out of a
  collapsed mineshaft, light and air as constraints, research unlocks recipes from held
  materials, automation from drip collectors to a powered drill. Owner's words verbatim in the
  prompt (law 9); one headless sim contract; a 14-step behaviour probe (module driver).
- **The instrument** (plugin-toolkit 1.23.0): `behaviour-probe` drives the sim in a child process
  and quotes what the app said on a failed step; `plugin-eval --keep-outputs` probes every arm;
  `--probe-outputs` re-scores kept arms for free (used four times tonight to fix contract
  ambiguities without a rerun). All 30 arms boot and pass 13–14 of 14.
- **The measure** — opus, n=3 per arm, 30 sessions, $167, ~40 min per plugin in parallel:

  | plugin | graders WITH | W/OUT | Δ | what moved | probe WITH · W/OUT |
  |---|---|---|---|---|---|
  | steward | 0.93 | 0.60 | +33 | inbox capture 3/3 vs 0/3; the briefing-only RNG decision 3/3 vs 0/3 | 14,13,14 · 14,14,14 |
  | turn-end | 0.89 | 0.67 | +22 | page rewritten 3/3 vs 0/3 — with the page rule in the fixture and NO hook, nobody rewrote it | 14,14,14 · 14,14,14 |
  | kb | 0.92 | 0.92 | 0 | the note is on disk for both arms; hints changed nothing | 14,13,14 · 14,14,14 |
  | patterns | 0.80 | 0.80 | 0 | axis named 3/3 vs 3/3; zero kind-switches in all six — the prompt said "adding one is data" | 14 ×3 · 14 ×3 |
  | thorough-mode | 0.73 | 0.80 | −7 | verified-done 3/3 vs 3/3 (the prompt asks "say what you checked"); one `@verify` arm used the global random | 14 ×3 · 14,12→14,12→14 |

  Deterministic scan, 30 arms: ~2,050 lines and ~25 files each side, 0 silent catches, 0
  kind-switches, 12–35 structure kinds in config, cost $3.6–8.9 and 15–27 min per arm; WITH arms
  cost ~4% more and ran ~6% longer. Probe residue: two arms refuse to MOVE in the dark (the lamp
  decision, honoured).
- **What it tells us:** (1) a plugin moves exactly what lives outside the prompt and the repo —
  steward and turn-end moved because their decisions and duties lived only in their own files;
  kb did not because its note is a file both arms read; (2) postit-board's finding (3) is
  refuted at n=3: a convention written in the repo did NOT do turn-end's page duty; the hook
  did, 3/3 vs 0/3; (3) the WHAT did the code again — every arm satisfied the sim contract, so
  the probe cannot rank arms on a prompt this explicit; (4) the prompt's own asks ("say what
  you checked", "adding one is data") saturate `@verify` and patterns: to measure them the
  prompt must NOT ask for it; (5) instrument bugs looked like arm defects until the failed step
  quoted the app — four contract ambiguities (build target, craft-vs-place, stone budget, start
  depth) were mine, not theirs.
- Earlier measures stand: sonnet 09-19 (turn-end +38, steward +33, kb +27, patterns +17, `@verify`
  3/3 vs 0/3, reuse-gate 0); postit-board opus n=1 (regex graders ranked arms backwards).
- Gates: test-all 38/38 (2326 checks), registry-check consistent, repo-guard clean.
- Running here: turn-end (page duty only), thorough-mode, prism, elicit, plugin-toolkit, caveman,
  statusline, alert-sounds. Off here: kb, steward, lens, patterns, reuse-gate, essense-flow,
  autopilot, session-lifecycle.

## Next (each with its check)

1. **Measure `@verify` and patterns without the prompt asking for them** (drop "say what you
   checked" and "adding one is data" from a copy of the deepwell prompt). Check: rows on this page.
2. **Play one arm** — `node server.js` in `plugins/patterns/evals/results/outputs/deepwell/with-1`
   (35 files, 19 structure kinds, 14/14) — and record what the game FEELS like, since no
   instrument here measures fun. Check: one dated line in DECISIONS.md.
3. **Decide essense-flow's place.** Check: one dated DECISIONS line (default: park it below the
   size where one agent holds the app in context — every deepwell arm was held by one agent).
4. **Live with the subtraction for five sittings here.** Check: this page rewritten each sitting.
5. **Decide push + fleet.** Check: each fleet repo has a `PROJECT.md` under 100 lines.

## Open decisions (default first)

- **essense-flow:** park below one-agent size (default) · name a module count where it earns
  its coordination cost.
- **kb's place:** its note moved nothing when it was on disk for both arms — measure it with
  the note OUTSIDE the repo (fleet caste) next, or park it? Default: measure once more.
- **Q17 — the five dead hooks:** disable globally? Default: yes for reuse-gate; patterns +17 on
  sonnet but 0 here — keep available per project.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh`): fold into the global
  CLAUDE.md and remove? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
