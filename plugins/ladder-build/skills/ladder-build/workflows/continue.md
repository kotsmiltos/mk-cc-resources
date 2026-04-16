<required_reading>
Read the BUILD-PLAN.md for the target project before proceeding.
</required_reading>

<process>

<step_1_find_build_plan>
Look for the build plan:
1. If the user specified a project name or path, look in `[cwd]/artifacts/builds/[project-slug]/BUILD-PLAN.md`
2. If not specified, list available build plans in `[cwd]/artifacts/builds/` and use `AskUserQuestion` to let the user choose
3. If no build plans exist, redirect to workflows/kickoff.md
</step_1_find_build_plan>

<step_2_read_current_state>
Read `context/STATE.md` to identify:
- **Current Focus** — the current or next milestone
- **Done (Recent)** — which milestones are completed
- Amendments, blocked items, decisions that affect the build

Read `context/.continue-here.md` if it exists — this is a richer snapshot from an explicit pause, with session-specific context and a suggested resume action.

Then read BUILD-PLAN.md for milestone structure — goals, "done when" criteria, dependencies, discovered work, refinement queue. Do NOT read BUILD-PLAN.md for status; status lives in STATE.md only.

Read the most recent milestone report for context on where things left off.

If STATE.md doesn't exist, fall back to BUILD-PLAN.md milestone structure and the most recent milestone report to infer where to pick up.
</step_2_read_current_state>

<step_3_present_state>
"Picking up the [Project Name] build.

End goal: [end goal summary]

Done so far:
- [list completed milestones briefly]

Next milestone: Milestone [N]: [Name] — [goal]

[If discovered work exists: '[N] items in the discovered work queue.']
[If refinement items exist and core is nearly done: '[N] refinement items ready to become milestones.']
[If amendments exist: '[N] pending amendments — will check during relevant milestones.']

Continuing with milestone [N]."
</step_3_present_state>

<step_4_route_to_build>
If milestones remain: Transition to workflows/build-milestone.md for the current milestone.

If ALL milestones are complete: Perform reassembly verification before declaring the project done.
</step_4_route_to_build>

<step_5_reassembly_verification>
This step runs ONLY when all milestones are marked complete. It answers: "Does the sum of the parts match the original intent?"

1. **Re-read the original goal** from the top of BUILD-PLAN.md. Read it word for word.

2. **Check the full file manifest** in the Architecture Impact Summary:
   - Is every checkbox checked?
   - If any file was skipped, why? Was it intentional or forgotten?

3. **Re-read the user's original requirements** (from the exploration, the user's initial request, or the BUILD-PLAN.md end goal). For each requirement, confirm it's met:
   - [ ] Requirement 1 — met by milestone N (specific evidence)
   - [ ] Requirement 2 — met by milestone N (specific evidence)
   - ...

4. **Run the full test suite** (not just milestone-specific tests). Confirm no regressions.

5. **Check for silent scope reduction:** During building, features sometimes get simplified without the user noticing. Look for:
   - "TODO" or "FIXME" comments in the code that represent unfinished work
   - Features described in the goal that have no corresponding implementation
   - Error handling or edge cases that were mentioned but never implemented

6. **Verify architecture docs are current:**
   - [ ] CLAUDE.md Change Impact Map reflects any new dependencies introduced
   - [ ] context/cross-references.yaml has rules for new coupling (if mk-flow initialized)
   - [ ] Project structure in CLAUDE.md matches reality

If anything was missed:
- Create a "cleanup" milestone for the gaps
- Do NOT mark the project as complete with known gaps
- Present the gaps to the user with a recommendation

If everything checks out:
- Present the completed project summary
- Link to BUILD-PLAN.md and all milestone reports
- Note any items in the Discovered Work or Refinement Queue that were deferred
</step_5_reassembly_verification>

</process>

<success_criteria>
Continue is complete when:
- [ ] The correct build plan has been located and read
- [ ] The current state has been presented to the user
- [ ] The build-milestone workflow has been entered with correct context

If all milestones were already complete, also:
- [ ] Reassembly verification performed (full file manifest checked, original intent re-verified)
- [ ] All requirements confirmed met with specific evidence
- [ ] Full test suite passed
- [ ] No silent scope reduction detected (no forgotten TODOs, missing features, or skipped edge cases)
- [ ] Architecture docs are current
- [ ] Gaps addressed or user informed
</success_criteria>
