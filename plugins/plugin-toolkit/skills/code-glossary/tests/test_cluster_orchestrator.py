"""Tests for Stage 3 cluster orchestrator + end-to-end dogfood."""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from code_glossary.cluster import cluster_records
from code_glossary.indexer import index_directory
from code_glossary.records import FunctionRecord, SignalFingerprint, SourceLocation
from code_glossary.signals import extract_signals


def _rec(
    rec_id: str,
    file: str,
    function_name: str = "f",
    body: str = "def f():\n    x = 1\n    return x",
    label: str = "",
) -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=1, function=function_name),
        signature=f"def {function_name}()",
        body=body,
        language="python",
        functionality_label=label,
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


def _fp(
    rec_id: str,
    *,
    structural: str | None = None,
    signature: str | None = None,
    lexical: frozenset[str] = frozenset(),
    label: tuple[str, ...] = (),
) -> SignalFingerprint:
    return SignalFingerprint(
        record_id=rec_id,
        structural_hash=structural,
        signature_hash=signature,
        lexical_tokens=lexical,
        label_tokens=label,
    )


# --- Empty / no clusters ---

def test_empty_records_no_clusters():
    assert cluster_records([], {}) == []


def test_no_matching_signals_no_clusters():
    """Records with distinct hashes -> no clusters."""
    records = [_rec(f"fn-{i}", file=f"{i}.py") for i in range(3)]
    fps = {r.id: _fp(r.id, structural=f"hash-{i}") for i, r in enumerate(records)}
    assert cluster_records(records, fps) == []


# --- Basic clustering ---

def test_structural_cluster_emitted():
    records = [
        _rec("fn-1", file="a.py"),
        _rec("fn-2", file="b.py"),
    ]
    fps = {
        "fn-1": _fp("fn-1", structural="aaa"),
        "fn-2": _fp("fn-2", structural="aaa"),
    }
    clusters = cluster_records(records, fps)
    assert len(clusters) == 1
    assert clusters[0].primary_signal == "structural"
    assert sorted(clusters[0].member_record_ids) == ["fn-1", "fn-2"]


def test_score_and_confidence_assigned():
    records = [
        _rec(f"fn-{i}", file=f"{i}.py")
        for i in range(3)
    ]
    fps = {
        r.id: _fp(r.id, structural="aaa", signature="xxx", lexical=frozenset({"alpha", "beta", "gamma"}))
        for r in records
    }
    clusters = cluster_records(records, fps)
    assert len(clusters) == 1
    c = clusters[0]
    assert 0.0 < c.extractability_score <= 1.0
    assert c.extractability_confidence in ("high", "medium", "low")


def test_clusters_sorted_by_score():
    """Higher-score clusters come first."""
    # Cluster A: 4 records, all in distinct files, 3 signals agree -> high score
    # Cluster B: 2 records, same file, 1 signal agrees -> low score
    records = [
        _rec("a-1", file="a1.py"),
        _rec("a-2", file="a2.py"),
        _rec("a-3", file="a3.py"),
        _rec("a-4", file="a4.py"),
        _rec("b-1", file="x.py"),
        _rec("b-2", file="x.py"),
    ]
    fps = {
        "a-1": _fp("a-1", structural="A", signature="A", lexical=frozenset({"x", "y", "z", "w"})),
        "a-2": _fp("a-2", structural="A", signature="A", lexical=frozenset({"x", "y", "z", "w"})),
        "a-3": _fp("a-3", structural="A", signature="A", lexical=frozenset({"x", "y", "z", "w"})),
        "a-4": _fp("a-4", structural="A", signature="A", lexical=frozenset({"x", "y", "z", "w"})),
        "b-1": _fp("b-1", structural="B"),
        "b-2": _fp("b-2", structural="B"),
    }
    clusters = cluster_records(records, fps)
    assert len(clusters) == 2
    assert clusters[0].extractability_score >= clusters[1].extractability_score


# --- Dogfood ---

def test_dogfood_end_to_end_against_own_source():
    """Run all three stages (index + signals + cluster) on the engine's
    own source. Confirms the structural-clone group identified by the
    signal-stage dogfood survives into Stage 3 clustering."""
    engine_root = Path(__file__).resolve().parent.parent / "code_glossary"

    records = index_directory(engine_root)
    fingerprints = extract_signals(records)
    clusters = cluster_records(records, fingerprints)

    # We saw 1 structural clone group of 3 in the signal-stage dogfood.
    # Stage 3 should turn that into 1 CandidateCluster of 3 members.
    big_structural_clusters = [
        c for c in clusters
        if c.primary_signal == "structural" and len(c.member_record_ids) >= 3
    ]
    assert len(big_structural_clusters) >= 1, (
        f"expected the 3-member structural clone group from signal dogfood "
        f"to surface as a cluster; got {len(big_structural_clusters)} 3+ structural clusters"
    )

    # No record should be in two clusters (priority resolution must hold
    # end-to-end).
    seen: set[str] = set()
    for c in clusters:
        for m in c.member_record_ids:
            assert m not in seen, f"record {m} in multiple clusters"
            seen.add(m)


def test_dogfood_clusters_reports_score_and_confidence():
    engine_root = Path(__file__).resolve().parent.parent / "code_glossary"
    records = index_directory(engine_root)
    fingerprints = extract_signals(records)
    clusters = cluster_records(records, fingerprints)
    for c in clusters:
        assert 0.0 <= c.extractability_score <= 1.0
        assert c.extractability_confidence in ("high", "medium", "low")
