<process>

<step_1_parse_filter>
The input format is: `agenda [handler]`
- If a handler name is provided after "agenda", only show questions for that handler
- If no handler is given, show all questions grouped by handler
</step_1_parse_filter>

<step_2_get_pending>
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
```

If handler filter provided:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" pending project-notes --handler "<handler>"
```

Otherwise:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" pending project-notes
```

This returns JSON with all non-completed questions.
</step_2_get_pending>

<step_3_group_and_prioritize>
Group the questions by handler. Within each handler, sort by:
1. "Pending" items first (no internal answer — most urgent)
2. "Answered Internally" items second (need confirmation)
</step_3_group_and_prioritize>

<step_4_generate>
Output a clean markdown agenda:

```markdown
# Meeting Agenda — YYYY-MM-DD

## <Handler 1> (N open questions)

### Needs discussion
1. **<question>** (Row N)
   _No internal answer found — needs direct input_

### Needs confirmation
2. **<question>** (Row N)
   _Internal review suggests: <brief summary>_

## <Handler 2> (N open questions)
...

## Suggested priority
1. <handler> — <question> — <why this is urgent>
2. ...
```
</step_4_generate>

<step_5_offer_save>
Ask the user if they want to save the agenda to a file (e.g. `project-notes/agenda-YYYY-MM-DD.md`).
</step_5_offer_save>

</process>

<success_criteria>
Agenda is complete when:
- [ ] Questions are filtered by handler if one was specified
- [ ] All pending/unanswered questions are included
- [ ] Grouped by handler
- [ ] Prioritized by urgency (Pending before Answered Internally)
- [ ] Clean, shareable format
</success_criteria>
