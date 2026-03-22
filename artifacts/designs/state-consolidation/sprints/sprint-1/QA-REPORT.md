# QA Report: Sprint 1

> **Date:** 2026-03-22
> **Plan:** artifacts/designs/state-consolidation/PLAN.md
> **Overall Result:** PASS (6 notes)

## Summary
- Task spec compliance: 25/27 criteria passed (1 FAIL, 1 PARTIAL — both grep pattern issues, not functional failures)
- Requirements alignment: 22/22 requirements fully addressed
- Fitness functions: 6/6 passed (1 skipped — Sprint 2 scope)
- Adversarial tests: 18 scenarios — 4 FAIL, 5 RISK, 5 PASS, 4 PASS (low)

## Critical Issues

**C1: drift-check.sh is broken for new-format plans (KNOWN — Sprint 2 scope)**

`parse_design_sprints()` at line 382-433 expects `Sprint | Status | Tasks | Completed | ...` column layout. New template uses `Sprint | Tasks | Completed | QA Result | Key Changes` — no Status column. The parser reads Tasks value into `col_status`, emitting "UNKNOWN STATUS: 4" for every sprint. Same issue for BUILD-PLAN.md: `parse_milestones()` expects `**Status:**` fields that no longer exist.

This is NOT a Sprint 1 failure — drift-check rewrite IS Sprint 2. But the transition window is real: any status query against the state-consolidation PLAN.md itself will produce garbage output.

**Recommendation:** Add a defensive format-detection guard as the first task in Sprint 2 before the full rewrite. Three lines that detect column count mismatch and skip with a warning instead of emitting "UNKNOWN STATUS."

## High Priority

**H1: intake/parsing-rules.md has stale instruction**

`plugins/mk-flow/skills/intake/references/parsing-rules.md` line 51: "Read BUILD-PLAN.md (if exists) for milestone names and statuses." Conflicts with Sprint 1's principle that BUILD-PLAN.md no longer carries status. Not in any Sprint 1 task's Files Touched list — missed during scope analysis.

**H2: mk-flow-init SKILL.md verification protocol references plan Status fields**

Lines 218-219 reference "Explicit status field in a BUILD-PLAN.md" and "plan status explicitly says 'completed'" as evidence sources. These fields no longer exist in new-format plans. mk-flow-init will produce incomplete STATE.md for projects using new templates.

**H3: No STATE.md-missing fallback in execute.md and review.md**

continue.md has a fallback ("If STATE.md doesn't exist, fall back to BUILD-PLAN.md milestone structure"). execute.md and review.md have no equivalent — they'll fail silently if STATE.md is absent.

## Medium Priority

**M1: Task 1 grep acceptance criterion too broad**

`grep -c '| Status |' plan.md` returns 2 (Refactor Requests + Risk Register tables), not 0. The Sprint correctly preserved these operational tracking columns, but the grep pattern doesn't distinguish between table sections. Functional behavior is correct; the test is poorly scoped.

**M2: build-milestone.md step 1 missing milestone identity guidance**

Step 1 says "Identify the current milestone" without specifying WHERE. continue.md feeds context, but direct invocation of build-milestone.md has no instruction to read STATE.md for current milestone.

**M3: Partial deployment risk has no technical enforcement**

Decision D9 says "All three plugins bump together" but nothing prevents installing only one. Partial upgrade = drift-check emits garbage. Social contract only.

## Low Priority

**L1: defaults/rules.yaml version not bumped**

Content changed (verify-before-reporting rule text) but `defaults_version` stayed at "0.5.0". Project rules at "0.6.0". The stale-defaults nudge won't trigger for other projects.

**L2: grep false positive in continue.md**

Task 4 criterion 8 matches prohibition line "Do NOT read BUILD-PLAN.md for status" — semantically correct, grep too broad.

## Autonomous Fixes Applied

None. All findings require either scope decisions (H1, H2, H3 — which files to touch) or are Sprint 2 scope (C1).

## Recommendations for Next Sprint

**Sprint 2 already planned:**
- Task 5: Rewrite drift-check core
- Task 6: Add --fix flag with backup

**Suggested additions from QA (pending user approval):**
1. Fix intake/parsing-rules.md stale reference (S)
2. Fix mk-flow-init SKILL.md verification protocol (S)
3. Add STATE.md-missing fallback to execute.md and review.md (S)
4. Add milestone identity guidance to build-milestone.md step 1 (S)
5. Bump defaults/rules.yaml version (S)

**Proposed new fitness functions:**
- [ ] Every workflow that writes to PLAN.md Sprint Tracking contains "Do NOT write a Status column"
- [ ] continue.md contains explicit prohibition against reading BUILD-PLAN.md for status
- [ ] Cross-reference "stage-names" rule lists all workflow files that set stage values

## Agent Consensus

| Area | Agreement | Notes |
|------|-----------|-------|
| Sprint 1 changes are correct and complete | All 4 agents | No scope reduction, no silent drops |
| Refactor Requests / Risk Register Status columns are intentional keepers | All 4 agents | Operational tracking, not sprint/task status |
| drift-check transition window is a risk | 3 of 4 agents | Compliance + adversarial + fitness agents noted it |
| intake/parsing-rules.md is a missed file | Adversarial agent | Unique insight — not flagged by other agents |
| mk-flow-init SKILL.md is stale | Adversarial agent | Unique insight — not flagged by other agents |
