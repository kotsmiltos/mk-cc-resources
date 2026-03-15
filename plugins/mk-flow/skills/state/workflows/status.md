<process>

<step_1_read_state>
Read `context/STATE.md` from the project root. If it doesn't exist, tell the user: "No STATE.md found. Run `/mk-flow init` to set up state tracking."

Note the "Last updated" timestamp. If older than 24 hours, prepend a stale warning:
"STATE.md is [N] days old. Showing last known state — confirm if still accurate."
</step_1_read_state>

<step_2_read_note_tracker>
Check if note-tracker is set up for this project:
- Look for `project-notes/tracker.xlsx`
- If found, pull open bugs and pending questions using the tracker.py script

If not found, skip this step.
</step_2_read_note_tracker>

<step_3_read_build_plan>
Check for active build plans:
- Look in `artifacts/builds/*/BUILD-PLAN.md`
- If found, extract: current milestone, completed count, total count
</step_3_read_build_plan>

<step_4_present_summary>
Present a concise summary:

```
[Project name] — last updated [date].

Current focus:
  [current focus from STATE.md]

Done recently:
  - ✅ [completed items]

Open issues:
  - 🔴 [P0/critical items from note-tracker or STATE.md blocked]
  - 🟡 [amendments needing attention]

Next up:
  - [next milestone/task]

[If build plan exists:]
Build progress: Milestone [X] of [Y] — [current milestone name]

[If amendments exist:]
Pending amendments: [count] items need attention.
Say "show amendments" to review.

Ready to continue, or something else?
```

Use emoji sparingly and only for status indicators (✅ 🔴 🟡) to make scanning fast.
</step_4_present_summary>

</process>
