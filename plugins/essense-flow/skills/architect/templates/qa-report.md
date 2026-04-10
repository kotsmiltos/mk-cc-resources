---
artifact: qa-report
schema_version: 1
sprint: "{{SPRINT}}"
verdict: "{{VERDICT}}"
---

## Acceptance Criteria Verification

| Task       | Criterion                | Result   | Evidence             |
|------------|--------------------------|----------|----------------------|
| {{TASK_ID}} | {{CRITERION}}           | {{RESULT}} | {{EVIDENCE}}       |

## Requirements Alignment

| Requirement | Satisfied | Notes                |
|-------------|-----------|----------------------|
| FR-001      | {{YES_NO}} | {{NOTES}}           |

## Fitness Function Results

| Fitness ID    | Assertion              | Result   | Details              |
|---------------|------------------------|----------|----------------------|
| {{FITNESS_ID}} | {{ASSERTION}}         | {{RESULT}} | {{DETAILS}}        |

## Adversarial Findings

- {{FINDING_DESCRIPTION}}

## Auto-Fixed Issues

- {{ISSUE_DESCRIPTION}}

## Escalations

- {{ESCALATION_DESCRIPTION}}

<!-- QA_SENTINEL sprint:{{SPRINT}} verdict:{{VERDICT}} critical:N major:N minor:N -->
