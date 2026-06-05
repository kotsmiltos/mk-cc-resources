"""Tests for glossary drift diff (v2.2 — the v1.1 drift chapter).

Identity contract under test: entries match across runs by
{(file, function)} instance sets — NEVER by gloss-id (positional) or
record id (line-sensitive). The line-drift case is the critical one:
same sites at different line numbers must match as the same entry.
"""

from __future__ import annotations

from pathlib import Path

import yaml

from code_glossary.diff import (
    DIFF_MATCH_THRESHOLD,
    diff_glossaries,
    render_diff_markdown,
)
from code_glossary.runner import (
    EXIT_DRIFT_FOUND,
    EXIT_HARD_FAILURE,
    EXIT_OK,
    main,
)


def _entry(
    eid: str,
    name: str,
    sites: list[tuple[str, str, int]],
    extractable: bool = False,
    verification: str = "verified",
) -> dict:
    return {
        "id": eid,
        "name": name,
        "description": "d",
        "kind": "leaf",
        "extractable": extractable,
        "verification_status": verification,
        "instances": [
            {
                "instance_type": "function",
                "location": {"file": f, "line": line, "function": fn},
                "body_excerpt": "x",
                "language_or_format": "python",
            }
            for f, fn, line in sites
        ],
    }


def _doc(entries: list[dict]) -> dict:
    return {"schema_version": 1, "glossary": entries}


PAIR = [("src/a.py", "fetch_a", 10), ("src/b.py", "fetch_b", 20)]


def test_identical_docs_no_drift():
    doc = _doc([_entry("gloss-001", "fetch", PAIR)])
    result = diff_glossaries(doc, doc)
    assert result.matched_count == 1
    assert not result.has_drift()
    assert result.summary_counts() == {
        "matched": 1,
        "added": 0,
        "removed": 0,
        "grown": 0,
        "shrunk": 0,
        "extractable_changed": 0,
        "verification_changed": 0,
    }


def test_line_drift_only_matches_as_same_entry():
    """THE identity case: lines moved, sites identical -> no add/remove."""
    old = _doc([_entry("gloss-001", "fetch", PAIR)])
    shifted = [(f, fn, line + 37) for f, fn, line in PAIR]
    new = _doc([_entry("gloss-009", "fetch", shifted)])  # different gloss-id too
    result = diff_glossaries(old, new)
    assert result.matched_count == 1
    assert result.added == [] and result.removed == []
    assert not result.has_drift()


def test_added_entry():
    old = _doc([_entry("gloss-001", "fetch", PAIR)])
    new = _doc(
        [
            _entry("gloss-001", "fetch", PAIR),
            _entry("gloss-002", "render", [("src/c.py", "render_c", 1), ("src/d.py", "render_d", 1)]),
        ]
    )
    result = diff_glossaries(old, new)
    assert [e.name for e in result.added] == ["render"]
    assert result.removed == []


def test_removed_entry():
    old = _doc(
        [
            _entry("gloss-001", "fetch", PAIR),
            _entry("gloss-002", "render", [("src/c.py", "render_c", 1), ("src/d.py", "render_d", 1)]),
        ]
    )
    new = _doc([_entry("gloss-001", "fetch", PAIR)])
    result = diff_glossaries(old, new)
    assert [e.name for e in result.removed] == ["render"]
    assert result.added == []


def test_grown_entry_reports_gained_sites():
    old = _doc([_entry("gloss-001", "fetch", PAIR)])
    new = _doc([_entry("gloss-001", "fetch", PAIR + [("src/z.py", "fetch_z", 5)])])
    result = diff_glossaries(old, new)
    assert len(result.grown) == 1
    assert result.grown[0].gained_sites == [("src/z.py", "fetch_z")]
    assert result.shrunk == []
    assert result.has_drift()


def test_shrunk_entry_reports_lost_sites():
    old = _doc([_entry("gloss-001", "fetch", PAIR + [("src/z.py", "fetch_z", 5)])])
    new = _doc([_entry("gloss-001", "fetch", PAIR)])
    result = diff_glossaries(old, new)
    assert len(result.shrunk) == 1
    assert result.shrunk[0].lost_sites == [("src/z.py", "fetch_z")]
    assert result.grown == []


def test_extractable_changed():
    old = _doc([_entry("gloss-001", "fetch", PAIR, extractable=False)])
    new = _doc([_entry("gloss-001", "fetch", PAIR, extractable=True)])
    result = diff_glossaries(old, new)
    assert len(result.extractable_changed) == 1
    assert result.grown == [] and result.shrunk == []


def test_verification_changed():
    old = _doc([_entry("gloss-001", "fetch", PAIR, verification="verified")])
    new = _doc([_entry("gloss-001", "fetch", PAIR, verification="quote_drift_detected")])
    result = diff_glossaries(old, new)
    assert len(result.verification_changed) == 1


def test_singles_excluded_by_default():
    old = _doc([_entry("gloss-001", "lonely", [("src/a.py", "f", 1)])])
    new = _doc([])
    result = diff_glossaries(old, new)
    assert result.singles_excluded_old == 1
    assert result.removed == []  # excluded, not reported as removed
    assert not result.has_drift()


def test_singles_included_on_override():
    old = _doc([_entry("gloss-001", "lonely", [("src/a.py", "f", 1)])])
    new = _doc([])
    result = diff_glossaries(old, new, include_singles=True)
    assert result.singles_excluded_old == 0
    assert [e.name for e in result.removed] == ["lonely"]


def test_below_threshold_is_add_plus_remove():
    # 1 shared site of 4 union -> jaccard 0.25 < 0.5: not the same entry.
    old = _doc([_entry("gloss-001", "fetch", PAIR + [("src/c.py", "c", 1)])])
    new = _doc(
        [_entry("gloss-001", "fetch", [("src/a.py", "fetch_a", 10), ("src/x.py", "x", 1)])]
    )
    # union = {a, b, c, x} (4), intersection = {a} (1) -> 0.25
    result = diff_glossaries(old, new)
    assert result.matched_count == 0
    assert len(result.added) == 1 and len(result.removed) == 1


def test_name_equality_breaks_jaccard_ties():
    # Two old entries with IDENTICAL identity sets (jaccard 1.0 against
    # the one new entry for both); the name-equal one must win the
    # greedy claim, the other reports as removed.
    shared = [("src/a.py", "f_a", 1), ("src/b.py", "f_b", 1)]
    old = _doc(
        [
            _entry("gloss-001", "other-name", shared),
            _entry("gloss-002", "the-name", shared),
        ]
    )
    new = _doc([_entry("gloss-001", "the-name", shared)])
    result = diff_glossaries(old, new)
    assert result.matched_count == 1
    assert [e.name for e in result.removed] == ["other-name"]


def test_markdown_report_lists_sites():
    old = _doc([_entry("gloss-001", "fetch", PAIR)])
    new = _doc([_entry("gloss-001", "fetch", PAIR + [("src/z.py", "fetch_z", 5)])])
    result = diff_glossaries(old, new)
    md = render_diff_markdown(result, "old.yaml", "new.yaml")
    assert "## Grown" in md
    assert "src/z.py:fetch_z" in md
    assert "grown: 1" in md.replace("- ", "")  # summary line


# --- runner CLI ---


def _write_doc(path: Path, doc: dict) -> None:
    path.write_text(yaml.safe_dump(doc, sort_keys=False), encoding="utf-8")


def test_runner_diff_writes_report_exit_ok(tmp_path: Path, capsys):
    old_p, new_p = tmp_path / "old.yaml", tmp_path / "new.yaml"
    out_p = tmp_path / "DIFF.md"
    _write_doc(old_p, _doc([_entry("gloss-001", "fetch", PAIR)]))
    _write_doc(new_p, _doc([_entry("gloss-001", "fetch", PAIR + [("src/z.py", "fetch_z", 5)])]))
    code = main(["diff", "--old", str(old_p), "--new", str(new_p), "--out", str(out_p)])
    out = capsys.readouterr().out
    assert code == EXIT_OK  # drift found but reporting-only by default
    assert out_p.is_file()
    assert "grown: 1" in out
    assert "drift_found: true" in out


def test_runner_diff_fail_on_drift_exits_1(tmp_path: Path):
    old_p, new_p = tmp_path / "old.yaml", tmp_path / "new.yaml"
    _write_doc(old_p, _doc([_entry("gloss-001", "fetch", PAIR)]))
    _write_doc(new_p, _doc([_entry("gloss-001", "fetch", PAIR + [("src/z.py", "fetch_z", 5)])]))
    code = main([
        "diff",
        "--old", str(old_p),
        "--new", str(new_p),
        "--out", str(tmp_path / "DIFF.md"),
        "--fail-on-drift",
    ])
    assert code == EXIT_DRIFT_FOUND


def test_runner_diff_no_drift_fail_flag_exits_0(tmp_path: Path):
    old_p = tmp_path / "old.yaml"
    _write_doc(old_p, _doc([_entry("gloss-001", "fetch", PAIR)]))
    code = main([
        "diff",
        "--old", str(old_p),
        "--new", str(old_p),
        "--out", str(tmp_path / "DIFF.md"),
        "--fail-on-drift",
    ])
    assert code == EXIT_OK


def test_runner_diff_missing_file_hard_fails(tmp_path: Path):
    old_p = tmp_path / "old.yaml"
    _write_doc(old_p, _doc([]))
    code = main([
        "diff",
        "--old", str(old_p),
        "--new", str(tmp_path / "ghost.yaml"),
        "--out", str(tmp_path / "DIFF.md"),
    ])
    assert code == EXIT_HARD_FAILURE


def test_runner_diff_not_a_glossary_hard_fails(tmp_path: Path):
    old_p, bogus = tmp_path / "old.yaml", tmp_path / "bogus.yaml"
    _write_doc(old_p, _doc([]))
    bogus.write_text("records: []\n", encoding="utf-8")
    code = main([
        "diff",
        "--old", str(old_p),
        "--new", str(bogus),
        "--out", str(tmp_path / "DIFF.md"),
    ])
    assert code == EXIT_HARD_FAILURE


def test_threshold_constant_is_half():
    # The 0.5 floor is part of the documented identity semantics.
    assert DIFF_MATCH_THRESHOLD == 0.5


def test_v1_flat_instance_format_matches_v2_nested():
    """v1 artifacts keep file/function flat on the instance (no
    'location' nesting) — the typical --old in a first-ever diff."""
    v1_entry = {
        "id": "gloss-001",
        "name": "fetch",
        "extractable": False,
        "verification_status": "verified",
        "instances": [
            {"instance_type": "function", "file": f, "line": line, "function": fn}
            for f, fn, line in PAIR
        ],
    }
    old = _doc([v1_entry])
    new = _doc([_entry("gloss-007", "fetch", PAIR)])  # v2 nested format
    result = diff_glossaries(old, new)
    assert result.matched_count == 1
    assert not result.has_drift()
