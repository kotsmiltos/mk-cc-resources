"""Tests for the indexer orchestrator."""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from code_glossary.indexer import (
    IndexReport,
    SUPPORTED_LANGUAGES_V2,
    index_directory,
    index_directory_with_report,
    index_file,
)


def _write(tmp_path: Path, files: dict[str, str]) -> None:
    for rel, content in files.items():
        p = tmp_path / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8")


# --- index_file ---

def test_index_file_python(tmp_path: Path):
    p = tmp_path / "x.py"
    p.write_text(textwrap.dedent("""
        def f():
            a = 1
            return a
    """).lstrip(), encoding="utf-8")
    records = index_file(p, "python", rel_to=tmp_path)
    assert len(records) == 1
    assert records[0].location.function == "f"


def test_index_file_unsupported_returns_empty(tmp_path: Path):
    p = tmp_path / "x.go"
    p.write_text("package main", encoding="utf-8")
    records = index_file(p, "go", rel_to=tmp_path)
    assert records == []


def test_index_file_typescript_unsupported_in_wave2(tmp_path: Path):
    """TS isn't supported until wave 6; orchestrator skips silently."""
    p = tmp_path / "x.ts"
    p.write_text("function f() {}", encoding="utf-8")
    records = index_file(p, "typescript", rel_to=tmp_path)
    assert records == []


def test_index_file_csharp_unsupported_in_wave2(tmp_path: Path):
    """C# isn't supported until wave 6; orchestrator skips silently."""
    p = tmp_path / "X.cs"
    p.write_text("namespace Foo {}", encoding="utf-8")
    records = index_file(p, "csharp", rel_to=tmp_path)
    assert records == []


# --- index_directory ---

def test_index_directory_single_python_file(tmp_path: Path):
    _write(tmp_path, {
        "a.py": """
            def add(a, b):
                result = a + b
                return result
        """,
    })
    records = index_directory(tmp_path)
    assert len(records) == 1
    assert records[0].location.function == "add"


def test_index_directory_multiple_files(tmp_path: Path):
    _write(tmp_path, {
        "a.py": """
            def alpha():
                x = 1
                return x

            def beta():
                y = 2
                return y
        """,
        "sub/b.py": """
            def gamma():
                z = 3
                return z
        """,
    })
    records = index_directory(tmp_path)
    names = sorted(r.location.function for r in records)
    assert names == ["alpha", "beta", "gamma"]


def test_index_directory_skips_excluded_dirs(tmp_path: Path):
    _write(tmp_path, {
        "a.py": "def f():\n    x = 1\n    return x\n",
        "node_modules/foo.py": "def should_not_index():\n    x = 1\n    return x\n",
    })
    records = index_directory(tmp_path)
    names = [r.location.function for r in records]
    assert "f" in names
    assert "should_not_index" not in names


def test_index_directory_custom_excludes(tmp_path: Path):
    _write(tmp_path, {
        "a.py": "def f():\n    x = 1\n    return x\n",
        "vendor/v.py": "def should_skip():\n    x = 1\n    return x\n",
    })
    records = index_directory(tmp_path, excludes=("vendor",))
    names = [r.location.function for r in records]
    assert "f" in names
    assert "should_skip" not in names


def test_index_directory_include_tests_false_by_default(tmp_path: Path):
    _write(tmp_path, {
        "a.py": "def f():\n    x = 1\n    return x\n",
        "tests/test_a.py": "def test_thing():\n    x = 1\n    assert x\n",
    })
    records = index_directory(tmp_path)
    names = [r.location.function for r in records]
    assert "f" in names
    assert "test_thing" not in names


def test_index_directory_include_tests_true(tmp_path: Path):
    _write(tmp_path, {
        "a.py": "def f():\n    x = 1\n    return x\n",
        "tests/test_a.py": "def test_thing():\n    x = 1\n    assert x\n",
    })
    records = index_directory(tmp_path, include_tests=True)
    names = sorted(r.location.function for r in records)
    assert "f" in names
    assert "test_thing" in names


def test_index_directory_returns_empty_on_no_source(tmp_path: Path):
    _write(tmp_path, {"README.md": "# hi"})
    records = index_directory(tmp_path)
    assert records == []


# --- index_directory_with_report ---

def test_report_counts_files_and_records(tmp_path: Path):
    _write(tmp_path, {
        "a.py": "def a():\n    x = 1\n    return x\n",
        "b.py": "def b():\n    x = 1\n    return x\n",
    })
    _, report = index_directory_with_report(tmp_path)
    assert report.files_seen == 2
    assert report.files_indexed == 2
    assert report.records_emitted == 2
    assert report.files_skipped_unsupported == 0
    assert report.files_skipped_error == 0


def test_report_counts_unsupported_languages(tmp_path: Path):
    """TS and C# files are seen but skipped in wave 2."""
    _write(tmp_path, {
        "a.py": "def a():\n    x = 1\n    return x\n",
        "b.ts": "function b() { return 1; }",
        "C.cs": "namespace X { class Y { void Z() {} } }",
    })
    _, report = index_directory_with_report(tmp_path)
    assert report.files_seen == 3
    assert report.files_indexed == 1  # just the .py
    assert report.files_skipped_unsupported == 2  # .ts + .cs
    assert report.languages_skipped.get("typescript") == 1
    assert report.languages_skipped.get("csharp") == 1


def test_report_records_languages_seen_per_run(tmp_path: Path):
    _write(tmp_path, {
        "a.py": "def a():\n    x = 1\n    return x\n",
        "b.py": "def b():\n    x = 1\n    return x\n",
        "c.ts": "function c() {}",
    })
    _, report = index_directory_with_report(tmp_path)
    assert report.languages_seen.get("python") == 2
    assert report.languages_seen.get("typescript") == 1


def test_supported_languages_v2_is_only_python():
    """Locks wave 2 scope: tree-sitter (TS+C#) is wave 6."""
    assert SUPPORTED_LANGUAGES_V2 == ("python",)
