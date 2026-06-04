"""Tests for the stage runner CLI (python -m code_glossary.runner).

Drives main(argv) directly (no subprocess — same code path, faster).
End-to-end: index -> apply-labels -> signal -> cluster -> slices ->
render, on a small fixture tree with a deliberate clone pair.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from code_glossary.runner import EXIT_HARD_FAILURE, EXIT_OK, main


CLONE_A = """\
def fetch_user(uid):
    result = api.get('/users/' + uid)
    return result.json()
"""

CLONE_B = """\
def fetch_account(key):
    payload = client.get('/accounts/' + key)
    return payload.json()
"""

SINGLETON = """\
def render_table(rows):
    lines = [str(r) for r in rows]
    return '\\n'.join(lines)
"""


@pytest.fixture()
def src_tree(tmp_path: Path) -> Path:
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.py").write_text(CLONE_A, encoding="utf-8")
    (src / "b.py").write_text(CLONE_B, encoding="utf-8")
    (src / "c.py").write_text(SINGLETON, encoding="utf-8")
    return src


def test_index_writes_records(src_tree: Path, tmp_path: Path, capsys):
    out = tmp_path / "work" / "records.yaml"
    assert main(["index", "--root", str(src_tree), "--out", str(out)]) == EXIT_OK
    captured = capsys.readouterr().out
    assert "records: 3" in captured
    doc = yaml.safe_load(out.read_text(encoding="utf-8"))
    assert len(doc["records"]) == 3


def test_index_empty_root_hard_fails(tmp_path: Path):
    empty = tmp_path / "empty"
    empty.mkdir()
    out = tmp_path / "records.yaml"
    assert main(["index", "--root", str(empty), "--out", str(out)]) == EXIT_HARD_FAILURE
    assert not out.exists()


def test_index_missing_root_hard_fails(tmp_path: Path):
    code = main(["index", "--root", str(tmp_path / "ghost"), "--out", str(tmp_path / "r.yaml")])
    assert code == EXIT_HARD_FAILURE


def _run_pipeline_through_cluster(src_tree: Path, tmp_path: Path) -> dict[str, Path]:
    work = tmp_path / "work"
    paths = {
        "records": work / "records.yaml",
        "fingerprints": work / "fingerprints.yaml",
        "clusters": work / "clusters.yaml",
    }
    assert main(["index", "--root", str(src_tree), "--out", str(paths["records"])]) == EXIT_OK
    assert main(["signal", "--records", str(paths["records"]), "--out", str(paths["fingerprints"])]) == EXIT_OK
    assert main([
        "cluster",
        "--records", str(paths["records"]),
        "--fingerprints", str(paths["fingerprints"]),
        "--out", str(paths["clusters"]),
    ]) == EXIT_OK
    return paths


def test_pipeline_clusters_the_clone_pair(src_tree: Path, tmp_path: Path):
    paths = _run_pipeline_through_cluster(src_tree, tmp_path)
    doc = yaml.safe_load(paths["clusters"].read_text(encoding="utf-8"))
    multi = [c for c in doc["clusters"] if len(c["member_record_ids"]) >= 2]
    assert len(multi) == 1  # fetch_user + fetch_account are structural clones
    assert multi[0]["primary_signal"] == "structural"


def test_apply_labels_merges_and_normalizes(src_tree: Path, tmp_path: Path, capsys):
    paths = _run_pipeline_through_cluster(src_tree, tmp_path)
    records_doc = yaml.safe_load(paths["records"].read_text(encoding="utf-8"))
    ids = [r["id"] for r in records_doc["records"]]

    labels_path = tmp_path / "work" / "labels.yaml"
    labels_path.write_text(
        f"""\
labels:
  - id: {ids[0]}
    functionality_label: fetch-entity-from-api
    description: Fetches an entity by key.
  - id: {ids[1]}
    functionality_label: Bogus Verb Label
  - id: fn-nonexistent
    functionality_label: fetch-something
""",
        encoding="utf-8",
    )
    capsys.readouterr()  # clear pipeline output
    code = main([
        "apply-labels",
        "--records", str(paths["records"]),
        "--labels", str(labels_path),
    ])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert "labels_applied: 2" in out  # invalid label still applies, as 'unclear'
    assert "labels_normalized_to_unclear: 1" in out
    assert "unknown_record_id: fn-nonexistent" in out

    updated = yaml.safe_load(paths["records"].read_text(encoding="utf-8"))
    by_id = {r["id"]: r for r in updated["records"]}
    assert by_id[ids[0]]["functionality_label"] == "fetch-entity-from-api"
    assert by_id[ids[1]]["functionality_label"] == "unclear"


def test_slices_written_per_multi_cluster(src_tree: Path, tmp_path: Path, capsys):
    paths = _run_pipeline_through_cluster(src_tree, tmp_path)
    slices_dir = tmp_path / "work" / "slices"
    capsys.readouterr()
    code = main([
        "slices",
        "--records", str(paths["records"]),
        "--clusters", str(paths["clusters"]),
        "--out-dir", str(slices_dir),
    ])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert "slices_written: 1" in out
    slice_files = list(slices_dir.glob("*.yaml"))
    assert len(slice_files) == 1
    slice_doc = yaml.safe_load(slice_files[0].read_text(encoding="utf-8"))
    assert len(slice_doc["members"]) == 2
    assert all(m["body"] for m in slice_doc["members"])  # verbatim bodies included


def test_render_baseline_and_enriched(src_tree: Path, tmp_path: Path, capsys):
    paths = _run_pipeline_through_cluster(src_tree, tmp_path)
    out_dir = tmp_path / "glossary"

    # Baseline render: nothing extractable.
    capsys.readouterr()
    code = main([
        "render",
        "--records", str(paths["records"]),
        "--fingerprints", str(paths["fingerprints"]),
        "--clusters", str(paths["clusters"]),
        "--out-dir", str(out_dir),
        "--scope-path", "src",
    ])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert "totals_extractable: 0" in out
    assert (out_dir / "GLOSSARY.yaml").exists()
    assert (out_dir / "GLOSSARY.md").exists()

    # Enriched render: the clone cluster promotes.
    clusters_doc = yaml.safe_load(paths["clusters"].read_text(encoding="utf-8"))
    cluster_id = next(
        c["id"] for c in clusters_doc["clusters"] if len(c["member_record_ids"]) >= 2
    )
    enrichments_path = tmp_path / "work" / "enrichments.yaml"
    enrichments_path.write_text(
        f"""\
enrichments:
  - cluster_id: {cluster_id}
    name: fetch-entity-from-api
    description: Fetches one entity by key from a remote API.
    extractable: true
    canonical_signature: "fetch_entity(client, path_prefix, key)"
    proposed_module: src/shared/api_fetch.py
    invariant_skeleton: "result = {{client}}.get({{prefix}} + key)\\nreturn result.json()"
    variant_axis:
      - parameter: path_prefix
        instance_values: ['/users/', '/accounts/']
        inferred_type: str
    verification_status: verified
""",
        encoding="utf-8",
    )
    capsys.readouterr()
    code = main([
        "render",
        "--records", str(paths["records"]),
        "--fingerprints", str(paths["fingerprints"]),
        "--clusters", str(paths["clusters"]),
        "--enrichments", str(enrichments_path),
        "--out-dir", str(out_dir),
        "--scope-path", "src",
    ])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert "totals_extractable: 1" in out
    assert "enrichments_applied: 1" in out
    doc = yaml.safe_load((out_dir / "GLOSSARY.yaml").read_text(encoding="utf-8"))
    promoted = [e for e in doc["glossary"] if e["extractable"]]
    assert len(promoted) == 1
    assert promoted[0]["name"] == "fetch-entity-from-api"


def test_malformed_artifact_hard_fails(tmp_path: Path):
    bad = tmp_path / "records.yaml"
    bad.write_text("not_records: []", encoding="utf-8")
    code = main(["signal", "--records", str(bad), "--out", str(tmp_path / "f.yaml")])
    assert code == EXIT_HARD_FAILURE
