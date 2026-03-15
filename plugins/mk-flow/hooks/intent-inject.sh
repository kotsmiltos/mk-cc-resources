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

# Skip classification for short messages (<10 chars) or slash commands
if [ "$PROMPT_LENGTH" -lt 10 ]; then
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

RULES_FILE="context/rules.yaml"
if [ -f "$RULES_FILE" ]; then
  CONTEXT="${CONTEXT}
<rules>
$(cat "$RULES_FILE")
</rules>"
fi

# If no context files exist, nothing to inject
if [ -z "$CONTEXT" ]; then
  exit 0
fi

# Output classification instructions with embedded context
cat <<INSTRUCTION
Before responding, silently classify this message's intent using the context below.
Classify as one of the enabled intents from the intents config.
For context_addition intent, also determine the temporal target (current_work, past_work, future_work, decision_override, or general).
If the vocabulary section is present and the message contains ambiguous terms, use it to disambiguate. If the user clarifies what a term means, add the mapping to context/vocabulary.yaml.
When the intent is action (building, fixing, changing code), check cross_references for related files that should be verified for consistency. If the user points out you missed updating a related file, add that relationship to context/cross-references.yaml.
If a rules section is present, follow every rule unconditionally. These are hard corrections from the user — not suggestions.
Do NOT mention the classification to the user — just use it to guide your response behavior.

For status_query intent: verify state claims against the actual codebase before reporting. Check whether "pending" milestones' deliverables already exist. Update state/plan if drift is found.

If the user asks to add, modify, or remove an intent (e.g., "add an intent for X", "add X to Y intent signals"):
1. Update .claude/mk-flow/intents.yaml — add/modify the intent following the existing format
2. Update the global library at ${HOME}/.claude/mk-flow/intent-library.yaml — same change, plus update used_in with project name
3. Confirm briefly what changed
INSTRUCTION

echo "$CONTEXT"
