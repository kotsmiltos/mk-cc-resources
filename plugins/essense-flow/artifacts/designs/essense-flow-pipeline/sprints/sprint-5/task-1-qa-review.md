> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** None
> **estimated_size:** M

# Task 1: Implement runQAReview

## Goal
Add the `runQAReview()` function to `skills/architect/scripts/architect-runner.js` — assembles briefs for 4 QA perspective agents (task compliance, requirements alignment, fitness functions, adversarial edge cases). This was defined in sprint 4's task spec but not implemented.

## Context
Read `essence/BRIEF-PROTOCOL.md` Section 6 (failure handling, quorum rules for review: n-1). Read `skills/architect/workflows/review.md` for the review workflow steps. Read `skills/research/scripts/research-runner.js` `assemblePerspectiveBriefs()` for the pattern to follow.

## Interface Specification

### Inputs
- `sprintNumber` — completed sprint number
- `taskSpecPaths` — array of paths to task spec .md files
- `builtFilePaths` — array of paths to files built during the sprint
- `requirementsPath` — path to REQ.md
- `pluginRoot` — plugin root path
- `config` — pipeline config

### Outputs
- `{ ok: boolean, briefs: Array<{ perspectiveId, agentId, briefId, brief }>, error? }`
- 4 briefs: task-compliance, requirements-alignment, fitness-functions, adversarial-edge-cases

## Pseudocode

```
FUNCTION runQAReview(sprintNumber, taskSpecPaths, builtFilePaths, requirementsPath, pluginRoot, config):
  1. Define 4 QA perspectives:
     - task-compliance: check acceptance criteria against built code
     - requirements-alignment: verify sprint serves original requirements
     - fitness-functions: check architectural properties preserved
     - adversarial: try to break the built code
  2. For each perspective:
     a. Generate briefId and agentId
     b. Build brief body with perspective-specific instructions
     c. Inline task spec paths and built file paths (wrapped in data-block)
     d. Check token budget
  3. Return { ok: true, briefs }
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/architect/scripts/architect-runner.js` | MODIFY | Add `runQAReview` function and export |
| `tests/architecture-integration.test.js` | MODIFY | Add test for `runQAReview` |

## Acceptance Criteria

- [ ] `runQAReview` returns 4 briefs with distinct perspective IDs
- [ ] Each brief includes the sprint number, task spec paths, and built file paths
- [ ] Each brief has a unique briefId and agentId
- [ ] Brief content follows the QA agent prompt patterns from `workflows/review.md`
- [ ] Exported from `architect-runner.js`
- [ ] Integration test verifies 4 briefs are produced
