# Tasks — ordered, executor-ready (recomputed 2026-07-22, post inbox-integration)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Ordering rationale: Q8 executed same-session (GSD uninstalled, fleet briefing shipped
as steward 0.2.0 — outcomes in log, not tasks). Preset dogfood is HALF done (this repo
active; crowd-game half waits for a session THERE). Context-inject inversion is the
code-verified bug in the most-fired hook; commit+push clears the growing uncommitted
07-22 batch. Then passive validation, the ~1-week crowd-game eval (which also unlocks
the deferred drop-channel decision), and Phases A–E (C shrunk: profile side shipped in
lens 0.4.0; D shrunk: first external seed already happened).

## 1. Finish lens-preset dogfood — crowd-game half (this repo's half DONE)
- **What:** at the next crowd-game session, copy
  `plugins/verifiability-lens/defaults/presets/game-project.yaml` → crowd-game's
  `.claude/verifiability-lens/profile.yaml`. (plugin-repo preset already active here.)
- **Done-check:** file exists at crowd-game's override path; next lens fire there
  reads it (read-once rule) — focus items appear in its output.

## 2. Fix context-inject economics inversion (essense-flow)
- **What:** the injection layer is inverted both ways (code-verified by lens,
  2026-07-22): never-existed `.pipeline` → LOUD banner every prompt
  (`lib/state.js:433-437` has no never-existed probe; `hooks/scripts/context-inject.js:57-68`
  uniform — fired ~40x in one session for a pipeline that never existed), while
  yaml-parse-corrupt → SILENT (`state.js:439-466` throws → `context-inject.js:34`
  catches → stderr only — exactly Diploma's silent-fail, state.yaml line 123 duplicate
  key). Fix = silence never-existed AND un-silence parse-corrupt. Also damp
  generalize-first over-trigger on feature-ish phrasing.
- **Done-check:** repo without `.pipeline/` gets zero banner; corrupt-yaml fixture gets
  a visible degradation warning; existing hook tests green; Diploma launch surfaces its
  corruption instead of silence.

## 3. Commit 2026-07-22 work + push on owner word
- **What:** commit thorough-mode 1.10.0 + lens 0.4.0 + steward 0.2.0 (fleet) +
  marketplace 2.30.0 + lens profile + doc cascade + model updates (all uncommitted per
  log); run @ship checks (/docs-audit) pre-push; push main ONLY on owner word (655f644
  still unpushed too).
- **Done-check:** git status clean; /docs-audit zero drift; after owner word:
  remote main == local HEAD.

## 4. Phase 0 validation — passive, on THIS repo (live)
- **What:** use mk-cc-resources normally with the steward loop: auto-brief at open,
  captures during talk, owner-present integration diffs.
- **Done-check:** design §5 Phase 0 checks measured HERE — (a) zero pasted context at
  session start; (b) diffs read correctly; (c) ~0 steering turns between "do it" and
  hand-back; (d) ≥1 direction-change lands as thought → recompute → diff → rebuilt
  part (the pilot-switch answer is a first candidate).

## 5. Crowd-game steward evaluation (~5 sessions or ~1 week after its seed)
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

## 6. Phase A — wire the gates (on this repo)
- **What:** coupling/extensibility + tests into every executor step; deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`).
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on task 4 showing the loop holds here.)

## 7. Phase B — harden the steward
- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate →
  correct cascaded diffs); recurring spot-check re-injection; verbs /discuss /test /work.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded
  deletions; spot-check fires periodically in normal use.

## 8. Phase C — injection-layer economics (scope updated 2026-07-22)
- **What:** REMAINING lens work: hand-back + risk-triggered firing (not per-turn) —
  the profile side (per-project override + focus + presets + read-once) SHIPPED early
  in 0.4.0. BROADENED per owner: apply the same economics to the whole per-prompt
  injection stack (verification-rules, caveman, generalize-first, hints) — fire
  conditionally, not unconditionally.
- **Done-check:** lens fire-count drops vs the rough 2026-07-21 baseline (24–30
  fires/long session, ~25–55k tok/dispatch) with zero missed hand-back failures;
  injection stack fires only where its trigger condition holds.

## 9. Phase D — generalization pass (seed part DONE early)
- **What:** crowd-game seeded 2026-07-21 (owner, ahead of plan) — remaining:
  extract anything mk-cc-resources-specific from the loop after the task-5 eval;
  verb set + model structure prove open or get fixed; then EMDE/psience seed.
- **Done-check:** next project (EMDE or psience) onboards by seeding alone — no
  tooling code changes.

## 10. Phase E — retire ceremony officially [Q4, Q5 land here]
- **What:** docs + marketplace reposition; classic pipeline preserved;
  essense-autopilot retires (Q4). Absorption fodder (2026-07-22 candidates list):
  handoff/resume redundant in steward projects; retro/meta-review → steward verbs;
  GSD uninstall; truth split memory=owner / model=project / CLAUDE.md=code.
- **Done-check:** new toy project goes idea → running slice through the steward loop
  only, in one evening.
