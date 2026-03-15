#!/usr/bin/env bash
# mk-flow intent classification hook
# Reads context files and outputs classification instructions for the main Claude.
# Runs as a UserPromptSubmit command hook — stdout is injected into conversation.

PROMPT_LENGTH=${#CLAUDE_USER_PROMPT}

# Skip classification for short messages (<10 chars) or slash commands
if [ "$PROMPT_LENGTH" -lt 10 ] 2>/dev/null; then
  exit 0
fi
case "$CLAUDE_USER_PROMPT" in
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

# If no context files exist, nothing to inject
if [ -z "$CONTEXT" ]; then
  exit 0
fi

# Output classification instructions with embedded context
cat <<'INSTRUCTION'
Before responding, silently classify this message's intent using the context below.
Classify as one of the enabled intents from the intents config.
For context_addition intent, also determine the temporal target (current_work, past_work, future_work, decision_override, or general).
If the vocabulary section is present and the message contains ambiguous terms, use it to disambiguate. If the user clarifies what a term means, add the mapping to context/vocabulary.yaml.
When the intent is action (building, fixing, changing code), check cross_references for related files that should be verified for consistency. If the user points out you missed updating a related file, add that relationship to context/cross-references.yaml.
Do NOT mention the classification to the user — just use it to guide your response behavior.
INSTRUCTION

echo "$CONTEXT"
