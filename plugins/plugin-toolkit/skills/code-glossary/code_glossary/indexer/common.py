"""Shared helpers for Stage 1 language parsers.

Both python_parser (stdlib ast) and treesitter_parser (TS/JS/C#) emit
FunctionRecords with the same ID scheme and path normalization. Keeping
these here guarantees cross-language records stay comparable: the same
file path + line always yields the same record ID regardless of which
parser produced it.
"""

from __future__ import annotations

import hashlib
from pathlib import Path


def make_record_id(rel_path: str, line: int) -> str:
    """Deterministic ID: stable across runs as long as file path + line unchanged."""
    h = hashlib.sha1(f"{rel_path}:{line}".encode("utf-8")).hexdigest()[:8]
    return f"fn-{h}"


def relative_path(path: Path, rel_to: Path | None) -> str:
    """Normalize a file path for FunctionRecord.location.file.

    Relative to rel_to when given (falling back to absolute when the
    path is outside rel_to), always forward-slashed for Windows parity.
    """
    if rel_to is None:
        return str(path).replace("\\", "/")
    try:
        return str(path.relative_to(rel_to)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")
