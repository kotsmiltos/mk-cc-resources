"""Tests for the v2.1 block clustering pass (cluster/block_bucketing.py)."""

from __future__ import annotations

from code_glossary.cluster.block_bucketing import bucket_blocks
from code_glossary.records import BlockRecord, SourceLocation


def _block(bid: str, shape: str, line: int = 1) -> BlockRecord:
    return BlockRecord(
        id=bid,
        location=SourceLocation(
            file=f"{bid}.cs", line=line, function="F", parent_function_id="fn-1"
        ),
        block_kind="function_prologue",
        body="if (!_a || _b) throw new E();",
        language="csharp",
        shape_hash=shape,
        window_size=1,
    )


def test_blocks_cluster_by_shape_hash():
    blocks = [_block(f"blk-{i}", "shape-A") for i in range(6)]
    clusters = bucket_blocks(blocks, min_instances=5)
    assert len(clusters) == 1
    c = clusters[0]
    assert c.id == "blk-cluster-001"
    assert c.primary_signal == "block_shape"
    assert len(c.member_record_ids) == 6
    assert c.member_record_ids == sorted(c.member_record_ids)


def test_block_min_instances_threshold():
    blocks = [_block(f"blk-{i}", "shape-A") for i in range(3)]
    assert bucket_blocks(blocks, min_instances=5) == []


def test_block_families_sorted_by_size():
    blocks = [_block(f"blk-a{i}", "shape-A") for i in range(5)] + [
        _block(f"blk-b{i}", "shape-B") for i in range(8)
    ]
    clusters = bucket_blocks(blocks, min_instances=5)
    assert [len(c.member_record_ids) for c in clusters] == [8, 5]
    assert clusters[0].id == "blk-cluster-001"


def test_nested_window_families_dedupe_to_widest():
    # K=1 and K=2 windows of the same prologue start at the same site;
    # only the widest window survives.
    k1 = [_block(f"blk-k1-{i}", "shape-K1", line=10) for i in range(5)]
    k2 = []
    for i in range(5):
        b = _block(f"blk-k2-{i}", "shape-K2", line=10)
        b.window_size = 2
        k2.append(b)
    # Same sites: file must match pairwise; rebuild with shared files.
    for i in range(5):
        k1[i].location.file = f"S{i}.cs"
        k2[i].location.file = f"S{i}.cs"
    clusters = bucket_blocks(k1 + k2, min_instances=5)
    assert len(clusters) == 1
    assert all(i.startswith("blk-k2-") for i in clusters[0].member_record_ids)
