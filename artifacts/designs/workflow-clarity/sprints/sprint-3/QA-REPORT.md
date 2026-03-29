> **type:** qa-report
> **output_path:** artifacts/designs/workflow-clarity/sprints/sprint-3/QA-REPORT.md
> **date:** 2026-03-29
> **plan:** artifacts/designs/workflow-clarity/PLAN.md
> **overall_result:** PASS (5 notes)
> **key_decisions:** none
> **open_questions:** drift-check Sprint Tracking format detection for 6-column tables without Status column

# QA Report: Sprint 3

## Summary
- Task spec compliance: 42/43 criteria passed (1 PARTIAL — Task 4 "no other files modified" contradicted by its own pseudocode step 4 which requires STATE.md update)
- Requirements alignment: All requirements fully addressed, 0 scope reductions, 3 minor scope additions (all Level 1-2, documented in COMPLETION.md)
- Fitness functions: 20/20 passed (after 3 autonomous fixes — FF-16 consumer list, FF-17 status.md instruction, FF-17 script independence)
- Adversarial tests: 25 scenarios — 7 PASS, 15 FAIL, 3 PASS (edge cases)

## Critical Issues

### C1: drift-check Sprint Tracking format detection — 6-column tables without Status column
**Found by:** Adversarial (Scenario #1)
**What:** `parse_design_sprints()` uses column count to detect table format: `>=6` = old (has Status column), `<6` = new (no Status column). The current PLAN.md has 6 columns (Sprint | Tasks | Completed | QA Result | Key Changes | **Boundary Rationale**) but NO Status column. The parser reads the Tasks value (e.g., "4") as Status, producing `UNKNOWN STATUS: 4` for every sprint.
**Impact:** Affects ALL future architect plans that include the Boundary Rationale column. Does NOT cause false drift detection (drift_count doesn't increment for unknown status), but drift-check output is misleading — every sprint shows UNKNOWN STATUS instead of a meaningful verdict.
**Root cause:** The format detection heuristic assumes 6+ columns = old format. The new template added Boundary Rationale as a 6th column without updating the parser.
**Fix:** Replace column-count detection with header-name detection: check if the header contains `| Status |`. If present, use old format. Otherwise, use new format regardless of column count.
**Note:** This is a pre-existing gap — the parser was built for the old format and the new template (state consolidation sprint) changed the format without updating the parser. Not a Sprint 3 regression, but Sprint 3's Boundary Rationale column triggered it.

### C2: fix_state function uses wrong STATE.md format (pre-existing)
**Found by:** Adversarial (Scenario #2), also flagged in COMPLETION.md
**What:** `fix_state()` at lines 1064-1066 uses `grep -m1 '^stage:'` to extract values from STATE.md, but actual format is `- **Stage:** value`. The read always returns empty, the function bails with "Could not determine correct stage." The write path (lines 1150-1153) would also fail to match.
**Impact:** The `--fix` flag for stage/sprint correction is completely non-functional. The `fix_pipeline_fields()` function (added in Sprint 3) uses the correct format — the inconsistency is within the same file.
**Root cause:** `fix_state` was written before STATE.md format was changed to markdown bullet format. Never updated.
**Fix:** Align `fix_state` read/write patterns to match `fix_pipeline_fields` style: `- **Stage:**` etc.
**Note:** Pre-existing bug, not a Sprint 3 regression. Flagged by the builder in COMPLETION.md Review Items.

## High Priority

### H1: Artifact path validation — paths with trailing descriptions
**Found by:** Adversarial (Scenario #17)
**What:** `validate_pipeline_position()` line 816 builds `artifact_checks` as a space-separated string of `key:path` pairs. If a Pipeline Position field contains a path with trailing description (e.g., `artifacts/designs/workflow-clarity/PLAN.md — 3 sprints`), the full string is checked with `[ -e ]`, which fails and reports false DRIFT.
**Impact:** Any future STATE.md that includes path descriptions will get false DRIFT reports.
**Fix:** Strip trailing content after em-dash before `[ -e ]` check: `a_path="${a_path%% —*}"`.

### H2: artifact_checks iteration breaks on paths with spaces
**Found by:** Adversarial (Scenario #9)
**What:** `artifact_checks` at line 816 is iterated with `for entry in $artifact_checks` which word-splits on spaces. Paths containing spaces would be split across iterations, corrupting both key and path.
**Impact:** Low immediate risk (no current paths have spaces), but would break if a future plan directory contains spaces.
**Fix:** Use a bash array instead of a space-separated string.

## Medium Priority

### M1: FF-16 consumer list was incomplete
**Found by:** Fitness Function Agent
**What:** state.md canonical consumer list was missing `status.md` and `pause.md`. Both interact with Pipeline Position/Current Focus.
**Status:** FIXED AUTONOMOUSLY — added both to the consumer list.

### M2: FF-17 — status.md missing "state description" instruction
**Found by:** Fitness Function Agent
**What:** status.md step_2 writes Current Focus without the "state description, not action" instruction.
**Status:** FIXED AUTONOMOUSLY — added instruction to status.md step_2.

### M3: verify-templates.sh FF-17 was an unconditional PASS
**Found by:** Fitness Function Agent, Adversarial (Scenario #6)
**What:** FF-17 was implemented as `pass 17 "Current Focus writers (see FF-9)"` — always passing without checking. It also missed status.md from the CF_WFS list.
**Status:** FIXED AUTONOMOUSLY — FF-17 now runs an independent check with status.md in the list.

### M4: CLAUDE_PLUGIN_ROOT unset creates broken paths in hook output
**Found by:** Adversarial (Scenario #10)
**What:** If `CLAUDE_PLUGIN_ROOT` is unset, lines 160-161 produce paths like `/skills/intake` — broken absolute root paths that Claude would receive in routing instructions.
**Impact:** Only affects non-standard installations where the variable is missing. Normal plugin installation sets this variable.

### M5: FF-20 fragile text matching
**Found by:** Adversarial (Scenario #18)
**What:** FF-20 greps for the literal string `"PLAN.md exists.*stage does not match"`. If the hook wording is changed (e.g., "stage is not one of"), FF-20 reports FAIL even though the logic is correct.
**Impact:** Low — only affects verify-templates.sh reporting, not actual routing behavior.

### M6: verify-templates.sh BASE path resolution is fragile
**Found by:** Adversarial (Scenario #23)
**What:** Line 13 uses `$(cd "$(dirname "$0")/../../../../.." && pwd)` — 5 levels up. If the script is moved or directory structure changes, this resolves to the wrong root.
**Fix:** Use `git rev-parse --show-toplevel` as the primary method with the relative path as fallback.

## Low Priority

### L1: FF-19 rejects digits in snake_case field names
**Found by:** Adversarial (Scenario #7)
**What:** The regex `[^a-z_]` treats digits as non-snake_case. `sprint_2_count` would fail validation.
**Impact:** No current fields contain digits. Future-proofing issue only.

### L2: Concurrent --fix invocations race condition
**Found by:** Adversarial (Scenario #8)
**What:** Two simultaneous `--fix` runs could overwrite each other's backups and compete on temp files.
**Impact:** Very unlikely in practice — drift-check is typically run interactively.

### L3: Various fragile parsing patterns
**Found by:** Adversarial (Scenarios #13, #14, #15, #25)
- Stage names containing `/` silently dropped from canonical extraction
- Routing section boundary detection fragile to text reordering
- ALL_T paths would break with spaces (currently all space-free)
- FF-10 could false-positive on quoted references to miltiaze section names

## Autonomous Fixes Applied

| Fix | File | What Changed |
|-----|------|-------------|
| M1/FF-16 | `plugins/mk-flow/skills/state/templates/state.md` | Added `status.md` and `pause.md` to canonical consumer list |
| M2/FF-17 | `plugins/mk-flow/skills/state/workflows/status.md` | Added "state description, not action" instruction to step_2 |
| M3/FF-17 | `plugins/mk-flow/skills/state/scripts/verify-templates.sh` | Made FF-17 an independent check; added `status.md` to CF_WFS list |

## Refactor Requests — All Resolved

User chose to fix all 6 during QA review:

| # | What | Status |
|---|------|--------|
| R1 | `parse_design_sprints` format detection: header names, not column count | done |
| R2 | `fix_state` aligned to match `fix_pipeline_fields` markdown format | done |
| R3 | Artifact path validation strips trailing descriptions (`— text`) | done |
| R4 | `artifact_checks` uses array (space-safe) | done |
| R5 | verify-templates.sh BASE uses `git rev-parse --show-toplevel` | done |
| R6 | FF-19 allows digits in snake_case (`[^a-z0-9_]`) | done |

## Recommendations

Pipeline complete. All 12 design decisions implemented. 20/20 fitness functions pass. All refactor requests from all 3 sprint QA reviews resolved. 0 deferred items.
