"""Tests for the signature signal."""

from __future__ import annotations

from code_glossary.records import FunctionRecord, SourceLocation
from code_glossary.signals.signature import signature_hash


def _rec(
    *,
    inputs: list[str] | None = None,
    outputs: str | None = None,
    func_name: str = "f",
    body: str = "def f(): pass",
) -> FunctionRecord:
    return FunctionRecord(
        id="fn-x",
        location=SourceLocation(file="x.py", line=1, function=func_name),
        signature="def f()",
        body=body,
        language="python",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=inputs or [],
        notable_outputs=outputs,
        helper_home_hint=None,
        inline_constants=[],
    )


# --- Determinism + format ---

def test_same_signature_same_hash():
    a = _rec(inputs=["x: int", "y: str"], outputs="bool")
    b = _rec(inputs=["x: int", "y: str"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)
    h = signature_hash(a)
    assert h is not None
    assert len(h) == 16


def test_param_name_doesnt_matter():
    """Same types, different param names -> same hash (it's a contract fingerprint)."""
    a = _rec(inputs=["foo: int", "bar: str"], outputs="bool")
    b = _rec(inputs=["x: int", "y: str"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)


def test_different_type_different_hash():
    a = _rec(inputs=["x: int"], outputs="bool")
    b = _rec(inputs=["x: str"], outputs="bool")
    assert signature_hash(a) != signature_hash(b)


def test_different_order_different_hash():
    """Parameter order matters (positional contracts differ)."""
    a = _rec(inputs=["x: int", "y: str"], outputs="bool")
    b = _rec(inputs=["x: str", "y: int"], outputs="bool")
    assert signature_hash(a) != signature_hash(b)


def test_different_arity_different_hash():
    a = _rec(inputs=["x: int"], outputs="bool")
    b = _rec(inputs=["x: int", "y: int"], outputs="bool")
    assert signature_hash(a) != signature_hash(b)


def test_different_return_different_hash():
    a = _rec(inputs=["x: int"], outputs="bool")
    b = _rec(inputs=["x: int"], outputs="str")
    assert signature_hash(a) != signature_hash(b)


# --- Normalization ---

def test_optional_collapses():
    """Optional[X] is canonicalized to x|none."""
    a = _rec(inputs=["x: int"], outputs="Optional[int]")
    b = _rec(inputs=["x: int"], outputs="int | None")
    # Both should normalize to the same form.
    h_a = signature_hash(a)
    h_b = signature_hash(b)
    # int|none with spaces stripped should match optional[int] expanded.
    # Both expected: 'int|none'.
    assert h_a == h_b, "Optional[X] should canonicalize to X|None"


def test_union_collapses():
    a = _rec(inputs=["x: Union[int, str]"], outputs="bool")
    b = _rec(inputs=["x: int | str"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)


def test_typing_prefix_stripped():
    """typing.List == List (in normalized form)."""
    a = _rec(inputs=["x: typing.List[int]"], outputs="bool")
    b = _rec(inputs=["x: List[int]"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)


def test_whitespace_stripped():
    a = _rec(inputs=["x:int", "y:str"], outputs="bool")
    b = _rec(inputs=["x: int", "y: str"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)


def test_case_insensitive():
    a = _rec(inputs=["x: Int"], outputs="Bool")
    b = _rec(inputs=["x: int"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)


# --- Untyped handling ---

def test_completely_untyped_returns_none():
    """No type info -> no signature signal."""
    a = _rec(inputs=["x", "y"], outputs=None)
    assert signature_hash(a) is None


def test_partial_typing_produces_hash():
    """Some params typed, some not -> signal still emitted."""
    a = _rec(inputs=["x: int", "y"], outputs="bool")
    h = signature_hash(a)
    assert h is not None
    # Compare against fully typed -> different hash.
    b = _rec(inputs=["x: int", "y: int"], outputs="bool")
    assert signature_hash(b) != h


def test_only_return_typed_produces_hash():
    a = _rec(inputs=["x", "y"], outputs="bool")
    assert signature_hash(a) is not None


# --- Varargs ---

def test_varargs_normalized():
    a = _rec(inputs=["*args"], outputs="None")
    b = _rec(inputs=["*others"], outputs="None")
    assert signature_hash(a) == signature_hash(b)


def test_kwargs_distinguished_from_args():
    a = _rec(inputs=["*args"], outputs="None")
    b = _rec(inputs=["**kwargs"], outputs="None")
    assert signature_hash(a) != signature_hash(b)


# --- Complex nested types ---

def test_nested_generic_types():
    a = _rec(inputs=["x: List[Dict[str, int]]"], outputs="bool")
    b = _rec(inputs=["x: list[dict[str, int]]"], outputs="bool")
    assert signature_hash(a) == signature_hash(b)


def test_optional_with_complex_inner():
    a = _rec(inputs=["x: Optional[List[int]]"], outputs="bool")
    b = _rec(inputs=["x: List[int] | None"], outputs="bool")
    # Both expected to canonicalize identically.
    assert signature_hash(a) == signature_hash(b)
