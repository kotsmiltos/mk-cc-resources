"""Deterministic behavioral-judge candidate generation (v2.1).

The v2 acceptance A/B showed three judge-tier recall losses that Pass A
cannot fix alone:

    1. Same functionality split across clusters whose LABELS overlap
       (the build-factory family ended up in three clusters).
    2. Pass-A singletons that are near-clones of a cluster's members —
       two ClosestPointOnSegment variants stayed singletons because a
       cosmetic shape difference broke the structural hash.
    3. Giant signature-only buckets (parameterless-void, n=143) that
       were never reviewed at all; real clusters hide inside them.

This module turns each loss into a deterministic CANDIDATE GENERATOR.
Candidates are not verdicts: the SKILL.md layer dispatches one
behavioral-judge sub-agent per candidate, and only judge verdicts
(merge / adopt / distinct) change the glossary. Keeping generation
deterministic means the judge dispatch count is known at estimate time
and can never be silently skipped (DESIGN-V2.md row 16).

Output shape (one dict per candidate, dumped to near_misses.yaml):

    kind: label-pair | singleton-adoption | bucket-sample
    reason: <one line, deterministic provenance>
    cluster_a: <cluster id>            (all kinds)
    cluster_b: <cluster id>            (label-pair only)
    record_id: <fn-... id>             (singleton-adoption only)
    sample_record_ids: [<fn-... ids>]  (bucket-sample only)
"""

from __future__ import annotations

from collections import Counter
from typing import Iterable

from code_glossary.records import CandidateCluster, FunctionRecord
from code_glossary.vocab import UNCLEAR_VERB

# Label-pair rule: first this many kebab tokens must match (the v2
# SKILL.md step-7 rule, now executable instead of prose).
LABEL_PREFIX_TOKENS = 2

# Bucket-sample rule: signature-only clusters at least this big get a
# deterministic sample surfaced for judge review instead of being
# ignored wholesale. 20 ≈ an order of magnitude above the median
# cluster size on the dogfood corpora; only the pathological buckets hit it.
BUCKET_MIN_MEMBERS = 20

# How many member ids a bucket-sample candidate carries. Five bodies fit
# one judge dispatch comfortably; the judge's job is "does a real cluster
# hide in here", not exhaustive review.
BUCKET_SAMPLE_SIZE = 5


def find_near_misses(
    records: Iterable[FunctionRecord],
    clusters: Iterable[CandidateCluster],
    *,
    bucket_min_members: int = BUCKET_MIN_MEMBERS,
    bucket_sample_size: int = BUCKET_SAMPLE_SIZE,
) -> list[dict]:
    """Run all three candidate generators; return a flat candidate list."""
    record_list = list(records)
    cluster_list = list(clusters)
    record_index = {r.id: r for r in record_list}

    candidates: list[dict] = []
    candidates.extend(_label_pairs(cluster_list, record_index))
    candidates.extend(_singleton_adoptions(record_list, cluster_list, record_index))
    candidates.extend(
        _bucket_samples(cluster_list, bucket_min_members, bucket_sample_size)
    )
    return candidates


# --- generator 1: label-prefix pairs ---


def _cluster_label(cluster: CandidateCluster, record_index: dict[str, FunctionRecord]) -> str:
    """Majority functionality_label among members ('' when unlabeled)."""
    labels = [
        record_index[rid].functionality_label
        for rid in cluster.member_record_ids
        if rid in record_index
        and record_index[rid].functionality_label
        and record_index[rid].functionality_label != UNCLEAR_VERB
    ]
    if not labels:
        return ""
    return Counter(labels).most_common(1)[0][0]


def _label_pairs(
    clusters: list[CandidateCluster], record_index: dict[str, FunctionRecord]
) -> list[dict]:
    """Multi-instance cluster pairs whose labels share the first N kebab tokens."""
    labeled = []
    for c in clusters:
        label = _cluster_label(c, record_index)
        if label:
            prefix = "-".join(label.split("-")[:LABEL_PREFIX_TOKENS])
            labeled.append((c.id, label, prefix))

    out: list[dict] = []
    for i, (id_a, label_a, prefix_a) in enumerate(labeled):
        for id_b, label_b, prefix_b in labeled[i + 1 :]:
            if prefix_a == prefix_b:
                out.append(
                    {
                        "kind": "label-pair",
                        "cluster_a": id_a,
                        "cluster_b": id_b,
                        "reason": (
                            f"labels '{label_a}' and '{label_b}' share prefix "
                            f"'{prefix_a}' but Pass A kept them apart"
                        ),
                    }
                )
    return out


# --- generator 2: singleton adoption ---


def _singleton_adoptions(
    records: list[FunctionRecord],
    clusters: list[CandidateCluster],
    record_index: dict[str, FunctionRecord],
) -> list[dict]:
    """Pass-A singletons whose function NAME matches a cluster member's.

    Exact-name match is deliberately narrow: it caught both real cases in
    the SC A/B (two ClosestPointOnSegment variants) with zero false
    candidates on the dogfood corpora. Widen only with evidence.
    """
    clustered_ids = {rid for c in clusters for rid in c.member_record_ids}
    # Map bare function name -> first cluster containing a member with it.
    name_to_cluster: dict[str, str] = {}
    for c in clusters:
        for rid in c.member_record_ids:
            rec = record_index.get(rid)
            if rec is None or not rec.location.function:
                continue
            name_to_cluster.setdefault(_bare_name(rec.location.function), c.id)

    out: list[dict] = []
    for rec in records:
        if rec.id in clustered_ids or not rec.location.function:
            continue
        cluster_id = name_to_cluster.get(_bare_name(rec.location.function))
        if cluster_id is not None:
            out.append(
                {
                    "kind": "singleton-adoption",
                    "cluster_a": cluster_id,
                    "record_id": rec.id,
                    "reason": (
                        f"singleton {rec.location.file}:{rec.location.line} "
                        f"'{rec.location.function}' name-matches a member of {cluster_id}"
                    ),
                }
            )
    return out


def _bare_name(function: str) -> str:
    """Strip qualifier prefixes: 'AStarReynoldsBuild.ClosestPointOnSegment'
    and 'ClosestPointOnSegment' must match."""
    return function.rsplit(".", 1)[-1]


# --- generator 3: signature-only bucket sampling ---


def _bucket_samples(
    clusters: list[CandidateCluster], min_members: int, sample_size: int
) -> list[dict]:
    """Big signature-only buckets: surface a deterministic member sample.

    'Signature-only' = the signature signal agrees and no stronger signal
    (structural / label / lexical) does — the contract-coincidence shape
    that produced the unreviewed n=143 bucket in the SC A/B.
    """
    out: list[dict] = []
    for c in clusters:
        if len(c.member_record_ids) < min_members:
            continue
        agreement = c.signal_agreement or {}
        if not agreement.get("signature"):
            continue
        if any(agreement.get(s) for s in ("structural", "label", "lexical")):
            continue
        sample = sorted(c.member_record_ids)[:sample_size]
        out.append(
            {
                "kind": "bucket-sample",
                "cluster_a": c.id,
                "sample_record_ids": sample,
                "reason": (
                    f"signature-only bucket with {len(c.member_record_ids)} members; "
                    f"sampled {len(sample)} for hidden-cluster review"
                ),
            }
        )
    return out
