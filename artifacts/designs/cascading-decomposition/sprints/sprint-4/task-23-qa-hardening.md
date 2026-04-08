> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-4/task-23-qa-hardening.md
> **sprint:** 4
> **status:** planned
> **depends_on:** T13, T14, T12
> **estimated_size:** M (7 small fixes bundled)
> **plan:** ../../PLAN.md
> **key_decisions:** D6, D10
> **open_questions:** none

# Task 23: Sprint 3 QA Hardening

## Goal
Apply 7 non-blocking improvements identified by Sprint 3 QA. These close edge case gaps, harden defensive checks, and improve user-facing reporting across the scope pipeline. Bundled because each is S-effort and they share no dependencies between them.

## Context
- Sprint 3 QA Report: `artifacts/designs/cascading-decomposition/sprints/sprint-3/QA-REPORT.md`
- Findings H4, H5, H6, M1, M2, M3, M4 — all accepted by user
- Fixes target files modified in Sprint 2-3; no new files needed

## Interface Specification

### Inputs
- QA-REPORT.md findings with specific file locations and recommendations

### Outputs
- 7 fixes applied to existing files
- All acceptance criteria verifiable by reading the modified files

### Contracts with Other Tasks
- T17-T21 (other Sprint 4 tasks) are independent — no ordering dependency
- These fixes harden the scope pipeline for real-world usage (before T21 calibration run)

## Pseudocode

```
FIX H4 — Decision status filter (inclusion-based):
  In workflows/scope-decompose.md, Assembly Step 6 (around line 213):
    Change: "skip decisions where status starts with 'superseded-by-'"
    To: "include only decisions with status: final. Skip all other statuses
         (draft, proposed, superseded-by-*, or any unrecognized value)."
  In ladder-build/workflows/execute.md (around line 188):
    Change: "skip decisions where status starts with 'superseded-by-'"
    To: "include only decisions with status 'final' (skip all other statuses)"

FIX H5 — Feature flow scope_root fallback:
  In ladder-build/workflows/execute.md, step_1 scope detection (around line 23):
    After the direct `artifacts/scope/INDEX.md` check, add:
    "Also check artifacts/scope/features/*/INDEX.md for feature-scoped roots.
     If multiple feature INDEX.md files exist, list them and ask the user which
     feature to execute."
  Document the limitation: "If STATE.md is missing, only top-level and
  one-deep feature scopes are discovered. Deeper nesting requires STATE.md."

FIX H6 — Overflow threshold validation:
  In ladder-build/workflows/execute.md, step_1 after reading INDEX.md config:
    Add: "Validate overflow_threshold: if missing, zero, negative, or non-numeric,
     use default 300 and warn: 'Invalid overflow_threshold in INDEX.md ({value}).
     Using default: 300.'"

FIX M1 — INDEX.md re-run warning in miltiaze:
  In miltiaze/workflows/requirements.md, step 1e (Create INDEX.md):
    Before writing INDEX.md, add:
    "If {scope_root}/INDEX.md already exists:
     Warn the user: 'INDEX.md already exists at {path}. Previous decomposition
     state (module status, level history, decisions) will be overwritten.
     Existing scope/ artifacts remain on disk but may be orphaned.'
     Proceed with overwrite — the user invoked requirements mode explicitly."

FIX M2 — Wave number definition for scope mode:
  In ladder-build/workflows/execute.md, step_5 scope mode section (around line 240):
    After the report path, add:
    "In scope mode, N is a sequential counter starting from 1, incremented for
     each implementation wave executed against this scope. Track the counter in
     INDEX.md Level History or derive from existing report files:
     glob {scope_root}/reports/implementation-wave-*.md, N = count + 1."

FIX M3 — Skipped modules reporting:
  In ladder-build/workflows/execute.md, step_1 scope detection, after finding ready tasks:
    Add: "Report modules NOT included in this wave:
     FOR each module in INDEX.md where status is NOT 'ready' or 'leaf-ready':
       List in the execution plan: '{module} — status: {status} — skipped (needs further decomposition)'
     If any modules were skipped, tell the user:
       '{N} module(s) skipped — run /architect scope level-N to decompose them.'"

FIX M4 — estimated_lines null check at depth cap:
  In workflows/scope-decompose.md, step 2 item 6 (depth cap forced-leaf, around line 107):
    After "check estimated_lines against the overflow threshold (300)":
    Add: "If estimated_lines is missing or null, issue the forced-leaf warning
     without the line count comparison: 'Module {name} forced to leaf at depth cap
     with unknown size estimate. Consider restructuring if implementation produces overflow.'"
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | MODIFY | H4: decision filter inclusion-based, M4: estimated_lines null check |
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | H4: decision filter, H5: feature fallback, H6: threshold validation, M2: wave number, M3: skipped modules |
| `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` | MODIFY | M1: INDEX.md re-run warning |

## Acceptance Criteria
- [ ] H4: scope-decompose.md Assembly Step 6 uses inclusion-based filter: "include only status: final"
- [ ] H4: execute.md brief assembly uses inclusion-based filter: "include only status: final"
- [ ] H4: A decision with `status: draft` would be excluded by both filters
- [ ] H5: execute.md step_1 fallback checks `artifacts/scope/features/*/INDEX.md` when no top-level INDEX.md
- [ ] H5: Multiple feature INDEX.md files results in user prompt listing available features
- [ ] H6: execute.md validates overflow_threshold after reading INDEX.md config
- [ ] H6: overflow_threshold of 0 or -1 triggers warning and uses default 300
- [ ] M1: miltiaze requirements.md checks for existing INDEX.md before creating one
- [ ] M1: Pre-existing INDEX.md triggers a warning message to the user
- [ ] M2: scope mode report path uses sequential counter derived from existing report files
- [ ] M3: Modules not in "ready"/"leaf-ready" state are listed with their status in execution plan
- [ ] M3: If any modules were skipped, user sees a message with count and next action
- [ ] M4: Depth cap forced-leaf with null estimated_lines produces warning without comparison failure

## Edge Cases
- H4: Decision with status "" (empty string) — should be excluded (not "final")
- H5: No feature INDEX.md files exist — fallback reports "no scope work found" same as current
- H6: overflow_threshold is a string like "three hundred" — treated as non-numeric, default to 300
- M1: User re-runs miltiaze requirements in a fresh session — INDEX.md from prior session still on disk
- M2: No existing report files — N = 1 (first wave)
- M3: All modules ready — no skip report, just proceed normally
- M4: estimated_lines is 0 — treat as "no estimate" (0 lines is not a meaningful estimate)
