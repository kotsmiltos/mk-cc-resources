---
workflow: architect-review
skill: architect
trigger: post-sprint
phase_requires: sprint-complete
phase_transitions: sprint-complete → reviewing → sprinting|complete
---

# Post-Sprint Review Workflow

## Prerequisites

- Sprint complete: `.pipeline/state.yaml` phase is `sprint-complete`
- Task specs exist for completed sprint
- Built artifacts exist (files created/modified during sprint)

## Steps

### 1. Gather Sprint Output
Read task specs, built files, and original requirements. Assemble PLANNED vs BUILT.

### 2. Spawn QA Agents
Launch 4 QA agents in parallel:
- **Task Spec Compliance:** Check each acceptance criterion against built code
- **Requirements Alignment:** Verify sprint output serves original requirements
- **Fitness Function Verification:** Check architectural properties preserved
- **Adversarial Edge Cases:** Try to break built code

### 3. Synthesize QA Results
Categorize findings by severity:
- **Critical:** Must fix before proceeding
- **High:** Fix in next sprint
- **Medium:** Add to Refactor Requests
- **Low:** Refinement queue

### 4. Apply Autonomous Fixes
For small, unambiguous, non-interface-changing fixes: apply and document.

### 5. Write QA Report
Save to `.pipeline/reviews/sprint-N/QA-REPORT.md`.

### 6. Update Plan
Update ARCH.md change log, risk register, refactor requests, fitness functions.

### 7. Plan Next Sprint
If more sprints remain: create task specs for next sprint. Otherwise: verify all requirements addressed.

### 8. Transition State
Move to next sprint phase or `complete`.

### 9. Report
Show user: QA result, issues found, fixes applied, next sprint summary.
