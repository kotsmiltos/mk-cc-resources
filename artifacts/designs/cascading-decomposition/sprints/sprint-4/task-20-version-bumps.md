> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-4/task-20-version-bumps.md
> **sprint:** 4
> **status:** planned
> **depends_on:** T17, T18, T19, T23
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** none
> **open_questions:** none

# Task 20: Version Bumps

## Goal
Bump version numbers for all plugins modified during the cascading decomposition pipeline feature (Sprints 1-4). Each plugin's version in its plugin.json reflects the scope of changes.

## Context
- Current versions (from STATE.md Context): miltiaze 1.3.0, ladder-build 1.4.0, architect 0.5.0, mk-cc-all 1.20.0
- architect: major new feature (scope-decompose, scope-discover, 8 templates, 1 reference) — minor bump minimum
- miltiaze: new scope output mode — minor bump
- ladder-build: new scope integration + overflow detection — minor bump
- mk-cc-all: root plugin that aggregates all — minor bump
- mk-flow: STATE.md template updates only — patch bump at most

## Interface Specification

### Inputs
- Current plugin.json files for each modified plugin
- Changelog of what changed per plugin

### Outputs
- Updated version fields in plugin.json files
- Release notes comment or section if the plugin has one

### Contracts with Other Tasks
- All other Sprint 4 tasks must be done first — version bump captures the full scope

## Pseudocode

```
1. Read each plugin.json:
   - plugins/architect/.claude-plugin/plugin.json
   - plugins/miltiaze/.claude-plugin/plugin.json
   - plugins/ladder-build/.claude-plugin/plugin.json
   - .claude-plugin/plugin.json (mk-cc-all root)
   - plugins/mk-flow/.claude-plugin/plugin.json (check if template changes warrant bump)

2. Bump versions:
   - architect: 0.5.0 -> 0.6.0 (new feature: cascading decomposition pipeline)
   - miltiaze: 1.3.0 -> 1.4.0 (new feature: scope mode output)
   - ladder-build: 1.4.0 -> 1.5.0 (new feature: scope integration + overflow detection)
   - mk-cc-all: 1.20.0 -> 1.21.0 (reflects all plugin updates)
   - mk-flow: evaluate — if only template changes, no bump needed

3. Update STATE.md Context section with new version numbers.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/.claude-plugin/plugin.json` | MODIFY | version: 0.5.0 -> 0.6.0 |
| `plugins/miltiaze/.claude-plugin/plugin.json` | MODIFY | version: 1.3.0 -> 1.4.0 |
| `plugins/ladder-build/.claude-plugin/plugin.json` | MODIFY | version: 1.4.0 -> 1.5.0 |
| `.claude-plugin/plugin.json` | MODIFY | version: 1.20.0 -> 1.21.0 |
| `plugins/mk-flow/.claude-plugin/plugin.json` | CHECK | Evaluate if template changes warrant bump |
| `context/STATE.md` | MODIFY | Update version numbers in Context section |

## Acceptance Criteria
- [ ] architect plugin.json version is 0.6.0
- [ ] miltiaze plugin.json version is 1.4.0
- [ ] ladder-build plugin.json version is 1.5.0
- [ ] mk-cc-all plugin.json version is 1.21.0
- [ ] STATE.md Context section lists updated version numbers
- [ ] All modified plugin.json files are valid JSON

## Edge Cases
- mk-cc-all version already at 1.21.0 in STATE.md (from recent changes) — check actual plugin.json value, not STATE.md
- mk-flow may or may not need a bump — verify the scope of changes (STATE.md template only = no bump)
