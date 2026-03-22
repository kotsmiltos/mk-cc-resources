# Task 2: Registry & Version Hygiene

> **Sprint:** 4
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** `../../PLAN.md`

## Goal

Fix remaining registry and version inconsistencies. Document the schema-scout dual-version convention. Add a cross-reference rule for plugin/pyproject version tracking. Clean up the root plugin.json field gap documentation. Addresses FP-7, FP-10, AC-7 residuals, and AC-11.

## Pseudocode

```
FIX 1 — Document schema-scout dual-version convention (FP-7, Decision 3):
  In plugins/schema-scout/.claude-plugin/plugin.json, add a comment or
  in context/cross-references.yaml, add a rule:

  schema-scout-versions:
    when: "Bumping schema-scout plugin.json or pyproject.toml version"
    check:
      - "plugins/schema-scout/.claude-plugin/plugin.json — plugin version"
      - "plugins/schema-scout/skills/schema-scout/tool/pyproject.toml — Python package version"
    note: "These versions are intentionally independent. Plugin version tracks the skill (SKILL.md, workflows). pyproject.toml tracks the Python CLI package. They may advance at different rates."
    why: "Prevents confusion about which version to bump and whether they should match"

FIX 2 — Clarify root plugin.json field scope (AC-11):
  In context/cross-references.yaml, update the plugin-json-format rule:
  Add a note: "The root .claude-plugin/plugin.json (mk-cc-all) has additional fields (homepage, repository, license, keywords) for distribution. Child plugin.json files use only name, version, description, author."

FIX 3 — Bump plugin versions for Sprint 3 changes:
  These plugins had files modified in Sprint 3:
  - plugins/mk-flow/.claude-plugin/plugin.json: 0.7.0 → 0.8.0 (drift-check.sh + intent-inject.sh fixes)
  - plugins/project-note-tracker/.claude-plugin/plugin.json: 1.7.0 → 1.8.0 (13 workflow files)
  - plugins/safe-commit/.claude-plugin/plugin.json: 1.0.0 → 1.0.1 (scan-secrets.sh cleanup)
  - plugins/schema-scout/.claude-plugin/plugin.json: 1.2.0 → 1.2.1 (analyzer.py signature fix)
  Update .claude-plugin/marketplace.json versions to match
  Bump .claude-plugin/plugin.json (mk-cc-all): 1.15.0 → 1.16.0
  Update marketplace.json metadata.version to 1.16.0

FIX 4 — Update STATE.md Current Focus:
  Reflect that the audit remediation is complete (after Sprint 4).
  Update Pipeline Position to final state.

FIX 5 — Final PLAN.md update:
  Add Change Log entry for Sprint 4 completion.
  Mark all fitness functions as checked.
  Close all risks in Risk Register.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `context/cross-references.yaml` | MODIFY | Add schema-scout-versions rule, update plugin-json-format note |
| `plugins/mk-flow/.claude-plugin/plugin.json` | MODIFY | 0.7.0 → 0.8.0 |
| `plugins/project-note-tracker/.claude-plugin/plugin.json` | MODIFY | 1.7.0 → 1.8.0 |
| `plugins/safe-commit/.claude-plugin/plugin.json` | MODIFY | 1.0.0 → 1.0.1 |
| `plugins/schema-scout/.claude-plugin/plugin.json` | MODIFY | 1.2.0 → 1.2.1 |
| `.claude-plugin/plugin.json` | MODIFY | 1.15.0 → 1.16.0 |
| `.claude-plugin/marketplace.json` | MODIFY | Update 5 plugin versions + metadata.version |
| `context/STATE.md` | MODIFY | Update Current Focus and Pipeline Position |

## Acceptance Criteria

- [ ] `cross-references.yaml` has schema-scout-versions rule documenting the dual-version convention
- [ ] `cross-references.yaml` plugin-json-format rule has note about root plugin.json extra fields
- [ ] All 4 changed plugin.json files have bumped versions
- [ ] `marketplace.json` versions match all plugin.json files
- [ ] `marketplace.json` metadata.version matches mk-cc-all version
- [ ] `STATE.md` Current Focus reflects remediation status

## Edge Cases

- mk-flow state templates were also modified in Sprint 3 (state.md template). This is the same plugin, covered by the 0.7.0 → 0.8.0 bump.
- The sync scripts (scripts/check-skills-sync.sh, scripts/sync-skills.sh) are in the repo root, not inside any plugin. No version bump needed.
