> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** None
> **estimated_size:** S

# Task 2: Add schema_version to SKILL.md Frontmatter

## Goal
Add `schema_version: 1` to the YAML frontmatter of all 4 SKILL.md files. D13 requires schema versioning in all artifact frontmatter for safe schema evolution.

## Context
Currently SKILL.md files use `version: 0.1.0` (semantic version for the skill) but lack `schema_version` (for frontmatter schema evolution). These serve different purposes — both should exist.

## Pseudocode

```
For each SKILL.md in [research, architect, context, build]:
  1. Read the file
  2. Add schema_version: 1 to the YAML frontmatter block (after name, before or after description)
  3. Write back
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/research/SKILL.md` | MODIFY | Add `schema_version: 1` to frontmatter |
| `skills/architect/SKILL.md` | MODIFY | Add `schema_version: 1` to frontmatter |
| `skills/context/SKILL.md` | MODIFY | Add `schema_version: 1` to frontmatter |
| `skills/build/SKILL.md` | MODIFY | Add `schema_version: 1` to frontmatter |

## Acceptance Criteria

- [ ] All 4 SKILL.md files have `schema_version: 1` in frontmatter
- [ ] Existing `name`, `description`, `version` fields preserved
- [ ] Frontmatter still parses as valid YAML
