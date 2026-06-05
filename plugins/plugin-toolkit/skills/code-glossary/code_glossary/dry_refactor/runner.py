"""dry-refactor stage runner — the Bash surface the dry-refactor SKILL drives.

    python -m code_glossary.dry_refactor.runner preflight \
        --glossary glossary/GLOSSARY.yaml --gloss-id gloss-001 --root . \
        [--config glossary/config.yaml] [--override-unverified] \
        [--override-low-confidence]
    python -m code_glossary.dry_refactor.runner substrate \
        --glossary glossary/GLOSSARY.yaml --gloss-id gloss-001 --root .
    python -m code_glossary.dry_refactor.runner detect-test --root .

Summaries print as `key: value` lines (same convention as the main
glossary runner). Exit codes: 0 ok / user-gates-only; 1 preflight
blocked (a fail gate); 2 hard failure (missing/invalid inputs).

MVP guarantee: every subcommand is read-only on the target project —
this module contains no code path that writes to source files.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from code_glossary.dry_refactor.detect_test_command import detect_test_command
from code_glossary.dry_refactor.loader import (
    ClusterSelectError,
    GlossaryLoadError,
    load_glossary,
    load_refactor_config,
    select_cluster,
)
from code_glossary.dry_refactor.preflight import VERDICT_BLOCKED, run_preflight
from code_glossary.dry_refactor.substrate import verify_cluster

EXIT_OK = 0
EXIT_BLOCKED = 1
EXIT_HARD_FAILURE = 2


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (GlossaryLoadError, ClusterSelectError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return EXIT_HARD_FAILURE


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m code_glossary.dry_refactor.runner",
        description="Deterministic /dry-refactor checks (MVP: read-only).",
    )
    sub = parser.add_subparsers(required=True)

    p_pre = sub.add_parser("preflight", help="evaluate the 7 Appendix-A gates")
    p_pre.add_argument("--glossary", required=True)
    p_pre.add_argument("--gloss-id", required=True)
    p_pre.add_argument("--root", required=True, help="target project root")
    p_pre.add_argument("--config", help="glossary/config.yaml with refactor: block")
    p_pre.add_argument("--override-unverified", action="store_true")
    p_pre.add_argument("--override-low-confidence", action="store_true")
    p_pre.set_defaults(func=_cmd_preflight)

    p_sub = sub.add_parser(
        "substrate", help="body_excerpt vs disk for one cluster (Pass-C rule)"
    )
    p_sub.add_argument("--glossary", required=True)
    p_sub.add_argument("--gloss-id", required=True)
    p_sub.add_argument("--root", required=True)
    p_sub.set_defaults(func=_cmd_substrate)

    p_det = sub.add_parser("detect-test", help="auto-detect the test command")
    p_det.add_argument("--root", required=True)
    p_det.set_defaults(func=_cmd_detect_test)

    return parser


def _require_root(args: argparse.Namespace) -> Path | None:
    root = Path(args.root)
    if not root.is_dir():
        print(f"error: --root is not a directory: {root}", file=sys.stderr)
        return None
    return root


def _cmd_preflight(args: argparse.Namespace) -> int:
    root = _require_root(args)
    if root is None:
        return EXIT_HARD_FAILURE
    doc = load_glossary(args.glossary)
    entry = select_cluster(doc, args.gloss_id)
    config = load_refactor_config(args.config)

    report = run_preflight(
        root,
        entry,
        config,
        override_unverified=args.override_unverified,
        override_low_confidence=args.override_low_confidence,
    )
    print(f"gloss_id: {args.gloss_id}")
    print(f"entry_name: {entry.get('name')}")
    print(f"instances: {len(entry.get('instances') or [])}")
    for gate in report.gates:
        print(f"gate_{gate.gate_id}_{gate.name}: {gate.status}")
        print(f"gate_{gate.gate_id}_{gate.name}_detail: {gate.detail}")
    print(f"verdict: {report.verdict}")
    if report.verdict == VERDICT_BLOCKED:
        return EXIT_BLOCKED
    return EXIT_OK


def _cmd_substrate(args: argparse.Namespace) -> int:
    root = _require_root(args)
    if root is None:
        return EXIT_HARD_FAILURE
    doc = load_glossary(args.glossary)
    entry = select_cluster(doc, args.gloss_id)

    results = verify_cluster(root, entry)
    for r in results:
        print(
            f"instance: {r.file}:{r.recorded_line} | matched: "
            f"{str(r.matched).lower()} | found_line: {r.found_line} | {r.reason}"
        )
    matched = sum(1 for r in results if r.matched)
    print(f"instances_total: {len(results)}")
    print(f"instances_matched: {matched}")
    print(f"instances_stale: {len(results) - matched}")
    print(f"substrate_ok: {str(matched == len(results) and bool(results)).lower()}")
    return EXIT_OK


def _cmd_detect_test(args: argparse.Namespace) -> int:
    root = _require_root(args)
    if root is None:
        return EXIT_HARD_FAILURE
    result = detect_test_command(root)
    print(f"test_command: {result.command or 'none'}")
    print(f"signal: {result.signal}")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
