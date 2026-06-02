"""Dogfood: index the code-glossary engine against its own source.

Runs index_directory on the code_glossary/ package itself. This catches
real-world surprises that handcrafted fixtures miss:
- can the parser handle every file we ship?
- do the record counts look sane?
- are the IDs unique?
- do the body excerpts roundtrip through ast.get_source_segment cleanly?

Also acts as the first smoke for the broader 'tests pass + dogfood A/B'
done definition. Full Scalable Crowd A/B comes in wave 12.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.indexer import index_directory_with_report


# Resolve the code_glossary package source path relative to this test file.
ENGINE_SOURCE = Path(__file__).resolve().parent.parent / "code_glossary"


def test_engine_source_exists():
    assert ENGINE_SOURCE.is_dir(), f"engine source not found at {ENGINE_SOURCE}"


def test_dogfood_indexes_own_package_without_error():
    records, report = index_directory_with_report(ENGINE_SOURCE)
    assert report.files_skipped_error == 0, f"unexpected parse errors: {report.errors}"
    assert report.records_emitted > 0, "no records emitted — indexer is broken or package is empty"


def test_dogfood_record_count_is_sane():
    """We have several Python files; >=10 indexable functions is a reasonable floor."""
    records, report = index_directory_with_report(ENGINE_SOURCE)
    assert report.files_indexed >= 4, f"expected to index 4+ python files; got {report.files_indexed}"
    assert len(records) >= 10, f"expected 10+ functions in own package; got {len(records)}"


def test_dogfood_all_records_have_required_fields():
    records, _ = index_directory_with_report(ENGINE_SOURCE)
    for rec in records:
        assert rec.id, f"empty id on record at {rec.location.file}:{rec.location.line}"
        assert rec.location.file.endswith(".py"), f"non-python file: {rec.location.file}"
        assert rec.location.line > 0
        assert rec.location.function, f"empty function name at {rec.location.file}:{rec.location.line}"
        assert rec.signature.startswith(("def ", "async def "))
        assert rec.body.strip(), f"empty body at {rec.location.file}:{rec.location.line}"
        assert rec.language == "python"


def test_dogfood_record_ids_are_unique():
    records, _ = index_directory_with_report(ENGINE_SOURCE)
    ids = [r.id for r in records]
    assert len(ids) == len(set(ids)), "record IDs are not unique"


def test_dogfood_finds_known_validate_glossary():
    """validate_glossary is a top-level function in schema.py. It must appear."""
    records, _ = index_directory_with_report(ENGINE_SOURCE)
    matching = [
        r for r in records
        if r.location.function == "validate_glossary"
        and r.location.file.endswith("schema.py")
    ]
    assert len(matching) == 1, f"expected exactly 1 validate_glossary in schema.py; got {len(matching)}"
    rec = matching[0]
    assert rec.signature.startswith("def validate_glossary(")
    assert "errors" in rec.body  # body contains the var name
    # notable_calls should include ValidationError construction
    assert "ValidationError" in rec.notable_calls


def test_dogfood_finds_known_normalize_label():
    """normalize_label is a top-level function in vocab.py."""
    records, _ = index_directory_with_report(ENGINE_SOURCE)
    matching = [
        r for r in records
        if r.location.function == "normalize_label"
        and r.location.file.endswith("vocab.py")
    ]
    assert len(matching) == 1
    rec = matching[0]
    assert "Vocabulary" in rec.signature
    assert "label" in rec.notable_inputs[0]


def test_dogfood_no_test_files_indexed_by_default():
    """include_tests=False (default) must skip the tests/ folder.

    Indexing the parent (tests/'s sibling = the skill folder) confirms
    that tests/ doesn't contribute records. Here we just index the engine,
    which IS the non-tests folder, so the test files literally aren't
    reachable. Inverse confirms via report on the parent.
    """
    parent = ENGINE_SOURCE.parent  # the skill folder
    _, report = index_directory_with_report(parent, include_tests=False)
    # The .venv/__pycache__/etc. are excluded by default; tests/ by the
    # include_tests filter; only the engine package's .py files should
    # be indexed.
    test_records_in_indexed = [
        f for f in report.languages_indexed
    ]
    # We can also check: report.files_indexed should equal the count of
    # .py files in code_glossary/ (no tests).
    engine_py_files = list(ENGINE_SOURCE.rglob("*.py"))
    # __pycache__ files are excluded by walker; filter for sanity.
    engine_py_files = [
        p for p in engine_py_files if "__pycache__" not in p.parts
    ]
    assert report.files_indexed == len(engine_py_files), (
        f"expected indexer to see exactly {len(engine_py_files)} engine .py files; "
        f"got {report.files_indexed}. Possible test-file leak."
    )


def test_dogfood_with_tests_includes_test_files():
    parent = ENGINE_SOURCE.parent
    _, report_no_tests = index_directory_with_report(parent, include_tests=False)
    _, report_with_tests = index_directory_with_report(parent, include_tests=True)
    assert report_with_tests.files_indexed > report_no_tests.files_indexed, (
        "include_tests=True should index more files than False"
    )
