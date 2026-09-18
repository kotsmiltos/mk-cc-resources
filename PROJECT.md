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

## Where we are (2026-09-18, second sitting)

- `main` is ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`).
  Tree clean after two commits this sitting (`git log --oneline -2`).
- **Both measures now exist as gates** (plugin-toolkit 1.20.0):
  - `harness-stats` source `context-composition`: context at the last call from the real usage
    counters, ten buckets that telescope back to it exactly, ratio calibrated (2.49 chars/token
    here), `--session <id>`; `--line` ends in `ctx.last · ctx.harness_pct`. Check: suite 122/122;
    live `--session 4d5cb62c` → 612K, harness 6.2%, tool results 38%, writes 22%, thinking 10%.
    The hand-run "13% harness" on the previous page was a double count. Whole-life here:
    harness 6% pooled, 4.4–11.6% per session; tool results 22%; the model's own writes 21%.
  - `plugin-eval`: one WITH / W/OUT / Δ / seconds table per plugin from `claude plugin eval
    --ablation with-without` (suites: kb, steward, turn-end, thorough-mode; scaffold-seeded,
    no Bash in cases). Check: suite 24/24; live run exit 0, four tables printed.
- **First with/without numbers (sonnet, 3 runs/arm, 2026-09-18):**
  - steward +33 — inbox capture 3/3 vs 0/3; decisions 3/3 both. 133 s vs 54 s.
  - turn-end +33 — page rewritten 2/3 vs 0/3, verified-done 3/3 vs 2/3; one WITH run hit the
    15-turn cap (the block loop). 88 s vs 35 s.
  - kb +0 — decisions 3/3 both: sonnet found `src/dates.js` without the hint. Fixture too easy.
  - thorough-mode +0 — verified-done 1/3 vs 1/3: `++` did not move it. 57 s vs 36 s.
  - WITH is 2–2.5× slower in every suite. Cost of the four runs together: $6.
- Running here (unchanged): turn-end with ONE duty (page), thorough-mode, prism, elicit,
  plugin-toolkit, caveman, statusline, alert-sounds. Off here: kb, steward, lens, patterns,
  reuse-gate, essense-flow, autopilot, session-lifecycle.

## Next (each with its check)

1. **Harden the two flat suites.** kb: a decision NOT derivable from the code (e.g. "the
   em dash, not a hyphen" with no example in the tree) so the hint is the only route.
   thorough-mode: grade the ENUMERATE/EXIT-CHECK shape, not verified-done, which `++` never
   promised. Check: kb Δ > 0 on rerun, or the honest finding that hints add nothing on sonnet.
2. **Read the turn-end cap.** One WITH run reached 15 turns: page + self-check re-blocking.
   Check: the kept trace names which duty re-fired; a fix or a ruling that the cap is the cost.
3. **Live with the subtraction for five sittings here.** Check: this page rewritten each
   sitting (git log); `ctx.harness_pct` under 3% (it reads 6.2% for the sitting before this
   one, with kb + steward still on); no "recap this for me" ask.
4. **Decide push + fleet.** If (3) holds: push, then the same subtraction on aithseis,
   twin-game, ar-mystery-game-demo. Check: each repo has a `PROJECT.md` under 100 lines.
5. **Ship turn-end with `page` as the default duty set**; the six others stay available by
   config. Check: a fresh install shows one Stop question.

## Open decisions (default first)

- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt):
  fold their four lines into the global CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
- **thorough-mode after +0**: keep `++` as a habit the owner likes, or retire the injection and
  keep the hints? Default: keep, re-measure with the right grader (Next 1).
- **Design duty at `@ship`** (measured code-convergence gate): keep on the list, build after (1).
