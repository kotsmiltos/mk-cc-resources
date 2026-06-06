"""Tests for the functionality map (v2.3 — runner map + code_glossary.map).

Contracts under test: graph = lossy human view (budgeted, singles
excluded); machine index = lossless (every entry exactly once,
safe_load-able); module grouping from instance-file dirs (NOT
proposed_module); v1-flat instance parity with diff's reader;
deterministic output under input shuffle.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from code_glossary.diff import _site as diff_site
from code_glossary.map import (
    DEFAULT_GROUP_DEPTH,
    DEFAULT_MIN_INSTANCES,
    MAP_NODE_BUDGET,
    _site as map_site,
    build_map_model,
    render_map_markdown,
)
from code_glossary.runner import EXIT_HARD_FAILURE, EXIT_OK, main


def _entry(
    eid: str,
    name: str,
    sites: list[tuple[str, str, int]],
    kind: str = "leaf",
    composed_of: list[str] | None = None,
    extractable: bool = False,
    proposed_module: str | None = None,
) -> dict:
    entry = {
        "id": eid,
        "name": name,
        "description": "d",
        "kind": kind,
        "extractable": extractable,
        "verification_status": "verified",
        "instances": [
            {
                "instance_type": "function",
                "location": {"file": f, "line": line, "function": fn},
                "body_excerpt": "x",
                "language_or_format": "python",
            }
            for f, fn, line in sites
        ],
    }
    if composed_of:
        entry["composed_of"] = composed_of
    if proposed_module:
        entry["proposed_module"] = proposed_module
    return entry


def _doc(entries: list[dict]) -> dict:
    return {"schema_version": 1, "glossary": entries}


PAIR = [("src/a.py", "fetch_a", 10), ("src/b.py", "fetch_b", 20)]


# --- model: filtering ---


def test_empty_glossary_builds_empty_model():
    model = build_map_model(_doc([]))
    assert model.nodes == [] and model.singles == []
    assert model.total_entries == 0 and model.edges == []


def test_singles_excluded_from_graph_by_default():
    model = build_map_model(_doc([_entry("gloss-001", "lonely", [("src/a.py", "f", 1)])]))
    assert model.nodes == []
    assert len(model.singles) == 1
    assert model.singles_excluded == 1


def test_include_singles_promotes_to_graph():
    model = build_map_model(
        _doc([_entry("gloss-001", "lonely", [("src/a.py", "f", 1)])]),
        include_singles=True,
    )
    assert len(model.nodes) == 1
    assert model.singles == []


def test_multi_instance_is_graph_node_and_dup_family():
    model = build_map_model(_doc([_entry("gloss-001", "fetch", PAIR)]))
    assert len(model.nodes) == 1
    assert model.duplication_families == 1


def test_single_instance_composite_still_graph_node():
    model = build_map_model(
        _doc([_entry("gloss-001", "orchestrate", [("src/a.py", "go", 1)],
                     kind="composite", composed_of=["gloss-002"])])
    )
    assert len(model.nodes) == 1
    assert model.composites == 1


# --- model: module grouping ---


def test_module_grouping_by_top_segment_depth_1():
    model = build_map_model(_doc([_entry("gloss-001", "fetch", PAIR)]))
    assert model.nodes[0].module == "src"


def test_module_grouping_depth_2():
    sites = [("src/api/a.py", "f", 1), ("src/api/b.py", "g", 1)]
    model = build_map_model(_doc([_entry("gloss-001", "fetch", sites)]), group_depth=2)
    assert model.nodes[0].module == "src/api"


def test_module_is_mode_of_instance_files():
    sites = [("src/a.py", "f", 1), ("src/b.py", "g", 1), ("lib/c.py", "h", 1)]
    model = build_map_model(_doc([_entry("gloss-001", "fetch", sites)]))
    assert model.nodes[0].module == "src"


def test_module_tie_breaks_sorted_first():
    sites = [("zeta/a.py", "f", 1), ("alpha/b.py", "g", 1)]
    model = build_map_model(_doc([_entry("gloss-001", "fetch", sites)]))
    assert model.nodes[0].module == "alpha"


def test_bare_filename_groups_under_repo_root():
    sites = [("main.py", "f", 1), ("util.py", "g", 1)]
    model = build_map_model(_doc([_entry("gloss-001", "fetch", sites)]))
    assert model.nodes[0].module == "."


def test_proposed_module_not_used_for_grouping():
    entry = _entry("gloss-001", "fetch", PAIR, proposed_module="lib/helpers.py")
    model = build_map_model(_doc([entry]))
    assert model.nodes[0].module == "src"
    assert model.nodes[0].proposed_module == "lib/helpers.py"


# --- model: edges ---


def test_composed_of_becomes_edges():
    doc = _doc([
        _entry("gloss-001", "orchestrate", PAIR, kind="composite",
               composed_of=["gloss-002", "gloss-003"]),
        _entry("gloss-002", "fetch", PAIR),
        _entry("gloss-003", "render", PAIR),
    ])
    model = build_map_model(doc)
    assert model.edges == [("gloss-001", "gloss-002"), ("gloss-001", "gloss-003")]


def test_absent_composed_of_key_is_safe():
    raw = _entry("gloss-001", "fetch", PAIR)
    assert "composed_of" not in raw  # _drop_empty parity: key absent on leaves
    model = build_map_model(_doc([raw]))
    assert model.edges == []


def test_edge_to_unknown_id_dropped():
    doc = _doc([
        _entry("gloss-001", "orchestrate", PAIR, kind="composite",
               composed_of=["gloss-999"]),
    ])
    model = build_map_model(doc)
    assert model.edges == []


def test_edge_to_excluded_single_kept():
    doc = _doc([
        _entry("gloss-001", "orchestrate", PAIR, kind="composite",
               composed_of=["gloss-002"]),
        _entry("gloss-002", "helper", [("src/h.py", "h", 1)]),  # single -> not a node
    ])
    model = build_map_model(doc)
    assert model.edges == [("gloss-001", "gloss-002")]


# --- model: misc ---


def test_v1_flat_instance_format_parity():
    flat = {
        "id": "gloss-001",
        "name": "fetch",
        "extractable": False,
        "instances": [
            {"instance_type": "function", "file": f, "line": line, "function": fn}
            for f, fn, line in PAIR
        ],
    }
    model = build_map_model(_doc([flat]))
    assert len(model.nodes) == 1
    assert model.nodes[0].module == "src"
    assert model.nodes[0].files == frozenset({"src/a.py", "src/b.py"})


def test_map_site_matches_diff_site():
    nested = {"location": {"file": "src/a.py", "function": "f"}}
    flat = {"file": "src/a.py", "function": "f"}
    for inst in (nested, flat):
        assert map_site(inst) == diff_site(inst)


def test_overflow_flag_set_above_budget():
    entries = [
        _entry(f"gloss-{i:03d}", f"fn{i}", PAIR) for i in range(1, 6)
    ]
    assert build_map_model(_doc(entries), node_budget=4).overflowed is True
    assert build_map_model(_doc(entries), node_budget=5).overflowed is False


def test_constants():
    assert MAP_NODE_BUDGET == 100
    assert DEFAULT_MIN_INSTANCES == 2
    assert DEFAULT_GROUP_DEPTH == 1


# --- render ---


def _render(doc_entries, **model_kw):
    model = build_map_model(_doc(doc_entries), **model_kw)
    return render_map_markdown(model, glossary_label="test.yaml")


def test_mermaid_block_present_when_graph_drawn():
    md = _render([_entry("gloss-001", "fetch", PAIR)])
    assert "```mermaid" in md
    assert "graph TD" in md


def test_no_graph_omits_mermaid_keeps_index():
    model = build_map_model(_doc([_entry("gloss-001", "fetch", PAIR)]))
    md = render_map_markdown(model, glossary_label="t.yaml", draw_graph=False)
    assert "```mermaid" not in md
    assert "## Machine index" in md


def test_machine_index_parseable_and_lossless():
    doc_entries = [
        _entry("gloss-001", "fetch", PAIR),
        _entry("gloss-002", "lonely", [("lib/x.py", "x", 1)]),
    ]
    md = _render(doc_entries)
    match = re.search(r"```yaml\n(.*?)```", md, re.DOTALL)
    assert match, "machine index yaml fence missing"
    payload = yaml.safe_load(match.group(1))
    module_ids = [e["id"] for ms in payload["modules"].values() for e in ms]
    single_ids = [s["id"] for s in payload["singles"]]
    assert sorted(module_ids + single_ids) == ["gloss-001", "gloss-002"]
    assert payload["modules"]["src"][0]["files"] == ["src/a.py", "src/b.py"]


def test_cross_module_edge_dashed_and_labeled():
    doc_entries = [
        _entry("gloss-001", "orchestrate",
               [("src/a.py", "go", 1), ("src/b.py", "go2", 1)],
               kind="composite", composed_of=["gloss-002"]),
        _entry("gloss-002", "render", [("ui/r.py", "r", 1), ("ui/s.py", "s", 1)]),
    ]
    md = _render(doc_entries)
    assert "-.->|cross-module|" in md


def test_node_styling_classes():
    doc_entries = [
        _entry("gloss-001", "fetch", PAIR),
        _entry("gloss-002", "orchestrate", PAIR, kind="composite",
               composed_of=["gloss-001"]),
    ]
    md = _render(doc_entries)
    assert ':::dup' in md and "×2" in md
    assert ':::composite' in md and "{{" in md


def test_output_deterministic_under_input_shuffle():
    entries = [
        _entry("gloss-003", "c", [("b/x.py", "x", 1), ("b/y.py", "y", 1)]),
        _entry("gloss-001", "a", PAIR),
        _entry("gloss-002", "b", [("a/x.py", "x", 1), ("a/y.py", "y", 1)]),
    ]
    md_fwd = _render(entries)
    md_rev = _render(list(reversed(entries)))
    assert md_fwd == md_rev


def test_overflow_renders_per_module_with_note():
    # 6 nodes in ONE module with budget 4 -> per-module split + truncation.
    entries = [
        _entry(f"gloss-{i:03d}", f"fn{i}",
               [(f"src/m{i}.py", "f", 1), (f"src/n{i}.py", "g", 1)])
        for i in range(1, 7)
    ]
    model = build_map_model(_doc(entries), node_budget=4)
    md = render_map_markdown(model, glossary_label="t.yaml")
    assert model.overflowed
    assert "Module truncated: 4 of 6" in md
    # Lossless index still carries all six.
    payload = yaml.safe_load(re.search(r"```yaml\n(.*?)```", md, re.DOTALL).group(1))
    assert len(payload["modules"]["src"]) == 6


def test_empty_graph_message_when_nothing_duplicated():
    md = _render([_entry("gloss-001", "lonely", [("src/a.py", "f", 1)])])
    assert "nothing duplicated yet" in md.lower()


# --- runner CLI ---


def _write_doc(path: Path, entries: list[dict]) -> None:
    path.write_text(yaml.safe_dump(_doc(entries), sort_keys=False), encoding="utf-8")


def test_runner_map_writes_report_exit_ok(tmp_path: Path, capsys):
    g = tmp_path / "GLOSSARY.yaml"
    out = tmp_path / "MAP.md"
    _write_doc(g, [_entry("gloss-001", "fetch", PAIR)])
    code = main(["map", "--glossary", str(g), "--out", str(out)])
    stdout = capsys.readouterr().out
    assert code == EXIT_OK
    assert out.is_file()
    for key in ("map_md:", "entries_total: 1", "graph_nodes: 1",
                "duplication_families: 1", "overflowed: false"):
        assert key in stdout


def test_runner_map_missing_file_hard_fails(tmp_path: Path):
    code = main([
        "map", "--glossary", str(tmp_path / "ghost.yaml"),
        "--out", str(tmp_path / "MAP.md"),
    ])
    assert code == EXIT_HARD_FAILURE


def test_runner_map_not_a_glossary_hard_fails(tmp_path: Path):
    bogus = tmp_path / "bogus.yaml"
    bogus.write_text("records: []\n", encoding="utf-8")
    code = main(["map", "--glossary", str(bogus), "--out", str(tmp_path / "MAP.md")])
    assert code == EXIT_HARD_FAILURE


def test_runner_map_no_graph_flag(tmp_path: Path, capsys):
    g = tmp_path / "GLOSSARY.yaml"
    out = tmp_path / "MAP.md"
    _write_doc(g, [_entry("gloss-001", "fetch", PAIR)])
    code = main(["map", "--glossary", str(g), "--out", str(out), "--no-graph"])
    capsys.readouterr()
    assert code == EXIT_OK
    assert "```mermaid" not in out.read_text(encoding="utf-8")


def test_runner_map_include_singles_flag(tmp_path: Path, capsys):
    g = tmp_path / "GLOSSARY.yaml"
    out = tmp_path / "MAP.md"
    _write_doc(g, [_entry("gloss-001", "lonely", [("src/a.py", "f", 1)])])
    code = main([
        "map", "--glossary", str(g), "--out", str(out), "--include-singles",
    ])
    stdout = capsys.readouterr().out
    assert code == EXIT_OK
    assert "graph_nodes: 1" in stdout
    assert "singles_excluded: 0" in stdout