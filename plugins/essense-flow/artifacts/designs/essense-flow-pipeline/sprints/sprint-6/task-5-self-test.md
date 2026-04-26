> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** Task 3, Task 4
> **estimated_size:** M

# Task 5: Self-Test Script

## Goal
Create a self-test script (`scripts/self-test.js`) that validates the plugin is correctly structured: all SKILL.md files valid, all templates have frontmatter with schema_version, hooks exist, config valid, state machine transitions valid, module boundaries respected, and all commands reference valid skills.

## Context
Read the Fitness Functions section in PLAN.md — the self-test script should check all of them programmatically. Read `lib/yaml-io.js` for YAML parsing, `lib/state-machine.js` for transition validation.

## Pseudocode

```
SCRIPT scripts/self-test.js:

FUNCTION main():
  1. pluginRoot = resolve(__dirname, "..")
  2. results = []

  CHECK 1: "SKILL.md files have valid frontmatter"
    - Glob skills/*/SKILL.md
    - For each: parse YAML frontmatter, verify name, description, version, schema_version exist
    - Report PASS/FAIL per file

  CHECK 2: "Templates have schema_version"
    - Glob skills/*/templates/*.md and defaults/*.yaml
    - For each: parse frontmatter, verify schema_version field
    - Report PASS/FAIL per file

  CHECK 3: "No cross-skill imports"
    - For each skill dir, grep for imports from other skill dirs
    - Pattern: require(".*skills/(other-skill)
    - Report PASS/FAIL

  CHECK 4: "State machine has no dead-ends"
    - Load transitions.yaml
    - Build reachability graph from "idle"
    - Verify all states are reachable
    - Verify only "complete" has no outgoing transitions (then cycles to idle)
    - Report PASS/FAIL

  CHECK 5: "Config parses without error"
    - Read defaults/config.yaml with yaml-io.safeRead
    - Verify token_budgets, overflow, quorum sections exist
    - Report PASS/FAIL

  CHECK 6: "Commands map to skills"
    - Glob commands/*.md
    - For each: parse frontmatter, verify name exists
    - Report PASS/FAIL per file

  CHECK 7: "Hooks exist and are executable"
    - Glob hooks/scripts/*.sh and hooks/scripts/*.js
    - Verify files exist
    - Report PASS/FAIL

  SUMMARY:
    - Print total checks, passed, failed
    - Exit 0 if all pass, 1 if any fail
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `scripts/self-test.js` | CREATE | Plugin structure validation script |

## Acceptance Criteria

- [ ] Script runs with `node scripts/self-test.js` and exits 0 when plugin is valid
- [ ] Checks all fitness functions that can be verified statically
- [ ] Reports individual PASS/FAIL per check with descriptive messages
- [ ] Exits 1 with summary on any failure
- [ ] Does not modify any files (read-only)
