# mk-cc-resources — Codebase Snapshot

> Claude Code plugin marketplace: 5 skills distributed as installable plugins.

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

  project-structure/        # Project structure mapping (no plugin.json — anomaly)
    skills/project-structure/
      SKILL.md

  repo-audit/               # Repo audit + cross-cutting amendment protocol
    .claude-plugin/plugin.json
    skills/repo-audit/
      SKILL.md              # Pure XML router (AUDIT + AMEND modes)
      workflows/            # audit.md, amend.md
      references/           # enforcement-spec.md, amendment-fields.md
      templates/            # amendment-record.md
      scripts/              # Portable enforcement files (copied to target repos)

scripts/                    # Enforcement tooling (stdlib-only Python)
  _audit_config.py          # Shared constants (extensions, paths, required fields)
  repo_audit.py             # CLI: audit scaffolding + amendment creation
  enforce_amendment_protocol.py  # Validator for pre-commit and CI

skills/                     # Alias layer — text files pointing to plugin skill dirs
  ladder-build              # -> ../plugins/ladder-build/skills/ladder-build
  miltiaze                  # -> ../plugins/miltiaze/skills/miltiaze
  schema-scout              # -> ../plugins/schema-scout/skills/schema-scout
  repo-audit                # -> ../plugins/repo-audit/skills/repo-audit
  project-structure/        # Direct directory (not an alias file)
    SKILL.md

_code_audit/                # Cross-cutting audit artifacts (tracked in git)
  README.md                 # How to use the audit system
  index.md                  # Consolidated audit report
  plan.md                   # Improvement plan
  tooling.md                # Tooling audit
  test_hints.md             # Test strategy for schema-scout
  patterns.md               # Pattern index + touch points + semantic map
  files/                    # Per-file audit reports
  amendments/               # Amendment records (one per code change)
```

## Key Patterns

| ID | Pattern | Touch Points |
|----|---------|-------------|
| P1 | Plugin directory layout | `plugins/*/.claude-plugin/plugin.json` + `plugins/*/skills/*/` |
| P2 | SKILL.md convention | YAML frontmatter + XML-like sections (`<objective>`, `<routing>`, etc.) |
| P3 | Workflow routing | miltiaze, ladder-build, repo-audit route via SKILL.md `<routing>` to `workflows/*.md` |
| P4 | Marketplace registration | `.claude-plugin/marketplace.json` lists all plugins with source paths |
| P5 | Skill alias files | `skills/<name>` text files containing relative paths to plugin skill dirs |

See `_code_audit/patterns.md` for the full pattern index with detailed touch points, variations, anomalies, and semantic map.

## Dependency Highlights

| Component | Dependencies |
|-----------|-------------|
| schema-scout (CLI tool) | Python >= 3.10, openpyxl >= 3.1, typer >= 0.9, rich >= 13.0 |
| miltiaze, ladder-build, project-structure | None (pure SKILL.md + markdown workflows) |
| repo-audit (enforcement scripts) | Python >= 3.10, stdlib only |
| Build system | hatchling (schema-scout packaging) |

## Cross-Cutting Change Policy

**This policy is mechanically enforced.** Pre-commit hooks and CI checks will reject commits and PRs that violate it.

### Before any code change

1. **Read this file** (`CLAUDE.md`) to understand the current architecture and where things live.
2. **Read `_code_audit/patterns.md`** to find the pattern index and touch points relevant to your change.
3. **Search for all related implementations.** If you're changing a file that follows Pattern P1 (plugin directory layout), check ALL other plugins. If you're changing a SKILL.md (P2), check the convention across ALL skills.

### When making a code change

1. **Create an amendment record:**
   ```bash
   python scripts/repo_audit.py amend \
       --slug <short-name> \
       --description "<what and why>" \
       --primary <main_files> \
       --related <related_files> \
       --files <all_changed_files> \
       --patterns <pattern_ids>
   ```

2. **Fill in the Pre-Change Cross-Cutting Analysis** in the amendment — primary target, patterns involved, related implementations found, shared utilities impacted.

3. **Make your changes.**

4. **Fill in the Cross-Cutting Integrity Check** — files updated, files NOT updated (with justification), tests/docs updated, whether `CLAUDE.md` or `patterns.md` need updates.

5. **Stage the amendment with your code changes and commit.** The pre-commit hook validates everything.

### Required amendment fields (enforced by validator)

| Field | Required Value |
|-------|---------------|
| `mode` | `amend` |
| `snapshot_used` | `CLAUDE.md` |
| `patterns_used` | `_code_audit/patterns.md` |
| `integrity_check_done` | `true` |
| `primary_files` | Non-empty list |
| `related_files_considered` | List (may be empty) |
| `updated_files` | Must include every changed code file |

### What's excluded from enforcement

- Files under `_code_audit/` (audit artifacts)
- Files under `.github/` (CI workflows)
- `CLAUDE.md`, `.gitignore`, `LICENSE`
- Markdown files outside `_code_audit/`
- Pure file deletions

## Conventions

- **Zero external dependencies** in `scripts/` — stdlib only
- **Skill definitions** use YAML frontmatter + XML-like section tags
- **Python source** (schema-scout) requires Python >= 3.10, uses openpyxl + typer + rich
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Amendment records** are append-only — they accumulate, never overwrite
