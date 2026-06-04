"""Build GlossaryEntry objects from CandidateCluster + FunctionRecord.

Without enrichments (wave 5 baseline): all entries emit as
extractable=false with a notes field explaining LLM enrichment is still
required to promote them.

With enrichments (wave 7): the SKILL.md layer dispatches Pass B
sub-agents whose merged returns (io_yaml.load_enrichments) overlay the
deterministic entries. The promotion gate lives HERE, next to the
schema requirements: extractable flips true only when every
schema-required extractable field is present and the cluster has 2+
instances — an agent claiming extractable without the goods stays
false, with the gap named in notes. Pass B split decisions
(split groups) divide one cluster into several entries.

Also emits single-instance entries for records not in any cluster —
they form the 'watchlist' section of the rendered glossary (useful
when a second instance appears in a future run).
"""

from __future__ import annotations

import datetime
from typing import Any, Iterable, Optional

from code_glossary.constants import (
    DEFAULT_MIN_INSTANCES_FOR_EXTRACTABLE,
    ENTRY_KINDS,
    GENERATOR_NAME,
    GENERATOR_VERSION,
    SCHEMA_VERSION,
    VERIFICATION_STATUSES,
)
from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    Glossary,
    GlossaryEntry,
    Instance,
    SignalFingerprint,
    SourceLocation,
    VariantAxisEntry,
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
    enrichments: Optional[dict[str, dict[str, Any]]] = None,
) -> Glossary:
    """Assemble the final Glossary document.

    Args:
        records: all records from Stage 1
        fingerprints: Stage 2 fingerprints (drives signal_agreement reporting)
        clusters: Stage 3 CandidateClusters (sorted by score descending)
        scope_metadata: scope info — paths, excludes, include_tests; will be
                        merged with auto-generated totals + timestamp
        enrichments: Pass B returns keyed by cluster id
                     (io_yaml.load_enrichments); None = wave-5 baseline

    Returns:
        Schema-conformant Glossary ready for emission.
    """
    record_list = list(records)
    cluster_list = list(clusters)
    record_index = {r.id: r for r in record_list}
    enrichment_map = dict(enrichments or {})

    # Behavioral-judge merges: an enrichment carrying merge_into folds its
    # cluster's members into the target cluster before entries build.
    # The merged-away cluster emits no entry of its own.
    merged_members: dict[str, list[str]] = {}
    merged_away: set[str] = set()
    cluster_ids = {c.id for c in cluster_list}
    for cid, enr in enrichment_map.items():
        target = enr.get("merge_into")
        if target is None:
            continue
        if target in cluster_ids and target != cid:
            merged_members.setdefault(target, []).extend(
                next(c.member_record_ids for c in cluster_list if c.id == cid)
            )
            merged_away.add(cid)
        # Unknown target: cluster falls through untouched and the
        # enrichment shows up as unmatched below — drift stays visible.

    entries: list[GlossaryEntry] = []
    clustered_ids: set[str] = set()
    counter = 1
    applied_enrichments = 0

    for cluster in cluster_list:
        if cluster.id in merged_away:
            clustered_ids.update(cluster.member_record_ids)
            enrichment_map.pop(cluster.id, None)
            applied_enrichments += 1
            continue
        member_ids = list(cluster.member_record_ids) + merged_members.get(cluster.id, [])
        enrichment = enrichment_map.pop(cluster.id, None)
        if enrichment is not None:
            applied_enrichments += 1
            # Behavioral-judge adoptions (v2.1 near-miss flow): Pass-A
            # singletons judged same-functionality join this cluster's
            # members. Unknown ids are ignored loudly-by-omission — they
            # surface as a count mismatch in the judge's own return.
            adopted = enrichment.get("adopt_record_ids")
            if isinstance(adopted, list):
                member_ids.extend(
                    rid for rid in adopted if rid in record_index and rid not in member_ids
                )
        members = [record_index[m] for m in member_ids if m in record_index]

        split_groups = (enrichment or {}).get("split")
        if isinstance(split_groups, list) and split_groups:
            # Pass B split: one entry per group; members in no group fall
            # through to the watchlist pass below.
            grouped_ids: set[str] = set()
            for group in split_groups:
                group_members = [
                    record_index[m]
                    for m in group.get("member_ids", [])
                    if m in record_index
                ]
                if not group_members:
                    continue
                entry = _build_cluster_entry(
                    cluster=cluster,
                    members=group_members,
                    fingerprints=fingerprints,
                    counter=counter,
                    enrichment=group,
                )
                entry.notes = _append_note(
                    entry.notes, f"Split from {cluster.id} by Pass B review."
                )
                entries.append(entry)
                counter += 1
                grouped_ids.update(r.id for r in group_members)
            clustered_ids.update(grouped_ids)
            continue

        entries.append(
            _build_cluster_entry(
                cluster=cluster,
                members=members,
                fingerprints=fingerprints,
                counter=counter,
                enrichment=enrichment,
            )
        )
        counter += 1
        # member_ids includes judge-merged and judge-adopted records —
        # all of them are clustered now, none may fall to the watchlist.
        clustered_ids.update(member_ids)

    # Single-instance entries: records not in any cluster get their own watchlist entry.
    for rec in record_list:
        if rec.id in clustered_ids:
            continue
        entries.append(_build_single_instance_entry(rec, fingerprints, counter))
        counter += 1

    metadata = _build_metadata(record_list, cluster_list, scope_metadata, entries)
    if enrichments is not None:
        # Unmatched enrichment ids are agent drift — surface, never silent.
        metadata["enrichments"] = {
            "applied": applied_enrichments,
            "unmatched_cluster_ids": sorted(enrichment_map),
        }
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
    enrichment: Optional[dict[str, Any]] = None,
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

    entry = GlossaryEntry(
        id=f"gloss-{counter:03d}",
        name=name,
        description=description,
        kind="leaf",
        extractable=False,  # promoted only via _apply_enrichment's gate
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
    if enrichment is not None:
        _apply_enrichment(entry, enrichment, members)
    return entry


def _apply_enrichment(
    entry: GlossaryEntry,
    enrichment: dict[str, Any],
    members: list[FunctionRecord],
) -> None:
    """Overlay one Pass B return onto a deterministic entry, in place.

    The extractable promotion gate: the agent's extractable=true claim
    holds only when every schema-required field is non-empty AND the
    entry has enough instances. Otherwise the entry stays false and the
    notes name what was missing (visibility per DESIGN-V2.md §10).
    """
    # Pass C drops: instances whose body_excerpt no longer matched disk.
    drop_ids = enrichment.get("drop_instance_ids")
    if isinstance(drop_ids, list) and drop_ids:
        members_by_id = {m.id: m for m in members}
        dropped_locs = {
            (members_by_id[rid].location.file, members_by_id[rid].location.line)
            for rid in drop_ids
            if rid in members_by_id
        }
        kept = [
            inst
            for inst in entry.instances
            if (inst.location.file, inst.location.line) not in dropped_locs
        ]
        if len(kept) != len(entry.instances):
            entry.notes = _append_note(
                entry.notes,
                f"{len(entry.instances) - len(kept)} instance(s) dropped on "
                "quote drift during Pass C verification.",
            )
            entry.instances = kept

    if _non_empty_str(enrichment.get("name")):
        entry.name = enrichment["name"].strip()
    if _non_empty_str(enrichment.get("description")):
        entry.description = enrichment["description"].strip()
    if enrichment.get("kind") in ENTRY_KINDS:
        composed_of = [str(g) for g in enrichment.get("composed_of", [])]
        if enrichment["kind"] == "composite" and not composed_of:
            # Schema: composite requires non-empty composed_of. An agent
            # claiming composite without the references stays leaf, loudly.
            entry.notes = _append_note(
                entry.notes,
                "Pass B claimed kind=composite without composed_of "
                "references; kept as leaf.",
            )
        else:
            entry.kind = enrichment["kind"]
            entry.composed_of = composed_of
    if _non_empty_str(enrichment.get("canonical_signature")):
        entry.canonical_signature = enrichment["canonical_signature"].strip()
    if _non_empty_str(enrichment.get("proposed_module")):
        entry.proposed_module = enrichment["proposed_module"].strip()
    if _non_empty_str(enrichment.get("invariant_skeleton")):
        entry.invariant_skeleton = enrichment["invariant_skeleton"]
    entry.variant_axis = [
        VariantAxisEntry(
            parameter=str(ax.get("parameter", "")),
            instance_values=list(ax.get("instance_values", [])),
            inferred_type=str(ax.get("inferred_type", "")),
        )
        for ax in enrichment.get("variant_axis", [])
        if isinstance(ax, dict) and ax.get("parameter")
    ]
    # Per-instance variant values, keyed by record id in the agent return.
    variant_values = enrichment.get("variant_values")
    if isinstance(variant_values, dict):
        members_by_id = {m.id: m for m in members}
        loc_to_values = {
            (members_by_id[rid].location.file, members_by_id[rid].location.line): vals
            for rid, vals in variant_values.items()
            if rid in members_by_id and isinstance(vals, dict)
        }
        for inst in entry.instances:
            vals = loc_to_values.get((inst.location.file, inst.location.line))
            if vals is not None:
                inst.variant_values = dict(vals)
    # Pass C writes verification_status into the same merged file.
    if enrichment.get("verification_status") in VERIFICATION_STATUSES:
        entry.verification_status = enrichment["verification_status"]
    if _non_empty_str(enrichment.get("notes")):
        entry.notes = enrichment["notes"].strip()

    if enrichment.get("extractable") is True:
        missing = [
            field
            for field, value in (
                ("canonical_signature", entry.canonical_signature),
                ("proposed_module", entry.proposed_module),
                ("invariant_skeleton", entry.invariant_skeleton),
            )
            if not _non_empty_str(value)
        ]
        if not entry.variant_axis:
            missing.append("variant_axis")
        if len(entry.instances) < DEFAULT_MIN_INSTANCES_FOR_EXTRACTABLE:
            missing.append(
                f"instances (need >= {DEFAULT_MIN_INSTANCES_FOR_EXTRACTABLE})"
            )
        if missing:
            entry.extractable = False
            entry.notes = _append_note(
                entry.notes,
                "Pass B claimed extractable but required fields are missing: "
                + ", ".join(missing)
                + ". Demoted to extractable=false.",
            )
        else:
            entry.extractable = True
            # The promoted entry's notes must describe the cluster, not the
            # stale 'enrichment pending' placeholder.
            if entry.notes == _PENDING_ENRICHMENT_NOTE:
                entry.notes = ""


def _non_empty_str(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _append_note(existing: str, addition: str) -> str:
    if not existing:
        return addition
    return f"{existing} {addition}"


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
    entries: list[GlossaryEntry],
) -> dict[str, Any]:
    # extractable counts PROMOTED entries (post-gate), not agent claims.
    # pending_high_confidence tracks the funnel of candidates awaiting
    # (or denied) promotion.
    extractable_confirmed = sum(1 for e in entries if e.extractable)
    pending_high_confidence = sum(
        1
        for e in entries
        if not e.extractable and e.extractability_confidence == "high" and len(e.instances) >= 2
    )

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
