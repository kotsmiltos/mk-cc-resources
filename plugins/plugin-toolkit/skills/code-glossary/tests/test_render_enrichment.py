"""Tests for the Pass B enrichment overlay in entry_builder.

The promotion gate is the contract under test: an agent's
extractable=true claim survives ONLY with all schema-required fields
present and 2+ instances; everything else demotes loudly via notes.
"""

from __future__ import annotations

from code_glossary.records import (
    CandidateCluster,
    FunctionRecord,
    SignalFingerprint,
    SourceLocation,
)
from code_glossary.render.entry_builder import build_glossary
from code_glossary.schema import validate_glossary
from code_glossary.render.yaml_emit import emit_glossary_yaml

import yaml


def _record(rid: str, file: str, line: int, name: str) -> FunctionRecord:
    return FunctionRecord(
        id=rid,
        location=SourceLocation(file=file, line=line, function=name),
        signature=f"def {name}()",
        body=f"def {name}():\n    x = 1\n    return x\n",
        language="python",
        functionality_label="",
        description="",
    )


def _setup():
    records = [
        _record("fn-a", "src/a.py", 1, "register_a"),
        _record("fn-b", "src/b.py", 1, "register_b"),
        _record("fn-c", "src/c.py", 1, "register_c"),
    ]
    fps = {r.id: SignalFingerprint(record_id=r.id) for r in records}
    clusters = [
        CandidateCluster(
            id="cluster-001",
            member_record_ids=["fn-a", "fn-b", "fn-c"],
            primary_signal="structural",
            signal_agreement={"structural": True},
            extractability_score=0.8,
            extractability_confidence="high",
        )
    ]
    scope = {"paths": ["src"], "excludes": [], "include_tests": False}
    return records, fps, clusters, scope


FULL_ENRICHMENT = {
    "cluster_id": "cluster-001",
    "name": "register-build-factory",
    "description": "Registers a factory under a build id.",
    "extractable": True,
    "canonical_signature": "register(build_id, create)",
    "proposed_module": "src/shared/factories.py",
    "invariant_skeleton": "try: register({id}, {fn})\nexcept ValueError: pass",
    "variant_axis": [
        {"parameter": "build_id", "instance_values": ["a", "b", "c"], "inferred_type": "str"}
    ],
    "variant_values": {
        "fn-a": {"build_id": "a"},
        "fn-b": {"build_id": "b"},
    },
}


def test_full_enrichment_promotes_to_extractable():
    records, fps, clusters, scope = _setup()
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": FULL_ENRICHMENT})
    entry = g.glossary[0]
    assert entry.extractable is True
    assert entry.name == "register-build-factory"
    assert entry.canonical_signature == "register(build_id, create)"
    assert entry.variant_axis[0].parameter == "build_id"
    assert g.metadata["totals"]["extractable"] == 1
    assert g.metadata["enrichments"] == {"applied": 1, "unmatched_cluster_ids": []}


def test_enrichment_variant_values_land_on_instances():
    records, fps, clusters, scope = _setup()
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": FULL_ENRICHMENT})
    entry = g.glossary[0]
    by_file = {i.location.file: i for i in entry.instances}
    assert by_file["src/a.py"].variant_values == {"build_id": "a"}
    assert by_file["src/b.py"].variant_values == {"build_id": "b"}
    assert by_file["src/c.py"].variant_values == {}  # not supplied -> untouched


def test_extractable_claim_without_fields_demoted():
    records, fps, clusters, scope = _setup()
    thin = {
        "cluster_id": "cluster-001",
        "name": "register-build-factory",
        "extractable": True,  # claim with no supporting fields
    }
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": thin})
    entry = g.glossary[0]
    assert entry.extractable is False
    assert "Demoted to extractable=false" in entry.notes
    assert "canonical_signature" in entry.notes
    assert "variant_axis" in entry.notes
    assert g.metadata["totals"]["extractable"] == 0


def test_promoted_glossary_passes_schema_validation():
    records, fps, clusters, scope = _setup()
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": FULL_ENRICHMENT})
    doc = yaml.safe_load(emit_glossary_yaml(g))
    assert validate_glossary(doc) == []


def test_unmatched_enrichment_surfaces_in_metadata():
    records, fps, clusters, scope = _setup()
    g = build_glossary(
        records, fps, clusters, scope,
        enrichments={"cluster-999": {"cluster_id": "cluster-999", "extractable": True}},
    )
    assert g.metadata["enrichments"]["applied"] == 0
    assert g.metadata["enrichments"]["unmatched_cluster_ids"] == ["cluster-999"]
    assert g.glossary[0].extractable is False  # baseline untouched


def test_split_groups_divide_cluster():
    records, fps, clusters, scope = _setup()
    split_enrichment = {
        "cluster_id": "cluster-001",
        "split": [
            {
                "member_ids": ["fn-a", "fn-b"],
                "name": "register-factory-with-retry",
                "description": "Registers with retry.",
            },
            {
                "member_ids": ["fn-c"],
                "name": "register-factory-once",
                "description": "Registers once.",
            },
        ],
    }
    g = build_glossary(
        records, fps, clusters, scope, enrichments={"cluster-001": split_enrichment}
    )
    names = [e.name for e in g.glossary]
    assert "register-factory-with-retry" in names
    assert "register-factory-once" in names
    two = next(e for e in g.glossary if e.name == "register-factory-with-retry")
    assert len(two.instances) == 2
    assert "Split from cluster-001" in two.notes


def test_split_orphan_members_fall_to_watchlist():
    records, fps, clusters, scope = _setup()
    split_enrichment = {
        "cluster_id": "cluster-001",
        "split": [
            {"member_ids": ["fn-a", "fn-b"], "name": "kept-pair", "description": "Pair."}
        ],
        # fn-c in no group -> must reappear as a single-instance entry.
    }
    g = build_glossary(
        records, fps, clusters, scope, enrichments={"cluster-001": split_enrichment}
    )
    singles = [e for e in g.glossary if len(e.instances) == 1]
    assert any(e.instances[0].location.file == "src/c.py" for e in singles)


def test_no_enrichments_keyword_preserves_baseline():
    records, fps, clusters, scope = _setup()
    g = build_glossary(records, fps, clusters, scope)
    assert g.glossary[0].extractable is False
    assert "enrichments" not in g.metadata  # baseline metadata unchanged


def test_pass_c_verification_status_applies():
    records, fps, clusters, scope = _setup()
    enr = dict(FULL_ENRICHMENT, verification_status="quote_drift_detected")
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": enr})
    assert g.glossary[0].verification_status == "quote_drift_detected"


def test_pass_c_drop_instance_ids_removes_and_notes():
    records, fps, clusters, scope = _setup()
    enr = dict(FULL_ENRICHMENT, drop_instance_ids=["fn-c"])
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": enr})
    entry = g.glossary[0]
    files = {i.location.file for i in entry.instances}
    assert files == {"src/a.py", "src/b.py"}
    assert "dropped on quote drift" in entry.notes
    assert entry.extractable is True  # still 2 instances -> gate passes


def test_pass_c_drop_below_minimum_demotes():
    records, fps, clusters, scope = _setup()
    enr = dict(FULL_ENRICHMENT, drop_instance_ids=["fn-b", "fn-c"])
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": enr})
    entry = g.glossary[0]
    assert len(entry.instances) == 1
    assert entry.extractable is False  # 1 instance < minimum, claim demoted
    assert "Demoted to extractable=false" in entry.notes


def _setup_two_clusters():
    records = [
        _record("fn-a", "src/a.py", 1, "register_a"),
        _record("fn-b", "src/b.py", 1, "register_b"),
        _record("fn-c", "src/c.py", 1, "load_c"),
        _record("fn-d", "src/d.py", 1, "load_d"),
    ]
    fps = {r.id: SignalFingerprint(record_id=r.id) for r in records}
    clusters = [
        CandidateCluster(
            id="cluster-001",
            member_record_ids=["fn-a", "fn-b"],
            primary_signal="structural",
            signal_agreement={"structural": True},
            extractability_score=0.8,
            extractability_confidence="high",
        ),
        CandidateCluster(
            id="cluster-002",
            member_record_ids=["fn-c", "fn-d"],
            primary_signal="label",
            signal_agreement={"label": True},
            extractability_score=0.4,
            extractability_confidence="medium",
        ),
    ]
    scope = {"paths": ["src"], "excludes": [], "include_tests": False}
    return records, fps, clusters, scope


def test_composite_claim_without_composed_of_stays_leaf():
    """Found by the wave-12 acceptance run: an agent claiming
    kind=composite with empty composed_of produced schema-invalid YAML."""
    records, fps, clusters, scope = _setup()
    enr = {
        "cluster_id": "cluster-001",
        "kind": "composite",  # no composed_of references
        "name": "orchestrate-registration",
        "description": "Claims composite without naming parts.",
    }
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": enr})
    entry = g.glossary[0]
    assert entry.kind == "leaf"
    assert entry.composed_of == []
    assert "kind=composite without composed_of" in entry.notes
    doc = yaml.safe_load(emit_glossary_yaml(g))
    assert validate_glossary(doc) == []


def test_composite_claim_with_composed_of_applies():
    records, fps, clusters, scope = _setup()
    enr = dict(
        FULL_ENRICHMENT,
        kind="composite",
        composed_of=["gloss-002", "gloss-003"],
    )
    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": enr})
    entry = g.glossary[0]
    assert entry.kind == "composite"
    assert entry.composed_of == ["gloss-002", "gloss-003"]


def test_judge_merge_into_folds_members():
    records, fps, clusters, scope = _setup_two_clusters()
    enrichments = {
        "cluster-002": {"cluster_id": "cluster-002", "merge_into": "cluster-001"},
    }
    g = build_glossary(records, fps, clusters, scope, enrichments=enrichments)
    # cluster-002 emits no entry; its members join cluster-001's entry.
    multi = [e for e in g.glossary if len(e.instances) >= 2]
    assert len(multi) == 1
    assert len(multi[0].instances) == 4
    # No watchlist leakage: fn-c / fn-d must not reappear as singles.
    singles = [e for e in g.glossary if len(e.instances) == 1]
    assert singles == []
    assert g.metadata["enrichments"]["applied"] == 1
    assert g.metadata["enrichments"]["unmatched_cluster_ids"] == []


def test_merge_into_unknown_target_stays_visible():
    records, fps, clusters, scope = _setup_two_clusters()
    enrichments = {
        "cluster-002": {"cluster_id": "cluster-002", "merge_into": "cluster-999"},
    }
    g = build_glossary(records, fps, clusters, scope, enrichments=enrichments)
    # Both clusters still emit entries; the bogus merge surfaces as... the
    # enrichment IS matched to cluster-002 (its other fields apply), so it
    # is consumed - but the merge itself was a no-op. Entry count proves it.
    multi = [e for e in g.glossary if len(e.instances) >= 2]
    assert len(multi) == 2


# --- v2.1: behavioral-judge singleton adoption ---


def test_adopt_record_ids_joins_cluster_and_leaves_watchlist():
    records, fps, clusters, scope = _setup()
    # A 4th record outside the cluster — the SC ClosestPointOnSegment shape.
    orphan = _record("fn-d", "src/d.py", 656, "register_d")
    records = records + [orphan]
    fps["fn-d"] = SignalFingerprint(record_id="fn-d")
    enrichment = dict(FULL_ENRICHMENT)
    enrichment["adopt_record_ids"] = ["fn-d", "fn-ghost"]  # unknown id ignored

    g = build_glossary(records, fps, clusters, scope, enrichments={"cluster-001": enrichment})
    entry = g.glossary[0]
    files = {i.location.file for i in entry.instances}
    assert "src/d.py" in files  # adopted into the cluster entry
    assert len(entry.instances) == 4
    # Adopted record must NOT also appear as a watchlist single.
    singles = [e for e in g.glossary[1:] if any(i.location.file == "src/d.py" for i in e.instances)]
    assert singles == []
    validate_glossary(yaml.safe_load(emit_glossary_yaml(g)))


# --- v2.2: composites made real — composed_of record-id -> gloss-id ---


def _setup_with_watchlist_helpers():
    """Cluster fn-a/fn-b/fn-c + two unclustered helpers fn-x/fn-y."""
    records, fps, clusters, scope = _setup()
    for rid, file, name in (("fn-x", "src/x.py", "fetch_thing"), ("fn-y", "src/y.py", "render_thing")):
        records.append(_record(rid, file, 1, name))
        fps[rid] = SignalFingerprint(record_id=rid)
    return records, fps, clusters, scope


def _composite_enrichment(composed_of):
    enrichment = dict(FULL_ENRICHMENT)
    enrichment["kind"] = "composite"
    enrichment["composed_of"] = composed_of
    return enrichment


def _entry_id_for_file(g, file):
    return next(e.id for e in g.glossary if any(i.location.file == file for i in e.instances))


def test_composed_of_record_ids_rewrite_to_gloss_ids():
    records, fps, clusters, scope = _setup_with_watchlist_helpers()
    # Duplicate fn-x reference must dedupe after rewrite.
    enrichments = {"cluster-001": _composite_enrichment(["fn-x", "fn-y", "fn-x"])}
    g = build_glossary(records, fps, clusters, scope, enrichments=enrichments)
    entry = g.glossary[0]
    assert entry.kind == "composite"
    x_id = _entry_id_for_file(g, "src/x.py")
    y_id = _entry_id_for_file(g, "src/y.py")
    assert entry.composed_of == [x_id, y_id]
    assert all(ref.startswith("gloss-") for ref in entry.composed_of)
    doc = yaml.safe_load(emit_glossary_yaml(g))
    assert validate_glossary(doc) == []


def test_composed_of_existing_gloss_id_kept_as_is():
    records, fps, clusters, scope = _setup_with_watchlist_helpers()
    # gloss-002 is the first watchlist single (cluster entry is gloss-001).
    enrichments = {"cluster-001": _composite_enrichment(["gloss-002"])}
    g = build_glossary(records, fps, clusters, scope, enrichments=enrichments)
    entry = g.glossary[0]
    assert entry.composed_of == ["gloss-002"]
    assert "not resolvable" not in entry.notes


def test_composed_of_unresolvable_ref_kept_verbatim_with_note():
    records, fps, clusters, scope = _setup_with_watchlist_helpers()
    enrichments = {"cluster-001": _composite_enrichment(["fn-x", "fn-ghost"])}
    g = build_glossary(records, fps, clusters, scope, enrichments=enrichments)
    entry = g.glossary[0]
    assert "fn-ghost" in entry.composed_of  # verbatim, not dropped
    assert "fn-ghost" in entry.notes
    assert "not resolvable" in entry.notes
    assert entry.kind == "composite"  # still non-empty -> stays composite


def test_composed_of_self_loop_dropped_and_composite_demoted():
    records, fps, clusters, scope = _setup_with_watchlist_helpers()
    # fn-a is a member of cluster-001 itself -> resolves to the entry's own id.
    enrichments = {"cluster-001": _composite_enrichment(["fn-a"])}
    g = build_glossary(records, fps, clusters, scope, enrichments=enrichments)
    entry = g.glossary[0]
    assert entry.composed_of == []
    assert "self-loops" in entry.notes
    assert entry.kind == "leaf"  # schema forbids composite with empty composed_of
    doc = yaml.safe_load(emit_glossary_yaml(g))
    assert validate_glossary(doc) == []
