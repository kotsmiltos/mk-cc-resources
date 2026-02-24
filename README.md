# mk-cc-resources

A collection of custom Claude Code plugins — skills, commands, and tools.

## Installation

```bash
claude plugin marketplace add https://github.com/kotsmiltos/mk-cc-resources
claude plugin install mk-cc-resources
```

## What's Included

### Schema Scout

A CLI tool for exploring the schema and values of any data file (XLSX, CSV, JSON).

- Analyzes file structure and builds a schema tree with types, value distributions, and null analysis
- Auto-detects and expands JSON embedded in string columns
- Repairs double-encoded UTF-8 (common from Excel/ODBC pipelines)
- Prunes empty columns and XLSX overflow artifacts
- Saves reusable index files for instant re-exploration

**Quick start** (after plugin install):

```bash
scout index data.xlsx        # Analyze and save index
scout schema data.xlsx       # Show full schema tree
scout query data.xlsx -p "field.path"  # Drill into a field
scout list-paths data.xlsx   # List all field paths
```

If `scout` is not on PATH, install it from the bundled tool:

```bash
uv tool install <plugin-path>/skills/schema-scout/tool/ --force
```

## Credits

Inspired by [ckifonidis](https://github.com/ckifonidis) and the [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources) plugin architecture.

## License

[MIT](LICENSE)
