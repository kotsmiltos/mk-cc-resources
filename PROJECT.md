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

## Where we are (2026-09-20, evening)

- `main` is ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`).
- **The second face measured the wrong way first.** The morning kickoff ran essense-flow's full
  pipeline on `postit-board` (init → elicit → research → triage → architect → organize, 2.5 h,
  six sub-architects, sixteen alignment-lens passes, 32 task specs, one build wave) before the
  owner stopped it: "one simple webapp build, with/without, single shot". The pipeline artifacts
  stay under the `postit-board` repo's `.pipeline/` as a record (committed locally, never pushed). What the
  architect phase DID show: 5 of 6 modules misaligned on first pass and four real seam bugs caught
  before code (a one-argument `findInboxGroup` in two modules, `materializeFixtures({into})` vs
  the provider's `{tmpDir}`, `ORDER_STEP` declared 1 vs 1024 in three modules, `prepareRoots([])`
  throwing). That is the pipeline's value and its cost, both measured.
- **The single-shot measure, as the owner meant it** (`plugin-eval`, case `postit-board`: build
  the app in ONE shot, no shell in the arm, opus, 1 run per arm, sonnet judge):

  | plugin | WITH | W/OUT | Δ | seconds | what moved |
  |---|---|---|---|---|---|
  | steward | 0.75 | 0.75 | 0 | 1195 / 1007 | inbox capture 1/1 vs 0/1 (the "don't let me forget" wish landed in `.steward/inbox/`); `node:http` grader 0/1 WITH is a grader miss (the arm put http in `server/managers/http-manager.js`, which does use `node:http`) |
  | turn-end | 0.80 | 1.00 | −0.20 | 1025 / 1088 | verified-done 0/1 WITH: the arm hit `max_turns` (61) mid-fix ("Re-reading turned up two real bugs. Fixing both.") and never yielded; the page duty cost it the ending. Page rewritten 1/1 in BOTH arms (the prompt said "read the page first") |

  Every arm's app BOOTS and serves `/` + `/api/board` (checked here with node, ports 4600–4603;
  the arms had no shell). Three of four pull the owner's real sessions on the first call
  (steward/with 283 post-its, steward/without 198, e.g. "harness-stats per-session context
  measure"); the turn-end arms return pull candidates for the UI to accept instead of writing them.
  Cost: $23.86 for the four arms.
- **Fixed this sitting (thorough-mode 1.14.0, 49/49 tests, registry-check + repo-guard clean):**
  a generated kickoff opens with `OWNER ASKED (verbatim)` / `THIS PROMPT ADDS` / `COST`; "ask
  nothing" only inside the quote; a no-questions prompt without the verbatim line costs one
  keystroke before the first sub-agent dispatch. The morning's kickoff file is deleted.
- `postit-board` is committed locally (f8c30fc), not pushed: pipeline record + wave 1 (81/81 tests).
- Six sonnet measures from 09-19 stand as before: turn-end +38, steward +33, kb +27, patterns
  +17, `@verify` 3/3 vs 0/3, reuse-gate 0, `++` retired.
- Context here: 564K at the end of the pipeline run; the harness share was not re-measured.
- Running here: turn-end (page duty only), thorough-mode, prism, elicit, plugin-toolkit,
  caveman, statusline, alert-sounds. Off here: kb, steward, lens, patterns, reuse-gate,
  essense-flow, autopilot, session-lifecycle.

## Next (each with its check)

1. **Re-run `postit-board` single-shot at 3 runs per arm** so one run is not the verdict, with
   `max_turns` raised to 90 for turn-end (the WITH arm needs the ending) and the `node:http`
   grader reading `server/**` not `server.js`. Check: the WITH / W/OUT table with n=3 on the page.
2. **Decide what to do with the pipeline artifacts** in `postit-board/.pipeline/`: keep as the
   architect-phase evidence, or delete the repo. Check: one dated DECISIONS line.
3. **Live with the subtraction for five sittings here.** Check: this page rewritten each
   sitting; no "recap this for me" ask.
4. **Decide push + fleet.** If (3) holds: push, then the same subtraction on aithseis,
   twin-game, ar-mystery-game-demo. Check: each repo has a `PROJECT.md` under 100 lines.

## Open decisions (default first)

- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes for reuse-gate (measured +0);
  patterns measured +17 — keep it available per project.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt):
  fold their lines into the global CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
