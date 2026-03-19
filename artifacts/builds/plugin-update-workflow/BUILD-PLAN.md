# Build Plan: Plugin Update Workflow

> **End Goal:** Every plugin in mk-cc-resources has proper version tracking and changelogs so Claude Code can detect updates. mk-flow projects can sync evolving defaults via a unified `/mk-flow-update` command without losing project-specific customizations, and the mk-flow hook nudges users when their per-project context files are behind the installed version.

> **Source:** `artifacts/explorations/2026-03-19-plugin-update-workflow-exploration.md`

---

## Status

- **Current milestone:** Complete
- **Completed:** 6 of 6 milestones
- **Last updated:** 2026-03-19

---

## Milestones

### Milestone 1: Version hygiene (S) *(current)*
**Goal:** Every plugin has a `version` field in its plugin.json, marketplace.json is aligned, git tags created for current versions.
**Done when:**
- All 9 plugin.json files have a `version` field
- marketplace.json versions match individual plugin.json versions
- `git tag -l` shows `plugin@version` tags for each plugin
**Status:** completed | 2026-03-19 — all plugin.json files have version, marketplace.json aligned, 10 git tags created

### Milestone 2: Release notes (S)
**Goal:** Every plugin has a RELEASE-NOTES.md with at least the current version entry, retroactively built from git history.
**Done when:**
- `plugins/*/RELEASE-NOTES.md` exists for every plugin
- Each has at least one version entry with categorized changes
**Depends on:** Milestone 1
**Status:** completed | 2026-03-19 — 9 RELEASE-NOTES.md files created with retroactive history

### Milestone 3: _meta + init update (S)
**Goal:** mk-flow default templates include `_meta.defaults_version` and `/mk-flow-init` writes it to new projects.
**Done when:**
- `plugins/mk-flow/defaults/rules.yaml` has `_meta.defaults_version`
- `plugins/mk-flow/intent-library/defaults.yaml` has `_meta.defaults_version`
- `/mk-flow-init` SKILL.md updated to write `_meta` when creating context files
**Depends on:** Milestone 1 (needs version number)
**Status:** completed | 2026-03-19 — _meta added to all defaults, mk-flow-init updated, defaults/cross-references.yaml created

### Milestone 4: mk-flow-update skill — rules + intents (M)
**Goal:** Unified `/mk-flow-update` skill that syncs rules.yaml AND intents.yaml using key-based merge, replacing `/mk-flow-update-rules`.
**Done when:**
- New skill at `plugins/mk-flow/skills/mk-flow-update/SKILL.md`
- Handles rules.yaml merge (same key = take plugin default, new = add, project-only = keep)
- Handles intents.yaml merge (same logic, preserves corrections list)
- Shows diff preview before applying
- Old `/mk-flow-update-rules` skill replaced
**Depends on:** Milestone 3
**Status:** completed | 2026-03-19 — unified /mk-flow-update skill created, /mk-flow-update-rules deprecated

### Milestone 5: mk-flow-update — cross-references + full UX (M)
**Goal:** Extend `/mk-flow-update` to handle cross-references.yaml (source-tag-aware merge) and polish the full confirmation UX.
**Done when:**
- cross-references.yaml merge uses source tags to identify updatable vs project-specific rules
- Full flow: detect stale → show diff preview → confirm → apply → show summary
- Updates `_meta.defaults_version` and `_meta.last_synced` after sync
**Depends on:** Milestone 4
**Status:** completed | 2026-03-19 — cross-refs merge built into M4 skill, default cross-references file created

### Milestone 6: Stale detection nudge (M)
**Goal:** mk-flow hook detects outdated defaults and nudges user on first message per session.
**Done when:**
- Hook compares `_meta.defaults_version` in project context files with installed mk-flow version
- Shows one-line nudge on version mismatch: "[mk-flow] Defaults updated (X → Y). Run /mk-flow-update to sync."
- Nudge appears once per session (flag file in temp dir)
- Running `/mk-flow-update` clears the stale state
**Depends on:** Milestone 5
**Status:** completed | 2026-03-19 — hook enhanced with stale detection, session-aware flag file, nudge instruction

---

## Architecture Impact Summary

### Concerns touched:
- **Plugin metadata**: All plugin.json files + marketplace.json (version alignment)
- **mk-flow defaults**: rules.yaml, intent-library defaults (adding _meta)
- **mk-flow skills**: mk-flow-init (write _meta), mk-flow-update (new), mk-flow-update-rules (replaced)
- **mk-flow hook**: intent-inject.sh (stale detection)

### Full file manifest:
- [ ] `plugins/alert-sounds/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/ladder-build/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/miltiaze/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/project-note-tracker/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/project-structure/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/repo-audit/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/safe-commit/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/schema-scout/.claude-plugin/plugin.json` — add version field (M1)
- [ ] `plugins/mk-flow/.claude-plugin/plugin.json` — verify version correct (M1)
- [ ] `.claude-plugin/plugin.json` — verify mk-cc-all version correct (M1)
- [ ] `.claude-plugin/marketplace.json` — align all versions (M1)
- [ ] `plugins/alert-sounds/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/ladder-build/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/miltiaze/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/mk-flow/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/project-note-tracker/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/project-structure/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/repo-audit/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/safe-commit/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/schema-scout/RELEASE-NOTES.md` — create (M2)
- [ ] `plugins/mk-flow/defaults/rules.yaml` — add _meta section (M3)
- [ ] `plugins/mk-flow/intent-library/defaults.yaml` — add _meta section (M3)
- [ ] `plugins/mk-flow/skills/mk-flow-init/SKILL.md` — update to write _meta (M3)
- [ ] `plugins/mk-flow/skills/mk-flow-update/SKILL.md` — create unified update skill (M4)
- [ ] `plugins/mk-flow/skills/mk-flow-update-rules/SKILL.md` — replace with redirect or remove (M4)
- [ ] `plugins/mk-flow/skills/mk-flow-update/SKILL.md` — extend for cross-refs + UX (M5)
- [ ] `plugins/mk-flow/hooks/intent-inject.sh` — add stale detection (M6)

---

## Discovered Work

_(Items found during building that weren't in the original plan.)_

---

## Refinement Queue

- [ ] Add auto-update enablement instructions to plugin README
- [ ] Consider a root RELEASE-NOTES.md that aggregates across plugins

---

## Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-03-19 | Solution B: Lean Convention + Nudge | Right balance of simplicity and discoverability — per exploration |
| 2026-03-19 | Per-plugin RELEASE-NOTES.md, not unified | Each plugin is independently installable |
| 2026-03-19 | Key-based merge with source tags, not three-way | Simpler, covers 95% of cases without storing original defaults |
| 2026-03-19 | plugin.json is authoritative for version, marketplace.json derived | CC reads plugin.json with priority — confirmed by filesystem analysis |
| 2026-03-19 | Hand-written changelogs, git-cliff as optional accelerator | More context than auto-generated; low release frequency makes manual viable |

---

## Context Notes

- 2026-03-19: CC plugin cache at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. Version field in plugin.json drives cache directory naming. No version = CC can't detect updates.
- 2026-03-19: Third-party marketplace auto-update is disabled by default. Users must manually run `claude plugin update` or enable auto-update.
- 2026-03-19: marketplace.json currently has stale versions — mk-cc-all shows 1.12.0 but plugin.json says 1.13.0, mk-flow shows 0.1.0 but plugin.json says 0.4.0.
- 2026-03-19: The existing `/mk-flow-update-rules` skill looks for defaults at `~/.claude/plugins/cache/` path. The new unified skill should use the same discovery mechanism.
