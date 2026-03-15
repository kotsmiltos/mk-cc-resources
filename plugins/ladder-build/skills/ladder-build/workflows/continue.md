<required_reading>
Read the BUILD-PLAN.md for the target project before proceeding.
</required_reading>

<process>

<step_1_find_build_plan>
Look for the build plan:
1. If the user specified a project name or path, look in `[cwd]/artifacts/builds/[project-slug]/BUILD-PLAN.md`
2. If not specified, list available build plans in `[cwd]/artifacts/builds/` and let the user choose
3. If no build plans exist, redirect to workflows/kickoff.md
</step_1_find_build_plan>

<step_2_read_current_state>
Read the BUILD-PLAN.md. Identify:
- End goal — remind the user (and yourself) where we're heading
- Completed milestones — what's done
- Current/next milestone — where to pick up
- Discovered work — anything pending that surfaced during previous milestones
- Refinement queue — polish items waiting

Read the most recent milestone report for context on where things left off.

If mk-flow is initialized (check for `context/STATE.md`):
- Read `context/STATE.md` — check for amendments, blocked items, decisions that affect the build
- Read `context/.continue-here.md` if it exists — this is a richer snapshot from an explicit pause, with session-specific context and a suggested resume action
- Pull any pending amendments that may be relevant to upcoming milestones
</step_2_read_current_state>

<step_3_present_state>
"Picking up the [Project Name] build.

End goal: [end goal summary]

Done so far:
- [list completed milestones briefly]

Next up: Milestone [N]: [Name] — [goal]

[If discovered work exists: '[N] items in the discovered work queue.']
[If refinement items exist and core is nearly done: '[N] refinement items ready to become milestones.']
[If amendments exist: '[N] pending amendments — will check during relevant milestones.']

Continuing with milestone [N]."
</step_3_present_state>

<step_4_route_to_build>
Transition to workflows/build-milestone.md for the current milestone.
</step_4_route_to_build>

</process>

<success_criteria>
Continue is complete when:
- [ ] The correct build plan has been located and read
- [ ] The current state has been presented to the user
- [ ] The build-milestone workflow has been entered with correct context
</success_criteria>
