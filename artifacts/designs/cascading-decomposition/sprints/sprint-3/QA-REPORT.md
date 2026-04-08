> **type:** qa-report
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/QA-REPORT.md
> **date:** 2026-04-07
> **plan:** artifacts/designs/cascading-decomposition/PLAN.md
> **overall_result:** PASS (5 fixes)
> **key_decisions:** none
> **open_questions:** none

# QA Report: Sprint 3

## Summary
- Task spec compliance: 59/61 criteria passed (1 fail, 1 skipped)
- Requirements alignment: All sprint-scoped requirements fully addressed
- Fitness functions: 15/17 passed (F11, F12 — known, pre-existing)
- Adversarial tests: 37 scenarios tested — 1 fail, 10 risks identified, 26 pass

## Critical Issues
None. No findings block Sprint 4.

## High Priority

### H1: `leaf-ready` and `overflow` status values missing from INDEX.md template
**Source:** Adversarial QA #26
**Files:** `templates/index.md`
**Issue:** scope-decompose.md produces `leaf-ready`, execute.md produces `overflow`, but the INDEX.md template canonical status list omitted both.
**Status:** FIXED AUTONOMOUSLY — added both to status progression with descriptions.

### H2: miltiaze mkdir ordering — writes before directory exists
**Source:** Adversarial QA #35
**Files:** `miltiaze/workflows/requirements.md`
**Issue:** Step 1e (ensure directory exists) was ordered AFTER steps 1b-1d (file writes). Writes would fail if directory didn't exist yet.
**Status:** FIXED AUTONOMOUSLY — moved mkdir to step 1a, renumbered subsequent steps.

### H3: Line counting mismatch between agent prompt and orchestrator verification
**Source:** Adversarial QA #36
**Files:** `ladder-build/workflows/execute.md`
**Issue:** Agent prompt said "exclude imports, blank lines, comments" but orchestrator verification said "non-blank, non-comment lines" (includes imports). Mismatched thresholds would cause inconsistent overflow detection.
**Status:** FIXED AUTONOMOUSLY — aligned agent prompt to "exclude blank lines and comment-only lines" (matching orchestrator).

### H4: Decision status filter is exclusion-based, not inclusion-based
**Source:** Adversarial QA #34
**Files:** `scope-decompose.md` (line 213), `execute.md` (line 188)
**Issue:** Both files skip decisions where `status starts with "superseded-by-"` but don't require `status: final`. Decisions with status `draft`, `proposed`, or typos would pass the filter.
**Recommendation:** Change to inclusion-based: "include only decisions with `status: final`".
**Status:** Scheduled for Sprint 4.

### H5: Feature flow scope_root fallback hardcodes `artifacts/scope/`
**Source:** Adversarial QA #5
**Files:** `execute.md` (line 23)
**Issue:** If STATE.md is missing/corrupted, the fallback checks `artifacts/scope/INDEX.md` directly, which wouldn't find feature-scoped INDEX.md at `artifacts/scope/features/<slug>/INDEX.md`.
**Recommendation:** Document this limitation or add feature-path glob fallback.
**Status:** Scheduled for Sprint 4.

### H6: No overflow threshold validation
**Source:** Adversarial QA #9, Task Spec Compliance T14
**Files:** `execute.md`
**Issue:** If INDEX.md overflow_threshold is 0, negative, or non-numeric, agents receive broken instructions. Spec edge case explicitly requires "ignore invalid value, use default 300" but no guard exists.
**Recommendation:** Add validation: if threshold <= 0 or non-numeric, warn and use default 300.
**Status:** Scheduled for Sprint 4.

## Medium Priority

### M1: INDEX.md re-run in miltiaze — no orphan warning
**Source:** Adversarial QA #1
**Files:** `miltiaze/workflows/requirements.md`
**Issue:** Task spec edge case says "warn user that previous scope data will be orphaned" when INDEX.md already exists, but no such check was implemented.
**Status:** Scheduled for Sprint 4.

### M2: Wave number "N" undefined for scope mode
**Source:** Adversarial QA #31
**Files:** `execute.md` (line 240)
**Issue:** Report saves to `implementation-wave-{N}.md` but N is undefined in scope mode. Is it sequential counter, tier number, or execution round?
**Status:** Scheduled for Sprint 4 (documentation).

### M3: Skipped modules not reported in scope mode
**Source:** Adversarial QA #7
**Files:** `execute.md`
**Issue:** In scope mode, modules not in "ready"/"leaf-ready" state are silently skipped. User doesn't see which modules need more decomposition.
**Status:** Scheduled for Sprint 4.

### M4: estimated_lines null check at depth cap forced-leaf
**Source:** Adversarial QA #32
**Files:** `scope-decompose.md` (line 107)
**Issue:** M4 fix checks estimated_lines against overflow threshold, but if estimated_lines is null/missing, the comparison would fail silently. Unlike M3/QG5 which handles missing estimates, the depth cap path doesn't.
**Status:** Scheduled for Sprint 4.

### M5: F5 fitness function assertion incomplete
**Source:** Fitness Function QA
**Files:** PLAN.md
**Issue:** F5 listed 4 required sections but actual requirement is 6.
**Status:** FIXED AUTONOMOUSLY — updated to list all 6 sections.

### M6: F11 negation in template code fence
**Source:** Fitness Function QA
**Files:** `templates/agent-brief-decompose.md` (line 107)
**Issue:** "do not decompose further" inside `<task>` code fence. Agent-facing content should use positive framing.
**Status:** Deferred — Sprint 4 T19 documentation pass will review all template language.

### M7: PLAN.md Refactor Requests and Risk Register bookkeeping
**Source:** Requirements Alignment
**Issue:** 8 Sprint 3 refactor items showed "pending" despite being completed by T22. Risk Register entries not updated.
**Status:** FIXED AUTONOMOUSLY — updated all completed items to "done" with task references.

## Low Priority

### L1: scope_root trailing slash inconsistency
**Source:** Adversarial QA #28
**Issue:** miltiaze uses trailing slash, path concatenation produces `//`. Functionally harmless on all platforms.

### L2: Dual pipeline state (scope/ + designs/) no warning
**Source:** Adversarial QA #30
**Issue:** If both pipelines have artifacts, old designs/ silently becomes unreachable. No warning to user.

### L3: Feature mode detection relies on LLM interpretation
**Source:** Adversarial QA #29
**Issue:** scope_mode uses keywords, feature_mode uses semantic detection. Inconsistent mechanisms.

### L4: source_hash timing (in-memory vs disk)
**Source:** Adversarial QA #4
**Issue:** No explicit instruction to compute hash after disk write. Encoding differences could cause mismatch.

### L5: F12 quality gate gap — known, deferred
**Source:** Fitness Function QA
**Issue:** F4, F8, F9, F10 lack numbered quality gates. Documented in Refactor Requests as deferred.

## Autonomous Fixes Applied

| # | What | Where | Why |
|---|------|-------|-----|
| 1 | Added `leaf-ready` and `overflow` to canonical status list | `templates/index.md` lines 50-52 | Three files produce/consume these statuses but template didn't document them |
| 2 | Moved mkdir to step 1a (before file writes) | `miltiaze/workflows/requirements.md` lines 157-159 | Directory must exist before writing files to it |
| 3 | Aligned overflow line counting — removed "exclude imports" from agent prompt | `ladder-build/workflows/execute.md` line 140 | Agent and orchestrator must use same counting rules |
| 4 | Updated F5 assertion from 4 to 6 required sections | `PLAN.md` Fitness Functions | F5 was incomplete — actual requirement is 6 sections |
| 5 | Updated Refactor Requests (8 items done) and Risk Register (3 items resolved) | `PLAN.md` tables | Bookkeeping — completed work was still marked pending |

## Recommendations for Next Sprint

Sprint 4 should include the planned work (scope-discover, documentation, calibration) plus these QA-sourced hardening tasks:

1. **Decision filter hardening** (H4) — change to inclusion-based `status: final` in both scope-decompose and execute.md
2. **Overflow threshold validation** (H6) — add guard for invalid values, default to 300
3. **Feature flow robustness** (H5, M1) — INDEX.md re-run warning, feature scope_root fallback
4. **Scope mode reporting** (M2, M3) — define wave number, report skipped modules
5. **estimated_lines null check** (M4) — handle missing estimate at depth cap
