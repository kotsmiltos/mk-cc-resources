<process>

## Step 1: Find the Build Plan

Look for the build plan:
1. If the user specified a project name or path, look in `[cwd]/artifacts/builds/[project-slug]/BUILD-PLAN.md`
2. If not specified, list available build plans in `[cwd]/artifacts/builds/` and let the user choose
3. If no build plans exist, redirect to workflows/kickoff.md

## Step 2: Read Current State

Read the BUILD-PLAN.md. Identify:
- **End goal** — remind the user (and yourself) where we're heading
- **Completed milestones** — what's done
- **Current/next milestone** — where to pick up
- **Discovered work** — anything pending that surfaced during previous milestones
- **Refinement queue** — polish items waiting

Read the most recent milestone report for context on where things left off.

## Step 3: Present the State

"Picking up the **[Project Name]** build.

**End goal:** [end goal summary]

**Done so far:**
- [list completed milestones briefly]

**Next up:** Milestone [N]: **[Name]** — [goal]

[If discovered work exists: '[N] items in the discovered work queue.']
[If refinement items exist and core is nearly done: '[N] refinement items ready to become milestones.']

Continuing with milestone [N]."

## Step 4: Route to Build

Transition to workflows/build-milestone.md for the current milestone.

</process>
