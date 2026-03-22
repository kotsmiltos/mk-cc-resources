#!/usr/bin/env bash
# check-skills-sync.sh — Detect drift between plugins/*/skills/ sources and skills/ mirrors.
#
# Exits 0 if all mirrors are in sync with their sources.
# Exits 1 if any drift is detected or a mirror is missing.
#
# Excludes: __pycache__ directories and *.pyc files (build artifacts).
# Excluded plugins: mk-flow, alert-sounds (hook-bearing, not mirrored).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PLUGINS_DIR="${REPO_ROOT}/plugins"
SKILLS_DIR="${REPO_ROOT}/skills"

# One-way mirror mapping: mirror_name -> source path relative to plugins/
declare -A SKILL_MAP
SKILL_MAP["architect"]="architect/skills/architect"
SKILL_MAP["ladder-build"]="ladder-build/skills/ladder-build"
SKILL_MAP["miltiaze"]="miltiaze/skills/miltiaze"
SKILL_MAP["note"]="project-note-tracker/skills/note"
SKILL_MAP["project-structure"]="project-structure/skills/project-structure"
SKILL_MAP["repo-audit"]="repo-audit/skills/repo-audit"
SKILL_MAP["safe-commit"]="safe-commit/skills/safe-commit"
SKILL_MAP["schema-scout"]="schema-scout/skills/schema-scout"

# Plugins intentionally excluded from mirroring (hook-bearing, installed separately).
EXCLUDED_PLUGINS=("mk-flow" "alert-sounds")

DRIFT_FOUND=0

# ---------------------------------------------------------------------------
# Helper: check whether a plugin name is in the excluded list
# ---------------------------------------------------------------------------
is_excluded() {
  local target="$1"
  for excluded in "${EXCLUDED_PLUGINS[@]}"; do
    [[ "$target" == "$excluded" ]] && return 0
  done
  return 1
}

# ---------------------------------------------------------------------------
# Phase 1: Diff each declared mapping
# ---------------------------------------------------------------------------
echo "Checking declared skill mirrors..."

for mirror_name in "${!SKILL_MAP[@]}"; do
  source_rel="${SKILL_MAP[$mirror_name]}"
  source_path="${PLUGINS_DIR}/${source_rel}"
  mirror_path="${SKILLS_DIR}/${mirror_name}"

  # Verify source exists
  if [[ ! -d "$source_path" ]]; then
    echo "  ERROR: source missing — ${source_path}"
    DRIFT_FOUND=1
    continue
  fi

  # Verify mirror exists
  if [[ ! -d "$mirror_path" ]]; then
    echo "  MISSING MIRROR: skills/${mirror_name}  (source: plugins/${source_rel})"
    DRIFT_FOUND=1
    continue
  fi

  # Diff source vs mirror, excluding __pycache__ and *.pyc.
  # --brief gives only "Files X and Y differ" lines; silence means in sync.
  diff_output=$(diff -rq \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    "$source_path" "$mirror_path" 2>&1) || true

  if [[ -n "$diff_output" ]]; then
    echo "  DRIFT: skills/${mirror_name}"
    while IFS= read -r line; do
      echo "    ${line}"
    done <<< "$diff_output"
    DRIFT_FOUND=1
  else
    echo "  OK: skills/${mirror_name}"
  fi
done

# ---------------------------------------------------------------------------
# Phase 2: Scan plugins/ for skill directories not covered by the mapping
# ---------------------------------------------------------------------------
echo ""
echo "Scanning for unmapped plugins with skills/..."

for plugin_dir in "${PLUGINS_DIR}"/*/; do
  plugin_name="$(basename "$plugin_dir")"

  # Skip hook-bearing exclusions
  is_excluded "$plugin_name" && continue

  plugin_skills_dir="${plugin_dir}skills"
  [[ ! -d "$plugin_skills_dir" ]] && continue

  # For each skill subdirectory inside this plugin's skills/ dir
  for skill_dir in "${plugin_skills_dir}"/*/; do
    [[ ! -d "$skill_dir" ]] && continue
    skill_name="$(basename "$skill_dir")"

    # Check whether this skill_name appears as a value target in SKILL_MAP
    # (We check by resolving each mapped source and comparing paths)
    found_in_map=0
    for mirror_name in "${!SKILL_MAP[@]}"; do
      resolved_source="${PLUGINS_DIR}/${SKILL_MAP[$mirror_name]}"
      if [[ "$resolved_source" == "$skill_dir"* ]] || [[ "${skill_dir%/}" == "$resolved_source" ]]; then
        found_in_map=1
        break
      fi
    done

    if [[ "$found_in_map" -eq 0 ]]; then
      echo "  UNMAPPED: plugins/${plugin_name}/skills/${skill_name} — no mirror entry in SKILL_MAP"
      DRIFT_FOUND=1
    fi
  done
done

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------
echo ""
if [[ "$DRIFT_FOUND" -eq 0 ]]; then
  echo "All skill mirrors are in sync."
  exit 0
else
  echo "Drift detected. Run scripts/sync-skills.sh to fix, or update SKILL_MAP if a new plugin was added."
  exit 1
fi
