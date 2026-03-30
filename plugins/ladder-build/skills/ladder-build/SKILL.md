---
name: ladder-build
description: Incremental build pipeline that decomposes projects into small, verifiable milestones. Enforces a verify-before-continuing contract — each rung is built, tested, and confirmed before climbing to the next. The end goal stays visible; the path evolves as the picture becomes clearer. Use after miltiaze exploration or when starting any build project.
---

<objective>
Decompose any project into small, verifiable milestones and build them one at a time. Each milestone is built, tested, and confirmed before the next begins. The build plan is a living document that adapts as the picture becomes clearer, but the end goal stays fixed.
</objective>

<quick_start>
BEFORE ANYTHING ELSE — check for architect task specs:
1. Glob for `artifacts/designs/*/sprints/*/task-*.md`
2. If task spec files exist: read workflows/execute.md and follow it. STOP reading this file.
3. Also check `context/STATE.md` Pipeline Position — if stage starts with `sprint-`, read workflows/execute.md. STOP.

Only if NO task specs exist AND no active sprint in STATE.md, continue:
4. Check for existing build plans in `artifacts/builds/`. If found → workflows/continue.md
5. Otherwise → workflows/kickoff.md
</quick_start>

<essential_principles>

<philosophy>
Building is climbing. Each milestone is a rung — small enough to step on, solid enough to hold weight, and always leading upward toward the end goal. You can see the top from any rung. The ladder might grow new rungs or lose some as you climb, but the destination stays fixed.
</philosophy>

<core_rules>

<rule id="1">The end goal is the North Star. Defined at kickoff. Stays visible in every plan update. Milestones shift, but the destination doesn't — unless the user explicitly changes it.</rule>

<rule id="2">Small, verifiable milestones. Each one is small enough to build and verify in one sitting. If you can't test it, it's too abstract. If you can't finish it, it's too big. Split it.</rule>

<rule id="3">Build, test, verify, next. No stacking unverified work. Every milestone produces something the user can see, run, or confirm before moving on.</rule>

<rule id="4">The plan is alive. Milestones can split, merge, appear, or disappear as you learn. The plan reflects reality, not the original guess. Update it after every milestone.</rule>

<rule id="5">Sample data is not optional. If a feature needs data to test, create it. Mock APIs, seed databases, generate fixtures. A feature you can't exercise is a feature you can't verify.</rule>

<rule id="6">Bugs die where they're born. Found during a milestone? Fix it now. Don't defer. Stacking bugs is how projects rot.</rule>

<rule id="7">Artifacts survive sessions. Build plan and milestone reports live on disk. Any session picks up where the last left off. Context never lives only in memory.</rule>

<rule id="8">Handoffs are explicit. Receiving from miltiaze? Read the exploration. Completing a session? Save the state. The chain never breaks.</rule>

<rule id="9">Build first, polish later. Core functionality before refinement. Tooltips, chart aids, cleaner UI — these are milestones too, but after the thing works.</rule>

<rule id="10">Every milestone adds visible progress. The user should see/feel the difference. Invisible milestones need to be combined with something user-facing.</rule>

<rule id="11">Adapt, don't abandon. When the picture changes — and it will — update the milestones. Don't restart. The work done is still valuable; the path forward just got clearer.</rule>

<rule id="12">Use the right tools — high-confidence sources only. Look up documentation with Context7. Use WebSearch for current information. Test with real commands. Write real code. This is building, not theorizing. When researching, only use high-confidence sources: official documentation, official GitHub repositories, well-established technical publications, and recognized industry blogs. Never rely on random Medium articles, SEO-farm blogs, content aggregators, or any source where authorship or accuracy is questionable. If the only source is low-confidence, flag it explicitly.</rule>

<rule id="13">Build for sharing. Everything we build should be straightforward for someone else to pick up and run. If setup requires installations, keys, or configuration — provide exact steps, direct links, and known gotchas inline. The user should never have to leave the project to find answers. If a dependency has common failure modes, document them with fixes. If there's a setup script, it should tell you what's happening and what to do if something fails.</rule>

</core_rules>

</essential_principles>

<intake>
Analyze the user's input to determine what to build and where we are.

**Check Pipeline Position first** (fastest orientation after /clear):
Read `context/STATE.md` if it exists. Look for the Pipeline Position section.
See canonical pipeline stages in the STATE.md template
(`plugins/mk-flow/skills/state/templates/state.md`, Canonical Pipeline Stages section)
for the authoritative stage list.

Route based on stage:
- Stage `sprint-N` with a Plan path → architect has planned, route to execute workflow using that Plan path
- Stage `sprint-N-complete` → sprint done, user should run /architect for review, not /ladder-build. Tell them.
- No Pipeline Position → fall through to manual detection below

If the user referenced a miltiaze exploration or a specific project:
- Look for the exploration file in `[cwd]/artifacts/explorations/`
- Look for an existing build plan in `[cwd]/artifacts/builds/`

If the user described something new to build:
- Extract the core project, constraints, and preferences

Then proceed to routing.
</intake>

<routing>

| Signal | Workflow | File |
|--------|----------|------|
| New project, references miltiaze, "build X", "start building" | Kickoff | workflows/kickoff.md |
| "continue", "next", "pick up", references existing build plan | Continue | workflows/continue.md |
| Already in a build session, milestone completed or in progress | Build milestone | workflows/build-milestone.md |
| Architect task specs exist in `artifacts/designs/`, "execute sprint", "run sprint" | Execute | workflows/execute.md |

Default: If architect task specs exist in `artifacts/designs/[slug]/sprints/sprint-N/`, route to execute. If there's an existing build plan, route to continue. Otherwise, kickoff.

</routing>

<reference_index>

All in `references/`:

| Reference | Purpose |
|-----------|---------|
| milestone-design.md | How to decompose projects into good milestones (includes context-aware sizing) |
| verification-standards.md | How to test and verify each milestone |
| impact-analysis.md | How to trace cross-file impact before and after building |

</reference_index>

<workflows_index>

All in `workflows/`:

| Workflow | Purpose |
|----------|---------|
| kickoff.md | Start a new build — decompose, plan, begin milestone 1 |
| build-milestone.md | Build, test, verify one milestone, then reassess |
| continue.md | Resume an existing build from where it left off |
| execute.md | Execute architect-planned sprint — read task specs, parallelize, report completion |

</workflows_index>

<templates_index>

All in `templates/`:

| Template | Purpose |
|----------|---------|
| build-plan.md | Living plan document — the source of truth for the build |
| milestone-report.md | Per-milestone completion record |

</templates_index>

<success_criteria>
The ladder-build skill succeeds when:
- The end goal is defined and confirmed
- The project is decomposed into verifiable milestones
- Each milestone is built, tested, and verified before the next begins
- The build plan is kept current on disk after every milestone
- All milestone reports are saved to disk
- The user confirms each milestone before moving on
</success_criteria>
