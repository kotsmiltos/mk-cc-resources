# schema-scout Release Notes

## v1.1.0 (2026-03-08)

### Improvements

- Pure XML structure migration for SKILL.md
- Consistent skill convention with YAML frontmatter

## v1.0.0 (2026-03-01)

### Initial Release

- CLI tool for exploring data file schemas (XLSX, CSV, JSON)
- Auto-detects JSON in cells and shows nested structure
- Repairs double-encoded UTF-8
- Prunes overflow artifacts (top-level null-only columns)
- Index files saved as `<filename>.scout-index.json`
- Commands: `scout index`, `scout schema`, `scout query`, `scout list-paths`
- Requires Python >= 3.10, openpyxl, typer, rich
- Installable via `uv tool install`
