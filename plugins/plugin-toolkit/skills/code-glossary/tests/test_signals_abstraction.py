"""Tests for the abstraction-level signal."""

from __future__ import annotations

from code_glossary.records import FunctionRecord, SourceLocation
from code_glossary.signals.abstraction import (
    MIN_COMPOSED_OF_LEAVES,
    compute_abstraction,
)


def _rec(
    *,
    rec_id: str,
    function_name: str,
    notable_calls: list[str] | None = None,
    file: str = "x.py",
) -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=1, function=function_name),
        signature=f"def {function_name}()",
        body=f"def {function_name}(): pass\n",
        language="python",
        functionality_label="",
        description="",
        notable_calls=notable_calls or [],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


# --- Basic ---

def test_leaf_no_other_calls():
    records = [
        _rec(rec_id="fn-1", function_name="foo", notable_calls=["print", "len"]),
    ]
    result = compute_abstraction(records)
    is_composite, composed = result["fn-1"]
    assert is_composite is False
    assert composed == []


def test_composite_calls_two_other_records():
    records = [
        _rec(rec_id="fn-1", function_name="fetch", notable_calls=[]),
        _rec(rec_id="fn-2", function_name="extract", notable_calls=[]),
        _rec(rec_id="fn-3", function_name="orchestrate", notable_calls=["fetch", "extract"]),
    ]
    result = compute_abstraction(records)
    is_composite, composed = result["fn-3"]
    assert is_composite is True
    assert set(composed) == {"fn-1", "fn-2"}


def test_single_wrapper_not_composite():
    """One call to another indexed function does NOT make a composite
    (per MIN_COMPOSED_OF_LEAVES = 2)."""
    assert MIN_COMPOSED_OF_LEAVES == 2
    records = [
        _rec(rec_id="fn-1", function_name="helper", notable_calls=[]),
        _rec(rec_id="fn-2", function_name="wrapper", notable_calls=["helper"]),
    ]
    result = compute_abstraction(records)
    is_composite, composed = result["fn-2"]
    assert is_composite is False
    assert composed == ["fn-1"]


def test_dotted_calls_resolved_by_leaf_name():
    """self.foo, MyClass.bar, requests.get -> match by trailing segment."""
    records = [
        _rec(rec_id="fn-1", function_name="foo"),
        _rec(rec_id="fn-2", function_name="bar"),
        _rec(rec_id="fn-3", function_name="orchestrate", notable_calls=["self.foo", "MyClass.bar"]),
    ]
    result = compute_abstraction(records)
    _, composed = result["fn-3"]
    assert set(composed) == {"fn-1", "fn-2"}


def test_external_calls_dont_match():
    """requests.get when no record named 'get' -> no match."""
    records = [
        _rec(rec_id="fn-1", function_name="my_func", notable_calls=["requests.get", "json.loads"]),
    ]
    result = compute_abstraction(records)
    _, composed = result["fn-1"]
    assert composed == []


def test_self_call_excluded():
    """A recursive call (function calling itself) is not counted as
    a composed-of candidate (otherwise every recursive fn looks composite)."""
    records = [
        _rec(rec_id="fn-1", function_name="recurse", notable_calls=["recurse", "recurse"]),
    ]
    result = compute_abstraction(records)
    is_composite, composed = result["fn-1"]
    assert is_composite is False
    assert composed == []


def test_duplicate_names_produce_multiple_candidates():
    """Two records named 'init' both match a call to 'init' -> both candidates."""
    records = [
        _rec(rec_id="fn-1", function_name="init", file="a.py"),
        _rec(rec_id="fn-2", function_name="init", file="b.py"),
        _rec(rec_id="fn-3", function_name="setup", file="c.py"),
        _rec(rec_id="fn-4", function_name="orchestrate", notable_calls=["init", "setup"]),
    ]
    result = compute_abstraction(records)
    is_composite, composed = result["fn-4"]
    assert is_composite is True
    # 'init' matches both fn-1 AND fn-2; 'setup' matches fn-3 -> 3 candidates.
    assert set(composed) == {"fn-1", "fn-2", "fn-3"}


def test_deduplicates_repeated_calls():
    """If a record calls helper() five times, helper still counts once."""
    records = [
        _rec(rec_id="fn-1", function_name="helper"),
        _rec(rec_id="fn-2", function_name="other"),
        _rec(rec_id="fn-3", function_name="caller", notable_calls=["helper", "helper", "helper", "other"]),
    ]
    result = compute_abstraction(records)
    _, composed = result["fn-3"]
    assert composed == ["fn-1", "fn-2"]


def test_call_order_preserved():
    """Order in composed_of follows order in notable_calls (first match wins)."""
    records = [
        _rec(rec_id="fn-a", function_name="alpha"),
        _rec(rec_id="fn-b", function_name="beta"),
        _rec(rec_id="fn-c", function_name="gamma"),
        _rec(rec_id="fn-3", function_name="caller", notable_calls=["gamma", "alpha", "beta"]),
    ]
    result = compute_abstraction(records)
    _, composed = result["fn-3"]
    assert composed == ["fn-c", "fn-a", "fn-b"]


def test_empty_records_list():
    assert compute_abstraction([]) == {}


def test_records_without_function_name():
    """Defensive: a record with empty function name should still get an entry,
    but won't match calls."""
    rec = _rec(rec_id="fn-1", function_name="")
    rec.notable_calls = ["something"]
    result = compute_abstraction([rec])
    is_composite, composed = result["fn-1"]
    assert is_composite is False
    assert composed == []


def test_three_call_composite():
    """The user's intro example: fetch + extract + compare = composite."""
    records = [
        _rec(rec_id="fn-fetch", function_name="fetch_data_from_api"),
        _rec(rec_id="fn-extract", function_name="extract_field_from_data"),
        _rec(rec_id="fn-compare", function_name="compare_value_against_threshold"),
        _rec(
            rec_id="fn-composite",
            function_name="compare_date_from_api_against_threshold",
            notable_calls=[
                "fetch_data_from_api",
                "extract_field_from_data",
                "compare_value_against_threshold",
            ],
        ),
    ]
    result = compute_abstraction(records)
    is_composite, composed = result["fn-composite"]
    assert is_composite is True
    assert set(composed) == {"fn-fetch", "fn-extract", "fn-compare"}
