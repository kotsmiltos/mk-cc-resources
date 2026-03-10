<process>

This workflow handles both `resolve` (mark as Completed) and `decide` (mark as Decided with rationale).

<step_1_parse>
For `resolve`: input format is `resolve <handler> "<question substring>" <answer>`
- handler = handler/department name
- question substring = enough of the question to identify it (in quotes)
- answer = the confirmed answer from the handler

For `decide`: input format is `decide <handler> "<question substring>" <decision + rationale>`
- Same parsing, but uses the `decide` command in tracker.py instead of `resolve`
</step_1_parse>

<step_2_find_row>
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" pending project-notes --handler "<handler>"
```

Search the results for a question containing the substring. If multiple match, show them and ask the user to pick.
</step_2_find_row>

<step_3_update>
For `resolve`:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" resolve project-notes <row_number> "<answer>"
```

For `decide`:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" decide project-notes <row_number> "<decision + rationale>"
```
</step_3_update>

<step_4_confirm>
Tell the user which question was updated:
- For resolve: marked as Completed, show the answer recorded
- For decide: marked as Decided, show the decision and rationale recorded
</step_4_confirm>

</process>

<success_criteria>
Resolve/decide is complete when:
- [ ] Matching question was found in tracker.xlsx
- [ ] Row was updated with the correct status (Completed or Decided)
- [ ] Answer or decision+rationale was recorded in the Handler Answer column
- [ ] User was informed of the update
</success_criteria>
