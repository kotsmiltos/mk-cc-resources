---
artifact: architecture
schema_version: 1
produced_by: architecture
consumed_by:
  - build
  - review
---

## System Overview

{{SYSTEM_OVERVIEW}}

```
{{ARCHITECTURE_DIAGRAM}}
```

## Module Definitions

### {{MODULE_NAME}}

- **Purpose**: {{MODULE_PURPOSE}}
- **Responsibilities**: {{MODULE_RESPONSIBILITIES}}
- **Public API**: {{MODULE_API}}

## Interface Contracts

### {{INTERFACE_NAME}}

- **Provider**: {{PROVIDER_MODULE}}
- **Consumer**: {{CONSUMER_MODULE}}
- **Contract**: {{CONTRACT_DESCRIPTION}}

## Dependency Order

1. {{MODULE_NAME}} — no dependencies
2. {{MODULE_NAME}} — depends on: {{DEPENDENCY_LIST}}

## Requirement Traceability

| Requirement | Task        | Status       |
|-------------|-------------|--------------|
| FR-001      | TASK-001    | {{STATUS}}   |
| FR-002      | TASK-002    | {{STATUS}}   |

## Sprint Plan

### Sprint {{SPRINT}}

| Task       | Module           | Depends On   | Estimate     |
|------------|------------------|--------------|--------------|
| TASK-001   | {{MODULE_NAME}}  | []           | {{ESTIMATE}} |
| TASK-002   | {{MODULE_NAME}}  | [TASK-001]   | {{ESTIMATE}} |

## Decisions Referenced

- **{{DECISION_ID}}** — {{DECISION_SUMMARY}}
