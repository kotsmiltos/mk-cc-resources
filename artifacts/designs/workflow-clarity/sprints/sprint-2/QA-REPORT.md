# QA Report: Sprint 2

> **type:** qa-report
> **output_path:** artifacts/designs/workflow-clarity/sprints/sprint-2/QA-REPORT.md
> **date:** 2026-03-29
> **plan:** artifacts/designs/workflow-clarity/PLAN.md
> **overall_result:** PASS (4 notes)
> **key_decisions:** none
> **open_questions:** metadata placement convention (metadata-before-title vs title-before-metadata), routing exclusion scope for PLAN.md fallback

## Summary
- Task spec compliance: 43/44 criteria passed (1 skipped — runtime-only sed availability)
- Requirements alignment: All 10 requirements fully addressed, 0 scope reductions, 3 minor scope additions (all L1 consistency fixes)
- Fitness functions: 16/17 passed (FF-17 FAIL — 2 workflows fixed autonomously, 1 deferred)
- Adversarial tests: 37 scenarios — 17 PASS, 3 FAIL, 12 RISK, 5 PASS (edge cases)

## Critical Issues
None. No findings block Sprint 3.

## High Priority

### H1: PLAN.md fallback routing conflict with stage-specific rules
**Found by:** Adversarial (Scenario #13, #14)
**What:** The M3 fix (routing ambiguity) only excludes "idle" and "complete" from the PLAN.md fallback (intent-inject.sh line 216). But stages that already have specific routing rules — `sprint-N-complete` (line 210), `reassessment` (line 212) — also trigger the PLAN.md fallback because they are not "idle" and not "complete." This produces conflicting suggestions: e.g., stage is `sprint-1-complete`, the specific rule says "/architect for QA review" (line 211), but the fallback also fires suggesting "/ladder-build" (line 217).
**Root cause:** The M3 fix was too narrow. It addressed the specific reported cases (idle + complete) rather than making the PLAN.md fallback a true catch-all that only fires when no prior rule matched.
**Recommendation:** Restructure the PLAN.md fallback to fire only when no stage-specific rule above already matched. Simplest fix: change line 216 from "AND stage is not 'idle' and not 'complete'" to "AND none of the stage-specific routing rules above have already matched." Or: add the remaining 4 stage-specific values to the exclusion list (research, requirements-complete, audit-complete, sprint-N, sprint-N-complete, reassessment).
**Schedule:** Sprint 3 — bundle with fitness functions task (hook integration).

## Medium Priority

### M1: FF-17 — 3 workflows missing "state description, not action" instruction
**Found by:** Fitness Function Verification (FF-17)
**What:** Three workflows write Current Focus without the explicit "Write Current Focus as a state description — what IS, not what to DO" instruction:
1. `plugins/architect/skills/architect/workflows/audit.md` line 269
2. `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` line 201
3. `plugins/mk-flow/skills/state/workflows/pause.md` line 49
**Status:** FIXED AUTONOMOUSLY for audit.md and requirements.md (both Sprint 2 files). pause.md deferred to Sprint 3 (not in Sprint 2 scope).

### M2: Metadata placement inconsistency across templates
**Found by:** Adversarial (Scenario #1)
**What:** 4 templates place metadata BEFORE the `# Title` line (exploration-report, requirements-report, state, continue-here). 5 templates place metadata AFTER the `# Title` line (plan, task-spec, audit-report, build-plan, milestone-report). The 2 workflow-embedded templates (QA report, completion report) also use title-first.
**Impact:** Sprint 3's format-agnostic extraction must handle both patterns. If extraction parses by field name (grep for `> **type:**`), the position doesn't matter. If it parses by position ("first blockquote block is metadata"), it will miss title-first templates.
**Recommendation:** Decide one convention and apply it uniformly in Sprint 3. Metadata-first (miltiaze pattern) is the safer choice for extraction — the metadata block is always the first blockquote in the file.

### M3: Field casing inconsistency in workflow-embedded templates
**Found by:** Adversarial (Scenario #22)
**What:** The QA report template (review.md line 249) uses lowercase `> **date:**` and `> **plan:**`. The completion report template (execute.md line 165) uses capitalized `> **Date:**` and `> **Plan:**`. Sprint 3 extraction must be case-insensitive or these will be treated as different fields.
**Status:** FIXED AUTONOMOUSLY — execute.md completion report normalized to lowercase.

### M4: continue-here.md metadata lacks "or none" defaults
**Found by:** Adversarial (Scenarios #17, #18)
**What:** All other templates include `[..., or "none"]` for key_decisions and open_questions. continue-here.md says `[decisions made this session]` and `[blockers or unresolved items]` without the "or none" default. Inconsistent empty-state representation for Sprint 3 extraction.
**Status:** FIXED AUTONOMOUSLY — added "or none" defaults.

## Low Priority

### L1: Split blockquote groups in some templates
**Found by:** Adversarial (Scenarios #4, #21)
**What:** build-plan.md, milestone-report.md, and the completion report embed domain-specific fields in a second blockquote group separated by a blank line from the core 4 fields. Sprint 3 extraction must handle "metadata may span multiple blockquote groups."
**Recommendation:** Document as a parser constraint for Sprint 3 Task 1.

### L2: Adversarial section format varies across templates
**Found by:** Adversarial (Scenario #33)
**What:** Plan uses a table (Failure Mode, Affected Sprint, Mitigation, Assumption at Risk). Audit uses a different table (Blind Spot, What It Could Miss, Consequence). Exploration uses structured bullets. Milestone uses freeform prose. This is intentional per Decision #5 (contextual naming), but Sprint 3 extraction should not attempt to parse adversarial sections structurally.
**Recommendation:** Note in Sprint 3 extraction spec: adversarial sections are not machine-parseable.

### L3: state.md metadata uses referential values
**Found by:** Adversarial (Scenario #19)
**What:** state.md `key_decisions` says "see Decisions Made section below" instead of inline values. Intentional (documented in Task 4 spec) to avoid duplication, but Sprint 3 extraction must handle this pattern.
**Recommendation:** Document as a parser constraint for Sprint 3 Task 1.

### L4: Domain-specific field naming conventions vary
**Found by:** Adversarial (Scenarios #23, #24)
**What:** Core fields use snake_case (`key_decisions`, `output_path`). Domain-specific fields use mixed conventions: `End Goal` (Title Case), `Build plan` (Sentence case), `Status` (Title Case). Sprint 3 extraction should use case-insensitive, whitespace-tolerant field matching.
**Recommendation:** Note in Sprint 3 extraction spec.

### L5: Empty stage triggers PLAN.md fallback
**Found by:** Adversarial (Scenario #11)
**What:** If Pipeline Position has `Stage:` with no value, the empty string is neither "idle" nor "complete," so the PLAN.md fallback fires. This is correct per the Task 5 edge case spec but could confuse users with empty state.
**Recommendation:** Covered by H1 fix — when the fallback becomes a true catch-all, empty stage would fall to the unknown-stage catch-all (line 220) first.

### L6: pause.md missing FF-17 "state description" instruction
**Found by:** Fitness Function Verification (FF-17)
**What:** pause.md writes Current Focus without explicit "state description, not action" instruction. Not in Sprint 2 scope.
**Recommendation:** Add to Sprint 3 scope.

## Autonomous Fixes Applied

| Fix | File | What Changed |
|-----|------|-------------|
| M1/FF-17 | `plugins/architect/skills/architect/workflows/audit.md` | Added "State description, not action." instruction after Current Focus update |
| M1/FF-17 | `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` | Added "Write Current Focus as a state description — what IS, not what to DO." instruction |
| M3 | `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | Normalized `> **Date:**` to `> **date:**` and `> **Plan:**` to `> **plan:**` in completion report template |
| M4 | `plugins/mk-flow/skills/state/templates/continue-here.md` | Added ", or 'none'" to key_decisions and open_questions field descriptions |

## Proposed New Fitness Functions

- [ ] FF-18: Every workflow that generates an inline template (COMPLETION.md, QA-REPORT.md) must include the 4 core metadata fields (type, output_path, key_decisions, open_questions)
- [ ] FF-19: All metadata field names in the core 4 fields must use snake_case consistently across all templates
- [ ] FF-20: The PLAN.md fallback routing rule must only fire when no stage-specific rule above already matched

## Recommendations for Sprint 3

1. **H1 routing fix** — bundle with the fitness functions task. Change the PLAN.md fallback to be a true catch-all.
2. **Metadata placement convention** — decide metadata-first or title-first and apply uniformly. This affects format-agnostic extraction (Sprint 3 Task 1). Recommend metadata-first for extraction simplicity.
3. **pause.md FF-17 fix** — 1-line addition, bundle with any task touching mk-flow.
4. **Sprint 3 extraction** must handle: split blockquote groups, mixed field naming, referential values in state.md, case-insensitive field matching. Document these as parser constraints in the task spec.
