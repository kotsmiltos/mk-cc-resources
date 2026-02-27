# Test Strategy

Test hints and coverage plan for schema-scout — the only plugin with executable Python code.

## Unit Test Targets

### `analyzer.py` — Highest priority

| Function | What to test | Fixture |
|----------|-------------|---------|
| `_classify_type` | All Python types map to correct string labels | Inline values |
| `_try_parse_json` | Valid JSON objects/arrays parsed, primitives and invalid strings return None | Inline strings |
| `_repair_encoding` | Double-encoded UTF-8 strings repaired; clean strings pass through unchanged | Inline string pairs |
| `_walk_value` (dict) | Nested object paths built correctly, stats collected | Inline dicts |
| `_walk_value` (list) | Array paths use `[]` marker, `_length` collector tracks sizes | Inline lists |
| `_walk_value` (JSON-in-JSON) | String containing JSON is expanded and walked recursively | `'{"a": 1}'` |
| `_walk_value` (depth limit) | Recursion stops at `MAX_WALK_DEPTH`, value recorded as string | Deeply nested dict |
| `_FieldCollector.add` | Tracks types, nulls, min/max, unique values, reservoir sampling | Sequence of values |
| `_FieldCollector` (capping) | After >50 unique values, switches to reservoir sampling | 60+ unique strings |
| `analyze_rows` | Null-only columns pruned, sparse `_col_N` columns pruned, JSON columns detected | Small row iterator |

### `readers.py`

| Function | What to test | Fixture |
|----------|-------------|---------|
| `read_csv` | UTF-8 file reads correctly; latin-1 fallback works | 2 small CSV files |
| `read_csv` (max_rows) | Stops after max_rows | CSV with 20 rows, max_rows=5 |
| `read_json` (array) | JSON array yields dicts; non-dict items wrapped in `{"_value": ...}` | Small JSON file |
| `read_json` (NDJSON) | One-per-line format works; blank lines skipped | Small NDJSON file |
| `read_file` | Dispatches to correct reader by extension; rejects unsupported | Various extensions |

### `models.py`

| Class | What to test |
|-------|-------------|
| `FieldStats` | Round-trip `to_dict()` → `from_dict()` preserves all fields |
| `SchemaNode` | `to_dict()` → `from_dict()` preserves nested tree structure |
| `SchemaNode.find_node` | Finds existing paths, returns None for missing |
| `SchemaNode.get_all_paths` | Returns all leaf paths in sorted order |

### `index_io.py`

| Function | What to test |
|----------|-------------|
| `get_index_path` | Returns `<name>.scout-index.json` next to source |
| `save_index` + `load_index` | Round-trip preserves schema tree and metadata |
| `index_exists` | True when index file present, False otherwise |

### `cli.py`

CLI tests are lower priority (UI layer), but consider:

| Scenario | Approach |
|----------|----------|
| `index` command | Integration test with a small CSV fixture, verify index file created |
| `query --path` invalid | Check exit code 1 and error message |
| `--format json` | Verify output is valid JSON |

## Fixture Strategy

- **Small fixture files** in `tests/fixtures/`: a 5-row CSV, a 3-object JSON, a 5-row XLSX
- **Inline data** for pure function unit tests (no file I/O needed)
- XLSX fixtures require openpyxl to create — consider a `conftest.py` that generates them

## Coverage Goals

| Module | Target |
|--------|--------|
| `analyzer.py` | 80%+ (core logic, most complex) |
| `readers.py` | 70%+ (file I/O, encoding edge cases) |
| `models.py` | 90%+ (pure data, easy to test) |
| `index_io.py` | 90%+ (serialization round-trips) |
| `cli.py` | 50%+ (integration tests for main commands) |
