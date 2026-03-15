<process>

Investigate a bug by researching the codebase for related code, likely causes, and reproduction steps.

<step_1_parse>
Input after "investigate" should be a row number from the Bugs sheet, or a keyword from a bug summary.

If it's a number, use that row directly. If it's text, search for a matching bug.
</step_1_parse>

<step_2_get_bug>
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" list-bugs project-notes
```

Find the target bug from the results. If text was given instead of a row number, match against bug summaries. If multiple match, ask the user to pick. If the bug is already Fixed or Closed, ask if they want to re-investigate.
</step_2_get_bug>

<step_3_launch_investigation>
Use the Agent tool with `run_in_background: true` and pass these instructions:

---

Agent instructions:

You are investigating a reported bug for the project-note-tracker. Do NOT write to Excel or run Bash commands. Your job is to research the codebase and gather clues about this bug.

Bug Summary: {{summary}}
Severity: {{severity}}
Known Steps to Reproduce: {{steps_or_none}}

Investigation goals:
1. **Find related code**: Use Glob and Grep to find files, functions, classes, and code paths related to the bug description. Search for keywords from the summary.
2. **Identify likely causes**: Look for patterns that could cause this behavior — error handling gaps, race conditions, missing validation, incorrect logic, off-by-one errors, null checks.
3. **Gather reproduction hints**: If no steps to reproduce exist, infer likely steps from the code flow. Trace the user-facing path that would trigger this behavior. If steps already exist, verify them against the actual code paths.
4. **Find related signals**: Search for TODO/FIXME/HACK/BUG comments near related code. Look for error logging, exception handlers, or similar known issues.
5. **Check test coverage**: Look for existing tests that cover this area. Are there gaps? Do the tests actually test the failure case?

DO NOT try to fix the bug. Document what you find.

Return your findings in this exact format:

```
ROW: {{row}}
STATUS: <Investigating or Reproduced>
INVESTIGATION:

### Related Code
- <file:line> — <what this code does and why it's relevant>
- <file:line> — <another relevant location>

### Likely Cause
<your hypothesis based on code analysis — be specific about which code path fails and why>

### Steps to Reproduce
1. <step>
2. <step>
3. <expected vs actual behavior>
(inferred from code flow if not originally provided)

### Related Signals
- <TODOs, FIXMEs, error patterns, test gaps, similar bugs found>

### Suggested Fix Direction
<brief hint about what code to change and why — NOT a full fix>
```

---
</step_3_launch_investigation>

<step_4_confirm>
Tell the user: "Investigating bug (Row {{row}}: {{summary}}) in the background — I'll notify you when done."
</step_4_confirm>

<step_5_write_results>
When the background agent returns, parse its findings and update the bug:

```bash
uvx --with openpyxl python3 "$TRACKER_PY" update-bug project-notes <row_number> "<investigation>" "<new_status>"
```

Use "Reproduced" if the agent found clear reproduction steps. Use "Investigating" if it found related code but couldn't confirm exact steps.

Then tell the user what was found — highlight the likely cause and reproduction steps.
</step_5_write_results>

</process>

<success_criteria>
Investigation is complete when:
- [ ] Target bug was identified from the Bugs sheet
- [ ] Codebase was searched for related code paths, error handling, and test coverage
- [ ] Investigation column was updated with findings (related code, likely cause, steps, signals)
- [ ] Status was updated to Investigating or Reproduced
- [ ] User was informed of key findings
</success_criteria>
