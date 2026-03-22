"""File readers for XLSX, CSV, and JSON formats.

Each reader yields dictionaries (column_name -> cell_value), one per row.
Format is auto-detected by file extension.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Any, Iterator

from schema_scout.analyzer import DEFAULT_MAX_ROWS

# Maximum byte size for a JSON array file before we refuse to load it into
# memory wholesale. JSON arrays are parsed all at once (not streamed), so a
# large file would exhaust RAM. Users with large files should use NDJSON.
MAX_JSON_ARRAY_BYTES = 50 * 1024 * 1024  # 50 MB


def read_xlsx(
    path: Path, max_rows: int = DEFAULT_MAX_ROWS, sheet_name: str | None = None
) -> Iterator[dict[str, Any]]:
    """Read an XLSX file, yielding one dict per row.

    Uses openpyxl in read_only mode for memory-efficient streaming.
    First row is treated as headers.
    """
    import openpyxl

    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    ws = wb[sheet_name] if sheet_name else wb.active
    if ws is None:
        wb.close()
        return

    headers: list[str] | None = None
    row_count = 0

    for row in ws.iter_rows(values_only=True):
        if headers is None:
            # Trim trailing unnamed headers caused by openpyxl padding
            # rows to max_column. Find the last position with an actual
            # header name; anything beyond that is phantom padding.
            named_end = 0
            for i, h in enumerate(row):
                if h is not None:
                    named_end = i + 1
            trimmed = row[:named_end]
            headers = [str(h) if h is not None else f"_col_{i}" for i, h in enumerate(trimmed)]
            continue
        if row_count >= max_rows:
            break
        yield {h: v for h, v in zip(headers, row)}
        row_count += 1

    wb.close()


# Encodings to try in order when reading CSV files.
# utf-8-sig handles both UTF-8 and UTF-8 with BOM.
# latin-1 never fails (it maps every byte 0x00-0xFF) and covers
# most Western European CSVs exported from Excel on Windows.
CSV_ENCODING_FALLBACKS = ("utf-8-sig", "latin-1")


def read_csv(
    path: Path, max_rows: int = DEFAULT_MAX_ROWS, encoding: str | None = None,
) -> Iterator[dict[str, Any]]:
    """Read a CSV file, yielding one dict per row.

    Uses csv.DictReader with automatic dialect detection.
    Tries UTF-8 first, falls back to latin-1 for non-UTF-8 files.
    Pass ``encoding`` to force a specific encoding.
    """
    encodings = (encoding,) if encoding else CSV_ENCODING_FALLBACKS

    for enc in encodings:
        try:
            with open(path, newline="", encoding=enc) as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= max_rows:
                        break
                    yield dict(row)
            # If we get here without error, we're done
            return
        except UnicodeDecodeError:
            # Try next encoding
            continue

    # Should not reach here since latin-1 never raises UnicodeDecodeError,
    # but guard against explicit encoding that fails
    raise UnicodeDecodeError(
        encodings[-1], b"", 0, 1,
        f"Could not decode {path.name} with any of: {', '.join(encodings)}",
    )


def read_json(path: Path, max_rows: int = DEFAULT_MAX_ROWS) -> Iterator[dict[str, Any]]:
    """Read a JSON file, yielding one dict per row.

    Supports two formats:
    - JSON array: [{...}, {...}, ...]
    - NDJSON (newline-delimited): one JSON object per line
    """
    with open(path, encoding="utf-8") as f:
        first_char = f.read(1).strip()
        f.seek(0)

        if first_char == "[":
            # JSON arrays must be fully loaded into memory — guard against
            # files large enough to exhaust RAM. NDJSON is the streaming
            # alternative for large datasets.
            file_size = path.stat().st_size
            if file_size > MAX_JSON_ARRAY_BYTES:
                raise ValueError(
                    f"{path.name} is {file_size / (1024 * 1024):.1f} MB, which exceeds the "
                    f"{MAX_JSON_ARRAY_BYTES // (1024 * 1024)} MB limit for JSON array files. "
                    "Convert to NDJSON (one JSON object per line) for large files."
                )
            data = json.load(f)
            if not isinstance(data, list):
                data = [data]
            for i, item in enumerate(data):
                if i >= max_rows:
                    break
                if isinstance(item, dict):
                    yield item
                else:
                    yield {"_value": item}
        else:
            # NDJSON — one JSON object per line
            row_count = 0
            skipped_lines = 0
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if row_count >= max_rows:
                    break
                try:
                    item = json.loads(line)
                    if isinstance(item, dict):
                        yield item
                    else:
                        yield {"_value": item}
                    row_count += 1
                except json.JSONDecodeError:
                    skipped_lines += 1
                    continue

            if skipped_lines > 0:
                print(
                    f"scout: warning: skipped {skipped_lines} malformed NDJSON "
                    f"line(s) in {path.name}",
                    file=sys.stderr,
                )


SUPPORTED_EXTENSIONS = {
    ".xlsx": read_xlsx,
    ".csv": read_csv,
    ".json": read_json,
    ".ndjson": read_json,
    ".jsonl": read_json,
}


def read_file(
    path: Path, max_rows: int = DEFAULT_MAX_ROWS, sheet_name: str | None = None
) -> Iterator[dict[str, Any]]:
    """Auto-detect file format by extension and read it.

    Supported: .xlsx, .csv, .json, .ndjson, .jsonl
    """
    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file format: {ext}. "
            f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )
    reader_fn = SUPPORTED_EXTENSIONS[ext]
    if ext == ".xlsx":
        yield from reader_fn(path, max_rows=max_rows, sheet_name=sheet_name)
    else:
        yield from reader_fn(path, max_rows=max_rows)
