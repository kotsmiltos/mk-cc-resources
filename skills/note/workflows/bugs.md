<process>

List and extract bugs from the Bugs sheet in a clean, readable format.

<step_1_parse>
Input after "bugs" can be:
- Empty → show all active bugs (excludes Closed)
- A severity level (critical/high/medium/low) → filter by severity
- A status (open/investigating/reproduced/fixed) → filter by status
- "all" → show everything including Closed
- A row number → show detailed view of that specific bug
</step_1_parse>

<step_2_get_bugs>
```bash
TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
if [ ! -f "$TRACKER_PY" ]; then
  TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
  if [ -z "$TRACKER_PY" ]; then
    echo "Error: tracker.py not found" >&2
    exit 1
  fi
fi
```

For filtered by status:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" list-bugs project-notes --status "<status>"
```

For filtered by severity:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" list-bugs project-notes --severity "<severity>"
```

For all (including closed):
```bash
uvx --with openpyxl python3 "$TRACKER_PY" list-bugs project-notes --all
```

For no filter (active bugs only — default):
```bash
uvx --with openpyxl python3 "$TRACKER_PY" list-bugs project-notes
```
</step_2_get_bugs>

<step_3_format>
If a specific row was requested, show a detailed single-bug view:

```markdown
## Bug #N: <summary>

| Field | Value |
|---|---|
| **Severity** | <severity> |
| **Status** | <status> |
| **Date Reported** | YYYY-MM-DD |

### Steps to Reproduce
<steps or "Not documented — run `/note investigate <N>` to research">

### Investigation
<investigation or "Not yet investigated">
```

Otherwise, output a grouped list:

```markdown
# Active Bugs — YYYY-MM-DD

## Critical (N)
- **Row N**: <summary> — <status>
  Steps: <brief steps or "not documented">

## High (N)
- ...

## Medium (N)
- ...

## Low (N)
- ...

---
Total: N active bugs (N open, N investigating, N reproduced, N fixed)
```

If filtered, only show matching bugs but keep the same format.
</step_3_format>

<step_4_offer_save>
If there are more than 5 bugs, offer to save the report to `project-notes/bug-report-YYYY-MM-DD.md`.
</step_4_offer_save>

</process>

<success_criteria>
Bug listing is complete when:
- [ ] Bugs were retrieved from the Bugs sheet in tracker.xlsx
- [ ] Grouped by severity (Critical → High → Medium → Low)
- [ ] Clean, readable format with summary counts
- [ ] Filtered correctly if a filter was specified
</success_criteria>
