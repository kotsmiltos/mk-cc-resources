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
      SKILL.md
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

  mk-flow/                  # Unified workflow system — intent detection, state, intake
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # UserPromptSubmit hook config
      intent-inject.sh      # Reads stdin JSON, injects context (intents, state, vocab, xrefs, rules)
    defaults/
      rules.yaml            # Default behavioral rules shipped with plugin
    intent-library/
      defaults.yaml         # Default intents shipped with mk-flow
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

  alert-sounds/             # Cross-platform audio + visual alerts for Claude Code events
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # Stop, Permission, UserPromptSubmit (clear state) hooks
      alert.py              # Main hook script — beeps, notifications, taskbar flash
      config.json           # User config — volume, mute, per-event toggles
      statusline.sh         # Status line integration
      notify_windows.ps1    # Windows notification helper
    skills/alert-sounds/
      SKILL.md              # /alert-sounds config skill

  safe-commit/              # Secret scanning + identity verification before commits
    .claude-plugin/plugin.json
    skills/safe-commit/
      SKILL.md
      references/           # commit-checks.md, secret-patterns.md
      scripts/              # scan-secrets.sh

  project-note-tracker/     # Question + bug tracker with Excel backend
    .claude-plugin/plugin.json
    skills/note/
      SKILL.md
      workflows/            # init, research-question, bug, bugs, investigate, agenda,
                            # meeting, review, resolve, quick, add-handler, dump, doctor
      scripts/              # tracker.py — Excel I/O via uvx --with openpyxl

  project-structure/        # Project structure mapping
    .claude-plugin/plugin.json
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

skills/                     # mk-cc-all skill directories (copies from plugins/)
  ladder-build/             # Copied from plugins/ladder-build/skills/ladder-build
  miltiaze/                 # Copied from plugins/miltiaze/skills/miltiaze
  schema-scout/             # Copied from plugins/schema-scout/skills/schema-scout
  repo-audit/               # Copied from plugins/repo-audit/skills/repo-audit
  note/                     # Copied from plugins/project-note-tracker/skills/note
  safe-commit/              # Copied from plugins/safe-commit/skills/safe-commit
  project-structure/        # Copied from plugins/project-structure/skills/project-structure
  # mk-flow skills NOT here — mk-flow must be installed separately (has hooks)

context/                    # Per-project mk-flow context (created by /mk-flow-init)
  STATE.md                  # Living project state — current focus, done, blocked, next
  rules.yaml                # Behavioral corrections — injected every message by hook
  vocabulary.yaml           # Term disambiguation — auto-populated from corrections
  cross-references.yaml     # "Change X, also check Y" — grows from corrections
  notes/                    # Auto-saved analysis and forward-notes
```

## mk-flow Context Injection

The mk-flow hook (`intent-inject.sh`) runs on every UserPromptSubmit and injects 5 context files into the conversation as a system-reminder:

| File | Tag | Purpose |
|------|-----|---------|
| `.claude/mk-flow/intents.yaml` | `<intents_config>` | Intent definitions + corrections for classification |
| `context/STATE.md` | `<project_state>` | Current project state |
| `context/vocabulary.yaml` | `<vocabulary>` | Term disambiguation |
| `context/cross-references.yaml` | `<cross_references>` | Change consistency rules |
| `context/rules.yaml` | `<rules>` | Hard behavioral rules — unconditional |

The hook reads the prompt from stdin JSON, skips short messages (<10 chars) and slash commands. Classification is done inline by the main Claude, not by a separate API call.

## Cross-Reference Patterns

When changing files that follow these patterns, CHECK the related files for consistency. Only modify them if actually broken by your change.

| Pattern | When Triggered | Check These | Why |
|---------|---------------|-------------|-----|
| Plugin layout | Changing the FORMAT of plugin.json | All `plugins/*/.claude-plugin/plugin.json` | All plugins must use same metadata format |
| SKILL.md convention | Changing section structure (adding/removing XML tags) | All `plugins/*/skills/*/SKILL.md` | Shared convention across all skills |
| Marketplace registry | Adding, removing, or renaming a plugin | `.claude-plugin/marketplace.json` | Must list every plugin in `plugins/` |
| Skill aliases | Adding or removing a skill from any plugin | `skills/` directory | Alias file must exist for each plugin skill |
| Workflow routing | Adding a workflow file to a skill | The skill's SKILL.md `<routing>` section | Routing table must reference the new workflow |
| mk-flow hook | Adding a new context file type (like rules.yaml) | `plugins/mk-flow/hooks/intent-inject.sh` | Hook script must read and inject the new file |
| mk-flow init | Adding a new context file type | `plugins/mk-flow/skills/mk-flow-init/SKILL.md` | Init must create the new file |

Per-project cross-references live in `context/cross-references.yaml` (created by mk-flow init, grows from corrections).

## Dependency Highlights

| Component | Dependencies |
|-----------|-------------|
| schema-scout (CLI tool) | Python >= 3.10, openpyxl >= 3.1, typer >= 0.9, rich >= 13.0 |
| miltiaze, ladder-build, project-structure, mk-flow | None (pure SKILL.md + markdown workflows) |
| mk-flow hook | bash, one of: jq / python3 / python (for JSON parsing) |
| alert-sounds | Python >= 3.10, stdlib only (platform-native audio/notifications) |
| project-note-tracker | Python >= 3.10, openpyxl (via uvx) |
| safe-commit | bash |
| repo-audit (enforcement scripts) | Python >= 3.10, stdlib only |
| Build system | hatchling (schema-scout packaging) |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags
- **Python source** (schema-scout) requires Python >= 3.10, uses openpyxl + typer + rich
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Behavioral corrections** go in `context/rules.yaml` (hook-injected), not auto-memory files
