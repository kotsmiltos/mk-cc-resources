#!/usr/bin/env bash
# sync-skills.sh — One-way sync from plugins/*/skills/ sources to skills/ mirrors.
#
# For each declared mapping: deletes the existing mirror, re-copies from source,
# then removes any __pycache__ directories and *.pyc files from the copy.
#
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

echo "Syncing skill mirrors from plugins/ to skills/..."
echo ""

SYNC_ERRORS=0

for mirror_name in "${!SKILL_MAP[@]}"; do
  source_rel="${SKILL_MAP[$mirror_name]}"
  source_path="${PLUGINS_DIR}/${source_rel}"
  mirror_path="${SKILLS_DIR}/${mirror_name}"

  # Verify source exists before touching the mirror
  if [[ ! -d "$source_path" ]]; then
    echo "  ERROR: source missing — plugins/${source_rel}  (skipping skills/${mirror_name})"
    SYNC_ERRORS=1
    continue
  fi

  echo "  Syncing: plugins/${source_rel} → skills/${mirror_name}"

  # Delete existing mirror so we get a clean copy (avoids stale files from renames/deletions)
  if [[ -d "$mirror_path" ]]; then
    rm -rf "$mirror_path"
  fi

  # Copy source to mirror location
  cp -r "$source_path" "$mirror_path"

  # Remove build artifacts from the copy — these should never be in the mirror
  find "$mirror_path" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
  find "$mirror_path" -type f -name "*.pyc" -delete 2>/dev/null || true

  echo "    Done."
done

echo ""
if [[ "$SYNC_ERRORS" -eq 0 ]]; then
  echo "All skill mirrors synced successfully."
  exit 0
else
  echo "One or more sources were missing. Review errors above."
  exit 1
fi
