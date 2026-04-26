> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-1-alignment-fix.md
> **sprint:** 4
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** None
> **open_questions:** none

# Task 1: Fix Alignment Matrix First-Responder Bias

## Goal
Fix `buildAlignmentMatrix()` in `lib/synthesis.js` so that disagreement detection uses pairwise comparison instead of comparing all agents against the first responder. Currently the first agent is always marked AGREES and used as baseline, which corrupts majority detection when the first agent is the outlier.

## Context
Read `lib/synthesis.js` lines 165-210 (`buildAlignmentMatrix` and `contentAgreement`). The QA finding (H1) identified that if agents B+C agree with each other but disagree with agent A, both B and C are marked DISAGREES because A is the comparison baseline. This produces incorrect "split" classifications for items that should be "majority agreement."

## Interface Specification

### Inputs
- `entities` — array of `{ name, type, content, agentId }` (unchanged)

### Outputs
- Alignment matrix: `{ entityName: { type, positions: { agentId: AGREES|DISAGREES|SILENT }, contents: { agentId: content } } }` (unchanged structure)

### Contracts with Other Tasks
- `classifyPositions()` consumes this matrix — the fix should only change which agents get AGREES vs DISAGREES, not the matrix structure
- Synthesis integration tests may need updated expectations

## Pseudocode

```
FUNCTION buildAlignmentMatrix(entities):
  1. Group entities by name (existing logic — keep)
  2. Build initial matrix with all responding agents (existing logic — keep)
  3. For each entity with 2+ responding agents:
     a. Compute pairwise agreement between all responding pairs
        pairwise = {}
        For each pair (i, j) where i < j:
          pairwise[(i,j)] = contentAgreement(contents[i], contents[j])
     b. Cluster agents into agreement groups:
        - Start with each agent in its own group
        - Merge groups where agents agree (union-find or greedy)
     c. Find the largest group — these agents get AGREES
     d. All other responding agents get DISAGREES
  4. Return matrix
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/synthesis.js` | MODIFY | Replace first-responder comparison in `buildAlignmentMatrix` with pairwise clustering |
| `tests/synthesis.test.js` | MODIFY | Add test for 3-agent case where first agent is the outlier |
| `tests/research-integration.test.js` | CHECK | Verify existing integration tests still pass |

## Acceptance Criteria

- [ ] Given agents A="use MongoDB", B="use PostgreSQL", C="use PostgreSQL", B and C are marked AGREES, A is marked DISAGREES
- [ ] Given agents A="JWT auth", B="JWT tokens", C="JWT authentication" (all similar), all are marked AGREES
- [ ] Given agents A="approach X", B="approach Y" (2 agents, disagreeing), both can be DISAGREES or the classification falls to SPLIT — no baseline bias
- [ ] Existing synthesis tests still pass (no regression)
- [ ] Research integration tests still pass

## Edge Cases

- **2 agents, both disagree:** Both should be DISAGREES, classification becomes SPLIT (no majority possible)
- **3 agents, all different content:** All DISAGREES, classification becomes SPLIT
- **All agents agree:** All AGREES (no change from current behavior)
- **Single agent:** AGREES by default (unique insight, no comparison)

## Notes
QA finding H1 from sprint 3 review. The root cause is using the first agent as an implicit "correct" baseline rather than computing agreement symmetrically.
