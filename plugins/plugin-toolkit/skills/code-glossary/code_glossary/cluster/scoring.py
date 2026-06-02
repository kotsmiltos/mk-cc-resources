"""Cluster scoring — extractability score + confidence level.

Both are derived deterministically from CandidateCluster + the
underlying FunctionRecords. No LLM judgment; purely structural facts.

extractability_score (0..1, higher = better DRY candidate):
    - instance count component: 5+ instances -> max
    - file spread component:    3+ unique files -> max
    - signal agreement bonus:   each unanimous signal adds weight
    - composite penalty:        cluster includes composite members
      (composites are harder to extract cleanly)

extractability_confidence (high | medium | low):
    Derived from the count of unanimous signals across cluster members.
    With four applicable signals (structural, signature, label, lexical):
        4/4 unanimous -> high
        3/4 unanimous -> high
        2/4 unanimous -> medium
        1/4 unanimous -> low
        0/4 unanimous -> low (shouldn't happen since clustering requires
                              at least the primary_signal to be unanimous)
"""

from __future__ import annotations

from code_glossary.records import CandidateCluster, FunctionRecord, SignalFingerprint


# Score weights. Sum to 1.0 before composite penalty.
_W_INSTANCE_COUNT = 0.3
_W_FILE_SPREAD = 0.3
_W_SIGNAL_AGREEMENT = 0.4
_COMPOSITE_PENALTY = 0.1

# Saturation thresholds — counts at or above these give max component score.
_INSTANCE_COUNT_SATURATION = 5
_FILE_SPREAD_SATURATION = 3

# Confidence boundaries on the unanimous-signal count (out of 4).
_CONFIDENCE_HIGH_MIN = 3
_CONFIDENCE_MEDIUM_MIN = 2

# The four signals that contribute to cluster-level confidence. The
# fifth (behavioral) needs an LLM and stays None until the SKILL.md
# layer wires Agent dispatches. abstraction is a per-record flag, not
# a cluster-level agreement signal.
_CONFIDENCE_SIGNALS = ("structural", "signature", "label", "lexical")


def score_cluster(
    cluster: CandidateCluster,
    records: dict[str, FunctionRecord],
    fingerprints: dict[str, SignalFingerprint],
) -> tuple[float, str]:
    """Compute (extractability_score, extractability_confidence) for a cluster.

    Args:
        cluster: the CandidateCluster (after merge)
        records: id -> FunctionRecord for the cluster's members
        fingerprints: id -> SignalFingerprint for the cluster's members

    Returns:
        (score, confidence) where score is 0..1 and confidence is
        high | medium | low.
    """
    member_records = [records[m] for m in cluster.member_record_ids if m in records]
    member_fps = [fingerprints[m] for m in cluster.member_record_ids if m in fingerprints]

    if not member_records:
        return 0.0, "low"

    instance_count_score = min(1.0, len(member_records) / _INSTANCE_COUNT_SATURATION)
    unique_files = {r.location.file for r in member_records}
    file_spread_score = min(1.0, len(unique_files) / _FILE_SPREAD_SATURATION)
    signal_agreement_bonus = _signal_agreement_fraction(cluster)

    composite_penalty = _COMPOSITE_PENALTY if any(fp.is_composite for fp in member_fps) else 0.0

    raw_score = (
        instance_count_score * _W_INSTANCE_COUNT
        + file_spread_score * _W_FILE_SPREAD
        + signal_agreement_bonus * _W_SIGNAL_AGREEMENT
    ) - composite_penalty

    score = max(0.0, min(1.0, raw_score))
    confidence = _confidence_from_agreement(cluster)
    return score, confidence


def _signal_agreement_fraction(cluster: CandidateCluster) -> float:
    """Fraction of the 4 applicable signals that are unanimous (0..1)."""
    agreeing = sum(1 for s in _CONFIDENCE_SIGNALS if cluster.signal_agreement.get(s))
    return agreeing / len(_CONFIDENCE_SIGNALS)


def _confidence_from_agreement(cluster: CandidateCluster) -> str:
    """Derive high | medium | low from unanimous-signal count."""
    agreeing = sum(1 for s in _CONFIDENCE_SIGNALS if cluster.signal_agreement.get(s))
    if agreeing >= _CONFIDENCE_HIGH_MIN:
        return "high"
    if agreeing >= _CONFIDENCE_MEDIUM_MIN:
        return "medium"
    return "low"
