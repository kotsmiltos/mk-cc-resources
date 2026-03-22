# Task 1: skills/ Sync Enforcement

> **Sprint:** 3
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Create an automated sync verification script that detects drift between `plugins/*/skills/*/` (canonical sources) and `skills/` (mk-cc-all mirror copies). Currently this is a manual process enforced only by the `skill-copies` cross-reference rule — Claude checks when reminded, but no machine check exists. This task creates the enforcement mechanism. Addresses FP-2 and FP-8.

## Context

Read these files first:
- `context/cross-references.yaml` — the `skill-copies` and `skill-aliases` rules
- `CLAUDE.md` — the architecture tree showing which skills/ entries map to which plugins
- `.claude-plugin/marketplace.json` — lists all plugins

The mapping (from CLAUDE.md):
- `skills/architect/` ← `plugins/architect/skills/architect/`
- `skills/ladder-build/` ← `plugins/ladder-build/skills/ladder-build/`
- `skills/miltiaze/` ← `plugins/miltiaze/skills/miltiaze/`
- `skills/note/` ← `plugins/project-note-tracker/skills/note/`
- `skills/project-structure/` ← `plugins/project-structure/skills/project-structure/`
- `skills/repo-audit/` ← `plugins/repo-audit/skills/repo-audit/`
- `skills/safe-commit/` ← `plugins/safe-commit/skills/safe-commit/`
- `skills/schema-scout/` ← `plugins/schema-scout/skills/schema-scout/`

Hook-bearing plugins (mk-flow, alert-sounds) are intentionally excluded.

**Decision 1 from PLAN.md:** Sync script (not symlinks) — Windows requires Developer Mode for symlinks.

## Pseudocode

```
CREATE scripts/check-skills-sync.sh:

#!/usr/bin/env bash
set -euo pipefail

# Check that skills/ mirror copies match their plugin sources.
# Exit 0 if all in sync, exit 1 if any drift detected.
# Run manually or as a pre-commit check.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Define the mapping: skills_dir -> plugin_source_dir
# Hook-bearing plugins (mk-flow, alert-sounds) are excluded by design.
declare -A SKILL_MAP
SKILL_MAP=(
  ["architect"]="plugins/architect/skills/architect"
  ["ladder-build"]="plugins/ladder-build/skills/ladder-build"
  ["miltiaze"]="plugins/miltiaze/skills/miltiaze"
  ["note"]="plugins/project-note-tracker/skills/note"
  ["project-structure"]="plugins/project-structure/skills/project-structure"
  ["repo-audit"]="plugins/repo-audit/skills/repo-audit"
  ["safe-commit"]="plugins/safe-commit/skills/safe-commit"
  ["schema-scout"]="plugins/schema-scout/skills/schema-scout"
)

drift_found=0

for skill in "${!SKILL_MAP[@]}"; do
  source_dir="${REPO_ROOT}/${SKILL_MAP[$skill]}"
  mirror_dir="${REPO_ROOT}/skills/${skill}"

  if [ ! -d "$source_dir" ]; then
    echo "ERROR: source missing: ${SKILL_MAP[$skill]}"
    drift_found=1
    continue
  fi

  if [ ! -d "$mirror_dir" ]; then
    echo "ERROR: mirror missing: skills/${skill}"
    drift_found=1
    continue
  fi

  # Compare recursively, excluding __pycache__ and .pyc files
  diff_output=$(diff -rq "$source_dir" "$mirror_dir" \
    --exclude="__pycache__" --exclude="*.pyc" 2>&1) || true

  if [ -n "$diff_output" ]; then
    echo "DRIFT: skills/${skill}"
    echo "$diff_output" | head -10
    drift_found=1
  fi
done

# Also check: every plugin with skills should have a mirror (unless hook-bearing)
# This catches new plugins added without a mirror entry
for plugin_dir in "${REPO_ROOT}"/plugins/*/; do
  plugin_name=$(basename "$plugin_dir")

  # Skip hook-bearing plugins
  if [ "$plugin_name" = "mk-flow" ] || [ "$plugin_name" = "alert-sounds" ]; then
    continue
  fi

  # Check if plugin has a skills/ subdirectory
  if [ -d "${plugin_dir}skills/" ]; then
    for skill_dir in "${plugin_dir}skills/"*/; do
      skill_name=$(basename "$skill_dir")
      if [ ! -d "${REPO_ROOT}/skills/${skill_name}" ]; then
        echo "MISSING MIRROR: skills/${skill_name} (from plugins/${plugin_name})"
        drift_found=1
      fi
    done
  fi
done

if [ "$drift_found" -eq 0 ]; then
  echo "All skills/ mirrors in sync."
  exit 0
else
  echo ""
  echo "Run 'scripts/sync-skills.sh' to fix drift."
  exit 1
fi

---

CREATE scripts/sync-skills.sh:

#!/usr/bin/env bash
set -euo pipefail

# Sync skills/ mirror copies FROM their plugin sources.
# This is a one-way copy: plugins/ is authoritative, skills/ is the mirror.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

declare -A SKILL_MAP
SKILL_MAP=(
  ["architect"]="plugins/architect/skills/architect"
  ["ladder-build"]="plugins/ladder-build/skills/ladder-build"
  ["miltiaze"]="plugins/miltiaze/skills/miltiaze"
  ["note"]="plugins/project-note-tracker/skills/note"
  ["project-structure"]="plugins/project-structure/skills/project-structure"
  ["repo-audit"]="plugins/repo-audit/skills/repo-audit"
  ["safe-commit"]="plugins/safe-commit/skills/safe-commit"
  ["schema-scout"]="plugins/schema-scout/skills/schema-scout"
)

for skill in "${!SKILL_MAP[@]}"; do
  source_dir="${REPO_ROOT}/${SKILL_MAP[$skill]}"
  mirror_dir="${REPO_ROOT}/skills/${skill}"

  if [ ! -d "$source_dir" ]; then
    echo "SKIP: source missing: ${SKILL_MAP[$skill]}"
    continue
  fi

  # Delete mirror and re-copy (clean sync)
  rm -rf "$mirror_dir"
  cp -r "$source_dir" "$mirror_dir"

  # Remove __pycache__ from the copy
  find "$mirror_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

  echo "SYNCED: skills/${skill}"
done

echo "Done. All mirrors updated from plugin sources."
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `scripts/check-skills-sync.sh` | CREATE | Drift detection script |
| `scripts/sync-skills.sh` | CREATE | One-way sync from plugins/ to skills/ |

## Acceptance Criteria

- [ ] `scripts/check-skills-sync.sh` exists and is executable
- [ ] `scripts/sync-skills.sh` exists and is executable
- [ ] Running `check-skills-sync.sh` on current repo exits 0 (all in sync)
- [ ] Manually modifying one file in `plugins/miltiaze/skills/miltiaze/SKILL.md` and running `check-skills-sync.sh` exits 1 with "DRIFT: skills/miltiaze"
- [ ] Running `sync-skills.sh` after introducing drift restores sync (check-skills-sync exits 0)
- [ ] Hook-bearing plugins (mk-flow, alert-sounds) are excluded from sync checks
- [ ] New plugins without mirror entries are detected ("MISSING MIRROR")
- [ ] `__pycache__` directories are excluded from diff and removed during sync

## Edge Cases

- Plugin with no skills/ subdirectory (e.g., a hypothetical hooks-only plugin): the skill-dir loop inside the plugin check should handle this (the inner `for` loop simply doesn't iterate).
- Empty skills directory in a plugin: `basename` of `*/` glob works correctly.
- Windows path separators: the scripts use forward slashes and `$(cd ... && pwd)` which normalizes on Git Bash.
