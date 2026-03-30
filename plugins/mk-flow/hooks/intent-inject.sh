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

cat <<INSTRUCTION
End every response with: **Next:** \`/exact-slash-command with arguments\` — [brief description]
The command must be copy-pasteable (e.g., "/ladder-build execute sprint 2 of auth-system").
Derive it from Pipeline Position in STATE.md or task specs in artifacts/designs/.
Skip the next-action line if the response IS a slash command execution (skill handles its own flow).

INSTRUCTION

# First-message-of-session: additional context summary
if [ -n "$FIRST_MESSAGE" ] && [ -f "$STATE_FILE" ]; then
  cat <<FIRST_MSG

FIRST MESSAGE of new session. Start with:
**Session context:** [1 line: what was last done]
**Next:** \`/exact-slash-command\` — [what it does]
[If uncommitted files or paused work: **Warning:** details]
Then proceed with the user's message.
FIRST_MSG
fi

cat <<INSTRUCTION
Silently classify this message using intents_config below. Do NOT mention classification to the user.
Follow every rule in the rules section unconditionally — hard corrections, not suggestions.
On action intent: check cross_references for related files. If user flags a missed update, add it to context/cross-references.yaml.
On bug_report: investigate before fixing — read code, find root cause, propose fix BEFORE implementing. Classify as bug_report even if message says "fix".
On status_query: run drift-check first (bash ${DRIFT_CHECK_SCRIPT}). Its output is source of truth. Fix DRIFT before reporting.
On multi-issue input (3+ items): decompose with assumption table before acting. Read intake SKILL.md at ${INTAKE_SKILL_PATH}/.
On vocabulary ambiguity: use vocabulary section to disambiguate. Add new mappings to context/vocabulary.yaml.
Check Pipeline Position in STATE.md for the **Next:** command.

If the user asks to add/modify/remove an intent:
1. Update .claude/mk-flow/intents.yaml
2. Update ${INTENT_LIBRARY_PATH} (add used_in project)
3. Confirm briefly

If a mk_flow_nudge tag is present below, mention it briefly at END of response (one line).
INSTRUCTION

echo "$CONTEXT"

# Append stale nudge if detected (appears after context, before Claude processes)
if [ -n "$STALE_NUDGE" ]; then
  echo ""
  echo "<mk_flow_nudge>"
  echo "$STALE_NUDGE"
  echo "</mk_flow_nudge>"
fi
