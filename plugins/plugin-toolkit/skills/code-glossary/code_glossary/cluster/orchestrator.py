"""Cluster orchestration — Stage 3 public API.

Public function: cluster_records(records, fingerprints) -> list[CandidateCluster]

Pipeline:
    1. bucketing.bucket_by_structural / signature / label
    2. merge.merge_buckets -> non-overlapping CandidateClusters
    3. scoring.score_cluster -> per-cluster extractability_score + confidence
    4. sort by score descending

Records that don't end up in any cluster are not represented in the
output (they're either single-instance or all-low-signal cases). The
later rendering stage (4) can iterate over (records - any-clustered)
to emit single-instance glossary entries for the watchlist.
"""

from __future__ import annotations

from code_glossary.cluster.bucketing import (
    bucket_by_label,
    bucket_by_signature,
    bucket_by_structural,
)
from code_glossary.cluster.merge import merge_buckets
from code_glossary.cluster.scoring import score_cluster
from code_glossary.records import CandidateCluster, FunctionRecord, SignalFingerprint


def cluster_records(
    records: list[FunctionRecord],
    fingerprints: dict[str, SignalFingerprint],
) -> list[CandidateCluster]:
    """Pass A cluster bucketing for a set of records + their fingerprints.

    Args:
        records: all records from Stage 1
        fingerprints: record_id -> SignalFingerprint from Stage 2

    Returns:
        List of CandidateCluster, sorted by extractability_score descending.
        Each record appears in at most ONE cluster (priority resolution
        per merge.SIGNAL_PRIORITY).
    """
    structural = bucket_by_structural(fingerprints)
    signature = bucket_by_signature(fingerprints)
    label = bucket_by_label(records)

    clusters = merge_buckets(structural, signature, label, fingerprints)

    record_index = {rec.id: rec for rec in records}
    for cluster in clusters:
        score, confidence = score_cluster(cluster, record_index, fingerprints)
        cluster.extractability_score = score
        cluster.extractability_confidence = confidence

    clusters.sort(key=lambda c: (-c.extractability_score, c.id))
    return clusters
