"""Tests for YAML emission + round-trip with schema validator."""

from __future__ import annotations

import yaml

from code_glossary.constants import SCHEMA_VERSION
from code_glossary.records import (
    FunctionRecord,
    Glossary,
    GlossaryEntry,
    Instance,
    SignalFingerprint,
    SourceLocation,
)
from code_glossary.render.entry_builder import build_glossary
from code_glossary.render.yaml_emit import emit_glossary_yaml
from code_glossary.schema import validate_glossary


def _rec(rec_id: str, file: str, body: str) -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=1, function="f"),
        signature="def f()",
        body=body,
        language="python",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


def _fp(rec_id: str) -> SignalFingerprint:
    return SignalFingerprint(record_id=rec_id)


SCOPE = {"paths": ["src"], "excludes": [], "include_tests": False}


# --- Basic emission ---

def test_emit_empty_glossary():
    g = build_glossary([], {}, [], SCOPE)
    text = emit_glossary_yaml(g)
    assert "schema_version: 1" in text
    assert "generator: code-glossary" in text
    assert "metadata:" in text
    # 'glossary: []' may appear with no list items.
    assert "glossary:" in text


def test_emit_includes_required_top_level_keys():
    g = build_glossary([], {}, [], SCOPE)
    text = emit_glossary_yaml(g)
    for key in ("schema_version", "generator", "generator_version", "metadata", "glossary"):
        assert f"{key}:" in text


# --- Round-trip ---

def test_roundtrip_empty_passes_schema():
    g = build_glossary([], {}, [], SCOPE)
    text = emit_glossary_yaml(g)
    parsed = yaml.safe_load(text)
    errors = validate_glossary(parsed)
    blocking = [e for e in errors if "missing" in e.message or "must be" in e.message]
    assert blocking == [], f"unexpected errors: {blocking}"


def test_roundtrip_with_single_instance_entry():
    rec = _rec("fn-1", "a.py", "def f():\n    x = 1\n    return x\n")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    text = emit_glossary_yaml(g)
    parsed = yaml.safe_load(text)
    errors = validate_glossary(parsed)
    blocking = [e for e in errors if "missing" in e.message or "must be" in e.message]
    assert blocking == [], f"unexpected errors: {blocking}"


def test_multi_line_body_uses_literal_block():
    """body_excerpt with newlines emits as ``|`` block scalar (not escaped)."""
    rec = _rec(
        "fn-1",
        "a.py",
        "def f():\n    a = 1\n    b = 2\n    return a + b\n",
    )
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    text = emit_glossary_yaml(g)
    assert "body_excerpt: |" in text or "body_excerpt: |-" in text
    # No escaped newlines in the body.
    assert "\\n" not in text


# --- Determinism ---

def test_emit_is_deterministic():
    """Same input -> identical output (modulo generated_at timestamp)."""
    rec = _rec("fn-1", "a.py", "def f():\n    x = 1\n    return x\n")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    t1 = emit_glossary_yaml(g)
    t2 = emit_glossary_yaml(g)
    assert t1 == t2


# --- Empty-field cleanup ---

def test_empty_optional_fields_dropped():
    """composed_of=[], variant_axis=[], related_functionalities=[] should not
    appear in the YAML output."""
    rec = _rec("fn-1", "a.py", "def f():\n    x = 1\n    return x\n")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    text = emit_glossary_yaml(g)
    assert "composed_of:" not in text
    assert "variant_axis: []" not in text
    assert "related_functionalities: []" not in text


# --- Strings with special characters ---

def test_handles_string_with_colon():
    """A string containing ':' should not break YAML parsing on re-load."""
    rec = _rec("fn-1", "a.py", "def f():\n    url = 'https://api.example.com'\n    return url\n")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    text = emit_glossary_yaml(g)
    parsed = yaml.safe_load(text)
    assert parsed is not None


def test_handles_empty_string_body_does_not_crash():
    rec = _rec("fn-1", "a.py", "")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    # Should not raise even with empty body.
    text = emit_glossary_yaml(g)
    assert "glossary:" in text


# --- Output ordering ---

def test_top_level_order_stable():
    g = build_glossary([], {}, [], SCOPE)
    text = emit_glossary_yaml(g)
    # schema_version must come before generator must come before metadata.
    pos_sv = text.index("schema_version:")
    pos_gen = text.index("generator:")
    pos_meta = text.index("metadata:")
    pos_gloss = text.index("glossary:")
    assert pos_sv < pos_gen < pos_meta < pos_gloss
