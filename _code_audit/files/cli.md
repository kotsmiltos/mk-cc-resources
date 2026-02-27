# File Report: `cli.py`

**Path:** `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py`
**LOC:** 430

---

## 1. Purpose

CLI entry point for Schema Scout. Defines four Typer commands (`index`, `schema`, `query`, `list-paths`) and handles all output formatting across three modes: Rich (interactive terminal), plain text (piping), and JSON (machine-readable).

## 2. Key Components

### Commands

| Command | Purpose |
|---------|---------|
| `index <file>` | Analyze a file and save the schema index to disk |
| `schema <file>` | Print the full schema tree |
| `query <file> --path <path>` | Show detailed statistics for a specific field |
| `list-paths <file>` | List all leaf field paths |

### Internal Components

| Component | Purpose |
|-----------|---------|
| `OutputFormat` | Enum with three values: `rich`, `json`, `plain` |
| `_ensure_index(...)` | Load an existing index or create a new one; handles direct `.scout-index.json` file input |
| `_build_rich_tree(node)` | Build a Rich `Tree` widget from a `SchemaNode` |
| `_node_label(node)` | Format a single node as a Rich markup string |
| `_print_field_detail(node, metadata)` | Render detailed field stats as Rich tables |
| `_plain_tree(node)` | Build an ASCII tree string for piping |
| `_plain_node_label(node)` | Format a single node as plain text |
| `_plain_query(node, metadata)` | Format query output as plain text |
| `_write_json(data)` | Write JSON to stdout (bypasses Rich console) |
| `_write_plain(text)` | Write plain text to stdout |

## 3. Dependencies

| Dependency | Usage |
|------------|-------|
| `typer` | CLI framework -- argument/option parsing, command registration |
| `rich` | Terminal formatting -- trees, tables, panels, markup |
| `json` (stdlib) | JSON output mode |
| `pathlib` (stdlib) | File path handling |
| `.analyzer` | `analyze_file` for fresh analysis |
| `.index_io` | `save_index`, `load_index`, `get_index_path`, `index_exists` |
| `.models` | `SchemaNode` tree structure |

## 4. Patterns / Conventions

- **Three output formats** (rich, json, plain) are implemented per-command -- each command has conditional branches for the active format
- **`_ensure_index`** centralizes index resolution: fresh analysis, loading from a companion index file, or directly opening a `.scout-index.json`
- **Branch node skip** in `_node_label`: intentionally suppresses stats for nodes with children to avoid dumping raw JSON strings into tree displays
- **Typer integration** is clean -- each command uses `typer.Argument` and `typer.Option` with descriptive help text
- All four commands follow the same pattern: ensure index, then format output

## 5. Data & Side Effects

- `index` command writes `.scout-index.json` files to the filesystem (next to the source file)
- `_ensure_index` performs file I/O: reads existing indexes or triggers full file analysis
- All output is written to stdout (Rich console or direct `sys.stdout`)
- Progress indication during analysis writes to stderr via Rich

## 6. Risks / Issues

| Severity | Issue |
|----------|-------|
| Medium | File mixes three responsibilities: CLI wiring, tree building, and output formatting (~430 LOC) -- difficult to maintain and test in isolation |
| Low | `_build_rich_tree` and `_plain_tree` have nearly identical traversal logic -- duplication that could diverge |
| Low | `_ensure_index` returns different metadata shapes depending on code path (direct load vs. fresh analysis) |
| Info | No tests for any output format or command |

## 7. Health Assessment

**Needs Attention**

- Commands are well-defined and the Typer integration is clean
- The file carries too many responsibilities: CLI wiring, tree traversal, and three output formatters are all in one module
- Duplicated traversal logic between Rich and plain-text formatters is a maintenance risk
- No test coverage

## 8. Test Coverage Hints

- Each command can be tested via Typer's `CliRunner` with a small fixture file
- `_ensure_index` logic: test the three code paths (fresh analysis, existing index, direct `.scout-index.json` input)
- `_build_rich_tree` / `_plain_tree`: test with a known `SchemaNode` tree and snapshot the output
- `_node_label` / `_plain_node_label`: pure formatting functions, easy to unit test
- JSON output mode: assert valid JSON and expected structure

## 9. Suggested Improvements

- Extract output formatting into a dedicated `formatters.py` module with a common tree-walking abstraction and per-format renderers
- Unify `_build_rich_tree` and `_plain_tree` into a single traversal with a pluggable renderer to eliminate duplication
- Normalize the return type of `_ensure_index` so callers get a consistent metadata shape regardless of code path
- Add CLI tests using Typer's `CliRunner` with small synthetic data files
