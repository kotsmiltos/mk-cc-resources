> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** Task 4, Task 5
> **estimated_size:** S

# Task 7: Plugin Packaging

## Goal
Finalize the plugin for distribution: validate and update `.claude-plugin/plugin.json` with all commands, verify all skill directories are complete, and create a `scripts/validate-plugin.js` that checks the plugin is ready to install.

## Context
Read `.claude-plugin/plugin.json` for the current manifest. Read `commands/*.md` for all registered commands. The plugin must be loadable by Claude Code's plugin system.

## Pseudocode

```
1. Update .claude-plugin/plugin.json:
   - Ensure all 7 commands are listed (init, research, architect, build, review, status, next)
   - Ensure all 4 skills are listed (research, architect, build, context)
   - Ensure all hooks are registered
   - Set version to 0.1.0

2. Create scripts/validate-plugin.js:
   FUNCTION main():
     a. Read plugin.json — verify it parses as valid JSON
     b. Verify each command referenced in plugin.json has a corresponding .md file
     c. Verify each skill referenced has a SKILL.md
     d. Verify hooks.json exists and references valid scripts
     e. Run self-test.js checks
     f. Report: ready to install or list missing pieces
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `.claude-plugin/plugin.json` | MODIFY | Update commands list, skills list, version |
| `scripts/validate-plugin.js` | CREATE | Plugin readiness validation |

## Acceptance Criteria

- [ ] `plugin.json` lists all 7 commands
- [ ] `plugin.json` lists all 4 skills
- [ ] `plugin.json` version is 0.1.0
- [ ] `validate-plugin.js` checks all plugin components exist
- [ ] `validate-plugin.js` exits 0 when plugin is valid
- [ ] No references to non-existent files in plugin.json
