# essense-flow review skill — substance mirror

## Read this before doing anything

Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics. Refuse to "wrap up" when work isn't done.

Positive mindset: every gap solvable. Find the way by working carefully.

Quality ownership: this work matters. Take ownership.

Propagation requirement: every descendant artifact MUST carry these same 4 instructions.

## Scope of this file

Substance source for the review skill. Authoritative reference for review-skill-internal rules; `plugins/essense-flow/skills/review/SKILL.md` is the operational surface. The canonical SKILL.md remains the source of truth for the review skill's operational mechanics; this substance mirror exists so that round-10+ governance text travels as evidence alongside SKILL.md and is grep-targetable from closure-plan validation.

If the SKILL.md body and this mirror diverge, SKILL.md wins on operational mechanics. This mirror is updated at the same write boundary as SKILL.md changes — drift is a closure-plan validation failure.

## DD-2 review-lens-dispatch Skip-IFF rule (D-Sprint10-5)

The default discipline: review-skill lens dispatch count >= 6 (canonical lens count per DD-20 + per the existing review skill body — `correctness`, `contract-compliance`, `hidden-state`, `failure-modes`, `spec-drift`, `functional-testing`, with adaptive additions per INST-13). Master review MAY skip the 6-lens dispatch ONLY IFF EITHER:

1. **task_count <= 2** — the sprint under review has <= 2 tasks in the manifest. Rationale: a 1-2 task sprint cannot exercise 6 distinct review lenses with non-trivial verdict; condensed review is a substance-justified shortcut.

OR

2. **rule-allowed-substance-quote cited** — the `QA-REPORT.md` frontmatter or master synthesize note carries a verbatim rule quote from `skill-substance/review.md` (this file) or from a closed DD authorizing the condensed-lens path for this sprint. Citation MUST include the rule-quote text + source decision ID.

IF NEITHER condition holds → 6-LENS DISPATCH IS MANDATORY; the `transitions.yaml` `requires` predicate at the `reviewing → verifying` boundary refuses exit if `lenses_dispatched.length < 6` and no rule-allowed-skip flag is set.

### Predicate enforcement

`evalDispatchPredicate` recognizes the phrase `with sufficient lens dispatch` (declared in the `DISPATCH_PHRASES` table in `bin/essense-flow-tools.cjs` — substrate-verified at line 1918, phrase entry at line 1920 with `sourceKey: 'lens'`). The evaluator checks count vs threshold via `cursorState.alignment_lens_dispatches_per_round`. T-1020 extends this to honor the rule-allowed-skip path when a verbatim rule-quote citation is present in the QA-REPORT frontmatter.

### Drift detection

The `drift-7` substantive check (M4 module, T-1024) scans `QA-REPORT.md` frontmatter post-hoc to confirm that any sprint exiting `reviewing → verifying` with `lenses_dispatched.length < 6` carries a valid skip justification (`task_count <= 2` OR rule-quote citation). Mis-justified skips surface as drift findings, not silent advances.

### Verifiable check

Spawn review skill on a fixture sprint with `task_count=10` + `lenses_dispatched=[]` + no rule-quote citation. The `state-set-phase reviewing → verifying` op refuses with `EXIT_ALIGNMENT_DRIFT` (exit code 19), diagnostic naming `"DD-2 review-lens-dispatch Skip-IFF rule"`.

### Why this rule exists

Without the Skip-IFF gate, review masters drift toward two failure modes:

- **Over-skip** — small sprints get a vibes-based "looks fine" pass with zero lenses; the deterministic gate never runs; bugs ship.
- **Over-dispatch** — 1-2-task sprints burn budget on 6 redundant lenses that cannot find non-trivial verdicts; review becomes ceremony.

The rule names both shortcuts and constrains them: `task_count <= 2` legitimizes condensed review for genuinely small sprints; the rule-quote path legitimizes condensed review when a closed DD authorizes it. Otherwise, 6 lenses run.

### Amendment history

- 2026-05-15 — Initial rule authored per DD-2 + D-Sprint10-5 (closure-plan Sprint 10, T-1018).
