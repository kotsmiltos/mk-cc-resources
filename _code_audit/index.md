# Audit Index

Consolidated audit report for **mk-cc-resources** (v1.1.0).

## Repository Summary

| Metric | Value |
|--------|-------|
| Total plugins | 4 (schema-scout, miltiaze, ladder-build, project-structure) |
| Marketplace entries | 4 (3 individual + 1 bundle) |
| Python source files | 6 (`__init__.py`, `analyzer.py`, `cli.py`, `index_io.py`, `models.py`, `readers.py`) |
| Python LOC (approx) | ~850 |
| SKILL.md files | 4 |
| Workflow files | 5 |
| Reference files | 4 |
| Template files | 3 |
| Config files | 1 (`pyproject.toml`) |
| Test files | 0 |
| CI workflows | 1 (amendment enforcer, added by this audit) |

## Health Assessment

### Strengths

- **Clean separation of concerns** — each plugin is self-contained with no cross-dependencies
- **Consistent conventions** — SKILL.md format, plugin directory layout, YAML frontmatter
- **Named constants** — analyzer.py uses descriptive threshold names, not magic numbers
- **Defensive encoding** — readers.py tries multiple encodings, analyzer.py repairs double-encoded UTF-8
- **Memory-efficient** — XLSX reader uses openpyxl read_only mode, values are reservoir-sampled

### Weaknesses

- **Zero test coverage** — schema-scout has no tests despite complex analysis logic
- **No linting or formatting** — no ruff, mypy, black, or isort configured
- **No CI** — (addressed by this audit with amendment protocol CI)
- **plugin.json missing** for project-structure — inconsistent with other plugins
- **`cli.py` mixes UI and logic** — tree-building, formatting, and CLI wiring in one 430-line file

### Risks

- **Encoding repair heuristic** (`_repair_encoding`) could silently corrupt data if the input is legitimately cp1252
- **No input validation** on CLI paths — schema-scout trusts file existence checks but doesn't sanitize
- **Reservoir sampling** seed is not configurable — results are non-deterministic across runs

## Per-File Reports

| File | Report |
|------|--------|
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/__init__.py` | [files/__init__.md](files/__init__.md) |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py` | [files/analyzer.md](files/analyzer.md) |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py` | [files/cli.md](files/cli.md) |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/index_io.py` | [files/index_io.md](files/index_io.md) |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/models.py` | [files/models.md](files/models.md) |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/readers.py` | [files/readers.md](files/readers.md) |
| `plugins/schema-scout/skills/schema-scout/tool/pyproject.toml` | [files/pyproject_toml.md](files/pyproject_toml.md) |

## See Also

- [patterns.md](patterns.md) — Structural pattern index and semantic map
- [plan.md](plan.md) — Improvement plan
- [tooling.md](tooling.md) — Tooling audit
- [test_hints.md](test_hints.md) — Test strategy for schema-scout
