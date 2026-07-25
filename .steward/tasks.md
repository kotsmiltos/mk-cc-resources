# Tasks — ordered, executor-ready (recomputed 2026-07-25, post "do them all" batch)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Ordering rationale: old #1 (arrival check + row fix) DONE + pushed (1159497) and old
#3 (context-inject inversion) DONE as code (0.26.1) — both deleted; #3 leaves one
foreign-repo residual that must not vanish (→ #7). The batch sits UNPUSHED (d830d62)
→ ship word is first. Two owner directions landed: kb-seed autonomy (small, HERE,
and best done BEFORE the crowd-game seed runs under the old friction gate) and the
Q9 retrieval ladder (rung 1 shipped; rungs 2/3 evidence-gated on that same
crowd-game seed → task after it). T-ENF-3 chore is a small this-repo red. Dogfood
stays passive. Then the standing Phase 0–E ladder.

## 1. Push the batch (owner word)
- **What:** local main d830d62 (kb 0.4.0 rung 1 + essense-flow 0.26.1 inversion fix
  + first-seed session + version cascade 2.34.0/2.23.0) is committed, UNPUSHED;
  origin/main = 1159497. Ask, then push; fold this reconcile's `.steward/` chore
  commit into the same push.
- **Done-check:** `git rev-parse origin/main` == local HEAD after push; tree clean.

## 2. kb-seed autonomy — relax the confirm gate (owner direction, this repo)
- **What:** owner: "it should be able to see on its own" — confirm-every-time is
  friction. Edit `plugins/kb/skills/kb-seed/SKILL.md` step 3 (currently "never seed
  silently"): seeder judges worth autonomously, writes, then REPORTS what it wrote
  (fail-open — `.claude/kb/extracted/` is regenerable + every entry cited, so wrong
  entries are cheap to prune after the fact). Build-time call: whether a corpus's
  FIRST-ever seed run keeps one confirm (recommended: no — report-after is enough;
  owner's direction was unqualified). Version-bump kb + cascade.
- **Done-check:** SKILL.md shows judge-then-report (no mandatory pre-confirm);
  report format names each written file + its citation; suites green; ideally lands
  before task #4's crowd-game seed so the pilot runs the new protocol.

## 3. Chore: fix ledger-compaction T-ENF-3 calendar drift (essense-flow)
- **What:** `plugins/essense-flow/tests/ledger-compaction.test.js` T-ENF-3 fails on
  a clean tree — governance-ledger entries >30d unarchived (calendar drift, found
  2026-07-25 pre-existing). Either archive the stale entries or make the test
  time-robust; root-fix, not a skip.
- **Done-check:** full ledger-compaction suite green on clean tree; still green with
  system date advanced (the drift class closed, not dodged).

## 4. Dogfood the kb MCP loop (passive, this repo, overlaps everything)
- **What:** owner's hard requirement is ambient availability. Status 2026-07-25:
  6 kb_query calls in one session, ALL protocol-driven (seed dupe checks), ZERO
  unprompted — not yet the signal. Keep watching: does Claude self-call kb_query
  mid-work when reasoning wants known facts? Do narrowing hints drive re-calls?
- **Done-check:** ≥1 unprompted kb_query in a real work turn whose answer changed
  the work; noted in log with query + what it saved. If zero after ~5 sessions,
  that's a finding too — capture it (server instructions or alwaysLoad need rework).

## 5. Crowd-game session bundle: lens preset + /kb-seed pilot (next session THERE)
- **What:** (a) copy `plugins/verifiability-lens/defaults/presets/game-project.yaml`
  → crowd-game's `.claude/verifiability-lens/profile.yaml` (this repo's half DONE).
  (b) run /kb-seed on crowd-game — the FIRST foreign corpus, ideally under task #2's
  autonomous protocol. (c) NEW purpose: this seed is the EVIDENCE GATE for retrieval
  rungs 2/3 (Q9 ladder) — record hand-driven queries that MISS and why (typo? 
  vocabulary mismatch? ranking?).
- **Done-check:** profile file exists + next lens fire there reads it; `kb stat` on
  crowd-game shows a populated kb-extracted store; a hand-driven query finds a
  seeded fact; a written list of retrieval misses (or "none found") exists for #6.

## 6. Retrieval rungs 2/3 — evidence-gated (kb, after #5)
- **What:** Q9 law: rung 2 = characterization pass (LLM once at index time, cached
  by content hash — catches vocabulary mismatch, the class word-level tricks can't);
  rung 3 = embeddings as a drop-in ranker, ONLY if 1+2 underperform. Build rung 2
  only if #5's miss list shows the vocabulary-mismatch class; skip straight to
  "rung 1 suffices, park 2/3 with evidence" if the misses don't show it.
- **Done-check:** decision recorded in log citing concrete #5 misses; if built:
  cached enrich job + ranker tests green + re-run of the missed queries now hits.

## 7. Diploma residual: confirm the corrupt-state banner (next Diploma session)
- **What:** task-#3's done-check clause "Diploma launch surfaces its corruption
  instead of silence" is only observable in the Diploma repo (its state.yaml:123
  duplicate key). First minutes of the next Diploma session: launch, expect the
  DEGRADED banner (essense-flow 0.26.1 behavior), then fix Diploma's state.yaml.
- **Done-check:** banner observed in Diploma (or absence investigated as a 0.26.1
  bug); Diploma state.yaml parses clean afterward.

## 8. Phase 0 validation — passive, on THIS repo (live)
- **What:** use mk-cc-resources normally with the steward loop: auto-brief at open,
  captures during talk, owner-present integration diffs.
- **Done-check:** design §5 Phase 0 checks measured HERE — (a) zero pasted context
  at session start; (b) diffs read correctly; (c) ~0 steering turns between "do it"
  and hand-back; (d) ≥1 direction-change lands as thought → recompute → diff →
  rebuilt part (two strong data now: the kb thread 07-24→07-25, and Q9 → rung 1
  shipped same session).

## 9. Crowd-game steward evaluation (~5 sessions or ~1 week after its seed)
- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts
  (baseline = 43 .jsonl files existing 2026-07-21; after-set = post-seed mtime;
  exclude eval sessions). Before/after on 5 signals: (a) start ritual (new files in
  `D:\crowd-game\crowd-game\.claude\prompts\`, baseline 21 — disk-verified;
  >500-char context paste = ritual), (b) steering density (real user-typed turns
  only; baseline median ~20–25, max 93 — B-inherited, consume the delta), (c) idea
  survival (captured/spoken ratio; baseline 0), (d) ship awareness ("what are we
  doing"/"where do we stand"… in user text; pass = zero + owner-felt verdict),
  (e) direction-change cost (user turns from change-of-mind to built+accepted;
  baseline precedent 45-turn psience churn; pass = single digits). Full rules
  preserved verbatim: `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`.
- **Done-check:** before/after table exists with confidence notes (which baselines
  are B-inherited vs disk-verified). **Owner annoyance = veto regardless of
  numbers.** Eval outcome also unlocks the deferred drop-channel decision (Q8).

## 10. Phase A — wire the gates (on this repo)
- **What:** coupling/extensibility + tests into every executor step; deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`).
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on task 8 showing the loop holds here.)

## 11. Phase B — harden the steward
- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion,
  duplicate → correct cascaded diffs); recurring spot-check re-injection; verbs
  /discuss /test /work.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded
  deletions; spot-check fires periodically in normal use.

## 12. Phase C — injection-layer economics
- **What:** REMAINING lens work: hand-back + risk-triggered firing (not per-turn) —
  the profile side SHIPPED early in 0.4.0. BROADENED per owner: apply the same
  economics to the whole per-prompt injection stack (verification-rules, caveman,
  generalize-first, hints) — fire conditionally, not unconditionally. NEW
  instrument: kb-pull — wherever a session can ASK (kb_query) instead of being FED,
  prefer pull; task #4's dogfood findings feed this design.
- **Done-check:** lens fire-count drops vs the rough 2026-07-21 baseline (24–30
  fires/long session, ~25–55k tok/dispatch) with zero missed hand-back failures;
  injection stack fires only where its trigger condition holds.

## 13. Phase D — generalization pass (seed part DONE early; kb-seed joins it)
- **What:** crowd-game steward-seeded 2026-07-21 (owner, ahead of plan) — remaining:
  extract anything mk-cc-resources-specific from the loop after the task-9 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides
  the same pass (task 5b is its first datum); then EMDE/psience seed.
- **Done-check:** next project (EMDE or psience) onboards by steward-seeding +
  kb-seeding alone — no tooling code changes.

## 14. Phase E — retire ceremony officially [Q4, Q5 land here]
- **What:** docs + marketplace reposition; classic pipeline preserved;
  essense-autopilot retires (Q4). Absorption fodder (2026-07-22 candidates list):
  handoff/resume redundant in steward projects (and now double-indexed by kb —
  session-caste sources); retro/meta-review → steward verbs; truth split
  memory=owner / model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** new toy project goes idea → running slice through the steward
  loop only, in one evening.
