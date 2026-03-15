<process>

Re-runs context-gathering on questions that are not yet completed. Useful when project files have changed or when you want a fresh look.

<step_1_parse>
The input format is: `review [row_number]`
- If a row number is given, re-review only that specific question
- If no row number, re-review ALL non-completed questions
</step_1_parse>

<step_2_get_questions>
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" pending project-notes
```

If a specific row was requested, filter to just that row from the results. If the row is already Completed, tell the user and stop.
</step_2_get_questions>

<step_3_re_review>
For each question to re-review, launch a background research agent (same as research-question.md step 2) with these differences:

- The agent already knows the handler (from the existing row)
- When it returns findings, update the existing row instead of appending a new one:

```bash
uvx --with openpyxl python3 "$TRACKER_PY" update-review project-notes <row_number> "<new_internal_review>" "<new_status>"
```

If re-reviewing multiple questions, launch agents in parallel (one per question).
</step_3_re_review>

<step_4_confirm>
Tell the user which questions were re-reviewed and whether any status changed.
</step_4_confirm>

</process>

<success_criteria>
Review is complete when:
- [ ] Target questions were identified
- [ ] Context was re-gathered from current project state
- [ ] Internal Review column was updated with fresh findings
- [ ] Status was updated if confidence changed
</success_criteria>
