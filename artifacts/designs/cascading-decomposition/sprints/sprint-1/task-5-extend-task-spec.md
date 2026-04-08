> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/task-5-extend-task-spec.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D6
> **open_questions:** none

# Task 5: Extend task-spec.md with Hierarchy Fields

## Goal
Add `parent_task`, `children`, `decomposition_level`, and `traces_to` fields to the existing task-spec template. This makes task specs hierarchy-aware while remaining backward-compatible — existing task specs without these fields are implicitly level 0 with no parent.

## Context
- The existing task-spec.md template is well-established and used by both architect and ladder-build
- Per D6: backward compatibility — existing task specs must continue to work unchanged
- The new fields enable: parent-child task relationships, depth tracking, and requirement traceability
- Read the current template: `plugins/architect/skills/architect/templates/task-spec.md`

## Interface Specification

### Inputs
- Existing task-spec.md template

### Outputs
- Extended template with 4 new metadata fields + a Traceability section

### Contracts with Other Tasks
- T2 (agent brief templates) — the .agent.md implementation brief is the machine counterpart to this human-facing spec
- T4 (scope-decomposition reference) — the traces_to field implements the WBS 100% rule

## Pseudocode

```
ADD to YAML frontmatter (after existing fields):
  parent_task: [Task ID of parent, or "None" for top-level tasks]
  children: [Comma-separated task IDs, or "None" for leaf tasks]
  decomposition_level: [0, 1, 2, ... — depth in the hierarchy. Default 0 for non-cascade tasks]
  traces_to: [Parent acceptance criterion this task satisfies]

ADD new section after "Contracts with Other Tasks":
  ## Traceability
  This task traces to the following parent requirement(s):
  - [Parent module/component] criterion: "[quoted acceptance criterion]"
  - How this task satisfies it: [explanation]
  
  [If this is a leaf task, traces_to links to the parent component's acceptance criteria.
   If this is a mid-level task, traces_to links to the parent module's acceptance criteria.
   This chain enables the WBS 100% rule: every parent criterion has children covering it.]

MODIFY the conventions section at the bottom:
  Add note: "Fields parent_task, children, decomposition_level, and traces_to are optional.
  When absent, the task is treated as level 0 with no parent (backward-compatible with
  non-cascade projects). When present, they enable hierarchical decomposition tracking."
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/task-spec.md` | MODIFY | Add 4 metadata fields to YAML frontmatter, add Traceability section, update conventions |

## Acceptance Criteria
- [ ] task-spec.md template contains `parent_task`, `children`, `decomposition_level`, `traces_to` in the frontmatter
- [ ] All 4 new fields have default values documented ("None" or "0")
- [ ] A new "Traceability" section exists between "Contracts with Other Tasks" and "Pseudocode"
- [ ] Conventions section explains backward compatibility (fields optional, absence = level 0)
- [ ] Existing sections (Goal, Context, Interface Specification, Pseudocode, Files Touched, Acceptance Criteria, Edge Cases, Notes) are unchanged
- [ ] Template still renders as valid markdown

## Edge Cases
- Non-cascade task spec: all 4 new fields absent — template works identically to current version
- Root-level task in cascade: parent_task = None, children = T1.1, T1.2, decomposition_level = 0
- Leaf task: children = None, traces_to points to parent's acceptance criterion
