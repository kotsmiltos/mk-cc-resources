"""Tests for dry_refactor.detect_test_command — repo-signal test-command table."""

from __future__ import annotations

import json
from pathlib import Path

from code_glossary.dry_refactor.detect_test_command import detect_test_command


def test_pyproject_with_pytest_dep(tmp_path: Path):
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "x"\nversion = "0"\n'
        '[dependency-groups]\ndev = ["pytest>=8.0"]\n',
        encoding="utf-8",
    )
    result = detect_test_command(tmp_path)
    assert result.command == "pytest"
    assert result.signal == "pyproject.toml"


def test_pyproject_without_pytest_falls_through(tmp_path: Path):
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "x"\nversion = "0"\ndependencies = ["pyyaml"]\n',
        encoding="utf-8",
    )
    assert detect_test_command(tmp_path).command is None


def test_package_json_with_test_script(tmp_path: Path):
    (tmp_path / "package.json").write_text(
        json.dumps({"name": "x", "scripts": {"test": "node --test"}}),
        encoding="utf-8",
    )
    result = detect_test_command(tmp_path)
    assert result.command == "npm test"
    assert result.signal == "package.json"


def test_package_json_without_test_script_falls_through(tmp_path: Path):
    (tmp_path / "package.json").write_text(json.dumps({"name": "x"}), encoding="utf-8")
    assert detect_test_command(tmp_path).command is None


def test_csproj_anywhere(tmp_path: Path):
    nested = tmp_path / "src" / "App"
    nested.mkdir(parents=True)
    (nested / "App.csproj").write_text("<Project/>", encoding="utf-8")
    result = detect_test_command(tmp_path)
    assert result.command == "dotnet test"
    assert result.signal == "*.csproj"


def test_cargo_toml(tmp_path: Path):
    (tmp_path / "Cargo.toml").write_text('[package]\nname = "x"\n', encoding="utf-8")
    assert detect_test_command(tmp_path).command == "cargo test"


def test_go_mod(tmp_path: Path):
    (tmp_path / "go.mod").write_text("module x\n", encoding="utf-8")
    assert detect_test_command(tmp_path).command == "go test ./..."


def test_nothing_detected(tmp_path: Path):
    result = detect_test_command(tmp_path)
    assert result.command is None
    assert result.signal == "none"


def test_priority_pyproject_beats_package_json(tmp_path: Path):
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "x"\nversion = "0"\ndependencies = ["pytest"]\n',
        encoding="utf-8",
    )
    (tmp_path / "package.json").write_text(
        json.dumps({"scripts": {"test": "jest"}}), encoding="utf-8"
    )
    assert detect_test_command(tmp_path).command == "pytest"
