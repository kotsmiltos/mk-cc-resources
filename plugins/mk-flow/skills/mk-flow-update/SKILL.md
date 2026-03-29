---
name: mk-flow-update
description: Sync mk-flow per-project context files (rules, intents, cross-references) with the latest plugin defaults. Key-based merge preserves project-specific entries while updating shared defaults. Shows diff preview before applying.
---

<objective>
Merge the latest mk-flow plugin defaults into the current project's context files. Update rules that exist in both (plugin version wins for shared keys), add new defaults, preserve project-specific entries. Show the user exactly what changed. Update `_meta.defaults_version` after sync.
</objective>

<quick_start>
Run immediately when invoked. No arguments needed. Syncs all three context files: rules.yaml, intents.yaml, cross-references.yaml.
</quick_start>

<essential_principles>
<core_rules>
1. **Project-specific entries are sacred.** Never delete or modify entries that only exist in the project file.
2. **Plugin defaults win for shared keys.** When the same key exists in both defaults and project with different content, the plugin version is newer/better — take it.
3. **Never touch corrections.** The `corrections` list in intents.yaml is append-only and project-specific. Never modify it.
4. **Source tags enable safe merging.** In cross-references.yaml, entries with `source: "plugin-default"` are updatable from defaults. Entries without a source field are project-specific — never touch them.
5. **Show before applying.** Always show what would change and get confirmation before writing files.
6. **Update _meta after sync.** After applying changes, update `_meta.defaults_version` and `_meta.last_synced` in each synced file.
</core_rules>
</essential_principles>

<process>

<step_1_find_defaults>
Find the mk-flow plugin defaults. Search in this order:
1. Check `${CLAUDE_PLUGIN_ROOT}` environment variable — if set, the defaults are at `${CLAUDE_PLUGIN_ROOT}/../../defaults/` (plugin cache structure: `cache/marketplace/plugin/version/`)
2. Search `~/.claude/plugins/cache/*/mk-flow/*/defaults/rules.yaml`
3. Search `~/.claude/plugins/marketplaces/*/plugins/mk-flow/defaults/rules.yaml`

Read:
- **Plugin defaults for rules:** `defaults/rules.yaml`
- **Plugin defaults for intents:** `intent-library/defaults.yaml`
- **Plugin version:** Read the mk-flow `plugin.json` to get the current version string

If defaults can't be found: "Can't find mk-flow plugin defaults. Is mk-flow installed? Check `~/.claude/plugins/`."

Also read the project's current context files:
- `context/rules.yaml`
- `.claude/mk-flow/intents.yaml`
- `context/cross-references.yaml`

If a project file doesn't exist, copy the defaults directly and note it. Done for that file.
</step_1_find_defaults>

<step_2_merge_rules>
Parse both `defaults/rules.yaml` and `context/rules.yaml`.

**Ignore `_meta` section during comparison** — it's metadata, not a rule.

For each rule (keyed by rule name under the `rules:` section):

| Situation | Action | Report as |
|-----------|--------|-----------|
| Rule exists in defaults AND project with **same content** | Keep as-is | Unchanged |
| Rule exists in defaults AND project with **different content** | Update project rule with defaults version | Updated |
| Rule exists in defaults but **NOT in project** | Add to project | Added |
| Rule exists in project but **NOT in defaults** | Keep in project (project-specific) | Kept (project-specific) |

Collect all changes into a diff summary for rules.
</step_2_merge_rules>

<step_3_merge_intents>
Parse both `intent-library/defaults.yaml` and `.claude/mk-flow/intents.yaml`.

**Ignore `_meta` section during comparison.**
**NEVER modify the `corrections` list** — it's project-specific and append-only.

For each intent (keyed by intent name under the `intents:` section):

| Situation | Action | Report as |
|-----------|--------|-----------|
| Intent exists in defaults AND project with **same content** | Keep as-is | Unchanged |
| Intent exists in defaults AND project with **different content** | Update project intent with defaults version | Updated |
| Intent exists in defaults but **NOT in project** | Add to project (use `enabled: true` if `default_enabled: true` in defaults, otherwise `enabled: false`) | Added |
| Intent exists in project but **NOT in defaults** | Keep in project (project-specific) | Kept (project-specific) |

Note: Default intents use `default_enabled` field; project intents use `enabled` field. Convert appropriately.

Collect all changes into a diff summary for intents.
</step_3_merge_intents>

<step_4_merge_cross_references>
Parse both the plugin's default cross-reference rules (if any exist in the plugin defaults) and `context/cross-references.yaml`.

**Ignore `_meta` section during comparison.**

Cross-references are different from rules/intents — most are project-specific (bootstrapped from CLAUDE.md or grown from corrections). Only merge entries that have `source: "plugin-default"`:

| Situation | Action | Report as |
|-----------|--------|-----------|
| Rule with `source: "plugin-default"` exists in both with **same content** | Keep as-is | Unchanged |
| Rule with `source: "plugin-default"` exists in both with **different content** | Update with plugin version | Updated |
| New rule from plugin defaults not in project | Add with `source: "plugin-default"` | Added |
| Rule WITHOUT source field (or with other source) | Never touch | Kept (project-specific) |

If the plugin doesn't ship default cross-reference rules yet, skip this step and note "No plugin default cross-references to sync."

Collect all changes into a diff summary for cross-references.
</step_4_merge_cross_references>

<step_5_show_diff_and_confirm>
Present all changes across all three files:

```
mk-flow update: [old version] -> [new version]

Rules (context/rules.yaml):
  Updated:
    - verify-before-reporting — updated to [brief description of change]
  Added:
    - [new-rule-name] — [brief description]
  Kept (project-specific):
    - [project-rule-name]
  Unchanged: [N] rules

Intents (.claude/mk-flow/intents.yaml):
  Updated:
    - [intent-name] — [brief description of change]
  Added:
    - [intent-name] — [description] (enabled: true/false)
  Kept (project-specific):
    - [intent-name]
  Unchanged: [N] intents
  Corrections: [N] entries (untouched)

Cross-references (context/cross-references.yaml):
  [Changes or "No plugin default cross-references to sync."]
```

If nothing changed across all files: "Project context is already up to date with mk-flow [version] defaults."

If there are changes, ask for confirmation before applying:

Use AskUserQuestion:
- **Apply all** — Update all files with the changes shown above
- **Review individually** — Let me walk through each change
- **Skip** — Don't apply changes right now
</step_5_show_diff_and_confirm>

<step_5b_migrate_state_sections>
After syncing defaults and before applying meta updates, check if `context/STATE.md` contains legacy section names that need migration.

**"Next Up" → "Planned Work" migration:**
1. Read `context/STATE.md`
2. If the file contains a `## Next Up` section header:
   a. Check whether `## Planned Work` already exists in the file
   b. If `## Planned Work` already exists: skip the rename, report "Skipped: STATE.md has both '## Next Up' and '## Planned Work' — resolve manually"
   c. If `## Planned Work` does NOT exist: rename the `## Next Up` header to `## Planned Work`
   d. Report: "Migrated: ## Next Up → ## Planned Work in STATE.md"
3. If `## Next Up` does not exist: no action needed, skip silently

This handles projects initialized before the state template overhaul (workflow-clarity Sprint 1, 2026-03-29). The migration is idempotent — running it again after a successful rename finds no `## Next Up` and skips.
</step_5b_migrate_state_sections>

<step_6_apply_and_update_meta>
After confirmation, write the merged content to each file.

Update `_meta` in each synced file:
```yaml
_meta:
  defaults_version: "[current mk-flow version]"
  last_synced: "[today's date YYYY-MM-DD]"
```

Show final summary:
```
mk-flow context synced to [version].

Updated: [N] rules, [N] intents, [N] cross-references
Added: [N] rules, [N] intents, [N] cross-references
Project-specific entries preserved: [N] rules, [N] intents, [N] cross-references
```
</step_6_apply_and_update_meta>

</process>

<success_criteria>
- Plugin defaults found and read
- All three project context files processed (rules, intents, cross-references)
- Key-based merge applied correctly — defaults update shared keys, new defaults added, project-specific kept
- Corrections list in intents.yaml never modified
- Cross-reference source tags respected — only `source: "plugin-default"` entries updated
- User shown diff preview before changes applied
- `_meta.defaults_version` and `_meta.last_synced` updated in all synced files
- User shown summary of what changed
</success_criteria>
