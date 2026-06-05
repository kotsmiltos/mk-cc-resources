"""Tests for dry_refactor.preflight — the 7 Appendix-A gates.

Gate severity is the contract: substrate/verification/confidence
failures BLOCK; git-dirty/gitignore WARN; baseline-tests and missing
target module ASK. Overrides downgrade their gate to warn, never to
silent pass."""

from __future__ import annotations

from pathlib import Path

from code_glossary.dry_refactor.loader import RefactorConfig
from code_glossary.dry_refactor.preflight import (
    STATUS_ASK,
    STATUS_FAIL,
    STATUS_PASS,
    STATUS_WARN,
    VERDICT_BLOCKED,
    VERDICT_NEEDS_USER,
    run_preflight,
)
from tests.dr_fixtures import make_entry, make_project


def _gate(report, gate_id: int):
    return next(g for g in report.gates if g.gate_id == gate_id)


def _run(root: Path, entry=None, config=None, **overrides):
    return run_preflight(root, entry or make_entry(), config or RefactorConfig(), **overrides)


def test_all_seven_gates_present(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(root)
    assert [g.gate_id for g in report.gates] == [1, 2, 3, 4, 5, 6, 7]


def test_gate1_is_always_ask_in_mvp(tmp_path: Path):
    # No repo signal in the fixture -> ask for explicit config.
    root = make_project(tmp_path)
    report = _run(root)
    gate = _gate(report, 1)
    assert gate.status == STATUS_ASK
    assert "refactor.test_command" in gate.detail

    # With a detectable signal -> ask names the command, engine still
    # refuses to execute it itself.
    (root / "go.mod").write_text("module x\n", encoding="utf-8")
    gate = _gate(_run(root), 1)
    assert gate.status == STATUS_ASK
    assert "go test ./..." in gate.detail
    assert "does not execute" in gate.detail


def test_gate1_uses_configured_command(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(root, config=RefactorConfig(test_command="pytest tests/"))
    assert "pytest tests/" in _gate(report, 1).detail


def test_gate2_warns_outside_git_repo(tmp_path: Path):
    root = make_project(tmp_path)  # tmp dir — not a git repo
    report = _run(root)
    gate = _gate(report, 2)
    assert gate.status == STATUS_WARN


def test_gate3_asks_when_target_module_missing(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(root)  # shared/helpers.py does not exist in the fixture
    gate = _gate(report, 3)
    assert gate.status == STATUS_ASK
    assert "shared/helpers.py" in gate.detail


def test_gate3_passes_when_target_module_exists(tmp_path: Path):
    root = make_project(tmp_path)
    target = root / "shared" / "helpers.py"
    target.parent.mkdir(parents=True)
    target.write_text("# helpers\n", encoding="utf-8")
    report = _run(root)
    assert _gate(report, 3).status == STATUS_PASS


def test_gate4_blocks_unverified(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(root, entry=make_entry(verification="inconclusive"))
    assert _gate(report, 4).status == STATUS_FAIL
    assert report.verdict == VERDICT_BLOCKED


def test_gate4_override_downgrades_to_warn(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(
        root, entry=make_entry(verification="inconclusive"), override_unverified=True
    )
    gate = _gate(report, 4)
    assert gate.status == STATUS_WARN
    assert "--override-unverified" in gate.detail


def test_gate4_any_config_accepts_unverified(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(
        root,
        entry=make_entry(verification="inconclusive"),
        config=RefactorConfig(require_verification_status="any"),
    )
    assert _gate(report, 4).status == STATUS_PASS


def test_gate5_blocks_below_confidence_floor(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(root, entry=make_entry(confidence="medium"))
    assert _gate(report, 5).status == STATUS_FAIL


def test_gate5_override_downgrades_to_warn(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(
        root, entry=make_entry(confidence="medium"), override_low_confidence=True
    )
    assert _gate(report, 5).status == STATUS_WARN


def test_gate5_config_floor_medium_passes(tmp_path: Path):
    root = make_project(tmp_path)
    report = _run(
        root,
        entry=make_entry(confidence="medium"),
        config=RefactorConfig(min_confidence="medium"),
    )
    assert _gate(report, 5).status == STATUS_PASS


def test_gate6_passes_on_crlf_disk(tmp_path: Path):
    root = make_project(tmp_path, crlf=True)
    report = _run(root)
    gate = _gate(report, 6)
    assert gate.status == STATUS_PASS, gate.detail


def test_gate6_blocks_on_stale_excerpt(tmp_path: Path):
    root = make_project(tmp_path)
    entry = make_entry()
    entry["instances"][0]["body_excerpt"] = "def fetch_user(uid):\n    return cache[uid]"
    report = _run(root, entry=entry)
    gate = _gate(report, 6)
    assert gate.status == STATUS_FAIL
    assert "stale" in gate.detail
    assert report.verdict == VERDICT_BLOCKED


def test_clean_fixture_needs_user_not_blocked(tmp_path: Path):
    # Healthy fixture: gate 1 asks (MVP), gate 2 warns (no git), gate 3
    # asks (module missing) — verdict needs-user, never blocked.
    root = make_project(tmp_path)
    report = _run(root)
    assert report.verdict == VERDICT_NEEDS_USER
