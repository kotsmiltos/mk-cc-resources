# mk-cc-resources — Codebase Snapshot

> Claude Code plugin marketplace: skills distributed as installable plugins.

## Architecture

```
.claude-plugin/
  marketplace.json          # Marketplace registry — lists all plugins
  plugin.json               # Root plugin metadata (mk-cc-all)

plugins/
  schema-scout/             # Data file schema exploration CLI
    .claude-plugin/plugin.json
    skills/schema-scout/
      SKILL.md              # Skill definition
      tool/                 # Standalone Python CLI package
        pyproject.toml
        schema_scout/
          __init__.py       # Package version
          analyzer.py       # Core schema analysis engine
          cli.py            # Typer CLI entrypoint
          index_io.py       # Index serialization (JSON)
          models.py         # SchemaNode, FieldStats dataclasses
          readers.py        # XLSX / CSV / JSON file readers

  miltiaze/                 # Multi-dimensional idea exploration
    .claude-plugin/plugin.json
    skills/miltiaze/
      SKILL.md
      references/           # research-dimensions.md, presentation-standards.md
      templates/            # exploration-report.md
      workflows/            # full-exploration.md, drill-deeper.md

  ladder-build/             # Incremental build pipeline
    .claude-plugin/plugin.json
    skills/ladder-build/
      SKILL.md
      references/           # milestone-design.md, verification-standards.md
      templates/            # build-plan.md, milestone-report.md
      workflows/            # kickoff.md, build-milestone.md, continue.md

  mk-flow/                  # Unified workflow system
    .claude-plugin/plugin.json
    hooks/hooks.json        # UserPromptSubmit hook — intent classification
    intent-library/         # defaults.yaml — default intents shipped with mk-flow
    skills/
      intake/               # Dense input decomposition + assumption tables
        SKILL.md
        references/         # parsing-rules.md
        templates/          # assumption-table.md
      state/                # Per-project state tracking + session continuity
        SKILL.md
        workflows/          # status.md, pause.md, resume.md
        templates/          # state.md, continue-here.md, vocabulary.yaml, cross-references.yaml
      mk-flow-init/         # Project setup with context scanning
        SKILL.md

  project-structure/        # Project structure mapping (no plugin.json — anomaly)
    skills/project-structure/
      SKILL.md

  repo-audit/               # Repo audit (distributable skill for other repos)
    .claude-plugin/plugin.json
    skills/repo-audit/
      SKILL.md
      workflows/            # audit.md, amend.md
      references/           # enforcement-spec.md, amendment-fields.md
      templates/            # amendment-record.md
      scripts/              # Portable enforcement files (copied to target repos)

skills/                     # Alias layer — text files pointing to plugin skill dirs
  ladder-build              # -> ../plugins/ladder-build/skills/ladder-build
  miltiaze                  # -> ../plugins/miltiaze/skills/miltiaze
  schema-scout              # -> ../plugins/schema-scout/skills/schema-scout
  repo-audit                # -> ../plugins/repo-audit/skills/repo-audit
  intake                    # -> ../plugins/mk-flow/skills/intake
  state                     # -> ../plugins/mk-flow/skills/state
  mk-flow-init              # -> ../plugins/mk-flow/skills/mk-flow-init
  project-structure/        # Direct directory (not an alias file)
    SKILL.md
```

## Cross-Reference Patterns

When changing files that follow these patterns, CHECK the related files for consistency. Only modify them if actually broken by your change.

| Pattern | When Triggered | Check These | Why |
|---------|---------------|-------------|-----|
| Plugin layout | Changing the FORMAT of plugin.json | All `plugins/*/.claude-plugin/plugin.json` | All plugins must use same metadata format |
| SKILL.md convention | Changing section structure (adding/removing XML tags) | All `plugins/*/skills/*/SKILL.md` | Shared convention across all skills |
| Marketplace registry | Adding, removing, or renaming a plugin | `.claude-plugin/marketplace.json` | Must list every plugin in `plugins/` |
| Skill aliases | Adding or removing a skill from any plugin | `skills/` directory | Alias file must exist for each plugin skill |
| Workflow routing | Adding a workflow file to a skill | The skill's SKILL.md `<routing>` section | Routing table must reference the new workflow |
| mk-flow hook | Adding a new context file type (like vocabulary.yaml) | `plugins/mk-flow/hooks/hooks.json` | Hook prompt must reference new file |
| mk-flow init | Adding a new context file type | `plugins/mk-flow/skills/mk-flow-init/SKILL.md` | Init must create the new file |

Per-project cross-references live in `context/cross-references.yaml` (created by mk-flow init, grows from corrections).

## Dependency Highlights

| Component | Dependencies |
|-----------|-------------|
| schema-scout (CLI tool) | Python >= 3.10, openpyxl >= 3.1, typer >= 0.9, rich >= 13.0 |
| miltiaze, ladder-build, project-structure, mk-flow | None (pure SKILL.md + markdown workflows) |
| repo-audit (enforcement scripts) | Python >= 3.10, stdlib only |
| Build system | hatchling (schema-scout packaging) |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags
- **Python source** (schema-scout) requires Python >= 3.10, uses openpyxl + typer + rich
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
