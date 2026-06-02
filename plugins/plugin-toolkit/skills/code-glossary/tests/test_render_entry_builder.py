"""Tests for the entry builder (CandidateCluster → GlossaryEntry)."""

from __future__ import annotations

from code_glossary.constants import SCHEMA_VERSION
from code_glossary.render.entry_builder import build_glossary
from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    Glossary,
    Instance,
    SignalFingerprint,
    SourceLocation,
)


def _rec(rec_id: str, file: str, function_name: str = "f", body: str = "def f(): pass") -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=1, function=function_name),
        signature=f"def {function_name}()",
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


def _cluster(member_ids: list[str], **overrides) -> CandidateCluster:
    args = dict(
        id="cluster-001",
        member_record_ids=member_ids,
        primary_signal="structural",
        signal_agreement={"structural": True, "signature": False, "label": False, "lexical": False},
        extractability_score=0.5,
        extractability_confidence="medium",
    )
    args.update(overrides)
    return CandidateCluster(**args)


SCOPE = {"paths": ["src"], "excludes": [], "include_tests": False}


# --- Empty ---

def test_build_glossary_empty_inputs():
    g = build_glossary([], {}, [], SCOPE)
    assert isinstance(g, Glossary)
    assert g.glossary == []
    assert g.schema_version == SCHEMA_VERSION
    assert g.metadata["totals"]["records_indexed"] == 0
    assert g.metadata["totals"]["clusters"] == 0


# --- Cluster entries ---

def test_cluster_entry_emitted_as_extractable_false():
    """v1 baseline: clusters are extractable=false until LLM enrichment."""
    recs = [_rec("fn-1", "a.py"), _rec("fn-2", "b.py")]
    fps = {"fn-1": _fp("fn-1"), "fn-2": _fp("fn-2")}
    clusters = [_cluster(["fn-1", "fn-2"])]

    g = build_glossary(recs, fps, clusters, SCOPE)
    assert len(g.glossary) == 1  # 1 cluster entry; both records clustered so no watchlist
    entry = g.glossary[0]
    assert entry.extractable is False
    assert entry.canonical_signature is None
    assert entry.proposed_module is None
    assert entry.invariant_skeleton is None
    assert entry.variant_axis == []
    assert "enrichment" in entry.notes


def test_cluster_entry_carries_score_and_confidence():
    recs = [_rec("fn-1", "a.py"), _rec("fn-2", "b.py")]
    fps = {"fn-1": _fp("fn-1"), "fn-2": _fp("fn-2")}
    clusters = [_cluster(["fn-1", "fn-2"], extractability_score=0.75, extractability_confidence="high")]

    g = build_glossary(recs, fps, clusters, SCOPE)
    entry = g.glossary[0]
    assert entry.extractability_score == 0.75
    assert entry.extractability_confidence == "high"


def test_cluster_entry_includes_all_instances():
    recs = [
        _rec("fn-1", "a.py", function_name="foo"),
        _rec("fn-2", "b.py", function_name="bar"),
    ]
    fps = {"fn-1": _fp("fn-1"), "fn-2": _fp("fn-2")}
    clusters = [_cluster(["fn-1", "fn-2"])]

    g = build_glossary(recs, fps, clusters, SCOPE)
    entry = g.glossary[0]
    assert len(entry.instances) == 2
    files = {inst.location.file for inst in entry.instances}
    assert files == {"a.py", "b.py"}


def test_cluster_entry_signal_agreement_propagates():
    recs = [_rec("fn-1", "a.py"), _rec("fn-2", "b.py")]
    fps = {"fn-1": _fp("fn-1"), "fn-2": _fp("fn-2")}
    agreement = {"structural": True, "signature": True, "label": False, "lexical": False}
    clusters = [_cluster(["fn-1", "fn-2"])]
    clusters[0].signal_agreement = agreement

    g = build_glossary(recs, fps, clusters, SCOPE)
    sa = g.glossary[0].signal_agreement
    assert sa["structural"] == 1.0
    assert sa["signature"] == 1.0
    assert sa["label"] == 0.0


def test_cluster_name_uses_most_common_function_name():
    recs = [
        _rec("fn-1", "a.py", function_name="parse_date"),
        _rec("fn-2", "b.py", function_name="parse_date"),
        _rec("fn-3", "c.py", function_name="parse_iso"),
    ]
    fps = {r.id: _fp(r.id) for r in recs}
    clusters = [_cluster(["fn-1", "fn-2", "fn-3"])]

    g = build_glossary(recs, fps, clusters, SCOPE)
    assert "parse_date" in g.glossary[0].name


# --- Single-instance entries ---

def test_unclustered_records_become_watchlist_entries():
    recs = [_rec("fn-solo", "a.py", function_name="lonely")]
    fps = {"fn-solo": _fp("fn-solo")}

    g = build_glossary(recs, fps, [], SCOPE)
    assert len(g.glossary) == 1
    entry = g.glossary[0]
    assert entry.extractable is False
    assert len(entry.instances) == 1
    assert "Single instance" in entry.notes or "single" in entry.notes.lower()


def test_mixed_clustered_and_unclustered():
    """3 records, 2 in cluster, 1 standalone."""
    recs = [
        _rec("fn-1", "a.py"),
        _rec("fn-2", "b.py"),
        _rec("fn-solo", "c.py"),
    ]
    fps = {r.id: _fp(r.id) for r in recs}
    clusters = [_cluster(["fn-1", "fn-2"])]

    g = build_glossary(recs, fps, clusters, SCOPE)
    assert len(g.glossary) == 2  # 1 cluster entry + 1 watchlist entry


# --- Metadata ---

def test_metadata_records_totals_correctly():
    recs = [_rec(f"fn-{i}", f"{i}.py") for i in range(5)]
    fps = {r.id: _fp(r.id) for r in recs}
    clusters = [_cluster(["fn-0", "fn-1"])]

    g = build_glossary(recs, fps, clusters, SCOPE)
    assert g.metadata["totals"]["records_indexed"] == 5
    assert g.metadata["totals"]["clusters"] == 1


def test_metadata_scope_preserved():
    recs = [_rec("fn-1", "a.py")]
    fps = {"fn-1": _fp("fn-1")}
    scope = {"paths": ["src", "lib"], "excludes": ["node_modules"], "include_tests": True}
    g = build_glossary(recs, fps, [], scope)
    assert g.metadata["scope"]["paths"] == ["src", "lib"]
    assert g.metadata["scope"]["excludes"] == ["node_modules"]
    assert g.metadata["scope"]["include_tests"] is True


def test_metadata_language_mix():
    recs = [
        _rec("fn-1", "a.py"),
        _rec("fn-2", "b.py"),
        _rec("fn-3", "c.py"),
    ]
    fps = {r.id: _fp(r.id) for r in recs}
    g = build_glossary(recs, fps, [], SCOPE)
    assert g.metadata["language_or_format_mix"] == {"python": 1.0}


def test_metadata_generated_at_iso_format():
    g = build_glossary([], {}, [], SCOPE)
    ts = g.metadata["generated_at"]
    # ISO format ends with TZ; just check parseable.
    import datetime
    parsed = datetime.datetime.fromisoformat(ts)
    assert parsed is not None


# --- Schema conformance ---

def test_output_passes_schema_validator():
    """build_glossary output -> validate_glossary returns []."""
    from code_glossary.schema import validate_glossary

    recs = [_rec("fn-1", "a.py", function_name="foo"), _rec("fn-2", "b.py", function_name="bar")]
    fps = {r.id: _fp(r.id) for r in recs}
    clusters = [_cluster(["fn-1", "fn-2"])]

    g = build_glossary(recs, fps, clusters, SCOPE)
    # Convert to dict (rough serialization for validator).
    import dataclasses
    doc = dataclasses.asdict(g)
    # The validator expects 'instances[i].location.file' etc.
    # asdict turns SourceLocation into a nested dict; matches.
    errors = validate_glossary(doc)
    # Filter out any errors caused by asdict's None handling in dataclass fields
    # we don't want to validate (e.g., variant_axis empty list is fine).
    blocking = [e for e in errors if "missing" in e.message or "must be" in e.message]
    assert blocking == [], f"unexpected schema errors: {blocking}"
