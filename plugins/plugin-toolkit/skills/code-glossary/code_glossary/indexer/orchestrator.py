"""Indexer orchestration — Stage 1 public API.

Walks a source tree (walk.py), dispatches each file to the right
language parser, aggregates FunctionRecord results.

Parsers: python_parser (stdlib ast) for Python; treesitter_parser for
TypeScript/JavaScript/C#. Other languages are skipped (counted in the
report) — the SKILL.md layer LLM-sketches those per DESIGN-V2.md §5.

Public functions:

    index_directory(root, ...) -> list[FunctionRecord]
        Walk a directory and index every supported source file.

    index_file(path, language, ...) -> list[FunctionRecord]
        Parse a single file with the language-appropriate parser.

    index_directory_with_report(root, ...) -> tuple[list[FunctionRecord], IndexReport]
        Same as index_directory plus a structured report on what was
        seen, parsed, or skipped (for the indexer's section of the
        GLOSSARY.md run summary).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from code_glossary.indexer.python_parser import parse_file as _parse_python
from code_glossary.indexer.treesitter_parser import parse_file as _parse_treesitter
from code_glossary.indexer.walk import iter_source_files
from code_glossary.records import FunctionRecord

logger = logging.getLogger(__name__)


# Languages with a working deterministic parser (DESIGN-V2.md piece 6).
SUPPORTED_LANGUAGES_V2: tuple[str, ...] = ("python", "typescript", "javascript", "csharp")


@dataclass
class IndexReport:
    """Summary of what the indexer saw and did in one run.

    Used by the orchestrator that writes GLOSSARY.md so users can see
    'we walked 412 source files; indexed 826 functions across 89 .py
    files; 323 .ts files queued for the tree-sitter parser (wave 6)'.
    """

    files_seen: int = 0
    files_indexed: int = 0
    files_skipped_unsupported: int = 0
    files_skipped_error: int = 0
    records_emitted: int = 0
    languages_seen: dict[str, int] = field(default_factory=dict)  # language -> file count
    languages_indexed: dict[str, int] = field(default_factory=dict)  # language -> file count
    languages_skipped: dict[str, int] = field(default_factory=dict)  # language -> file count
    errors: list[tuple[str, str]] = field(default_factory=list)  # (path, message)


def index_file(
    path: Path,
    language: str,
    *,
    rel_to: Path | None = None,
) -> list[FunctionRecord]:
    """Parse one file with the language-appropriate parser.

    Unsupported languages return an empty list (no error). Files that
    fail to parse return an empty list and the parser logs a warning;
    use index_directory_with_report to surface those at the run level.
    """
    if language == "python":
        return _parse_python(path, rel_to=rel_to)
    if language in ("typescript", "javascript", "csharp"):
        return _parse_treesitter(path, language, rel_to=rel_to)
    return []


def index_directory(
    root: Path | str,
    *,
    excludes: Iterable[str] = (),
    include_tests: bool = False,
) -> list[FunctionRecord]:
    """Walk root, index every supported source file, return flat record list.

    Convenience entry point for callers that don't need the report.
    """
    records, _ = index_directory_with_report(
        root, excludes=excludes, include_tests=include_tests
    )
    return records


def index_directory_with_report(
    root: Path | str,
    *,
    excludes: Iterable[str] = (),
    include_tests: bool = False,
) -> tuple[list[FunctionRecord], IndexReport]:
    """Walk root, index, return (records, report)."""
    root_path = Path(root).resolve()
    report = IndexReport()
    records: list[FunctionRecord] = []

    for path, lang in iter_source_files(
        root_path, excludes=excludes, include_tests=include_tests
    ):
        report.files_seen += 1
        report.languages_seen[lang] = report.languages_seen.get(lang, 0) + 1

        if lang not in SUPPORTED_LANGUAGES_V2:
            report.files_skipped_unsupported += 1
            report.languages_skipped[lang] = report.languages_skipped.get(lang, 0) + 1
            continue

        try:
            file_records = index_file(path, lang, rel_to=root_path)
        except Exception as exc:  # pragma: no cover - parser raised unexpectedly
            logger.warning("indexer: unexpected error parsing %s: %s", path, exc)
            report.files_skipped_error += 1
            report.errors.append((str(path), str(exc)))
            continue

        if not file_records:
            # Empty result usually means the file had no qualifying functions
            # (or the parser logged a soft failure). Still counts as indexed
            # for the report.
            report.files_indexed += 1
            report.languages_indexed[lang] = report.languages_indexed.get(lang, 0) + 1
            continue

        report.files_indexed += 1
        report.languages_indexed[lang] = report.languages_indexed.get(lang, 0) + 1
        report.records_emitted += len(file_records)
        records.extend(file_records)

    return records, report
