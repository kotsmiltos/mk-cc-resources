<process>

<step_1_run_drift_check>
Run the drift-check tool to get verified milestone status:

```bash
bash plugins/mk-flow/skills/state/scripts/drift-check.sh
```

Capture the full output. This is your source of truth for build progress — do NOT rely on plan documents for status — STATE.md is the single source of truth, validated by drift-check against filesystem evidence.

If drift-check exits with code 2 (error — no BUILD-PLAN.md found), fall back to step 1b.
If drift-check exits with code 0 (no drift) or 1 (drift found), proceed to step 2.
</step_1_run_drift_check>

<step_1b_fallback_no_build_plan>
No BUILD-PLAN.md found — read `context/STATE.md` directly.
If it doesn't exist either, tell the user: "No STATE.md found. Run `/mk-flow init` to set up state tracking."
Note the "Last updated" timestamp. If older than 24 hours, prepend a stale warning.
Skip to step 4 (present summary without build plan context).
</step_1b_fallback_no_build_plan>

<step_2_fix_drift>
If drift-check reported DRIFT (exit code 1):

1. Read the drift-check output to identify which milestones need correction
2. Update STATE.md Pipeline Position and Current Focus to match drift-check verdicts.
   Write Current Focus as a state description — what IS, not what to DO. Pipeline Position handles routing.
3. Tell the user what was corrected: "Found drift: [description]. Updated STATE.md."

If no drift (exit code 0), proceed directly to step 3.
</step_2_fix_drift>

<step_3_read_note_tracker>
Check if note-tracker is set up for this project:
- Look for `project-notes/tracker.xlsx`
- If found, pull open bugs and pending questions using the tracker.py script

If not found, skip this step.
</step_3_read_note_tracker>

<step_4_present_summary>
Present a concise summary using the drift-check output as your data source:

```
[Project name] — last updated [date].

Current focus:
  [from drift-check: first pending milestone, or "all milestones complete"]

Build progress:
  [paste the drift-check milestone table — it IS the verified status]

Open issues:
  - [P0/critical items from note-tracker or STATE.md blocked]

Next up:
  - [first pending milestone from drift-check]

[If note-tracker found:]
Pending questions: [count]
Open bugs: [count]

Ready to continue, or something else?
```

The drift-check output IS the verified status. Do not add qualifiers like "according to drift-check" — present it as fact.
</step_4_present_summary>

</process>
