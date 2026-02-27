# Tooling Audit

Current state and recommendations for development tooling.

## Current State

| Category | Tool | Status |
|----------|------|--------|
| Build system | hatchling | Configured in `pyproject.toml` |
| Package manager | uv | Used for global install (`uv tool install`) |
| Linting | — | Not configured |
| Formatting | — | Not configured |
| Type checking | — | Not configured (but code uses type annotations) |
| Testing | — | No test framework or tests |
| CI/CD | GitHub Actions | Amendment enforcer only (added by this audit) |
| Pre-commit | pre-commit | Amendment enforcer only (added by this audit) |

## Dependencies (schema-scout)

| Package | Version | Purpose |
|---------|---------|---------|
| openpyxl | >= 3.1 | XLSX reading (read_only streaming mode) |
| typer | >= 0.9 | CLI framework |
| rich | >= 13.0 | Terminal output (trees, tables, progress bars) |
| hatchling | (build) | Build backend |

No dev dependencies are declared.

## Recommendations

### Add ruff for linting + formatting

```toml
# In pyproject.toml [project.optional-dependencies]
dev = ["ruff>=0.4", "pytest>=8.0", "mypy>=1.10"]

[tool.ruff]
target-version = "py310"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "UP", "B", "SIM", "TCH"]
```

### Add mypy for type checking

```toml
[tool.mypy]
python_version = "3.10"
strict = true
```

The codebase already uses `from __future__ import annotations` and type hints throughout, so mypy adoption should be relatively smooth.

### Add pytest

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
```

See [test_hints.md](test_hints.md) for specific test targets.

### CI improvements

The current CI only runs the amendment protocol check. Consider adding:

1. `ruff check` and `ruff format --check`
2. `mypy` type checking
3. `pytest` test runs
4. All triggered on PRs to main
