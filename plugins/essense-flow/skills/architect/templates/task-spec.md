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

## Files to Create/Modify

| File          | Action           | Purpose        |
|---------------|------------------|----------------|
| {{FILE_PATH}} | create\|modify   | {{PURPOSE}}    |

## Acceptance Criteria

- [ ] {{CRITERION}}

<!--
Include sections below ONLY when they carry load. Omit for mechanical edits
(rename, single-function change, typo fix) where they would be empty or duplicate
the objective.

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

## Edge Cases
- {{EDGE_CASE_DESCRIPTION}}

## Rationale
{{RATIONALE_DESCRIPTION}}

## Alternatives Considered
| Alternative     | Why Rejected         |
|-----------------|----------------------|
| {{ALTERNATIVE}} | {{REJECTION_REASON}} |
-->
