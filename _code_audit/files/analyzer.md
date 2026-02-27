# File Report: `analyzer.py`

**Path:** `plugins/schema-scout/skills/schema-scout/tool/schema_scout/analyzer.py`
**LOC:** 432

---

## 1. Purpose

Core schema analysis engine. Scans rows of data, detects embedded JSON, recursively walks nested structures, collects per-field statistics (types, min/max, unique values, samples), and builds a `SchemaNode` tree representing the full schema.

## 2. Key Components

### Public API

| Function | Purpose |
|----------|---------|
| `analyze_rows(rows, max_rows, show_progress)` | Main entry point: processes an iterator of row dicts, returns `(SchemaNode, row_count)` |
| `analyze_file(path, max_rows, sheet_name, show_progress)` | Convenience wrapper: reads a file via `readers.read_file` then delegates to `analyze_rows` |

### Internal Components

| Component | Purpose |
|-----------|---------|
| `_FieldCollector` | Accumulates statistics for a single field path (types, min/max, unique values, reservoir sampling) |
| `_classify_type(value)` | Maps Python values to human-readable type names |
| `_try_parse_json(value)` | Detects JSON objects/arrays embedded in string values |
| `_repair_encoding(value)` | Fixes double-encoded UTF-8 (cp1252 -> UTF-8 round-trip artifacts) |
| `_walk_value(...)` | Recursive value walker -- handles dicts, lists, JSON-in-JSON, and primitives |
| `_split_path(path)` | Splits dot-separated paths while preserving `[]` array markers |
| `_CP1252_CHAR_TO_BYTE` | Module-level lookup table: Unicode char -> original cp1252 byte value (all 256 positions) |

### Named Constants

| Name | Value | Purpose |
|------|-------|---------|
| `MAX_UNIQUE_VALUES` | 50 | Cap on unique value tracking; switches to sampling above this threshold |
| `SAMPLE_SIZE` | 10 | Reservoir sampling pool size |
| `JSON_DETECTION_THRESHOLD` | 0.3 | Mark column as JSON if >30% of non-empty values parse successfully |
| `SPARSE_COLUMN_THRESHOLD` | 0.05 | Prune unnamed columns with <5% non-null values |
| `MAX_WALK_DEPTH` | 50 | Recursion depth limit for nested JSON walks |

## 3. Dependencies

| Dependency | Usage |
|------------|-------|
| `json` (stdlib) | Parsing embedded JSON strings |
| `random` (stdlib) | Reservoir sampling (Algorithm R) |
| `rich.progress` | Optional progress bar during analysis |
| `.models` | `SchemaNode`, `FieldStats` dataclasses |
| `.readers` | `read_file` (used by `analyze_file` convenience wrapper) |

## 4. Patterns / Conventions

- **Reservoir sampling (Algorithm R)** provides uniform sampling without knowing total count upfront -- appropriate for streaming analysis
- **JSON-in-JSON detection** is per-column: tracks parse rate across all rows before marking a column as JSON
- **Post-scan pruning** removes null-only columns and sparse `_col_N` overflow artifacts after the full scan completes
- **Encoding repair** uses a complete cp1252 reverse-mapping covering all 256 byte values, including the 5 undefined positions
- All named constants are defined at module level with descriptive names

## 5. Data & Side Effects

- `_FieldCollector` mutates internal state (type counts, value sets, min/max) as rows are processed
- `_walk_value` mutates a shared `json_parse_counts` dict through recursive calls to track per-column JSON parse rates
- `analyze_file` triggers file I/O via `readers.read_file`
- Progress bar (when enabled) writes to stderr via Rich

## 6. Risks / Issues

| Severity | Issue |
|----------|-------|
| Medium | `_repair_encoding` is a heuristic -- could silently corrupt legitimate cp1252 text that happens to match valid UTF-8 byte sequences |
| Low | `_walk_value` mutates a shared `json_parse_counts` dict through recursive calls -- harder to reason about and test in isolation |
| Low | Progress bar depends on `rich`, but `analyze_rows` is otherwise a pure computation -- creates coupling to a display library |
| Info | No tests exist -- all observations are from static code reading only |

## 7. Health Assessment

**Needs Attention**

- Core logic is well-structured with clear separation between field collection, type classification, and tree building
- Heuristic encoding repair carries a risk of silent data corruption in edge cases
- Shared mutable state (`json_parse_counts`) across recursive calls adds complexity
- No test coverage for the most complex module in the codebase

## 8. Test Coverage Hints

- `_classify_type`: pure function, easy to test with a value-type mapping table
- `_FieldCollector`: test accumulation behavior including the threshold switch from unique tracking to reservoir sampling
- `_try_parse_json` / `_repair_encoding`: test with known-good and adversarial inputs
- `analyze_rows`: integration test with small synthetic row iterators to verify tree shape and statistics
- Pruning logic: test that null-only and sparse unnamed columns are removed correctly

## 9. Suggested Improvements

- Add unit tests for all internal helpers, especially `_repair_encoding` with edge cases
- Extract `_repair_encoding` into a standalone utility to make it independently testable and reusable
- Decouple progress bar from analysis by accepting an optional callback or protocol instead of importing Rich directly
- Consider making `json_parse_counts` an explicit parameter or encapsulated state rather than a mutated dict passed through recursion
- Add a guard or warning when `_repair_encoding` makes changes, so callers can detect when the heuristic fires
