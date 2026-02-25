<template>

## Build Plan Template

Use this structure. The build plan is a **living document** — updated after every milestone.

```markdown
# Build Plan: [Project Name]

> **End Goal:** [2-4 sentences. What does the finished product look like? Who uses it? What does it do? This is the North Star — it doesn't change unless the user explicitly redefines it.]

> **Source:** [Path to miltiaze exploration, or "Direct build request", or other context]

---

## Status

- **Current milestone:** [N] — [name]
- **Completed:** [X] of [Y] milestones
- **Last updated:** [YYYY-MM-DD]

---

## Milestones

### Milestone 1: [Name] (S/M/L)
**Goal:** [What this milestone delivers]
**Done when:** [Testable criteria]
**Status:** completed | [YYYY-MM-DD] — [brief verification summary]

### Milestone 2: [Name] (S/M/L) *(current)*
**Goal:** [What this milestone delivers]
**Done when:** [Testable criteria]
**Status:** in progress

### Milestone 3: [Name] (S/M/L)
**Goal:** [What this milestone delivers]
**Done when:** [Testable criteria]
**Depends on:** [Milestone N, if any]
**Status:** pending

_(continue for all milestones)_

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
```

### Conventions

- **Status markers:** Use `completed`, `in progress`, `pending`, or `blocked` with a reason.
- **Milestone sizing:** S = single component/feature, M = a few connected components, L = a subsystem.
- **Discovered work:** Items here are unplanned. They either become milestones (if big enough) or get handled within the next relevant milestone (if small).
- **Refinement queue:** These are "make it better" items, not "make it work" items. They wait until the core is solid.
- **Decisions log:** Captures the WHY behind choices. When a future session picks up the build, this log prevents re-debating settled decisions.

</template>
