"""Tests for dry_refactor.substrate — the Pass-C compare rule.

CRITICAL fixture: CRLF on disk vs LF in the excerpt MUST match (lock
row 26 — raw comparison false-drifted 92 instances in the v2
acceptance run)."""

from __future__ import annotations

from pathlib import Path

from code_glossary.dry_refactor.substrate import (
    LINE_TOLERANCE,
    verify_cluster,
    verify_instance,
)
from tests.dr_fixtures import SITE_A_BODY, make_entry, make_project


def _instance(file: str, line: int, excerpt: str) -> dict:
    return {
        "location": {"file": file, "line": line, "function": "f"},
        "body_excerpt": excerpt,
    }


def test_lf_disk_lf_excerpt_matches(tmp_path: Path):
    root = make_project(tmp_path, crlf=False)
    result = verify_instance(root, _instance("a.py", 3, SITE_A_BODY))
    assert result.matched
    assert result.found_line == 3


def test_crlf_disk_lf_excerpt_matches(tmp_path: Path):
    """THE critical case: Windows checkout, LF-captured glossary."""
    root = make_project(tmp_path, crlf=True)
    result = verify_instance(root, _instance("a.py", 3, SITE_A_BODY))
    assert result.matched, f"CRLF disk vs LF excerpt must match: {result.reason}"
    assert result.found_line == 3


def test_line_drift_within_tolerance_matches(tmp_path: Path):
    root = make_project(tmp_path)
    drifted_line = 3 + LINE_TOLERANCE  # still inside the window
    result = verify_instance(root, _instance("a.py", drifted_line, SITE_A_BODY))
    assert result.matched
    assert result.found_line == 3


def test_line_drift_beyond_tolerance_fails(tmp_path: Path):
    root = make_project(tmp_path)
    result = verify_instance(root, _instance("a.py", 3 + LINE_TOLERANCE + 1, SITE_A_BODY))
    assert not result.matched
    assert "beyond" in result.reason
    assert result.found_line == 3  # still reported, for the human


def test_excerpt_not_in_file_fails(tmp_path: Path):
    root = make_project(tmp_path)
    result = verify_instance(root, _instance("a.py", 3, "def totally_other():\n    pass"))
    assert not result.matched
    assert "not found" in result.reason


def test_missing_file_fails(tmp_path: Path):
    root = make_project(tmp_path)
    result = verify_instance(root, _instance("ghost.py", 1, SITE_A_BODY))
    assert not result.matched
    assert "not on disk" in result.reason


def test_reindented_excerpt_matches_via_stripped_compare(tmp_path: Path):
    root = make_project(tmp_path)
    indented = "\n".join("    " + ln for ln in SITE_A_BODY.split("\n"))
    result = verify_instance(root, _instance("a.py", 3, indented))
    assert result.matched, result.reason


def test_verify_cluster_all_instances(tmp_path: Path):
    root = make_project(tmp_path, crlf=True)
    results = verify_cluster(root, make_entry())
    assert len(results) == 2
    assert all(r.matched for r in results)


def test_flat_v1_instance_location_accepted(tmp_path: Path):
    root = make_project(tmp_path)
    flat = {"file": "a.py", "line": 3, "body_excerpt": SITE_A_BODY}
    result = verify_instance(root, flat)
    assert result.matched
