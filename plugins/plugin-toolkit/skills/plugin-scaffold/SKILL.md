---
name: plugin-scaffold
description: Bootstrap a new mk-cc-resources plugin with proper structure. Generates directory tree + plugin.json + SKILL.md skeletons for named skills + marketplace.json entry + mk-cc-all bundle update + README active-plugins table entry + dedicated README section + CLAUDE.md architecture tree entry + RELEASE-NOTES.md v1.0.0. Use when starting a new plugin from scratch. Mechanical 9-step chain — does it all in one invocation. Asks for plugin name + skill names + descriptions.
disable-model-invocation: true
argument-hint: "<plugin-name> <skill-name>[,<skill-name>...]"
---

<objective>
Create a new mk-cc-resources plugin with full directory structure + all cross-references. After this skill runs, the plugin appears in /plugin install list, mk-cc-all bundle includes it, README + CLAUDE.md reference it, and skeleton SKILL.md files are ready for content.
</objective>

## Repo state check

```!
ls -d C:/Users/mkots/mk-cc-resources/plugins/*/ 2>/dev/null | xargs -n1 basename
```

<instructions>

## 1. Parse arguments

`$ARGUMENTS` format: `<plugin-name> <skill-name>[,<skill-name>...]`
- Plugin name: lowercase, hyphen-separated, no spaces
- Skill names: comma-separated, lowercase-hyphen

If args missing, ask via `AskUserQuestion`:
1. Plugin name
2. Plugin description (1-2 sentences, what it does)
3. Skill names (comma-separated)
4. For each skill: one-line description

Validate plugin name doesn't exist in `plugins/` (per injection above). Refuse with clear error if it does.

## 2. Create directory structure

```bash
plugins/<plugin-name>/
  .claude-plugin/
  skills/
    <skill-name-1>/
    <skill-name-2>/
    ...
```

Use `mkdir -p` via Bash for cross-platform safety.

## 3. Write `plugin.json`

Path: `plugins/<plugin-name>/.claude-plugin/plugin.json`

```json
{
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "<plugin description from step 1>",
  "author": {
    "name": "<from existing plugins' author field>"
  }
}
```

Read an existing plugin's plugin.json to inherit the author name (consistency across the repo).

## 4. Write SKILL.md skeletons

For each skill, write `plugins/<plugin-name>/skills/<skill-name>/SKILL.md` with:

```markdown
---
name: <skill-name>
description: <skill description from step 1>
---

<objective>
<one-paragraph statement of what the skill does>
</objective>

<instructions>

## 1. <First step>

<TBD — user fills in>

</instructions>
```

Skeleton intentionally minimal. User fills the substance.

## 5. Update root marketplace.json

Path: `.claude-plugin/marketplace.json`

Add an entry to the `plugins` array (before the `mk-cc-all` entry):

```json
{
  "name": "<plugin-name>",
  "source": "./plugins/<plugin-name>",
  "description": "<plugin description>",
  "version": "1.0.0"
}
```

Bump marketplace `metadata.version` (patch bump).

## 6. Update mk-cc-all bundle plugin.json

Path: `.claude-plugin/plugin.json`

Ask the user (via `AskUserQuestion`): should this plugin be bundled in mk-cc-all?
- If yes: add `"./plugins/<plugin-name>/skills/"` to the `skills` array. Add relevant keywords. Bump `mk-cc-all` version (minor).
- If no: skip this step (plugin installs separately).

## 7. Update README.md

Two updates:

(a) Add row to the **Active plugins** table:
```
| **<plugin-name>** | 1.0.0 | <description> |
```

(b) Add dedicated section before "Credits":
```markdown
## <Plugin Title> — <one-line tagline>

<expanded description>

```bash
claude plugin install <plugin-name>
```

### Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **<skill-name>** | `/<skill-name>` | <description> |
| ... | ... | ... |
```

## 8. Update CLAUDE.md

Path: `CLAUDE.md`

Add to the **Architecture** code block under `plugins/`:
```
  <plugin-name>/             # <description>
    .claude-plugin/plugin.json
    skills/
      <skill-name>/          # <description>
      ...
```

If the plugin warrants its own section (multi-skill or significant), add a top-level `## <Plugin Title>` section after the existing per-plugin sections.

## 9. Create RELEASE-NOTES.md

Path: `plugins/<plugin-name>/RELEASE-NOTES.md`

```markdown
# Release notes — <plugin-name>

## 1.0.0 — Initial release

<plugin description>

Skills:
- **<skill-name>**: <description>
- ...
```

## 10. Verify + report

Run these checks:
- `plugin.json` parses as JSON
- marketplace.json parses; new entry present
- mk-cc-all bundle (if added) includes the new skills path
- README has the new row + section
- CLAUDE.md has the new tree entry

Report:
```
Plugin <name> scaffolded:
- N skills created (skeletons)
- marketplace.json updated (v<old> → v<new>)
- mk-cc-all bundle: <included | excluded>
- README + CLAUDE.md updated

Next steps:
1. Fill in SKILL.md bodies for each skill
2. Commit + push (or invoke /version-bump if changes warrant)
```

## Composition

- This skill creates v1.0.0; doesn't call /version-bump (the scaffold IS the v1.0.0).
- After scaffolding, user can iterate. Once first real content lands, /version-bump can cascade subsequent bumps.

## Constraints

- DO NOT fill in SKILL.md substance — skeletons only.
- DO NOT commit or push. User decides when changes are ready.
- DO NOT proceed if plugin name collides with existing plugin. Abort with clear error.

</instructions>
