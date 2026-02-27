# File Report: `readers.py`

**Path:** `plugins/schema-scout/skills/schema-scout/tool/schema_scout/readers.py`
**LOC:** 164

---

## 1. Purpose

File format readers for XLSX, CSV, and JSON/NDJSON files. Each reader is a generator that yields row dicts, providing a uniform streaming interface for the analysis engine regardless of input format.

## 2. Key Components

### Public API

| Function | Purpose |
|----------|---------|
| `read_xlsx(path, max_rows, sheet_name)` | Read XLSX via openpyxl in streaming `read_only` mode |
| `read_csv(path, max_rows, encoding)` | Read CSV with automatic encoding fallback (UTF-8 -> latin-1) |
| `read_json(path, max_rows)` | Read JSON array or NDJSON/JSONL line-by-line |
| `read_file(path, max_rows, sheet_name)` | Auto-dispatch to the correct reader based on file extension |

### Named Constants

| Name | Value | Purpose |
|------|-------|---------|
| `CSV_ENCODING_FALLBACKS` | `("utf-8-sig", "latin-1")` | Ordered encoding chain for CSV reading |
| `SUPPORTED_EXTENSIONS` | `.xlsx`, `.csv`, `.json`, `.ndjson`, `.jsonl` | Extension -> reader mapping |

## 3. Dependencies

| Dependency | Usage |
|------------|-------|
| `openpyxl` | XLSX reading in streaming `read_only` mode |
| `csv` (stdlib) | CSV parsing via `DictReader` |
| `json` (stdlib) | JSON and NDJSON parsing |
| `pathlib` (stdlib) | File path and extension handling |

## 4. Patterns / Conventions

- **All readers are generators** (`yield` dicts) -- memory-efficient streaming for large files
- **XLSX header cleanup** -- trims trailing `None` headers caused by openpyxl padding rows to `max_column`, and renames unnamed columns to `_col_N`
- **CSV encoding chain** -- tries `utf-8-sig` first (handles BOM), falls back to `latin-1` (maps all 256 byte values, never fails)
- **JSON format detection** -- peeks at the first non-whitespace character: `[` triggers array mode, anything else triggers NDJSON line-by-line mode
- **Non-dict JSON items** are wrapped in `{"_value": item}` to ensure uniform row dict output across all formats
- **Extension dispatch** in `read_file` uses a clean mapping from suffix to reader function

## 5. Data & Side Effects

- All readers perform file I/O (read-only)
- `read_xlsx` opens a workbook in `read_only` mode and closes it after the generator is exhausted
- `read_csv` may open the same file twice if the first encoding fails and the fallback is used
- No writes to the filesystem, no mutable module-level state

## 6. Risks / Issues

| Severity | Issue |
|----------|-------|
| Medium | `read_csv` has a subtle duplicate-row risk: if `utf-8-sig` partially yields rows before hitting a `UnicodeDecodeError`, those rows are already consumed, but the fallback re-reads from the start. In practice, `utf-8-sig` fails fast on invalid bytes, so this is unlikely. |
| Low | `read_xlsx` does not close the workbook on generator abandonment -- `wb.close()` only runs if the generator loop completes or is explicitly closed |
| Low | `read_json` opens files as UTF-8 only -- no encoding fallback like CSV has |
| Info | Extension dispatch in `read_file` is clean and easy to extend with new formats |

## 7. Health Assessment

**Needs Attention**

- Clean generator-based design with good format coverage
- The CSV duplicate-row edge case is a real (though unlikely) correctness risk
- XLSX workbook resource leak on abandoned generators should be addressed
- JSON reader lacks encoding flexibility compared to the CSV reader

## 8. Test Coverage Hints

- `read_csv`: test with UTF-8, UTF-8-BOM, and latin-1 encoded files to exercise the fallback chain
- `read_xlsx`: test with files containing trailing empty columns, unnamed columns, and multiple sheets
- `read_json`: test with JSON arrays, NDJSON, non-dict items (e.g., arrays of scalars), and empty files
- `read_file`: test extension dispatch including unsupported extensions (should raise an error)
- Generator behavior: verify `max_rows` cap is respected across all readers

## 9. Suggested Improvements

- Wrap `read_xlsx` generator body in a `try/finally` block to ensure `wb.close()` is called even when the generator is abandoned (or use `contextlib.closing`)
- Refactor `read_csv` to detect encoding before yielding any rows (e.g., read a byte sample with `chardet` or try decoding a fixed prefix) to eliminate the duplicate-row risk
- Add encoding fallback support to `read_json` for parity with the CSV reader
- Consider returning a named tuple or dataclass from `read_file` that includes metadata (detected encoding, row count estimate) alongside the row generator
