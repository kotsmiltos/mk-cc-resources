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

from code_glossary.records import FunctionRecord, SignalFingerprint


def bucket_by_structural(
    fingerprints: dict[str, SignalFingerprint],
) -> dict[str, set[str]]:
    """Group record IDs by structural_hash. None hashes excluded.

    Returns:
        Map structural_hash -> set of record IDs (only groups of >=2).
    """
    buckets: dict[str, set[str]] = defaultdict(set)
    for rec_id, fp in fingerprints.items():
        if fp.structural_hash:
            buckets[fp.structural_hash].add(rec_id)
    return {h: ids for h, ids in buckets.items() if len(ids) >= 2}


def bucket_by_signature(
    fingerprints: dict[str, SignalFingerprint],
) -> dict[str, set[str]]:
    """Group record IDs by signature_hash. None hashes excluded."""
    buckets: dict[str, set[str]] = defaultdict(set)
    for rec_id, fp in fingerprints.items():
        if fp.signature_hash:
            buckets[fp.signature_hash].add(rec_id)
    return {h: ids for h, ids in buckets.items() if len(ids) >= 2}


def bucket_by_label(
    records: list[FunctionRecord],
) -> dict[str, set[str]]:
    """Group record IDs by exact functionality_label. Empty labels excluded.

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
