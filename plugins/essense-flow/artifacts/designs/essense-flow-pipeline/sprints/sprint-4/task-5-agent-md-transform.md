> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-5-agent-md-transform.md
> **sprint:** 4
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D4
> **open_questions:** none

# Task 5: .md to .agent.md Transform

## Goal
Build the deterministic transform that generates `.agent.md` files from `.md` source files (Decision D4). The transform strips rationale and alternatives (human context) while preserving all implementation-relevant content (pseudocode, interfaces, acceptance criteria, edge cases). This eliminates the drift problem of maintaining two representations.

## Context
Read `artifacts/designs/essense-flow-pipeline/PLAN.md` Decision D4: "Generate from .md via deterministic transform — single source of truth. Eliminates sync problem entirely."

Read `essence/BRIEF-PROTOCOL.md` Section 1 for the universal brief template structure — the `.agent.md` output should follow this format with attention-optimized block ordering.

Read the existing task spec template at `skills/architect/templates/task-spec.md` for the source format. The transform converts this human-readable format into a machine-executable agent brief.

## Interface Specification

### Inputs
- Source `.md` file path (task spec in human-readable format)
- Architecture context (optional: ARCH.md sections relevant to this task)
- Config for token budget enforcement

### Outputs
- `.agent.md` file content: structured agent brief with:
  - Block 1: Identity (role + scope)
  - Block 2: Hard constraints (positive-only, from spec's constraints + edge cases)
  - Block 3: Context (inlined dependencies, interface contracts)
  - Block 4: Task instructions (from pseudocode)
  - Block 5: Output format spec
  - Block 6: Acceptance criteria (repeated from source)
  - Block 7: Completion sentinel

### Contracts with Other Tasks
- Task 6 (Architect skill) calls this transform during sprint planning
- Sprint 5 (Build skill) reads the `.agent.md` files as agent briefs
- `lib/brief-assembly.js` provides the data-block wrapping and token budget checking

## Pseudocode

```
FUNCTION transformToAgentMd(sourceSpec, architectureContext, config):
  1. Parse source spec:
     a. Extract frontmatter (type, sprint, depends_on, etc.)
     b. Extract sections: Goal, Context, Interface Spec, Pseudocode,
        Files Touched, Acceptance Criteria, Edge Cases, Notes
  2. Strip human-only content:
     - Remove: Notes section (rationale, alternatives, design history)
     - Remove: "Why" explanations in Goal (keep only "What")
     - Remove: Markdown formatting that doesn't aid comprehension
  3. Transform to agent brief blocks:
     Block 1 (IDENTITY):
       "You are implementing {task-id}: {goal-what}."
       "Your scope is limited to the files listed in Files Touched."
     Block 2 (CONSTRAINTS):
       - Convert edge cases to positive constraints
       - Extract "must"/"only"/"never" statements from pseudocode
       - Add file size backstop from config
     Block 3 (CONTEXT):
       - Inline interface spec inputs/outputs
       - Inline relevant architecture context (wrapped in data-block per D8)
       - Inline dependency contracts
     Block 4 (TASK INSTRUCTIONS):
       - Include pseudocode verbatim
       - Include Files Touched table
     Block 5 (OUTPUT FORMAT):
       Standard build output format:
       <implementation>, <files-written>, <deviations>, <verification>
     Block 6 (ACCEPTANCE CRITERIA):
       - Copy acceptance criteria verbatim
       - Add: "Verify each criterion after implementation"
     Block 7 (SENTINEL):
       <!-- SENTINEL:COMPLETE:{brief_id}:{agent_id} -->
  4. Check token budget via brief-assembly.checkBudget
  5. If over ceiling, flag for decomposition
  6. Return { ok, agentMd, tokenCount, warnings }

FUNCTION extractSections(markdown):
  1. Split by ## headers
  2. Map header name → content
  3. Return sections object

FUNCTION stripRationale(goalText):
  1. Remove sentences containing "because", "this matters", "in the context of"
  2. Keep actionable description
  3. Return stripped text
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/transform.js` | CREATE | Transform logic: section extraction, stripping, block assembly, budget check |
| `lib/index.js` | MODIFY | Add `transform` to barrel export |
| `tests/transform.test.js` | CREATE | Tests with fixture task specs → expected .agent.md output |

## Acceptance Criteria

- [ ] Given a task spec `.md` file, `transformToAgentMd` produces a valid `.agent.md` with all 7 brief blocks
- [ ] The Notes section is stripped from output
- [ ] Pseudocode is preserved verbatim in Block 4
- [ ] Acceptance criteria are preserved verbatim in Block 6
- [ ] Architecture context is wrapped in `<data-block>` delimiters (D8)
- [ ] Output includes completion sentinel placeholder
- [ ] Token budget is checked — oversized specs flagged for decomposition
- [ ] Transform is deterministic: same input always produces same output (except timestamp)
- [ ] `.agent.md` has a corresponding `.md` source (fitness function compliance)

## Edge Cases

- **Task spec missing optional sections (Notes, Edge Cases):** Transform succeeds with those blocks empty
- **Very large pseudocode section:** May push the brief over token ceiling — flag for decomposition
- **Task spec with no dependencies:** Context block contains only the task's own interface spec
- **Frontmatter missing fields:** Use sensible defaults, don't crash

## Notes
The transform is conservative per PLAN.md Adversarial Assessment #3: "strip rationale and alternatives, but preserve ALL implementation-relevant content." Test by comparing build quality from .agent.md vs .md directly.
