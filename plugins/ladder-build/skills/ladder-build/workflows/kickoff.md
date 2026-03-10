<required_reading>
Read these reference files NOW:
1. references/milestone-design.md
2. references/verification-standards.md
3. templates/build-plan.md
4. templates/milestone-report.md
</required_reading>

<process>

<step_1_gather_context>
Check for existing artifacts:
- Look in `[cwd]/artifacts/explorations/` for a miltiaze exploration report related to the project
- Look in `[cwd]/artifacts/builds/` for an existing build plan (if one exists, route to workflows/continue.md instead)

If a miltiaze exploration exists, read it and extract:
- Recommended solution from the Solutions section
- Key components and their dependencies
- Next Steps (these become the seed for milestones)
- Risks and mitigations (these inform verification criteria)
- Technical decisions already made

If no exploration exists, analyze the user's description:
- What is the project?
- What technologies/constraints are mentioned?
- What does "done" look like?
</step_1_gather_context>

<step_2_define_end_goal>
Write a clear, concise end goal (2-4 sentences). This is the North Star — what the finished product looks like, who uses it, and what it does.

This goes at the top of the build plan and never changes unless the user explicitly redefines it.

Present the end goal to the user for confirmation before proceeding.
</step_2_define_end_goal>

<step_3_decompose_into_milestones>
Using the references/milestone-design.md framework, break the project into 4-8 initial milestones. For each:
- Name: Short, descriptive (e.g., "Core trade UI", "Active trade monitoring")
- Goal: One sentence — what this milestone delivers
- Done when: Testable criteria — what you can run/see/confirm
- Size: S/M/L (relative to the project scope)
- Dependencies: Which milestones must come first (if any)

Ordering principles:
1. Foundation first — data models, core logic, basic infrastructure
2. Then core features — the things that make this useful
3. Then supporting features — monitoring, logging, history
4. Then polish — UI refinement, tooltips, charts, documentation
5. Each milestone builds on verified work from previous milestones

Present the milestones to the user:

"Here's how I'd break this build into milestones:
1. [Name] (S) — [Goal]. Done when: [criteria].
2. [Name] (M) — [Goal]. Done when: [criteria].
...
These will evolve as we build. Want to adjust before we start?"

Use AskUserQuestion:
- Go ahead — Start building
- Adjust milestones — I want to change something
- Redefine the goal — The end goal needs work

If "Go ahead" → proceed to step 4.
If "Adjust milestones" → receive input, update, ask again.
If "Redefine the goal" → receive input, return to step 2.
</step_3_decompose_into_milestones>

<step_4_save_build_plan>
Create directory: `[cwd]/artifacts/builds/[project-slug]/`
Create milestones directory: `[cwd]/artifacts/builds/[project-slug]/milestones/`

Save the build plan using the templates/build-plan.md structure.

If there's a miltiaze exploration, link to it in the Source field.

Tell the user where it's saved.
</step_4_save_build_plan>

<step_5_start_milestone_1>
Transition to workflows/build-milestone.md for the first milestone.

Don't ask if the user wants to start. Start.
</step_5_start_milestone_1>

</process>

<success_criteria>
Kickoff is complete when:
- [ ] End goal is defined and confirmed by user
- [ ] Milestones are decomposed (4-8 initial milestones)
- [ ] Each milestone has: name, goal, "done when" criteria, size estimate
- [ ] Milestones are ordered by dependency and value
- [ ] Build plan is saved to `[cwd]/artifacts/builds/[project-slug]/BUILD-PLAN.md`
- [ ] Source exploration is linked (if applicable)
- [ ] Milestone 1 has started
</success_criteria>
