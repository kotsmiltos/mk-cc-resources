<process>

Logs a question immediately with no background research. Auto-detects the handler and adds the row with an empty Internal Review and "Pending" status.

<step_1_parse_and_detect>
The input after "quick" is the question. Handler detection works the same as research-question:

Explicit handler override: If the first word after "quick" (case-insensitive) matches a known handler directory in `project-notes/`, treat it as the handler and the rest as the question.

Auto-detection (default): If no handler match:
1. List handler directories in `project-notes/` (just read the directory)
2. Read each handler's `research.md` briefly to understand their focus areas
3. Pick the best match based on the question's topic

Normalize handler name to lowercase.
</step_1_parse_and_detect>

<step_2_add>
```bash
TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
if [ ! -f "$TRACKER_PY" ]; then
  TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
  if [ -z "$TRACKER_PY" ]; then
    echo "Error: tracker.py not found" >&2
    exit 1
  fi
fi
uvx --with openpyxl python3 "$TRACKER_PY" add project-notes "<handler>" "<question>" "" "Pending"
```

The Internal Review is empty — this is intentional. The user can run `/note review <row>` later to gather context.
</step_2_add>

<step_3_confirm>
Tell the user: "Added to **<handler>** as Pending (no research). Use `/note review <row>` to gather context later."
</step_3_confirm>

</process>

<success_criteria>
Quick-add is complete when:
- [ ] Handler was detected
- [ ] Row was appended to tracker.xlsx with empty Internal Review
- [ ] Status is "Pending"
- [ ] User was informed of the row number
</success_criteria>
