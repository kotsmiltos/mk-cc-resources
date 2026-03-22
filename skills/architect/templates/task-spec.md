<template>

Use this structure for individual task specifications. Each task is a self-contained contract — a developer (ladder-build) should be able to build from this spec alone without asking the architect for clarification.

Save to: `artifacts/designs/[slug]/sprints/sprint-N/task-K-[short-name].md`

```markdown
# Task [K]: [Short Descriptive Name]

> **Sprint:** [N]
> **Status:** planned | in-progress | done | blocked
> **Depends on:** [Task IDs that must complete first, or "None"]
> **Estimated size:** S | M | L
> **Plan:** [Relative path to PLAN.md]

## Goal
[One paragraph — what this task delivers and why it matters in the context of the overall plan. A developer reading only this section should understand the purpose.]

## Context
[What the developer needs to know before starting. References to relevant modules, existing patterns to follow, prior decisions that constrain this work. Include paths to existing files they should read first.]

## Interface Specification
[What goes in, what comes out. Data contracts with other modules/tasks.]

### Inputs
- [What this task receives — file paths, data structures, function signatures]

### Outputs
- [What this task produces — files created, data returned, side effects]

### Contracts with Other Tasks
- [Task M] provides [what] → this task consumes it as [how]
- This task produces [what] → [Task P] will consume it as [how]

## Pseudocode
[Step-by-step logic in plain language with enough specificity to implement directly. Not actual code — but close enough that translating to code is mechanical, not creative.]

```
FUNCTION do_the_thing(input):
    1. Read [specific file/data]
    2. For each [item] in [collection]:
       a. Extract [specific fields]
       b. Validate [specific conditions]
       c. If [condition], then [action]
    3. Write result to [specific location]
    4. Return [specific structure]
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `path/file.ext` | CREATE | [What this new file contains] |
| `path/existing.ext` | MODIFY | [What specifically changes — which functions, sections, fields] |
| `path/other.ext` | CHECK | [Coupled file — verify consistency, may not need changes] |

## Acceptance Criteria
[Testable conditions that must ALL be true for this task to be done. Write them as assertions.]

- [ ] [Specific, testable criterion — "Function X returns Y when given Z"]
- [ ] [Specific, testable criterion — "File exists at path with sections A, B, C"]
- [ ] [Specific, testable criterion — "Module A does not import from Module B internals"]
- [ ] [Edge case — "Handles empty input gracefully with error message"]
- [ ] [Integration — "Works correctly with output from Task M"]

## Edge Cases
[Things that could go wrong or need special handling. The developer should handle these, and QA will test for them.]

- [Edge case 1 — what happens and what the correct behavior is]
- [Edge case 2 — what happens and what the correct behavior is]

## Notes
[Anything else — design rationale, rejected approaches, warnings, links to relevant exploration sections.]
```

</template>

<conventions>
- **Goal section:** Answer "what" and "why" — never just "what."
- **Pseudocode:** Specific enough to translate to code mechanically. Reference actual file paths, function names, data structures. If the pseudocode requires creative decisions, the spec is too vague — add more detail.
- **Files Touched:** Every file this task creates, modifies, or needs to check for consistency. This is the task's impact trace.
- **Acceptance Criteria:** Written as checkboxes. QA agents will check every one. If a criterion can't be tested, rewrite it until it can.
- **Edge Cases:** Don't just list them — describe the correct behavior for each. This is what QA will test adversarially.
- **Size estimates:** S = one function/file, M = a few connected pieces, L = a subsystem. If a task is L, consider splitting it.
</conventions>
