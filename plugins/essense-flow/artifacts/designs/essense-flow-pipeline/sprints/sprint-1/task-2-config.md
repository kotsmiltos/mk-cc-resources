> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-1/task-2-config.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../PLAN.md
> **key_decisions:** D6, D7, D8, D13
> **open_questions:** none

# Task 2: Config Schema

## Goal
Define the pipeline's configuration schema — all configurable values in one place with documented defaults. This is the single source of truth for thresholds, budgets, and behavioral settings that other components read at runtime.

## Context
The pipeline has configurable values spread across multiple concerns: token budgets for brief assembly, timeouts for hooks and agents, overflow detection thresholds, quorum rules. Per D6, all pipeline files need validation. Per D13, all artifacts need schema versioning. The config file lives in the project's `.pipeline/` directory and is created during init.

## Interface Specification

### Inputs
- None (defines the schema)

### Outputs
- `defaults/config.yaml` — the default config template shipped with the plugin (copied to `.pipeline/config.yaml` during init)
- `references/config-schema.yaml` — JSON Schema definition for validation

### Contracts with Other Tasks
- Task 5 (lib/core) will implement config loading and validation
- Sprint 2 hooks will read config values for token budgets and timeouts
- Sprint 3 brief assembly will read token ceiling and section budgets

## Pseudocode

```
1. Define the config structure with these sections:

   schema_version: 1

   pipeline:
     name: ""                        # Project name (set during init)
     created_at: ""                  # ISO-8601 (set during init)

   token_budgets:
     brief_ceiling: 12000           # Max tokens for any assembled agent brief
     section_max: 4000              # Max tokens for any single brief section
     identity_max: 200              # Max tokens for identity block
     constraints_max: 500           # Max tokens for constraints block
     injection_ceiling: 5000        # Max tokens for context hook injection
     safety_margin_pct: 10          # Buffer percentage subtracted from ceilings

   timeouts:
     hook_ms: 5000                  # Max time for any hook script
     agent_ms: 300000               # Max time for any subagent (5 min)

   overflow:
     file_lines_backstop: 300       # File size backstop (secondary signal)
     max_decomposition_depth: 5     # Max recursive decomposition before escalation

   quorum:
     research: "all"                # All perspective agents required
     architecture_perspective: "n-1" # Tolerate one missing perspective
     architecture_decomposition: "all"
     build: "all"
     review: "n-1"

   fitness_functions:
     allowlist_only: true           # check_commands must come from static allowlist (D7)
     check_timeout_ms: 10000        # Max time for any fitness function check

   validation:
     yaml_validate_paths:           # Paths to validate on write (D6)
       - ".pipeline/"
       - "context/"

2. Write the JSON Schema (config-schema.yaml) that validates the above structure:
   - Every field has a type, description, and default value
   - Required fields: schema_version, token_budgets, timeouts
   - Numeric fields have min/max constraints where applicable

3. Write defaults/config.yaml with all defaults populated
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `defaults/config.yaml` | CREATE | Default configuration with all values documented |
| `references/config-schema.yaml` | CREATE | JSON Schema for validation |

## Acceptance Criteria

- [ ] `defaults/config.yaml` parses as valid YAML
- [ ] Config contains `schema_version: 1`
- [ ] All token budget values are present and are positive integers
- [ ] All timeout values are present and are positive integers
- [ ] Quorum values are valid ("all" or "n-1")
- [ ] `fitness_functions.allowlist_only` defaults to `true` (D7)
- [ ] `validation.yaml_validate_paths` includes both `.pipeline/` and `context/` (D6)
- [ ] `references/config-schema.yaml` is a valid JSON Schema that validates the default config
- [ ] Every config value has an inline comment explaining its purpose
- [ ] No magic numbers — every threshold has a named key

## Edge Cases

- User provides a config missing some fields — the config loader (Sprint 1 Task 5) must merge with defaults, not reject
- Config values of 0 for timeouts or budgets — validation should reject non-positive values
- Config schema evolves between versions — `schema_version` field enables migration
