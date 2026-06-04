"""Tests for the v2.1 near-miss judge-candidate generators.

Three generators, each modeled on a real SC A/B recall loss:
label-prefix pairs (split build-factory family), singleton adoption
(ClosestPointOnSegment variants), signature-only bucket sampling
(the unreviewed n=143 parameterless-void bucket).
"""

from __future__ import annotations

from code_glossary.cluster.near_misses import find_near_misses
from code_glossary.records import CandidateCluster, FunctionRecord, SourceLocation


def _rec(rid: str, fn: str, label: str = "", file: str = "a.cs", line: int = 1) -> FunctionRecord:
    return FunctionRecord(
        id=rid,
        location=SourceLocation(file=file, line=line, function=fn),
        signature=f"void {fn}()",
        body=f"void {fn}() {{ Work(); More(); }}",
        language="csharp",
        functionality_label=label,
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


def _cluster(cid: str, member_ids: list[str], **agreement: bool) -> CandidateCluster:
    return CandidateCluster(
        id=cid,
        member_record_ids=member_ids,
        primary_signal="structural",
        signal_agreement={
            "structural": agreement.get("structural", True),
            "signature": agreement.get("signature", True),
            "label": agreement.get("label", False),
            "lexical": agreement.get("lexical", False),
        },
    )


def test_label_pair_shared_prefix():
    records = [
        _rec("fn-1", "Factory", "build-factory-instantiation"),
        _rec("fn-2", "Create", "build-factory-instantiation"),
        _rec("fn-3", "Register", "build-factory-registration"),
        _rec("fn-4", "RegisterFactory", "build-factory-registration"),
        _rec("fn-5", "Splat", "splat-density"),
        _rec("fn-6", "SplatDensity", "splat-density"),
    ]
    clusters = [
        _cluster("cluster-001", ["fn-1", "fn-2"]),
        _cluster("cluster-002", ["fn-3", "fn-4"]),
        _cluster("cluster-003", ["fn-5", "fn-6"]),
    ]
    candidates = find_near_misses(records, clusters)
    pairs = [c for c in candidates if c["kind"] == "label-pair"]
    assert len(pairs) == 1  # build-factory-* pair; splat-density matches nothing
    assert {pairs[0]["cluster_a"], pairs[0]["cluster_b"]} == {"cluster-001", "cluster-002"}
    assert "build-factory" in pairs[0]["reason"]


def test_label_pair_skips_unclear_and_unlabeled():
    records = [
        _rec("fn-1", "A", "unclear"),
        _rec("fn-2", "B", "unclear"),
        _rec("fn-3", "C", ""),
        _rec("fn-4", "D", ""),
    ]
    clusters = [_cluster("cluster-001", ["fn-1", "fn-2"]), _cluster("cluster-002", ["fn-3", "fn-4"])]
    assert [c for c in find_near_misses(records, clusters) if c["kind"] == "label-pair"] == []


def test_singleton_adoption_exact_name_match():
    # The SC A/B shape: 6 clustered ClosestPointOnSegment + 2 singletons
    # with the same name (one qualified) that Pass A's shape hash dropped.
    records = [
        _rec("fn-1", "ClosestPointOnSegment", file="PowerLawBuild.cs"),
        _rec("fn-2", "AStarReynoldsBuild.ClosestPointOnSegment", file="AStarReynoldsBuild.cs"),
        _rec("fn-3", "ClosestPointOnSegment", file="SocialForceBuild.cs", line=656),
        _rec("fn-4", "Unrelated", file="Other.cs"),
    ]
    clusters = [_cluster("cluster-005", ["fn-1", "fn-2"])]
    candidates = find_near_misses(records, clusters)
    adoptions = [c for c in candidates if c["kind"] == "singleton-adoption"]
    assert len(adoptions) == 1
    assert adoptions[0]["cluster_a"] == "cluster-005"
    assert adoptions[0]["record_id"] == "fn-3"
    assert "SocialForceBuild.cs:656" in adoptions[0]["reason"]


def test_singleton_adoption_matches_qualified_member_name():
    # Cluster member qualified, singleton bare — must still match.
    records = [
        _rec("fn-1", "Builder.Hydrate"),
        _rec("fn-2", "OtherBuilder.Hydrate"),
        _rec("fn-3", "Hydrate", file="Third.cs"),
    ]
    clusters = [_cluster("cluster-001", ["fn-1", "fn-2"])]
    adoptions = [c for c in find_near_misses(records, clusters) if c["kind"] == "singleton-adoption"]
    assert [a["record_id"] for a in adoptions] == ["fn-3"]


def test_bucket_sample_signature_only_big_cluster():
    members = [f"fn-{i:03d}" for i in range(25)]
    records = [_rec(rid, f"F{rid}") for rid in members]
    clusters = [
        _cluster("cluster-noise", members, structural=False, signature=True),
        # Big but structurally agreed -> NOT a noise bucket.
        _cluster("cluster-real", members, structural=True, signature=True),
    ]
    candidates = find_near_misses(records, clusters, bucket_min_members=20, bucket_sample_size=5)
    samples = [c for c in candidates if c["kind"] == "bucket-sample"]
    assert len(samples) == 1
    assert samples[0]["cluster_a"] == "cluster-noise"
    assert len(samples[0]["sample_record_ids"]) == 5
    assert samples[0]["sample_record_ids"] == sorted(samples[0]["sample_record_ids"])


def test_bucket_sample_below_threshold_ignored():
    members = [f"fn-{i}" for i in range(5)]
    records = [_rec(rid, f"F{rid}") for rid in members]
    clusters = [_cluster("cluster-small", members, structural=False, signature=True)]
    assert [c for c in find_near_misses(records, clusters) if c["kind"] == "bucket-sample"] == []
