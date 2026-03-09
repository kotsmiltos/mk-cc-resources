<process>

## Meeting notes capture

Interactive meeting capture — log discussion points and auto-link them to existing open questions in the tracker.

### Step 1: Load open questions
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" pending project-notes
```

Show the user a numbered list of open questions grouped by handler, so they can reference them during the meeting.

### Step 2: Capture meeting notes
Tell the user:
"Meeting mode active. Type discussion points as you go. I'll match them to open questions.

- To link a note to a question: just describe it — I'll match by content
- To mark a question as resolved: say 'resolved <row>' or 'resolved <question keyword>'
- To mark a question as decided: say 'decided <row> <decision + rationale>'
- To add a new question discovered in the meeting: say 'new <question>'
- To end the meeting: say 'end meeting'"

### Step 3: Process each input
For each thing the user types during the meeting:

**If it matches an open question** (by row number or content similarity):
- Update the Handler Answer column with the discussion point using:
  ```bash
  uvx --with openpyxl python3 "$TRACKER_PY" resolve project-notes <row> "<answer>"
  ```
  or for decisions:
  ```bash
  uvx --with openpyxl python3 "$TRACKER_PY" decide project-notes <row> "<decision + rationale>"
  ```

**If it's a new question** (prefixed with "new"):
- Add it using the quick-add flow (empty Internal Review, Pending status):
  ```bash
  uvx --with openpyxl python3 "$TRACKER_PY" add project-notes "<handler>" "<question>" "" "Pending"
  ```
  Auto-detect the handler from context.

**If it's a general discussion point** that doesn't match any question:
- Accumulate it for the meeting summary.

### Step 4: End meeting — generate summary
When the user says "end meeting", generate a meeting summary:

```markdown
# Meeting Notes — YYYY-MM-DD

## Questions resolved
- Row N: <question> → <answer> (Completed)
- Row N: <question> → <decision> (Decided)

## New questions raised
- Row N: <question> (assigned to <handler>)

## Discussion points (unlinked)
- <point 1>
- <point 2>

## Still open
- Row N: <question> (<handler>) — <status>
```

Offer to save to `project-notes/meeting-YYYY-MM-DD.md`.

</process>

<success_criteria>
Meeting capture is complete when:
- [ ] Open questions were shown at the start
- [ ] Discussion points were matched to questions where possible
- [ ] Resolved/decided questions were updated in tracker.xlsx
- [ ] New questions were added to tracker.xlsx
- [ ] Meeting summary was generated
</success_criteria>
