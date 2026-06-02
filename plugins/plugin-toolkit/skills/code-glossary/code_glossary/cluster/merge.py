"""Cluster merge — resolve overlapping buckets into non-overlapping clusters.

A record may appear in multiple buckets (e.g., same structural shape AND
same signature). The merge step assigns each record to ONE cluster
following the priority structural > signature > label.

For each emitted cluster, signal_agreement is computed across all members:
    - signal_agreement[signal] = True iff that signal is unanimous
      across all members
    - lexical agreement uses Jaccard similarity >= LEXICAL_AGREEMENT_THRESHOLD

This gives the SignalFingerprint-vs-cluster cross-check needed for
extractability_confidence in the next step (wave 4.3 scoring).
"""

from __future__ import annotations

from typing import Iterable

from code_glossary.records import CandidateCluster, SignalFingerprint


# Pairs/groups whose pairwise Jaccard similarity exceeds this floor are
# considered to agree on the lexical signal. 0.5 chosen as a moderately
# strict default; tunable later via config.
LEXICAL_AGREEMENT_THRESHOLD = 0.5

# Priority order for cluster assignment (highest first).
SIGNAL_PRIORITY: tuple[str, ...] = ("structural", "signature", "label")


def merge_buckets(
    structural_buckets: dict[str, set[str]],
    signature_buckets: dict[str, set[str]],
    label_buckets: dict[str, set[str]],
    fingerprints: dict[str, SignalFingerprint],
) -> list[CandidateCluster]:
    """Merge overlapping buckets into non-overlapping CandidateClusters.

    A record is assigned to the FIRST bucket in priority order that it
    belongs to (structural wins over signature wins over label).

    Records not in any bucket are not clustered.

    Returns:
        List of CandidateCluster, sorted by member count descending.
    """
    assigned: set[str] = set()
    clusters: list[CandidateCluster] = []
    cluster_counter = 1

    # Process each signal in priority order.
    for signal_name, buckets in (
        ("structural", structural_buckets),
        ("signature", signature_buckets),
        ("label", label_buckets),
    ):
        # Sort buckets by member count descending so larger clusters are
        # processed first (and get the first-claim on any record).
        sorted_buckets = sorted(buckets.items(), key=lambda kv: -len(kv[1]))
        for _bucket_key, member_ids in sorted_buckets:
            unassigned = [m for m in member_ids if m not in assigned]
            if len(unassigned) < 2:
                continue  # need 2+ remaining unassigned members for a cluster
            cluster_id = f"cluster-{cluster_counter:03d}"
            cluster_counter += 1
            agreement = _compute_agreement(unassigned, fingerprints)
            clusters.append(
                CandidateCluster(
                    id=cluster_id,
                    member_record_ids=sorted(unassigned),
                    primary_signal=signal_name,
                    signal_agreement=agreement,
                )
            )
            assigned.update(unassigned)

    # Sort by member count descending for stable output ordering.
    clusters.sort(key=lambda c: (-len(c.member_record_ids), c.id))
    return clusters


def _compute_agreement(
    member_ids: list[str],
    fingerprints: dict[str, SignalFingerprint],
) -> dict[str, bool]:
    """Per-signal agreement across all cluster members.

    For each signal, True iff all members produce identical values
    (or, for lexical, pairwise Jaccard >= LEXICAL_AGREEMENT_THRESHOLD).
    Returns dict with keys: structural, signature, label, lexical.
    """
    fps = [fingerprints[m] for m in member_ids if m in fingerprints]
    if len(fps) < 2:
        return {"structural": False, "signature": False, "label": False, "lexical": False}

    structural_vals = {fp.structural_hash for fp in fps}
    signature_vals = {fp.signature_hash for fp in fps}
    label_vals = {fp.label_tokens for fp in fps}

    return {
        "structural": len(structural_vals) == 1 and None not in structural_vals,
        "signature": len(signature_vals) == 1 and None not in signature_vals,
        "label": len(label_vals) == 1 and label_vals != {()},  # non-empty unanimous labels
        "lexical": _lexical_agreement(fps),
    }


def _lexical_agreement(fps: list[SignalFingerprint]) -> bool:
    """True iff all pairwise Jaccard similarities >= threshold."""
    for i, fp_i in enumerate(fps):
        for fp_j in fps[i + 1:]:
            sim = _jaccard(fp_i.lexical_tokens, fp_j.lexical_tokens)
            if sim < LEXICAL_AGREEMENT_THRESHOLD:
                return False
    return True


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    """Jaccard similarity between two iterables of tokens.

    Two empty sets are perfectly similar (1.0) by convention; this only
    happens when both records have empty bodies, which is unusual but
    not worth treating as disagreement.
    """
    sa = set(a)
    sb = set(b)
    if not sa and not sb:
        return 1.0
    union = sa | sb
    if not union:
        return 1.0
    return len(sa & sb) / len(union)
