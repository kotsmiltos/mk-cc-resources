# Tasks — ordered, executor-ready (recomputed 2026-07-21, post model-commit)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Ordering rationale: **mk-cc-resources IS the Phase 0 pilot** (Q1) — model seeded AND
committed (655f644 = HEAD of main); only the push sliver remains, gated on owner word
(never push unasked), placed after the CLAUDE.md sync so one push carries both. The
modifier misfire audit stays top (observed friction, small, independent). Phases A–E
measure against THIS repo; crowd-game graduates to Phase D.

## 1. Fix modifier misfire class — audit all 8 (thorough-mode) [Q3: full audit]
- **What:** anchor trigger detection to user-authored prompt text so regexes can't
  match inside notifications/injected text; one pass over all 8 modifiers
  (++/@thorough, @ship, @present, @debug, @verify, @fresh, @prompt, @build).
- **Where:** `plugins/thorough-mode/hooks/thorough-mode.js` + its tests.
- **Done-check:** notification-text fixture fires NO modifier; genuine keyword in user
  text still fires, per modifier; existing tests green; patch version bump cascaded.

## 2. Sync CLAUDE.md architecture snapshot (steward plugin missing)
- **What:** add steward to the CLAUDE.md plugin tree + any other 3791b7f drift; run
  /docs-audit to confirm no other stale entries.
- **Where:** `C:\Users\mkots\mk-cc-resources\CLAUDE.md` (+ /docs-audit report).
- **Done-check:** /docs-audit reports zero drift for steward across CLAUDE.md,
  README.md, marketplace.json.

## 3. Push main to remote — AWAITS OWNER WORD (residual of the done commit task)
- **What:** push main (655f644 + whatever lands above) once the owner says so — never
  push unasked (global rule).
- **Done-check:** remote main == local HEAD.

## 4. Phase 0 validation — passive, on THIS repo (live now)
- **What:** use mk-cc-resources normally with the steward loop: auto-brief at open,
  captures during talk, owner-present integration diffs. No experiment framing.
- **Done-check:** design §5 Phase 0 checks measured HERE — (a) session starts need
  zero pasted context (no @prompt/handoff ritual); (b) diffs read correctly — owner
  can always say where the ship is; (c) ~0 steering turns between "do it" and
  hand-back; (d) ≥1 real direction-change lands as thought → recompute → diff →
  rebuilt part. (Today's pilot-switch answer is itself a first (d) candidate.)

## 5. Phase A — wire the gates (on this repo)
- **What:** coupling/extensibility + tests into every executor step; deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`) for this repo.
- **Where:** steward/executor protocol + plugin-toolkit runner.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on task 4 showing the loop holds here.)

## 6. Phase B — harden the steward
- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate →
  correct cascaded diffs); recurring spot-check re-injection wired; verbs /discuss
  /test /work.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded
  deletions; spot-check fires periodically in normal use.

## 7. Phase C — lens re-economics [Q2: baseline = this session's measurements]
- **What:** verifiability-lens fires at hand-back + risk signals, cached profile,
  bounded — not per-turn. Lens stays ON as-is until this lands.
- **Done-check:** fire-count drops vs the rough 2026-07-21 baseline (24–30 fires/long
  session, ~25–55k tokens/dispatch) with zero missed hand-back failures.

## 8. Phase D — first external project: seed crowd-game + generalization pass
- **What:** run /steward:seed on crowd-game (worst continuity pain: 21 prompt files,
  254 @prompt calls); extract anything mk-cc-resources-specific from the loop; verb
  set + model structure prove open or get fixed. EMDE/psience follow the same path.
- **Done-check:** crowd-game onboards by seeding alone — no tooling code changes.

## 9. Phase E — retire ceremony officially [Q4, Q5 land here]
- **What:** docs + marketplace reposition (held until now per Q5); classic pipeline
  preserved; essense-autopilot retires here per Q4.
- **Done-check:** new toy project goes idea → running slice through the steward loop
  only, in one evening.
