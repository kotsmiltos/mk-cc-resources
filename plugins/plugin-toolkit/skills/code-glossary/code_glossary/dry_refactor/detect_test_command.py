"""Test-command auto-detection by repo signal (DESIGN-V2.md Appendix A).

Detection order is the Appendix-A table order — first signal wins:
    pyproject.toml with pytest among dependencies  -> pytest
    package.json with a test script               -> npm test
    *.csproj anywhere                             -> dotnet test
    Cargo.toml                                    -> cargo test
    go.mod                                        -> go test ./...
    nothing                                       -> None (user must set)
"""

from __future__ import annotations

import json
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class DetectResult:
    command: Optional[str]  # None = nothing detected; user must configure
    signal: str  # which repo file decided (or 'none')


def detect_test_command(root: Path | str) -> DetectResult:
    root = Path(root)

    pyproject = root / "pyproject.toml"
    if pyproject.is_file() and _pyproject_mentions_pytest(pyproject):
        return DetectResult("pytest", "pyproject.toml")

    package_json = root / "package.json"
    if package_json.is_file() and _package_json_has_test_script(package_json):
        return DetectResult("npm test", "package.json")

    if next(root.rglob("*.csproj"), None) is not None:
        return DetectResult("dotnet test", "*.csproj")

    if (root / "Cargo.toml").is_file():
        return DetectResult("cargo test", "Cargo.toml")

    if (root / "go.mod").is_file():
        return DetectResult("go test ./...", "go.mod")

    return DetectResult(None, "none")


def _pyproject_mentions_pytest(path: Path) -> bool:
    """pytest anywhere in declared dependencies (deps, optional groups,
    dependency-groups, or tool tables). Parse failure falls back to a
    plain-text scan rather than silently answering no."""
    try:
        doc = tomllib.loads(path.read_text(encoding="utf-8"))
    except (tomllib.TOMLDecodeError, OSError, UnicodeDecodeError):
        try:
            return "pytest" in path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return False

    def deps_iter(value):
        if isinstance(value, list):
            yield from (str(v) for v in value)
        elif isinstance(value, dict):
            for sub in value.values():
                yield from deps_iter(sub)

    project = doc.get("project") or {}
    pools = [
        project.get("dependencies"),
        project.get("optional-dependencies"),
        doc.get("dependency-groups"),
        doc.get("tool"),
    ]
    return any(
        "pytest" in dep for pool in pools if pool is not None for dep in deps_iter(pool)
    )


def _package_json_has_test_script(path: Path) -> bool:
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return False
    scripts = doc.get("scripts") or {}
    return isinstance(scripts, dict) and bool(scripts.get("test"))
