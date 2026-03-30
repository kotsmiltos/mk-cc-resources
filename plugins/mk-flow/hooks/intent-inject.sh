#!/usr/bin/env bash
# mk-flow intent classification hook
# Reads context files and outputs classification instructions for the main Claude.
# Runs as a UserPromptSubmit command hook — stdin receives JSON, stdout is injected into conversation.

# Read hook input from stdin (JSON with .prompt field)
HOOK_INPUT=$(cat)

# Extract .prompt using whatever JSON tool is available (jq, python3, python)
extract_prompt() {
  if command -v jq >/dev/null 2>&1; then
    echo "$1" | jq -r '.prompt // empty'
  elif command -v python3 >/dev/null 2>&1; then
    echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))"
  elif command -v python >/dev/null 2>&1; then
    echo "$1" | python -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))"
  else
    # No JSON parser available — cannot extract prompt
    echo ""
  fi
}

USER_PROMPT=$(extract_prompt "$HOOK_INPUT" 2>/dev/null)
PROMPT_LENGTH=${#USER_PROMPT}

# Skip classification for very short messages (<2 chars) or slash commands
if [ "$PROMPT_LENGTH" -lt 2 ]; then
  exit 0
fi
case "$USER_PROMPT" in
  /*) exit 0 ;;
esac

# Collect context from project files
CONTEXT=""

INTENTS_FILE=".claude/mk-flow/intents.yaml"
if [ -f "$INTENTS_FILE" ]; then
  CONTEXT="${CONTEXT}
<intents_config>
$(cat "$INTENTS_FILE")
</intents_config>"
fi

STATE_FILE="context/STATE.md"
if [ -f "$STATE_FILE" ]; then
  CONTEXT="${CONTEXT}
<project_state>
$(cat "$STATE_FILE")
</project_state>"
fi

VOCAB_FILE="context/vocabulary.yaml"
if [ -f "$VOCAB_FILE" ]; then
  CONTEXT="${CONTEXT}
<vocabulary>
$(cat "$VOCAB_FILE")
</vocabulary>"
fi

XREF_FILE="context/cross-references.yaml"
if [ -f "$XREF_FILE" ]; then
  CONTEXT="${CONTEXT}
<cross_references>
$(cat "$XREF_FILE")
</cross_references>"
fi

# Rules: merge plugin defaults with project-specific rules
# Plugin defaults always apply; project rules can override or add to them
PLUGIN_RULES="${CLAUDE_PLUGIN_ROOT}/defaults/rules.yaml"
PROJECT_RULES="context/rules.yaml"
RULES_CONTENT=""
if [ -f "$PLUGIN_RULES" ]; then
  RULES_CONTENT="$(cat "$PLUGIN_RULES")"
fi
if [ -f "$PROJECT_RULES" ]; then
  if [ -n "$RULES_CONTENT" ]; then
    RULES_CONTENT="${RULES_CONTENT}

# --- Project-specific rules (override/extend defaults) ---
$(cat "$PROJECT_RULES")"
  else
    RULES_CONTENT="$(cat "$PROJECT_RULES")"
  fi
fi
if [ -n "$RULES_CONTENT" ]; then
  CONTEXT="${CONTEXT}
<rules>
${RULES_CONTENT}
</rules>"
fi

# Session flag infrastructure (shared by nudge and resume injection)
PROJECT_HASH=$(echo "$PWD" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "default")
FLAG_DIR="${TMPDIR:-/tmp}/mk-flow-nudge"
mkdir -p "$FLAG_DIR" 2>/dev/null

# Resume context injection — first message only
CONTINUE_HERE_FILE="context/.continue-here.md"
if [ -f "$CONTINUE_HERE_FILE" ]; then
  RESUME_FLAG_FILE="${FLAG_DIR}/${PROJECT_HASH}-resume"
  if [ ! -f "$RESUME_FLAG_FILE" ]; then
    # Staleness check: is .continue-here.md newer than STATE.md?
    STALE_RESUME=""
    if [ -f "$STATE_FILE" ] && [ "$STATE_FILE" -nt "$CONTINUE_HERE_FILE" ]; then
      STALE_RESUME=" (note: this resume context may be stale — STATE.md was updated more recently)"
    fi
    RESUME_SIZE=$(wc -c < "$CONTINUE_HERE_FILE" 2>/dev/null || echo "0")
    MAX_RESUME_SIZE=51200  # 50KB cap
    if [ "$RESUME_SIZE" -gt "$MAX_RESUME_SIZE" ]; then
      RESUME_CONTENT="[Resume context truncated — file exceeds 50KB (${RESUME_SIZE} bytes). Read context/.continue-here.md manually for full context.]"
    else
      RESUME_CONTENT=$(cat "$CONTINUE_HERE_FILE" | sed 's|</|<\\\/|g')
    fi
    CONTEXT="${CONTEXT}
<resume_context${STALE_RESUME}>
${RESUME_CONTENT}
</resume_context>"
    echo "$(date +%s)" > "$RESUME_FLAG_FILE" 2>/dev/null
  fi
fi

# If no context files exist, nothing to inject
if [ -z "$CONTEXT" ]; then
  exit 0
fi

# --- Visual status line ---
# Compact summary so the user can see the hook fired and what was loaded.
STATUS_PARTS=""
LOADED_COUNT=0
if [ -f "$INTENTS_FILE" ]; then
  INTENT_COUNT=$(grep -c "^  [a-z]" "$INTENTS_FILE" 2>/dev/null || echo "0")
  STATUS_PARTS="${STATUS_PARTS} intents:${INTENT_COUNT}"
  LOADED_COUNT=$((LOADED_COUNT + 1))
fi
if [ -f "$STATE_FILE" ]; then
  # Extract pipeline stage from STATE.md (portable — no grep -P)
  STAGE=$(grep '**Stage:**' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*\*\*Stage:\*\*[[:space:]]*//' | tr -d '[:space:]')
  if [ -n "$STAGE" ]; then
    STATUS_PARTS="${STATUS_PARTS} stage:${STAGE}"
  fi
  LOADED_COUNT=$((LOADED_COUNT + 1))
fi
RULES_COUNT=0
if [ -f "$PLUGIN_RULES" ]; then
  RULES_COUNT=$(grep -c "^  [a-z]" "$PLUGIN_RULES" 2>/dev/null || echo "0")
fi
if [ -f "$PROJECT_RULES" ]; then
  PROJECT_RULES_COUNT=$(grep -c "^  [a-z]" "$PROJECT_RULES" 2>/dev/null || echo "0")
  RULES_COUNT=$((RULES_COUNT + PROJECT_RULES_COUNT))
fi
if [ "$RULES_COUNT" -gt 0 ]; then
  STATUS_PARTS="${STATUS_PARTS} rules:${RULES_COUNT}"
  LOADED_COUNT=$((LOADED_COUNT + 1))
fi
if [ -f "$VOCAB_FILE" ]; then LOADED_COUNT=$((LOADED_COUNT + 1)); fi
if [ -f "$XREF_FILE" ]; then LOADED_COUNT=$((LOADED_COUNT + 1)); fi

# First-message session detection — proactive state summary
SESSION_FLAG_FILE="${FLAG_DIR}/${PROJECT_HASH}-session"
FIRST_MESSAGE=""
if [ ! -f "$SESSION_FLAG_FILE" ]; then
  echo "$(date +%s)" > "$SESSION_FLAG_FILE" 2>/dev/null
  FIRST_MESSAGE="yes"
fi

# Stale defaults detection — nudge user once per session if context files are behind
STALE_NUDGE=""
if [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -f "$PROJECT_RULES" ]; then
  # FIX 5: Read plugin.json first (authoritative), path regex as fallback.
  # plugin.json is the canonical version source; the path pattern is unreliable
  # when plugins are installed via symlinks or non-standard cache layouts.
  PLUGIN_JSON="${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"
  INSTALLED_VERSION=""
  if [ -f "$PLUGIN_JSON" ]; then
    INSTALLED_VERSION=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PLUGIN_JSON" 2>/dev/null | head -1)
  fi
  if [ -z "$INSTALLED_VERSION" ]; then
    # Fallback: extract version from cache directory path
    # Path format: .../cache/marketplace/mk-flow/<version>/
    INSTALLED_VERSION=$(echo "$CLAUDE_PLUGIN_ROOT" | sed -n 's/.*mk-flow\/\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\).*/\1/p')
  fi

  # Extract defaults_version from project rules.yaml (portable — no grep -P)
  PROJECT_VERSION=$(sed -n 's/.*defaults_version:[[:space:]]*"\([^"]*\)".*/\1/p' "$PROJECT_RULES" 2>/dev/null | head -1)

  if [ -n "$INSTALLED_VERSION" ] && [ -n "$PROJECT_VERSION" ] && [ "$INSTALLED_VERSION" != "$PROJECT_VERSION" ]; then
    # Check flag file to avoid repeating the nudge every message
    FLAG_FILE="${FLAG_DIR}/${PROJECT_HASH}-${INSTALLED_VERSION}"
    if [ ! -f "$FLAG_FILE" ]; then
      echo "$(date +%s)" > "$FLAG_FILE" 2>/dev/null
      STALE_NUDGE="[mk-flow] Defaults updated (${PROJECT_VERSION} -> ${INSTALLED_VERSION}). Run /mk-flow-update to sync your project context files."
    fi
  fi
fi

# FIX 3: Capture expanded plugin paths into shell variables before the heredoc
# so they expand in the shell rather than being passed as literal text to Claude.
INTAKE_SKILL_PATH="${CLAUDE_PLUGIN_ROOT}/skills/intake"
DRIFT_CHECK_SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/state/scripts/drift-check.sh"

# FIX 4: User-scoped intent library uses ~ (tilde), not $HOME, so no absolute
# path leaks into the injected instruction text.
INTENT_LIBRARY_PATH="~/.claude/mk-flow/intent-library.yaml"

# Output status line + classification instructions with embedded context
cat <<INSTRUCTION
[mk-flow] Context loaded (${LOADED_COUNT} files):${STATUS_PARTS}
INSTRUCTION

# First-message-of-session: inject proactive state summary directive
if [ -n "$FIRST_MESSAGE" ] && [ -f "$STATE_FILE" ]; then
  cat <<FIRST_MSG

IMPORTANT — This is the FIRST message of a new session. You MUST start your response with a session context block before addressing the user's actual message. Format:

**Session context:** [1 line: what was last done]
**Next action:** \`/exact-slash-command with arguments\` — [1 line: what it does]
[If uncommitted files or paused work exist, add: **Warning:** N uncommitted files / paused at X]

Rules for the next action command:
- If Pipeline Position stage is an active sprint: suggest the exact /ladder-build or /architect command to continue
- If stage is "complete" or "idle": say "Pipeline idle. Start new work with /miltiaze or /architect audit."
- If there are task spec files in artifacts/designs/ waiting to execute: suggest /ladder-build with the specific plan
- The command must be copy-pasteable. Not "run ladder-build" — give "/ladder-build execute sprint 4 of item-expansion"
- If you don't know the exact command, read the PLAN.md or task spec files to figure it out before responding

Then proceed with normal intent classification for whatever the user actually said.
FIRST_MSG
fi

cat <<INSTRUCTION
Before responding, silently classify this message's intent using the context below.
Classify as one of the enabled intents from the intents config.
For context_addition intent, also determine the temporal target (current_work, past_work, future_work, decision_override, or general).
If the vocabulary section is present and the message contains ambiguous terms, use it to disambiguate. If the user clarifies what a term means, add the mapping to context/vocabulary.yaml.
When the intent is action (building, fixing, changing code), check cross_references for related files that should be verified for consistency. If the user points out you missed updating a related file, add that relationship to context/cross-references.yaml.
If a rules section is present, follow every rule unconditionally. These are hard corrections from the user — not suggestions.
Do NOT mention the classification to the user — just use it to guide your response behavior.

Skill routing — based on classification, automatically engage or suggest the right skill:

Multi-issue input (3+ distinct items, dense bug dumps, stream-of-consciousness with mixed concerns):
  Automatically follow the intake process — decompose into items, show assumption table, route each item.
  Read the intake SKILL.md at ${INTAKE_SKILL_PATH}/ for the full process.
  Err on the side of using intake — missing a case where it should fire is worse than over-triggering.
  Single clear requests ("fix the button") skip intake and execute directly.

Exploration or uncertainty (user is unsure what to build, wants to understand tradeoffs, research options):
  Suggest /miltiaze with a ready-to-go prompt, e.g.:
  "This sounds like it needs exploration before building. Want me to run:
  /miltiaze [brief topic description]"

Multi-step build project (user wants to build something with multiple components or milestones):
  Suggest /ladder-build with a ready-to-go prompt, e.g.:
  "This is a multi-step build. Want me to plan it with:
  /ladder-build [brief project description]"
  If a miltiaze exploration report already exists for this topic, mention it.

Bug report or broken behavior (user describes something not working, an error, unexpected results):
  DO NOT jump to fixing. Follow the investigation protocol:
  1. UNDERSTAND: Read the user's description carefully. What exactly is broken? What's the expected vs actual behavior?
  2. REPRODUCE: Read the relevant code/config. Verify you can see the problem. If the user gave an error, trace it.
  3. ROOT CAUSE: Find WHY it's broken, not just WHERE. Check recent changes (git log), cross-references, related files. Is this a symptom of something deeper?
  4. ASSESS: Is this a one-off bug or part of a pattern? Check if similar issues exist elsewhere. Would a local fix leave related problems unfixed?
  5. PROPOSE: Present your findings and proposed fix to the user BEFORE implementing. Include: what's broken, why, what the fix is, and what else it might affect.
  6. FIX: Only after the user confirms (or for trivial/obvious fixes), implement the solution. Fix the root cause, not just the symptom.
  If the issue is complex or systemic, suggest /miltiaze to explore it or /architect audit to assess the area.
  Disambiguation: if the message describes BROKEN BEHAVIOR, classify as bug_report even if it contains action words like "fix". Action intent is for building/changing things that aren't broken.

Simple single tasks: just execute directly. No skill routing needed.

Pipeline-aware routing — if STATE.md has a Pipeline Position section, use it to suggest the next step:
  If stage is "idle":
    Suggest: "No active pipeline. Explore with /miltiaze or assess with /architect audit."
  If stage is "research":
    Suggest: "Miltiaze exploration in progress. Continue with /miltiaze."
  If stage is "requirements-complete" and no PLAN.md exists in artifacts/designs/:
    Suggest: "/architect to plan the implementation from the requirements."
  If stage is "audit-complete" and no PLAN.md exists:
    Suggest: "/architect to plan improvements from the audit findings."
  If stage matches "sprint-" followed by a number but does NOT end with "-complete":
    Suggest: "Sprint [N] in progress. Continue execution with /ladder-build."
  If stage contains "sprint-" and ends with "-complete":
    Suggest: "/architect for QA review and next sprint planning."
  If stage is "reassessment":
    Suggest: "Mid-pipeline reassessment. Run /architect to evaluate."
  If stage is "complete":
    Suggest: "Pipeline cycle complete. Start new work with /miltiaze or /architect audit."
  If a PLAN.md exists with task specs in artifacts/designs/ AND stage does not match any of: idle, research, requirements-complete, audit-complete, sprint-N (active), sprint-N-complete, reassessment, complete:
    Suggest: "/ladder-build to execute the current sprint's task specs."
  If the user says "assess", "audit", or "where do we stand on the code":
    Suggest: "/architect audit to assess the codebase."
  If stage is set but matches none of the above:
    Suggest: "Pipeline Position shows stage '[stage]' — no routing rule for this stage. Check STATE.md."
  These are suggestions, not mandates — the user may have a different intent. Only suggest when it naturally fits.

For status_query intent:
1. Run drift-check FIRST: bash ${DRIFT_CHECK_SCRIPT}
   This tool verifies milestone statuses against actual filesystem evidence. Its output is your source of truth.
2. Do NOT rely on plan documents for status — STATE.md is the single source of truth, validated by drift-check against filesystem evidence.
3. If drift-check reports DRIFT (exit code 1), fix the state files to match reality, then report.
4. Present status from the drift-check output. If drift-check wasn't run, your status report is not trustworthy.

If the user asks to add, modify, or remove an intent (e.g., "add an intent for X", "add X to Y intent signals"):
1. Update .claude/mk-flow/intents.yaml — add/modify the intent following the existing format
2. Update the global library at ${INTENT_LIBRARY_PATH} — same change, plus update used_in with project name
3. Confirm briefly what changed

If a mk_flow_nudge tag is present below, mention it briefly to the user at the END of your response (not the beginning — don't lead with it). Keep it to one line.
INSTRUCTION

echo "$CONTEXT"

# Append stale nudge if detected (appears after context, before Claude processes)
if [ -n "$STALE_NUDGE" ]; then
  echo ""
  echo "<mk_flow_nudge>"
  echo "$STALE_NUDGE"
  echo "</mk_flow_nudge>"
fi
