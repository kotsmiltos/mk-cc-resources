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
   cost; it never grants itself "ask nothing".** (2026-09-20, thorough-mode 1.14.0.)

## Where we are (2026-09-20, evening)

- `main` is 20 commits ahead of origin and NOT pushed (count: `git rev-list --count origin/main..HEAD`).
- **What the owner asked for today:** "test building a simple webapp from different angles,
  with and without my plugins" — one app, one shot, with/without.
- **What ran instead (the failure):** the previous session's `@prompt` had expanded that into a
  ten-phase essense-flow build of "postit-board" with "ask me NOTHING, never stop early", written
  into this page's Next 1 and a kickoff file in the session's voice. The owner pasted it unreviewed;
  this session ran it verbatim: init → elicit → research → triage → architect → organize complete,
  build wave 1 of 10 (81/81 tests), then the owner stopped it. Cost: 2h40m, ~50 opus sub-agents,
  ~9M sub-agent tokens, 564K context. The repo `postit-board` holds the record, committed locally,
  app not runnable (26 of 32 specs unbuilt).
- **Fixed this sitting (thorough-mode 1.14.0, 49/49 tests, registry-check + repo-guard clean):**
  the kickoff contract on `@prompt` (three fixed header lines: OWNER ASKED verbatim / THIS PROMPT
  ADDS / COST; "ask nothing" only inside the quote) and the receiving-side `[kickoff-guard]` (a
  no-questions prompt without the verbatim line costs one keystroke before the first sub-agent
  dispatch). The bad kickoff file is deleted.
- **What the pipeline run did show, for the record (not what was asked):** the architect's
  alignment lenses caught four real seam bugs before any code (one-argument `findInboxGroup` in two
  modules, a fixture-helper argument name mismatch, `ORDER_STEP` 1 vs 1024 across three modules, a
  `prepareRoots([])` throw) at the price of 16 lens dispatches for 6 modules and two amendment
  rounds; the deterministic boundary check cannot register a root-level file; the pack-time test
  baseline runs the plugin's suite, not the project's; `node --test` with a zero-match glob exits 0.
- **The with/without one-shot eval the owner asked for:** two new cases (`plugins/turn-end/evals/
  postit-board`, `plugins/steward/evals/postit-board`, prompt = the WHAT, opus, 1 run per arm)
  were launched by the side-agent this sitting and were still running when this page was written;
  their table lands in the next rewrite. Sonnet numbers from 09-20 morning stand: turn-end +38,
  steward +33, kb +27, patterns +17, `@verify` 3/3 vs 0/3, reuse-gate +0, `++` retired.
- Context: harness 0.6% of the sitting before this one; this sitting was dominated by sub-agent
  returns, not hooks.
- Running here: turn-end (page duty only), thorough-mode, prism, elicit, plugin-toolkit,
  caveman, statusline, alert-sounds. Off here: kb, steward, lens, patterns, reuse-gate,
  essense-flow, autopilot, session-lifecycle.

## Next (each with its check)

1. **Read the opus one-shot with/without table** for turn-end and steward on the postit-board
   case; put the numbers on this page. Check: one WITH / W/OUT / Δ / seconds row per plugin here.
2. **The other angles the owner named** — the same simple webapp with and without the other
   plugins, one shot each, on opus, in the owner's words. Check: one row per plugin, no pipeline.
3. **Live with the subtraction for five sittings here.** Check: this page rewritten each
   sitting (git log); `ctx.harness_pct` under 3%; no "recap this for me" ask.
4. **Decide push + fleet.** If (3) holds: push, then the same subtraction on aithseis,
   twin-game, ar-mystery-game-demo. Check: each repo has a `PROJECT.md` under 100 lines.

## Open decisions (default first)

- **postit-board's pipeline record:** keep the repo as the measured record of what the pipeline
  does, or delete it? Default: keep, local, never pushed; it is evidence.
- **Q17 — the five dead hooks** (essense-flow, essense-autopilot, reuse-gate, patterns, serena
  read-guard): disabled here now; disable globally? Default: yes for reuse-gate (measured +0);
  patterns measured +17 — keep it available per project.
- **Global prompt hooks** (`verification-rules.js`, `generalize-first.sh` fire on every prompt):
  fold their lines into the global CLAUDE.md and remove the hooks? Default: yes.
- **The recall judge**: ranker-only, or off with the rest? Default: off — the page is the recall.
