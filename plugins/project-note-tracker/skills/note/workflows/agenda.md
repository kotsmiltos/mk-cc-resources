<process>

## Generate a meeting agenda

### Step 1: Parse optional handler filter
The input format is: `agenda [handler]`
- If a handler name is provided after "agenda", only show questions for that handler
- If no handler is given, show all questions grouped by handler

### Step 2: Find tracker.py and get pending questions
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

### Step 3: Group and prioritize
Group the questions by handler. Within each handler, sort by:
1. "Pending" items first (no internal answer — most urgent)
2. "Answered Internally" items second (need confirmation)

### Step 4: Generate the agenda
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

### Step 5: Offer to save
Ask the user if they want to save the agenda to a file (e.g. `project-notes/agenda-YYYY-MM-DD.md`).

</process>

<success_criteria>
Agenda is complete when:
- [ ] Questions are filtered by handler if one was specified
- [ ] All pending/unanswered questions are included
- [ ] Grouped by handler
- [ ] Prioritized by urgency (Pending before Answered Internally)
- [ ] Clean, shareable format
</success_criteria>
