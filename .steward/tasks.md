# Tasks — ordered, executor-ready (recomputed 2026-07-25, post kb-ship integration)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Ordering rationale: old #3 (ship the 07-22 batch) DONE (b12e932) — deleted. kb shipped
(94a3b17) with one B-class only observable next session start → arrival check is first
minutes of the next session here, and it carries the marketplace-row fix found at
integration. MCP dogfood is passive and overlaps everything. Context-inject inversion
remains the code-verified bug in the most-fired hook. The two crowd-game items (lens
preset half + /kb-seed pilot) need a session THERE → merged into one session bundle;
the seed pilot is also the Q9 revisit trigger. Then passive Phase 0 validation, the
crowd-game eval, and Phases A–E.

## 1. kb arrival check + marketplace-row fix (first minutes of next session HERE)
- **What:** (a) /mcp shows `kb` connected → call kb_overview → run both suites
  (`node plugins/kb/tests/kb.test.js` + `kb-mcp.test.js`). Closes the .mcp.json
  alwaysLoad B-class. If kb absent from /mcp: `.mcp.json` is the suspect — one-line
  fix. (b) Either way: fix marketplace.json's mk-cc-all row 2.21.1 → 2.22.0 (drift vs
  root plugin.json, shipped in 94a3b17; @ship's cascade check missed the marketplace
  row). Patch-commit both together; push on owner word.
- **Done-check:** kb_overview returns corpus stats in-session; suites 166/166 + 32/32;
  grep shows a single consistent bundle version across plugin.json + marketplace.json.

## 2. Dogfood the kb MCP loop (passive, this repo, overlaps #1)
- **What:** the owner's hard requirement was ambient availability ("I don't want to
  have to call it each time"). Observe over the next few sessions: does Claude
  self-call kb_query mid-work, unprompted, when reasoning wants known facts? Do the
  narrowing hints actually drive re-calls (the ReAct loop)?
- **Done-check:** ≥1 unprompted kb_query in a real work turn whose answer changed the
  work; noted in log with the query + what it saved. If zero after ~5 sessions, that's
  a finding too — capture it (server instructions or alwaysLoad need rework).

## 3. Fix context-inject economics inversion (essense-flow)
- **What:** injection layer inverted both ways (code-verified 2026-07-22):
  never-existed `.pipeline` → LOUD banner every prompt (`lib/state.js:433-437` has no
  never-existed probe; `hooks/scripts/context-inject.js:57-68` uniform — ~40x in one
  session), yaml-parse-corrupt → SILENT (`state.js:439-466` throws →
  `context-inject.js:34` catches → stderr only — Diploma's silent-fail, state.yaml:123
  duplicate key). Fix = silence never-existed AND un-silence parse-corrupt. Also damp
  generalize-first over-trigger on feature-ish phrasing.
- **Done-check:** repo without `.pipeline/` gets zero banner; corrupt-yaml fixture gets
  a visible degradation warning; existing hook tests green; Diploma launch surfaces its
  corruption instead of silence.

## 4. Crowd-game session bundle: lens preset half + /kb-seed pilot (next session THERE)
- **What:** (a) copy `plugins/verifiability-lens/defaults/presets/game-project.yaml` →
  crowd-game's `.claude/verifiability-lens/profile.yaml` (this repo's half DONE).
  (b) run /kb-seed on crowd-game — the FIRST foreign project: sweep docs/git-history/
  code, owner confirms candidates, dated files with Extracted-from citations →
  `.claude/kb/extracted/`. (c) the seed outcome triggers the Q9 revisit
  (characterization park) with real failure examples in hand.
- **Done-check:** profile file exists + next lens fire there reads it (focus items in
  output); `kb stat` on crowd-game shows a populated kb-extracted store; a hand-driven
  query finds a seeded fact; Q9 gets re-presented with concrete evidence.

## 5. Phase 0 validation — passive, on THIS repo (live)
- **What:** use mk-cc-resources normally with the steward loop: auto-brief at open,
  captures during talk, owner-present integration diffs.
- **Done-check:** design §5 Phase 0 checks measured HERE — (a) zero pasted context at
  session start; (b) diffs read correctly; (c) ~0 steering turns between "do it" and
  hand-back; (d) ≥1 direction-change lands as thought → recompute → diff → rebuilt
  part (the kb thread 07-24→07-25 is a strong candidate: direction captured, built,
  shipped, integrated).

## 6. Crowd-game steward evaluation (~5 sessions or ~1 week after its seed)
- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts
  (baseline = 43 .jsonl files existing 2026-07-21; after-set = post-seed mtime;
  exclude eval sessions). Before/after on 5 signals: (a) start ritual (new files in
  `D:\crowd-game\crowd-game\.claude\prompts\`, baseline 21 — disk-verified; >500-char
  context paste = ritual), (b) steering density (real user-typed turns only; baseline
  median ~20–25, max 93 — B-inherited, consume the delta), (c) idea survival
  (captured/spoken ratio; baseline 0), (d) ship awareness ("what are we doing"/"where
  do we stand"… in user text; pass = zero + owner-felt verdict), (e) direction-change
  cost (user turns from change-of-mind to built+accepted; baseline precedent 45-turn
  psience churn; pass = single digits). Full rules preserved verbatim:
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`.
- **Done-check:** before/after table exists with confidence notes (which baselines are
  B-inherited vs disk-verified). **Owner annoyance = veto regardless of numbers.**
  Eval outcome also unlocks the deferred drop-channel decision (Q8 routing).

## 7. Phase A — wire the gates (on this repo)
- **What:** coupling/extensibility + tests into every executor step; deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`).
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on task 5 showing the loop holds here.)

## 8. Phase B — harden the steward
- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate →
  correct cascaded diffs); recurring spot-check re-injection; verbs /discuss /test /work.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded
  deletions; spot-check fires periodically in normal use.

## 9. Phase C — injection-layer economics (scope updated 2026-07-25)
- **What:** REMAINING lens work: hand-back + risk-triggered firing (not per-turn) —
  the profile side SHIPPED early in 0.4.0. BROADENED per owner: apply the same
  economics to the whole per-prompt injection stack (verification-rules, caveman,
  generalize-first, hints) — fire conditionally, not unconditionally. NEW instrument:
  kb-pull — wherever a session can ASK (kb_query) instead of being FED, prefer pull;
  task #2's dogfood findings feed this design.
- **Done-check:** lens fire-count drops vs the rough 2026-07-21 baseline (24–30
  fires/long session, ~25–55k tok/dispatch) with zero missed hand-back failures;
  injection stack fires only where its trigger condition holds.

## 10. Phase D — generalization pass (seed part DONE early; kb-seed joins it)
- **What:** crowd-game steward-seeded 2026-07-21 (owner, ahead of plan) — remaining:
  extract anything mk-cc-resources-specific from the loop after the task-6 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides
  the same pass (task 4b is its first datum); then EMDE/psience seed.
- **Done-check:** next project (EMDE or psience) onboards by steward-seeding +
  kb-seeding alone — no tooling code changes.

## 11. Phase E — retire ceremony officially [Q4, Q5 land here]
- **What:** docs + marketplace reposition; classic pipeline preserved;
  essense-autopilot retires (Q4). Absorption fodder (2026-07-22 candidates list):
  handoff/resume redundant in steward projects (and now double-indexed by kb —
  session-caste sources); retro/meta-review → steward verbs; truth split memory=owner /
  model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** new toy project goes idea → running slice through the steward loop
  only, in one evening.
