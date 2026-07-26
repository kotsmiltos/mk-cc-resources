# Tasks — ordered, executor-ready (recomputed 2026-07-26, post 19-commit ship)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Ordering rationale: the batch is SHIPPED and pushed (71a0b0a), so every "push the batch"
and "build it" task is deleted. What replaces them is the gap the ship created —
**three hooks, an MCP server and a self-running loop that are all still theoretical on
this machine** (installed kb = 0.3.0). Nothing below can be judged until #1 proves the
mechanisms fire in a real session, so #1 is first and everything measurement-shaped
(#4, #5) waits behind it. #2 is the first foreign corpus AND the evidence source for #4.
#3 is a defect in our own delivery channel — small, and it corrupts the one artifact the
owner reads first. #9 jumps to the front the moment Q10 is answered.

## 1. Make it LIVE, then prove it fired (the whole batch is unproven until this)
- **What:** `claude plugin update kb@mk-cc-resources`, then RESTART Claude Code (hooks and
  the MCP server register at INSTALL time — this checkout is inert until then; the
  installed build is 0.3.0). Then work one ordinary turn in this repo and read the
  evidence off disk rather than off the transcript.
- **Baseline to diff against (disk-verified 2026-07-26, `.claude/kb/trace.jsonl`,
  21 lines):** every line `"tool":"kb-pull-hook"` from piped runs · every line
  `"digest":false` · ZERO `kb-session-start` lines · ZERO MCP lines (0.3.0's server
  predates `writeTrace`, so even live MCP calls left nothing).
- **Done-check** (each item separately, no batching):
  1. a NEW `{"tool":"kb-session-start",…}` line with a timestamp after the restart;
  2. a `kb-pull-hook` line reading `"digest":true` (proves the digest exists AND is being
     injected — the whole short-term-memory claim);
  3. a line whose `tool` is `kb_query`/`kb_overview`/`kb_read` (proves the 0.7.0 traced
     MCP server is the one running, not the old install);
  4. kb-scribe: **expect NO trace line — it writes none by design.** Its evidence is the
     block landing at the end of a producing turn + `.claude/kb/session-digest.md`
     gaining that turn's content. A check that claims "all three hooks traced" is a lie.
  5. second sitting only: `.claude/kb/digests/` holds the previous digest, honestly dated.
- **If a step fails:** suspect the install version first (`claude plugin` list), then the
  presence gate (`lib/presence.js` — this repo passes: 6 extracted + 1 capture), then the
  hook script's own fail-open swallow. Fix + patch-ship; do not soften the check.

## 2. Crowd-game: commit its config, then run the DEEP seed (first foreign corpus)
- **What:** in `D:\crowd-game\crowd-game`: (a) commit the written-but-UNCOMMITTED
  `.claude/kb.json` (splitter override + scribe focus) — a config that lives only on one
  machine is a footgun for the pilot; (b) update the kb plugin there too and restart;
  (c) re-run `/kb-seed` under the 0.5.0 depth mandate + judge-then-report autonomy, with
  `kb coverage` first so the run mines only what existing `Extracted-from:` citations do
  NOT already cover — this is the first real test that re-seed is incremental BY
  MECHANISM; (d) copy the `game-project.yaml` lens preset into
  `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`.
- **Also record while there** (this is the evidence #4 gates on): every hand-driven query
  that MISSES, classified — splitter / vocabulary / ranking / genuinely-absent.
- **Done-check:** config committed there; `kb coverage` output shows previously-uncovered
  substrate now cited; entry count before/after both recorded (numbers read from the
  tool, not remembered); a hand-driven query finds a fact that only the deep sweep could
  have reached (e.g. a full git message or a ledger addendum); the miss list exists in
  writing, even if it reads "none found".

## 3. Fix the steward briefing over-cap defect (our own delivery channel)
- **What:** `plugins/steward/hooks/scripts/steward-brief.js:20` caps injection at
  `BRIEFING_MAX_CHARS = 2000`. The premise of the capture was CORRECTED at integration —
  a truncation marker does exist (`:70-72`, asserted at
  `tests/steward-brief.test.js:68`) — so this is not a silent loss to the session. It is
  still a real defect on three counts: nothing enforces the budget at WRITE time; the
  marker names neither how much was dropped nor what to run; and the OWNER never sees
  injected text at all. Crowd-game paid for it (Q12 tail, Q7, P1 gone unnoticed).
  Do BOTH halves: (a) **write-time enforcement is the root fix** — the steward agent is
  the only writer, so a briefing over budget is an integration defect; add the budget to
  the agent's briefing contract AND a deterministic check (a test asserting every
  `.steward/briefing.md` in the repo is ≤ cap, so the rule is a gate, not a sentence);
  (b) upgrade the marker to name the loss and the recovery: `[briefing truncated at 2000
  chars — N chars dropped; run steward sync]`.
- **Done-check:** a fixture briefing of 3000 chars injects a marker containing the
  dropped-char count and the recovery command; the write-time check FAILS on a
  deliberately over-cap briefing fixture and passes on the real one; steward suite green;
  version bump + cascade (marketplace row + README + RELEASE-NOTES).

## 4. Decide rungs 2/3 on the deep-seed evidence (kb, after #2)
- **What:** Q9's law is cheapest-substrate-first, and the first foreign datum already
  bent it: the miss was SPLITTER-class and a `pattern` split mode fixed it for free, so
  rungs 2/3 are still UNGATED. Read #2's classified miss list: build rung 2 (the
  characterization pass — one LLM enrich at index time, cached by content hash, ranker
  reads it as a high-weight field) ONLY if vocabulary-mismatch misses actually appear.
  Otherwise record "rung 1 + splitters suffice — 2/3 parked WITH evidence".
- **Done-check:** decision written in log.md citing concrete misses by name (or their
  documented absence); if built: enrich job cached + incremental, ranker tests green, and
  the previously-missing queries now hit.

## 5. Dogfood watch — does the ambient surface actually fire? (passive, after #1)
- **What:** the sharpest evidence to date is the T13 datum (crowd-game: /kb-seed ran, a
  founding DESIGN shipped the same day, the server instructions name that exact trigger,
  and NO query fired). kb 0.5.0–0.7.0 is the answer to it. Now measure instead of
  reasoning: after #1, `trace.jsonl` makes this objective for the first time.
- **Done-check:** across ~5 real sessions — how many turns carried a kb-pull hint; how
  many hints were followed by a `kb_read`/`kb_query` in the same turn; ≥1 unprompted
  query whose answer changed the work, logged with the query and what it saved. **A zero
  is still a result** — it would mean the hint lines are visible and ignored, which
  points at hint QUALITY (scan mode / ubiquity rule tuning), not at awareness.

## 6. Chore: fix ledger-compaction T-ENF-3 calendar drift (essense-flow)
- **What:** `plugins/essense-flow/tests/ledger-compaction.test.js` T-ENF-3 fails on a
  clean tree — governance-ledger entries >30d unarchived. Still red as far as the model
  knows: the reported `test/run-all` 54/0 covers the `test/` dir only, and this suite
  lives in `tests/`. Root-fix (archive the stale entries or make the test time-robust),
  never a skip.
- **Done-check:** the suite is green on a clean tree AND still green with the system date
  advanced 60 days — the drift class closed, not dodged. Run `tests/` explicitly; do not
  infer its state from run-all.

## 7. Make documented counts derivable, not remembered
- **What:** 5 confirmed defects of one class — 4 of the 4 doc defects in 4 lens rounds
  were stale numbers, plus root `CLAUDE.md` claiming statusline "12 checks" when the
  suite runs 16. Text can't fix text (invariant 3): add a deterministic check that runs
  each suite and compares the count to what the docs claim, OR stop printing counts in
  prose and point at the command instead. Prefer the second where a number earns nothing.
- **Done-check:** the check fails on today's statusline line, passes after it is
  corrected; one command re-verifies every documented count in the repo.

## 8. Diploma residual: confirm the corrupt-state banner (next Diploma session)
- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma (its `state.yaml:123` duplicate key). First minutes of the next Diploma
  session: launch, expect the banner, then fix Diploma's state.yaml.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  state.yaml parses clean afterward.

## 9. Steward staleness enforcement — GATED ON Q10
- **What:** crowd-game's model went a full session stale; captures land but nothing forces
  the RECOMPUTE. Q10 asks whether steward keeps its no-Stop-hook design (B), gets a
  narrow enforced sync reusing kb-scribe's contract (A, recommended), or borrows the
  scribe's block text (C, interim). **Answer first, then build** — this task jumps to #4
  the moment the answer is A or C.
- **Done-check:** per option — (A) hook fires on a staleness signal only, never per-turn,
  fire-once + fail-open + off-switch, suite green; (C) scribe block text demands
  integration when `.steward/inbox/` is non-empty, and the log records it as INTERIM.

## 10. Phase 0 validation — passive, on THIS repo (live)
- **What:** keep using this repo through the steward loop: auto-brief at open, captures
  during talk, owner-present integration diffs.
- **Done-check:** design §5 Phase 0 checks measured HERE — (a) zero pasted context at
  session start; (b) diffs read correctly; (c) ~0 steering turns between "do it" and
  hand-back; (d) ≥1 direction-change lands as thought → recompute → diff → rebuilt part.
  Three strong data now: the kb thread 07-24→07-25, Q9 → rung 1 same session, and the
  0.5.0→0.7.0 wave built straight off inbox captures.

## 11. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)
- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts
  (baseline = 43 .jsonl files existing 2026-07-21; after-set = post-seed mtime; exclude
  eval sessions). Before/after on 5 signals: (a) start ritual (new files in its
  `.claude\prompts\`, baseline 21 — disk-verified; >500-char context paste = ritual),
  (b) steering density (real user-typed turns only; baseline median ~20–25, max 93 —
  B-inherited), (c) idea survival (captured/spoken ratio; baseline 0), (d) ship awareness
  ("where do we stand" in user text; pass = zero + owner-felt verdict), (e)
  direction-change cost (user turns from change-of-mind to built+accepted; baseline
  precedent 45-turn psience churn; pass = single digits). Full rules preserved verbatim:
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`.
- **Done-check:** before/after table with confidence notes (B-inherited vs disk-verified).
  **Owner annoyance = veto regardless of numbers.** Outcome also unlocks the deferred
  drop-channel decision (Q8).

## 12. Phase A — wire the gates (on this repo)
- **What:** coupling/extensibility + tests into every executor step; deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). Task #7's counts check
  is the same family and can share the harness.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on task 10 showing the loop holds here.)

## 13. Phase B — harden the steward
- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate →
  correct cascaded diffs); recurring spot-check re-injection; verbs /discuss /test /work.
  Fold in whatever #3 and #9 leave standing.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 14. Phase C — injection-layer economics
- **What:** REMAINING lens work: hand-back + risk-triggered firing (not per-turn) — the
  profile side shipped in 0.4.0. BROADENED per owner: the same economics for the whole
  per-prompt stack (verification-rules, caveman, generalize-first, hints) — and the stack
  is now DENSER, since kb-pull injects per prompt and kb-scribe blocks producing turns.
  Fire conditionally, not unconditionally; prefer pull wherever a session can ask.
- **Done-check:** lens fire-count drops vs the 2026-07-21 baseline (24–30 fires/long
  session, ~25–55k tok/dispatch) with zero missed hand-back failures; each injector fires
  only where its trigger condition holds; measured per-prompt cost recorded.

## 15. Phase D — generalization pass
- **What:** crowd-game steward-seeded 2026-07-21 and kb-seeded 2026-07-25 — remaining:
  extract anything mk-cc-resources-specific from the loop after the task-11 eval; verb set
  + model structure prove open or get fixed; /kb-seed generalization rides the same pass.
  Then EMDE/psience.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 16. Phase E — retire ceremony officially [Q4, Q5 land here]
- **What:** docs + marketplace reposition; classic pipeline preserved; essense-autopilot
  retires (Q4). Absorption fodder: handoff/resume redundant in steward projects (and now
  double-indexed by kb); retro/meta-review → steward verbs; truth split memory=owner /
  model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** a new toy project goes idea → running slice through the steward loop
  only, in one evening.
