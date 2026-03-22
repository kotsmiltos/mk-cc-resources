# Task 6: Add --fix Flag with Backup

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Task 5
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Add a `--fix` flag to drift-check.sh that, when drift is detected, creates a `.STATE.md.bak` backup and corrects STATE.md Pipeline Position to match evidence. Per Decision D1, correction is report-only by default — `--fix` is opt-in. Per Decision D8, backup before correction is mandatory.

## Context

Read these files before starting:
- `plugins/mk-flow/skills/state/scripts/drift-check.sh` — updated by Task 5
- `artifacts/designs/state-consolidation/PLAN.md` — Decisions D1, D8
- `context/STATE.md` — the file being corrected
- `plugins/mk-flow/skills/state/templates/state.md` — STATE.md format reference

The status workflow (`status.md`) already references `--fix`: step 2 says "Update STATE.md Pipeline Position and Current Focus to match drift-check verdicts." The `--fix` flag is how that happens programmatically.

**Scope of correction (Decision D1):** Pipeline Position ONLY. The `--fix` flag corrects:
- `stage:` value (e.g., `sprint-1-complete` → `sprint-2` if evidence shows Sprint 2 task specs exist)
- `current_sprint:` value
- Does NOT touch Current Focus, Done (Recent), or other prose sections — those require human judgment.

## Interface Specification

### Inputs
- `drift-check.sh --fix [optional plan path]`
- drift-check's own verdict output (from Task 5's evidence-based validation)

### Outputs
- `.STATE.md.bak` — backup created before any correction
- Updated `context/STATE.md` — Pipeline Position section corrected
- Stdout: same drift report as normal, plus lines showing what was fixed

### Contracts with Other Tasks
- Task 5 provides the parsing and evidence-based verdicts this task acts on
- Task 7 is independent

## Pseudocode

```
# --- Argument parsing ---
FIX_MODE=false
TARGET=""

FOR arg in "$@":
    IF arg == "--fix":
        FIX_MODE=true
    ELSE:
        TARGET=arg

# --- After normal drift-check runs and produces verdicts ---

IF FIX_MODE AND total_drift > 0:
    STATE_FILE="context/STATE.md"

    IF not exists STATE_FILE:
        echo "WARNING: --fix requested but context/STATE.md not found. Nothing to fix."
        EXIT with normal drift exit code

    # 1. Create backup (Decision D8: mandatory)
    cp STATE_FILE "${STATE_FILE}.bak"
    echo "Backup created: ${STATE_FILE}.bak"

    # 2. Determine correct Pipeline Position from evidence
    #    This uses the verdicts already computed by the main drift-check.
    #
    #    For design plans (PLAN.md):
    #      - Find the highest sprint N where COMPLETION.md exists → sprint-N-complete
    #      - If sprint N+1 has task specs but no COMPLETION.md → stage is sprint-(N+1)
    #      - current_sprint = N (if complete) or N+1 (if in progress)
    #
    #    For build plans (BUILD-PLAN.md):
    #      - Find the highest milestone M with a milestone report → done through M
    #      - Current Focus: milestone M+1

    # 3. Read STATE.md and update Pipeline Position section
    #    Use sed or awk to replace values between "## Pipeline Position" and next "##"
    #
    #    Replace lines matching:
    #      - `stage:` → corrected stage value
    #      - `current_sprint:` → corrected sprint number
    #    Leave other Pipeline Position fields (plan:, requirements:, audit:) unchanged

    # 4. Write corrected STATE.md
    #    Use a temp file + mv for atomic write:
    #      write to STATE.md.tmp
    #      mv STATE.md.tmp STATE.md

    # 5. Report what was fixed
    echo "FIXED: Pipeline Position updated"
    echo "  stage: OLD_VALUE → NEW_VALUE"
    echo "  current_sprint: OLD_VALUE → NEW_VALUE"

# --- Idempotency (Fitness Function FF6) ---
# Running drift-check --fix twice in a row:
#   First run: detects drift, creates backup, fixes STATE.md
#   Second run: no drift detected (evidence matches corrected state), no backup created, no changes
# This is naturally idempotent because the fix aligns STATE.md with evidence,
# and the second run checks evidence → finds alignment → no drift.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/scripts/drift-check.sh` | MODIFY | Add `--fix` flag parsing, backup creation, STATE.md Pipeline Position correction |
| `context/STATE.md` | RUNTIME | Modified only when `--fix` is used and drift is detected (not during development) |

## Acceptance Criteria

- [ ] `drift-check.sh --fix` creates `.STATE.md.bak` before making any changes
- [ ] `drift-check.sh --fix` corrects `stage:` and `current_sprint:` in STATE.md Pipeline Position
- [ ] `drift-check.sh --fix` does NOT modify sections outside Pipeline Position (Current Focus, Done, etc.)
- [ ] `drift-check.sh --fix` leaves `plan:`, `requirements:`, `audit:` fields in Pipeline Position unchanged
- [ ] `drift-check.sh --fix` prints what was changed (old value → new value)
- [ ] `drift-check.sh --fix` is idempotent: running twice produces the same STATE.md (FF6)
- [ ] `drift-check.sh` without `--fix` never writes to any file (report-only, Decision D1)
- [ ] `drift-check.sh --fix` when STATE.md doesn't exist prints a warning and exits without error
- [ ] `drift-check.sh --fix path/to/PLAN.md` works with explicit path (combines with --fix)

## Edge Cases

- STATE.md exists but has no "## Pipeline Position" section: create the section with corrected values, or warn and skip? **Decision needed:** Recommend "warn and skip" — creating sections is scope creep for a correction tool. Flag for architect if this comes up.
- STATE.md Pipeline Position has fields the fix doesn't know about (e.g., `requirements:`): preserve them unchanged. Only touch `stage:` and `current_sprint:`.
- Multiple plans exist (both BUILD-PLAN.md and PLAN.md): `--fix` should correct based on the plan that's referenced in STATE.md Pipeline Position `plan:` field, not all plans.
- Backup file already exists from a previous `--fix` run: overwrite `.STATE.md.bak` (it's the pre-correction state, and we want the latest one).

## Notes

- Per Decision D7, the hook does NOT call `--fix`. Correction happens via `/status` only (user-initiated).
- The atomic write pattern (write to .tmp then mv) prevents partial writes if the process is interrupted.
