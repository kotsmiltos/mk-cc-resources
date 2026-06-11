"""File walker for the indexer.

Walks a directory tree, yielding (path, language) pairs for source files
that match the configured extensions and pass the exclude filters.

Excludes are evaluated as path-segment substring matches against the
relative path (e.g., 'node_modules' excludes any path containing that
segment). Glob patterns supported via fnmatch when the exclude contains
'*' or '?'.

Tests vs source: include_tests=False filters out paths containing a
conventional 'test' segment ('tests', 'test', '__tests__', '*_test.py',
'*test_*.py'). Setting include_tests=True disables that filter (the
caller can still exclude tests via the regular excludes list).
"""

from __future__ import annotations

import fnmatch
import os
from pathlib import Path
from typing import Iterable, Iterator

from code_glossary.constants import EXTENSION_TO_LANGUAGE


# Default excludes — directories that almost never contain source we want
# to index. Callers extend this via the config; this list is the baseline.
DEFAULT_EXCLUDES: tuple[str, ...] = (
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "env",
    ".env",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "target",
    # NOTE: "bin" is deliberately NOT excluded. .NET bin/ holds compiled
    # binaries (nothing with a mapped source extension), but Node projects
    # keep real CLI entry-point source in bin/ (e.g. bin/*.cjs) — excluding
    # it caused a silent indexer miss. .NET's generated-source dir is obj/,
    # which stays excluded below.
    "obj",
    "out",
    ".serena",
    ".idea",
    ".vscode",
    ".tox",
    ".mypy_cache",
    ".ruff_cache",
    "htmlcov",
    "*.egg-info",
)

# Path segments that strongly indicate test code. Used only when
# include_tests=False. Files whose relative-path contains any of these
# as a segment are filtered out.
TEST_PATH_SEGMENTS: tuple[str, ...] = (
    "tests",
    "test",
    "__tests__",
    "spec",
    "__pycache__",  # also caught by default excludes, kept for clarity
)

# File-name patterns that mark a file as test-only (used with include_tests=False).
TEST_FILENAME_PATTERNS: tuple[str, ...] = (
    "test_*",
    "*_test.*",
    "*.test.*",
    "*.spec.*",
)


def _is_excluded(rel_path: str, excludes: Iterable[str]) -> bool:
    """Return True iff any exclude pattern matches the relative path."""
    parts = rel_path.replace("\\", "/").split("/")
    for pat in excludes:
        # Glob pattern: match anywhere along the path.
        if any(c in pat for c in "*?["):
            if any(fnmatch.fnmatchcase(p, pat) for p in parts) or fnmatch.fnmatchcase(rel_path.replace("\\", "/"), pat):
                return True
        else:
            # Plain string: any path segment equal to it counts.
            if pat in parts:
                return True
    return False


def _looks_like_test(rel_path: str, filename: str) -> bool:
    """Return True iff the path looks like test code."""
    parts = rel_path.replace("\\", "/").split("/")
    if any(seg in parts for seg in TEST_PATH_SEGMENTS):
        return True
    name_lower = filename.lower()
    for pat in TEST_FILENAME_PATTERNS:
        if fnmatch.fnmatchcase(name_lower, pat):
            return True
    return False


def iter_source_files(
    root: Path | str,
    *,
    extensions: dict[str, str] | None = None,
    excludes: Iterable[str] = (),
    include_tests: bool = False,
) -> Iterator[tuple[Path, str]]:
    """Yield (absolute_path, language) for every source file under root.

    Args:
        root: directory to walk
        extensions: mapping extension -> language (default: EXTENSION_TO_LANGUAGE)
        excludes: additional exclude patterns on top of DEFAULT_EXCLUDES
        include_tests: when False, filter out paths that look like test code

    The iterator is deterministic: directories are walked in sorted order,
    files within a directory in sorted order.
    """
    root_path = Path(root).resolve()
    if not root_path.exists():
        raise FileNotFoundError(f"indexer root does not exist: {root_path}")
    if not root_path.is_dir():
        raise NotADirectoryError(f"indexer root is not a directory: {root_path}")

    ext_map = extensions if extensions is not None else EXTENSION_TO_LANGUAGE
    all_excludes = tuple(DEFAULT_EXCLUDES) + tuple(excludes)

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Sort for determinism.
        dirnames.sort()
        filenames.sort()

        # Prune excluded directories in-place so os.walk doesn't descend.
        rel_dir = os.path.relpath(dirpath, root_path).replace("\\", "/")
        # When walking the root itself, rel_dir == '.'; treat as empty for matching.
        for d in list(dirnames):
            sub_rel = d if rel_dir in ("", ".") else f"{rel_dir}/{d}"
            if _is_excluded(sub_rel, all_excludes):
                dirnames.remove(d)
                continue
            if not include_tests and _looks_like_test(sub_rel, d):
                dirnames.remove(d)

        for fname in filenames:
            ext = Path(fname).suffix.lower()
            lang = ext_map.get(ext)
            if lang is None:
                continue
            rel_path = fname if rel_dir in ("", ".") else f"{rel_dir}/{fname}"
            if _is_excluded(rel_path, all_excludes):
                continue
            if not include_tests and _looks_like_test(rel_path, fname):
                continue
            abs_path = Path(dirpath) / fname
            yield abs_path, lang
