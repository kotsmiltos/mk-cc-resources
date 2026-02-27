# Improvement Plan

Prioritized improvements derived from the audit of mk-cc-resources.

## Priority 1: Testing (schema-scout)

schema-scout is the only plugin with executable Python code and has **zero tests**.

### Recommended approach

- Add `pytest` as a dev dependency in `pyproject.toml`
- Create `tests/` directory inside `plugins/schema-scout/skills/schema-scout/tool/`
- Start with unit tests for the pure functions (see [test_hints.md](test_hints.md))
- Add integration tests using small fixture files (CSV, JSON, XLSX)

### Impact

Prevents regressions in schema analysis, encoding repair, and JSON detection — the most complex and fragile parts of the codebase.

---

## Priority 2: Linting and Formatting

No code quality tooling is configured.

### Recommended approach

- Add `ruff` for linting + formatting (replaces flake8, isort, black)
- Add `mypy` for type checking (codebase already uses type annotations)
- Configure in `pyproject.toml` (schema-scout) or a root-level config
- Add a CI workflow for lint checks on PRs

### Impact

Catches bugs early, enforces consistency, validates the existing type annotations.

---

## Priority 3: Plugin Consistency

`project-structure` is the only plugin without `.claude-plugin/plugin.json`.

### Recommended approach

- Add `plugins/project-structure/.claude-plugin/plugin.json` with standard metadata
- Convert the `skills/project-structure/` directory to a text alias file like the other skills
- Add `project-structure` as a standalone entry in `marketplace.json`

### Impact

Allows project-structure to be installed independently, not just via mk-cc-all.

---

## Priority 4: CLI Refactoring (schema-scout)

`cli.py` (430 lines) mixes CLI wiring, tree building, and output formatting.

### Recommended approach

- Extract output formatters to `formatters.py` (Rich tree, plain text, JSON)
- Keep `cli.py` focused on argument parsing and command dispatch
- This also makes the formatters independently testable

### Impact

Maintainability — changes to output formatting don't risk breaking CLI wiring.

---

## Priority 5: Documentation

- Add a `CONTRIBUTING.md` with the amendment protocol workflow
- Consider adding docstrings to public functions in models.py (currently minimal)
- Document the skill alias file convention (currently undocumented)
