# Task 3: Input Validation + Scout Index Cleanup

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Add input validation at system boundaries where untrusted data enters the codebase: slug validation in repo_audit.py (RV-4 + description YAML injection), file size guard for JSON arrays in readers.py (RV-2), and absolute path removal from scout index files (RV-3). Also clean up the scout index format: remove the duplicate `source_file_name` field (IQ-4), tie `schema_scout_version` to `__version__` (IQ-7), and add a warning counter for skipped NDJSON lines (IQ-10).

## Context

Read these files first:
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py` — focus on `_ensure_index` (lines ~56-87)
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/index_io.py` — `save_index` and `load_index`
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/readers.py` — `read_json` (lines ~100-135)
- `plugins/schema-scout/skills/schema-scout/tool/schema_scout/__init__.py` — `__version__`
- `plugins/repo-audit/skills/repo-audit/scripts/repo_audit.py` — `cmd_amend` function, focus on slug usage (line ~113) and description interpolation (line ~125)

**Decision 7 from PLAN.md:** Include description YAML injection fix with slug validation (same file, same concern).

## Interface Specification

### Inputs
- `repo_audit.py`: `--slug` CLI argument (untrusted string), `--description` CLI argument (untrusted string)
- `readers.py`: JSON file path (user-specified file on disk)
- `cli.py` / `index_io.py`: data file path, schema analysis results

### Outputs
- `repo_audit.py`: validated slug (alphanumeric + hyphens + underscores only), sanitized description (YAML-safe)
- `readers.py`: rows from JSON (with file size guard and NDJSON skip counter)
- `index_io.py`: clean index JSON (no `source_file_name`, `schema_scout_version` from `__version__`, `source_file` as basename)

### Contracts with Other Tasks
- None — schema-scout and repo-audit are independent modules.
- **Mirror sync required:** After changes to `plugins/schema-scout/skills/schema-scout/tool/`, sync to `skills/schema-scout/tool/`. After changes to `plugins/repo-audit/skills/repo-audit/scripts/`, sync to `skills/repo-audit/scripts/`. (Manual sync until Sprint 3 enforcement is in place.)

## Pseudocode

```
FIX 1 — Slug validation in repo_audit.py (RV-4):
  1. Import re at top of file (if not already imported)
  2. Define a validation constant:
     VALID_SLUG_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')
  3. In cmd_amend(), before using slug in filename construction:
     if not VALID_SLUG_PATTERN.match(slug):
       print(f"Error: slug '{slug}' contains invalid characters. "
             f"Only alphanumeric characters, hyphens, and underscores are allowed.",
             file=sys.stderr)
       sys.exit(1)

FIX 2 — Description YAML injection in repo_audit.py (Decision 7):
  1. In cmd_amend(), before interpolating description into YAML:
     # Sanitize description for safe YAML embedding
     # Replace double quotes to prevent YAML string breakout
     # Replace newlines to prevent YAML key injection
     safe_description = description.replace('"', '\\"').replace('\n', ' ')
  2. Use safe_description in the YAML template instead of raw description

FIX 3 — JSON file size guard in readers.py (RV-2):
  1. Define constant at module level:
     MAX_JSON_ARRAY_BYTES = 50 * 1024 * 1024  # 50 MB
  2. In read_json(), before the json.load(f) call for the array branch:
     file_size = path.stat().st_size
     if file_size > MAX_JSON_ARRAY_BYTES:
       raise ValueError(
         f"JSON array file is {file_size / 1024 / 1024:.0f} MB, "
         f"exceeding the {MAX_JSON_ARRAY_BYTES / 1024 / 1024:.0f} MB limit. "
         f"Convert to NDJSON format (one JSON object per line) for streaming support."
       )

FIX 4 — NDJSON skip counter in readers.py (IQ-10):
  1. In read_json(), in the NDJSON reading loop:
     skipped_lines = 0
     # ... existing loop ...
     except json.JSONDecodeError:
       skipped_lines += 1
       continue
     # After the loop:
     if skipped_lines:
       print(f"scout: warning: skipped {skipped_lines} malformed NDJSON line(s) in {path.name}",
             file=sys.stderr)

FIX 5 — Remove source_file_name from index_io.py (IQ-4):
  1. In save_index(), remove the line:
     "source_file_name": source_path.name,
  2. Keep "source_file": source_path.name (basename, consistent)

FIX 6 — Tie schema_scout_version to __version__ (IQ-7):
  1. At top of index_io.py, add:
     from schema_scout import __version__
  2. In save_index(), replace:
     "schema_scout_version": "1.0",
     With:
     "schema_scout_version": __version__,

FIX 7 — Remove absolute path from _ensure_index (RV-3):
  1. In cli.py _ensure_index(), change:
     "source_file": str(file.resolve()),
     To:
     "source_file": file.name,
  2. This makes the in-memory metadata consistent with what save_index writes to disk

FIX 8 — Handle old index format gracefully:
  1. In load_index(), the existing code already passes through all metadata keys.
     No change needed — old indexes with "source_file_name" and "schema_scout_version": "1.0"
     will load without error. The fields are just ignored by current code.
  2. Add a comment documenting this forward-compatibility:
     # Note: older indexes may have "source_file_name" (removed in 1.1.0) and
     # "schema_scout_version": "1.0" (now uses __version__). Both are handled gracefully.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/repo-audit/skills/repo-audit/scripts/repo_audit.py` | MODIFY | Add VALID_SLUG_PATTERN, validate slug before filename use, sanitize description before YAML interpolation |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/readers.py` | MODIFY | Add MAX_JSON_ARRAY_BYTES constant, file size guard before json.load, NDJSON skipped_lines counter |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/index_io.py` | MODIFY | Remove source_file_name field, import and use __version__ for schema_scout_version, add compatibility comment |
| `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py` | MODIFY | Change source_file from absolute path to basename in _ensure_index metadata |
| `skills/schema-scout/tool/schema_scout/readers.py` | CHECK | Mirror sync after plugin change |
| `skills/schema-scout/tool/schema_scout/index_io.py` | CHECK | Mirror sync after plugin change |
| `skills/schema-scout/tool/schema_scout/cli.py` | CHECK | Mirror sync after plugin change |
| `skills/repo-audit/scripts/repo_audit.py` | CHECK | Mirror sync after plugin change |
| `plugins/schema-scout/.claude-plugin/plugin.json` | CHECK | Version bump needed (coordinate at end of Sprint 1) |
| `plugins/repo-audit/.claude-plugin/plugin.json` | CHECK | Version bump needed (coordinate at end of Sprint 1) |

## Acceptance Criteria

- [ ] `repo_audit.py --slug "../evil"` raises a clear validation error and creates no file
- [ ] `repo_audit.py --slug "valid-slug_123"` works normally
- [ ] `repo_audit.py --description 'test"\nslug: injected'` produces valid YAML without injected fields
- [ ] `read_json` on a JSON array file >50 MB raises `ValueError` with a message suggesting NDJSON format
- [ ] `read_json` on a JSON array file <50 MB works normally with `max_rows` applied
- [ ] `read_json` on an NDJSON file with 3 malformed lines prints `scout: warning: skipped 3 malformed NDJSON line(s)` to stderr
- [ ] `save_index` output JSON does NOT contain `source_file_name` key
- [ ] `save_index` output JSON contains `schema_scout_version` matching `__version__` from `__init__.py`
- [ ] `_ensure_index` metadata dict has `source_file` as basename (e.g., `"data.csv"` not `"C:\Users\...\data.csv"`)
- [ ] `load_index` handles old index files (with `source_file_name` and `schema_scout_version: "1.0"`) without error
- [ ] `skills/schema-scout/` and `skills/repo-audit/` mirror copies are updated to match plugin sources
- [ ] `grep -r "source_file_name" plugins/schema-scout/` returns zero hits in `index_io.py` (only in old index files if they exist)

## Edge Cases

- **Slug with unicode characters:** The regex `^[a-zA-Z0-9_-]+$` rejects unicode. This is intentional — slugs are filesystem identifiers and should be ASCII-safe across all platforms.
- **Empty slug:** The regex rejects empty strings (no match). The error message covers this case.
- **Description with only double quotes:** `'"only quotes"'` becomes `'\\"only quotes\\"'` — valid YAML when wrapped in outer double quotes. The existing template wraps description in double quotes.
- **JSON file exactly at 50 MB:** `>` comparison means exactly 50 MB passes. This is the intended boundary — guard triggers above 50 MB.
- **NDJSON with max_rows hit before any malformed lines:** The skipped_lines counter stays 0 and no warning is printed. Correct — no lines were skipped.
- **NDJSON with all lines malformed:** All lines are skipped. Warning prints the total count. `read_json` yields nothing. The caller (`analyze_file`) handles empty input gracefully.
- **Old index file with source_file_name:** `load_index` returns it as part of metadata dict. No code reads this key, so it's harmless. Over time, re-indexing will produce clean indexes without this field.

## Notes

- The `re` module is already imported in `repo_audit.py` (used for path normalization). No new import needed.
- The `MAX_JSON_ARRAY_BYTES` constant is deliberately generous (50 MB). Most JSON array data files are under 10 MB. The guard prevents catastrophic OOM, not normal usage.
- The NDJSON path in `readers.py` already handles streaming correctly — it reads line by line. The file size guard only applies to the non-streaming `json.load()` branch.
- Mirror syncs to `skills/` are manual until Sprint 3's sync enforcement is in place. The implementer must do these syncs as the final step of this task.
