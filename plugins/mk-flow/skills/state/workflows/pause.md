<process>

<step_1_gather_context>
Collect current session context:
- What was being worked on (current milestone, task, exploration)
- What was completed this session
- What's partially done
- Decisions made this session
- Open questions or blockers discovered
- Key files modified
- Which skill/workflow was active (miltiaze, ladder-build, direct work)
</step_1_gather_context>

<step_2_write_continue_here>
Write `context/.continue-here.md` using the template from `templates/continue-here.md`.

Fill in ALL sections with specific details from the current session. Do not leave sections empty — if nothing applies, omit the section entirely.

The Resume Command section is critical. Generate a copy-paste command that includes:
- Which skill to invoke (e.g., `/ladder-build continue mk-flow`)
- What was just completed
- What's next
- Which files to read for full context

Example:
```
/ladder-build continue [project] — just finished Milestone 3
(intent classifier hook). Next: Milestone 4 (State skill).
Read BUILD-PLAN.md at artifacts/builds/[project]/ and
milestone reports 1-3 for full context.
```
</step_2_write_continue_here>

<step_3_update_state>
Update `context/STATE.md`:
- Current Focus → what was in progress when paused
- Done (Recent) → add anything completed this session
- Decisions Made → add any new decisions
- Amendments → add any new amendments discovered
- Last updated → now
</step_3_update_state>

<step_4_confirm>
Show the user:

```
Session paused. Context saved.

What was done:
  - [brief summary of completed work]

To resume later, paste:

  [the resume command from .continue-here.md]

STATE.md and .continue-here.md are up to date.
```
</step_4_confirm>

</process>
