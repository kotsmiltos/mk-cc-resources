"""Build GlossaryEntry objects from CandidateCluster + FunctionRecord.

Wave 5 baseline: all entries emit as extractable=false with a notes
field explaining LLM enrichment is still required to promote them.
The SKILL.md layer (wave 7+) dispatches Pass B sub-agents that fill
canonical_signature, proposed_module, invariant_skeleton, variant_axis,
and only then flips extractable=true.

Also emits single-instance entries for records not in any cluster —
they form the 'watchlist' section of the rendered glossary (useful
when a second instance appears in a future run).
"""

from __future__ import annotations

import datetime
from typing import Any, Iterable

from code_glossary.constants import GENERATOR_NAME, GENERATOR_VERSION, SCHEMA_VERSION
from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    Glossary,
    GlossaryEntry,
    Instance,
    SignalFingerprint,
    SourceLocation,
)


# Notes attached to clusters that have not yet been enriched by Pass B LLM.
_PENDING_ENRICHMENT_NOTE = (
    "Deterministic clustering complete; LLM enrichment pending. "
    "Stage 4 Pass B (SKILL.md layer) will add canonical_signature, "
    "proposed_module, invariant_skeleton, and variant_axis. Until then "
    "this cluster is extractable=false."
)

_SINGLE_INSTANCE_NOTE = (
    "Single instance; not duplicated. Tracked as a watchlist entry — "
    "if a second instance appears in a future run, this entry will "
    "promote to extractable=true after Pass B enrichment."
)


def build_glossary(
    records: Iterable[FunctionRecord],
    fingerprints: dict[str, SignalFingerprint],
    clusters: Iterable[CandidateCluster],
    scope_metadata: dict[str, Any],
) -> Glossary:
    """Assemble the final Glossary document.

    Args:
        records: all records from Stage 1
        fingerprints: Stage 2 fingerprints (drives signal_agreement reporting)
        clusters: Stage 3 CandidateClusters (sorted by score descending)
        scope_metadata: scope info — paths, excludes, include_tests; will be
                        merged with auto-generated totals + timestamp

    Returns:
        Schema-conformant Glossary ready for emission.
    """
    record_list = list(records)
    cluster_list = list(clusters)
    record_index = {r.id: r for r in record_list}

    entries: list[GlossaryEntry] = []
    clustered_ids: set[str] = set()

    for i, cluster in enumerate(cluster_list, start=1):
        entry = _build_cluster_entry(
            cluster=cluster,
            members=[record_index[m] for m in cluster.member_record_ids if m in record_index],
            fingerprints=fingerprints,
            counter=i,
        )
        entries.append(entry)
        clustered_ids.update(cluster.member_record_ids)

    # Single-instance entries: records not in any cluster get their own watchlist entry.
    next_counter = len(cluster_list) + 1
    for rec in record_list:
        if rec.id in clustered_ids:
            continue
        entries.append(_build_single_instance_entry(rec, fingerprints, next_counter))
        next_counter += 1

    metadata = _build_metadata(record_list, cluster_list, scope_metadata)
    return Glossary(
        schema_version=SCHEMA_VERSION,
        generator=GENERATOR_NAME,
        generator_version=GENERATOR_VERSION,
        metadata=metadata,
        glossary=entries,
    )


def _build_cluster_entry(
    *,
    cluster: CandidateCluster,
    members: list[FunctionRecord],
    fingerprints: dict[str, SignalFingerprint],
    counter: int,
) -> GlossaryEntry:
    if not members:
        # Cluster had no resolvable members — emit a placeholder so the
        # entry isn't silently dropped (visibility per DESIGN-V2.md §10).
        return GlossaryEntry(
            id=f"gloss-{counter:03d}",
            name=cluster.id,
            description="Cluster with no resolvable member records.",
            kind="leaf",
            extractable=False,
            notes="Members referenced by cluster were not found in record_index.",
            verification_status="inconclusive",
        )

    name = _derive_cluster_name(members)
    description = _derive_cluster_description(cluster, members)
    instances = [_build_instance(rec) for rec in members]

    # signal_agreement as floats for the SignalFingerprint-style field
    signal_agreement_floats: dict[str, float] = {
        signal: (1.0 if agreed else 0.0)
        for signal, agreed in cluster.signal_agreement.items()
    }

    return GlossaryEntry(
        id=f"gloss-{counter:03d}",
        name=name,
        description=description,
        kind="leaf",
        extractable=False,  # promoted by Pass B (wave 7+)
        extractability_score=cluster.extractability_score,
        extractability_confidence=cluster.extractability_confidence,
        canonical_signature=None,  # Pass B fills
        proposed_module=None,  # Pass B fills
        invariant_skeleton=None,  # Pass B fills
        variant_axis=[],  # Pass B fills
        instances=instances,
        related_functionalities=[],
        verification_status="verified",
        signal_agreement=signal_agreement_floats,
        notes=_PENDING_ENRICHMENT_NOTE,
    )


def _build_single_instance_entry(
    rec: FunctionRecord,
    fingerprints: dict[str, SignalFingerprint],
    counter: int,
) -> GlossaryEntry:
    name = rec.functionality_label or f"single-{rec.location.function or rec.id}"
    description = rec.description or f"Single-instance function {rec.location.function!r} (LLM description pending)."
    return GlossaryEntry(
        id=f"gloss-{counter:03d}",
        name=name,
        description=description,
        kind="leaf",
        extractable=False,
        instances=[_build_instance(rec)],
        verification_status="verified",
        notes=_SINGLE_INSTANCE_NOTE,
    )


def _build_instance(rec: FunctionRecord) -> Instance:
    return Instance(
        instance_type="function",
        location=SourceLocation(
            file=rec.location.file,
            line=rec.location.line,
            function=rec.location.function,
        ),
        body_excerpt=rec.body,
        variant_values={},  # Pass B fills when variant_axis is identified
        language_or_format=rec.language,
    )


def _derive_cluster_name(members: list[FunctionRecord]) -> str:
    """Pick a representative name for the cluster.

    Until LLM picks a canonical label, use the most common function name
    across members. Falls back to 'cluster-<file>-<line>' if names diverge.
    """
    names = [m.location.function for m in members if m.location.function]
    if not names:
        first = members[0]
        return f"cluster-{first.location.file}-{first.location.line}"
    # Most common; on tie, first occurrence wins.
    name_counts: dict[str, int] = {}
    for n in names:
        name_counts[n] = name_counts.get(n, 0) + 1
    most_common = max(name_counts.items(), key=lambda kv: (kv[1], -names.index(kv[0])))[0]
    return f"cluster-{most_common}"


def _derive_cluster_description(
    cluster: CandidateCluster,
    members: list[FunctionRecord],
) -> str:
    """Derive a one-line description from cluster metadata until LLM provides one."""
    n = len(members)
    files = len({m.location.file for m in members})
    signal = cluster.primary_signal
    return (
        f"Cluster of {n} similar function(s) across {files} file(s); "
        f"clustered by '{signal}' signal (confidence: {cluster.extractability_confidence}). "
        f"Awaiting LLM-generated description."
    )


def _build_metadata(
    records: list[FunctionRecord],
    clusters: list[CandidateCluster],
    scope_metadata: dict[str, Any],
) -> dict[str, Any]:
    # Wave 5 baseline: nothing is extractable=true until LLM Pass B enriches.
    # We track high-confidence pending candidates separately so the user
    # can see the funnel without the misleading 'already extractable' framing.
    extractable_confirmed = 0  # promoted to >0 only after Pass B fills required fields
    pending_high_confidence = sum(1 for c in clusters if c.extractability_confidence == "high")

    languages: dict[str, int] = {}
    for r in records:
        languages[r.language] = languages.get(r.language, 0) + 1
    total = sum(languages.values()) or 1
    language_mix = {lang: count / total for lang, count in languages.items()}

    meta: dict[str, Any] = {
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "mode": "code",
        "scope": {
            "paths": scope_metadata.get("paths", []),
            "excludes": scope_metadata.get("excludes", []),
            "include_tests": scope_metadata.get("include_tests", False),
        },
        "totals": {
            "records_indexed": len(records),
            "clusters": len(clusters),
            "extractable": extractable_confirmed,
            "pending_high_confidence": pending_high_confidence,
        },
        "language_or_format_mix": language_mix,
    }
    # Allow scope_metadata to add fields (e.g., cost dispatch counts).
    for k, v in scope_metadata.items():
        if k not in meta and k not in {"paths", "excludes", "include_tests"}:
            meta[k] = v
    return meta
