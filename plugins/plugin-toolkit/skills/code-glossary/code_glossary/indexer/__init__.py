"""Indexer — Stage 1 of the code-glossary pipeline.

Walks a source tree, identifies source files by extension, parses each
to extract function/method records. Per-language parsers live in sibling
modules (python_parser, treesitter_parser, sketch); this package's
public API picks the right one per file.

Public API:

    from code_glossary.indexer import index_directory

    records = index_directory(
        root="src/",
        excludes=["__pycache__", ".venv"],
        include_tests=False,
    )
"""

from code_glossary.indexer.orchestrator import (
    IndexReport,
    SUPPORTED_LANGUAGES_V2,
    index_directory,
    index_directory_with_report,
    index_file,
)
from code_glossary.indexer.walk import iter_source_files

__all__ = [
    "iter_source_files",
    "index_directory",
    "index_directory_with_report",
    "index_file",
    "IndexReport",
    "SUPPORTED_LANGUAGES_V2",
]
