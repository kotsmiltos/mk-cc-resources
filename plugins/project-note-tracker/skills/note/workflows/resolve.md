<process>

## Resolve a question

### Step 1: Parse input
The input format is: `resolve <handler> "<question substring>" <answer>`
- handler = handler/department name
- question substring = enough of the question to identify it (in quotes)
- answer = the confirmed answer from the handler

### Step 2: Find the matching row
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" pending project-notes --handler "<handler>"
```

Search the results for a question containing the substring. If multiple match, show them and ask the user to pick.

### Step 3: Resolve the row
```bash
uvx --with openpyxl python3 "$TRACKER_PY" resolve project-notes <row_number> "<answer>"
```

### Step 4: Confirm
Tell the user which question was marked as Completed and show the answer that was recorded.

</process>
