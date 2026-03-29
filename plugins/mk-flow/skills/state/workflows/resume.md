<process>

<step_1_find_resume_point>
Look for resume context in this order:
1. `context/.continue-here.md` — explicit pause snapshot (most detailed)
2. `context/STATE.md` — living state (always exists if mk-flow is initialized)
3. `artifacts/builds/*/BUILD-PLAN.md` — build plan state (if in a build)

Use the first one found as the primary context source. Cross-reference with others for completeness.
</step_1_find_resume_point>

<step_1b_drift_check>
**Drift-check before acting:**
Before trusting STATE.md data, run drift-check to verify state accuracy:
```
bash plugins/mk-flow/skills/state/scripts/drift-check.sh
```
If drift-check reports DRIFT, fix state first (run with --fix flag), then proceed.
Do not act on unverified state — STATE.md may be stale from a previous session.
</step_1b_drift_check>

<step_2_load_context>
If .continue-here.md exists:
- Read all sections
- Note the resume command (what was suggested)
- Note partially completed work
- Note open questions and blockers

If only STATE.md:
- Read current focus, done, blocked, next, amendments
- Check staleness (last updated timestamp)
- If stale, prompt for confirmation

If build plan exists:
- Read current milestone status
- Read most recent milestone report
</step_2_load_context>

<step_3_check_note_tracker>
If note-tracker is set up (project-notes/tracker.xlsx exists):
- Pull open bugs and pending questions
- Include in the summary
</step_3_check_note_tracker>

<step_4_present_and_route>
Present a resume summary:

```
[Project name] — resuming from [date of last session].

Last session:
  [what was completed from .continue-here.md or STATE.md]

Current state:
  [where things stand — partial work, active milestone]

Open issues:
  [bugs, amendments, blockers]

Next action:
  [what the resume command suggested, or next milestone]

Ready to continue with [suggested next action]?
```

Then route to the appropriate workflow:
- If mid-build → transition to ladder-build's build-milestone workflow
- If mid-exploration → suggest resuming miltiaze
- If no active work → show full status and ask what to do
</step_4_present_and_route>

<step_5_cleanup>
After successfully resuming:
- Delete `context/.continue-here.md` (it's been consumed)
- Update STATE.md "Last updated" to now
</step_5_cleanup>

</process>
