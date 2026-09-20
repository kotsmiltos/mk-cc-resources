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

## Where we are (2026-09-20)

- `main` is ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`).
- **Two measures exist as gates** (plugin-toolkit 1.21.0): `harness-stats` source
  `context-composition` (context at the last call from real usage counters, ten buckets,
  calibrated ratio, `--session <id>`) and `plugin-eval` (one WITH / W/OUT / Δ / seconds table
  per plugin from `claude plugin eval --ablation with-without`; `--keep-outputs` keeps and
  prints what each arm PRODUCED plus its traces; default agent model **opus** since 09-20,
  judge sonnet).
- **Six plugins measured on the owner's own kind of task** (a Zarmada-shape Unity toolkit,
  "add a HapticsManager"; sonnet, 3 runs/arm; house rules held 3/3 in every arm — the model
  copies visible conventions unaided; plugins move only what lives OUTSIDE the code):
  - turn-end **+38** — page rewritten 3/3 vs 0/3, check named 2/3 vs 0/3; 150 s vs 51 s after
    0.14.1 (self-check's ask now names the no-shell path; before it one run in three hunted for
    Bash for 900 s).
  - steward **+33** — inbox capture 3/3 vs 0/3 (without: a TODO comment); cap 3/3 vs 1/3.
  - kb **+27** — config-asset decision 3/3 vs 0/3; cap 3/3 vs 2/3.
  - patterns **+17** — named the growth axis 3/3 vs 1/3.
  - thorough-mode `@verify` — verified-done **3/3 vs 0/3** at 101 s vs 86 s. `++`/`@thorough`
    **RETIRED** (1.13.0): 0/3 vs 2/3 on verified-done, 0/3 vs 0/3 on its own promised shape.
  - reuse-gate **+0** — sonnet found the existing helper 3/3 unaided.
  - Not measurable in isolation: verifiability-lens (dispatched by turn-end's duty via the
    Agent tool), prism / elicit (invoked by name), caveman / statusline / alert-sounds (UI).
- Context: harness 6.2% of the 612K sitting before the subtraction, 0.6% of this one.
- Running here: turn-end (page duty only), thorough-mode, prism, elicit, plugin-toolkit,
  caveman, statusline, alert-sounds. Off here: kb, steward, lens, patterns, reuse-gate,
  essense-flow, autopilot, session-lifecycle.

## Next (each with its check)

1. **The second face of the cube — build "postit-board" through every phase, on opus, and
   show it.** Kickoff prompt saved: `.claude/prompts/prompt-2026-09-20T18-00-00Z.md` (owner
   pastes it into a fresh session). New repo `postit-board` in the owner's work dir; essense-flow
   `/init → … → /verify` on opus; one measured row per phase (produced · seconds · context ·
   what changed); the app run and shown with real post-its from `~/.claude/projects`; then
   opus `plugin-eval` for turn-end + steward beside the sonnet numbers above. Owner answers
   NOTHING: every fork takes the default, one dated DECISIONS line each. Check: the
   phase table, an independent COMPLETION audit (opus agent given only the ask), a TESTING list
   (end-to-end / unit-only / claimed-only), the toolkit-gap score (what review+verify caught vs
   the audit); a screenshot or fetched HTML carrying the owner's sessions,
   a task surviving a server restart, both repos committed, nothing pushed.
2. **Other faces still unmeasured**: time (two-session continuity via `history_file`),
   the negative face (a trivial ask must add zero turns/bytes/blocks), context per arm from
   the eval transcripts, Python/Three.js domains, a hand-labelled grader calibration set, a
   blind owner A/B of kept outputs. Check: one case per face, on opus.
3. **Live with the subtraction for five sittings here.** Check: this page rewritten each
   sitting (git log); `ctx.harness_pct` under 3%; no "recap this for me" ask.
4. **Decide push + fleet.** If (3) holds: push, then the same subtraction on aithseis,
   twin-game, ar-mystery-game-demo. Check: each repo has a `PROJECT.md` under 100 lines.
5. **Ship turn-end with `page` as the default duty set**; the six others stay available by
   config. Check: a fresh install shows one Stop question.

## Open decisions (default first)

- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes for reuse-gate (measured +0);
  patterns measured +17 — keep it available per project.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt;
  `verification-rules.js` still carries a `++` augment): fold their lines into the global
  CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
- **Design duty at `@ship`** (measured code-convergence gate): keep on the list, build after (1).
