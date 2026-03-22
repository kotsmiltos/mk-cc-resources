<process>

<step_1_parse>
The input format is: `add <handler_name>`
Extract the handler name (everything after "add").
</step_1_parse>

<step_2_create>
```bash
TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
if [ ! -f "$TRACKER_PY" ]; then
  TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
  if [ -z "$TRACKER_PY" ]; then
    echo "Error: tracker.py not found" >&2
    exit 1
  fi
fi
uvx --with openpyxl python3 "$TRACKER_PY" add-handler project-notes "<handler_name>"
```
</step_2_create>

<step_3_update_config>
If `project-notes/config.md` exists, append the new handler to the Handlers list.
</step_3_update_config>

<step_4_remind>
Tell them to edit `project-notes/<handler>/research.md` with instructions for how to research this handler's questions.
</step_4_remind>

</process>

<success_criteria>
Add-handler is complete when:
- [ ] Handler directory created with `research.md` template
- [ ] `config.md` updated if it exists
- [ ] User notified to fill in research.md
</success_criteria>
