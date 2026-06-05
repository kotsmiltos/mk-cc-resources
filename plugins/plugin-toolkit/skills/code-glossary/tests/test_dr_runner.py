"""Tests for the dry_refactor CLI runner + the MVP zero-mutation guarantees.

The no-mutation test snapshots the target tree before/after a full
preflight+substrate run; the no-push test asserts the verb is absent
from the whole MVP surface (package + skill + brief)."""

from __future__ import annotations

import re
from pathlib import Path

from code_glossary.dry_refactor.runner import (
    EXIT_BLOCKED,
    EXIT_HARD_FAILURE,
    EXIT_OK,
    main,
)
from tests.dr_fixtures import make_entry, make_project, write_glossary


def _setup(tmp_path: Path, crlf: bool = False, entry=None) -> tuple[Path, Path]:
    root = make_project(tmp_path, crlf=crlf)
    glossary = write_glossary(tmp_path / "GLOSSARY.yaml", [entry or make_entry()])
    return root, glossary


def test_preflight_cli_prints_gates_and_verdict(tmp_path: Path, capsys):
    root, glossary = _setup(tmp_path)
    code = main([
        "preflight",
        "--glossary", str(glossary),
        "--gloss-id", "gloss-001",
        "--root", str(root),
    ])
    out = capsys.readouterr().out
    assert code == EXIT_OK  # asks/warns only -> needs-user, not blocked
    for gate_key in (
        "gate_1_baseline-tests",
        "gate_2_git-clean",
        "gate_3_target-module",
        "gate_4_verification",
        "gate_5_confidence",
        "gate_6_substrate",
        "gate_7_gitignore",
    ):
        assert f"{gate_key}:" in out
    assert "verdict: needs-user" in out


def test_preflight_blocked_exits_1(tmp_path: Path, capsys):
    root, glossary = _setup(tmp_path, entry=make_entry(verification="inconclusive"))
    code = main([
        "preflight",
        "--glossary", str(glossary),
        "--gloss-id", "gloss-001",
        "--root", str(root),
    ])
    out = capsys.readouterr().out
    assert code == EXIT_BLOCKED
    assert "verdict: blocked" in out


def test_preflight_override_flag_unblocks(tmp_path: Path, capsys):
    root, glossary = _setup(tmp_path, entry=make_entry(verification="inconclusive"))
    code = main([
        "preflight",
        "--glossary", str(glossary),
        "--gloss-id", "gloss-001",
        "--root", str(root),
        "--override-unverified",
    ])
    assert code == EXIT_OK


def test_preflight_unknown_gloss_id_hard_fails(tmp_path: Path, capsys):
    root, glossary = _setup(tmp_path)
    code = main([
        "preflight",
        "--glossary", str(glossary),
        "--gloss-id", "gloss-404",
        "--root", str(root),
    ])
    assert code == EXIT_HARD_FAILURE


def test_substrate_cli_reports_crlf_match(tmp_path: Path, capsys):
    root, glossary = _setup(tmp_path, crlf=True)
    code = main([
        "substrate",
        "--glossary", str(glossary),
        "--gloss-id", "gloss-001",
        "--root", str(root),
    ])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert "instances_total: 2" in out
    assert "instances_matched: 2" in out
    assert "substrate_ok: true" in out


def test_detect_test_cli(tmp_path: Path, capsys):
    (tmp_path / "go.mod").write_text("module x\n", encoding="utf-8")
    code = main(["detect-test", "--root", str(tmp_path)])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert "test_command: go test ./..." in out
    assert "signal: go.mod" in out


def test_detect_test_missing_root_hard_fails(tmp_path: Path):
    code = main(["detect-test", "--root", str(tmp_path / "ghost")])
    assert code == EXIT_HARD_FAILURE


def test_mvp_runs_mutate_nothing(tmp_path: Path, capsys):
    """Snapshot the target tree; preflight + substrate + detect-test must
    leave every byte and every path untouched."""
    root, glossary = _setup(tmp_path)

    def snapshot() -> dict[str, bytes]:
        return {
            str(p.relative_to(tmp_path)): p.read_bytes()
            for p in sorted(tmp_path.rglob("*"))
            if p.is_file()
        }

    before = snapshot()
    main(["preflight", "--glossary", str(glossary), "--gloss-id", "gloss-001", "--root", str(root)])
    main(["substrate", "--glossary", str(glossary), "--gloss-id", "gloss-001", "--root", str(root)])
    main(["detect-test", "--root", str(root)])
    capsys.readouterr()
    assert snapshot() == before


def test_no_push_verb_anywhere_in_mvp_surface():
    """The MVP must not even speak of pushing. Asserted over the engine
    sub-package, the dry-refactor SKILL.md, and the helper-writer brief."""
    skill_root = Path(__file__).resolve().parents[1]  # code-glossary skill folder
    surface = [
        *sorted((skill_root / "code_glossary" / "dry_refactor").glob("*.py")),
        skill_root.parent / "dry-refactor" / "SKILL.md",
        skill_root.parent / "dry-refactor" / "briefs" / "helper-writer.md",
    ]
    assert len(surface) >= 7, f"MVP surface incomplete: {[str(p) for p in surface]}"
    pattern = re.compile(r"\bpush(es|ed|ing)?\b", re.IGNORECASE)
    offenders = []
    for path in surface:
        assert path.is_file(), f"missing MVP artifact: {path}"
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if pattern.search(line):
                offenders.append(f"{path.name}:{i}: {line.strip()}")
    assert offenders == [], "push verb found in MVP surface:\n" + "\n".join(offenders)
