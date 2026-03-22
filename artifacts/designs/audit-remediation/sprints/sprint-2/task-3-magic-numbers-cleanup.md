# Task 3: Magic Numbers + Dead Code Cleanup

> **Sprint:** 2
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Extract magic numbers to named constants in tracker.py (IQ-1) and cli.py (IQ-2, PC-5). Remove dead code in scan-secrets.sh (IQ-11) and fix the uninitialized array (RV-8). Delete the __pycache__ artifact (AC-9, PC-11). Addresses 7 audit findings.

## Context

Read these files first:
- `plugins/project-note-tracker/skills/note/scripts/tracker.py` — focus on the constants section (top) and all `column=N` usages
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py` — focus on the 4 `typer.Option(10_000, ...)` calls
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py` — check if DEFAULT_MAX_ROWS already exists or should be defined here
- `plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh` — focus on `filtered_count` and `allow_entries`

**Decision 8 from PLAN.md:** Separate constants for Questions and Bugs sheets even when numeric values coincide.

## Pseudocode

```
FIX 1 — tracker.py column constants (IQ-1, Decision 8):
  At the top of tracker.py, in the constants section near STATUS_COL_INDEX:

  # Questions sheet column layout (keep in sync with init_workbook)
  Q_HANDLER_COL = 1     # Column A: Handler
  Q_QUESTION_COL = 2    # Column B: Question
  Q_REVIEW_COL = 3      # Column C: Internal Review
  Q_ANSWER_COL = 4      # Column D: Handler Answer
  # STATUS_COL_INDEX = 5 already exists (Column E: Status)

  # Bugs sheet column layout (keep in sync with init_workbook)
  BUG_SUMMARY_COL = 1   # Column A: Bug Summary
  BUG_SEVERITY_COL_INDEX = 2  # already exists
  BUG_DESCRIPTION_COL = 3    # Column C: Description
  BUG_INVESTIGATION_COL = 4  # Column D: Investigation
  # BUG_STATUS_COL_INDEX = 5  already exists

  Then replace ALL bare integer column= arguments:
  - column=1 in Questions context → Q_HANDLER_COL
  - column=2 in Questions context → Q_QUESTION_COL
  - column=3 in Questions context → Q_REVIEW_COL
  - column=4 in Questions context → Q_ANSWER_COL
  - column=1 in Bugs context → BUG_SUMMARY_COL
  - column=3 in Bugs context → BUG_DESCRIPTION_COL
  - column=4 in Bugs context → BUG_INVESTIGATION_COL

  Read each function to determine which sheet it operates on before replacing.

FIX 2 — cli.py DEFAULT_MAX_ROWS (IQ-2, PC-5):
  In analyzer.py (where other constants like MAX_UNIQUE_VALUES live), add:
    DEFAULT_MAX_ROWS = 10_000

  In cli.py, import it:
    from schema_scout.analyzer import DEFAULT_MAX_ROWS

  Replace all 4 occurrences of typer.Option(10_000, ...) with:
    typer.Option(DEFAULT_MAX_ROWS, ...)

  Also check readers.py — if 10_000 appears as a default parameter there,
  import and use DEFAULT_MAX_ROWS there too.

FIX 3 — scan-secrets.sh dead variable (IQ-11):
  Remove the line: filtered_count=0

FIX 4 — scan-secrets.sh array initialization (RV-8):
  Before the "while IFS= read" loop in the allowlist block, add:
    allow_entries=()

FIX 5 — Delete __pycache__ artifact (AC-9, PC-11):
  Delete: plugins/project-note-tracker/skills/note/scripts/__pycache__/
  Verify .gitignore has __pycache__ coverage
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/project-note-tracker/skills/note/scripts/tracker.py` | MODIFY | Add 5 new column constants, replace all bare `column=N` with named constants |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py` | MODIFY | Add `DEFAULT_MAX_ROWS = 10_000` |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py` | MODIFY | Import and use `DEFAULT_MAX_ROWS` in 4 Option calls |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/readers.py` | CHECK | Use `DEFAULT_MAX_ROWS` if 10_000 appears as default |
| `plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh` | MODIFY | Remove `filtered_count=0`, add `allow_entries=()` |
| `plugins/project-note-tracker/skills/note/scripts/__pycache__/` | DELETE | Remove build artifact |
| `skills/note/scripts/tracker.py` | CHECK | Mirror sync |
| `skills/schema-scout/tool/schema_scout/analyzer.py` | CHECK | Mirror sync |
| `skills/schema-scout/tool/schema_scout/cli.py` | CHECK | Mirror sync |
| `skills/schema-scout/tool/schema_scout/readers.py` | CHECK | Mirror sync if changed |
| `skills/safe-commit/scripts/scan-secrets.sh` | CHECK | Mirror sync |

## Acceptance Criteria

- [ ] Zero `grep -P "column=[0-9]"` hits in tracker.py (all use named constants)
- [ ] Zero `10_000` or `10000` literals in cli.py Option calls
- [ ] `DEFAULT_MAX_ROWS = 10_000` defined in analyzer.py
- [ ] `DEFAULT_MAX_ROWS` imported in cli.py
- [ ] `filtered_count` does not appear in scan-secrets.sh
- [ ] `allow_entries=()` appears before the `while IFS= read` loop
- [ ] `__pycache__` directory deleted from `plugins/project-note-tracker/skills/note/scripts/`
- [ ] All mirror copies in `skills/` match plugin sources

## Edge Cases

- tracker.py column indices: verify that `column=2` in cmd_update_bug refers to BUG_SEVERITY_COL_INDEX (which already exists) vs BUG_QUESTION_COL (depends on context). Read each function's sheet context carefully.
- cli.py: the `max_rows` parameter in `read_xlsx`, `read_csv`, `read_json` may also have `10_000` as a default in the function signature. Import DEFAULT_MAX_ROWS there too if so.
- scan-secrets.sh: verify the `allow_entries=()` placement is inside the `if [ -f "$ALLOWLIST_FILE" ]` block, before the while loop.
