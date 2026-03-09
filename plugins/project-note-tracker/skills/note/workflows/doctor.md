<process>

## Upgrade tracker.xlsx to latest formatting

### Step 1: Check tracker exists
Verify `project-notes/tracker.xlsx` exists. If not, suggest running `/note init` first.

### Step 2: Run doctor
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" doctor project-notes
```

This upgrades the existing tracker to the latest format:
- Re-applies header styling (blue fill, white font)
- Fixes column widths
- Adds status dropdown (data validation) to every row
- Applies color coding to status cells (green/orange/blue)
- Re-applies wrap alignment and auto-filter
- Freezes the header row

### Step 3: Confirm
Tell the user how many rows were updated and that tracker.xlsx is now up to date.

</process>

<success_criteria>
Doctor is complete when:
- [ ] tracker.xlsx has been upgraded
- [ ] All status cells have dropdowns and color coding
- [ ] User is informed of what was updated
</success_criteria>
