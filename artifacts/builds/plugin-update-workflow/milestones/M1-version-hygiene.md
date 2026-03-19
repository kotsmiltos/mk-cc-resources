# Milestone 1: Version Hygiene

> **Status:** Completed — 2026-03-19
> **Build plan:** ../BUILD-PLAN.md

## What Was Built

Added `version` fields to all 8 plugin.json files that were missing them, and fixed version drift in marketplace.json. Created git tags for all current plugin versions using the `plugin@version` convention.

## Files Changed

- `plugins/alert-sounds/.claude-plugin/plugin.json` — added `"version": "1.0.0"`
- `plugins/ladder-build/.claude-plugin/plugin.json` — added `"version": "1.1.0"`
- `plugins/miltiaze/.claude-plugin/plugin.json` — added `"version": "1.1.0"`
- `plugins/project-note-tracker/.claude-plugin/plugin.json` — added `"version": "1.6.0"`
- `plugins/project-structure/.claude-plugin/plugin.json` — added `"version": "1.1.0"`
- `plugins/repo-audit/.claude-plugin/plugin.json` — added `"version": "1.1.0"`
- `plugins/safe-commit/.claude-plugin/plugin.json` — added `"version": "1.0.0"`
- `plugins/schema-scout/.claude-plugin/plugin.json` — added `"version": "1.1.0"`
- `.claude-plugin/marketplace.json` — fixed mk-flow version (0.1.0 → 0.4.0), mk-cc-all version (1.12.0 → 1.13.0)

## Verification

- All 9 plugin.json files confirmed to have `version` field via grep
- marketplace.json versions confirmed aligned with all individual plugin.json versions
- `git tag -l` shows 10 tags: `alert-sounds@1.0.0`, `ladder-build@1.1.0`, `miltiaze@1.1.0`, `mk-cc-all@1.13.0`, `mk-flow@0.4.0`, `project-note-tracker@1.6.0`, `project-structure@1.1.0`, `repo-audit@1.1.0`, `safe-commit@1.0.0`, `schema-scout@1.1.0`

## Discoveries

- mk-flow plugin.json already had version 0.4.0 but marketplace.json was at 0.1.0 — 4 minor versions of drift
- mk-cc-all had 1 minor version of drift (1.12.0 vs 1.13.0)
- The marketplace metadata version (1.3.0) is separate from plugin versions — left as-is

## Next

Milestone 2: Release notes — create RELEASE-NOTES.md for each plugin with retroactive history from git log.
