"""Python AST-based function extractor.

Parses one .py file using the stdlib ast module. Returns one
FunctionRecord per discovered function/method (including nested
functions inside classes and inside other functions).

This is the deterministic half of Stage 1 — it extracts the structural
facts that don't require LLM judgment:
    - file:line, function name, signature, verbatim body
    - notable_calls (function calls inside the body)
    - notable_inputs (parameter names + types if annotated)
    - notable_outputs (return annotation if present)
    - inline_constants (literal numbers/strings in the body)

functionality_label and description are left empty. Those require LLM
judgment and get filled in by a later orchestrator stage.

Edge cases (per brief):
    - Lambdas: skipped (anonymous, not meaningful units on their own)
    - Functions with body shorter than MIN_BODY_STATEMENTS are skipped
      as likely-trivial pass-throughs
    - SyntaxError on the file: returns empty list (logged via the caller)
"""

from __future__ import annotations

import ast
import logging
from pathlib import Path
from typing import Iterable

from code_glossary.indexer.common import make_record_id, relative_path
from code_glossary.records import FunctionRecord, SourceLocation


# Skip functions whose body has fewer than this many statements
# (per brief: "Functions under 3 lines that are pure pass-throughs"
# are too small to be a meaningful functionality unit). 2 chosen as the
# floor — a getter that just does `return self.x` is 1 statement; a real
# function typically has 2+.
MIN_BODY_STATEMENTS = 2

logger = logging.getLogger(__name__)


def parse_file(path: Path, *, rel_to: Path | None = None) -> list[FunctionRecord]:
    """Parse a Python file and return one FunctionRecord per function.

    Args:
        path: absolute path to the .py file
        rel_to: if provided, FunctionRecord.location.file is recorded
                relative to this root; otherwise the absolute path is used

    Returns:
        List of FunctionRecord. Empty list if the file cannot be read or
        parsed (errors are logged, not raised — Stage 1 is best-effort).
    """
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        logger.warning("indexer: cannot read %s: %s", path, exc)
        return []

    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as exc:
        logger.warning("indexer: cannot parse %s: %s", path, exc)
        return []

    rel_path = relative_path(path, rel_to)
    records: list[FunctionRecord] = []
    for func_node in _iter_functions(tree):
        rec = _build_record(func_node, source, rel_path)
        if rec is not None:
            records.append(rec)
    return records


# --- helpers ---


def _iter_functions(tree: ast.Module) -> Iterable[ast.FunctionDef | ast.AsyncFunctionDef]:
    """Walk a module AST, yielding every function/method definition.

    Includes nested functions and class methods. Skips lambdas (which
    are ast.Lambda, not FunctionDef).
    """
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            yield node


def _build_record(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    source: str,
    rel_path: str,
) -> FunctionRecord | None:
    """Construct a FunctionRecord for one function node, or None if skipped."""
    # Skip too-short bodies (likely pure pass-throughs).
    if len(node.body) < MIN_BODY_STATEMENTS:
        # One-statement bodies that are `return ...` or pure docstrings get filtered.
        return None

    body_segment = ast.get_source_segment(source, node) or ""
    if not body_segment.strip():
        return None

    func_id = make_record_id(rel_path, node.lineno)
    location = SourceLocation(file=rel_path, line=node.lineno, function=node.name)

    signature = _build_signature(node)
    notable_calls = _collect_notable_calls(node)
    notable_inputs = _collect_notable_inputs(node)
    notable_outputs = _build_return_annotation(node)
    inline_constants = _collect_inline_constants(node)

    return FunctionRecord(
        id=func_id,
        location=location,
        signature=signature,
        body=body_segment,
        language="python",
        functionality_label="",  # LLM fills later
        description="",  # LLM fills later
        notable_calls=notable_calls,
        notable_inputs=notable_inputs,
        notable_outputs=notable_outputs,
        helper_home_hint=None,  # populated by indexer orchestrator with project context
        inline_constants=inline_constants,
    )


def _build_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    """Build a one-line signature string from the function node.

    Includes async prefix, name, args (with type annotations + defaults),
    and return annotation when present. Reconstructed from the AST, not
    copied from source — gives a normalized form.
    """
    async_prefix = "async " if isinstance(node, ast.AsyncFunctionDef) else ""
    args_str = _format_arguments(node.args)
    returns_str = ""
    if node.returns is not None:
        returns_str = f" -> {ast.unparse(node.returns)}"
    return f"{async_prefix}def {node.name}({args_str}){returns_str}"


def _format_arguments(args: ast.arguments) -> str:
    """Format an ast.arguments node into a Python-like parameter list."""
    parts: list[str] = []

    # Positional-only args (PEP 570).
    posonly = list(args.posonlyargs)
    if posonly:
        for a in posonly:
            parts.append(_format_arg(a))
        parts.append("/")

    # Regular positional args.
    regular = list(args.args)
    # Defaults align to the END of (posonly + regular).
    all_regular = posonly + regular
    defaults = list(args.defaults)
    default_for: dict[int, ast.expr] = {}
    if defaults:
        # defaults[-1] aligns with all_regular[-1], etc.
        offset = len(all_regular) - len(defaults)
        for i, d in enumerate(defaults):
            default_for[offset + i] = d

    for i, a in enumerate(regular):
        idx_in_all_regular = len(posonly) + i
        default = default_for.get(idx_in_all_regular)
        parts.append(_format_arg(a, default))

    if args.vararg is not None:
        parts.append("*" + _format_arg(args.vararg))
    elif args.kwonlyargs:
        parts.append("*")

    for kw, kw_default in zip(args.kwonlyargs, args.kw_defaults):
        parts.append(_format_arg(kw, kw_default))

    if args.kwarg is not None:
        parts.append("**" + _format_arg(args.kwarg))

    return ", ".join(parts)


def _format_arg(arg: ast.arg, default: ast.expr | None = None) -> str:
    s = arg.arg
    if arg.annotation is not None:
        s += f": {ast.unparse(arg.annotation)}"
    if default is not None:
        s += f"={ast.unparse(default)}"
    return s


def _build_return_annotation(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str | None:
    if node.returns is None:
        return None
    return ast.unparse(node.returns)


def _collect_notable_calls(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    """List unique called names appearing in the body.

    Walks all Call nodes in the function body. Captures the callable
    representation as a dotted name (e.g. 'requests.get', 'self.foo',
    'datetime.now'). Built-ins like 'len', 'str' are included; filter
    in a later stage if noise.
    """
    seen: set[str] = set()
    ordered: list[str] = []
    for child in ast.walk(_body_module(node)):
        if isinstance(child, ast.Call):
            name = _callable_name(child.func)
            if name and name not in seen:
                seen.add(name)
                ordered.append(name)
    return ordered


def _callable_name(node: ast.expr) -> str | None:
    """Build a dotted name from an attribute-or-name expression. None if not representable."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        base = _callable_name(node.value)
        return f"{base}.{node.attr}" if base else node.attr
    if isinstance(node, ast.Call):
        # Chained call like foo()(); name the inner callable.
        return _callable_name(node.func)
    return None


def _collect_notable_inputs(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    """List parameter names with type annotations (when present).

    Includes posonly, regular, kwonly, *args, **kwargs. self/cls
    included for visibility (downstream can filter).
    """
    out: list[str] = []
    for group in (node.args.posonlyargs, node.args.args, node.args.kwonlyargs):
        for a in group:
            if a.annotation is not None:
                out.append(f"{a.arg}: {ast.unparse(a.annotation)}")
            else:
                out.append(a.arg)
    if node.args.vararg is not None:
        out.append(f"*{node.args.vararg.arg}")
    if node.args.kwarg is not None:
        out.append(f"**{node.args.kwarg.arg}")
    return out


def _collect_inline_constants(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    """List literal constants appearing in the body (numbers, strings, bools).

    Useful signal for variant_axis detection later (constants that differ
    between cluster members often become parameters of the extracted helper).
    """
    seen: set[str] = set()
    ordered: list[str] = []
    for child in ast.walk(_body_module(node)):
        if isinstance(child, ast.Constant):
            # Skip docstrings (the first Expr in a body whose value is a Constant str).
            value = child.value
            if value is None or isinstance(value, bool):
                # bool is a subclass of int; check first.
                literal = repr(value)
            elif isinstance(value, (int, float)):
                literal = repr(value)
            elif isinstance(value, str):
                # Trim long strings; keep first 40 chars + marker.
                literal = repr(value if len(value) <= 40 else value[:40] + "...")
            else:
                continue
            if literal not in seen:
                seen.add(literal)
                ordered.append(literal)
    return ordered


def _body_module(node: ast.FunctionDef | ast.AsyncFunctionDef) -> ast.Module:
    """Wrap the function body as a Module for walking (excludes signature)."""
    return ast.Module(body=node.body, type_ignores=[])
