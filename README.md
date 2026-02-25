# mk-cc-resources

Custom Claude Code skills — data exploration, multi-dimensional research, and incremental build pipelines.

## Installation

Add the marketplace, then install individual plugins or the full bundle:

```bash
claude plugin marketplace add https://github.com/kotsmiltos/mk-cc-resources
```

### Install everything

```bash
claude plugin install mk-cc-all
```

### Install individually

```bash
claude plugin install schema-scout
claude plugin install miltiaze
claude plugin install ladder-build
claude plugin install project-structure
```

## What's Included

### Schema Scout

CLI tool for exploring the schema and values of any data file (XLSX, CSV, JSON).

- Analyzes file structure and builds a schema tree with types, value distributions, and null analysis
- Auto-detects and expands JSON embedded in string columns
- Repairs double-encoded UTF-8 (common from Excel/ODBC pipelines)
- Prunes empty columns and XLSX overflow artifacts
- Saves reusable index files for instant re-exploration

```bash
scout index data.xlsx        # Analyze and save index
scout schema data.xlsx       # Show full schema tree
scout query data.xlsx -p "field.path"  # Drill into a field
scout list-paths data.xlsx   # List all field paths
```

If `scout` is not on PATH, install it from the bundled tool:

```bash
uv tool install <plugin-path>/plugins/schema-scout/skills/schema-scout/tool/ --force
```

### Miltiaze

Multi-dimensional idea exploration — decomposes any concept into research dimensions, investigates each angle thoroughly with verified sources, and presents multiple solutions with honest tradeoffs.

- Decomposes ideas into 3-6 research dimensions
- Researches each dimension in parallel using subagents
- Synthesizes findings into 2+ genuine solutions (no straw-men)
- Produces a structured exploration report with sources

Use the `/miltiaze` command to start an exploration.

### Ladder Build

Incremental build pipeline — decomposes projects into small, verifiable milestones.

- Takes exploration outputs (from Miltiaze or freeform) and decomposes into 4-8 milestones
- Each milestone is built, tested, and verified before moving to the next
- Living build plan evolves as discoveries emerge, but the end goal stays fixed
- Produces milestone reports tracking what was built, verified, and discovered

Use the `/ladder-build` command to start a build.

### Project Structure

Generates and maintains a live annotated project structure map inside the project's CLAUDE.md.

- Scans the filesystem and builds an annotated file tree with purpose annotations
- Creates a "Frequently Used Locations" quick-lookup table
- Adds maintenance instructions so the structure stays current after every edit
- Uses `<!-- STRUCTURE:START -->` / `<!-- STRUCTURE:END -->` markers for targeted updates

Use the `/project-structure` command to generate or refresh the structure.

## Credits

Schema Scout inspired by [ckifonidis](https://github.com/ckifonidis). Plugin architecture inspired by [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources).

## License

[MIT](LICENSE)
