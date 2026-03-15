#!/usr/bin/env bash
# drift-check.sh — Verify BUILD-PLAN.md milestone statuses against filesystem evidence.
# Compares claimed status (completed/pending) with actual deliverable existence.
# Exit 0 = no drift, Exit 1 = drift found, Exit 2 = error.
#
# Usage: drift-check.sh [path/to/BUILD-PLAN.md]
#   If omitted, auto-discovers artifacts/builds/*/BUILD-PLAN.md

set -euo pipefail

# --- Constants ---
THRESHOLD_DRIFT=50       # % of deliverables found before "pending" is drift
THRESHOLD_PARTIAL=1      # % threshold for PARTIAL verdict (between 1 and THRESHOLD_DRIFT)

# --- Colors (disabled if not a terminal) ---
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' BOLD='' RESET=''
fi

# --- Find BUILD-PLAN.md ---
if [ $# -ge 1 ]; then
  PLAN_FILE="$1"
  if [ ! -f "$PLAN_FILE" ]; then
    echo "ERROR: File not found: $PLAN_FILE" >&2
    exit 2
  fi
else
  # Auto-discover
  PLAN_FILES=()
  for f in artifacts/builds/*/BUILD-PLAN.md; do
    [ -f "$f" ] && PLAN_FILES+=("$f")
  done

  if [ "${#PLAN_FILES[@]}" -eq 0 ]; then
    echo "ERROR: No BUILD-PLAN.md found in artifacts/builds/*/" >&2
    echo "Usage: drift-check.sh [path/to/BUILD-PLAN.md]" >&2
    exit 2
  fi

  if [ "${#PLAN_FILES[@]}" -gt 1 ]; then
    echo "Multiple build plans found:" >&2
    printf "  %s\n" "${PLAN_FILES[@]}" >&2
    echo "Specify one: drift-check.sh <path>" >&2
    exit 2
  fi

  PLAN_FILE="${PLAN_FILES[0]}"
fi

PLAN_NAME=$(basename "$(dirname "$PLAN_FILE")")

# --- Parse milestones from BUILD-PLAN.md ---
# Extracts: milestone number, name, status, and "Done when:" deliverable lines

parse_milestones() {
  local file="$1"
  local in_milestone=false
  local in_done_when=false
  local milestone_num=""
  local milestone_name=""
  local milestone_status=""
  local deliverables=""

  while IFS= read -r line || [ -n "$line" ]; do
    # Detect milestone header: ### Milestone N: Name (Size)
    if [[ "$line" =~ ^###[[:space:]]+Milestone[[:space:]]+([0-9]+):[[:space:]]+(.+) ]]; then
      # Emit previous milestone if exists
      if [ -n "$milestone_num" ]; then
        echo "MILESTONE|${milestone_num}|${milestone_name}|${milestone_status}|${deliverables}"
      fi

      milestone_num="${BASH_REMATCH[1]}"
      # Strip size indicator like (M), (S), (L) from name
      milestone_name="${BASH_REMATCH[2]}"
      milestone_name="${milestone_name% (*)}"
      milestone_status=""
      deliverables=""
      in_milestone=true
      in_done_when=false
      continue
    fi

    # Skip if not inside a milestone block
    if [ "$in_milestone" = false ]; then
      continue
    fi

    # Next section header means we've left the milestone
    if [[ "$line" =~ ^##[[:space:]] ]] && [[ ! "$line" =~ ^###[[:space:]]+Milestone ]]; then
      if [ -n "$milestone_num" ]; then
        echo "MILESTONE|${milestone_num}|${milestone_name}|${milestone_status}|${deliverables}"
      fi
      milestone_num=""
      in_milestone=false
      in_done_when=false
      continue
    fi

    # Detect "Done when:" block
    if [[ "$line" =~ ^\*\*Done[[:space:]]+when:\*\* ]]; then
      in_done_when=true
      continue
    fi

    # Detect Status line
    if [[ "$line" =~ ^\*\*Status:\*\*[[:space:]]*(completed|pending) ]]; then
      milestone_status="${BASH_REMATCH[1]}"
      in_done_when=false
      continue
    fi

    # Other bold fields end the "Done when:" block
    if [[ "$line" =~ ^\*\* ]] && [ "$in_done_when" = true ]; then
      in_done_when=false
      continue
    fi

    # Collect deliverable lines (bullet items under "Done when:")
    if [ "$in_done_when" = true ] && [[ "$line" =~ ^-[[:space:]] ]]; then
      if [ -n "$deliverables" ]; then
        deliverables="${deliverables};;${line#- }"
      else
        deliverables="${line#- }"
      fi
    fi

  done < "$file"

  # Emit last milestone
  if [ -n "$milestone_num" ]; then
    echo "MILESTONE|${milestone_num}|${milestone_name}|${milestone_status}|${deliverables}"
  fi
}

# --- Extract file paths from a deliverable description ---
# Looks for patterns like: path/to/file.ext, *.ext references, word.ext
# Filters out prose fragments that look like paths but aren't.
extract_paths() {
  local text="$1"
  local raw_paths=""

  # Match explicit paths with extensions: word/word/file.ext
  local path_matches
  path_matches=$(echo "$text" | grep -oE '[a-zA-Z_.~-]+(/[a-zA-Z_.*-]+)+\.[a-zA-Z]+' 2>/dev/null) || true
  raw_paths="${raw_paths:+${raw_paths}
}${path_matches}"

  # Match directory paths (at least 2 segments, ending with /): skills/state/
  # The trailing / requirement filters prose like "high/medium/low" (no trailing slash)
  local dir_matches
  dir_matches=$(echo "$text" | grep -oE '[a-zA-Z_.-]+(/[a-zA-Z_.-]+)+/' 2>/dev/null) || true
  raw_paths="${raw_paths:+${raw_paths}
}${dir_matches}"

  # Match standalone filenames with known extensions (e.g., plugin.json, STATE.md)
  local file_matches
  file_matches=$(echo "$text" | grep -oE '[a-zA-Z_-]+\.(json|yaml|yml|md|py|sh|js|ts|toml)' 2>/dev/null) || true
  raw_paths="${raw_paths:+${raw_paths}
}${file_matches}"

  # Filter out false positives:
  # - Pure lowercase word/word patterns without extensions (e.g., creates/updates, high/medium/low)
  # - Very short fragments
  # - Common prose patterns
  echo "$raw_paths" | sort -u | while IFS= read -r p; do
    [ -z "$p" ] && continue

    # Skip paths without extensions that are all-lowercase (likely prose)
    if [[ ! "$p" =~ \.[a-zA-Z]+$ ]] && [[ ! "$p" =~ /$ ]] && [[ "$p" =~ ^[a-z/]+$ ]]; then
      continue
    fi

    # Skip very short non-path strings
    if [ ${#p} -lt 3 ]; then
      continue
    fi

    echo "$p"
  done
}

# --- Check if a path exists (handles wildcards, relative paths, ~ paths) ---
check_path() {
  local path="$1"

  # Skip wildcard-only patterns like *.yaml — not checkable as deliverables
  if [[ "$path" == \** ]]; then
    return 2  # skip
  fi

  # Expand ~ to actual home directory
  local expanded_path="$path"
  if [[ "$path" == ~/* ]]; then
    expanded_path="${HOME}/${path#\~/}"
  fi

  # Try exact path first
  if [ -e "$expanded_path" ]; then
    return 0
  fi

  # Try finding it anywhere in the repo (for relative paths)
  local found
  found=$(find . -path "*/${expanded_path}" -print -quit 2>/dev/null) || true
  if [ -n "$found" ]; then
    return 0
  fi

  # Try matching just the filename portion anywhere in the repo
  local basename
  basename=$(basename "$expanded_path")
  found=$(find . -name "$basename" -print -quit 2>/dev/null) || true
  if [ -n "$found" ]; then
    return 0
  fi

  return 1
}

# --- Main ---

drift_count=0
total_milestones=0
results=""

while IFS='|' read -r tag num name status deliverable_text; do
  [ "$tag" != "MILESTONE" ] && continue
  ((total_milestones++)) || true

  # Parse deliverable lines (separated by ;;)
  IFS=';;' read -ra deliverable_items <<< "$deliverable_text"

  # Extract all file paths from all deliverable descriptions
  all_paths=""
  for item in "${deliverable_items[@]}"; do
    [ -z "$item" ] && continue
    paths=$(extract_paths "$item" 2>/dev/null) || true
    if [ -n "$paths" ]; then
      if [ -n "$all_paths" ]; then
        all_paths="${all_paths}"$'\n'"${paths}"
      else
        all_paths="${paths}"
      fi
    fi
  done

  # Deduplicate paths
  if [ -n "$all_paths" ]; then
    all_paths=$(echo "$all_paths" | sort -u)
  fi

  total_paths=0
  found_paths=0
  missing_list=""
  found_list=""
  # For pending milestones: track "specific" paths (with directory components)
  # separately from bare filenames. Bare filenames like SKILL.md or config.yaml
  # are too ambiguous — they exist for other milestones, not necessarily this one.
  specific_found=0
  specific_total=0

  if [ -n "$all_paths" ]; then
    while IFS= read -r p; do
      [ -z "$p" ] && continue
      is_specific=false
      # A path is "specific" if it contains a / (has directory component)
      [[ "$p" == */* ]] && is_specific=true

      rc=0
      check_path "$p" || rc=$?
      if [ "$rc" -eq 0 ]; then
        ((found_paths++)) || true
        found_list="${found_list:+${found_list}, }${p}"
        ((total_paths++)) || true
        if [ "$is_specific" = true ]; then
          ((specific_found++)) || true
          ((specific_total++)) || true
        fi
      elif [ "$rc" -eq 1 ]; then
        missing_list="${missing_list:+${missing_list}, }${p}"
        ((total_paths++)) || true
        if [ "$is_specific" = true ]; then
          ((specific_total++)) || true
        fi
      fi
      # rc == 2 means skipped (wildcard) — don't count toward total
    done <<< "$all_paths"
  fi

  # Determine verdict
  verdict=""
  verdict_color=""

  if [ "$status" = "pending" ]; then
    # For pending milestones: use specific paths (with directory components) for drift detection.
    # Bare filenames (SKILL.md, config.yaml) are too ambiguous — they exist for other milestones.
    # If no specific paths exist, bare filename matches alone can't trigger drift.
    if [ "$total_paths" -eq 0 ]; then
      verdict="CONFIRMED PENDING (no deliverable paths to check)"
      verdict_color="$YELLOW"
    elif [ "$specific_total" -gt 0 ]; then
      # Have specific paths — use them for the verdict
      if [ "$specific_found" -eq 0 ]; then
        verdict="CONFIRMED PENDING (0/${specific_total} specific deliverables found)"
        verdict_color="$GREEN"
      else
        pct=$(( specific_found * 100 / specific_total ))
        if [ "$pct" -ge "$THRESHOLD_DRIFT" ]; then
          verdict="DRIFT — likely complete (${specific_found}/${specific_total} deliverables found)"
          verdict_color="$RED"
          ((drift_count++)) || true
        elif [ "$pct" -ge "$THRESHOLD_PARTIAL" ]; then
          verdict="PARTIAL (${specific_found}/${specific_total} deliverables found — needs manual check)"
          verdict_color="$YELLOW"
        fi
      fi
    else
      # Only bare filenames — not specific enough for drift detection
      verdict="CONFIRMED PENDING (only bare filenames matched — needs manual check)"
      verdict_color="$YELLOW"
    fi
  elif [ "$status" = "completed" ]; then
    if [ "$total_paths" -eq 0 ]; then
      verdict="CONFIRMED (no deliverable paths to check)"
      verdict_color="$GREEN"
    elif [ "$found_paths" -eq 0 ]; then
      verdict="DRIFT — deliverables missing (0/${total_paths} found — may have been reverted)"
      verdict_color="$RED"
      ((drift_count++)) || true
    else
      pct=$(( found_paths * 100 / total_paths ))
      if [ "$pct" -ge "$THRESHOLD_DRIFT" ]; then
        verdict="CONFIRMED (${found_paths}/${total_paths} deliverables found)"
        verdict_color="$GREEN"
      else
        verdict="DRIFT — partial revert? (${found_paths}/${total_paths} deliverables found)"
        verdict_color="$RED"
        ((drift_count++)) || true
      fi
    fi
  else
    verdict="UNKNOWN STATUS: ${status}"
    verdict_color="$YELLOW"
  fi

  # Format result line
  # Pad milestone label to align columns
  label="M${num}: ${name}"
  # Truncate long names
  if [ ${#label} -gt 40 ]; then
    label="${label:0:37}..."
  fi

  results="${results}$(printf "  %-40s | %-9s | ${verdict_color}%s${RESET}" "$label" "$status" "$verdict")\n"

  # Add detail lines for drift cases
  if [[ "$verdict" == DRIFT* ]] || [[ "$verdict" == PARTIAL* ]]; then
    if [ -n "$found_list" ]; then
      results="${results}$(printf "    %-38s   Found: %s" "" "$found_list")\n"
    fi
    if [ -n "$missing_list" ]; then
      results="${results}$(printf "    %-38s   Missing: %s" "" "$missing_list")\n"
    fi
  fi

done < <(parse_milestones "$PLAN_FILE")

# --- Output ---

echo ""
echo -e "${BOLD}DRIFT-CHECK: ${PLAN_NAME}${RESET}"
echo "═══════════════════════════════════════════════════════════════════════"
echo -e "$results"
echo "═══════════════════════════════════════════════════════════════════════"

if [ "$drift_count" -eq 0 ]; then
  echo -e "${GREEN}Result: NO DRIFT — all ${total_milestones} milestones match reality${RESET}"
  echo ""
  exit 0
else
  echo -e "${RED}Result: DRIFT DETECTED — ${drift_count} milestone(s) need correction${RESET}"
  echo ""
  exit 1
fi
