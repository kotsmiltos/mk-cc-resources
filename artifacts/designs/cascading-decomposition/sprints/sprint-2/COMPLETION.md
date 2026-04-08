> **type:** completion
> **sprint:** 2
> **status:** complete-pending-qa
> **date:** 2026-04-07
> **plan:** ../../PLAN.md

# Sprint 2 Completion: Core Workflow + Routing

## Tasks Completed

| Task | Status | Key Output |
|------|--------|-----------|
| T7: scope-decompose workflow | done | `workflows/scope-decompose.md` — 8-step workflow skeleton with level-0 specifics. `references/scope-decomposition.md` updated with slug validation, depth 3+ paths, tag distinction. `templates/index.md` updated with next_decision_id. |
| T8: Parallel agent spawning | done | Step 5 spawning logic filled: role instructions, team values, tier-based batch execution (sequential Tier 1, parallel Tier 2/3), output validation, failure handling with retry/skip. |
| T9: Brief assembly + system-map | done | `templates/system-map.md` created (human + agent formats). Step 4 assembly procedure filled (9 steps from reference). Required XML section validation list in reference fixed (M3 finding). |
| T10: Consistency integration | done | Post-batch consistency verification filled in Step 5: template placeholder filling, verifier spawning, verdict parsing (CLEAR/WARNINGS/BLOCKING), report saving to scope/reports/. |
| T11: SKILL.md routing + state | done | Architect SKILL.md updated: routing (scope as Route 0), quick_start (scope check at step 2), workflows_index, templates_index (8 new entries), artifact_locations (5 scope entries). State template updated: 4 new scope-LN stages, consumer entry for scope-decompose.md. |

## Files Created

| File | Purpose |
|------|---------|
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | Core decomposition workflow — 8 steps from intake to gate review |
| `plugins/architect/skills/architect/templates/system-map.md` | System-map template — human (.md) + agent (.agent.md) formats |

## Files Modified

| File | What Changed |
|------|-------------|
| `plugins/architect/skills/architect/references/scope-decomposition.md` | Added: `<slug_validation>`, `<path_structure>`, `<tag_distinction>` sections. Fixed: required XML section validation list (QA M3 — 3 sections expanded to 7 decomp + 6 impl with conditional notes). |
| `plugins/architect/skills/architect/templates/index.md` | Added `Next decision ID` row to Decomposition Config table |
| `plugins/architect/skills/architect/SKILL.md` | Added: scope routing (Route 0), quick_start scope check, INDEX.md detection in intake, workflows_index entry, 8 templates_index entries, 5 artifact_locations entries |
| `plugins/mk-flow/skills/state/templates/state.md` | Added: 4 scope-LN stages to canonical stages, scope-decompose.md to consumers list, scope stages to Stage enum line |

## Bundled QA Fixes from Sprint 1

| Fix | Where Applied |
|-----|--------------|
| Depth 3+ path convention | `<path_structure>` in scope-decomposition.md + Step 3 in scope-decompose.md |
| Slug validation rules | `<slug_validation>` in scope-decomposition.md + Step 1 in scope-decompose.md |
| Decision ID tracking (next_decision_id) | templates/index.md Decomposition Config + Step 3/7 in scope-decompose.md |
| `<interface>` vs `<interfaces>` distinction | `<tag_distinction>` in scope-decomposition.md + Step 5 validation in scope-decompose.md |

## Refactor Requests Addressed

| From | What | Resolution |
|------|------|-----------|
| Sprint 1 | Depth 3+ path structure undefined | Documented recursive components/ nesting in `<path_structure>` |
| Sprint 1 | Module slug validation rules | Added `<slug_validation>` with regex, length, character constraints |
| Sprint 1 | `<interface>` vs `<interfaces>` distinction undocumented | Added `<tag_distinction>` explaining both tags + validation rules |

## Remaining Refactor Requests (Deferred)

| From | What | Status |
|------|------|--------|
| Sprint 1 | Contract overhead formula inaccuracy (50 vs 65-70 lines/file) | deferred — TBD |
| Sprint 1 | Feature flow INDEX.md File Inventory hardcodes project-brief.md | pending — Sprint 3 |
| Sprint 1 | Quality gates don't cover F4, F8, F9, F10 | deferred — TBD |

## Decision Gate

Sprint 2 achieves: the scope-decompose workflow can orchestrate a full decomposition level — intake validation, target selection, tier planning, brief assembly, parallel agent spawning, consistency verification, quality gates, INDEX.md update, and gate review with user approval.

Ready for QA review: `/architect review`.
