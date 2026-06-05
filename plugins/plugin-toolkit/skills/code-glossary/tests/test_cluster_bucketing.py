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


def _rec(
    rec_id: str,
    label: str = "",
    function_name: str = "f",
    notable_calls: list[str] | None = None,
) -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file="x.py", line=1, function=function_name),
        signature="def f()",
        body="def f(): pass",
        language="python",
        functionality_label=label,
        description="",
        notable_calls=notable_calls or [],
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


# --- v2.2: signature-bucket pre-split by leaf call names ---


def _split_fixture(n_per_group: dict[str, int]) -> tuple[dict[str, set[str]], dict]:
    """Build one signature bucket whose members call per-group helpers.

    n_per_group maps a call name (e.g. 'fetch') to how many members
    share it. Members get ids '<call>-<i>'. Returns (buckets, record_index).
    """
    ids: set[str] = set()
    record_index: dict[str, FunctionRecord] = {}
    for call, count in n_per_group.items():
        for i in range(count):
            rec_id = f"{call}-{i}"
            ids.add(rec_id)
            record_index[rec_id] = _rec(rec_id, notable_calls=[call] if call != "_none" else [])
    return {"sig-hash": ids}, record_index


def test_split_leaves_small_buckets_untouched():
    from code_glossary.cluster.bucketing import (
        SIGNATURE_BUCKET_SPLIT_MIN,
        split_signature_buckets,
    )

    # One under the threshold: 19 members, two call groups — must pass through.
    buckets, index = _split_fixture({"fetch": 10, "parse": 9})
    assert sum(len(v) for v in buckets.values()) == SIGNATURE_BUCKET_SPLIT_MIN - 1
    out = split_signature_buckets(buckets, index)
    assert out == buckets


def test_split_fragments_big_bucket_by_calls():
    from code_glossary.cluster.bucketing import split_signature_buckets

    # 24 members >= threshold: 3 cohesive call groups.
    buckets, index = _split_fixture({"fetch": 10, "parse": 8, "render": 6})
    out = split_signature_buckets(buckets, index)
    assert len(out) == 3
    groups = sorted(out.values(), key=len, reverse=True)
    assert [len(g) for g in groups] == [10, 8, 6]
    # Each sub-bucket is call-pure.
    for key, members in out.items():
        calls = {index[m].notable_calls[0] for m in members}
        assert len(calls) == 1
        assert f"calls={calls.pop()}" in key


def test_split_singles_fall_to_residual():
    from code_glossary.cluster.bucketing import split_signature_buckets

    # 20 members: one group of 18, two singles with unique calls.
    buckets, index = _split_fixture({"fetch": 18, "lonely": 1, "alone": 1})
    out = split_signature_buckets(buckets, index)
    assert len(out) == 2
    residual = out["sig-hash|residual"]
    assert residual == {"lonely-0", "alone-0"}


def test_split_single_residual_member_dropped():
    from code_glossary.cluster.bucketing import split_signature_buckets

    # 20 members: 19 cohesive + 1 single -> residual of one dropped.
    buckets, index = _split_fixture({"fetch": 19, "lonely": 1})
    out = split_signature_buckets(buckets, index)
    assert len(out) == 1
    (members,) = out.values()
    assert "lonely-0" not in members


def test_split_no_calls_group_together():
    from code_glossary.cluster.bucketing import split_signature_buckets

    # Members with NO notable_calls share the empty sub-key — stay grouped.
    buckets, index = _split_fixture({"_none": 20})
    out = split_signature_buckets(buckets, index)
    assert len(out) == 1
    (members,) = out.values()
    assert len(members) == 20


def test_split_keys_deterministic_and_distinct():
    from code_glossary.cluster.bucketing import split_signature_buckets

    buckets, index = _split_fixture({"fetch": 12, "parse": 12})
    out1 = split_signature_buckets(buckets, index)
    out2 = split_signature_buckets(buckets, index)
    assert out1 == out2
    assert len(set(out1.keys())) == len(out1)
