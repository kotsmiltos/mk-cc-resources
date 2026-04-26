> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-4-consistency.md
> **sprint:** 4
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D9
> **open_questions:** none

# Task 4: Consistency Verifier

## Goal
Build the consistency verification module that checks sibling agent outputs for compatibility after each parallel batch. The verifier detects interface mismatches, dependency conflicts, naming collisions, contract gaps, and assumption divergence — the 5 categories defined in BRIEF-PROTOCOL.md Section 7.

## Context
Read `essence/BRIEF-PROTOCOL.md` Section 7 (Consistency Verification) for the full specification including the verifier brief structure, the 5 check categories, and the orchestrator response to verification results.

The consistency verifier runs after each batch of parallel agents completes. It's used by the architect skill (after perspective agent batches) and the build skill (after wave execution). This is a lib/-level module (D9).

Also read:
- `lib/agent-output.js` for output parsing patterns
- `lib/synthesis.js` for entity extraction patterns

## Interface Specification

### Inputs
- `siblingOutputs` — array of `{ agentId: string, payload: Object, meta: Object }` (parsed agent outputs from a batch)
- `expectedInterfaces` — optional map of expected contracts between siblings

### Outputs
- Verification result: `{ status: "PASS"|"FAIL", issues: [{ severity, category, agentsInvolved, description, evidence, suggestedResolution }] }`
- Issue categories: `interface-mismatch`, `dependency-conflict`, `naming-collision`, `contract-gap`, `assumption-divergence`

### Contracts with Other Tasks
- Task 6 (Architect skill) calls `verify()` after each perspective agent batch
- `lib/agent-output.js` provides parsed outputs as input
- Results feed into the architect's decision to proceed or halt

## Pseudocode

```
FUNCTION verify(siblingOutputs, expectedInterfaces):
  1. Extract structural elements from each sibling:
     - Interfaces defined (function signatures, data contracts)
     - Dependencies declared (imports, requires)
     - Names exported (functions, routes, events, tables)
     - Assumptions stated (about shared state, auth, error handling)
  2. For each check category:
     a. INTERFACE MISMATCHES:
        - For each pair of siblings that should interact:
          Compare expected input of one with actual output of the other
          Flag type mismatches, missing fields, required/optional conflicts
     b. DEPENDENCY CONFLICTS:
        - Collect all declared dependencies across siblings
          Flag incompatible versions, conflicting runtime assumptions
     c. NAMING COLLISIONS:
        - Collect all exported names across siblings
          Flag duplicates (same export name, route, event, table)
     d. CONTRACT GAPS:
        - For each sibling that references an interface:
          Check if any other sibling defines it
          Flag undefined references
     e. ASSUMPTION DIVERGENCE:
        - Extract assumptions from each sibling
          Compare for contradictions (e.g., one assumes JWT, another assumes sessions)
  3. Classify issues by severity:
     - "blocking" = structural incompatibility that prevents integration
     - "warning" = inconsistency that should be resolved but doesn't block
  4. Set status = "FAIL" if any blocking issues, else "PASS"
  5. Return { status, issues }

FUNCTION extractStructuralElements(payload):
  1. Parse payload sections for interface definitions, imports, exports
  2. Use keyword patterns to identify:
     - "expects", "receives", "returns" → interface contracts
     - "depends on", "requires", "imports" → dependencies
     - "exports", "exposes", "defines" → names
     - "assumes", "expects that" → assumptions
  3. Return { interfaces, dependencies, exports, assumptions }

FUNCTION formatVerificationReport(result):
  1. Produce markdown report with:
     - Overall status (PASS/FAIL)
     - Issue table: severity, category, agents involved, description
     - Evidence excerpts
     - Suggested resolutions
  2. Return formatted string
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/consistency.js` | CREATE | Verification logic: structural extraction, 5-category checks, severity classification |
| `lib/index.js` | MODIFY | Add `consistency` to barrel export |
| `tests/consistency.test.js` | CREATE | Unit tests for each check category, mixed scenarios, edge cases |

## Acceptance Criteria

- [ ] `verify()` returns `{ status: "PASS" }` when siblings have no conflicts
- [ ] `verify()` detects interface mismatches between siblings that should interact
- [ ] `verify()` detects naming collisions (same export name from different siblings)
- [ ] `verify()` detects contract gaps (referenced interface not defined by any sibling)
- [ ] `verify()` classifies issues as `blocking` or `warning`
- [ ] `verify()` returns `{ status: "FAIL" }` when blocking issues exist
- [ ] `formatVerificationReport()` produces readable markdown
- [ ] Pure functions, no LLM dependency (D9)

## Edge Cases

- **Single sibling:** No pairwise checks possible — always PASS
- **Empty payloads:** All checks return no issues (no data to conflict)
- **Siblings with no interfaces declared:** No interface mismatches detected (correctly — can't verify what isn't specified)
- **All siblings independent:** PASS with no issues

## Notes
The consistency verifier is the structural/mechanical complement to the synthesis lib's semantic analysis. Synthesis catches agreement/disagreement on content; the verifier catches incompatibilities in interfaces and contracts.
