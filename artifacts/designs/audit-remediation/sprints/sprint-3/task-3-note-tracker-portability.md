# Task 3: Note-Tracker Portability + Cleanup

> **Sprint:** 3
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Fix the note-tracker's hardcoded `find ~/.claude/plugins` path discovery pattern to use `${CLAUDE_PLUGIN_ROOT}` (FP-5). Also fix residual cleanup items from Sprint 2 QA: STATE.md stale version line, `filtered_findings` dead variable, `analyzer.py` function-signature defaults, marketplace.json metadata.version. Addresses FP-5 plus QA recommendations.

## Context

Read these files first:
- `plugins/project-note-tracker/skills/note/SKILL.md` — the main skill file, contains the `find` discovery pattern
- Any one workflow file (e.g., `plugins/project-note-tracker/skills/note/workflows/init.md`) — to see the `find` pattern in context
- `context/STATE.md` — the stale version line
- `plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh` — the `filtered_findings` dead variable
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py` — function signature defaults

The current pattern in every workflow file:
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
```

Replace with:
```bash
TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
if [ ! -f "$TRACKER_PY" ]; then
  echo "Error: tracker.py not found at ${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py" >&2
  exit 1
fi
```

The guard is important — `CLAUDE_PLUGIN_ROOT` must be set and the file must exist. A clear error is better than silent failure.

## Pseudocode

```
FIX 1 — Note-tracker workflow portability (FP-5):
  For each .md file in plugins/project-note-tracker/skills/note/workflows/:
    Find the line containing: find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py"
    Replace the entire TRACKER_PY assignment block with:
      TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
      if [ ! -f "$TRACKER_PY" ]; then
        echo "Error: tracker.py not found at ${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py" >&2
        # Fallback: try the find approach for non-standard installs
        TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
        if [ -z "$TRACKER_PY" ]; then
          echo "Error: tracker.py not found via CLAUDE_PLUGIN_ROOT or find" >&2
          exit 1
        fi
      fi
  Also check plugins/project-note-tracker/skills/note/SKILL.md for the same pattern

FIX 2 — STATE.md stale version line:
  In context/STATE.md, find "Plugin versions after pipeline:" line
  Update: mk-flow 0.6.0 → mk-flow 0.7.0, alert-sounds → 1.1.0, schema-scout → 1.2.0, repo-audit → 1.2.0

FIX 3 — filtered_findings dead variable:
  In plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh:
  Remove the line: filtered_findings=""
  Sync to skills/safe-commit/scripts/scan-secrets.sh

FIX 4 — analyzer.py function signature defaults:
  In plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py:
  Find the two functions that have max_rows: int = 10_000 in their signature
  Replace with: max_rows: int = DEFAULT_MAX_ROWS
  (DEFAULT_MAX_ROWS is already defined in this file from Sprint 2)
  Sync to skills/schema-scout/tool/schema_scout/analyzer.py

FIX 5 — marketplace.json metadata.version:
  In .claude-plugin/marketplace.json, update "version" under "metadata" from "1.3.0" to "1.15.0"
  (Match the mk-cc-all plugin version — they should track together)

MIRROR SYNCS:
  - skills/note/ ← plugins/project-note-tracker/skills/note/ (all workflow files + SKILL.md if changed)
  - skills/safe-commit/ ← plugins/safe-commit/skills/safe-commit/
  - skills/schema-scout/ ← plugins/schema-scout/skills/schema-scout/ (analyzer.py)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/project-note-tracker/skills/note/workflows/*.md` | MODIFY | Replace find pattern with CLAUDE_PLUGIN_ROOT + fallback (13 files) |
| `plugins/project-note-tracker/skills/note/SKILL.md` | CHECK | Replace find pattern if present |
| `context/STATE.md` | MODIFY | Update version numbers |
| `plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh` | MODIFY | Remove filtered_findings="" |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py` | MODIFY | Replace 10_000 defaults with DEFAULT_MAX_ROWS |
| `.claude-plugin/marketplace.json` | MODIFY | metadata.version 1.3.0 → 1.15.0 |
| `skills/note/workflows/*.md` | CHECK | Mirror sync (13 files) |
| `skills/note/SKILL.md` | CHECK | Mirror sync if changed |
| `skills/safe-commit/scripts/scan-secrets.sh` | CHECK | Mirror sync |
| `skills/schema-scout/tool/schema_scout/analyzer.py` | CHECK | Mirror sync |

## Acceptance Criteria

- [ ] Zero `find ~/.claude/plugins` occurrences in note-tracker workflow files
- [ ] All workflow files use `${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py` as primary path
- [ ] All workflow files have a fallback `find` if CLAUDE_PLUGIN_ROOT path doesn't exist
- [ ] STATE.md version line reflects current plugin versions (mk-flow 0.7.0, etc.)
- [ ] `filtered_findings` absent from scan-secrets.sh
- [ ] analyzer.py function signatures use DEFAULT_MAX_ROWS (no bare 10_000)
- [ ] marketplace.json metadata.version is 1.15.0
- [ ] All mirror copies match plugin sources

## Edge Cases

- **CLAUDE_PLUGIN_ROOT unset:** The guard checks `[ ! -f "$TRACKER_PY" ]` — if the variable is empty, the path resolves to `/scripts/tracker.py` which won't exist, triggering the fallback find. This is correct behavior.
- **Workflow files with varying find patterns:** Some may have slightly different grep/head options. Match on the `find ~/.claude/plugins` pattern and replace the entire TRACKER_PY assignment.
- **SKILL.md may reference the find pattern in documentation text (not executable code):** Replace there too for consistency.
