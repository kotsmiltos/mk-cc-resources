"""Block-cluster pass (v2.1) — group BlockRecords by shape hash.

Separate from the function clustering pass on purpose: blocks carry a
single signal (the shape hash) and a much higher noise floor, so they
get their own, stricter min-instances threshold and never share
CandidateCluster ids with function clusters.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from code_glossary.records import BlockRecord, CandidateCluster

# Block-level duplication is noisier than function-level (short windows,
# normalized shapes): only families well above coincidence size are
# actionable. The two reference clusters are n=18 and n=22; incidental
# 2-4 member shape collisions are dropped.
BLOCK_MIN_INSTANCES = 5

_BLOCK_SIGNAL = "block_shape"


def bucket_blocks(
    blocks: Iterable[BlockRecord],
    *,
    min_instances: int = BLOCK_MIN_INSTANCES,
) -> list[CandidateCluster]:
    """Group blocks by shape_hash; emit one CandidateCluster per big family.

    Clusters are sorted by member count descending and id'd
    blk-cluster-NNN so they can never collide with function clusters.
    """
    block_list = list(blocks)
    by_id = {b.id: b for b in block_list}
    buckets: dict[str, list[str]] = defaultdict(list)
    for b in block_list:
        buckets[b.shape_hash].append(b.id)

    families = [ids for ids in buckets.values() if len(ids) >= min_instances]

    # Nested-window dedup: the K=1 and K=2 prologue windows of the same
    # functions start at the same file:line, so one duplicated 2-statement
    # prologue would otherwise report as TWO families over identical
    # sites. Keep the widest window (most context) per site-set.
    by_sites: dict[frozenset, list[str]] = {}
    for ids in families:
        sites = frozenset((by_id[i].location.file, by_id[i].location.line) for i in ids)
        current = by_sites.get(sites)
        if current is None or _window_size(ids, by_id) > _window_size(current, by_id):
            by_sites[sites] = ids

    deduped = sorted(by_sites.values(), key=len, reverse=True)
    return [
        CandidateCluster(
            id=f"blk-cluster-{i:03d}",
            member_record_ids=sorted(ids),
            primary_signal=_BLOCK_SIGNAL,
            signal_agreement={_BLOCK_SIGNAL: True},
        )
        for i, ids in enumerate(deduped, start=1)
    ]


def _window_size(ids: list[str], by_id: dict) -> int:
    return by_id[ids[0]].window_size
