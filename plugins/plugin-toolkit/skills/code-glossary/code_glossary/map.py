"""Functionality map — render a GLOSSARY.yaml as a visual + machine index.

Pure consumer of the frozen schema-v1 GLOSSARY.yaml dict (like diff.py —
NOT part of the render/ stage, which consumes in-process dataclasses).
One MAP.md, three sections:

    1. mermaid graph(s) — the human mental map: subgraph per module,
       duplication families / composites / singles visually distinct,
       composed_of edges (cross-module dashed — the reuse signal)
    2. machine index — a fenced yaml block (modules -> entries) a master
       slices per module/file to brief sub-agents on what ALREADY exists
    3. collapsed singles list — inventory without drowning the graph

The graph is the LOSSY human view (node budget); the machine index is
LOSSLESS — every entry appears there exactly once.

Module of an entry = mode of the first group_depth path segments of its
instance files (NOT proposed_module — that is null on non-extractable
entries, the majority in baseline runs).
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from io import StringIO
from typing import Any, Optional

import yaml

# Mermaid readability ceiling — above this the single global graph
# fragments into per-module graphs, and an oversized module truncates.
MAP_NODE_BUDGET = 100

# Singles are excluded from the graph by default (same philosophy as the
# diff: duplication is the signal, inventory churn is noise).
DEFAULT_MIN_INSTANCES = 2

# How many leading path segments form a module group ("src" vs "src/api").
DEFAULT_GROUP_DEPTH = 1

# Module label for entries whose instances carry no usable file path.
_UNKNOWN_MODULE = "(unknown)"


@dataclass
class MapNode:
    """One glossary entry reduced to what the map needs."""

    gloss_id: str
    name: str
    description: str
    kind: str  # leaf | composite
    instance_count: int
    module: str
    files: frozenset[str]
    composed_of: list[str]
    proposed_module: Optional[str]
    extractable: bool
    verification_status: str


@dataclass
class MapModel:
    nodes: list[MapNode] = field(default_factory=list)  # graph-eligible
    singles: list[MapNode] = field(default_factory=list)  # kept out of graph
    modules: dict[str, list[MapNode]] = field(default_factory=dict)
    edges: list[tuple[str, str]] = field(default_factory=list)  # (composite, target)
    total_entries: int = 0
    singles_excluded: int = 0
    overflowed: bool = False
    node_budget: int = MAP_NODE_BUDGET

    @property
    def composites(self) -> int:
        return sum(1 for n in self.nodes if n.kind == "composite")

    @property
    def duplication_families(self) -> int:
        return sum(1 for n in self.nodes if n.kind != "composite" and n.instance_count >= 2)


def _site(inst: dict[str, Any]) -> tuple[str, str]:
    """(file, function) of one instance — v2 nests under 'location', v1 is
    flat. Byte-identical contract to diff._site (parity-tested)."""
    loc = inst.get("location")
    source = loc if isinstance(loc, dict) else inst
    return (str(source.get("file") or ""), str(source.get("function") or ""))


def _entry_files(raw: dict[str, Any]) -> frozenset[str]:
    """All distinct, normalized instance file paths of one entry."""
    return frozenset(
        _site(inst)[0].replace("\\", "/")
        for inst in (raw.get("instances") or [])
        if _site(inst)[0]
    )


def _first_segments(path: str, depth: int) -> str:
    segments = [s for s in path.replace("\\", "/").split("/") if s]
    if len(segments) <= 1:
        # A bare filename has no directory — group under the repo root.
        return "."
    return "/".join(segments[: min(depth, len(segments) - 1)])


def _module_of(files: frozenset[str], depth: int) -> str:
    """Mode of the per-file group keys; sorted-first breaks ties so the
    grouping is deterministic across runs."""
    if not files:
        return _UNKNOWN_MODULE
    counts = Counter(_first_segments(f, depth) for f in files)
    best = max(counts.items(), key=lambda kv: (kv[1], ), default=None)
    top_count = best[1]
    candidates = sorted(k for k, c in counts.items() if c == top_count)
    return candidates[0]


def _node_from_raw(raw: dict[str, Any], depth: int) -> MapNode:
    instances = raw.get("instances") or []
    files = _entry_files(raw)
    return MapNode(
        gloss_id=str(raw.get("id") or ""),
        name=str(raw.get("name") or ""),
        description=str(raw.get("description") or ""),
        kind=str(raw.get("kind") or "leaf"),
        instance_count=len(instances),
        module=_module_of(files, depth),
        files=files,
        composed_of=[str(g) for g in (raw.get("composed_of") or [])],
        proposed_module=raw.get("proposed_module") or None,
        extractable=bool(raw.get("extractable", False)),
        verification_status=str(raw.get("verification_status") or ""),
    )


def build_map_model(
    doc: dict[str, Any],
    *,
    min_instances: int = DEFAULT_MIN_INSTANCES,
    group_depth: int = DEFAULT_GROUP_DEPTH,
    include_singles: bool = False,
    node_budget: int = MAP_NODE_BUDGET,
) -> MapModel:
    """Reduce a parsed GLOSSARY.yaml dict to the map model."""
    entries = doc.get("glossary") or []
    all_nodes = [_node_from_raw(raw, group_depth) for raw in entries]

    model = MapModel(total_entries=len(all_nodes), node_budget=node_budget)
    for node in all_nodes:
        # Composites stay in the graph regardless of instance count —
        # they are edge sources; dropping them hides the composition tree.
        is_graph_node = (
            node.kind == "composite"
            or node.instance_count >= min_instances
            or include_singles
        )
        if is_graph_node and node.instance_count >= 1:
            model.nodes.append(node)
        else:
            model.singles.append(node)
    model.singles_excluded = len(model.singles)

    # Deterministic ordering: modules by name; nodes by (-count, id).
    by_module: dict[str, list[MapNode]] = {}
    for node in model.nodes:
        by_module.setdefault(node.module, []).append(node)
    model.modules = {
        module: sorted(by_module[module], key=lambda n: (-n.instance_count, n.gloss_id))
        for module in sorted(by_module)
    }

    # Edges resolve against ALL entries: a composite pointing at an
    # excluded single still shows the edge (target renders as a stub).
    known_ids = {n.gloss_id for n in all_nodes}
    edges = {
        (node.gloss_id, target)
        for node in model.nodes
        for target in node.composed_of
        if target in known_ids
    }
    model.edges = sorted(edges)

    model.overflowed = len(model.nodes) > node_budget
    return model


# --- mermaid rendering ---


def _mermaid_id(gloss_id: str) -> str:
    """gloss-007 -> gloss007 (mermaid ids must be alphanumeric-ish)."""
    return gloss_id.replace("-", "")


def _mermaid_node_line(node: MapNode) -> str:
    mid = _mermaid_id(node.gloss_id)
    if node.kind == "composite":
        return f'{mid}{{{{"{node.name}"}}}}:::composite'
    if node.instance_count >= 2:
        return f'{mid}["{node.name} ×{node.instance_count}"]:::dup'
    return f'{mid}("{node.name}"):::single'


_MERMAID_CLASSES = (
    "  classDef dup fill:#ffe0b2,stroke:#e65100;\n"
    "  classDef composite fill:#bbdefb,stroke:#0d47a1,stroke-width:2px;\n"
    "  classDef single fill:#f5f5f5,stroke:#bdbdbd,color:#9e9e9e;\n"
)


def _subgraph_id(module: str) -> str:
    return "mod_" + "".join(c if c.isalnum() else "_" for c in module)


def _emit_edges(buf: StringIO, model: MapModel, node_by_id: dict[str, MapNode]) -> None:
    for src, dst in model.edges:
        src_node = node_by_id.get(src)
        dst_node = node_by_id.get(dst)
        cross = (
            src_node is not None
            and dst_node is not None
            and src_node.module != dst_node.module
        )
        arrow = "-.->|cross-module|" if cross else "-->"
        buf.write(f"  {_mermaid_id(src)} {arrow} {_mermaid_id(dst)}\n")


def _stub_targets(model: MapModel, all_by_id: dict[str, MapNode]) -> list[MapNode]:
    """Edge targets that are not graph nodes — rendered as dim stubs so
    composition stays visible even when the leaf was filtered out."""
    graph_ids = {n.gloss_id for n in model.nodes}
    stub_ids = sorted({dst for _src, dst in model.edges if dst not in graph_ids})
    return [all_by_id[s] for s in stub_ids if s in all_by_id]


def _emit_global_graph(buf: StringIO, model: MapModel, all_by_id: dict[str, MapNode]) -> None:
    """One graph, subgraph per module — the default under-budget view."""
    truncated_note = ""
    nodes = model.nodes
    if len(nodes) > model.node_budget:
        kept = sorted(nodes, key=lambda n: (-n.instance_count, n.gloss_id))[: model.node_budget]
        truncated_note = (
            f"\n> Graph truncated: {model.node_budget} of {len(nodes)} nodes shown. "
            "Full inventory in the machine index below.\n"
        )
        nodes = kept
    kept_ids = {n.gloss_id for n in nodes}
    modules: dict[str, list[MapNode]] = {}
    for n in nodes:
        modules.setdefault(n.module, []).append(n)

    buf.write("```mermaid\ngraph TD\n")
    buf.write(_MERMAID_CLASSES)
    for module in sorted(modules):
        members = sorted(modules[module], key=lambda n: (-n.instance_count, n.gloss_id))
        buf.write(f'  subgraph {_subgraph_id(module)}["{module} ({len(members)})"]\n')
        for n in members:
            buf.write(f"    {_mermaid_node_line(n)}\n")
        buf.write("  end\n")
    for stub in _stub_targets(model, all_by_id):
        if stub.gloss_id not in kept_ids:
            buf.write(f'  {_mermaid_id(stub.gloss_id)}("{stub.name}"):::single\n')
    visible_model = MapModel(nodes=nodes, edges=[
        (s, d) for s, d in model.edges if s in kept_ids
    ])
    _emit_edges(buf, visible_model, all_by_id)
    buf.write("```\n")
    if truncated_note:
        buf.write(truncated_note)


def _emit_per_module_graphs(buf: StringIO, model: MapModel, all_by_id: dict[str, MapNode]) -> None:
    """Overflow path: one self-contained mermaid block per module.

    Cross-module edge targets appear as labeled stub nodes inside each
    module's graph, so every graph reads standalone."""
    for module, members in model.modules.items():
        buf.write(f"### {module} ({len(members)} entries)\n\n")
        shown = members
        truncated = ""
        if len(shown) > model.node_budget:
            shown = shown[: model.node_budget]
            truncated = (
                f"\n> Module truncated: {model.node_budget} of {len(members)} "
                "nodes shown. Full set in the machine index below.\n"
            )
        shown_ids = {n.gloss_id for n in shown}
        buf.write("```mermaid\ngraph TD\n")
        buf.write(_MERMAID_CLASSES)
        for n in shown:
            buf.write(f"  {_mermaid_node_line(n)}\n")
        for src, dst in model.edges:
            if src not in shown_ids:
                continue
            target = all_by_id.get(dst)
            if target is None:
                continue
            if dst not in shown_ids:
                # External target stub: keep the composition edge visible.
                buf.write(
                    f'  {_mermaid_id(dst)}("{target.name} — {target.module}"):::single\n'
                )
            cross = target.module != module
            arrow = "-.->|cross-module|" if cross else "-->"
            buf.write(f"  {_mermaid_id(src)} {arrow} {_mermaid_id(dst)}\n")
        buf.write("```\n")
        if truncated:
            buf.write(truncated)
        buf.write("\n")


# --- machine index ---


def _index_entry(node: MapNode) -> dict[str, Any]:
    return {
        "id": node.gloss_id,
        "name": node.name,
        "kind": node.kind,
        "instances": node.instance_count,
        "files": sorted(node.files),
        "composed_of": list(node.composed_of),
        "proposed_module": node.proposed_module,
        "extractable": node.extractable,
    }


def _emit_machine_index(buf: StringIO, model: MapModel) -> None:
    """The lossless, sliceable view: EVERY entry appears exactly once —
    graph nodes under modules:, filtered singles under singles:."""
    payload: dict[str, Any] = {
        "modules": {
            module: [_index_entry(n) for n in members]
            for module, members in model.modules.items()
        },
        "singles": [
            {
                "id": n.gloss_id,
                "name": n.name,
                "module": n.module,
                "files": sorted(n.files),
            }
            for n in sorted(model.singles, key=lambda n: n.gloss_id)
        ],
    }
    buf.write("## Machine index\n\n")
    buf.write(
        "Slice by `module` key or by membership in `files` to brief a "
        "sub-agent on what already exists. Lossless — every glossary "
        "entry appears exactly once (graph nodes under `modules:`, "
        "single-instance leaves under `singles:`).\n\n"
    )
    buf.write("```yaml\n")
    buf.write(yaml.safe_dump(payload, sort_keys=False, allow_unicode=True, width=4096))
    buf.write("```\n\n")


def _emit_singles_list(buf: StringIO, model: MapModel) -> None:
    if not model.singles:
        return
    buf.write("## Single-instance entries\n\n")
    buf.write(f"<details>\n<summary>{len(model.singles)} single-instance entries "
              "(not duplicated; excluded from the graph)</summary>\n\n")
    for n in sorted(model.singles, key=lambda n: n.gloss_id):
        primary = sorted(n.files)[0] if n.files else "?"
        buf.write(f"- {n.gloss_id} {n.name} — {primary}\n")
    buf.write("\n</details>\n")


def render_map_markdown(
    model: MapModel,
    *,
    glossary_label: str,
    per_module_graphs: bool = False,
    draw_graph: bool = True,
) -> str:
    """MAP.md body. Overflow auto-switches to per-module graphs."""
    all_by_id = {n.gloss_id: n for n in [*model.nodes, *model.singles]}
    buf = StringIO()
    buf.write("# Functionality map\n\n")
    buf.write(f"- source: `{glossary_label}`\n")
    buf.write(
        f"- entries: {model.total_entries} total / {len(model.nodes)} in graph "
        f"/ {model.singles_excluded} singles excluded\n"
    )
    buf.write(
        f"- composites: {model.composites} | duplication families: "
        f"{model.duplication_families} | modules: {len(model.modules)} "
        f"| edges: {len(model.edges)}\n\n"
    )
    buf.write(
        "Consult this BEFORE designing or building: rectangles are "
        "duplication families (×N = instance count), hexagons are "
        "composites (arrows = what they orchestrate), dashed arrows "
        "cross module boundaries.\n\n"
    )

    if draw_graph and model.nodes:
        buf.write("## Map\n\n")
        if per_module_graphs or model.overflowed:
            if model.overflowed and not per_module_graphs:
                buf.write(
                    f"> {len(model.nodes)} graph nodes exceed the "
                    f"{model.node_budget}-node budget — rendering one graph "
                    "per module.\n\n"
                )
            _emit_per_module_graphs(buf, model, all_by_id)
        else:
            _emit_global_graph(buf, model, all_by_id)
        buf.write("\n")
    elif draw_graph:
        buf.write("## Map\n\nNo multi-instance or composite functionalities "
                  "to draw — nothing duplicated yet.\n\n")

    _emit_machine_index(buf, model)
    _emit_singles_list(buf, model)
    return buf.getvalue()
