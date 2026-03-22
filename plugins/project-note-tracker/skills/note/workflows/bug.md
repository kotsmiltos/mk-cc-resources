<process>

Log a reported bug to the Bugs sheet in tracker.xlsx.

<step_1_parse>
The input after "bug" is the bug description.

Explicit severity override: If the first word after "bug" is a severity level (critical/high/medium/low, case-insensitive), treat it as the severity and the rest as the description.

Auto-detection (default): If no severity keyword is found, auto-detect based on the description:
- Critical: data loss, security vulnerability, complete failure, crash, production down
- High: major feature broken, blocking workflow, significant user impact
- Medium: feature partially broken, workaround exists, degraded experience
- Low: cosmetic, minor inconvenience, nice-to-have fix
</step_1_parse>

<step_2_extract_steps>
Look at the bug description and any surrounding conversation context. If the user mentioned steps to reproduce (either in this message or recently in the conversation), extract them as a numbered list. If no steps are apparent, leave steps empty — they can be discovered during investigation.
</step_2_extract_steps>

<step_3_add>
```bash
TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
if [ ! -f "$TRACKER_PY" ]; then
  TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
  if [ -z "$TRACKER_PY" ]; then
    echo "Error: tracker.py not found" >&2
    exit 1
  fi
fi
uvx --with openpyxl python3 "$TRACKER_PY" add-bug project-notes "<summary>" "<severity>" "<steps_to_reproduce>" "" "Open"
```

The Investigation column starts empty. Use `/note investigate <row>` to research later.
</step_3_add>

<step_4_confirm>
Tell the user: "Bug logged as **<severity>** (Row <N> in Bugs sheet). Use `/note investigate <N>` to research reproduction hints."
</step_4_confirm>

</process>

<success_criteria>
Bug logging is complete when:
- [ ] Severity was detected or explicitly provided
- [ ] Steps to reproduce were extracted if available in the conversation
- [ ] Row was appended to the Bugs sheet in tracker.xlsx
- [ ] Status is "Open"
- [ ] User was informed of the row number
</success_criteria>
