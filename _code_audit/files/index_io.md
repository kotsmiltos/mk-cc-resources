# File Report: `index_io.py`

**Path:** `plugins/schema-scout/skills/schema-scout/tool/schema_scout/index_io.py`
**LOC:** 74

---

## 1. Purpose

Index persistence layer. Handles saving and loading schema analysis results to/from `.scout-index.json` files alongside the source data files.

## 2. Key Components

| Function | Purpose |
|----------|---------|
| `get_index_path(source_path)` | Map a source file path to its corresponding `.scout-index.json` path |
| `save_index(schema, source_path, rows_analyzed, max_rows, sheet_name, output_path)` | Serialize a `SchemaNode` tree to a JSON index file with metadata |
| `load_index(index_path)` | Deserialize a JSON index file back into a `SchemaNode` tree and metadata |
| `index_exists(source_path)` | Check whether an index file already exists for the given source |

## 3. Dependencies

| Dependency | Usage |
|------------|-------|
| `json` (stdlib) | Serialization and deserialization |
| `pathlib` (stdlib) | File path construction |
| `datetime` (stdlib) | UTC timestamp generation (`datetime.now(timezone.utc).isoformat()`) |
| `.models` | `SchemaNode.to_dict()` / `SchemaNode.from_dict()` for tree serialization |

## 4. Patterns / Conventions

- **Naming convention:** index files are named `<filename>.scout-index.json` and placed in the same directory as the source file
- **Metadata envelope:** saved indexes include version, source file name, row count, analysis settings, and a UTC timestamp
- **Fallback serializer:** `json.dump` uses `default=str` to prevent crashes on unexpected types (e.g., `datetime`, `Path`)
- **Timestamps** use `datetime.now(timezone.utc).isoformat()` for timezone-aware, unambiguous values

## 5. Data & Side Effects

- `save_index` writes a JSON file to the filesystem (in the source file's parent directory by default, or to `output_path` if specified)
- `load_index` reads a JSON file from disk
- `index_exists` performs a filesystem existence check
- No in-memory caching or mutable module-level state

## 6. Risks / Issues

| Severity | Issue |
|----------|-------|
| Low | No schema version migration -- if the index format changes in a future release, old index files will silently load with missing or incorrect fields |
| Low | `save_index` writes to the source file's parent directory by default -- will fail if that directory is read-only |
| Info | `default=str` in `json.dump` silently converts unknown types to strings rather than raising an error, which could mask serialization bugs |

## 7. Health Assessment

**Healthy**

- Clean, focused module with a small surface area and clear responsibility
- No complex logic or hidden state
- Low-severity issues are reasonable trade-offs for a CLI tool

## 8. Test Coverage Hints

- Round-trip test: `save_index` then `load_index` and assert the deserialized `SchemaNode` matches the original
- `get_index_path`: test with various source file paths (including edge cases like paths with dots, spaces, or no extension)
- `index_exists`: test with existing and non-existing files
- Verify metadata fields (version, timestamp, source filename) are correctly populated in the saved JSON

## 9. Suggested Improvements

- Add a schema version field to the index format and validate it on load -- raise a clear error or trigger re-indexing if the version is outdated
- Consider using a context manager or explicit error handling for file writes so that partial/corrupted index files are not left on disk after a failure
- Replace `default=str` with explicit serialization for known types so that unexpected types raise an error during development
