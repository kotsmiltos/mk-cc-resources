<process>

## Add a new handler

### Step 1: Parse input
The input format is: `add <handler_name>`
Extract the handler name (everything after "add").

### Step 2: Find tracker.py and create the handler
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" add-handler project-notes "<handler_name>"
```

### Step 3: Update config.md
If `project-notes/config.md` exists, append the new handler to the Handlers list.

### Step 4: Remind the user
Tell them to edit `project-notes/<handler>/research.md` with instructions for how to research this handler's questions.

</process>
