"""Tests for cluster merge."""

from __future__ import annotations

import pytest

from code_glossary.cluster.merge import (
    LEXICAL_AGREEMENT_THRESHOLD,
    SIGNAL_PRIORITY,
    merge_buckets,
)
from code_glossary.records import SignalFingerprint


def _fp(rec_id: str, *, structural=None, signature=None, lexical=None, label=()):
    return SignalFingerprint(
        record_id=rec_id,
        structural_hash=structural,
        signature_hash=signature,
        lexical_tokens=frozenset(lexical or ()),
        label_tokens=label,
    )


# --- Empty inputs ---

def test_no_buckets_no_clusters():
    assert merge_buckets({}, {}, {}, {}) == []


# --- Single-signal clusters ---

def test_structural_only_cluster():
    fps = {
        "fn-1": _fp("fn-1", structural="aaa"),
        "fn-2": _fp("fn-2", structural="aaa"),
    }
    clusters = merge_buckets(
        structural_buckets={"aaa": {"fn-1", "fn-2"}},
        signature_buckets={},
        label_buckets={},
        fingerprints=fps,
    )
    assert len(clusters) == 1
    c = clusters[0]
    assert sorted(c.member_record_ids) == ["fn-1", "fn-2"]
    assert c.primary_signal == "structural"
    assert c.signal_agreement["structural"] is True
    assert c.signal_agreement["signature"] is False
    assert c.signal_agreement["label"] is False


def test_signature_only_cluster():
    fps = {
        "fn-1": _fp("fn-1", signature="xxx"),
        "fn-2": _fp("fn-2", signature="xxx"),
    }
    clusters = merge_buckets({}, {"xxx": {"fn-1", "fn-2"}}, {}, fps)
    assert len(clusters) == 1
    assert clusters[0].primary_signal == "signature"
    assert clusters[0].signal_agreement["signature"] is True
    assert clusters[0].signal_agreement["structural"] is False


def test_label_only_cluster():
    fps = {
        "fn-1": _fp("fn-1", label=("fetch", "user")),
        "fn-2": _fp("fn-2", label=("fetch", "user")),
    }
    clusters = merge_buckets({}, {}, {"fetch-user": {"fn-1", "fn-2"}}, fps)
    assert len(clusters) == 1
    assert clusters[0].primary_signal == "label"
    assert clusters[0].signal_agreement["label"] is True


# --- Priority resolution ---

def test_structural_wins_over_signature():
    """Record in both buckets goes to structural cluster (higher priority)."""
    fps = {
        "fn-1": _fp("fn-1", structural="aaa", signature="xxx"),
        "fn-2": _fp("fn-2", structural="aaa", signature="xxx"),
        "fn-3": _fp("fn-3", signature="xxx"),  # only in signature bucket
    }
    clusters = merge_buckets(
        structural_buckets={"aaa": {"fn-1", "fn-2"}},
        signature_buckets={"xxx": {"fn-1", "fn-2", "fn-3"}},
        label_buckets={},
        fingerprints=fps,
    )
    # Expect one structural cluster (fn-1, fn-2) and the signature bucket
    # becomes empty (only fn-3 left, no cluster of one).
    assert len(clusters) == 1
    assert clusters[0].primary_signal == "structural"
    assert sorted(clusters[0].member_record_ids) == ["fn-1", "fn-2"]


def test_signature_wins_over_label():
    fps = {
        "fn-1": _fp("fn-1", signature="xxx", label=("foo",)),
        "fn-2": _fp("fn-2", signature="xxx", label=("foo",)),
    }
    clusters = merge_buckets(
        structural_buckets={},
        signature_buckets={"xxx": {"fn-1", "fn-2"}},
        label_buckets={"foo": {"fn-1", "fn-2"}},
        fingerprints=fps,
    )
    assert len(clusters) == 1
    assert clusters[0].primary_signal == "signature"


def test_signal_agreement_multi_confirm():
    """When a structural cluster's members ALSO share signature, agreement
    flags both."""
    fps = {
        "fn-1": _fp("fn-1", structural="aaa", signature="xxx", label=("foo",)),
        "fn-2": _fp("fn-2", structural="aaa", signature="xxx", label=("foo",)),
    }
    clusters = merge_buckets(
        structural_buckets={"aaa": {"fn-1", "fn-2"}},
        signature_buckets={"xxx": {"fn-1", "fn-2"}},
        label_buckets={"foo": {"fn-1", "fn-2"}},
        fingerprints=fps,
    )
    assert len(clusters) == 1
    sa = clusters[0].signal_agreement
    assert sa["structural"] is True
    assert sa["signature"] is True
    assert sa["label"] is True


def test_no_record_in_two_clusters():
    """Multi-bucket records must end up in only ONE cluster across the result."""
    fps = {
        "fn-1": _fp("fn-1", structural="aaa", signature="xxx"),
        "fn-2": _fp("fn-2", structural="aaa", signature="yyy"),
        "fn-3": _fp("fn-3", signature="yyy"),
    }
    clusters = merge_buckets(
        structural_buckets={"aaa": {"fn-1", "fn-2"}},
        signature_buckets={"xxx": {"fn-1"}, "yyy": {"fn-2", "fn-3"}},
        label_buckets={},
        fingerprints=fps,
    )
    # fn-1 + fn-2 form structural cluster; fn-3 alone -> nothing.
    # Or: alternative valid output is structural{fn-1,fn-2} only;
    # signature {fn-2,fn-3} loses fn-2 to structural, fn-3 alone insufficient.
    all_members = set()
    for c in clusters:
        for m in c.member_record_ids:
            assert m not in all_members, f"record {m} in multiple clusters"
            all_members.add(m)


def test_larger_bucket_processed_first():
    """When two structural buckets compete, larger one is built first."""
    fps = {
        "fn-1": _fp("fn-1", structural="big"),
        "fn-2": _fp("fn-2", structural="big"),
        "fn-3": _fp("fn-3", structural="big"),
        "fn-4": _fp("fn-4", structural="small"),
        "fn-5": _fp("fn-5", structural="small"),
    }
    clusters = merge_buckets(
        structural_buckets={"small": {"fn-4", "fn-5"}, "big": {"fn-1", "fn-2", "fn-3"}},
        signature_buckets={},
        label_buckets={},
        fingerprints=fps,
    )
    assert len(clusters) == 2
    # Sort by size desc: first should be the 3-member cluster.
    assert len(clusters[0].member_record_ids) == 3


# --- Lexical agreement ---

def test_lexical_agreement_above_threshold():
    fps = {
        "fn-1": _fp("fn-1", structural="aaa", lexical=("alpha", "beta", "gamma", "delta")),
        "fn-2": _fp("fn-2", structural="aaa", lexical=("alpha", "beta", "gamma", "epsilon")),
    }
    # Jaccard = |intersect| / |union| = 3/5 = 0.6 >= 0.5 threshold.
    clusters = merge_buckets({"aaa": {"fn-1", "fn-2"}}, {}, {}, fps)
    assert clusters[0].signal_agreement["lexical"] is True


def test_lexical_agreement_below_threshold():
    fps = {
        "fn-1": _fp("fn-1", structural="aaa", lexical=("alpha", "beta")),
        "fn-2": _fp("fn-2", structural="aaa", lexical=("gamma", "delta")),
    }
    # Jaccard = 0/4 = 0 < 0.5.
    clusters = merge_buckets({"aaa": {"fn-1", "fn-2"}}, {}, {}, fps)
    assert clusters[0].signal_agreement["lexical"] is False


def test_lexical_agreement_threshold_constant():
    assert LEXICAL_AGREEMENT_THRESHOLD == 0.5


# --- Stable output ordering ---

def test_clusters_sorted_by_size_desc():
    fps = {f"fn-{i}": _fp(f"fn-{i}", structural=f"hash-{i % 3}") for i in range(7)}
    structural = {}
    for i in range(7):
        structural.setdefault(f"hash-{i % 3}", set()).add(f"fn-{i}")
    # Drop singletons (none in this case).
    structural = {k: v for k, v in structural.items() if len(v) >= 2}
    clusters = merge_buckets(structural, {}, {}, fps)
    sizes = [len(c.member_record_ids) for c in clusters]
    assert sizes == sorted(sizes, reverse=True)


def test_member_ids_sorted_within_cluster():
    fps = {
        "fn-z": _fp("fn-z", structural="aaa"),
        "fn-a": _fp("fn-a", structural="aaa"),
        "fn-m": _fp("fn-m", structural="aaa"),
    }
    clusters = merge_buckets({"aaa": {"fn-z", "fn-a", "fn-m"}}, {}, {}, fps)
    assert clusters[0].member_record_ids == ["fn-a", "fn-m", "fn-z"]


def test_signal_priority_constant():
    assert SIGNAL_PRIORITY == ("structural", "signature", "label")
