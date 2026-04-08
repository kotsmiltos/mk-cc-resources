> **type:** qa-report
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/QA-REPORT.md
> **date:** 2026-04-07
> **plan:** artifacts/designs/cascading-decomposition/PLAN.md
> **overall_result:** PASS (8 autonomous fixes, 3 design decisions for user)
> **key_decisions:** none — all findings are corrections or deferred to user
> **open_questions:** traces_to alignment (D-pending-1), 300-400 line gap (D-pending-2), task ID format (D-pending-3)

# QA Report: Sprint 1

## Summary
- Task spec compliance: 54/54 criteria passed
- Requirements alignment: All Sprint 1 requirements fully addressed, no scope reductions
- Fitness functions: 9/10 passed (F3 failed — fixed autonomously)
- Adversarial tests: 23 scenarios — 6 FAIL, 10 RISK, 7 PASS

## Critical Issues

None blocking Sprint 2. All critical findings were either fixed autonomously or are design decisions that should be resolved during Sprint 2 planning.

## High Priority

### H1: traces_to gap between task-spec and agent briefs
`traces_to` exists in task-spec.md (T5) but not in agent-brief-decompose.md or agent-brief-implement.md. QG6 references `traces_to` but the .agent.md files it checks have no such field. The consistency check (T6) works around this via Owns-list comparison.

**Needs user decision:** Add `traces_to` to .agent.md templates, OR redefine QG6 to use the Owns-list approach, OR accept the gap and document it.

### H2: 300-400 line contradiction
Minimum size gate (400 lines: skip decomposition) and overflow threshold (300 lines: stop and decompose further) create a dead zone. A 350-line unit is simultaneously too big for a leaf and too small to decompose.

**Needs user decision:** Lower the gate to 300 (seamless range), OR raise the overflow threshold to 400 (simpler), OR document the gap as intentional (350-line units implement directly, overflow detection waived for under-gate units).

### H3: Task ID format undefined
No canonical task ID format exists across templates. task-spec.md uses placeholder `[Task ID]`, implementation briefs show `mod-types-t1` style, PLAN.md uses `T1, T2`. Cross-referencing between `traces_to` and `<contract>` sections would fail if different ID schemes are used.

**Needs user decision:** Define a canonical format and document it in scope-decomposition.md.

## Medium Priority

### M1: system-map template not created
Brief assembly Step 3 reads `system-map.agent.md` but no template defines its format. Sprint 2's scope-decompose workflow will need to produce a system-map. Should be added as a Sprint 2 task.

### M2: Depth 3+ path structure undefined
Templates show paths for module-level and component-level only. The recursive `components/*/components/*/...` nesting convention for depth 3+ is not documented.

### M3: Required XML section validation incomplete
INDEX.md update protocol Step 2 lists required sections for decomposition briefs as `<scope>, <interfaces>, <decisions>` but omits `<context>`, `<patterns>`, `<task>`, `<output_format>`. A brief missing `<task>` would pass validation.

### M4: No module slug validation rules
No template specifies allowed characters for slugs. Path traversal risk with names like `../../../etc`.

### M5: Decision ID tracking lacks persistent storage
The parallel reservation scheme says "the orchestrator notes the highest used ID" but no field in INDEX.md stores this. Sprint 2 workflow should write it to Decomposition Config.

### M6: Contract overhead formula uses inaccurate average
50 lines/file average vs actual 65-70 lines. Underestimates overhead by ~30%, allowing borderline over-decomposition.

### M7: Feature flow INDEX.md hardcodes project-brief.md
File Inventory section should note the feature-flow variant (`feature-brief.md`).

### M8: F4, F8, F9, F10 lack explicit quality gate coverage
These fitness functions rely on procedural enforcement or consistency-check coverage rather than numbered quality gates in the gate_failure_protocol.

## Low Priority

### L1: Semantic scope matching in consistency check
Owns-list matching between parent and children requires semantic understanding. "All file I/O operations" decomposed into "Read operations for CSV" + "Write operations for output" is correct but hard to verify mechanically.

### L2: `<interface>` vs `<interfaces>` tag naming
Intentional (singular=function signatures, plural=contracts) but fragile. No documentation explains the distinction.

### L3: Windows PATH_MAX at depth 5
Already in risk register. Templates impose no slug length limits.

## Autonomous Fixes Applied

| # | What Was Found | What Was Fixed | File |
|---|---------------|----------------|------|
| 1 | CHECK 4 tier/level conflation: "lower tier means higher level value" (factually wrong — tier and level are independent axes) | Changed to read tier from INDEX.md Module Status table; clarified tier ordering (1→2→3) | `templates/consistency-check.md` |
| 2 | "Do NOT apply when:" in pattern template body (F3 violation) | Reframed to "Exceptions — skip this pattern when:" | `templates/cross-cutting-pattern.md` |
| 3 | "Do NOT write" in pattern template comment (F3 violation) | Reframed to positive instruction | `templates/cross-cutting-pattern.md` |
| 4 | "Does NOT own:" in decompose brief scope section (F3 violation) | Changed to "Excluded from scope (owned by other modules):" | `templates/agent-brief-decompose.md` |
| 5 | "do or avoid" in decision record placeholder (F3 violation) | Changed to "must follow as a result" | `templates/decision-record.md` |
| 6 | Glob pattern `*--{target}*` false-matches prefix substrings (e.g., "api" matches "api-gateway") | Changed to `*--{target}.md` (exact suffix match) | `references/scope-decomposition.md` |
| 7 | Brief assembly includes superseded decisions alongside replacements (contradictory instructions) | Added status filter: skip decisions with "superseded-by-" status | `references/scope-decomposition.md` |
| 8 | source_hash not validated during brief assembly (stale briefs assembled silently) | Added hash validation to Step 9 of assembly algorithm | `references/scope-decomposition.md` |

## Recommendations for Next Sprint

1. **Add system-map template** (Sprint 2 dependency — assembly reads it)
2. **Resolve traces_to gap** (H1 — user decision required)
3. **Close 300-400 line gap** (H2 — user decision required)
4. **Define task ID format** (H3 — user decision required)
5. **Add depth 3+ path convention** to scope-decomposition reference
6. **Add slug validation rules** to scope-decomposition reference
7. **Add `next_decision_id` field** to INDEX.md Decomposition Config
8. **Document `<interface>` vs `<interfaces>` distinction** in scope-decomposition reference

## Proposed Fitness Functions

From QA Agent 3:
- **F11:** Templates self-comply with positive framing — template body content (inside code fences) must pass F3 lint. (Fixed in this sprint via autonomous corrections.)
- **F12:** Quality gate coverage — every fitness function (F1-FN) must map to at least one numbered QG.
- **F13:** Required section lists are consistent across reference and templates.
