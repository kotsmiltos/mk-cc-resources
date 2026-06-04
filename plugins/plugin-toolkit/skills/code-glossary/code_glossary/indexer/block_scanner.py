"""Block-level duplication scanner (v2.1 MVP) — opt-in via --scan-blocks.

Function-level indexing is blind to duplicated SUB-function patterns:
the Scalable Crowd reference glossary carries two block clusters the v2
acceptance could not see by design — function-prologue lifecycle guards
(`if (!_initialized || _disposed) throw ...;`, n=18) and loop-body
prologue guards (`if (agents[i].active == 0) continue;`, n=22).

This scanner is deliberately NOT a general clone-detection engine. It
extracts exactly two window shapes:

    function_prologue — the first K (1..2) statements of a method body
    loop_prologue     — the first statement of a for/foreach/while body

and shape-hashes each window with the SAME node-type serialization the
structural signal uses, so renamed twins collapse to one hash.

False-positive guard (load-bearing): a window qualifies ONLY when it
contains a jump-or-throw (`throw`/`continue`/`break`/`return`) AND a
compound condition (a binary expression — `||`, `&&`, `==` ...).
Without this predicate every bare `if (x) return;` early-out in the
codebase collapses into one giant, un-actionable cluster.

Languages: tree-sitter ones only (C#/TS/JS). Python is out of MVP
scope — both reference block shapes are C#.

Blocks live in their own artifact (block_records.yaml) and their own
clustering pass — they never mix into the function pipeline.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Iterable, Iterator

from code_glossary.indexer.common import make_record_id, relative_path
from code_glossary.indexer.treesitter_parser import (
    LITERAL_NODE_TYPES,
    get_parser,
    grammar_for,
    _iter_functions,
    _node_text,
)
from code_glossary.indexer.walk import iter_source_files
from code_glossary.records import BlockRecord, SourceLocation
from code_glossary.signals.structural import _serialize_shape

logger = logging.getLogger(__name__)


# Languages the scanner understands (tree-sitter grammars only).
SCANNABLE_LANGUAGES = frozenset({"typescript", "javascript", "csharp"})

# Function-prologue windows: first K statements, for each K in this range.
# Capped at 2 — deeper prologues turn the MVP into a clone engine.
PROLOGUE_WINDOW_SIZES = (1, 2)

# Loop bodies: first K statements. K=2 matters in practice — the SC
# skip-guard family reads `AgentState a = _agents[i]; if (a.active == 0)
# continue;`, i.e. a declaration BEFORE the guard; K=1 alone misses it.
LOOP_WINDOW_SIZES = (1, 2)

_LOOP_NODE_TYPES = frozenset(
    {
        "for_statement",
        "foreach_statement",
        "for_in_statement",
        "while_statement",
        "do_statement",
    }
)

# Jump-or-throw node types — one must appear in a qualifying window.
_JUMP_NODE_TYPES = frozenset(
    {"throw_statement", "continue_statement", "break_statement", "return_statement"}
)

# Compound-condition node types — one must appear in a qualifying window.
_CONDITION_NODE_TYPES = frozenset({"binary_expression"})

_SHAPE_HASH_LEN = 16


def scan_directory(
    root: Path | str,
    *,
    excludes: Iterable[str] = (),
    include_tests: bool = False,
) -> list[BlockRecord]:
    """Walk root and scan every supported source file for block windows."""
    root_path = Path(root).resolve()
    blocks: list[BlockRecord] = []
    for path, lang in iter_source_files(root_path, excludes=excludes, include_tests=include_tests):
        if lang not in SCANNABLE_LANGUAGES:
            continue
        try:
            blocks.extend(scan_file(path, lang, rel_to=root_path))
        except Exception as exc:  # pragma: no cover - parser raised unexpectedly
            logger.warning("block_scanner: unexpected error scanning %s: %s", path, exc)
    return blocks


def scan_file(path: Path, language: str, *, rel_to: Path | None = None) -> list[BlockRecord]:
    """Scan one file; return qualifying prologue/loop windows as BlockRecords."""
    grammar = grammar_for(language, path.suffix.lower())
    if grammar is None:
        return []
    try:
        source = path.read_bytes()
    except OSError as exc:
        logger.warning("block_scanner: cannot read %s: %s", path, exc)
        return []

    tree = get_parser(grammar).parse(source)
    rel_path = relative_path(path, rel_to)
    literal_types = LITERAL_NODE_TYPES[language]

    records: list[BlockRecord] = []
    for func_node, func_name in _iter_functions(tree.root_node, source, language):
        body_node = func_node.child_by_field_name("body")
        if body_node is None or body_node.type not in ("statement_block", "block"):
            continue  # expression bodies have no prologue to scan
        parent_id = make_record_id(rel_path, func_node.start_point[0] + 1)

        statements = _named_statements(body_node)
        for k in PROLOGUE_WINDOW_SIZES:
            if len(statements) < k:
                break
            window = statements[:k]
            rec = _build_block(
                window, "function_prologue", k, rel_path, func_name, parent_id, source, language, literal_types
            )
            if rec is not None:
                records.append(rec)

        for loop_body in _iter_loop_bodies(body_node):
            loop_statements = _named_statements(loop_body)
            for k in LOOP_WINDOW_SIZES:
                if len(loop_statements) < k:
                    break
                window = loop_statements[:k]
                rec = _build_block(
                    window, "loop_prologue", k, rel_path, func_name, parent_id, source, language, literal_types
                )
                if rec is not None:
                    records.append(rec)
    return records


# --- window mechanics ---


def _named_statements(block_node) -> list:
    return [c for c in block_node.children if c.is_named and c.type != "comment"]


def _iter_loop_bodies(body_node) -> Iterator:
    """Yield the block body of every loop nested under body_node."""
    stack = [body_node]
    while stack:
        node = stack.pop()
        stack.extend(reversed(node.children))
        if node.type in _LOOP_NODE_TYPES:
            loop_body = node.child_by_field_name("body")
            if loop_body is not None and loop_body.type in ("statement_block", "block"):
                yield loop_body


def _window_qualifies(window: list) -> bool:
    """The false-positive guard: jump-or-throw AND compound condition."""
    has_jump = False
    has_condition = False
    stack = list(window)
    while stack:
        node = stack.pop()
        if node.type in _JUMP_NODE_TYPES:
            has_jump = True
        elif node.type in _CONDITION_NODE_TYPES:
            has_condition = True
        if has_jump and has_condition:
            return True
        stack.extend(node.children)
    return False


def _build_block(
    window: list,
    block_kind: str,
    window_size: int,
    rel_path: str,
    func_name: str,
    parent_id: str,
    source: bytes,
    language: str,
    literal_types: frozenset[str],
):
    if not _window_qualifies(window):
        return None
    line = window[0].start_point[0] + 1
    shape = "".join(_serialize_shape(stmt, literal_types) for stmt in window)
    shape_hash = hashlib.sha1(shape.encode("utf-8")).hexdigest()[:_SHAPE_HASH_LEN]
    body = "\n".join(
        _node_text(stmt, source).replace("\r\n", "\n") for stmt in window
    )
    block_id = _make_block_id(rel_path, line, window_size)
    return BlockRecord(
        id=block_id,
        location=SourceLocation(
            file=rel_path, line=line, function=func_name, parent_function_id=parent_id
        ),
        block_kind=block_kind,
        body=body,
        language=language,
        shape_hash=shape_hash,
        window_size=window_size,
    )


def _make_block_id(rel_path: str, line: int, window_size: int) -> str:
    """Deterministic block id; window_size disambiguates K=1 vs K=2 at one line."""
    h = hashlib.sha1(f"{rel_path}:{line}:w{window_size}".encode("utf-8")).hexdigest()[:8]
    return f"blk-{h}"
