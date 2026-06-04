"""Tests for the v2.1 block scanner (indexer/block_scanner.py).

Fixtures model the two Scalable Crowd reference block clusters the
function pipeline cannot see: function-prologue lifecycle guards (n=18)
and loop-body skip-guards (n=22). The compound-condition predicate is
the load-bearing false-positive guard — bare `if (x) return;` must
produce nothing.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.indexer.block_scanner import scan_file
from code_glossary.io_yaml import ArtifactError, dump_block_records, load_block_records
from code_glossary.records import BlockRecord, SourceLocation


CSHARP_GUARDS = """\
public class BuildA
{
    private bool _initialized;
    private bool _disposed;

    public StageTimings GetStageTimings()
    {
        if (!_initialized || _disposed)
        {
            throw new System.InvalidOperationException("read before Initialize");
        }
        return _lastTimings;
    }

    public void Tick(float dt)
    {
        for (int i = 0; i < _agents.Length; i++)
        {
            if (_agents[i].active == 0) continue;
            Integrate(i, dt);
            Commit(i);
        }
    }

    // Trivial guard: single-identifier condition -> must NOT emit a block.
    public void Maybe()
    {
        if (_disposed) return;
        Work();
        More();
    }
}
"""


@pytest.fixture()
def cs_guard_file(tmp_path: Path) -> Path:
    p = tmp_path / "BuildA.cs"
    p.write_text(CSHARP_GUARDS, encoding="utf-8")
    return p


def test_function_prologue_guard_extracted(cs_guard_file: Path, tmp_path: Path):
    blocks = scan_file(cs_guard_file, "csharp", rel_to=tmp_path)
    prologues = [b for b in blocks if b.block_kind == "function_prologue"]
    guard = next(b for b in prologues if "InvalidOperationException" in b.body)
    assert guard.location.function == "GetStageTimings"
    assert guard.location.parent_function_id is not None
    assert guard.location.parent_function_id.startswith("fn-")
    assert guard.shape_hash


def test_loop_prologue_continue_guard_extracted(cs_guard_file: Path, tmp_path: Path):
    blocks = scan_file(cs_guard_file, "csharp", rel_to=tmp_path)
    loops = [b for b in blocks if b.block_kind == "loop_prologue"]
    # K=1 (guard alone) and K=2 (guard + next stmt) windows both qualify;
    # the nested-window dedup happens at clustering, not here.
    assert {b.window_size for b in loops} == {1, 2}
    assert all("continue" in b.body for b in loops)
    assert all(b.location.function == "Tick" for b in loops)


def test_loop_guard_after_declaration_extracted(tmp_path: Path):
    # The real SC skip-guard shape: declaration BEFORE the guard —
    # only the K=2 loop window can see it.
    p = tmp_path / "Loop.cs"
    p.write_text(
        """\
public class L {
    public void Tick() {
        for (int i = 0; i < _agents.Length; i++) {
            AgentState a = _agents[i];
            if (a.active == 0) { continue; }
            Integrate(a);
        }
    }
}
""",
        encoding="utf-8",
    )
    blocks = scan_file(p, "csharp", rel_to=tmp_path)
    loops = [b for b in blocks if b.block_kind == "loop_prologue"]
    assert len(loops) == 1  # K=1 (bare declaration) fails the predicate
    assert loops[0].window_size == 2
    assert "continue" in loops[0].body


def test_trivial_single_ident_guard_excluded(cs_guard_file: Path, tmp_path: Path):
    # `if (_disposed) return;` has a jump but no compound condition.
    blocks = scan_file(cs_guard_file, "csharp", rel_to=tmp_path)
    assert not any(b.location.function == "Maybe" for b in blocks)


def test_block_shape_hash_renamed_guards_equal(tmp_path: Path):
    a = tmp_path / "A.cs"
    b = tmp_path / "B.cs"
    a.write_text(
        """\
public class A {
    public X Get() {
        if (!_initialized || _disposed) { throw new E("a"); }
        return _x;
    }
}
""",
        encoding="utf-8",
    )
    b.write_text(
        """\
public class B {
    public Y Fetch() {
        if (!_ready || _torn) { throw new E("completely different message"); }
        return _y;
    }
}
""",
        encoding="utf-8",
    )
    blocks_a = scan_file(a, "csharp", rel_to=tmp_path)
    blocks_b = scan_file(b, "csharp", rel_to=tmp_path)
    # Compare the K=1 windows (just the guard statement).
    guard_a = next(x for x in blocks_a if x.window_size == 1)
    guard_b = next(x for x in blocks_b if x.window_size == 1)
    assert guard_a.shape_hash == guard_b.shape_hash


def test_block_record_round_trips_yaml(tmp_path: Path):
    rec = BlockRecord(
        id="blk-deadbeef",
        location=SourceLocation(
            file="A.cs", line=5, function="Get", parent_function_id="fn-12345678"
        ),
        block_kind="function_prologue",
        body='if (!_a || _b) { throw new E("x"); }',
        language="csharp",
        shape_hash="abcd1234abcd1234",
        window_size=1,
    )
    path = tmp_path / "block_records.yaml"
    dump_block_records([rec], path)
    loaded = load_block_records(path)
    assert loaded == [rec]


def test_block_record_unknown_field_rejected(tmp_path: Path):
    path = tmp_path / "bad.yaml"
    path.write_text(
        """\
block_records:
  - id: blk-x
    location: {file: A.cs, line: 1}
    block_kind: function_prologue
    body: x
    language: csharp
    shape_hash: h
    window_size: 1
    surprise_field: boom
""",
        encoding="utf-8",
    )
    with pytest.raises(ArtifactError):
        load_block_records(path)
