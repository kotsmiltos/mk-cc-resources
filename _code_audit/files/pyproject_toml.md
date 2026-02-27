# File Report: `pyproject.toml`

**Path:** `plugins/schema-scout/skills/schema-scout/tool/pyproject.toml`
**LOC:** 18

---

## 1. Purpose

Package configuration for the `schema-scout` CLI tool. Declares project metadata, runtime dependencies, the console entry point, and the build system.

## 2. Key Components

| Section | Content |
|---------|---------|
| `[project]` | Package name (`schema-scout`), version (`1.0.0`), description, Python requirement (`>=3.10`) |
| `[project.scripts]` | Entry point: `scout` -> `schema_scout.cli:app` |
| `[project.dependencies]` | `openpyxl>=3.1`, `typer>=0.9`, `rich>=13.0` |
| `[build-system]` | Uses `hatchling` as the build backend |

## 3. Dependencies

| Dependency | Purpose |
|------------|---------|
| `openpyxl>=3.1` | XLSX file reading |
| `typer>=0.9` | CLI framework (command parsing, help text) |
| `rich>=13.0` | Terminal UI (trees, tables, progress bars, markup) |
| `hatchling` | Build backend (build-time only) |

## 4. Patterns / Conventions

- **Minimum Python 3.10** -- matches the codebase's use of `X | Y` union syntax in type hints
- **No upper bounds** on dependency versions -- acceptable practice for a CLI tool (as opposed to a library)
- **hatchling build backend** -- modern, standard choice aligned with PEP 517
- **Single entry point** (`scout`) maps directly to the Typer app instance

## 5. Data & Side Effects

- Declarative configuration file -- no runtime side effects
- Determines what gets installed when the package is built or installed via `uv` / `pip`

## 6. Risks / Issues

| Severity | Issue |
|----------|-------|
| Medium | No dev dependency group -- no way to install test/lint tools via `uv pip install -e ".[dev]"` |
| Low | Version (`1.0.0`) is duplicated with `__init__.py` -- can drift out of sync |
| Low | No `[tool.ruff]` or `[tool.mypy]` configuration sections -- no code quality tooling is configured |

## 7. Health Assessment

**Needs Attention**

- Core package configuration is correct and functional
- Missing dev dependencies makes it harder for contributors to set up a consistent development environment
- No quality tooling configuration (linter, type checker) means code standards are unenforced
- Duplicated version string is a minor maintenance hazard

## 8. Test Coverage Hints

- Validate that the `scout` entry point resolves correctly (e.g., `scout --help` exits cleanly)
- Verify `requires-python` matches the minimum Python version actually needed by the code (union syntax requires 3.10+)
- Check that all declared dependencies are actually imported somewhere in the codebase

## 9. Suggested Improvements

- Add a `[project.optional-dependencies]` section with a `dev` group including test and lint tools (e.g., `pytest`, `ruff`, `mypy`)
- Eliminate version duplication by using hatchling's dynamic version feature (`dynamic = ["version"]` with a version source plugin)
- Add `[tool.ruff]` and `[tool.mypy]` sections to enforce consistent code quality
- Consider adding a `[project.urls]` section with links to the repository and documentation
