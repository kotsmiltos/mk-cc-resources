"""Tests for spec-mode Stage 1 + Stage 2 (the /organize adapter).

Fixtures replicate BOTH real-world task spec shapes the adapter was
designed against: variant A (Scalable Crowd — title, dict contract with
criteria list) and variant B (BiananceRepo — goal-only, list contract
with typed checks). The dedupe scenario uses two specs that describe
the same functionality under different names — exactly what /organize
must catch.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from code_glossary.cluster.orchestrator import cluster_records
from code_glossary.indexer.spec_parser import index_sprint_specs, parse_spec_file
from code_glossary.runner import EXIT_HARD_FAILURE, EXIT_OK, main
from code_glossary.signals.spec_signals import extract_spec_signals


# Variant A — Scalable Crowd shape (title + dict contract).
SPEC_A = """\
schema_version: 1
task_id: SVC-01
module: SVC
sprint: 2
title: Fetch user record from persistence by id
goal: Fetch user record from persistence by id
dependencies: []
requirements_traced: [FR-USER-1]
file_write_contract:
  allowed: [src/services/user_fetch.py]
  forbidden: []
behavioral_pseudocode: (none specified — see acceptance_criteria for behavior contract)
test_completion_contract:
  criteria:
    - id: SVC-01-AC-1
      check: >-
        fetch_user(uid) queries the user store and returns the user row, raising
        NotFound when absent.
agency_level: guided
estimated_size: S
"""

# Variant B — BiananceRepo shape (goal-only + list contract).
SPEC_B = """\
schema_version: 1
task_id: B-load-user
module: B
goal: 'Author src/services/account_loader.py — load the user account row from the
  persistence layer given an account id, raising NotFound when the id is absent.

  '
requirements_traced: [FR-USER-2]
file_write_contract:
  allowed: [src/services/account_loader.py]
  forbidden: [core/**]
behavioral_pseudocode: "def load_account(account_id):\\n    row = store.get(account_id)\\n    if row is None: raise NotFound\\n    return row"
test_completion_contract:
- id: AC-1
  description: loader returns the persisted row for a known id
  check:
    type: pytest
    spec: tests/test_account_loader.py::test_known_id
dependencies: []
agency_level: prescribed
"""

# A clearly different task (composite: orchestrates the other two).
SPEC_C = """\
schema_version: 1
task_id: SVC-02
module: SVC
title: Render account dashboard page
goal: Render the dashboard page. Uses SVC-01 to fetch the user and B-load-user
  for the account row, then renders the combined view model.
test_completion_contract:
  criteria:
    - id: SVC-02-AC-1
      check: dashboard view renders user + account data
agency_level: guided
"""


@pytest.fixture()
def sprints_dir(tmp_path: Path) -> Path:
    root = tmp_path / "sprints"
    for sprint, name, body in (
        ("1", "SVC-01-user-fetch.yaml", SPEC_A),
        ("1", "SVC-02-dashboard.yaml", SPEC_C),
        ("2", "B-load-user.yaml", SPEC_B),
    ):
        p = root / sprint / "tasks" / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding="utf-8")
    return root


# --- parse_spec_file ---


def test_parse_variant_a(sprints_dir: Path):
    rec = parse_spec_file(
        sprints_dir / "1" / "tasks" / "SVC-01-user-fetch.yaml", rel_to=sprints_dir
    )
    assert rec is not None
    assert rec.task_id == "SVC-01"
    assert rec.id.startswith("spec-")
    assert rec.description == "Fetch user record from persistence by id"
    assert rec.location.file == "1/tasks/SVC-01-user-fetch.yaml"
    assert rec.location.task_id == "SVC-01"
    # The "(none specified" pseudocode marker must NOT leak into behavior.
    assert "(none specified" not in rec.expected_behavior
    assert len(rec.acceptance_criteria) == 1
    assert "NotFound" in rec.acceptance_criteria[0]


def test_parse_variant_b(sprints_dir: Path):
    rec = parse_spec_file(
        sprints_dir / "2" / "tasks" / "B-load-user.yaml", rel_to=sprints_dir
    )
    assert rec is not None
    assert rec.task_id == "B-load-user"
    # description = first line of goal (no title in variant B)
    assert rec.description.startswith("Author src/services/account_loader.py")
    # real pseudocode IS included in expected_behavior
    assert "def load_account" in rec.expected_behavior
    # list-shaped contract with typed check flattens to readable strings
    assert len(rec.acceptance_criteria) == 1
    assert "loader returns the persisted row" in rec.acceptance_criteria[0]
    assert "[pytest]" in rec.acceptance_criteria[0]


def test_parse_frontmatter_multidoc(tmp_path: Path):
    """BiananceRepo sprint-2+ shape: frontmatter document + body document."""
    p = tmp_path / "D-ch01-data.yaml"
    p.write_text(
        """\
---
schema_version: 1
artifact: task-spec
task_id: D-ch01-data
module: D
---

goal: |
  Audit chapter 1 - Data; produce discovery.md + findings slice.

requirements_traced:
  - REQ-FR-AUX-01
""",
        encoding="utf-8",
    )
    rec = parse_spec_file(p, rel_to=tmp_path)
    assert rec is not None
    assert rec.task_id == "D-ch01-data"
    assert rec.description.startswith("Audit chapter 1")


def test_parse_missing_task_id_returns_none(tmp_path: Path):
    p = tmp_path / "bad.yaml"
    p.write_text("schema_version: 1\ngoal: no id here\n", encoding="utf-8")
    assert parse_spec_file(p) is None


def test_parse_non_yaml_returns_none(tmp_path: Path):
    p = tmp_path / "bad.yaml"
    p.write_text("{{{{ not yaml", encoding="utf-8")
    assert parse_spec_file(p) is None


# --- index_sprint_specs ---


def test_index_walks_all_sprints(sprints_dir: Path):
    records, failures = index_sprint_specs(sprints_dir)
    assert {r.task_id for r in records} == {"SVC-01", "SVC-02", "B-load-user"}
    assert failures == []


def test_index_single_sprint_dir(sprints_dir: Path):
    records, failures = index_sprint_specs(sprints_dir / "1")
    assert {r.task_id for r in records} == {"SVC-01", "SVC-02"}
    assert failures == []


def test_index_reports_failures(sprints_dir: Path):
    bad = sprints_dir / "1" / "tasks" / "broken.yaml"
    bad.write_text("goal: missing the task id\n", encoding="utf-8")
    records, failures = index_sprint_specs(sprints_dir)
    assert len(records) == 3
    assert len(failures) == 1
    assert "broken.yaml" in failures[0][0]


# --- extract_spec_signals ---


def test_spec_signals_lexical_overlap(sprints_dir: Path):
    records, _ = index_sprint_specs(sprints_dir)
    fps = extract_spec_signals(records)
    by_task = {r.task_id: fps[r.id] for r in records}
    a = by_task["SVC-01"].lexical_tokens
    b = by_task["B-load-user"].lexical_tokens
    # Same functionality, different words for it — still strong overlap.
    shared = a & b
    assert {"persistence", "notfound", "row"} & shared or len(shared) >= 4


def test_spec_signals_no_structural(sprints_dir: Path):
    records, _ = index_sprint_specs(sprints_dir)
    fps = extract_spec_signals(records)
    assert all(fp.structural_hash is None for fp in fps.values())


def test_spec_signals_composite_via_mentions(sprints_dir: Path):
    records, _ = index_sprint_specs(sprints_dir)
    fps = extract_spec_signals(records)
    by_task = {r.task_id: (r, fps[r.id]) for r in records}
    dash_rec, dash_fp = by_task["SVC-02"]
    assert dash_fp.is_composite is True
    mentioned_task_ids = {
        rec.task_id for rec in records if rec.id in dash_fp.composed_of_candidates
    }
    assert mentioned_task_ids == {"SVC-01", "B-load-user"}
    # Leaf specs are not composites.
    assert by_task["SVC-01"][1].is_composite is False


def test_spec_signals_label_tokens_after_labeling(sprints_dir: Path):
    records, _ = index_sprint_specs(sprints_dir)
    for r in records:
        if r.task_id in ("SVC-01", "B-load-user"):
            r.functionality_label = "fetch-user-from-persistence"
    fps = extract_spec_signals(records)
    labeled = [fp for fp in fps.values() if fp.label_tokens]
    assert len(labeled) == 2


# --- clustering over spec records (duck-typed) ---


def test_spec_records_cluster_by_shared_label(sprints_dir: Path):
    records, _ = index_sprint_specs(sprints_dir)
    for r in records:
        if r.task_id in ("SVC-01", "B-load-user"):
            r.functionality_label = "fetch-user-from-persistence"
        else:
            r.functionality_label = "render-account-dashboard"
    fps = extract_spec_signals(records)
    clusters = cluster_records(records, fps)
    multi = [c for c in clusters if len(c.member_record_ids) >= 2]
    assert len(multi) == 1  # the duplicated fetch — /organize's whole purpose
    member_tasks = {
        r.task_id for r in records if r.id in multi[0].member_record_ids
    }
    assert member_tasks == {"SVC-01", "B-load-user"}


# --- runner spec mode ---


def test_runner_spec_pipeline(sprints_dir: Path, tmp_path: Path, capsys):
    work = tmp_path / "work"
    specs = work / "specs.yaml"
    assert main(["index-specs", "--root", str(sprints_dir), "--out", str(specs)]) == EXIT_OK
    out = capsys.readouterr().out
    assert "spec_records: 3" in out

    # Label two specs identically (the LLM step, simulated).
    doc = yaml.safe_load(specs.read_text(encoding="utf-8"))
    labels = [
        {
            "id": r["id"],
            "functionality_label": "fetch-user-from-persistence",
            "description": "Fetch a user row by id.",
        }
        for r in doc["spec_records"]
        if r["task_id"] in ("SVC-01", "B-load-user")
    ]
    labels_path = work / "labels.yaml"
    labels_path.write_text(yaml.safe_dump({"labels": labels}), encoding="utf-8")
    assert main([
        "apply-labels", "--mode", "spec",
        "--records", str(specs), "--labels", str(labels_path),
    ]) == EXIT_OK

    fp_path = work / "fps.yaml"
    cl_path = work / "clusters.yaml"
    assert main(["signal", "--mode", "spec", "--records", str(specs), "--out", str(fp_path)]) == EXIT_OK
    capsys.readouterr()
    assert main([
        "cluster", "--mode", "spec",
        "--records", str(specs), "--fingerprints", str(fp_path), "--out", str(cl_path),
    ]) == EXIT_OK
    out = capsys.readouterr().out
    assert "multi_instance_clusters: 1" in out


def test_runner_index_specs_empty_hard_fails(tmp_path: Path):
    empty = tmp_path / "sprints"
    empty.mkdir()
    code = main(["index-specs", "--root", str(empty), "--out", str(tmp_path / "s.yaml")])
    assert code == EXIT_HARD_FAILURE
