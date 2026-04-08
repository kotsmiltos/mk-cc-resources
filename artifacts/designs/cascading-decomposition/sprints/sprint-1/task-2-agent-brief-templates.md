> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-1/task-2-agent-brief-templates.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D4, D7
> **open_questions:** none

# Task 2: Create Agent Brief Templates

## Goal
Create the .agent.md template format — the machine-optimized document that Claude agents receive as their execution contract. Two variants: one for decomposition agents (breaking things down) and one for implementation agents (building leaf tasks). These templates define THE format that prevents laziness, hallucination, and arbitrary decisions.

## Context
- Per D4: Decomposition agents co-author both .md and .agent.md in one pass
- Per D7: Positive framing by default. SECURITY: prefix allows negation.
- Research findings: YAML for data (17%+ accuracy advantage), XML tags for section boundaries (Anthropic-recommended), constraints front-loaded (primacy bias), minimal content (every token competes for attention)
- Read existing format conventions: `plugins/architect/skills/architect/templates/task-spec.md` (current human-facing format)

## Interface Specification

### Inputs
- The templates are used by the scope-decompose workflow when instructing agents what output format to produce
- The templates are used by the brief assembly logic when constructing assembled briefs

### Outputs
- .agent.md files in the scope/ directory tree, consumed by downstream agents and ladder-build

### Contracts with Other Tasks
- T1 (INDEX.md) defines the status values referenced in agent brief metadata
- T4 (scope-decomposition reference) defines the assembly algorithm that combines multiple .agent.md files into one brief
- T6 (consistency check) uses agent brief format for its input

## Pseudocode

```
DECOMPOSITION AGENT BRIEF (.agent.md for module/component decomposition):

YAML FRONTMATTER:
  type: agent-brief
  purpose: decompose-module | decompose-component
  target: [module or component name]
  level: [decomposition level number]
  scope_root: [path to scope/ directory]
  source_hash: [SHA-256 of corresponding .md file — for drift detection per Adversarial #2]

XML SECTIONS (in this exact order — constraints first for primacy bias):
  <context>
    Project summary (1-3 sentences from project-brief.agent.md)
    Architecture constraints (from system-map.agent.md)
  </context>

  <scope name="[target]">
    What this module/component owns
    What its boundaries are
    What it explicitly does NOT own
  </scope>

  <interfaces>
    Interface contracts with adjacent modules
    Each contract: name, direction (provides/consumes), signature, guarantees
  </interfaces>

  <patterns>
    Relevant cross-cutting patterns with concrete code examples
    Only patterns this module needs — not all patterns
  </patterns>

  <decisions>
    Relevant decisions (ID + outcome only, no rationale)
    Only decisions constraining this module
  </decisions>

  <task>
    What to decompose, to what level of detail
    Stopping criteria (<=250 lines = leaf, score >=5 = decompose further)
    Output file locations and naming conventions
  </task>

  <output_format>
    What files to write and where
    Reminder to produce BOTH .md (with rationale) and .agent.md (contract only)
  </output_format>

---

IMPLEMENTATION AGENT BRIEF (.agent.md for leaf task execution):

YAML FRONTMATTER:
  type: agent-brief
  purpose: implement
  task: [task ID]
  module: [module name]
  component: [component name, if applicable]
  source_hash: [SHA-256 of corresponding .md]

XML SECTIONS (constraints first):
  <constraint>
    Positive-framed rules: "USE ONLY X", "FOLLOW pattern Y"
    SECURITY: prefixed items may use negation
    Technology constraints, import restrictions, pattern requirements
  </constraint>

  <read_first>
    File paths the agent must read before implementing
    Existing code to understand, patterns to follow
  </read_first>

  <interface>
    Each function to implement:
      name, params (name + type), returns (type + description)
      Steps (numbered, mechanical)
    These are the EXACT signatures — agent implements these, nothing more
  </interface>

  <files>
    Each file to create or modify:
      path, action (CREATE/MODIFY/CHECK), description
    For MODIFY: specify what section/lines change
  </files>

  <verify>
    Assertions (testable conditions, each a separate <assertion> element)
    Edge cases (input + expected behavior, each a separate <edge_case> element)
  </verify>

  <contract>
    What this task receives from other tasks (with source task ID)
    What this task provides to other tasks (with consuming task ID)
  </contract>
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/agent-brief-decompose.md` | CREATE | Decomposition agent brief template |
| `plugins/architect/skills/architect/templates/agent-brief-implement.md` | CREATE | Implementation agent brief template |

## Acceptance Criteria
- [ ] Both template files exist at the specified paths
- [ ] YAML frontmatter in both templates is valid YAML
- [ ] XML section tags are well-formed (every opening tag has a closing tag)
- [ ] Decomposition template sections are in order: context, scope, interfaces, patterns, decisions, task, output_format
- [ ] Implementation template sections are in order: constraint, read_first, interface, files, verify, contract
- [ ] Constraint section uses positive framing by default with SECURITY: exception documented
- [ ] source_hash field is documented in YAML frontmatter
- [ ] Both templates include inline comments explaining each section's purpose and what to fill in
- [ ] Templates reference the specific tag names that downstream consumers will parse

## Edge Cases
- Module with no adjacent contracts: interfaces section can be empty with a note "no cross-module interfaces"
- Leaf task with no dependencies: contract section has "receives: none" and provides list
- SECURITY: constraint: template shows example of both positive and SECURITY:-prefixed negative constraints
