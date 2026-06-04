"""Tests for the signal orchestrator + Stage 2 dogfood."""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.indexer import index_directory
from code_glossary.records import FunctionRecord, SignalFingerprint, SourceLocation
from code_glossary.signals import extract_signals


def _rec(
    *,
    rec_id: str,
    function_name: str,
    body: str = "def f():\n    x = 1\n    return x",
    notable_calls: list[str] | None = None,
    notable_inputs: list[str] | None = None,
    notable_outputs: str | None = None,
    label: str = "",
) -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file="x.py", line=1, function=function_name),
        signature="def f()",
        body=body,
        language="python",
        functionality_label=label,
        description="",
        notable_calls=notable_calls or [],
        notable_inputs=notable_inputs or [],
        notable_outputs=notable_outputs,
        helper_home_hint=None,
        inline_constants=[],
    )


# --- Basic ---

def test_empty_input_returns_empty():
    assert extract_signals([]) == {}


def test_single_record_produces_fingerprint():
    rec = _rec(rec_id="fn-1", function_name="parse_date")
    result = extract_signals([rec])
    assert "fn-1" in result
    fp = result["fn-1"]
    assert isinstance(fp, SignalFingerprint)
    assert fp.record_id == "fn-1"


def test_fingerprint_has_all_signal_fields():
    rec = _rec(
        rec_id="fn-1",
        function_name="parse_date",
        body="def parse_date(s: str) -> int:\n    x = int(s)\n    return x",
        notable_inputs=["s: str"],
        notable_outputs="int",
        label="parse-iso-date-string",
    )
    fp = extract_signals([rec])["fn-1"]
    # Lexical
    assert isinstance(fp.lexical_tokens, frozenset)
    assert "parse_date" in fp.lexical_tokens
    # Label
    assert fp.label_tokens == ("parse", "iso", "date", "string")
    # Structural
    assert fp.structural_hash is not None
    assert len(fp.structural_hash) == 16
    # Signature
    assert fp.signature_hash is not None
    # Behavioral (LLM, not yet populated)
    assert fp.behavioral_statement is None
    # Abstraction
    assert fp.is_composite is False
    assert fp.composed_of_candidates == []


def test_unsupported_language_skips_structural_hash():
    rec = FunctionRecord(
        id="fn-x",
        location=SourceLocation(file="x.go", line=1, function="f"),
        signature="func f()",
        body="func f() int { return 1 }",
        language="go",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )
    fp = extract_signals([rec])["fn-x"]
    # No deterministic structural hash for go — LLM-sketch handles it
    # at the SKILL.md layer (DESIGN-V2.md piece 6).
    assert fp.structural_hash is None


def test_typescript_gets_structural_hash():
    """Wave 6: TS records get a tree-sitter structural hash."""
    rec = FunctionRecord(
        id="fn-ts",
        location=SourceLocation(file="x.ts", line=1, function="f"),
        signature="function f(n: number): number",
        body="function f(n: number): number {\n  const x = n + 1;\n  return x;\n}",
        language="typescript",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=["n: number"],
        notable_outputs="number",
        helper_home_hint=None,
        inline_constants=["1"],
    )
    fp = extract_signals([rec])["fn-ts"]
    assert fp.structural_hash is not None


def test_completely_untyped_skips_signature_hash():
    rec = _rec(
        rec_id="fn-1",
        function_name="f",
        notable_inputs=["x", "y"],
        notable_outputs=None,
    )
    fp = extract_signals([rec])["fn-1"]
    assert fp.signature_hash is None


def test_composite_detection_propagates():
    recs = [
        _rec(rec_id="fn-fetch", function_name="fetch"),
        _rec(rec_id="fn-extract", function_name="extract"),
        _rec(
            rec_id="fn-orch",
            function_name="orchestrate",
            notable_calls=["fetch", "extract"],
        ),
    ]
    result = extract_signals(recs)
    assert result["fn-orch"].is_composite is True
    assert set(result["fn-orch"].composed_of_candidates) == {"fn-fetch", "fn-extract"}
    assert result["fn-fetch"].is_composite is False


# --- Clone detection (multi-signal) ---

def test_two_renamed_clones_have_matching_signals():
    """Two functions with same structure (renamed vars) get same
    structural and signature hashes; lexical tokens differ."""
    rec_a = _rec(
        rec_id="fn-a",
        function_name="alpha",
        body="def alpha(x: int) -> int:\n    y = x + 1\n    return y",
        notable_inputs=["x: int"],
        notable_outputs="int",
        label="compute-value-from-input",
    )
    rec_b = _rec(
        rec_id="fn-b",
        function_name="beta",
        body="def beta(input_val: int) -> int:\n    output = input_val + 1\n    return output",
        notable_inputs=["input_val: int"],
        notable_outputs="int",
        label="compute-value-from-input",
    )
    result = extract_signals([rec_a, rec_b])
    fp_a = result["fn-a"]
    fp_b = result["fn-b"]
    # Structural identical (renames don't matter).
    assert fp_a.structural_hash == fp_b.structural_hash
    # Signature identical (same input + output types).
    assert fp_a.signature_hash == fp_b.signature_hash
    # Label identical.
    assert fp_a.label_tokens == fp_b.label_tokens
    # Lexical differs (variable names differ).
    assert fp_a.lexical_tokens != fp_b.lexical_tokens


def test_dogfood_extracts_signals_for_own_source():
    """End-to-end: run indexer + signals against the engine's own source."""
    engine_root = Path(__file__).resolve().parent.parent / "code_glossary"
    records = index_directory(engine_root)
    assert len(records) > 10  # sanity

    fingerprints = extract_signals(records)
    assert len(fingerprints) == len(records), "every record must get a fingerprint"

    # Every fingerprint must reference back to a real record id.
    record_ids = {r.id for r in records}
    assert set(fingerprints.keys()) == record_ids

    # At least some structural hashes should be populated (python files).
    with_structural = [fp for fp in fingerprints.values() if fp.structural_hash is not None]
    assert len(with_structural) == len(records), "all python records should have structural hash"

    # At least one record in the engine should be composite (the orchestrators).
    composites = [fp for fp in fingerprints.values() if fp.is_composite]
    assert len(composites) >= 1, f"expected at least one composite in own source; got {len(composites)}"

    # No fingerprint should have a populated behavioral statement (LLM not wired in wave 3).
    behavioral_set = [fp for fp in fingerprints.values() if fp.behavioral_statement is not None]
    assert behavioral_set == []


def test_dogfood_finds_structural_clones_if_any():
    """If the engine has any structural clones, they should share a structural hash."""
    engine_root = Path(__file__).resolve().parent.parent / "code_glossary"
    records = index_directory(engine_root)
    fingerprints = extract_signals(records)

    by_hash: dict[str, list[str]] = {}
    for rec_id, fp in fingerprints.items():
        if fp.structural_hash:
            by_hash.setdefault(fp.structural_hash, []).append(rec_id)

    # We don't assert clones EXIST (the engine should be DRY!), but we
    # confirm the bucketing works without crash and report counts via
    # the test summary if any are found.
    clones = {h: ids for h, ids in by_hash.items() if len(ids) >= 2}
    # Document any clones found (visible in pytest -v output as test passes).
    print(f"\nDogfood: structural clone groups found: {len(clones)}")
    for h, ids in clones.items():
        print(f"  {h}: {ids}")
