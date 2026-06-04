"""Stage runner — the Bash surface the SKILL.md layer drives.

Each subcommand runs one deterministic pipeline stage, reading and
writing the YAML artifacts defined in io_yaml.py. The LLM steps
(labeling, Pass B review, Pass C spot-check) happen BETWEEN these
invocations, in the SKILL.md layer via Agent-tool dispatches — never
inside the engine (DESIGN-V2.md lock row 15: no external LLMs, engine
is deterministic).

    python -m code_glossary.runner index --root SRC --out work/records.yaml
    python -m code_glossary.runner apply-labels --records work/records.yaml \
        --labels work/labels.yaml
    python -m code_glossary.runner signal --records work/records.yaml \
        --out work/fingerprints.yaml
    python -m code_glossary.runner cluster --records work/records.yaml \
        --fingerprints work/fingerprints.yaml --out work/clusters.yaml
    python -m code_glossary.runner slices --records work/records.yaml \
        --clusters work/clusters.yaml --out-dir work/slices
    python -m code_glossary.runner render --records work/records.yaml \
        --fingerprints work/fingerprints.yaml --clusters work/clusters.yaml \
        [--enrichments work/enrichments.yaml] --out-dir glossary

Exit codes: 0 ok; 2 hard failure (zero records, malformed artifact) —
per DESIGN-V2.md §10 the pipeline never continues silently.

Summaries print to stdout as single `key: value` lines so the SKILL
layer (and the user reading the transcript) can parse outcomes without
guessing.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from code_glossary import io_yaml
from code_glossary.cluster.orchestrator import cluster_records
from code_glossary.indexer.orchestrator import index_directory_with_report
from code_glossary.indexer.spec_parser import index_sprint_specs
from code_glossary.render.orchestrator import render_glossary
from code_glossary.signals.orchestrator import extract_signals
from code_glossary.signals.spec_signals import extract_spec_signals
from code_glossary.vocab import UNCLEAR_VERB, load_vocab, normalize_label

EXIT_OK = 0
EXIT_HARD_FAILURE = 2

# Slice files give each Pass B sub-agent exactly its cluster's records —
# member bodies included — without shipping the whole records.yaml.
SLICE_FILENAME_TEMPLATE = "{cluster_id}.yaml"


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except io_yaml.ArtifactError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return EXIT_HARD_FAILURE


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m code_glossary.runner",
        description="Run one deterministic stage of the code-glossary pipeline.",
    )
    sub = parser.add_subparsers(required=True)

    p_index = sub.add_parser("index", help="Stage 1: walk + parse source tree")
    p_index.add_argument("--root", required=True)
    p_index.add_argument("--out", required=True)
    p_index.add_argument("--exclude", action="append", default=[])
    p_index.add_argument("--include-tests", action="store_true")
    p_index.set_defaults(func=_cmd_index)

    p_specs = sub.add_parser(
        "index-specs",
        help="Stage 1 (spec mode): parse architect task specs into spec_records",
    )
    p_specs.add_argument("--root", required=True, help="sprints dir or one sprint dir")
    p_specs.add_argument("--out", required=True)
    p_specs.set_defaults(func=_cmd_index_specs)

    p_labels = sub.add_parser(
        "apply-labels", help="Merge labeler-agent returns into records.yaml"
    )
    p_labels.add_argument("--records", required=True)
    p_labels.add_argument("--labels", required=True)
    p_labels.add_argument(
        "--out", help="output records path (default: overwrite --records)"
    )
    p_labels.add_argument("--mode", choices=("code", "spec"), default="code")
    p_labels.set_defaults(func=_cmd_apply_labels)

    p_signal = sub.add_parser("signal", help="Stage 2: compute signal fingerprints")
    p_signal.add_argument("--records", required=True)
    p_signal.add_argument("--out", required=True)
    p_signal.add_argument("--mode", choices=("code", "spec"), default="code")
    p_signal.set_defaults(func=_cmd_signal)

    p_cluster = sub.add_parser("cluster", help="Stage 3 Pass A: deterministic clustering")
    p_cluster.add_argument("--records", required=True)
    p_cluster.add_argument("--fingerprints", required=True)
    p_cluster.add_argument("--out", required=True)
    p_cluster.add_argument("--mode", choices=("code", "spec"), default="code")
    p_cluster.set_defaults(func=_cmd_cluster)

    p_slices = sub.add_parser(
        "slices", help="Write one YAML slice per multi-instance cluster (Pass B input)"
    )
    p_slices.add_argument("--records", required=True)
    p_slices.add_argument("--clusters", required=True)
    p_slices.add_argument("--out-dir", required=True)
    p_slices.add_argument(
        "--min-members",
        type=int,
        default=2,
        help="only clusters with at least this many members get a slice (default 2)",
    )
    p_slices.set_defaults(func=_cmd_slices)

    p_render = sub.add_parser("render", help="Stage 4: write GLOSSARY.yaml + GLOSSARY.md")
    p_render.add_argument("--records", required=True)
    p_render.add_argument("--fingerprints", required=True)
    p_render.add_argument("--clusters", required=True)
    p_render.add_argument("--enrichments", help="Pass B/C merged returns (optional)")
    p_render.add_argument("--out-dir", required=True)
    p_render.add_argument("--target-path", default="")
    p_render.add_argument("--scope-path", action="append", default=[])
    p_render.add_argument("--scope-exclude", action="append", default=[])
    p_render.add_argument("--include-tests", action="store_true")
    p_render.set_defaults(func=_cmd_render)

    return parser


# --- subcommand implementations ---


def _cmd_index(args: argparse.Namespace) -> int:
    root = Path(args.root)
    if not root.is_dir():
        print(f"error: index root is not a directory: {root}", file=sys.stderr)
        return EXIT_HARD_FAILURE

    t0 = time.time()
    records, report = index_directory_with_report(
        root, excludes=args.exclude, include_tests=args.include_tests
    )
    if not records:
        # Hard fail per DESIGN-V2.md §10: scope empty, all excluded, or unreadable.
        print(
            "error: zero functions indexed "
            f"(files_seen={report.files_seen}, "
            f"skipped_unsupported={report.files_skipped_unsupported}, "
            f"errors={len(report.errors)})",
            file=sys.stderr,
        )
        return EXIT_HARD_FAILURE

    io_yaml.dump_records(records, args.out)
    print(f"records: {len(records)}")
    print(f"files_seen: {report.files_seen}")
    print(f"files_indexed: {report.files_indexed}")
    print(f"files_skipped_unsupported: {report.files_skipped_unsupported}")
    print(f"languages_indexed: {report.languages_indexed}")
    print(f"languages_skipped: {report.languages_skipped}")
    print(f"errors: {len(report.errors)}")
    for path, message in report.errors:
        print(f"error_detail: {path}: {message}")
    print(f"runtime_seconds: {time.time() - t0:.1f}")
    print(f"out: {args.out}")
    return EXIT_OK


def _cmd_index_specs(args: argparse.Namespace) -> int:
    root = Path(args.root)
    if not root.is_dir():
        print(f"error: spec root is not a directory: {root}", file=sys.stderr)
        return EXIT_HARD_FAILURE
    records, failures = index_sprint_specs(root)
    if not records:
        print(
            f"error: zero task specs indexed under {root} "
            f"(failures={len(failures)})",
            file=sys.stderr,
        )
        for path, reason in failures:
            print(f"failure_detail: {path}: {reason}", file=sys.stderr)
        return EXIT_HARD_FAILURE
    io_yaml.dump_spec_records(records, args.out)
    print(f"spec_records: {len(records)}")
    print(f"failures: {len(failures)}")
    for path, reason in failures:
        print(f"failure_detail: {path}: {reason}")
    print(f"out: {args.out}")
    return EXIT_OK


def _load_by_mode(path: str, mode: str):
    if mode == "spec":
        return io_yaml.load_spec_records(path)
    return io_yaml.load_records(path)


def _dump_by_mode(records, path: str, mode: str) -> None:
    if mode == "spec":
        io_yaml.dump_spec_records(records, path)
    else:
        io_yaml.dump_records(records, path)


def _cmd_apply_labels(args: argparse.Namespace) -> int:
    records = _load_by_mode(args.records, args.mode)
    labels = io_yaml.load_labels(args.labels)
    vocab = load_vocab()

    # Normalize against the controlled vocabulary BEFORE merging, so
    # off-vocabulary verbs surface here, not at cluster time. Invalid
    # labels demote to the UNCLEAR sentinel (visible, never dropped).
    unclear: list[str] = []
    for lab in labels:
        try:
            lab["functionality_label"] = normalize_label(lab["functionality_label"], vocab)
        except ValueError as exc:
            unclear.append(f"{lab['id']}: {exc}")
            lab["functionality_label"] = UNCLEAR_VERB

    applied, unknown = io_yaml.apply_labels(records, labels)
    out_path = args.out or args.records
    _dump_by_mode(records, out_path, args.mode)

    unlabeled = sum(1 for r in records if not r.functionality_label)
    print(f"labels_applied: {applied}")
    print(f"labels_unknown_record_ids: {len(unknown)}")
    for rid in unknown:
        print(f"unknown_record_id: {rid}")
    print(f"labels_normalized_to_unclear: {len(unclear)}")
    for item in unclear:
        print(f"unclear_label: {item}")
    print(f"records_still_unlabeled: {unlabeled}")
    print(f"out: {out_path}")
    return EXIT_OK


def _cmd_signal(args: argparse.Namespace) -> int:
    records = _load_by_mode(args.records, args.mode)
    fps = extract_spec_signals(records) if args.mode == "spec" else extract_signals(records)
    io_yaml.dump_fingerprints(fps, args.out)

    structural = sum(1 for f in fps.values() if f.structural_hash)
    signature = sum(1 for f in fps.values() if f.signature_hash)
    labeled = sum(1 for f in fps.values() if f.label_tokens)
    print(f"fingerprints: {len(fps)}")
    print(f"with_structural_hash: {structural}")
    print(f"with_signature_hash: {signature}")
    print(f"with_label_tokens: {labeled}")
    print(f"out: {args.out}")
    return EXIT_OK


def _cmd_cluster(args: argparse.Namespace) -> int:
    # cluster_records duck-types over both record kinds (uses id,
    # functionality_label, location.file only).
    records = _load_by_mode(args.records, args.mode)
    fps = io_yaml.load_fingerprints(args.fingerprints)
    clusters = cluster_records(records, fps)
    io_yaml.dump_clusters(clusters, args.out)

    multi = [c for c in clusters if len(c.member_record_ids) >= 2]
    high = sum(1 for c in multi if c.extractability_confidence == "high")
    print(f"clusters: {len(clusters)}")
    print(f"multi_instance_clusters: {len(multi)}")
    print(f"high_confidence_clusters: {high}")
    print(f"out: {args.out}")
    return EXIT_OK


def _cmd_slices(args: argparse.Namespace) -> int:
    records = io_yaml.load_records(args.records)
    clusters = io_yaml.load_clusters(args.clusters)
    by_id = {r.id: r for r in records}
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for cluster in clusters:
        members = [by_id[m] for m in cluster.member_record_ids if m in by_id]
        if len(members) < args.min_members:
            continue
        slice_path = out_dir / SLICE_FILENAME_TEMPLATE.format(cluster_id=cluster.id)
        _write_slice(cluster, members, slice_path)
        print(f"slice: {slice_path} members={len(members)}")
        written += 1
    print(f"slices_written: {written}")
    return EXIT_OK


def _write_slice(cluster, members, path: Path) -> None:
    """One Pass B input file: the cluster + its full member records."""
    import yaml

    payload = {
        "cluster": {
            "id": cluster.id,
            "primary_signal": cluster.primary_signal,
            "signal_agreement": cluster.signal_agreement,
            "extractability_score": cluster.extractability_score,
            "extractability_confidence": cluster.extractability_confidence,
            "notes": cluster.notes,
        },
        "members": [
            {
                "id": r.id,
                "file": r.location.file,
                "line": r.location.line,
                "function": r.location.function,
                "language": r.language,
                "signature": r.signature,
                "functionality_label": r.functionality_label,
                "description": r.description,
                "notable_calls": r.notable_calls,
                "notable_inputs": r.notable_inputs,
                "notable_outputs": r.notable_outputs,
                "inline_constants": r.inline_constants,
                "body": r.body,
            }
            for r in members
        ],
    }
    text = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True, width=4096)
    path.write_text(text, encoding="utf-8")


def _cmd_render(args: argparse.Namespace) -> int:
    records = io_yaml.load_records(args.records)
    fps = io_yaml.load_fingerprints(args.fingerprints)
    clusters = io_yaml.load_clusters(args.clusters)
    enrichments = (
        io_yaml.load_enrichments(args.enrichments) if args.enrichments else None
    )

    scope_metadata = {
        "paths": args.scope_path or ["."],
        "excludes": args.scope_exclude,
        "include_tests": args.include_tests,
    }
    yaml_path, md_path = render_glossary(
        records,
        fps,
        clusters,
        scope_metadata,
        args.out_dir,
        target_path=args.target_path,
        enrichments=enrichments,
    )
    # Report from the written artifact (source of truth on disk).
    import yaml as _yaml

    doc = _yaml.safe_load(Path(yaml_path).read_text(encoding="utf-8"))
    totals = doc.get("metadata", {}).get("totals", {})
    print(f"glossary_yaml: {yaml_path}")
    print(f"glossary_md: {md_path}")
    print(f"entries: {len(doc.get('glossary', []))}")
    print(f"totals_extractable: {totals.get('extractable')}")
    print(f"totals_pending_high_confidence: {totals.get('pending_high_confidence')}")
    if enrichments is not None:
        meta_enr = doc.get("metadata", {}).get("enrichments", {})
        print(f"enrichments_applied: {meta_enr.get('applied')}")
        print(f"enrichments_unmatched: {meta_enr.get('unmatched_cluster_ids')}")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
