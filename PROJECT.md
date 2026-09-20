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

## Where we are (2026-09-20, second sitting)

- `main` is ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`).
- **The owner's ask:** test building a simple webapp from different angles, with and without the
  plugins. The morning's pipeline detour (2h40m, ~50 opus agents, 6 of 32 modules, no app) is
  recorded in the `postit-board` repo and fixed by law 9. The afternoon's one-shot measure
  (steward 0.75 vs 0.75, turn-end 0.80 vs 1.00, n=1) was decided by regex graders.
- **The instrument is fixed (plugin-toolkit 1.22.0, this sitting):** `behaviour-probe` boots
  the app an arm produced in a scratch copy on a free port and drives it — create → drag → edit
  → done → job → export (one fenced block) → restart → read back → pull → a REAL session title
  (checked against the `ai-title` lines on disk). `plugin-eval --keep-outputs` runs it on every
  arm and prints `probe <case>: WITH a/b · W/OUT c/d`; `--probe-outputs` re-scores kept arms
  for free. The case prompt now pins the API contract the probe drives.
- **The four kept arms, re-scored by behaviour** (built before the contract existed, so the
  misses are contract misses, not verdicts):

  | arm | regex score | probe |
  |---|---|---|
  | steward / without | 0.75 | 11/11 |
  | steward / with | 0.75 | 2/11 |
  | turn-end / with | 0.80 | 1/11 |
  | turn-end / without | 1.00 | 2/11 |

  The regex column ranked them backwards. That is finding (6) with numbers.
- **All six angles are one command away:** `postit-board` cases now exist for kb (decisions in
  `.claude/kb/extracted`, hints on), patterns (a growth axis: more pull sources), reuse-gate
  (the atomic writer + the one guard shipped as fixtures; store pinned to `server/board.js`),
  thorough-mode (`@verify`), steward, turn-end. turn-end's WITHOUT arm carries the page rule in
  the fixture with the hook off, which is the test of finding (3). Nothing has been run yet.
- **What the 09-20 measures told us stands:** (1) the WHAT did the work; (2) plugins move only
  what lives outside the code; (3) a convention in the repo did turn-end's page duty for free;
  (4) the pipeline is the wrong tool below one-agent size; (5) nothing RAN its own code —
  the probe now does; (6) regex graders decided the Δ rows.
- Six sonnet measures from 09-19 stand: turn-end +38, steward +33, kb +27, patterns +17,
  `@verify` 3/3 vs 0/3, reuse-gate 0, `++` retired.
- Gates this sitting: test-all 38/38 suites passed (2319 checks; the root CLAUDE.md baseline of
  32/35 is stale), registry-check consistent, repo-guard clean.
- Running here: turn-end (page duty only), thorough-mode, prism, elicit, plugin-toolkit, caveman,
  statusline, alert-sounds. Off here: kb, steward, lens, patterns, reuse-gate, essense-flow,
  autopilot, session-lifecycle.

## Next (each with its check)

1. **Run the six angles, same case, one shot, opus** — owner's keystroke first (cost below).
   Check: one `probe` row per plugin on this page, n=3, from `--keep-outputs --json`.
   ```
   node plugins/plugin-toolkit/bin/plugin-eval.js --root . --case postit-board --runs 3 --max-cost-usd 40 --keep-outputs --json <out>.json
   ```
   Cost: ~$5–6 and ~20 min per run at opus; 6 plugins × 2 arms × 3 runs ≈ $200, ~4 h at `-j 3`.
   n=1 first ≈ $65, ~1.5 h (`--runs 1 --max-cost-usd 15`).
2. **Decide essense-flow's place.** Check: one dated DECISIONS line (default: park it below
   the size where one agent holds the app in context).
3. **Live with the subtraction for five sittings here.** Check: this page rewritten each sitting.
4. **Decide push + fleet.** Check: each fleet repo has a `PROJECT.md` under 100 lines.

## Open decisions (default first)

- **Run size for Next 1:** n=1 across six now, then n=3 on the movers (default) · n=3 now ·
  hold.
- **essense-flow:** park below one-agent size (default) · name a module count where it earns
  its coordination cost.
- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes for reuse-gate (measured +0);
  patterns measured +17 — keep it available per project.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt):
  fold their lines into the global CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
