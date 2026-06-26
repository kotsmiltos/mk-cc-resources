"""Dispatch-site scanner (solution B) — the open-closed measure's eyes.

Walks source and harvests the two inputs the PURE `extensibility` model needs:

    1. intrinsic axes  — every enum declaration (a closed instance-set the
       language author declared), as an Axis(source='intrinsic').
    2. dispatch sites  — every site that ENUMERATES an axis's instances and so
       must be edited when one is added: the enum declaration itself, switch /
       switch-expression, if-else-if ladders, and dict/map dispatch literals.

This is the IMPURE composition layer (it knows tree-sitter); the model
(`extensibility.py`) stays pure. Same split as block_scanner (impure) vs
coupling (pure). It deliberately does NOT decide what is a violation — it emits
language-level facts; the model + the essense-flow consumers decide.

Binding to an axis is NOT done here: every site carries its raw instance_labels
and the pure model binds by >=2 overlap. So this scanner never needs type
resolution — it just reports the labels each construct names.

LANGUAGE SCOPE (MVP): C# only. C# is the JobClass/colony-sim substrate and the
verifiable check. The per-language extractor split below is the seam TS/JS and
Python slot into next (the model + runner are already language-agnostic).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable, Optional

from code_glossary.extensibility import (
    KIND_DECLARATION,
    KIND_DICT_DISPATCH,
    KIND_IF_LADDER,
    KIND_SWITCH,
    Axis,
    DispatchSite,
)
from code_glossary.indexer.treesitter_parser import get_parser, grammar_for
from code_glossary.indexer.walk import iter_source_files

logger = logging.getLogger(__name__)

# MVP: C# only (see module docstring). TS/JS/Python are the next slot-in.
SCANNABLE_LANGUAGES = frozenset({"csharp"})

# --- C# node types (verified against tree-sitter-c-sharp by parsing real
#     samples this session — see EXTENSIBILITY-MEASURE-DESIGN.md substrate
#     anchors) ---
_CS_ENUM = "enum_declaration"
_CS_ENUM_MEMBER = "enum_member_declaration"
_CS_SWITCH = "switch_statement"
_CS_SWITCH_EXPR = "switch_expression"
_CS_SWITCH_SECTION = "switch_section"
_CS_SWITCH_ARM = "switch_expression_arm"
_CS_IF = "if_statement"
_CS_OBJECT_CREATION = "object_creation_expression"
_CS_INITIALIZER = "initializer_expression"
_CS_MEMBER_ACCESS = "member_access_expression"
_CS_IDENTIFIER = "identifier"
_CS_BINARY = "binary_expression"
_CS_CONSTANT_PATTERN = "constant_pattern"

# Equality operators whose operands name an axis instance in an if-ladder.
_CS_EQUALITY_OPS = frozenset({"==", "!="})

# Function-defining node types whose name labels a site's enclosing context.
_CS_FUNCTION_TYPES = frozenset(
    {"method_declaration", "constructor_declaration", "local_function_statement"}
)


def scan_directory(
    root: Path | str,
    *,
    excludes: Iterable[str] = (),
    include_tests: bool = False,
) -> tuple[list[Axis], list[DispatchSite]]:
    """Walk root; return (intrinsic_axes, dispatch_sites) across all source.

    Axes are deduped by type_name (an enum declared once per name is enough;
    a redeclaration in another file merges instance sets). Sites are not
    deduped — each physical site is a distinct edit.
    """
    root_path = Path(root).resolve()
    axes_by_name: dict[str, set[str]] = {}
    sites: list[DispatchSite] = []
    for path, lang in iter_source_files(root_path, excludes=excludes, include_tests=include_tests):
        if lang not in SCANNABLE_LANGUAGES:
            continue
        try:
            file_axes, file_sites = scan_file(path, lang, rel_to=root_path)
        except Exception as exc:  # pragma: no cover - parser raised unexpectedly
            logger.warning("dispatch_scanner: unexpected error scanning %s: %s", path, exc)
            continue
        for axis in file_axes:
            axes_by_name.setdefault(axis.type_name, set()).update(axis.instances)
        sites.extend(file_sites)
    axes = [
        Axis(type_name=name, instances=frozenset(members), open=False, source="intrinsic")
        for name, members in sorted(axes_by_name.items())
    ]
    return axes, sites


def scan_file(
    path: Path, language: str, *, rel_to: Path | None = None
) -> tuple[list[Axis], list[DispatchSite]]:
    """Scan one file; return its intrinsic axes + dispatch sites."""
    grammar = grammar_for(language, path.suffix.lower())
    if grammar is None:
        return [], []
    try:
        source = path.read_bytes()
    except OSError as exc:
        logger.warning("dispatch_scanner: cannot read %s: %s", path, exc)
        return [], []
    tree = get_parser(grammar).parse(source)
    rel_path = _rel(path, rel_to)
    if language == "csharp":
        return _scan_csharp(tree.root_node, source, rel_path)
    return [], []  # other languages: next slot-in


# --- C# extractor ---------------------------------------------------------


def _scan_csharp(root, source: bytes, rel_path: str) -> tuple[list[Axis], list[DispatchSite]]:
    axes: list[Axis] = []
    sites: list[DispatchSite] = []
    for node in _walk(root):
        if node.type == _CS_ENUM:
            axis, site = _csharp_enum(node, source, rel_path)
            if axis is not None:
                axes.append(axis)
                sites.append(site)
        elif node.type == _CS_SWITCH:
            site = _csharp_switch(node, source, rel_path)
            if site is not None:
                sites.append(site)
        elif node.type == _CS_SWITCH_EXPR:
            site = _csharp_switch_expression(node, source, rel_path)
            if site is not None:
                sites.append(site)
        elif node.type == _CS_IF:
            site = _csharp_if_ladder(node, source, rel_path)
            if site is not None:
                sites.append(site)
        elif node.type == _CS_OBJECT_CREATION:
            site = _csharp_dict(node, source, rel_path)
            if site is not None:
                sites.append(site)
    return axes, sites


def _csharp_enum(node, source, rel_path):
    name = _field_text(node, "name", source)
    if not name:
        return None, None
    members = [
        _child_identifier(m, source)
        for m in _walk(node)
        if m.type == _CS_ENUM_MEMBER
    ]
    members = [m for m in members if m]
    if len(members) < 2:  # a 1-member enum is not an axis (nothing to enumerate)
        return None, None
    line = node.start_point[0] + 1
    labels = frozenset(members)
    axis = Axis(type_name=name, instances=labels, open=False, source="intrinsic")
    site = DispatchSite(
        file=rel_path, line=line, kind=KIND_DECLARATION,
        instance_labels=labels, function=name, language="csharp",
    )
    return axis, site


def _csharp_switch(node, source, rel_path):
    """Case labels of a classic switch statement."""
    labels: set[str] = set()
    for section in (n for n in _walk(node) if n.type == _CS_SWITCH_SECTION):
        for child in section.children:
            label = _label_of_pattern(child, source)
            if label:
                labels.add(label)
    return _site_if_enough(node, labels, KIND_SWITCH, source, rel_path)


def _csharp_switch_expression(node, source, rel_path):
    """Arm patterns of a C# switch expression (`x switch { Worker => ... }`)."""
    labels: set[str] = set()
    for arm in (n for n in _walk(node) if n.type == _CS_SWITCH_ARM):
        for child in arm.children:
            label = _label_of_pattern(child, source)
            if label:
                labels.add(label)
    return _site_if_enough(node, labels, KIND_SWITCH, source, rel_path)


def _csharp_if_ladder(node, source, rel_path):
    """An if-else-if chain whose conditions equality-test axis instances.

    Only the LADDER HEAD counts (its parent is not itself an if_statement), so
    a 3-branch ladder is one site, not three nested ones.
    """
    if node.parent is not None and node.parent.type == _CS_IF:
        return None  # an else-if rung; counted via its head
    labels: set[str] = set()
    for binexpr in (n for n in _walk(node) if n.type == _CS_BINARY):
        if not _is_equality(binexpr, source):
            continue
        # Member-access operands ONLY (`JobClass.Worker`). A bare identifier
        # operand is the discriminant variable (`c`), not an instance label —
        # collecting it would pollute the labels (and fabricate a 2-label site
        # from a single comparison). Bare-identifier enum members via
        # `using static` are a known MVP gap (the member-access form is the
        # standard C# shape).
        for operand in binexpr.children:
            if operand.type == _CS_MEMBER_ACCESS:
                label = _label_of_operand(operand, source)
                if label:
                    labels.add(label)
    return _site_if_enough(node, labels, KIND_IF_LADDER, source, rel_path)


def _csharp_dict(node, source, rel_path):
    """A dict/map initializer: each entry is an inner initializer_expression
    whose first expression is the key. Keys that name axis instances make this
    a dispatch keyed on the axis."""
    initializer = next(
        (c for c in node.children if c.type == _CS_INITIALIZER), None
    )
    if initializer is None:
        return None
    entries = [c for c in initializer.children if c.type == _CS_INITIALIZER]
    if len(entries) < 2:
        return None  # not an entry-list initializer (array/collection of values)
    labels: set[str] = set()
    for entry in entries:
        key = next((c for c in entry.children if c.is_named), None)
        if key is None:
            continue
        label = _label_of_operand(key, source)
        if label:
            labels.add(label)
    return _site_if_enough(initializer, labels, KIND_DICT_DISPATCH, source, rel_path)


# --- shared helpers -------------------------------------------------------


def _site_if_enough(node, labels: set[str], kind: str, source, rel_path):
    """Emit a DispatchSite only when >=2 labels were collected. The pure model
    re-checks overlap against the actual axis set; this is a cheap pre-filter so
    we never emit a site for a single-mention construct (a bare `if (c == X)`)."""
    if len(labels) < 2:
        return None
    return DispatchSite(
        file=rel_path,
        line=node.start_point[0] + 1,
        kind=kind,
        instance_labels=frozenset(labels),
        function=_enclosing_function(node, source),
        language="csharp",
    )


def _label_of_pattern(node, source) -> Optional[str]:
    """Instance label from a switch case-label node (constant_pattern wraps a
    member access or identifier)."""
    if node.type == _CS_CONSTANT_PATTERN:
        inner = next((c for c in node.children if c.is_named), None)
        return _label_of_operand(inner, source) if inner is not None else None
    if node.type in (_CS_MEMBER_ACCESS, _CS_IDENTIFIER):
        return _label_of_operand(node, source)
    return None


def _label_of_operand(node, source) -> Optional[str]:
    """The bare instance name from an operand: the trailing identifier of a
    member access (`JobClass.Worker` -> `Worker`) or a bare identifier."""
    if node is None:
        return None
    if node.type == _CS_MEMBER_ACCESS:
        ids = [c for c in node.children if c.type == _CS_IDENTIFIER]
        return _node_text(ids[-1], source) if ids else None
    if node.type == _CS_IDENTIFIER:
        return _node_text(node, source)
    return None


def _is_equality(binexpr, source) -> bool:
    for child in binexpr.children:
        if not child.is_named and _node_text(child, source) in _CS_EQUALITY_OPS:
            return True
    return False


def _child_identifier(node, source) -> Optional[str]:
    ident = next((c for c in node.children if c.type == _CS_IDENTIFIER), None)
    return _node_text(ident, source) if ident is not None else None


def _enclosing_function(node, source) -> str:
    cur = node.parent
    while cur is not None:
        if cur.type in _CS_FUNCTION_TYPES:
            return _field_text(cur, "name", source) or ""
        cur = cur.parent
    return ""


def _walk(node):
    stack = [node]
    while stack:
        n = stack.pop()
        stack.extend(reversed(n.children))
        yield n


def _node_text(node, source: bytes) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _field_text(node, field: str, source: bytes) -> Optional[str]:
    child = node.child_by_field_name(field)
    return _node_text(child, source) if child is not None else None


def _rel(path: Path, rel_to: Path | None) -> str:
    if rel_to is None:
        return str(path).replace("\\", "/")
    try:
        return str(path.relative_to(rel_to)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")
