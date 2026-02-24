---
name: schema-scout
description: Explore the schema and values of any data file (XLSX, CSV, JSON) using the scout CLI. Use when the user asks to examine, index, or explore a data file's structure.
---

<objective>
Schema Scout is a CLI tool for exploring data file schemas. It analyzes XLSX, CSV, and JSON files, building a schema tree with type detection, value statistics, null analysis, and automatic JSON-in-JSON expansion.

Use this skill whenever the user wants to understand the structure, fields, types, or values in a data file.
</objective>

<setup>
Before using scout, verify it is available:

```bash
which scout
```

If scout is not found, install it from the bundled tool directory (relative to this skill):

```bash
uv tool install ./tool/ --force
```

This installs the `scout` command globally via uv. No virtual environment activation needed — scout will be on PATH after installation.

Dependencies (installed automatically): openpyxl, typer, rich.
</setup>

<commands>
**Index a file** — analyze and save a reusable index:
```bash
scout index <file>
scout index <file> --force          # Re-index even if index exists
scout index <file> --sheet "Sheet1" # Specific XLSX sheet
scout index <file> --max-rows 5000  # Limit rows scanned
```

**Show full schema tree** — types, values, nulls at every level:
```bash
scout schema <file>
```

**Query a specific field** — detailed stats for one path:
```bash
scout query <file> --path "field.subfield"
scout query <file> --path "items[].name"
```

**List all field paths** — flat list of every path in the schema:
```bash
scout list-paths <file>
```

**Output formats** — all commands support `--format`:
- `rich` (default) — colored terminal output with tables and trees
- `json` — machine-readable JSON to stdout
- `plain` — plain text, suitable for piping

```bash
scout schema <file> --format json
scout list-paths <file> --format plain
```
</commands>

<workflow>
Recommended workflow for exploring an unknown data file:

1. **Index the file** to create a `.scout-index.json` alongside it:
   ```bash
   scout index data.xlsx
   ```

2. **View the schema tree** to understand the overall structure:
   ```bash
   scout schema data.xlsx
   ```

3. **List all paths** if you need a flat reference of available fields:
   ```bash
   scout list-paths data.xlsx
   ```

4. **Query specific fields** to drill into values, types, and distributions:
   ```bash
   scout query data.xlsx --path "status"
   scout query data.xlsx --path "payload.items[].type"
   ```

Index files are saved as `<filename>.scout-index.json` next to the source. Subsequent commands reuse the index automatically — no need to re-scan.
</workflow>

<behavior>
- **Auto-cleanup**: null-only columns are pruned, XLSX overflow columns are trimmed, sparse `_col_N` columns (less than 5% non-null) are removed
- **Encoding repair**: double-encoded UTF-8 (common from Excel/ODBC pipelines) is auto-detected and fixed
- **JSON detection**: columns containing JSON strings are automatically expanded into nested schema trees
- **Supported formats**: `.xlsx`, `.csv`, `.json`, `.ndjson`, `.jsonl`
- **Index reuse**: pass `--force` to re-index, otherwise the existing index is loaded
</behavior>

<credits>
Inspired by [ckifonidis](https://github.com/ckifonidis) and the taches-cc-resources plugin architecture.
</credits>
