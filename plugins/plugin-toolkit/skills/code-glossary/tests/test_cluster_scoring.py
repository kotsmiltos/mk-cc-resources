"""Tests for cluster scoring + confidence."""

from __future__ import annotations

import pytest

from code_glossary.cluster.scoring import (
    _CONFIDENCE_HIGH_MIN,
    _CONFIDENCE_MEDIUM_MIN,
    _CONFIDENCE_SIGNALS,
    score_cluster,
)
from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    SignalFingerprint,
    SourceLocation,
)


def _rec(rec_id: str, file: str = "x.py") -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=1, function="f"),
        signature="def f()",
        body="def f(): pass",
        language="python",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


def _fp(rec_id: str, *, is_composite: bool = False) -> SignalFingerprint:
    return SignalFingerprint(record_id=rec_id, is_composite=is_composite)


def _cluster(
    member_ids: list[str],
    *,
    primary: str = "structural",
    agreement: dict[str, bool] | None = None,
) -> CandidateCluster:
    return CandidateCluster(
        id="cluster-001",
        member_record_ids=member_ids,
        primary_signal=primary,
        signal_agreement=agreement
        or {"structural": True, "signature": False, "label": False, "lexical": False},
    )


# --- Empty / degenerate ---

def test_empty_member_records_zero_score():
    cluster = _cluster(["fn-1"])
    score, conf = score_cluster(cluster, records={}, fingerprints={})
    assert score == 0.0
    assert conf == "low"


# --- Instance count component ---

def test_more_instances_higher_score():
    records_2 = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(2)}
    records_5 = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(5)}
    fps = {rid: _fp(rid) for rid in {**records_2, **records_5}}

    c_2 = _cluster(list(records_2.keys()))
    c_5 = _cluster(list(records_5.keys()))

    s_2, _ = score_cluster(c_2, records_2, fps)
    s_5, _ = score_cluster(c_5, records_5, fps)
    assert s_5 > s_2


def test_instance_count_saturates():
    """10 instances doesn't score higher than 5."""
    records_5 = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(5)}
    records_10 = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(10)}
    fps = {rid: _fp(rid) for rid in {**records_5, **records_10}}
    s_5, _ = score_cluster(_cluster(list(records_5.keys())), records_5, fps)
    s_10, _ = score_cluster(_cluster(list(records_10.keys())), records_10, fps)
    # 5 and 10 both saturate instance_count_score; file spread also saturates (>=3); same.
    assert s_5 == s_10


# --- File spread component ---

def test_more_files_higher_score():
    """Same instance count, more files = higher score."""
    # All in one file.
    records_1f = {f"fn-{i}": _rec(f"fn-{i}", file="a.py") for i in range(3)}
    # All in different files.
    records_3f = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(3)}
    fps = {rid: _fp(rid) for rid in {**records_1f, **records_3f}}
    s_1f, _ = score_cluster(_cluster(list(records_1f.keys())), records_1f, fps)
    s_3f, _ = score_cluster(_cluster(list(records_3f.keys())), records_3f, fps)
    assert s_3f > s_1f


# --- Signal agreement component ---

def test_more_agreeing_signals_higher_score():
    records = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(2)}
    fps = {rid: _fp(rid) for rid in records}
    c_one_signal = _cluster(
        list(records),
        agreement={"structural": True, "signature": False, "label": False, "lexical": False},
    )
    c_all_signals = _cluster(
        list(records),
        agreement={"structural": True, "signature": True, "label": True, "lexical": True},
    )
    s_one, _ = score_cluster(c_one_signal, records, fps)
    s_all, _ = score_cluster(c_all_signals, records, fps)
    assert s_all > s_one


# --- Composite penalty ---

def test_composite_member_penalty():
    records = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(2)}
    fps_no_composite = {rid: _fp(rid, is_composite=False) for rid in records}
    fps_with_composite = {**fps_no_composite, "fn-0": _fp("fn-0", is_composite=True)}
    cluster = _cluster(list(records))
    s_no, _ = score_cluster(cluster, records, fps_no_composite)
    s_with, _ = score_cluster(cluster, records, fps_with_composite)
    assert s_with < s_no


# --- Confidence levels ---

def test_confidence_high_when_3_or_4_signals_agree():
    records = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(2)}
    fps = {rid: _fp(rid) for rid in records}
    # 4/4 agree
    c_4 = _cluster(list(records), agreement={"structural": True, "signature": True, "label": True, "lexical": True})
    _, conf_4 = score_cluster(c_4, records, fps)
    assert conf_4 == "high"
    # 3/4 agree
    c_3 = _cluster(list(records), agreement={"structural": True, "signature": True, "label": True, "lexical": False})
    _, conf_3 = score_cluster(c_3, records, fps)
    assert conf_3 == "high"


def test_confidence_medium_when_2_signals_agree():
    records = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(2)}
    fps = {rid: _fp(rid) for rid in records}
    c = _cluster(list(records), agreement={"structural": True, "signature": True, "label": False, "lexical": False})
    _, conf = score_cluster(c, records, fps)
    assert conf == "medium"


def test_confidence_low_when_1_signal_agrees():
    records = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(2)}
    fps = {rid: _fp(rid) for rid in records}
    c = _cluster(list(records), agreement={"structural": True, "signature": False, "label": False, "lexical": False})
    _, conf = score_cluster(c, records, fps)
    assert conf == "low"


def test_confidence_constants_match_design():
    """piece 3: 4/4 + 3+ = high, 2/4 = medium, else low."""
    assert _CONFIDENCE_HIGH_MIN == 3
    assert _CONFIDENCE_MEDIUM_MIN == 2
    assert set(_CONFIDENCE_SIGNALS) == {"structural", "signature", "label", "lexical"}


# --- Score range ---

def test_score_always_in_unit_range():
    """Even with maxed everything + penalty, score stays in [0, 1]."""
    records = {f"fn-{i}": _rec(f"fn-{i}", file=f"{i}.py") for i in range(10)}
    fps = {rid: _fp(rid, is_composite=True) for rid in records}
    c_max = _cluster(
        list(records),
        agreement={"structural": True, "signature": True, "label": True, "lexical": True},
    )
    score, _ = score_cluster(c_max, records, fps)
    assert 0.0 <= score <= 1.0


def test_score_zero_floor():
    """Heavy penalty + low signal agreement still doesn't go negative."""
    records = {"fn-1": _rec("fn-1"), "fn-2": _rec("fn-2")}  # same file
    fps = {rid: _fp(rid, is_composite=True) for rid in records}
    c = _cluster(
        list(records),
        agreement={"structural": False, "signature": False, "label": False, "lexical": False},
    )
    score, _ = score_cluster(c, records, fps)
    assert score >= 0.0
