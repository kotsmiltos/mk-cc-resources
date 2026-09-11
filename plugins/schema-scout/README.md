# schema-scout

Find out what is actually in a data file before you write code against it. `scout` reads XLSX,
CSV and JSON and prints the schema — types, value distributions, nulls, and the JSON hiding
inside string columns.

## Install

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install schema-scout@mk-cc-resources
```

The CLI itself installs with `uv` (Python 3.10+):

```
uv tool install <plugin-path>/plugins/schema-scout/skills/schema-scout/tool/ --force
```

## Use

```bash
scout index data.xlsx                     # analyze once, save the index next to the file
scout schema data.xlsx                    # the whole schema tree
scout query data.xlsx -p "customer.id"    # drill into one field
scout list-paths data.xlsx                # every field path, flat
```

Add `--force` to re-index, `--sheet <name>` for a specific XLSX sheet.

## What it handles for you

- **JSON inside cells** is detected and expanded, so a column of serialized payloads becomes a
  browsable tree instead of a wall of text.
- **Double-encoded UTF-8** — the mojibake that comes out of Excel and ODBC pipelines — is
  detected and repaired.
- **Junk columns** are pruned: all-null columns, XLSX overflow columns, and `_col_N` columns that
  are more than 95% empty.
- The index is saved as `<filename>.scout-index.json` beside the source, so re-exploring is instant.

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
