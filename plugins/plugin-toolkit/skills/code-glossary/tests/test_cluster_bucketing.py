"""Tests for Pass A bucketing."""

from __future__ import annotations

from code_glossary.cluster.bucketing import (
    bucket_by_label,
    bucket_by_signature,
    bucket_by_structural,
)
from code_glossary.records import FunctionRecord, SignalFingerprint, SourceLocation


def _fp(rec_id: str, *, structural=None, signature=None) -> SignalFingerprint:
    return SignalFingerprint(
        record_id=rec_id,
        structural_hash=structural,
        signature_hash=signature,
    )


def _rec(rec_id: str, label: str = "", function_name: str = "f") -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file="x.py", line=1, function=function_name),
        signature="def f()",
        body="def f(): pass",
        language="python",
        functionality_label=label,
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


# --- Structural ---

def test_structural_groups_matching_hashes():
    fps = {
        "fn-1": _fp("fn-1", structural="aaaa"),
        "fn-2": _fp("fn-2", structural="aaaa"),
        "fn-3": _fp("fn-3", structural="bbbb"),
    }
    buckets = bucket_by_structural(fps)
    assert "aaaa" in buckets
    assert buckets["aaaa"] == {"fn-1", "fn-2"}
    # Single-member buckets dropped.
    assert "bbbb" not in buckets


def test_structural_excludes_none_hashes():
    fps = {
        "fn-1": _fp("fn-1", structural=None),
        "fn-2": _fp("fn-2", structural=None),
        "fn-3": _fp("fn-3", structural="aaaa"),
    }
    buckets = bucket_by_structural(fps)
    assert buckets == {}  # only fn-3 had a hash, no group of 2


def test_structural_three_members():
    fps = {
        "fn-1": _fp("fn-1", structural="aaaa"),
        "fn-2": _fp("fn-2", structural="aaaa"),
        "fn-3": _fp("fn-3", structural="aaaa"),
    }
    buckets = bucket_by_structural(fps)
    assert buckets["aaaa"] == {"fn-1", "fn-2", "fn-3"}


def test_structural_empty_input():
    assert bucket_by_structural({}) == {}


# --- Signature ---

def test_signature_groups_matching_hashes():
    fps = {
        "fn-1": _fp("fn-1", signature="xxxx"),
        "fn-2": _fp("fn-2", signature="xxxx"),
    }
    buckets = bucket_by_signature(fps)
    assert buckets["xxxx"] == {"fn-1", "fn-2"}


def test_signature_excludes_none():
    fps = {
        "fn-1": _fp("fn-1", signature=None),
        "fn-2": _fp("fn-2", signature=None),
    }
    assert bucket_by_signature(fps) == {}


# --- Label ---

def test_label_groups_matching():
    records = [
        _rec("fn-1", label="fetch-user"),
        _rec("fn-2", label="fetch-user"),
        _rec("fn-3", label="other"),
    ]
    buckets = bucket_by_label(records)
    assert buckets["fetch-user"] == {"fn-1", "fn-2"}
    assert "other" not in buckets


def test_label_excludes_empty_labels():
    """Wave 3+ records have empty labels until LLM fills them."""
    records = [_rec("fn-1", label=""), _rec("fn-2", label="")]
    assert bucket_by_label(records) == {}


def test_label_three_members():
    records = [
        _rec("fn-1", label="parse-iso-date"),
        _rec("fn-2", label="parse-iso-date"),
        _rec("fn-3", label="parse-iso-date"),
    ]
    buckets = bucket_by_label(records)
    assert buckets["parse-iso-date"] == {"fn-1", "fn-2", "fn-3"}


# --- v2.1: shared bucketing invariant (engine self-dogfood extraction) ---


def test_bucket_by_attribute_generic():
    from code_glossary.cluster.bucketing import bucket_by_attribute
    from code_glossary.records import SignalFingerprint

    fps = {
        "fn-a": SignalFingerprint(record_id="fn-a", structural_hash="h1"),
        "fn-b": SignalFingerprint(record_id="fn-b", structural_hash="h1"),
        "fn-c": SignalFingerprint(record_id="fn-c", structural_hash="h2"),  # singleton dropped
        "fn-d": SignalFingerprint(record_id="fn-d", structural_hash=None),  # None excluded
    }
    buckets = bucket_by_attribute(fps, lambda fp: fp.structural_hash)
    assert buckets == {"h1": {"fn-a", "fn-b"}}
