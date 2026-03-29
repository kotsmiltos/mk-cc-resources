<template>

Use this structure for PLAN.md — the architect's living master plan. This is the "Jira board" equivalent. Updated after every sprint.

Save to: `artifacts/designs/[slug]/PLAN.md`

```markdown
> **type:** plan
> **output_path:** artifacts/designs/[slug]/PLAN.md
> **source:** [Path to miltiaze requirements/exploration, or audit report, or "Direct request"]
> **created:** [YYYY-MM-DD]
> **key_decisions:** [from Decisions Log — list decision IDs, e.g., D1, D2, D5]
> **open_questions:** [unresolved items requiring user input, or "none"]

# Plan: [Feature/Project Name]

## Vision
[From miltiaze or user — what we're building and why, in the client's terms. 2-4 sentences. This is the North Star.]

## Architecture Overview
[Mermaid diagram — the big picture. Updated as understanding evolves.]

```mermaid
graph TD
    A[Module A] --> B[Module B]
    A --> C[Module C]
```

## Module Map
[For each module/component in the architecture:]

| Module | Purpose | Key Files | Dependencies | Owner (Sprint) |
|--------|---------|-----------|-------------|----------------|
| [Name] | [What it does] | [File paths] | [What it depends on] | Sprint N |

## Sprint Tracking

| Sprint | Tasks | Completed | QA Result | Key Changes | Boundary Rationale |
|--------|-------|-----------|-----------|-------------|-------------------|
| 1 | 3 | 3/3 | PASS (1 note) | [Brief summary] | Scope boundary: [independently verifiable capability] |
| 2 | 3 | 1/3 | — | [Brief summary] | Decision gate: [what must be verified before continuing] |
| 3 | TBD | — | — | Scoped after sprint 2 review | Context limit: [why context health requires a break here] |

## Task Index

| Task | Sprint | File | Depends On | Blocked By |
|------|--------|------|-----------|------------|
| [Task name] | N | [Path to task spec] | [Task IDs] | [Blocker description] |

## Interface Contracts
[Key interfaces between modules — data that flows between components.]

| From | To | Contract | Format |
|------|----|----------|--------|
| [Module A] | [Module B] | [What data passes] | [Structure/schema] |

## Decisions Log

| # | Decision | Choice | Rationale | Alternatives Considered | Date |
|---|----------|--------|-----------|------------------------|------|
| 1 | [What was decided] | [The choice made] | [Why — context, tradeoffs] | [What else was considered] | YYYY-MM-DD |

## Refactor Requests

| From Sprint | What | Why | Scheduled In | Status |
|-------------|------|-----|-------------|--------|
| [Sprint N] | [What needs refactoring] | [Why — QA finding or architect assessment] | [Sprint M] | pending/done |

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|--------|-----------|--------|
| [What could go wrong] | Low/Med/High | Low/Med/High | [How to prevent or handle] | Active/Mitigated/Closed |

## Change Log

| Date | What Changed | Why | Impact on Remaining Work |
|------|-------------|-----|-------------------------|
| YYYY-MM-DD | [What was amended] | [Why the change was needed] | [How it affects upcoming sprints] |

## Adversarial Assessment
[State 3+ specific ways this plan could fail. For each: name the failure mode, which sprint it affects, and what the mitigation is. Include at least one scenario where the plan's own assumptions are wrong.]

| # | Failure Mode | Affected Sprint(s) | Mitigation | Assumption at Risk |
|---|-------------|--------------------|-----------|--------------------|
| 1 | [Specific way this plan could fail] | Sprint N | [How to prevent or recover] | [Which plan assumption breaks if this happens] |
| 2 | [Specific way this plan could fail] | Sprint N | [How to prevent or recover] | [Which plan assumption breaks] |
| 3 | [Specific way this plan could fail] | Sprint N | [How to prevent or recover] | [Which plan assumption breaks] |

[Do NOT produce generic risks ("timeline might slip"). Each failure mode must be specific to THIS plan — name the module, the interface, the decision, or the dependency that fails. If you can't name specifics, the plan isn't detailed enough to assess.]

## Fitness Functions
[Machine-checkable assertions about architectural properties. Used by QA agents for verification.]

- [ ] [Property assertion — e.g., "Module A never imports from Module B internals"]
- [ ] [Property assertion — e.g., "Every task spec has a pseudocode section"]
- [ ] [Property assertion — e.g., "All public interfaces have type annotations"]
```

</template>

<conventions>
- **QA results:** PASS, PASS (N notes), FAIL (N issues), BLOCKED.
- **Decisions Log:** Entries are never deleted. The history of decisions IS the architectural context. Include alternatives considered — future sessions need to know what was rejected and why.
- **Change Log:** Every amendment is tracked. Nothing changes without a record.
- **Fitness Functions:** These become the QA team's automated verification criteria. Write them as assertions that can be checked by reading the code.
- **Mermaid diagrams:** Keep them simple — C4 Level 1-2. GitHub renders natively. Update after each sprint if the architecture evolved.
</conventions>
