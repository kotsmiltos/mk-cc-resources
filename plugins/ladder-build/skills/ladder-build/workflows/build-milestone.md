<required_reading>
Read these reference files NOW:
1. references/verification-standards.md
2. templates/milestone-report.md
</required_reading>

<process>

<step_1_read_build_plan>
Read the BUILD-PLAN.md from `[cwd]/artifacts/builds/[project-slug]/`.

Identify the current milestone:
- Its goal and "done when" criteria
- Dependencies (verify they're met)
- Context from previous milestone reports (read the most recent one if it exists)
</step_1_read_build_plan>

<step_2_plan_the_milestone>
Before writing code, think through:
- What files need to be created or modified?
- What sample data or test fixtures are needed?
- What's the verification approach?
- Are there technical decisions to make?

If the milestone is M or L sized, use plan mode to design the approach before implementing.

If the milestone requires current library documentation, use Context7 (resolve-library-id then query-docs). If it requires researching approaches, use WebSearch.
</step_2_plan_the_milestone>

<step_3_build>
Write the code. Create the files. Make the thing work.

While building:
- If you find a bug in previous work, fix it now. Note it in the milestone report.
- If you discover something that changes the plan (a new milestone needed, an existing one that should split or merge), note it but keep building the current milestone. Plan adjustments happen in step 6.
- If you need sample data to test, create it now. Fixtures, mock data, seed scripts — whatever the feature needs to be exercised.
- If you hit a genuine blocker (missing dependency, unclear requirement, architectural decision needed), stop and ask the user. Don't guess on critical path decisions.
</step_3_build>

<step_4_verify>
Follow the references/verification-standards.md checklist:
- Run the code / feature
- Test with sample data
- Exercise edge cases where practical
- Confirm "done when" criteria are met
- Check that previous milestones still work (basic regression)

If verification fails: Fix the issue. Return to step 3 for the failing part. Do NOT move on with broken milestones.

Show the user what was built. Describe or demonstrate. Let them confirm before marking complete.
</step_4_verify>

<step_5_save_milestone_report>
Create: `[cwd]/artifacts/builds/[project-slug]/milestones/milestone-[N]-[slug].md`

Use the templates/milestone-report.md structure. Include:
- What was built
- Files changed
- Sample data created
- Verification results
- Bugs found and fixed
- Discoveries that affect the plan
</step_5_save_milestone_report>

<step_6_reassess_and_adapt>
Now that the milestone is done, update the build plan:

1. Mark the completed milestone as done
2. Review discovered work — does it create new milestones or modify existing ones?
3. Look at the next milestone — does it still make sense given what we learned?
4. If milestones need to split, merge, reorder, or new ones need to appear, update the plan
5. Move items from the refinement queue to milestones if the core is nearing completion
6. Update the "Last updated" date
7. Save the updated BUILD-PLAN.md

The end goal doesn't change. The milestones are the path, and paths adapt. The destination is fixed.

Present the updated state:

"Milestone [N] done: [summary].
Next up: Milestone [N+1]: [Name] — [goal].
[If plan changed: 'Plan updated: (brief explanation of what changed and why).']"
</step_6_reassess_and_adapt>

<step_7_continue_or_complete>
If there are more milestones: Loop back to step 1 for the next one. Don't pause to ask — maintain momentum.

If all milestones are complete:
- Present the final state
- Link to the build plan and all milestone reports
- Summarize what was built, decisions made, and any items in the refinement queue that were deferred
- The ladder has been climbed.
</step_7_continue_or_complete>

</process>

<success_criteria>
A milestone is complete when:
- [ ] All "done when" criteria are met
- [ ] Code runs without errors
- [ ] Sample data exists for testable features
- [ ] Bugs found during building were fixed (not deferred)
- [ ] Previous milestones still work (no regressions)
- [ ] Milestone report is saved to disk
- [ ] Build plan is updated with current state
- [ ] Any plan changes are communicated to the user
- [ ] The user has confirmed the milestone
</success_criteria>
