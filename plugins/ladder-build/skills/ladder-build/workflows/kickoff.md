<required_reading>
Read these reference files NOW:
1. references/milestone-design.md
2. references/verification-standards.md
3. references/impact-analysis.md
4. templates/build-plan.md
5. templates/milestone-report.md
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

**Structured Build Plans from miltiaze:** If the exploration contains a "Build Plans" or "Build Sequence" section with a structured table (Plan | Goal | Milestones | Depends On), use these directly as the milestone structure in step 3 instead of decomposing from scratch. The exploration already did the decomposition work — don't redo it.

If no exploration exists, analyze the user's description:
- What is the project?
- What technologies/constraints are mentioned?
- What does "done" look like?
</step_1_gather_context>

<step_1b_architecture_impact_analysis>
Before decomposing into milestones, understand the project's architecture so that coupled files are never split across milestones or forgotten.

Read references/impact-analysis.md for the full procedure. In summary:

1. **Find architecture documentation:**
   - Read CLAUDE.md for a Change Impact Map section (tables with "Touch" / "Also update" columns)
   - Read context/cross-references.yaml if it exists (mk-flow rules)
   - If neither exists, note this — manual discovery will be needed per-milestone

2. **Trace impact for the feature being built:**
   - Identify which architectural concern areas this feature touches
   - For each concern, list ALL files that will need changes (direct + coupled from the impact map)
   - Categorize: MUST UPDATE, SHOULD CHECK, INFORM ONLY

3. **Build the file manifest:**
   Write the full list of files into the BUILD-PLAN.md "Architecture Impact Summary" section:
   - Group by concern area
   - Include every coupled file the impact map identifies
   - Include files discovered via import/consumer analysis if no impact map exists

4. **Use the manifest to shape milestones:**
   - Every file in the manifest must appear in at least one milestone
   - Keep coupled files (MUST UPDATE pairs) in the same milestone
   - After all milestones are listed, verify the manifest has full coverage — no orphan files

If the project has no architecture documentation (no Change Impact Map, no cross-references), note it in the BUILD-PLAN.md Context Notes and perform manual import analysis when planning each milestone.
</step_1b_architecture_impact_analysis>

<step_2_define_end_goal>
Write a clear, concise end goal (2-4 sentences). This is the North Star — what the finished product looks like, who uses it, and what it does.

This goes at the top of the build plan and never changes unless the user explicitly redefines it.

Present the end goal to the user for confirmation before proceeding.
</step_2_define_end_goal>

<step_3_decompose_into_milestones>
**If miltiaze provided structured Build Plans:** Use those plans directly as milestones. Convert each plan entry into the milestone format below. Validate the ordering and dependencies make sense, but don't re-decompose work the exploration already structured. Present them for confirmation.

**Otherwise:** Using the references/milestone-design.md framework, break the project into as many milestones as it naturally needs — could be 2, could be 15. Group related work into the same milestone when it makes sense, split when things are independent. Parallelize independent milestones where possible. For each:
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
6. Parallelize independent milestones — if two milestones don't depend on each other, flag them as parallelizable so they can be worked on simultaneously using subagents

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

Include the metadata block at the top of BUILD-PLAN.md (type, output_path, key_decisions, open_questions) in blockquote format as specified in templates/build-plan.md. For initial creation, key_decisions is "none yet" and open_questions captures any unresolved items from the kickoff discussion.

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
- [ ] Milestones are decomposed (as many as the project naturally needs)
- [ ] Architecture impact analysis performed (CLAUDE.md impact map / cross-references consulted)
- [ ] Full file manifest written to BUILD-PLAN.md Architecture Impact Summary
- [ ] Every file in the manifest appears in at least one milestone
- [ ] Coupled files (MUST UPDATE pairs) are in the same milestone
- [ ] Each milestone has: name, goal, "done when" criteria, size estimate
- [ ] Milestones are ordered by dependency and value
- [ ] Build plan is saved to `[cwd]/artifacts/builds/[project-slug]/BUILD-PLAN.md`
- [ ] Source exploration is linked (if applicable)
- [ ] Milestone 1 has started
</success_criteria>
