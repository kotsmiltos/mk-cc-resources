"""Tests for the Python AST function extractor.

Builds tiny .py source samples in tmp_path, parses them, asserts the
FunctionRecord shape (signature, body verbatim, notable_calls/inputs/outputs,
inline_constants).
"""

from __future__ import annotations

from pathlib import Path
import textwrap

import pytest

from code_glossary.indexer.python_parser import (
    MIN_BODY_STATEMENTS,
    parse_file,
)


def _write(tmp_path: Path, source: str, name: str = "sample.py") -> Path:
    p = tmp_path / name
    p.write_text(textwrap.dedent(source).lstrip(), encoding="utf-8")
    return p


# --- Basic ---

def test_parse_one_function(tmp_path: Path):
    p = _write(tmp_path, """
        def add(a, b):
            result = a + b
            return result
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    rec = records[0]
    assert rec.location.function == "add"
    assert rec.location.line == 1
    assert rec.location.file == "sample.py"
    assert rec.language == "python"
    assert rec.signature == "def add(a, b)"
    assert "a + b" in rec.body
    assert rec.functionality_label == ""
    assert rec.description == ""


def test_parse_skips_too_short_function(tmp_path: Path):
    """One-statement bodies (likely pure pass-throughs) are skipped."""
    p = _write(tmp_path, """
        def getter(self):
            return self._x
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert records == [], f"expected no records (1-statement body skipped); got {records}"


def test_parse_keeps_two_statement_function(tmp_path: Path):
    """At the MIN_BODY_STATEMENTS threshold, function IS indexed."""
    assert MIN_BODY_STATEMENTS == 2
    p = _write(tmp_path, """
        def two(x):
            y = x + 1
            return y
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1


# --- Signatures with annotations ---

def test_signature_with_annotations(tmp_path: Path):
    p = _write(tmp_path, """
        from typing import Optional
        def parse(s: str, strict: bool = False) -> Optional[int]:
            if not s:
                return None
            return int(s)
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    assert records[0].signature == "def parse(s: str, strict: bool=False) -> Optional[int]"
    assert records[0].notable_outputs == "Optional[int]"


def test_signature_with_async(tmp_path: Path):
    p = _write(tmp_path, """
        async def fetch(url: str) -> str:
            resp = await client.get(url)
            return resp.text
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    assert records[0].signature.startswith("async def fetch")


def test_signature_with_varargs(tmp_path: Path):
    p = _write(tmp_path, """
        def variadic(*args, **kwargs):
            x = len(args)
            return x + len(kwargs)
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    assert "*args" in records[0].signature
    assert "**kwargs" in records[0].signature


def test_signature_with_kwonly(tmp_path: Path):
    p = _write(tmp_path, """
        def f(a, *, b, c=1):
            x = a + b
            return x + c
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    sig = records[0].signature
    assert "*" in sig
    assert "b" in sig
    assert "c=1" in sig


def test_signature_with_posonly(tmp_path: Path):
    p = _write(tmp_path, """
        def f(a, /, b):
            x = a + b
            return x
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    assert "/" in records[0].signature


# --- Class methods + nested functions ---

def test_class_methods_included(tmp_path: Path):
    p = _write(tmp_path, """
        class Foo:
            def bar(self, x):
                y = x * 2
                return y

            def baz(self):
                a = 1
                b = 2
                return a + b
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert {r.location.function for r in records} == {"bar", "baz"}


def test_nested_functions_included(tmp_path: Path):
    p = _write(tmp_path, """
        def outer(x):
            def inner(y):
                z = y * 2
                return z
            result = inner(x)
            return result
    """)
    records = parse_file(p, rel_to=tmp_path)
    names = {r.location.function for r in records}
    assert names == {"outer", "inner"}


def test_dunder_methods_included(tmp_path: Path):
    p = _write(tmp_path, """
        class Foo:
            def __init__(self, x):
                self._x = x
                self._initialized = True

            def __call__(self, y):
                z = self._x + y
                return z
    """)
    records = parse_file(p, rel_to=tmp_path)
    names = {r.location.function for r in records}
    assert names == {"__init__", "__call__"}


# --- Notable calls / inputs / outputs / constants ---

def test_notable_calls_extracted(tmp_path: Path):
    p = _write(tmp_path, """
        import requests

        def fetch_user(user_id):
            resp = requests.get('https://api.example.com/users/' + str(user_id))
            data = resp.json()
            return data['name']
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    calls = records[0].notable_calls
    assert "requests.get" in calls
    assert "str" in calls
    assert "resp.json" in calls


def test_notable_inputs_with_annotations(tmp_path: Path):
    p = _write(tmp_path, """
        def f(a: int, b: str = 'x'):
            y = b + str(a)
            return y
    """)
    records = parse_file(p, rel_to=tmp_path)
    inputs = records[0].notable_inputs
    assert "a: int" in inputs
    assert "b: str" in inputs


def test_notable_inputs_without_annotations(tmp_path: Path):
    p = _write(tmp_path, """
        def f(a, b):
            y = a + b
            return y
    """)
    records = parse_file(p, rel_to=tmp_path)
    inputs = records[0].notable_inputs
    assert inputs == ["a", "b"]


def test_inline_constants_extracted(tmp_path: Path):
    p = _write(tmp_path, """
        def is_overdue(target):
            from datetime import date
            days = (date.today() - target).days
            return days >= 20
    """)
    records = parse_file(p, rel_to=tmp_path)
    consts = records[0].inline_constants
    assert "20" in consts


def test_inline_constants_handles_strings(tmp_path: Path):
    p = _write(tmp_path, """
        def f():
            url = 'https://api.example.com'
            method = 'GET'
            return url
    """)
    records = parse_file(p, rel_to=tmp_path)
    consts = records[0].inline_constants
    assert "'https://api.example.com'" in consts
    assert "'GET'" in consts


def test_inline_constants_skips_long_strings(tmp_path: Path):
    long_str = "x" * 100
    p = _write(tmp_path, f"""
        def f():
            content = '{long_str}'
            length = len(content)
            return length
    """)
    records = parse_file(p, rel_to=tmp_path)
    # Should have truncated the long string; check no constant exceeds threshold + ellipsis marker
    consts = records[0].inline_constants
    long_consts = [c for c in consts if len(c) > 50]
    assert all("..." in c for c in long_consts), f"long constant not truncated: {long_consts}"


# --- Robustness ---

def test_syntax_error_returns_empty(tmp_path: Path):
    p = tmp_path / "bad.py"
    p.write_text("def broken(\n", encoding="utf-8")
    records = parse_file(p, rel_to=tmp_path)
    assert records == []


def test_unreadable_file_returns_empty(tmp_path: Path):
    p = tmp_path / "does-not-exist.py"
    records = parse_file(p, rel_to=tmp_path)
    assert records == []


def test_id_is_deterministic(tmp_path: Path):
    p = _write(tmp_path, """
        def stable():
            x = 1
            return x
    """)
    r1 = parse_file(p, rel_to=tmp_path)
    r2 = parse_file(p, rel_to=tmp_path)
    assert r1[0].id == r2[0].id


def test_id_differs_per_function(tmp_path: Path):
    p = _write(tmp_path, """
        def a():
            x = 1
            return x

        def b():
            y = 2
            return y
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert records[0].id != records[1].id


def test_decorated_function_indexed(tmp_path: Path):
    p = _write(tmp_path, """
        def deco(f):
            return f

        @deco
        def target():
            x = 1
            return x + 1
    """)
    records = parse_file(p, rel_to=tmp_path)
    names = {r.location.function for r in records}
    assert "target" in names


def test_relative_path_uses_forward_slash(tmp_path: Path):
    sub = tmp_path / "src" / "sub"
    sub.mkdir(parents=True)
    p = sub / "f.py"
    p.write_text(textwrap.dedent("""
        def x():
            a = 1
            return a
    """).lstrip(), encoding="utf-8")
    records = parse_file(p, rel_to=tmp_path)
    assert records[0].location.file == "src/sub/f.py"


def test_absolute_path_when_no_rel_to(tmp_path: Path):
    p = _write(tmp_path, """
        def f():
            a = 1
            return a
    """)
    records = parse_file(p)
    assert "sample.py" in records[0].location.file
    # No raise; just returns absolute (with / normalization).
    assert "/" in records[0].location.file


def test_body_verbatim_preserves_indentation(tmp_path: Path):
    p = _write(tmp_path, """
        def f():
            result = 0
            if True:
                x = 1
                result = x
            else:
                result = -1
            return result
    """)
    records = parse_file(p, rel_to=tmp_path)
    assert len(records) == 1
    body = records[0].body
    # Indentation should be preserved (the def line + nested blocks).
    assert "    if True:" in body
    assert "        x = 1" in body
