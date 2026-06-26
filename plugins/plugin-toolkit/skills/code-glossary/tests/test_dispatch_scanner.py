"""Tests for the dispatch scanner (the open-closed measure's eyes) + the
end-to-end JobClass reproduction that is the design's verifiable check.

These run the REAL tree-sitter C# grammar over the jobclass fixture, so they
prove the encoded node types match the grammar (not a hand-built stand-in).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.extensibility import (
    KIND_DECLARATION,
    KIND_DICT_DISPATCH,
    KIND_IF_LADDER,
    KIND_SWITCH,
    Axis,
    build_extensibility_model,
)
from code_glossary.indexer.dispatch_scanner import scan_directory, scan_file

FIXTURE = Path(__file__).parent / "fixtures" / "extensibility" / "jobclass"

pytest.importorskip("tree_sitter_c_sharp")


def test_scan_directory_harvests_jobclass_axis():
    axes, _sites = scan_directory(FIXTURE)
    assert len(axes) == 1
    axis = axes[0]
    assert axis.type_name == "JobClass"
    assert axis.instances == frozenset({"Worker", "Soldier", "Scout"})
    assert axis.source == "intrinsic"
    assert axis.open is False


def test_scan_finds_all_four_kinds():
    _axes, sites = scan_directory(FIXTURE)
    kinds = {(s.file, s.kind) for s in sites}
    assert ("jobs.cs", KIND_DECLARATION) in kinds
    assert ("jobs.cs", KIND_SWITCH) in kinds
    assert ("sim.cs", KIND_SWITCH) in kinds  # the duplicated switch
    assert ("sim.cs", KIND_DICT_DISPATCH) in kinds


def test_jobclass_reproduction_is_four_edits_two_files_with_duplicated_switch():
    """THE VERIFIABLE CHECK: the measure mechanically reproduces the human
    finding from the modularity-drift retro."""
    axes, sites = scan_directory(FIXTURE)
    model = build_extensibility_model(sites, axes)
    finding = next(f for f in model.findings if f.axis.type_name == "JobClass")

    # 4 edits.
    assert finding.edit_count == 4
    # across 2 files.
    assert finding.files == ["jobs.cs", "sim.cs"]
    # including a duplicated switch (two switch sites on the axis).
    switch_sites = [s for s in finding.edit_sites if s.kind == KIND_SWITCH]
    assert len(switch_sites) == 2
    assert {s.file for s in switch_sites} == {"jobs.cs", "sim.cs"}
    # every site is locatable (file:line).
    assert all(s.line > 0 for s in finding.edit_sites)


def test_intrinsic_run_is_advisory_not_a_violation():
    axes, sites = scan_directory(FIXTURE)
    model = build_extensibility_model(sites, axes)
    assert not model.has_violations  # enum not declared open -> measured only


def test_declared_open_axis_gates():
    _axes, sites = scan_directory(FIXTURE)
    declared = [
        Axis(
            type_name="JobClass",
            instances=frozenset({"Worker", "Soldier", "Scout"}),
            open=True,
            source="declared",
        )
    ]
    model = build_extensibility_model(sites, declared)
    assert model.has_violations
    assert model.violations[0].axis.type_name == "JobClass"


def test_if_ladder_detected(tmp_path):
    src = tmp_path / "ladder.cs"
    src.write_text(
        "namespace N {\n"
        "  enum JobClass { Worker, Soldier, Scout }\n"
        "  class X {\n"
        "    int F(JobClass c) {\n"
        "      if (c == JobClass.Worker) return 1;\n"
        "      else if (c == JobClass.Soldier) return 2;\n"
        "      else return 0;\n"
        "    }\n"
        "  }\n"
        "}\n",
        encoding="utf-8",
    )
    axes, sites = scan_file(src, "csharp", rel_to=tmp_path)
    ladders = [s for s in sites if s.kind == KIND_IF_LADDER]
    assert len(ladders) == 1  # one site for the whole chain, not one per rung
    assert {"Worker", "Soldier"} <= ladders[0].instance_labels


def test_single_member_enum_is_not_an_axis(tmp_path):
    src = tmp_path / "one.cs"
    src.write_text("namespace N { enum Solo { Only } }\n", encoding="utf-8")
    axes, sites = scan_file(src, "csharp", rel_to=tmp_path)
    assert axes == []  # nothing to enumerate -> not an axis
    assert sites == []


def test_bare_single_condition_if_is_not_a_dispatch(tmp_path):
    src = tmp_path / "bare.cs"
    src.write_text(
        "namespace N {\n"
        "  enum JobClass { Worker, Soldier, Scout }\n"
        "  class X { int F(JobClass c) { if (c == JobClass.Worker) return 1; return 0; } }\n"
        "}\n",
        encoding="utf-8",
    )
    _axes, sites = scan_file(src, "csharp", rel_to=tmp_path)
    # The enum decl is still a site; the single-condition if is NOT (1 label).
    assert [s.kind for s in sites] == [KIND_DECLARATION]
