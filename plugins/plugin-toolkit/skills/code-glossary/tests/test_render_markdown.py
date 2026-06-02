"""Tests for Markdown emission."""

from __future__ import annotations

from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    SignalFingerprint,
    SourceLocation,
)
from code_glossary.render.entry_builder import build_glossary
from code_glossary.render.markdown_emit import emit_glossary_markdown


def _rec(rec_id: str, file: str, func_name: str = "f") -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=42, function=func_name),
        signature=f"def {func_name}()",
        body=f"def {func_name}(): pass",
        language="python",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


def _fp(rec_id: str) -> SignalFingerprint:
    return SignalFingerprint(record_id=rec_id)


def _cluster(member_ids: list[str], **overrides) -> CandidateCluster:
    args = dict(
        id="cluster-001",
        member_record_ids=member_ids,
        primary_signal="structural",
        signal_agreement={"structural": True, "signature": False, "label": False, "lexical": False},
        extractability_score=0.5,
        extractability_confidence="medium",
    )
    args.update(overrides)
    return CandidateCluster(**args)


SCOPE = {"paths": ["src"], "excludes": [], "include_tests": False}


# --- Structure ---

def test_empty_glossary_emits_all_sections():
    g = build_glossary([], {}, [], SCOPE)
    md = emit_glossary_markdown(g)
    # All required sections appear even when empty.
    assert "# Code glossary" in md
    assert "## Summary" in md
    assert "## Top actions" in md
    assert "## Extractable clusters" in md
    assert "## Pending-enrichment clusters" in md
    assert "## Watchlist" in md
    assert "## Next steps" in md


def test_summary_has_totals():
    rec = _rec("fn-1", "a.py")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    md = emit_glossary_markdown(g)
    assert "Functions indexed" in md
    assert "Canonical clusters" in md


def test_section_with_pending_cluster_shows_in_top_actions():
    recs = [_rec(f"fn-{i}", f"{i}.py") for i in range(2)]
    fps = {r.id: _fp(r.id) for r in recs}
    clusters = [_cluster(["fn-0", "fn-1"], extractability_score=0.75)]
    g = build_glossary(recs, fps, clusters, SCOPE)
    md = emit_glossary_markdown(g)
    # Top actions section should reference the pending cluster.
    assert "gloss-001" in md or "cluster-f" in md
    assert "0.75" in md
    assert "pending" in md.lower() or "Pending" in md


def test_no_extractables_message_in_extractable_section():
    """Wave 5 baseline: no entries are extractable=true; section shows
    explanation of LLM enrichment being pending."""
    rec = _rec("fn-1", "a.py")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    md = emit_glossary_markdown(g)
    # Extractable section header followed by 'None yet' explanation.
    extractable_idx = md.index("## Extractable clusters")
    pending_idx = md.index("## Pending-enrichment clusters")
    extractable_section = md[extractable_idx:pending_idx]
    assert "None yet" in extractable_section or "LLM enrichment" in extractable_section


def test_watchlist_shows_singletons():
    rec = _rec("fn-solo", "lonely.py", func_name="lonely_fn")
    g = build_glossary([rec], {"fn-solo": _fp("fn-solo")}, [], SCOPE)
    md = emit_glossary_markdown(g)
    # Watchlist section should list the singleton.
    wl_idx = md.index("## Watchlist")
    wl_section = md[wl_idx:]
    assert "lonely.py" in wl_section
    # Function name reference (in code fence or backtick).
    assert "lonely_fn" in wl_section


def test_pending_section_lists_cluster_details():
    recs = [_rec(f"fn-{i}", f"{i}.py") for i in range(3)]
    fps = {r.id: _fp(r.id) for r in recs}
    clusters = [_cluster(["fn-0", "fn-1", "fn-2"], extractability_score=0.9, extractability_confidence="high")]
    g = build_glossary(recs, fps, clusters, SCOPE)
    md = emit_glossary_markdown(g)
    pending_idx = md.index("## Pending-enrichment clusters")
    next_section_idx = md.index("## Watchlist")
    pending_section = md[pending_idx:next_section_idx]
    # Cluster details: id, file:line for each instance.
    assert "gloss-001" in pending_section
    assert "high" in pending_section
    for i in range(3):
        assert f"{i}.py:42" in pending_section


# --- Robustness ---

def test_handles_entry_without_function_name():
    """Defensive: instance with empty function name shouldn't crash."""
    rec = FunctionRecord(
        id="fn-1",
        location=SourceLocation(file="a.py", line=1, function=""),
        signature="def f()",
        body="def f(): pass",
        language="python",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    md = emit_glossary_markdown(g)
    assert "a.py" in md


def test_target_path_in_header_when_provided():
    g = build_glossary([], {}, [], SCOPE)
    md = emit_glossary_markdown(g, target_path="/my/cool/project")
    assert "/my/cool/project" in md


def test_target_path_falls_back_to_scope_path():
    g = build_glossary([], {}, [], {"paths": ["my-scope-path"], "excludes": [], "include_tests": False})
    md = emit_glossary_markdown(g)
    assert "my-scope-path" in md


# --- Determinism ---

def test_markdown_is_deterministic_for_same_input():
    """Same input -> identical output (except for generated_at)."""
    rec = _rec("fn-1", "a.py")
    g = build_glossary([rec], {"fn-1": _fp("fn-1")}, [], SCOPE)
    md1 = emit_glossary_markdown(g)
    md2 = emit_glossary_markdown(g)
    assert md1 == md2
