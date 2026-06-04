"""Pass A bucketing — group records by exact signal matches.

Three buckets, one per signal that produces an exact hash/string:
    - structural: records with same structural_hash
    - signature:  records with same signature_hash
    - label:      records with same functionality_label (non-empty)

A record can appear in multiple buckets (e.g., same structural shape
AND same signature). The merge step resolves overlaps into
non-overlapping CandidateClusters with priority structural > signature > label.

Output: dict[bucket_key, set[record_id]] per signal.
Bucket keys with only 1 member are filtered (no cluster of one).
"""

from __future__ import annotations

from collections import defaultdict
from typing import Callable, Optional

from code_glossary.records import FunctionRecord, SignalFingerprint


def bucket_by_attribute(
    fingerprints: dict[str, SignalFingerprint],
    get_hash: Callable[[SignalFingerprint], Optional[str]],
) -> dict[str, set[str]]:
    """Group record IDs by a fingerprint hash accessor. None hashes excluded.

    The shared invariant behind the per-signal bucketing functions —
    extracted per the engine's OWN glossary run (sanity-run cluster-004
    flagged bucket_by_structural/bucket_by_signature as a clone pair).

    Returns:
        Map hash -> set of record IDs (only groups of >=2).
    """
    buckets: dict[str, set[str]] = defaultdict(set)
    for rec_id, fp in fingerprints.items():
        hash_val = get_hash(fp)
        if hash_val:
            buckets[hash_val].add(rec_id)
    return {h: ids for h, ids in buckets.items() if len(ids) >= 2}


def bucket_by_structural(
    fingerprints: dict[str, SignalFingerprint],
) -> dict[str, set[str]]:
    """Group record IDs by structural_hash. None hashes excluded.

    Returns:
        Map structural_hash -> set of record IDs (only groups of >=2).
    """
    return bucket_by_attribute(fingerprints, lambda fp: fp.structural_hash)


def bucket_by_signature(
    fingerprints: dict[str, SignalFingerprint],
) -> dict[str, set[str]]:
    """Group record IDs by signature_hash. None hashes excluded."""
    return bucket_by_attribute(fingerprints, lambda fp: fp.signature_hash)


def bucket_by_label(
    records: list[FunctionRecord],
) -> dict[str, set[str]]:
    """Group record IDs by exact functionality_label. Empty labels excluded.

    Deliberately NOT folded into bucket_by_attribute: it iterates
    FunctionRecords (not fingerprints) and keys by label string — the
    shapes only look alike. Forcing one helper over both would trade a
    3-line loop for a genericity layer (the engine's own Pass B review
    reached the same verdict).

    Wave 3+ records have empty labels (LLM hasn't filled them yet).
    This bucketing only contributes once labels are populated by the
    SKILL.md layer (wave 7+); for now it returns an empty dict in
    typical wave-4 dogfood runs.
    """
    buckets: dict[str, set[str]] = defaultdict(set)
    for rec in records:
        if rec.functionality_label:
            buckets[rec.functionality_label].add(rec.id)
    return {label: ids for label, ids in buckets.items() if len(ids) >= 2}
