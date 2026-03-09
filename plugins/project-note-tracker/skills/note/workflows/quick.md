<process>

## Quick-add a question without research

Logs a question immediately with no background research. Auto-detects the handler and adds the row with an empty Internal Review and "Pending" status.

### Step 1: Parse input and detect handler

The input after "quick" is the question. Handler detection works the same as research-question:

**Explicit handler override:** If the first word after "quick" (case-insensitive) matches a known handler directory in `project-notes/`, treat it as the handler and the rest as the question.

**Auto-detection (default):** If no handler match:
1. List handler directories in `project-notes/` (just read the directory)
2. Read each handler's `research.md` briefly to understand their focus areas
3. Pick the best match based on the question's topic

Normalize handler name to **lowercase**.

### Step 2: Add to tracker immediately
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" add project-notes "<handler>" "<question>" "" "Pending"
```

The Internal Review is empty — this is intentional. The user can run `/note review <row>` later to gather context.

### Step 3: Confirm
Tell the user: "Added to **<handler>** as Pending (no research). Use `/note review <row>` to gather context later."

</process>

<success_criteria>
Quick-add is complete when:
- [ ] Handler was detected
- [ ] Row was appended to tracker.xlsx with empty Internal Review
- [ ] Status is "Pending"
- [ ] User was informed of the row number
</success_criteria>
