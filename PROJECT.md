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
- **With/without on the owner's own kind of work (2026-09-20, plugin-toolkit 1.21.0):** the
  suites now run "add a HapticsManager" against a Zarmada-shape Unity toolkit fixture; the
  runner keeps and prints what each arm PRODUCED (`--keep-outputs`). Sonnet, 3 runs/arm, $9.4:
  - turn-end +38 — page rewritten 3/3 vs 0/3, verified-done 3/3 vs 0/3. 320 s vs 91 s.
  - steward +33 — inbox capture 3/3 vs 0/3 (without: a TODO comment in the code), cap 3/3 vs
    1/3. 150 s vs 116 s.
  - kb +27 — config-asset decision 3/3 vs 0/3, cap 3/3 vs 2/3 (2 of 3 without arms guessed 0.6
    as a default). 79 s vs 55 s.
  - thorough-mode +0 on BOTH graders — verified-done 0/3 vs 2/3, then a grader for what `++`
    promises (enumerate before writing, close each item) 0/3 vs 0/3: with `++` sonnet went
    straight to code exactly as without. Two tasks, two graders, no behaviour change.
  - turn-end's 3.5× time, read from the kept Stop traces: two runs in three = ONE advise fire,
    then the compliance work itself (config file, page rewrite, DECISIONS line, named check:
    22 turns vs 12) — that is the value, at ~2.5×. The third run read self-check's "RUN the
    check" literally with no shell, searched for Bash 11×, dispatched 3 agents, blocked twice,
    timed out at 900 s. turn-end 0.14.1 names the no-shell path in the ask.
  - House rules (Singleton<T>, paired unsubscribe, no Find) held 3/3 in every arm: sonnet
    reads AudioManager and copies its shape unaided. The plugins move what lives OUTSIDE the
    code — decisions, the capture, the page, the named check.
  - Earlier toy task (2026-09-18, "add a date to the header"): steward +33, turn-end +33, kb 0,
    thorough 0; retired — solved identically with and without.
- Running here (unchanged): turn-end with ONE duty (page), thorough-mode, prism, elicit,
  plugin-toolkit, caveman, statusline, alert-sounds. Off here: kb, steward, lens, patterns,
  reuse-gate, essense-flow, autopilot, session-lifecycle.

## Next (each with its check)

1. **Rule on `++`** (open decision below): measured no effect twice; keep as a habit or retire
   the injection and keep the hints. Check: one dated line in DECISIONS.md.
2. **Confirm turn-end 0.14.1 on the eval**: no run past 3 Stop fires, none timing out.
   Check: `plugin-eval --plugin turn-end --keep-outputs`, fires per run from hook-traces.
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
- **`++` after two +0 results** (verified-done AND the enumerate-first shape it promises):
  retire the injection, keep the hints? Default: retire — a mechanism measured to change
  nothing is text (law 3).
- **Design duty at `@ship`** (measured code-convergence gate): keep on the list, build after (1).
