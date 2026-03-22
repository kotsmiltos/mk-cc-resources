<template>

Use this structure. The build plan is a living document — updated after every milestone.

```markdown
# Build Plan: [Project Name]

> **End Goal:** [2-4 sentences. What does the finished product look like? Who uses it? What does it do? This is the North Star — it doesn't change unless the user explicitly redefines it.]

> **Source:** [Path to miltiaze exploration, or "Direct build request", or other context]

---

## Milestones

### Milestone 1: [Name] (S/M/L)
**Goal:** [What this milestone delivers]
**Done when:** [Testable criteria]

### Milestone 2: [Name] (S/M/L) *(current)*
**Goal:** [What this milestone delivers]
**Done when:** [Testable criteria]

### Milestone 3: [Name] (S/M/L)
**Goal:** [What this milestone delivers]
**Done when:** [Testable criteria]
**Depends on:** [Milestone N, if any]

_(continue for all milestones)_

---

## Architecture Impact Summary
_(Filled during kickoff after reading CLAUDE.md Change Impact Map and/or context/cross-references.yaml. If the project has no architecture documentation, this section is populated via manual import/consumer analysis.)_

### Concerns touched:
<!-- List each architectural concern area this project affects -->
<!-- e.g., "Strategy Parameters: model.py, config.py, ui.py, cache.py" -->

### Full file manifest:
<!-- Every file that needs changes across ALL milestones -->
<!-- Each file gets a checkbox, checked when the milestone that handles it completes -->
<!-- This is the ground truth — every file must appear in at least one milestone -->
<!-- After all milestones complete, every checkbox must be checked -->
- [ ] `path/file.py` — what changes (Milestone N)

---

## Discovered Work
_(Items found during building that weren't in the original plan. Promote to milestones or resolve as they come.)_

- [ ] [Description] — found during milestone [N]

---

## Refinement Queue
_(Polish and improvement items for after core milestones. These become milestones themselves when the core is done.)_

- [ ] [Description]

---

## Decisions Log
_(Key decisions made during the build and why — so future sessions have context.)_

| Date | Decision | Reasoning |
|------|----------|-----------|
| [YYYY-MM-DD] | [What was decided] | [Why — context, tradeoffs considered] |

---

## Context Notes
_(Institutional memory that survives /clear. Decisions, rejected approaches, edge cases discovered during planning and building. A future session resuming this build should read this section to avoid re-debating settled questions or repeating failed approaches.)_

- [Date]: [What was learned/decided/rejected and why]
```

</template>

<conventions>
- Milestone sizing: S = single component/feature, M = a few connected components, L = a subsystem.
- Discovered work: Items here are unplanned. They either become milestones (if big enough) or get handled within the next relevant milestone (if small).
- Refinement queue: These are "make it better" items, not "make it work" items. They wait until the core is solid.
- Decisions log: Captures the WHY behind choices. When a future session picks up the build, this log prevents re-debating settled decisions.
</conventions>
