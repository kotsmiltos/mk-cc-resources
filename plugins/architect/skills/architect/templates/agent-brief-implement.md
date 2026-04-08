<template>

Use this structure for implementation agent briefs — the machine-optimized contract given to agents that build leaf tasks (actual code). The agent implements EXACTLY what this brief specifies: no more, no less, no creative decisions.

Format: YAML frontmatter for structured data, XML section tags for boundaries. Constraints are front-loaded (first section) for primacy bias.

Save to: `artifacts/scope/modules/[module]/tasks/[task-id].agent.md` (module-level task)
     or: `artifacts/scope/modules/[module]/components/[component]/tasks/[task-id].agent.md` (component-level task)

Sibling file: A corresponding `.md` with the same name contains human-facing rationale. The `source_hash` field links them for drift detection.

```
---
# === YAML FRONTMATTER — structured data, parsed by downstream consumers ===
type: agent-brief
purpose: implement
task: "[task ID — e.g., mod-parser-t1]"
module: "[module name — e.g., parser]"
component: "[component name, or 'none' if module-level task]"
source_hash: "[SHA-256 of the corresponding .md file — validates brief has not drifted from rationale doc]"
---

<!-- Section order is deliberate: constraints first (primacy bias), contract last -->

<constraint>
<!-- PURPOSE: Hard rules the agent must follow. Front-loaded because constraints
     read first are followed most reliably (primacy bias).
     FILL IN: Positive-framed rules. Use SECURITY: prefix for necessary negation (per D7).
     CONSUMERS: Agent checks these before and during implementation.
     RULE: Default to positive framing — state what TO DO, not what to avoid. -->

<!-- Positive-framed constraints (default) -->
- USE Python 3.10+ syntax exclusively
- FOLLOW the Result wrapper pattern for all fallible operations
- IMPORT only from the approved dependency list in system-map
- LIMIT each function to a single responsibility with <=50 lines

<!-- SECURITY: prefix — allowed to use negation for security-critical prohibitions -->
- SECURITY: credentials and secrets must remain outside source files at all times
- SECURITY: user-supplied input must pass through the validation layer before processing
</constraint>

<read_first>
<!-- PURPOSE: Files the agent MUST read before writing any code.
     FILL IN: Paths to existing source files, patterns, interfaces the agent needs to understand.
     CONSUMERS: Agent reads these in order before starting implementation.
     RULE: Keep this list minimal — only files directly relevant to THIS task. -->

- "src/models/types.py" — shared type definitions used by this task's interfaces
- "src/patterns/result.py" — Result wrapper pattern implementation to follow
- "artifacts/scope/architecture/patterns/error-handling.md" — error handling conventions
</read_first>

<interface>
<!-- PURPOSE: EXACT function signatures the agent must implement — nothing more, nothing less.
     FILL IN: One block per function. Steps are mechanical (translatable to code without decisions).
     CONSUMERS: Verification checks these signatures exist in the output.
     TAG: Each function uses <function> sub-element for structured parsing. -->

<function>
  name: parse_input
  params:
    - name: raw_data
      type: bytes
    - name: schema
      type: SchemaDefinition
  returns:
    type: "Result[ParsedInput, ParseError]"
    description: "Parsed and validated input, or structured error"
  steps:
    1. Decode raw_data as UTF-8
    2. Split into records using schema.delimiter
    3. For each record, validate field count matches schema.fields length
    4. For each field, apply schema.fields[i].validator
    5. Collect valid records into ParsedInput.records
    6. If any record fails validation, return Result.err with field-level errors
    7. Return Result.ok with populated ParsedInput
</function>

<function>
  name: validate_field
  params:
    - name: value
      type: str
    - name: validator
      type: FieldValidator
  returns:
    type: "Result[ValidatedField, FieldError]"
    description: "Validated field value or structured error with position info"
  steps:
    1. Apply validator.type_check to value
    2. If type_check fails, return Result.err with FieldError(position, expected, actual)
    3. Apply validator.range_check if present
    4. Return Result.ok with ValidatedField(value, validator.field_name)
</function>
</interface>

<files>
<!-- PURPOSE: Exact files to create or modify — the agent's output manifest.
     FILL IN: One entry per file. For MODIFY, specify which section/function changes.
     CONSUMERS: Orchestrator verifies these files exist/changed after agent completes. -->

<file>
  path: "src/parser/core.py"
  action: CREATE
  description: "Main parser module — contains parse_input and validate_field functions"
</file>

<file>
  path: "src/parser/__init__.py"
  action: CREATE
  description: "Package init — exports parse_input as public API"
</file>

<file>
  path: "src/models/types.py"
  action: MODIFY
  description: "Add ParsedInput and ParseError dataclasses to existing type definitions"
</file>

<file>
  path: "tests/test_parser.py"
  action: CHECK
  description: "Verify existing test expectations still hold after types.py modification"
</file>
</files>

<verify>
<!-- PURPOSE: Testable conditions the agent must satisfy. Each assertion is machine-checkable.
     FILL IN: Assertions (pass/fail conditions) and edge cases (input + expected behavior).
     CONSUMERS: Verification agent checks every assertion. QA tests every edge case. -->

<assertion>parse_input returns Result.ok for valid input matching schema</assertion>
<assertion>parse_input returns Result.err with field-level errors for invalid input</assertion>
<assertion>validate_field returns Result.err when type_check fails, with position info</assertion>
<assertion>ParsedInput.records is never empty on Result.ok path</assertion>
<assertion>All public functions have type annotations on params and return</assertion>

<edge_case>
  input: "Empty bytes (b'')"
  expected: "Result.err with ParseError indicating empty input"
</edge_case>

<edge_case>
  input: "Valid header row but zero data records"
  expected: "Result.err with ParseError indicating no data records"
</edge_case>

<edge_case>
  input: "Record with more fields than schema defines"
  expected: "Result.err with FieldError for each extra field, position preserved"
</edge_case>
</verify>

<contract>
<!-- PURPOSE: Dependency chain — what this task receives and provides, and from/to whom.
     FILL IN: Upstream tasks (receives) and downstream tasks (provides).
     CONSUMERS: Orchestrator uses this for task ordering and verification.
     NOTE: If this task has no upstream dependencies, write:
           receives: none
           Then list what it provides. -->

receives:
  - from: "mod-types-t1"
    what: "SchemaDefinition and FieldValidator types in src/models/types.py"

provides:
  - to: "mod-transform-t1"
    what: "ParsedInput structure — downstream transform module consumes parse_input output"
  - to: "mod-cli-t2"
    what: "parse_input function — CLI module calls this as entry point"
</contract>
```

</template>

<conventions>
- **Constraints come first.** The `<constraint>` section is the first XML section because constraints read first are followed most reliably (primacy bias). Moving it later in the document measurably reduces compliance.
- **Positive framing by default (D7).** Write "USE X" not "don't use Y". Write "FOLLOW pattern Z" not "avoid pattern W". The only exception: `SECURITY:` prefix allows negation for security-critical prohibitions where the negative form is genuinely clearer.
- **SECURITY: prefix convention.** Lines starting with `SECURITY:` are the ONLY place negation ("must not", "never") is permitted. This makes security constraints scannable and keeps the rest of the brief positive-framed.
- **Interface signatures are exact.** The agent implements these signatures verbatim. If the signature is wrong in the brief, the implementation will be wrong. Review interface sections carefully.
- **Steps are mechanical.** Each step should translate to 1-3 lines of code without requiring the agent to make design decisions. If a step says "figure out the best way to...", the spec is too vague.
- **Contract section can have empty receives.** Write `receives: none` for tasks with no upstream dependencies. The provides list should still enumerate all downstream consumers.
- **Downstream consumers parse these tags by name.** The verification agent checks `<verify>` assertions. The orchestrator reads `<files>` for manifest validation. The assembly algorithm reads `<constraint>` and `<contract>`. Tag names are part of the contract — renaming them breaks downstream consumers.
- **source_hash links .md and .agent.md.** If the human-facing .md changes without updating the .agent.md, the hash mismatch flags the brief as stale. This prevents silent drift between rationale and contract.
</conventions>
