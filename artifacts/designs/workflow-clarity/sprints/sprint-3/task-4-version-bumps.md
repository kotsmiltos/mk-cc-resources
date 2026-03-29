# Task 4: Version Bumps + Documentation

> **type:** task-spec
> **output_path:** artifacts/designs/workflow-clarity/sprints/sprint-3/task-4-version-bumps.md
> **sprint:** 3
> **status:** planned
> **depends_on:** Sprint 3 tasks 1-3
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** none
> **open_questions:** none

## Goal

Bump version numbers for all 4 modified plugins (miltiaze, architect, ladder-build, mk-flow), update the root plugin version (mk-cc-all), add cross-reference rules for the new coupling points introduced by this remediation, and update CLAUDE.md with the metadata convention. After this task, version numbers reflect the workflow-clarity changes, and CLAUDE.md documents the standardized metadata format for future reference.

## Context

Read first:
- `.claude-plugin/marketplace.json` — plugin registry
- `.claude-plugin/plugin.json` — root plugin metadata (mk-cc-all)
- `plugins/miltiaze/.claude-plugin/plugin.json` — current miltiaze version
- `plugins/architect/.claude-plugin/plugin.json` — current architect version
- `plugins/ladder-build/.claude-plugin/plugin.json` — current ladder-build version
- `plugins/mk-flow/.claude-plugin/plugin.json` — current mk-flow version
- `context/cross-references.yaml` — cross-reference rules
- `CLAUDE.md` — project documentation

**Current versions (from STATE.md Context for Future Me):**
- miltiaze: 1.2.0
- architect: 0.3.0
- ladder-build: 1.3.0
- mk-flow: 0.9.0
- mk-cc-all: 1.18.0

**What changed in this remediation (Sprints 1-3):**
- All 4 plugins had templates and workflows modified (metadata, adversarial sections, boundary rationale, dual verification, state-descriptive language, hook fixes, routing, drift-check extension, fitness functions)
- These are non-breaking enhancements to existing functionality → minor version bumps

## Interface Specification

### Inputs
- All plugin.json files
- marketplace.json
- CLAUDE.md
- cross-references.yaml

### Outputs
- Updated version numbers in all plugin.json files
- Updated marketplace.json
- Updated CLAUDE.md conventions section
- Updated cross-references.yaml with new coupling rules

### Contracts with Other Tasks
- Tasks 1-3 must complete first (this task documents and versions the final state)
- This task produces the final deliverables of the workflow-clarity remediation

## Pseudocode

```
1. BUMP plugin versions:

   READ each plugin.json. Increment minor version:
   - miltiaze: 1.2.0 → 1.3.0
   - architect: 0.3.0 → 0.4.0
   - ladder-build: 1.3.0 → 1.4.0
   - mk-flow: 0.9.0 → 0.10.0

   ALSO bump mk-cc-all root plugin:
   - mk-cc-all: 1.18.0 → 1.19.0

   UPDATE marketplace.json to reflect new versions.

   In each plugin.json, update the version field.
   If the plugin.json has a changelog or description field, add a one-line
   note: "Workflow clarity: standardized metadata, adversarial assessments,
   state-descriptive language, hook hardening"

2. ADD cross-reference rules:

   ADD to context/cross-references.yaml:

   metadata-format:
     when: "Changing the metadata blockquote format (> **field:** value) in any template"
     check:
       - "All 10 pipeline templates — must use same format"
       - "plugins/mk-flow/skills/state/scripts/verify-templates.sh — FF-1, FF-18, FF-19 check metadata"
     source: "workflow-clarity remediation, Decision #1"

   adversarial-sections:
     when: "Adding or changing adversarial/risk/failure section in any template"
     check:
       - "Decision #5 in workflow-clarity PLAN.md — contextual naming convention"
       - "verify-templates.sh — FF-2 checks adversarial sections exist"
     source: "workflow-clarity remediation, Decision #5"

   routing-rules:
     when: "Adding or changing stage routing rules in intent-inject.sh"
     check:
       - "state.md canonical stage list — must include the new stage"
       - "verify-templates.sh — FF-7 checks all stages have routing"
       - "drift-check.sh — canonical stage consistency check"
     source: "workflow-clarity remediation, FF-7"

3. UPDATE CLAUDE.md:

   In the Conventions section, ADD:

   - **Metadata convention** — Every pipeline template output includes a blockquote
     metadata block as the first content (before `# Title`). Core fields: `type`,
     `output_path`, `key_decisions`, `open_questions`. All field names use snake_case.
     Domain-specific fields may follow. Format: `> **field_name:** value`.

4. UPDATE STATE.md Context for Future Me:

   Update plugin versions to reflect new values.
   Note workflow-clarity remediation as complete.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/miltiaze/.claude-plugin/plugin.json` | MODIFY | Version 1.2.0 → 1.3.0 |
| `plugins/architect/.claude-plugin/plugin.json` | MODIFY | Version 0.3.0 → 0.4.0 |
| `plugins/ladder-build/.claude-plugin/plugin.json` | MODIFY | Version 1.3.0 → 1.4.0 |
| `plugins/mk-flow/.claude-plugin/plugin.json` | MODIFY | Version 0.9.0 → 0.10.0 |
| `.claude-plugin/plugin.json` | MODIFY | Version 1.18.0 → 1.19.0 |
| `.claude-plugin/marketplace.json` | MODIFY | Update versions for all 4 plugins + root |
| `context/cross-references.yaml` | MODIFY | Add metadata-format, adversarial-sections, routing-rules rules |
| `CLAUDE.md` | MODIFY | Add metadata convention to Conventions section |

## Acceptance Criteria

- [ ] miltiaze version bumped to 1.3.0
- [ ] architect version bumped to 0.4.0
- [ ] ladder-build version bumped to 1.4.0
- [ ] mk-flow version bumped to 0.10.0
- [ ] mk-cc-all version bumped to 1.19.0
- [ ] marketplace.json reflects all new versions
- [ ] cross-references.yaml has 3 new rules: metadata-format, adversarial-sections, routing-rules
- [ ] CLAUDE.md Conventions section includes metadata convention
- [ ] All version numbers are valid semver
- [ ] No other files modified

## Edge Cases

- **Plugin.json format varies across plugins:** Read each one first. Some may have additional fields (description, changelog). Only modify the version field.
- **marketplace.json format:** Read it first to understand the structure. It may list plugins by name with version as a nested field.
- **cross-references.yaml format:** Read the existing rules to match the convention. New rules should follow the same structure (when/check/source).
- **CLAUDE.md is long:** Find the Conventions section specifically. Don't add to the wrong section.

## Notes

- This is a bookkeeping task. All the substantive work is done in Tasks 1-3. This task records the result: versions, documentation, cross-references.
- Version bumps are minor (X.Y+1.0) because the changes are non-breaking enhancements — existing functionality is preserved, new sections are additive.
- The cross-reference rules protect the new coupling points from future drift. When someone changes the metadata format, cross-references.yaml will flag the coupled files.
