# Extraction brief

You are extracting design decisions from `{{spec_path}}` and `{{arch_path}}` for verification.

## Your job

Walk SPEC.md and ARCH.md top-down. For every design decision (problem-statement claim, goal, constraint, design choice, abstraction introduced, module boundary), emit one item conforming to the shape declared below.

## Required output

A YAML list of items; each item carries these required fields:

```yaml
item_id: <slug>
source: spec | arch | decision
description: "<what was decided>"
locator_hint: "<where in code this should live>"
expected_behavior: "<what should be true>"
acceptance_criteria:
  - "<testable check>"
```

Required-field heads (the consuming agent `essense-flow-extractor` echoes the same field set under its `## Returns`):

1. **item_id** — unique slug per item.
2. **source** — one of `spec | arch | decision`.
3. **description** — what was decided.
4. **locator_hint** — your guess at where in code this should live.
5. **expected_behavior** — what should be true.
6. **acceptance_criteria** — list of testable checks.

## Discipline

- Be thorough. Every decision = one item. No "obvious" item is too obvious to extract.
- The `locator_hint` is your guess at where to look in code. Be specific (file path, function name, module).
- Prefer concrete `acceptance_criteria` over abstract ones. "User can log in" → "POST /login with valid creds returns 200 + session token."

End with the sentinel line on its own:

{{sentinel}}
