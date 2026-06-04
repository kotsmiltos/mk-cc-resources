"""YAML round-trip for pipeline artifacts.

The SKILL.md layer drives the engine as separate Bash invocations and
dispatches sub-agents between stages (labeling, Pass B review). Every
stage boundary is therefore a file on disk:

    records.yaml       Stage 1 out / labeler in (labels empty)
    labels.yaml        labeler agents' merged returns
    records.yaml       (rewritten with labels applied)
    fingerprints.yaml  Stage 2 out
    clusters.yaml      Stage 3 (Pass A) out
    enrichments.yaml   Pass B agents' merged returns (consumed by render)

Formats are plain YAML mappings mirroring the dataclasses in records.py.
Loaders are strict: unknown record fields fail loudly (a typo'd field in
an agent return must never silently vanish).
"""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any

import yaml

from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    SignalFingerprint,
    SourceLocation,
)


class ArtifactError(ValueError):
    """A pipeline artifact file is malformed. Message says where and why."""


# --- records ---


def dump_records(records: list[FunctionRecord], path: Path | str) -> None:
    payload = {"records": [asdict(r) for r in records]}
    _write_yaml(payload, path)


def load_records(path: Path | str) -> list[FunctionRecord]:
    doc = _read_yaml(path)
    raw_records = _require_list(doc, "records", path)
    out: list[FunctionRecord] = []
    for i, raw in enumerate(raw_records):
        if not isinstance(raw, dict):
            raise ArtifactError(f"{path}: records[{i}] must be a mapping")
        loc_raw = raw.get("location")
        if not isinstance(loc_raw, dict):
            raise ArtifactError(f"{path}: records[{i}].location must be a mapping")
        try:
            location = SourceLocation(**loc_raw)
            rec = FunctionRecord(**{**raw, "location": location})
        except TypeError as exc:  # unknown/missing field — surface, never drop
            raise ArtifactError(f"{path}: records[{i}]: {exc}") from exc
        out.append(rec)
    return out


# --- labels (labeler agent returns) ---
#
# labels.yaml shape:
#     labels:
#       - id: fn-1a2b3c4d
#         functionality_label: fetch-user-from-api
#         description: One sentence.


def load_labels(path: Path | str) -> list[dict[str, str]]:
    doc = _read_yaml(path)
    raw_labels = _require_list(doc, "labels", path)
    out: list[dict[str, str]] = []
    for i, raw in enumerate(raw_labels):
        if not isinstance(raw, dict):
            raise ArtifactError(f"{path}: labels[{i}] must be a mapping")
        for key in ("id", "functionality_label"):
            if not isinstance(raw.get(key), str) or not raw[key].strip():
                raise ArtifactError(f"{path}: labels[{i}].{key} missing or empty")
        out.append(
            {
                "id": raw["id"],
                "functionality_label": raw["functionality_label"].strip(),
                "description": str(raw.get("description", "")).strip(),
            }
        )
    return out


def apply_labels(
    records: list[FunctionRecord],
    labels: list[dict[str, str]],
) -> tuple[int, list[str]]:
    """Merge labeler returns into records in place.

    Returns:
        (applied_count, unknown_ids) — label entries whose id matches no
        record are returned, not raised: the caller reports them (an agent
        inventing record IDs is drift worth surfacing, not a crash).
    """
    by_id = {r.id: r for r in records}
    applied = 0
    unknown: list[str] = []
    for lab in labels:
        rec = by_id.get(lab["id"])
        if rec is None:
            unknown.append(lab["id"])
            continue
        rec.functionality_label = lab["functionality_label"]
        if lab["description"]:
            rec.description = lab["description"]
        applied += 1
    return applied, unknown


# --- fingerprints ---


def dump_fingerprints(fps: dict[str, SignalFingerprint], path: Path | str) -> None:
    payload = {
        "fingerprints": [
            {
                "record_id": fp.record_id,
                # JSON/YAML have no frozenset/tuple — store sorted lists.
                "lexical_tokens": sorted(fp.lexical_tokens),
                "label_tokens": list(fp.label_tokens),
                "structural_hash": fp.structural_hash,
                "signature_hash": fp.signature_hash,
                "behavioral_statement": fp.behavioral_statement,
                "is_composite": fp.is_composite,
                "composed_of_candidates": list(fp.composed_of_candidates),
            }
            for fp in fps.values()
        ]
    }
    _write_yaml(payload, path)


def load_fingerprints(path: Path | str) -> dict[str, SignalFingerprint]:
    doc = _read_yaml(path)
    raw_fps = _require_list(doc, "fingerprints", path)
    out: dict[str, SignalFingerprint] = {}
    for i, raw in enumerate(raw_fps):
        if not isinstance(raw, dict):
            raise ArtifactError(f"{path}: fingerprints[{i}] must be a mapping")
        try:
            fp = SignalFingerprint(
                record_id=raw["record_id"],
                lexical_tokens=frozenset(raw.get("lexical_tokens", [])),
                label_tokens=tuple(raw.get("label_tokens", [])),
                structural_hash=raw.get("structural_hash"),
                signature_hash=raw.get("signature_hash"),
                behavioral_statement=raw.get("behavioral_statement"),
                is_composite=bool(raw.get("is_composite", False)),
                composed_of_candidates=list(raw.get("composed_of_candidates", [])),
            )
        except KeyError as exc:
            raise ArtifactError(f"{path}: fingerprints[{i}]: missing {exc}") from exc
        out[fp.record_id] = fp
    return out


# --- clusters ---


def dump_clusters(clusters: list[CandidateCluster], path: Path | str) -> None:
    payload = {"clusters": [asdict(c) for c in clusters]}
    _write_yaml(payload, path)


def load_clusters(path: Path | str) -> list[CandidateCluster]:
    doc = _read_yaml(path)
    raw_clusters = _require_list(doc, "clusters", path)
    out: list[CandidateCluster] = []
    for i, raw in enumerate(raw_clusters):
        if not isinstance(raw, dict):
            raise ArtifactError(f"{path}: clusters[{i}] must be a mapping")
        try:
            out.append(CandidateCluster(**raw))
        except TypeError as exc:
            raise ArtifactError(f"{path}: clusters[{i}]: {exc}") from exc
    return out


# --- enrichments (Pass B agent returns) ---
#
# enrichments.yaml shape (one entry per reviewed cluster):
#     enrichments:
#       - cluster_id: cluster-001
#         name: register-build-factory
#         description: One sentence.
#         kind: leaf                       # optional, default leaf
#         extractable: true
#         canonical_signature: "RegisterFactory(buildId: BuildId, create: Func)"
#         proposed_module: Assets/Scripts/Shared/FactoryRegistration.cs
#         invariant_skeleton: |
#           try { BuildFactory.Register({build_id}, {create}); } catch ...
#         variant_axis:
#           - parameter: build_id
#             instance_values: [AStarReynolds, Aggregate]
#             inferred_type: BuildId
#         variant_values:                  # optional, per record id
#           fn-1a2b3c4d: { build_id: AStarReynolds }
#         behavioral_statement: ...        # optional
#         split: []                        # optional: reviewer split decision
#         notes: ...


def load_enrichments(path: Path | str) -> dict[str, dict[str, Any]]:
    """Load Pass B returns keyed by cluster_id. Structure-validated only —
    semantic gating (which fields promote extractable) happens in
    entry_builder so the rule lives next to the schema requirements."""
    doc = _read_yaml(path)
    raw_list = _require_list(doc, "enrichments", path)
    out: dict[str, dict[str, Any]] = {}
    for i, raw in enumerate(raw_list):
        if not isinstance(raw, dict):
            raise ArtifactError(f"{path}: enrichments[{i}] must be a mapping")
        cluster_id = raw.get("cluster_id")
        if not isinstance(cluster_id, str) or not cluster_id.strip():
            raise ArtifactError(f"{path}: enrichments[{i}].cluster_id missing or empty")
        if cluster_id in out:
            raise ArtifactError(f"{path}: duplicate enrichment for {cluster_id}")
        out[cluster_id] = raw
    return out


# --- shared ---


def _write_yaml(payload: dict[str, Any], path: Path | str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    text = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True, width=4096)
    p.write_text(text, encoding="utf-8")


def _read_yaml(path: Path | str) -> dict[str, Any]:
    p = Path(path)
    try:
        text = p.read_text(encoding="utf-8")
    except OSError as exc:
        raise ArtifactError(f"cannot read artifact {p}: {exc}") from exc
    try:
        doc = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise ArtifactError(f"{p}: invalid YAML: {exc}") from exc
    if not isinstance(doc, dict):
        raise ArtifactError(f"{p}: top level must be a mapping")
    return doc


def _require_list(doc: dict[str, Any], key: str, path: Path | str) -> list[Any]:
    value = doc.get(key)
    if not isinstance(value, list):
        raise ArtifactError(f"{path}: top-level {key!r} list missing")
    return value
