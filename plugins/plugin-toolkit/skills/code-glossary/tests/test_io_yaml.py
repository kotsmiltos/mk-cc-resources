"""Round-trip tests for pipeline artifact I/O.

Every dump->load pair must reproduce the in-memory objects exactly —
these files are the only channel between engine stages once the SKILL
layer drives them as separate processes.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.io_yaml import (
    ArtifactError,
    apply_labels,
    dump_clusters,
    dump_fingerprints,
    dump_records,
    load_clusters,
    load_enrichments,
    load_fingerprints,
    load_labels,
    load_records,
)
from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    SignalFingerprint,
    SourceLocation,
)


def _record(rid: str = "fn-aaaa0001") -> FunctionRecord:
    return FunctionRecord(
        id=rid,
        location=SourceLocation(file="src/a.py", line=10, function="fetch_user"),
        signature="def fetch_user(uid: str) -> User",
        body="def fetch_user(uid: str) -> User:\n    r = api.get(uid)\n    return r\n",
        language="python",
        functionality_label="",
        description="",
        notable_calls=["api.get"],
        notable_inputs=["uid: str"],
        notable_outputs="User",
        helper_home_hint=None,
        inline_constants=["'x'"],
    )


def _fingerprint(rid: str = "fn-aaaa0001") -> SignalFingerprint:
    return SignalFingerprint(
        record_id=rid,
        lexical_tokens=frozenset({"fetch", "user", "api"}),
        label_tokens=("fetch", "user"),
        structural_hash="ab12cd34ef56ab12",
        signature_hash="1234567890abcdef",
        behavioral_statement=None,
        is_composite=False,
        composed_of_candidates=[],
    )


def _cluster(members: list[str]) -> CandidateCluster:
    return CandidateCluster(
        id="cluster-001",
        member_record_ids=members,
        primary_signal="structural",
        signal_agreement={"structural": True, "signature": True},
        extractability_score=0.8,
        extractability_confidence="high",
        notes="",
    )


# --- records ---


def test_records_round_trip(tmp_path: Path):
    records = [_record("fn-aaaa0001"), _record("fn-bbbb0002")]
    p = tmp_path / "records.yaml"
    dump_records(records, p)
    loaded = load_records(p)
    assert loaded == records  # dataclass eq covers every field


def test_records_round_trip_preserves_body_indentation(tmp_path: Path):
    rec = _record()
    rec.body = "def f():\n    if x:\n        return 1\n    return 2\n"
    p = tmp_path / "records.yaml"
    dump_records([rec], p)
    assert load_records(p)[0].body == rec.body


def test_records_unknown_field_fails_loudly(tmp_path: Path):
    p = tmp_path / "records.yaml"
    p.write_text(
        "records:\n- id: fn-x\n  location: {file: a.py, line: 1}\n  bogus_field: 1\n",
        encoding="utf-8",
    )
    with pytest.raises(ArtifactError, match="records\\[0\\]"):
        load_records(p)


def test_records_missing_top_key_fails(tmp_path: Path):
    p = tmp_path / "records.yaml"
    p.write_text("wrong: []\n", encoding="utf-8")
    with pytest.raises(ArtifactError, match="'records' list missing"):
        load_records(p)


def test_missing_file_raises_artifact_error(tmp_path: Path):
    with pytest.raises(ArtifactError, match="cannot read artifact"):
        load_records(tmp_path / "ghost.yaml")


# --- labels ---


def test_labels_load_and_apply(tmp_path: Path):
    records = [_record("fn-aaaa0001"), _record("fn-bbbb0002")]
    p = tmp_path / "labels.yaml"
    p.write_text(
        """\
labels:
  - id: fn-aaaa0001
    functionality_label: fetch-user-from-api
    description: Fetches one user by id.
  - id: fn-gone
    functionality_label: orphan-label
""",
        encoding="utf-8",
    )
    labels = load_labels(p)
    applied, unknown = apply_labels(records, labels)
    assert applied == 1
    assert unknown == ["fn-gone"]
    assert records[0].functionality_label == "fetch-user-from-api"
    assert records[0].description == "Fetches one user by id."
    assert records[1].functionality_label == ""  # untouched


def test_labels_empty_label_rejected(tmp_path: Path):
    p = tmp_path / "labels.yaml"
    p.write_text("labels:\n- id: fn-x\n  functionality_label: ''\n", encoding="utf-8")
    with pytest.raises(ArtifactError, match="functionality_label"):
        load_labels(p)


# --- fingerprints ---


def test_fingerprints_round_trip(tmp_path: Path):
    fps = {"fn-aaaa0001": _fingerprint()}
    p = tmp_path / "fps.yaml"
    dump_fingerprints(fps, p)
    loaded = load_fingerprints(p)
    assert loaded == fps  # frozenset/tuple reconstruction included


# --- clusters ---


def test_clusters_round_trip(tmp_path: Path):
    clusters = [_cluster(["fn-aaaa0001", "fn-bbbb0002"])]
    p = tmp_path / "clusters.yaml"
    dump_clusters(clusters, p)
    assert load_clusters(p) == clusters


# --- enrichments ---


def test_enrichments_load(tmp_path: Path):
    p = tmp_path / "enrich.yaml"
    p.write_text(
        """\
enrichments:
  - cluster_id: cluster-001
    name: register-build-factory
    description: Registers a build factory under an id.
    extractable: true
    canonical_signature: "RegisterFactory(buildId, create)"
    proposed_module: Shared/Factories.cs
    invariant_skeleton: "try { Register({id}, {fn}); } catch {}"
    variant_axis:
      - parameter: build_id
        instance_values: [A, B]
        inferred_type: BuildId
""",
        encoding="utf-8",
    )
    enr = load_enrichments(p)
    assert set(enr) == {"cluster-001"}
    assert enr["cluster-001"]["extractable"] is True


def test_enrichments_duplicate_cluster_rejected(tmp_path: Path):
    p = tmp_path / "enrich.yaml"
    p.write_text(
        "enrichments:\n- cluster_id: c1\n- cluster_id: c1\n",
        encoding="utf-8",
    )
    with pytest.raises(ArtifactError, match="duplicate enrichment"):
        load_enrichments(p)


def test_enrichments_missing_cluster_id_rejected(tmp_path: Path):
    p = tmp_path / "enrich.yaml"
    p.write_text("enrichments:\n- name: no-id\n", encoding="utf-8")
    with pytest.raises(ArtifactError, match="cluster_id"):
        load_enrichments(p)
