---
name: mk-flow-update-rules
description: Merge latest plugin default rules into project rules. Updates existing rules with newer versions from the plugin, keeps project-specific rules, shows what changed.
---

<objective>
Merge the plugin's default rules (defaults/rules.yaml shipped with mk-flow) into the project's context/rules.yaml. Update rules that exist in both with the newer plugin version. Keep project-specific rules that don't exist in defaults. Show the user exactly what changed.
</objective>

<quick_start>
Run immediately when invoked. No arguments needed.
</quick_start>

<process>

<step_1_find_files>
Find both rule files:
- **Plugin defaults:** Find the mk-flow plugin root by searching `~/.claude/plugins/cache/` for `mk-flow/*/defaults/rules.yaml`. Read it.
- **Project rules:** Read `context/rules.yaml` from the current working directory. If it doesn't exist, copy the defaults file directly and confirm. Done.

If the plugin defaults file can't be found, tell the user: "Can't find mk-flow plugin defaults. Is mk-flow installed? Try: claude plugin install mk-flow"
</step_1_find_files>

<step_2_compare_and_merge>
Parse both YAML files. For each rule:

| Situation | Action |
|-----------|--------|
| Rule exists in defaults AND project with **same content** | Keep as-is (already up to date) |
| Rule exists in defaults AND project with **different content** | Update project rule with defaults version (the plugin version is newer/better) |
| Rule exists in defaults but **NOT in project** | Add to project (new default rule) |
| Rule exists in project but **NOT in defaults** | Keep in project (project-specific rule) |

Write the merged result to `context/rules.yaml`.
</step_2_compare_and_merge>

<step_3_show_changes>
Show the user what changed:

```
Rules updated from mk-flow defaults.

Updated:
  - verify-before-reporting — updated to procedural format with required verification block
  - [other updated rules]

Added:
  - [any new rules from defaults]

Kept (project-specific):
  - [any rules only in the project file]

Unchanged:
  - [rules that were already current]
```

If nothing changed: "Project rules are already up to date with plugin defaults."
</step_3_show_changes>

</process>

<success_criteria>
- Plugin defaults found and read
- Project rules found and read (or created from defaults if missing)
- Rules merged correctly — defaults update existing, new defaults added, project-specific kept
- User shown exactly what changed
- context/rules.yaml written with merged result
</success_criteria>
