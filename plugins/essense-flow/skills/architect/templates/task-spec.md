---
artifact: task-spec
schema_version: 1
id: "{{TASK_ID}}"
sprint: "{{SPRINT}}"
module: "{{MODULE}}"
depends_on: []
decisions_applied: []
---

## Objective

{{TASK_OBJECTIVE}}

## Interfaces

### Inputs

- {{INPUT_DESCRIPTION}}

### Outputs

- {{OUTPUT_DESCRIPTION}}

## Pseudocode

```
{{PSEUDOCODE}}
```

## Constraints

- {{CONSTRAINT_DESCRIPTION}}

## Acceptance Criteria

### Functional

- [ ] {{CRITERION}}

### Error Path

- [ ] {{CRITERION}}

### Boundary

- [ ] {{CRITERION}}

### Contract

- [ ] {{CRITERION}}

### Fitness

- [ ] {{FITNESS_ID}}: {{FITNESS_ASSERTION}}

## Edge Cases

- {{EDGE_CASE_DESCRIPTION}}

## Files to Create/Modify

| File                  | Action   | Purpose              |
|-----------------------|----------|----------------------|
| {{FILE_PATH}}         | create   | {{PURPOSE}}          |
| {{FILE_PATH}}         | modify   | {{PURPOSE}}          |

## Rationale

{{RATIONALE_DESCRIPTION}}

## Alternatives Considered

| Alternative            | Why Rejected             |
|------------------------|--------------------------|
| {{ALTERNATIVE}}        | {{REJECTION_REASON}}     |
