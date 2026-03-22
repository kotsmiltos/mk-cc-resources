#!/usr/bin/env bash
# drift-check.sh — Verify plan statuses against filesystem evidence.
# Handles two plan formats:
#   - BUILD-PLAN.md (artifacts/builds/*/BUILD-PLAN.md): milestone-based
#   - PLAN.md       (artifacts/designs/*/PLAN.md): sprint-based
#
# Exit 0 = no drift, Exit 1 = drift found, Exit 2 = no plans found.
#
# Usage:
#   drift-check.sh                          # auto-discover both plan types
#   drift-check.sh path/to/BUILD-PLAN.md    # check a specific plan
#   drift-check.sh path/to/PLAN.md          # check a specific plan
#   drift-check.sh --fix                    # auto-discover + correct STATE.md
#   drift-check.sh --fix path/to/PLAN.md    # check specific plan + correct STATE.md

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

# ---------------------------------------------------------------------------
# BUILD-PLAN.md support
# ---------------------------------------------------------------------------

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
    line="${line%$'\r'}"  # Strip CRLF for Windows compatibility
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
  basename=$(basename -- "$expanded_path")
  found=$(find . -name "$basename" -print -quit 2>/dev/null) || true
  if [ -n "$found" ]; then
    return 0
  fi

  return 1
}

# --- Process a single BUILD-PLAN.md ---
# Prints results to stdout, returns drift count via PLAN_DRIFT_COUNT global.
PLAN_DRIFT_COUNT=0
PLAN_TOTAL_COUNT=0

process_build_plan() {
  local plan_file="$1"
  local plan_name
  plan_name=$(basename "$(dirname "$plan_file")")

  local drift_count=0
  local total_milestones=0
  local results=""

  while IFS='|' read -r tag num name status deliverable_text; do
    [ "$tag" != "MILESTONE" ] && continue
    ((total_milestones++)) || true

    # Parse deliverable lines (separated by ;;)
    IFS=';;' read -ra deliverable_items <<< "$deliverable_text"

    # Extract all file paths from all deliverable descriptions
    local all_paths=""
    for item in "${deliverable_items[@]}"; do
      [ -z "$item" ] && continue
      local paths
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

    local total_paths=0
    local found_paths=0
    local missing_list=""
    local found_list=""
    # For pending milestones: track "specific" paths (with directory components)
    # separately from bare filenames. Bare filenames like SKILL.md or config.yaml
    # are too ambiguous — they exist for other milestones, not necessarily this one.
    local specific_found=0
    local specific_total=0

    if [ -n "$all_paths" ]; then
      while IFS= read -r p; do
        [ -z "$p" ] && continue
        local is_specific=false
        # A path is "specific" if it contains a / (has directory component)
        [[ "$p" == */* ]] && is_specific=true

        local rc=0
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
    local verdict=""
    local verdict_color=""

    if [ "$status" = "pending" ]; then
      if [ "$total_paths" -eq 0 ]; then
        verdict="CONFIRMED PENDING (no deliverable paths to check)"
        verdict_color="$YELLOW"
      elif [ "$specific_total" -gt 0 ]; then
        if [ "$specific_found" -eq 0 ]; then
          verdict="CONFIRMED PENDING (0/${specific_total} specific deliverables found)"
          verdict_color="$GREEN"
        else
          local pct=$(( specific_found * 100 / specific_total ))
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
        local pct=$(( found_paths * 100 / total_paths ))
        if [ "$pct" -ge "$THRESHOLD_DRIFT" ]; then
          verdict="CONFIRMED (${found_paths}/${total_paths} deliverables found)"
          verdict_color="$GREEN"
        else
          verdict="DRIFT — partial revert? (${found_paths}/${total_paths} deliverables found)"
          verdict_color="$RED"
          ((drift_count++)) || true
        fi
      fi
    elif [ -z "$status" ]; then
      # Evidence-based inference — new format without **Status:** field
      # Check for milestone report in artifacts/builds/{plan_name}/milestones/
      local milestone_report=""
      for mr in "artifacts/builds/${plan_name}/milestones/milestone-${num}"*.md; do
        [ -f "$mr" ] && milestone_report="$mr" && break
      done

      if [ -n "$milestone_report" ]; then
        # Milestone report exists → infer completed, verify deliverables
        status="completed"
        if [ "$total_paths" -eq 0 ]; then
          verdict="CONFIRMED (evidence: $(basename "$milestone_report"))"
          verdict_color="$GREEN"
        elif [ "$found_paths" -eq 0 ]; then
          verdict="DRIFT — milestone report exists but deliverables missing (0/${total_paths})"
          verdict_color="$RED"
          ((drift_count++)) || true
        else
          local pct=$(( found_paths * 100 / total_paths ))
          if [ "$pct" -ge "$THRESHOLD_DRIFT" ]; then
            verdict="CONFIRMED (evidence: $(basename "$milestone_report"), ${found_paths}/${total_paths} deliverables)"
            verdict_color="$GREEN"
          else
            verdict="DRIFT — milestone report exists but deliverables partial (${found_paths}/${total_paths})"
            verdict_color="$RED"
            ((drift_count++)) || true
          fi
        fi
      else
        # No milestone report → infer pending, verify deliverables
        status="pending"
        if [ "$total_paths" -eq 0 ]; then
          verdict="CONFIRMED PENDING (no deliverable paths to check)"
          verdict_color="$YELLOW"
        elif [ "$specific_total" -gt 0 ]; then
          if [ "$specific_found" -eq 0 ]; then
            verdict="CONFIRMED PENDING (0/${specific_total} specific deliverables found)"
            verdict_color="$GREEN"
          else
            local pct=$(( specific_found * 100 / specific_total ))
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
          verdict="CONFIRMED PENDING (only bare filenames matched — needs manual check)"
          verdict_color="$YELLOW"
        fi
      fi
    else
      verdict="UNKNOWN STATUS: ${status}"
      verdict_color="$YELLOW"
    fi

    # Format result line
    local label="M${num}: ${name}"
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

  done < <(parse_milestones "$plan_file")

  echo ""
  echo -e "${BOLD}DRIFT-CHECK (build): ${plan_name}${RESET}"
  echo "═══════════════════════════════════════════════════════════════════════"
  echo -e "$results"
  echo "═══════════════════════════════════════════════════════════════════════"

  if [ "$drift_count" -eq 0 ]; then
    echo -e "${GREEN}Result: NO DRIFT — all ${total_milestones} milestones match reality${RESET}"
  else
    echo -e "${RED}Result: DRIFT DETECTED — ${drift_count} milestone(s) need correction${RESET}"
  fi

  PLAN_DRIFT_COUNT=$drift_count
  PLAN_TOTAL_COUNT=$total_milestones
}

# ---------------------------------------------------------------------------
# PLAN.md (design plan) support
# ---------------------------------------------------------------------------

# --- Discover all artifacts/designs/*/PLAN.md files ---
discover_design_plans() {
  for f in artifacts/designs/*/PLAN.md; do
    [ -f "$f" ] && echo "$f"
  done
}

# --- Parse Sprint Tracking table from PLAN.md ---
# Emits lines: SPRINT|<num>|<status>|<tasks>|<completed>
# Handles two table formats:
#   OLD (6+ cols): | Sprint | Status | Tasks | Completed | QA Result | Key Changes |
#   NEW (5 cols):  | Sprint | Tasks | Completed | QA Result | Key Changes |
# Format detected from header row column count: 5 = new, 6+ = old.
parse_design_sprints() {
  local file="$1"
  local in_tracking=false
  local past_header=false
  local format="unknown"  # "old" or "new", set from header row

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"  # Strip CRLF for Windows compatibility
    # Detect "## Sprint Tracking" heading (any level 2 heading containing Sprint Tracking)
    if [[ "$line" =~ ^##[[:space:]]+Sprint[[:space:]]+Tracking ]]; then
      in_tracking=true
      past_header=false
      format="unknown"
      continue
    fi

    # Stop at next level-2 heading
    if [ "$in_tracking" = true ] && [[ "$line" =~ ^##[[:space:]] ]]; then
      break
    fi

    if [ "$in_tracking" = false ]; then
      continue
    fi

    # Detect header row and determine format from column count
    if [[ "$line" =~ \|[[:space:]]*Sprint[[:space:]]*\| ]]; then
      local header_row="${line#|}"
      header_row="${header_row%|}"
      IFS='|' read -ra header_fields <<< "$header_row"
      local col_count=${#header_fields[@]}

      if [ "$col_count" -ge 6 ]; then
        format="old"
      else
        format="new"
      fi

      past_header=true
      continue
    fi

    # Skip the separator row (contains only |, -, and spaces)
    if [[ "$line" =~ ^\|[-|[:space:]]+\|$ ]]; then
      continue
    fi

    # Skip blank lines and non-table lines
    if [[ ! "$line" =~ ^\| ]]; then
      continue
    fi

    # Only parse data rows after we've seen the header
    if [ "$past_header" = false ]; then
      continue
    fi

    # Parse table row based on detected format
    local row="${line#|}"     # strip leading |
    row="${row%|}"            # strip trailing |

    local col_sprint="" col_status="" col_tasks="" col_completed=""

    if [ "$format" = "old" ]; then
      # Old: Sprint | Status | Tasks | Completed | ...
      IFS='|' read -r col_sprint col_status col_tasks col_completed _rest <<< "$row"
    else
      # New: Sprint | Tasks | Completed | ...  (no Status column)
      IFS='|' read -r col_sprint col_tasks col_completed _rest <<< "$row"
      col_status=""
    fi

    # Trim whitespace from each field
    col_sprint="${col_sprint#"${col_sprint%%[! ]*}"}"
    col_sprint="${col_sprint%"${col_sprint##*[! ]}"}"
    col_status="${col_status#"${col_status%%[! ]*}"}"
    col_status="${col_status%"${col_status##*[! ]}"}"
    col_tasks="${col_tasks#"${col_tasks%%[! ]*}"}"
    col_tasks="${col_tasks%"${col_tasks##*[! ]}"}"
    col_completed="${col_completed#"${col_completed%%[! ]*}"}"
    col_completed="${col_completed%"${col_completed##*[! ]}"}"

    # Validate: sprint must be a number
    if [[ ! "$col_sprint" =~ ^[0-9]+$ ]]; then
      continue
    fi

    echo "SPRINT|${col_sprint}|${col_status}|${col_tasks}|${col_completed}"

  done < "$file"
}

# --- Verify a design plan's sprints against filesystem ---
# For DONE sprints: verify sprint dir + COMPLETION.md exist.
# For PLANNED sprints with a task count: verify task-*.md files exist.
verify_design_plan() {
  local plan_file="$1"
  local plan_dir
  plan_dir=$(dirname "$plan_file")
  local plan_name
  plan_name=$(basename "$plan_dir")

  local drift_count=0
  local total_sprints=0
  local results=""

  while IFS='|' read -r tag num status tasks completed; do
    [ "$tag" != "SPRINT" ] && continue
    ((total_sprints++)) || true

    local sprint_dir="${plan_dir}/sprints/sprint-${num}"
    local completion_file="${sprint_dir}/COMPLETION.md"
    local verdict=""
    local verdict_color=""

    if [ "$status" = "DONE" ]; then
      # DONE sprints must have: sprint dir AND COMPLETION.md
      if [ -d "$sprint_dir" ] && [ -f "$completion_file" ]; then
        verdict="CONFIRMED (sprint dir + COMPLETION.md exist)"
        verdict_color="$GREEN"
      elif [ -d "$sprint_dir" ]; then
        verdict="DRIFT — COMPLETION.md missing in ${sprint_dir}"
        verdict_color="$RED"
        ((drift_count++)) || true
      else
        verdict="DRIFT — sprint directory missing: ${sprint_dir}"
        verdict_color="$RED"
        ((drift_count++)) || true
      fi

    elif [ "$status" = "PLANNED" ]; then
      # PLANNED sprints: if a task count is specified (numeric), verify task files exist
      if [[ "$tasks" =~ ^[0-9]+$ ]] && [ "$tasks" -gt 0 ]; then
        if [ -d "$sprint_dir" ]; then
          # Count task-*.md files in the sprint directory
          local task_files=()
          for tf in "${sprint_dir}"/task-*.md; do
            [ -f "$tf" ] && task_files+=("$tf")
          done
          local found_count="${#task_files[@]}"

          if [ "$found_count" -ge "$tasks" ]; then
            verdict="CONFIRMED PLANNED (${found_count}/${tasks} task files present)"
            verdict_color="$GREEN"
          elif [ "$found_count" -gt 0 ]; then
            verdict="PARTIAL PLANNED (${found_count}/${tasks} task files present)"
            verdict_color="$YELLOW"
          else
            verdict="CONFIRMED PLANNED (sprint dir exists, no task files yet)"
            verdict_color="$GREEN"
          fi
        else
          # No sprint dir yet for a planned sprint — this is fine (not started)
          verdict="CONFIRMED PLANNED (sprint not yet started)"
          verdict_color="$GREEN"
        fi
      else
        # No task count specified (— or non-numeric) — just acknowledge planned
        verdict="CONFIRMED PLANNED (no task count to verify)"
        verdict_color="$GREEN"
      fi

    elif [ -z "$status" ]; then
      # Evidence-based inference — new format plans without Status column
      if [ -f "$completion_file" ]; then
        if [ -d "$sprint_dir" ]; then
          verdict="CONFIRMED DONE (evidence: COMPLETION.md)"
          verdict_color="$GREEN"
        else
          verdict="DRIFT — COMPLETION.md without sprint dir (anomaly)"
          verdict_color="$RED"
          ((drift_count++)) || true
        fi
      elif [ -d "$sprint_dir" ]; then
        # Sprint dir exists but no COMPLETION.md
        local task_files=()
        for tf in "${sprint_dir}"/task-*.md; do
          [ -f "$tf" ] && task_files+=("$tf")
        done
        local found_count="${#task_files[@]}"

        if [[ "$tasks" =~ ^[0-9]+$ ]] && [ "$found_count" -gt 0 ]; then
          verdict="CONFIRMED PLANNED (${found_count}/${tasks} task files present)"
          verdict_color="$GREEN"
        elif [ "$found_count" -gt 0 ]; then
          verdict="CONFIRMED PLANNED (${found_count} task files present)"
          verdict_color="$GREEN"
        else
          verdict="CONFIRMED PLANNED (sprint dir exists, no task files yet)"
          verdict_color="$GREEN"
        fi
      else
        # No sprint dir, no completion file
        verdict="CONFIRMED PLANNED (sprint not yet started)"
        verdict_color="$GREEN"
      fi

    else
      verdict="UNKNOWN STATUS: ${status}"
      verdict_color="$YELLOW"
    fi

    # For display: show inferred status when status column is absent
    local display_status="$status"
    if [ -z "$status" ]; then
      if [[ "$verdict" == *"DONE"* ]]; then
        display_status="(done)"
      else
        display_status="(plan)"
      fi
    fi

    local label="Sprint ${num}"
    results="${results}$(printf "  %-40s | %-9s | ${verdict_color}%s${RESET}" "$label" "$display_status" "$verdict")\n"

  done < <(parse_design_sprints "$plan_file")

  echo ""
  echo -e "${BOLD}DRIFT-CHECK (design): ${plan_name}${RESET}"
  echo "═══════════════════════════════════════════════════════════════════════"
  echo -e "$results"
  echo "═══════════════════════════════════════════════════════════════════════"

  if [ "$drift_count" -eq 0 ]; then
    echo -e "${GREEN}Result: NO DRIFT — all ${total_sprints} sprints match reality${RESET}"
  else
    echo -e "${RED}Result: DRIFT DETECTED — ${drift_count} sprint(s) need correction${RESET}"
  fi

  PLAN_DRIFT_COUNT=$drift_count
  PLAN_TOTAL_COUNT=$total_sprints
}

# ---------------------------------------------------------------------------
# --fix flag: correct STATE.md Pipeline Position from evidence
# ---------------------------------------------------------------------------

fix_state() {
  local STATE_FILE="context/STATE.md"

  if [ ! -f "$STATE_FILE" ]; then
    echo ""
    echo -e "${YELLOW}WARNING: --fix requested but context/STATE.md not found. Nothing to fix.${RESET}"
    return
  fi

  # Read current Pipeline Position values
  local current_stage current_sprint current_plan
  current_stage=$(grep -m1 '^stage:' "$STATE_FILE" 2>/dev/null | sed 's/^stage:[[:space:]]*//' | tr -d '\r') || true
  current_sprint=$(grep -m1 '^current_sprint:' "$STATE_FILE" 2>/dev/null | sed 's/^current_sprint:[[:space:]]*//' | tr -d '\r') || true
  current_plan=$(grep -m1 '^plan:' "$STATE_FILE" 2>/dev/null | sed 's/^plan:[[:space:]]*//' | tr -d '\r') || true

  local correct_stage="" correct_sprint=""

  # Determine correct stage from evidence based on the plan referenced in STATE.md
  if [[ "$current_plan" == *BUILD-PLAN.md ]]; then
    # BUILD-PLAN.md fix not yet supported — milestone-based correction is more complex
    echo ""
    echo -e "${YELLOW}--fix: BUILD-PLAN.md plans not yet supported for correction. No changes made.${RESET}"
    return
  elif [[ "$current_plan" == *PLAN.md ]] && [ -f "$current_plan" ]; then
    local plan_dir
    plan_dir=$(dirname "$current_plan")
    local highest_done=0

    # Find highest sprint with evidence of completion
    while IFS='|' read -r tag num status tasks completed; do
      [ "$tag" != "SPRINT" ] && continue
      local sprint_dir="${plan_dir}/sprints/sprint-${num}"
      local completion_file="${sprint_dir}/COMPLETION.md"

      if [ "$status" = "DONE" ] || { [ -z "$status" ] && [ -f "$completion_file" ]; }; then
        if [ "$num" -gt "$highest_done" ]; then
          highest_done=$num
        fi
      fi
    done < <(parse_design_sprints "$current_plan")

    if [ "$highest_done" -gt 0 ]; then
      local next_sprint=$((highest_done + 1))
      local next_dir="${plan_dir}/sprints/sprint-${next_sprint}"

      if [ -d "$next_dir" ]; then
        # Next sprint directory exists — stage is that sprint
        correct_stage="sprint-${next_sprint}"
        correct_sprint="$next_sprint"
      else
        # No next sprint — highest is complete
        correct_stage="sprint-${highest_done}-complete"
        correct_sprint="$highest_done"
      fi
    else
      # No completed sprints found — stage is sprint-1
      correct_stage="sprint-1"
      correct_sprint="1"
    fi
  fi

  if [ -z "$correct_stage" ]; then
    echo ""
    echo -e "${YELLOW}--fix: Could not determine correct stage from evidence. No changes made.${RESET}"
    return
  fi

  if [ "$correct_stage" = "$current_stage" ] && [ "$correct_sprint" = "$current_sprint" ]; then
    echo ""
    echo -e "${GREEN}--fix: Pipeline Position already matches evidence. No changes needed.${RESET}"
    return
  fi

  # 1. Create backup (Decision D8: mandatory)
  cp "$STATE_FILE" "${STATE_FILE}.bak"
  echo ""
  echo -e "${BOLD}Backup created: ${STATE_FILE}.bak${RESET}"

  # 2. Update Pipeline Position via temp file + mv for atomic write
  local tmp_file="${STATE_FILE}.tmp"
  rm -f "$tmp_file"
  local in_pipeline=false

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"  # Strip CRLF for Windows compatibility
    if [[ "$line" =~ ^##[[:space:]]+Pipeline[[:space:]]+Position ]]; then
      in_pipeline=true
      echo "$line" >> "$tmp_file"
      continue
    fi

    # Next ## heading ends Pipeline Position section
    if [ "$in_pipeline" = true ] && [[ "$line" =~ ^##[[:space:]] ]]; then
      in_pipeline=false
    fi

    if [ "$in_pipeline" = true ]; then
      if [[ "$line" =~ ^stage: ]]; then
        echo "stage: ${correct_stage}" >> "$tmp_file"
      elif [[ "$line" =~ ^current_sprint: ]]; then
        echo "current_sprint: ${correct_sprint}" >> "$tmp_file"
      else
        # Preserve plan:, requirements:, audit:, and other fields unchanged
        echo "$line" >> "$tmp_file"
      fi
    else
      echo "$line" >> "$tmp_file"
    fi
  done < "$STATE_FILE"

  mv "$tmp_file" "$STATE_FILE"

  # 3. Report changes
  echo -e "${GREEN}FIXED: Pipeline Position updated${RESET}"
  echo "  stage: ${current_stage} → ${correct_stage}"
  echo "  current_sprint: ${current_sprint} → ${correct_sprint}"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

# --- Argument parsing ---
FIX_MODE=false
TARGET=""

for arg in "$@"; do
  if [ "$arg" = "--fix" ]; then
    FIX_MODE=true
  else
    TARGET="$arg"
  fi
done

# Detect if a specific file was passed — route to the right handler.
if [ -n "$TARGET" ]; then
  if [ ! -f "$TARGET" ]; then
    echo "ERROR: File not found: $TARGET" >&2
    exit 2
  fi

  case "$(basename "$TARGET")" in
    BUILD-PLAN.md)
      process_build_plan "$TARGET"
      if [ "$FIX_MODE" = true ]; then
        fix_state
      fi
      [ "$PLAN_DRIFT_COUNT" -eq 0 ] && exit 0 || exit 1
      ;;
    PLAN.md)
      verify_design_plan "$TARGET"
      if [ "$FIX_MODE" = true ]; then
        fix_state
      fi
      [ "$PLAN_DRIFT_COUNT" -eq 0 ] && exit 0 || exit 1
      ;;
    *)
      echo "ERROR: Unrecognized plan file: $TARGET" >&2
      echo "Expected: BUILD-PLAN.md or PLAN.md" >&2
      exit 2
      ;;
  esac
fi

# --- Auto-discovery mode: find both plan types ---
build_plans=()
for f in artifacts/builds/*/BUILD-PLAN.md; do
  [ -f "$f" ] && build_plans+=("$f")
done

design_plans=()
for f in artifacts/designs/*/PLAN.md; do
  [ -f "$f" ] && design_plans+=("$f")
done

if [ "${#build_plans[@]}" -eq 0 ] && [ "${#design_plans[@]}" -eq 0 ]; then
  echo "ERROR: No plans found." >&2
  echo "  Searched: artifacts/builds/*/BUILD-PLAN.md" >&2
  echo "            artifacts/designs/*/PLAN.md" >&2
  echo "Usage: drift-check.sh [path/to/BUILD-PLAN.md|PLAN.md]" >&2
  exit 2
fi

# Track totals across all plans
total_drift=0
total_plans=0

# Process build plans first
for plan_file in "${build_plans[@]}"; do
  PLAN_DRIFT_COUNT=0
  PLAN_TOTAL_COUNT=0
  process_build_plan "$plan_file"
  ((total_drift += PLAN_DRIFT_COUNT)) || true
  ((total_plans++)) || true
done

# Process design plans after build plans
for plan_file in "${design_plans[@]}"; do
  PLAN_DRIFT_COUNT=0
  PLAN_TOTAL_COUNT=0
  verify_design_plan "$plan_file"
  ((total_drift += PLAN_DRIFT_COUNT)) || true
  ((total_plans++)) || true
done

# --- Final summary when multiple plans were processed ---
if [ "$total_plans" -gt 1 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════"
  if [ "$total_drift" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}OVERALL: NO DRIFT across ${total_plans} plan(s)${RESET}"
  else
    echo -e "${RED}${BOLD}OVERALL: DRIFT in ${total_drift} item(s) across ${total_plans} plan(s)${RESET}"
  fi
  echo ""
fi

# --- Apply --fix if requested ---
if [ "$FIX_MODE" = true ]; then
  fix_state
fi

[ "$total_drift" -eq 0 ] && exit 0 || exit 1
