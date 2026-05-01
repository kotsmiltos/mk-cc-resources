# Extraction brief

You are extracting design decisions from `{{spec_path}}` and `{{arch_path}}` for verification.

## Your job

Walk SPEC.md and ARCH.md top-down. For every design decision (problem-statement claim, goal, constraint, design choice, abstraction introduced, module boundary), emit one item:

```yaml
item_id: <slug>
source: spec | arch | decision
description: "<what was decided>"
locator_hint: "<where in code this should live>"
expected_behavior: "<what should be true>"
acceptance_criteria:
  - "<testable check>"
```

## Discipline

- Be thorough. Every decision = one item. No "obvious" item is too obvious to extract.
- The `locator_hint` is your guess at where to look in code. Be specific (file path, function name, module).
- Prefer concrete `acceptance_criteria` over abstract ones. "User can log in" → "POST /login with valid creds returns 200 + session token."

End with the sentinel line on its own:

{{sentinel}}
