"""The 7 Appendix-A pre-flight gates as a structured report.

Gate semantics (DESIGN-V2.md Appendix A "Pre-flight checks"):

    id  gate                check                              on fail
    1   baseline-tests      suite green before any mutation    hard stop
    2   git-clean           working tree clean                 warn (stash/abort offer)
    3   target-module       proposed_module exists             ask (user OK to create)
    4   verification        verification_status == verified    refuse unless override
    5   confidence          confidence >= configured min       refuse unless override
    6   substrate           all body_excerpts match disk       refuse (stale glossary)
    7   gitignore           instance files tracked             warn

The engine evaluates everything it can deterministically. Gate 1 is the
exception in the MVP: the engine never executes test suites itself
(arbitrary command execution belongs to the SKILL layer where the user
sees it), so gate 1 reports the detected test command with status
'ask' — the SKILL layer runs it and relays the verdict.

Statuses: pass | warn | ask | fail. Verdict: proceed (no fail, no ask),
needs-user (asks/warns only), blocked (any fail).
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from code_glossary.dry_refactor.detect_test_command import detect_test_command
from code_glossary.dry_refactor.loader import RefactorConfig, confidence_at_least
from code_glossary.dry_refactor.substrate import verify_cluster

STATUS_PASS = "pass"
STATUS_WARN = "warn"
STATUS_ASK = "ask"
STATUS_FAIL = "fail"

VERDICT_PROCEED = "proceed"
VERDICT_NEEDS_USER = "needs-user"
VERDICT_BLOCKED = "blocked"

# Subprocess guard for the read-only git queries (status, check-ignore).
_GIT_TIMEOUT_SECONDS = 30


@dataclass
class Gate:
    gate_id: int
    name: str
    status: str
    detail: str


@dataclass
class PreflightReport:
    gates: list[Gate] = field(default_factory=list)

    @property
    def verdict(self) -> str:
        statuses = {g.status for g in self.gates}
        if STATUS_FAIL in statuses:
            return VERDICT_BLOCKED
        if STATUS_ASK in statuses or STATUS_WARN in statuses:
            return VERDICT_NEEDS_USER
        return VERDICT_PROCEED


def run_preflight(
    root: Path | str,
    entry: dict[str, Any],
    config: RefactorConfig,
    override_unverified: bool = False,
    override_low_confidence: bool = False,
) -> PreflightReport:
    """Evaluate all 7 gates for one glossary entry. Mutates nothing."""
    root = Path(root)
    report = PreflightReport()
    report.gates.append(_gate_1_baseline_tests(root, config))
    report.gates.append(_gate_2_git_clean(root))
    report.gates.append(_gate_3_target_module(root, entry))
    report.gates.append(_gate_4_verification(entry, config, override_unverified))
    report.gates.append(_gate_5_confidence(entry, config, override_low_confidence))
    report.gates.append(_gate_6_substrate(root, entry))
    report.gates.append(_gate_7_gitignore(root, entry))
    return report


def _gate_1_baseline_tests(root: Path, config: RefactorConfig) -> Gate:
    if config.test_command and config.test_command != "auto":
        return Gate(
            1,
            "baseline-tests",
            STATUS_ASK,
            f"run `{config.test_command}` (from refactor.test_command) and "
            "confirm green before any mutation; the engine does not execute "
            "test suites",
        )
    detected = detect_test_command(root)
    if detected.command is None:
        return Gate(
            1,
            "baseline-tests",
            STATUS_ASK,
            "no test command detected (no pyproject/package.json/csproj/"
            "Cargo.toml/go.mod signal) — set refactor.test_command explicitly",
        )
    return Gate(
        1,
        "baseline-tests",
        STATUS_ASK,
        f"run `{detected.command}` (detected via {detected.signal}) and "
        "confirm green before any mutation; the engine does not execute "
        "test suites",
    )


def _git(root: Path, *argv: str) -> subprocess.CompletedProcess | None:
    try:
        return subprocess.run(
            ["git", *argv],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_SECONDS,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None


def _gate_2_git_clean(root: Path) -> Gate:
    proc = _git(root, "status", "--porcelain")
    if proc is None or proc.returncode != 0:
        return Gate(
            2,
            "git-clean",
            STATUS_WARN,
            "not a git repository (or git unavailable) — refactor edits "
            "would not be diffable/revertable",
        )
    dirty = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    if dirty:
        return Gate(
            2,
            "git-clean",
            STATUS_WARN,
            f"working tree has {len(dirty)} uncommitted change(s) — offer "
            "stash or abort before live execution",
        )
    return Gate(2, "git-clean", STATUS_PASS, "working tree clean")


def _gate_3_target_module(root: Path, entry: dict[str, Any]) -> Gate:
    proposed = entry.get("proposed_module") or ""
    if not proposed:
        return Gate(
            3,
            "target-module",
            STATUS_FAIL,
            "entry has no proposed_module — cannot place a helper",
        )
    target = Path(root) / proposed
    if target.is_file():
        return Gate(3, "target-module", STATUS_PASS, f"exists: {proposed}")
    return Gate(
        3,
        "target-module",
        STATUS_ASK,
        f"target module does not exist: {proposed} — needs explicit user OK "
        "to create (never silent)",
    )


def _gate_4_verification(
    entry: dict[str, Any], config: RefactorConfig, override: bool
) -> Gate:
    status = entry.get("verification_status") or ""
    if config.require_verification_status == "any" or status == "verified":
        return Gate(4, "verification", STATUS_PASS, f"verification_status={status!r}")
    if override:
        return Gate(
            4,
            "verification",
            STATUS_WARN,
            f"verification_status={status!r} accepted via --override-unverified",
        )
    return Gate(
        4,
        "verification",
        STATUS_FAIL,
        f"verification_status={status!r} (need 'verified') — refuse unless "
        "--override-unverified",
    )


def _gate_5_confidence(
    entry: dict[str, Any], config: RefactorConfig, override: bool
) -> Gate:
    actual = entry.get("extractability_confidence") or ""
    if confidence_at_least(actual, config.min_confidence):
        return Gate(5, "confidence", STATUS_PASS, f"confidence={actual!r}")
    if override:
        return Gate(
            5,
            "confidence",
            STATUS_WARN,
            f"confidence={actual!r} below floor {config.min_confidence!r}, "
            "accepted via --override-low-confidence",
        )
    return Gate(
        5,
        "confidence",
        STATUS_FAIL,
        f"confidence={actual!r} below configured floor "
        f"{config.min_confidence!r} — refuse unless --override-low-confidence",
    )


def _gate_6_substrate(root: Path, entry: dict[str, Any]) -> Gate:
    results = verify_cluster(root, entry)
    if not results:
        return Gate(6, "substrate", STATUS_FAIL, "entry has no instances to verify")
    stale = [r for r in results if not r.matched]
    if stale:
        sites = "; ".join(f"{r.file}:{r.recorded_line} ({r.reason})" for r in stale[:5])
        return Gate(
            6,
            "substrate",
            STATUS_FAIL,
            f"{len(stale)}/{len(results)} instance(s) no longer match disk — "
            f"glossary is stale, re-run /code-glossary first. Stale: {sites}",
        )
    return Gate(
        6, "substrate", STATUS_PASS, f"all {len(results)} instance(s) match disk"
    )


def _gate_7_gitignore(root: Path, entry: dict[str, Any]) -> Gate:
    from code_glossary.dry_refactor.substrate import _instance_location

    files = sorted(
        {
            _instance_location(inst)[0]
            for inst in entry.get("instances") or []
            if _instance_location(inst)[0]
        }
    )
    if not files:
        return Gate(7, "gitignore", STATUS_WARN, "entry has no instance files")
    proc = _git(root, "check-ignore", *files)
    if proc is None:
        return Gate(
            7,
            "gitignore",
            STATUS_WARN,
            "git unavailable — cannot check whether instance files are tracked",
        )
    # check-ignore exits 0 with matches on stdout, 1 with no matches.
    ignored = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
    if ignored:
        return Gate(
            7,
            "gitignore",
            STATUS_WARN,
            f"{len(ignored)} instance file(s) are gitignored (untracked edits): "
            + ", ".join(ignored[:5]),
        )
    return Gate(7, "gitignore", STATUS_PASS, "no instance file is gitignored")
