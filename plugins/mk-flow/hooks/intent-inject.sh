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

Skill routing — based on classification, automatically engage or suggest the right skill:

Multi-issue input (3+ distinct items, dense bug dumps, stream-of-consciousness with mixed concerns):
  Automatically follow the intake process — decompose into items, show assumption table, route each item.
  Read the intake SKILL.md at plugins/mk-flow/skills/intake/ for the full process.
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

Simple single tasks: just execute directly. No skill routing needed.

For status_query intent:
1. Verify state claims against the actual codebase before reporting. Check whether "pending" milestones' deliverables already exist.
2. If drift is found (stale status fields, completed work marked pending, unchecked roadmap items), FIX the state files immediately:
   - Update STATE.md to match reality
   - Update ROADMAP.md checkboxes/status markers
   - Update BUILD-PLAN.md milestone statuses
   - Commit the fixes with a clear message (e.g., "fix: update stale state — milestones X,Y were already complete")
3. Tell the user what you fixed: "Found drift: [description]. Updated [files]. Committed."
4. Then report the corrected status.

If the user asks to add, modify, or remove an intent (e.g., "add an intent for X", "add X to Y intent signals"):
1. Update .claude/mk-flow/intents.yaml — add/modify the intent following the existing format
2. Update the global library at ${HOME}/.claude/mk-flow/intent-library.yaml — same change, plus update used_in with project name
3. Confirm briefly what changed
INSTRUCTION

echo "$CONTEXT"
