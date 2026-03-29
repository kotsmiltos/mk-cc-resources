#!/usr/bin/env bash
# verify-templates.sh — Check 20 fitness functions for pipeline templates and routing.
# Exit 0 = all pass, Exit 1 = any fail.
set -uo pipefail
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'
else GREEN='' RED='' YELLOW='' BOLD='' RESET=''; fi
PASS_COUNT=0; FAIL_COUNT=0; SKIP_COUNT=0; RESULTS=""; NL=$'\n'
pass() { ((PASS_COUNT++)) || true; RESULTS+="$(printf "  ${GREEN}[PASS]${RESET} FF-%-3s %s" "$1" "$2")${NL}"; }
fail() { ((FAIL_COUNT++)) || true; RESULTS+="$(printf "  ${RED}[FAIL]${RESET} FF-%-3s %s" "$1" "$2")${NL}"; }
skip() { ((SKIP_COUNT++)) || true; RESULTS+="$(printf "  ${YELLOW}[SKIP]${RESET} FF-%-3s %s" "$1" "$2")${NL}"; }
grepq() { grep -qE "$@" 2>/dev/null; }
BASE="$(git rev-parse --show-toplevel 2>/dev/null)" || BASE="$(cd "$(dirname "$0")/../../../../.." && pwd)"; cd "$BASE"
T_EXP="plugins/miltiaze/skills/miltiaze/templates/exploration-report.md"
T_REQ="plugins/miltiaze/skills/miltiaze/templates/requirements-report.md"
T_PLN="plugins/architect/skills/architect/templates/plan.md"
T_TSK="plugins/architect/skills/architect/templates/task-spec.md"
T_AUD="plugins/architect/skills/architect/templates/audit-report.md"
T_BLD="plugins/ladder-build/skills/ladder-build/templates/build-plan.md"
T_MIL="plugins/ladder-build/skills/ladder-build/templates/milestone-report.md"
T_STA="plugins/mk-flow/skills/state/templates/state.md"
T_CON="plugins/mk-flow/skills/state/templates/continue-here.md"
ALL_T="$T_EXP $T_REQ $T_PLN $T_TSK $T_AUD $T_BLD $T_MIL $T_STA $T_CON"
HOOK="plugins/mk-flow/hooks/intent-inject.sh"
DRIFT="plugins/mk-flow/skills/state/scripts/drift-check.sh"
STAGES="idle research requirements-complete audit-complete sprint-N sprint-N-complete reassessment complete"
PP_FIELDS="Stage Requirements Audit Plan Current.sprint Build.plan Task.specs Completion.evidence Last.verified"

# FF-1: Every pipeline template has metadata block (type, output_path, key_decisions, open_questions)
ok=true
for f in $ALL_T; do
  if [ ! -f "$f" ]; then ok=false; continue; fi
  for fld in type output_path key_decisions open_questions; do grepq "\*\*${fld}:" "$f" || ok=false; done
done
if $ok; then pass 1 "All templates have metadata block"; else fail 1 "Missing metadata fields in templates"; fi

# FF-2: Adversarial sections in assessment/completion templates
ok=true
grepq "Where This Can Fail" "$T_EXP" || ok=false; grepq "Implementation Risks" "$T_REQ" || ok=false
grepq "Adversarial Assessment" "$T_PLN" || ok=false; grepq "Adversarial Assessment" "$T_AUD" || ok=false
grepq "What Could Be Wrong" "$T_MIL" || ok=false
if $ok; then pass 2 "Adversarial sections present"; else fail 2 "Missing adversarial section"; fi

# FF-3: milestone-report has AC checklist AND verification prose
ok=true
if [ -f "$T_MIL" ]; then grepq "Acceptance Criteria" "$T_MIL" || ok=false; grepq "Verification Notes" "$T_MIL" || ok=false
else ok=false; fi
if $ok; then pass 3 "Milestone report: AC + verification"; else fail 3 "Missing AC or Verification"; fi

# FF-4: No "For: [" pattern in templates
cnt=0; for f in $ALL_T; do
  if [ -f "$f" ]; then n=$(grep -c 'For: \[' "$f" 2>/dev/null) || true; cnt=$((cnt + n)); fi
done
if [ "$cnt" -eq 0 ]; then pass 4 "No 'For: [' in templates"; else fail 4 "'For: [' in ${cnt} locations"; fi

# FF-5: STATE.md has "Planned Work" not "Next Up"
ok=true
if [ -f "$T_STA" ]; then grepq "## Planned Work" "$T_STA" || ok=false; if grepq "## Next Up" "$T_STA"; then ok=false; fi
else ok=false; fi
if $ok; then pass 5 "Uses 'Planned Work' not 'Next Up'"; else fail 5 "STATE.md section naming issue"; fi

# FF-6: Canonical stage list has all 8 stages
ok=true
if [ -f "$T_STA" ]; then for s in $STAGES; do grepq "$s" "$T_STA" || ok=false; done; else ok=false; fi
if $ok; then pass 6 "All 8 canonical stages in state.md"; else fail 6 "Missing stage(s)"; fi

# FF-7: intent-inject.sh has routing for all 8 stages
ok=true
if [ -f "$HOOK" ]; then for s in $STAGES; do grepq "$s" "$HOOK" || ok=false; done; else ok=false; fi
if $ok; then pass 7 "Hook routes all 8 stages"; else fail 7 "Missing stage routing"; fi

# FF-8: Pipeline Position has all 9 fields
ok=true
if [ -f "$T_STA" ]; then
  for fld in $PP_FIELDS; do p=$(echo "$fld" | tr '.' ' '); grepq "$p" "$T_STA" || ok=false; done
else ok=false; fi
if $ok; then pass 8 "Pipeline Position: all 9 fields"; else fail 8 "Missing Pipeline Position field(s)"; fi

# FF-9/FF-17: Current Focus writers have "state description" instruction
CF_WFS="plugins/architect/skills/architect/workflows/plan.md
plugins/architect/skills/architect/workflows/review.md
plugins/architect/skills/architect/workflows/audit.md
plugins/ladder-build/skills/ladder-build/workflows/execute.md
plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md
plugins/miltiaze/skills/miltiaze/workflows/requirements.md
plugins/mk-flow/skills/state/workflows/pause.md
plugins/mk-flow/skills/state/workflows/status.md"
ok=true; miss=""
while IFS= read -r wf; do
  [ -z "$wf" ] && continue
  if [ ! -f "$wf" ]; then miss+=" $(basename "$wf")"; continue; fi
  if ! grep -qiE "state description|what IS, not what to DO" "$wf" 2>/dev/null; then ok=false; miss+=" $(basename "$wf")"; fi
done <<< "$CF_WFS"
if $ok; then pass 9 "Current Focus: state-description instruction"; else fail 9 "Missing in:${miss}"; fi

# FF-10: No miltiaze section names in ladder-build workflows
LB="plugins/ladder-build/skills/ladder-build/workflows"; cnt=0
if [ -d "$LB" ]; then cnt=$(grep -rlE "Where This Can Fail|Research Dimensions" "$LB" 2>/dev/null | wc -l) || true; fi
if [ "$cnt" -eq 0 ]; then pass 10 "No miltiaze refs in ladder-build"; else fail 10 "Miltiaze refs in ${cnt} file(s)"; fi

# FF-11: SKILL.md routing references canonical stage spec
ok=true
for sm in plugins/architect/skills/architect/SKILL.md plugins/ladder-build/skills/ladder-build/SKILL.md; do
  if [ -f "$sm" ]; then grepq "canonical|state\.md" "$sm" || ok=false; else ok=false; fi
done
if $ok; then pass 11 "SKILL.md refs canonical stage spec"; else fail 11 "Missing canonical reference"; fi

# FF-12: sprint-management.md — task count not primary criterion
SM="plugins/architect/skills/architect/references/sprint-management.md"
if [ -f "$SM" ]; then
  if grepq "not task count|not.*arbitrary task count|complexity, not task count" "$SM"; then pass 12 "Task count not primary"
  else fail 12 "Task count may be primary split"; fi
else skip 12 "sprint-management.md not found"; fi

# FF-13: Resume injection has staleness + first-message gate
ok=true
if [ -f "$HOOK" ]; then grepq "stale|staleness|STALE" "$HOOK" || ok=false; grepq "resume.*flag|FLAG.*resume|RESUME_FLAG" "$HOOK" || ok=false
else ok=false; fi
if $ok; then pass 13 "Resume: staleness + first-message gate"; else fail 13 "Missing staleness or flag gate"; fi

# FF-14: drift-check validates both plan types
if [ -f "$DRIFT" ]; then
  ok=true; grepq "BUILD-PLAN|BUILD_PLAN|build.plan" "$DRIFT" || ok=false; grepq "PLAN\.md|design.*plan" "$DRIFT" || ok=false
  if $ok; then pass 14 "Drift-check: both plan types"; else fail 14 "Missing plan type"; fi
else skip 14 "drift-check.sh not found"; fi

# FF-15: Workflows writing Pipeline Position include all 9 fields
PP_WFS="plugins/architect/skills/architect/workflows/plan.md
plugins/architect/skills/architect/workflows/review.md
plugins/architect/skills/architect/workflows/audit.md
plugins/ladder-build/skills/ladder-build/workflows/execute.md
plugins/miltiaze/skills/miltiaze/workflows/requirements.md"
ok=true; miss=""
while IFS= read -r wf; do
  [ -z "$wf" ] && continue
  if [ ! -f "$wf" ]; then miss+=" $(basename "$wf")"; continue; fi
  for fld in $PP_FIELDS; do p=$(echo "$fld" | tr '.' ' ')
    if ! grepq "$p" "$wf"; then ok=false; miss+=" $(basename "$wf"):${fld}"; break; fi
  done
done <<< "$PP_WFS"
if $ok; then pass 15 "Pipeline writers: all 9 fields"; else fail 15 "Missing:${miss}"; fi

# FF-16: Consumer list in state.md
if [ -f "$T_STA" ]; then
  if grepq "consumers:" "$T_STA"; then pass 16 "Consumer list in state.md"; else fail 16 "Missing consumer list"; fi
else skip 16 "state.md not found"; fi

# FF-17: (independent check — same files as FF-9, verifies instruction exists)
ok17=true; miss17=""
while IFS= read -r wf; do
  [ -z "$wf" ] && continue
  if [ ! -f "$wf" ]; then miss17+=" $(basename "$wf")"; continue; fi
  if ! grep -qiE "state description|what IS, not what to DO" "$wf" 2>/dev/null; then ok17=false; miss17+=" $(basename "$wf")"; fi
done <<< "$CF_WFS"
if $ok17; then pass 17 "Current Focus: state-description (independent)"; else fail 17 "Missing in:${miss17}"; fi

# FF-18: Inline templates (execute.md, review.md) have core 4 metadata fields
ok=true
for wf in "plugins/ladder-build/skills/ladder-build/workflows/execute.md" "plugins/architect/skills/architect/workflows/review.md"; do
  if [ -f "$wf" ]; then for fld in type output_path key_decisions open_questions; do grepq "\*\*${fld}:" "$wf" || ok=false; done
  else ok=false; fi
done
if $ok; then pass 18 "Inline templates: core 4 metadata"; else fail 18 "Missing metadata in inline template"; fi

# FF-19: Metadata field names use snake_case
ok=true
for f in $ALL_T; do
  [ -f "$f" ] || continue
  while IFS= read -r line; do
    line="${line%$'\r'}"; field=$(echo "$line" | sed -n 's/^> \*\*\([^:]*\):.*/\1/p'); [ -z "$field" ] && continue
    [ "$field" = "TL;DR" ] && continue  # standardized abbreviation, not a field name
    if echo "$field" | grep -qE '[A-Z]|[^a-z0-9_]'; then ok=false; break 2; fi
  done < "$f"
done
if $ok; then pass 19 "Metadata fields: snake_case"; else fail 19 "Non-snake_case field found"; fi

# FF-20: PLAN.md fallback only fires when no stage rule matched
if [ -f "$HOOK" ]; then
  ok=true; fb=$(grep "PLAN.md exists.*stage does not match" "$HOOK" 2>/dev/null || true)
  if [ -n "$fb" ]; then for s in $STAGES; do echo "$fb" | grepq "$s" || ok=false; done; else ok=false; fi
  if $ok; then pass 20 "Fallback excludes all 8 stages"; else fail 20 "Fallback missing stage exclusion(s)"; fi
else skip 20 "intent-inject.sh not found"; fi

# --- Summary ---
echo ""; echo -e "${BOLD}VERIFY-TEMPLATES: Fitness Function Results${RESET}"
echo "═══════════════════════════════════════════════════════════════════════"
echo -e "$RESULTS"
echo "═══════════════════════════════════════════════════════════════════════"
TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
echo -e "  Total: ${TOTAL}  ${GREEN}Pass: ${PASS_COUNT}${RESET}  ${RED}Fail: ${FAIL_COUNT}${RESET}  ${YELLOW}Skip: ${SKIP_COUNT}${RESET}"
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}Result: ALL FITNESS FUNCTIONS PASSED${RESET}"; exit 0
else
  echo -e "${RED}Result: ${FAIL_COUNT} FITNESS FUNCTION(S) FAILED${RESET}"; exit 1
fi
