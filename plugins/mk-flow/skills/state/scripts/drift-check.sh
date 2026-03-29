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

    # Detect header row and determine format from column names (not count)
    # OLD format has a Status column: | Sprint | Status | Tasks | Completed | ...
    # NEW format omits Status:        | Sprint | Tasks  | Completed | ...
    if [[ "$line" =~ \|[[:space:]]*Sprint[[:space:]]*\| ]]; then
      if [[ "$line" =~ \|[[:space:]]*Status[[:space:]]*\| ]]; then
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
# Pipeline Position field validation
# ---------------------------------------------------------------------------

# Path to canonical template and routing hook (relative to repo root)
STATE_TEMPLATE="plugins/mk-flow/skills/state/templates/state.md"
INTENT_HOOK="plugins/mk-flow/hooks/intent-inject.sh"
STATE_FILE="context/STATE.md"

# --- Parse a Pipeline Position field from STATE.md ---
# Usage: parse_pp_field "Stage" < file
# Returns the value after "- **FieldName:**", with em-dash treated as empty.
parse_pp_field() {
  local field_label="$1"
  local file="$2"
  local value
  # Match "- **Field:**" or "- **Field:** value" — case-insensitive field match
  value=$(grep -m1 "^- \*\*${field_label}:\*\*" "$file" 2>/dev/null | sed "s/^- \*\*${field_label}:\*\*[[:space:]]*//" | tr -d '\r') || true

  # Treat em-dash (—), en-dash (–), plain dash surrounded by spaces, and empty as "not set"
  case "$value" in
    ""|"—"|"–"|"-") echo "" ;;
    *) echo "$value" ;;
  esac
}

# --- Check if STATE.md has a Pipeline Position section ---
has_pipeline_position() {
  local file="$1"
  grep -q "^## Pipeline Position" "$file" 2>/dev/null
}

# --- Validate Pipeline Position fields for the current stage ---
# Prints [PASS]/[DRIFT] lines, sets PP_DRIFT_COUNT.
PP_DRIFT_COUNT=0

validate_pipeline_position() {
  PP_DRIFT_COUNT=0
  local pp_results=""
  local pp_drift=0

  # Skip if no STATE.md
  if [ ! -f "$STATE_FILE" ]; then
    echo ""
    echo -e "${YELLOW}Pipeline Position: context/STATE.md not found — validation skipped${RESET}"
    return
  fi

  # Skip if Pipeline Position section missing
  if ! has_pipeline_position "$STATE_FILE"; then
    echo ""
    echo -e "${YELLOW}Pipeline Position: section not found in STATE.md — validation skipped${RESET}"
    return
  fi

  # Parse all Pipeline Position fields
  local pp_stage pp_requirements pp_audit pp_plan pp_current_sprint
  local pp_build_plan pp_task_specs pp_completion_evidence pp_last_verified
  pp_stage=$(parse_pp_field "Stage" "$STATE_FILE")
  pp_requirements=$(parse_pp_field "Requirements" "$STATE_FILE")
  pp_audit=$(parse_pp_field "Audit" "$STATE_FILE")
  pp_plan=$(parse_pp_field "Plan" "$STATE_FILE")
  pp_current_sprint=$(parse_pp_field "Current sprint" "$STATE_FILE")
  pp_build_plan=$(parse_pp_field "Build plan" "$STATE_FILE")
  pp_task_specs=$(parse_pp_field "Task specs" "$STATE_FILE")
  pp_completion_evidence=$(parse_pp_field "Completion evidence" "$STATE_FILE")
  pp_last_verified=$(parse_pp_field "Last verified" "$STATE_FILE")

  if [ -z "$pp_stage" ]; then
    echo ""
    echo -e "${YELLOW}Pipeline Position: Stage field is empty — validation skipped${RESET}"
    return
  fi

  # Determine required fields for the current stage
  # sprint-N and sprint-N-complete are pattern-matched
  local required_fields=""
  local stage_category="$pp_stage"

  # Normalize sprint-N patterns to generic form for the case statement
  if [[ "$pp_stage" =~ ^sprint-[0-9]+-complete$ ]]; then
    stage_category="sprint-N-complete"
  elif [[ "$pp_stage" =~ ^sprint-[0-9]+$ ]]; then
    stage_category="sprint-N"
  fi

  case "$stage_category" in
    idle)
      required_fields=""
      ;;
    research)
      required_fields=""
      ;;
    requirements-complete)
      required_fields="requirements"
      ;;
    audit-complete)
      required_fields="audit"
      ;;
    sprint-N)
      required_fields="plan current_sprint task_specs"
      ;;
    sprint-N-complete)
      required_fields="plan current_sprint completion_evidence"
      ;;
    reassessment)
      required_fields="plan"
      ;;
    complete)
      required_fields="plan"
      ;;
    *)
      # Unknown stage — report but don't fail
      pp_results="${pp_results}$(printf "  ${YELLOW}[NOTE]${RESET} Pipeline Position: unknown stage '%s' — not in canonical list" "$pp_stage")\n"
      required_fields=""
      ;;
  esac

  # Validate required fields are non-empty
  local field_name field_value
  for field_name in $required_fields; do
    case "$field_name" in
      requirements)       field_value="$pp_requirements" ;;
      audit)              field_value="$pp_audit" ;;
      plan)               field_value="$pp_plan" ;;
      current_sprint)     field_value="$pp_current_sprint" ;;
      build_plan)         field_value="$pp_build_plan" ;;
      task_specs)         field_value="$pp_task_specs" ;;
      completion_evidence) field_value="$pp_completion_evidence" ;;
      last_verified)      field_value="$pp_last_verified" ;;
      *)                  field_value="" ;;
    esac

    if [ -z "$field_value" ]; then
      pp_results="${pp_results}$(printf "  ${RED}[DRIFT]${RESET} Pipeline Position: '%s' is empty but stage '%s' requires it" "$field_name" "$pp_stage")\n"
      ((pp_drift++)) || true
    fi
  done

  # Validate artifact paths exist when referenced (R3/R4: array-based, strips trailing descriptions)
  local -a artifact_fields=("plan" "task_specs" "completion_evidence" "requirements" "audit" "build_plan")
  local -a artifact_values=("$pp_plan" "$pp_task_specs" "$pp_completion_evidence" "$pp_requirements" "$pp_audit" "$pp_build_plan")
  local i
  for ((i=0; i<${#artifact_fields[@]}; i++)); do
    local a_field="${artifact_fields[$i]}"
    local a_path="${artifact_values[$i]}"
    [ -z "$a_path" ] && continue

    # Strip trailing description after em-dash or en-dash (e.g., "path/file.md — 3 sprints")
    a_path="${a_path%% —*}"
    a_path="${a_path%% –*}"

    # Only check if it looks like a path (contains / or .)
    if [[ "$a_path" != */* ]] && [[ "$a_path" != *.* ]]; then
      continue
    fi

    if [ -e "$a_path" ]; then
      pp_results="${pp_results}$(printf "  ${GREEN}[PASS]${RESET} Pipeline Position: '%s' artifact exists: %s" "$a_field" "$a_path")\n"
    else
      pp_results="${pp_results}$(printf "  ${RED}[DRIFT]${RESET} Pipeline Position: '%s' references non-existent path: %s" "$a_field" "$a_path")\n"
      ((pp_drift++)) || true
    fi
  done

  # If no required fields and no artifact issues, report overall pass
  if [ "$pp_drift" -eq 0 ] && [ -z "$pp_results" ]; then
    pp_results="$(printf "  ${GREEN}[PASS]${RESET} Pipeline Position: all fields consistent with stage '%s'" "$pp_stage")\n"
  elif [ "$pp_drift" -eq 0 ]; then
    pp_results="${pp_results}$(printf "  ${GREEN}[PASS]${RESET} Pipeline Position: all required fields present for stage '%s'" "$pp_stage")\n"
  fi

  # Print results
  echo ""
  echo -e "${BOLD}PIPELINE POSITION VALIDATION${RESET}"
  echo "───────────────────────────────────────────────────────────────────────"
  echo -e "$pp_results"
  echo "───────────────────────────────────────────────────────────────────────"

  if [ "$pp_drift" -eq 0 ]; then
    echo -e "${GREEN}Result: Pipeline Position fields are consistent${RESET}"
  else
    echo -e "${RED}Result: Pipeline Position has ${pp_drift} issue(s)${RESET}"
  fi

  PP_DRIFT_COUNT=$pp_drift
}

# ---------------------------------------------------------------------------
# Canonical stage consistency check
# ---------------------------------------------------------------------------

# --- Extract canonical stages from state.md template ---
# Reads the fenced YAML block under "### Canonical Pipeline Stages"
# Expected format: "  - stage_name   # comment"
extract_canonical_stages() {
  local template="$1"
  local in_block=false
  local in_yaml=false

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    # Detect the Canonical Pipeline Stages heading
    if [[ "$line" =~ ^###[[:space:]]+Canonical[[:space:]]+Pipeline[[:space:]]+Stages ]]; then
      in_block=true
      continue
    fi

    # Next heading ends the section
    if [ "$in_block" = true ] && [[ "$line" =~ ^## ]]; then
      break
    fi

    # Detect start of yaml fence
    if [ "$in_block" = true ] && [[ "$line" =~ ^\`\`\`yaml ]]; then
      in_yaml=true
      continue
    fi

    # Detect end of yaml fence
    if [ "$in_yaml" = true ] && [[ "$line" =~ ^\`\`\` ]]; then
      break
    fi

    # Extract stage names from "  - stage_name" lines (under stages: key)
    if [ "$in_yaml" = true ] && [[ "$line" =~ ^[[:space:]]*-[[:space:]]+([a-zA-Z][-a-zA-Z0-9]*) ]]; then
      # Skip lines under "consumers:" — those are file paths, not stages
      local stage_candidate="${BASH_REMATCH[1]}"
      # Consumer paths start with "plugins/" or similar — stage names don't contain "/"
      if [[ "$line" != */* ]]; then
        echo "$stage_candidate"
      fi
    fi

  done < "$template"
}

# --- Extract stages referenced in intent-inject.sh routing rules ---
# Looks for stage names in the pipeline-aware routing section.
# Expected patterns: 'stage is "name"', 'stage matches "sprint-"', 'stage contains "sprint-"'
extract_routing_stages() {
  local hook="$1"
  local in_routing=false
  local stages_found=""

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    # Detect start of pipeline-aware routing section
    if [[ "$line" =~ Pipeline-aware[[:space:]]+routing ]]; then
      in_routing=true
      continue
    fi

    # End of routing section: next major instruction block (starts with non-indented text
    # that doesn't start with "If" or "These" or whitespace)
    if [ "$in_routing" = true ] && [[ "$line" =~ ^[A-Z] ]] && [[ ! "$line" =~ ^If ]] && [[ ! "$line" =~ ^These ]]; then
      break
    fi

    if [ "$in_routing" = false ]; then
      continue
    fi

    # Extract quoted stage names from "If stage is" patterns
    # Match: idle, research, requirements-complete, audit-complete, reassessment, complete
    if [[ "$line" =~ stage[[:space:]]+is[[:space:]]+\"([a-zA-Z][-a-zA-Z0-9]*)\" ]]; then
      stages_found="${stages_found} ${BASH_REMATCH[1]}"
    fi

    # Match sprint-N patterns: "sprint-" followed by a number
    # Line 208: "does NOT end with -complete" → sprint-N (active sprint)
    # Line 210: "ends with -complete" → sprint-N-complete (completed sprint)
    # Must check "NOT" before generic "-complete" to avoid false classification
    if [[ "$line" =~ sprint- ]] && [[ "$line" =~ stage ]]; then
      if [[ "$line" =~ NOT[[:space:]]+end ]] || [[ "$line" =~ followed[[:space:]]+by[[:space:]]+a[[:space:]]+number[[:space:]]+but ]]; then
        stages_found="${stages_found} sprint-N"
      elif [[ "$line" =~ ends[[:space:]]+with[[:space:]]+\"-complete\" ]] || [[ "$line" =~ ends[[:space:]]+with[[:space:]]+-complete ]]; then
        stages_found="${stages_found} sprint-N-complete"
      fi
    fi

  done < "$hook"

  # Deduplicate and print
  echo "$stages_found" | tr ' ' '\n' | sort -u | while IFS= read -r s; do
    [ -z "$s" ] && continue
    echo "$s"
  done
}

# --- Compare canonical stages with routing rules ---
# Prints [PASS]/[DRIFT] lines, sets CANONICAL_DRIFT_COUNT.
CANONICAL_DRIFT_COUNT=0

check_canonical_stages() {
  CANONICAL_DRIFT_COUNT=0
  local cs_results=""
  local cs_drift=0

  # Locate the template file — try repo root first, then relative to script
  local template_path="$STATE_TEMPLATE"
  if [ ! -f "$template_path" ]; then
    # Try relative to script location
    local script_dir
    script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
    template_path="${script_dir}/../templates/state.md"
  fi

  if [ ! -f "$template_path" ]; then
    echo ""
    echo -e "${YELLOW}Canonical stages: state.md template not found — consistency check skipped${RESET}"
    return
  fi

  local hook_path="$INTENT_HOOK"
  if [ ! -f "$hook_path" ]; then
    echo ""
    echo -e "${YELLOW}Canonical stages: intent-inject.sh not found — consistency check skipped${RESET}"
    return
  fi

  # Extract both stage lists
  local canonical_stages routing_stages
  canonical_stages=$(extract_canonical_stages "$template_path")
  routing_stages=$(extract_routing_stages "$hook_path")

  if [ -z "$canonical_stages" ]; then
    echo ""
    echo -e "${YELLOW}Canonical stages: could not extract stages from template — check skipped${RESET}"
    return
  fi

  local canonical_count=0
  local matched_count=0

  # Check each canonical stage has a routing rule
  while IFS= read -r stage; do
    [ -z "$stage" ] && continue
    ((canonical_count++)) || true

    if echo "$routing_stages" | grep -qx "$stage" 2>/dev/null; then
      ((matched_count++)) || true
    else
      cs_results="${cs_results}$(printf "  ${RED}[DRIFT]${RESET} Canonical stage '%s' has no routing rule in intent-inject.sh" "$stage")\n"
      ((cs_drift++)) || true
    fi
  done <<< "$canonical_stages"

  # Check each routing stage is in the canonical list
  while IFS= read -r stage; do
    [ -z "$stage" ] && continue
    if ! echo "$canonical_stages" | grep -qx "$stage" 2>/dev/null; then
      cs_results="${cs_results}$(printf "  ${RED}[DRIFT]${RESET} Routing rule references stage '%s' not in canonical list" "$stage")\n"
      ((cs_drift++)) || true
    fi
  done <<< "$routing_stages"

  # Report results
  if [ "$cs_drift" -eq 0 ]; then
    cs_results="$(printf "  ${GREEN}[PASS]${RESET} Canonical stages: all %d stages have routing rules" "$canonical_count")\n"
  fi

  echo ""
  echo -e "${BOLD}CANONICAL STAGE CONSISTENCY${RESET}"
  echo "───────────────────────────────────────────────────────────────────────"
  echo -e "$cs_results"
  echo "───────────────────────────────────────────────────────────────────────"

  if [ "$cs_drift" -eq 0 ]; then
    echo -e "${GREEN}Result: Canonical stages are consistent across consumers${RESET}"
  else
    echo -e "${RED}Result: ${cs_drift} canonical stage inconsistency(ies) found${RESET}"
  fi

  CANONICAL_DRIFT_COUNT=$cs_drift
}

# ---------------------------------------------------------------------------
# --fix flag: correct STATE.md Pipeline Position from evidence
# ---------------------------------------------------------------------------

fix_state() {
  if [ ! -f "$STATE_FILE" ]; then
    echo ""
    echo -e "${YELLOW}WARNING: --fix requested but context/STATE.md not found. Nothing to fix.${RESET}"
    return
  fi

  # Read current Pipeline Position values (markdown format: "- **Field:** value")
  local current_stage current_sprint current_plan
  current_stage=$(parse_pp_field "Stage" "$STATE_FILE")
  current_sprint=$(parse_pp_field "Current sprint" "$STATE_FILE")
  current_plan=$(parse_pp_field "Plan" "$STATE_FILE")

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
      if [[ "$line" =~ ^-[[:space:]]\*\*Stage:\*\* ]]; then
        echo "- **Stage:** ${correct_stage}" >> "$tmp_file"
      elif [[ "$line" =~ ^-[[:space:]]\*\*Current[[:space:]]sprint:\*\* ]]; then
        echo "- **Current sprint:** ${correct_sprint}" >> "$tmp_file"
      else
        # Preserve other Pipeline Position fields unchanged
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

# --- Fix empty Pipeline Position fields from discovered artifacts ---
fix_pipeline_fields() {
  if [ ! -f "$STATE_FILE" ]; then
    return
  fi

  if ! has_pipeline_position "$STATE_FILE"; then
    return
  fi

  local pp_stage pp_plan pp_task_specs pp_completion_evidence pp_current_sprint
  pp_stage=$(parse_pp_field "Stage" "$STATE_FILE")
  pp_plan=$(parse_pp_field "Plan" "$STATE_FILE")
  pp_task_specs=$(parse_pp_field "Task specs" "$STATE_FILE")
  pp_completion_evidence=$(parse_pp_field "Completion evidence" "$STATE_FILE")
  pp_current_sprint=$(parse_pp_field "Current sprint" "$STATE_FILE")

  [ -z "$pp_stage" ] && return

  local fixes_made=false
  local fix_plan="" fix_task_specs="" fix_completion=""

  # Discover plan if empty
  if [ -z "$pp_plan" ]; then
    # Search for PLAN.md files
    local found_plans=()
    for f in artifacts/designs/*/PLAN.md; do
      [ -f "$f" ] && found_plans+=("$f")
    done
    # Also check BUILD-PLAN.md
    for f in artifacts/builds/*/BUILD-PLAN.md; do
      [ -f "$f" ] && found_plans+=("$f")
    done

    if [ "${#found_plans[@]}" -eq 1 ]; then
      fix_plan="${found_plans[0]}"
    elif [ "${#found_plans[@]}" -gt 1 ]; then
      echo -e "  ${YELLOW}--fix: Multiple plan files found — cannot auto-select plan field${RESET}"
    fi
  fi

  # Use the plan (existing or just-discovered) to derive other fields
  local effective_plan="${pp_plan:-$fix_plan}"

  # Discover task_specs if empty and stage is sprint-N
  if [ -z "$pp_task_specs" ] && [[ "$pp_stage" =~ ^sprint-[0-9]+$ ]]; then
    local sprint_num="${pp_stage#sprint-}"
    if [ -n "$effective_plan" ] && [[ "$effective_plan" == *PLAN.md ]]; then
      local plan_dir
      plan_dir=$(dirname "$effective_plan")
      local candidate="${plan_dir}/sprints/sprint-${sprint_num}/"
      if [ -d "$candidate" ]; then
        fix_task_specs="$candidate"
      fi
    fi
  fi

  # Discover completion_evidence if empty and stage is sprint-N-complete
  if [ -z "$pp_completion_evidence" ] && [[ "$pp_stage" =~ ^sprint-[0-9]+-complete$ ]]; then
    local sprint_num="${pp_stage#sprint-}"
    sprint_num="${sprint_num%-complete}"
    if [ -n "$effective_plan" ] && [[ "$effective_plan" == *PLAN.md ]]; then
      local plan_dir
      plan_dir=$(dirname "$effective_plan")
      local candidate="${plan_dir}/sprints/sprint-${sprint_num}/COMPLETION.md"
      if [ -f "$candidate" ]; then
        fix_completion="$candidate"
      fi
      # Also check for QA-REPORT.md
      candidate="${plan_dir}/sprints/sprint-${sprint_num}/QA-REPORT.md"
      if [ -z "$fix_completion" ] && [ -f "$candidate" ]; then
        fix_completion="$candidate"
      fi
    fi
  fi

  # Apply fixes if any were found
  if [ -z "$fix_plan" ] && [ -z "$fix_task_specs" ] && [ -z "$fix_completion" ]; then
    return
  fi

  # Backup already created by fix_state or create one now
  if [ ! -f "${STATE_FILE}.bak" ]; then
    cp "$STATE_FILE" "${STATE_FILE}.bak"
    echo -e "${BOLD}Backup created: ${STATE_FILE}.bak${RESET}"
  fi

  local tmp_file="${STATE_FILE}.tmp"
  rm -f "$tmp_file"
  local in_pipeline=false

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    if [[ "$line" =~ ^##[[:space:]]+Pipeline[[:space:]]+Position ]]; then
      in_pipeline=true
      echo "$line" >> "$tmp_file"
      continue
    fi

    if [ "$in_pipeline" = true ] && [[ "$line" =~ ^##[[:space:]] ]]; then
      in_pipeline=false
    fi

    if [ "$in_pipeline" = true ]; then
      if [ -n "$fix_plan" ] && [[ "$line" =~ ^\-[[:space:]]\*\*Plan:\*\* ]]; then
        echo "- **Plan:** ${fix_plan}" >> "$tmp_file"
      elif [ -n "$fix_task_specs" ] && [[ "$line" =~ ^\-[[:space:]]\*\*Task[[:space:]]specs:\*\* ]]; then
        echo "- **Task specs:** ${fix_task_specs}" >> "$tmp_file"
      elif [ -n "$fix_completion" ] && [[ "$line" =~ ^\-[[:space:]]\*\*Completion[[:space:]]evidence:\*\* ]]; then
        echo "- **Completion evidence:** ${fix_completion}" >> "$tmp_file"
      else
        echo "$line" >> "$tmp_file"
      fi
    else
      echo "$line" >> "$tmp_file"
    fi
  done < "$STATE_FILE"

  mv "$tmp_file" "$STATE_FILE"

  echo -e "${GREEN}FIXED: Pipeline Position fields populated from evidence${RESET}"
  [ -n "$fix_plan" ] && echo "  Plan: — → ${fix_plan}"
  [ -n "$fix_task_specs" ] && echo "  Task specs: — → ${fix_task_specs}"
  [ -n "$fix_completion" ] && echo "  Completion evidence: — → ${fix_completion}"
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
      ;;
    PLAN.md)
      verify_design_plan "$TARGET"
      ;;
    *)
      echo "ERROR: Unrecognized plan file: $TARGET" >&2
      echo "Expected: BUILD-PLAN.md or PLAN.md" >&2
      exit 2
      ;;
  esac

  # Pipeline Position validation runs after plan checks (even in single-file mode)
  validate_pipeline_position

  if [ "$FIX_MODE" = true ]; then
    fix_state
    fix_pipeline_fields
  fi

  local_drift=$((PLAN_DRIFT_COUNT + PP_DRIFT_COUNT))
  [ "$local_drift" -eq 0 ] && exit 0 || exit 1
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

# --- Pipeline Position validation (auto-discover mode) ---
validate_pipeline_position
((total_drift += PP_DRIFT_COUNT)) || true

# --- Canonical stage consistency check (auto-discover mode only) ---
check_canonical_stages
((total_drift += CANONICAL_DRIFT_COUNT)) || true

# --- Final summary ---
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
if [ "$total_drift" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}OVERALL: NO DRIFT across ${total_plans} plan(s) + pipeline checks${RESET}"
else
  echo -e "${RED}${BOLD}OVERALL: DRIFT in ${total_drift} item(s) across ${total_plans} plan(s) + pipeline checks${RESET}"
fi
echo ""

# --- Apply --fix if requested ---
if [ "$FIX_MODE" = true ]; then
  fix_state
  fix_pipeline_fields
fi

[ "$total_drift" -eq 0 ] && exit 0 || exit 1
