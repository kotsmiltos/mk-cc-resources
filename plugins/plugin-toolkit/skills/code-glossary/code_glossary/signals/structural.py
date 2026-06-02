"""Structural signal — AST shape hash.

Two functions with structurally-identical bodies (differing only in
variable names, attribute names, and literal constants) produce the
same hash. This is the signal that catches "same logic, renamed" —
clone Type 2 in the code-clone literature.

The structural fingerprint complements the lexical signal:
- lexical: do these talk about the same domain words?
- structural: do these have the same control flow shape?

Both agreeing -> strong cluster signal. Only one agreeing -> weak signal.

Python only in wave 3. Tree-sitter-based structural hash for TS+C# is
wave 6. Returns None for unsupported languages.
"""

from __future__ import annotations

import ast
import hashlib
import logging
import textwrap
from typing import Optional

logger = logging.getLogger(__name__)


# Placeholder used for stripped identifiers / constants / attribute names.
_PLACEHOLDER = "_"

# Length of the returned hash (sha1 truncated). 16 hex chars = 64 bits;
# collision probability negligible for thousands of records per run.
_HASH_LEN = 16


def structural_hash(body: str, language: str) -> Optional[str]:
    """Compute a structural fingerprint for a function body.

    Args:
        body: verbatim source of one function (including 'def ...' line).
              May include leading indentation (class methods); we dedent.
        language: 'python' | 'typescript' | 'csharp' | ...

    Returns:
        Hex string (length _HASH_LEN), or None if structural hashing
        for this language is not implemented in v2.
    """
    if language == "python":
        return _python_structural_hash(body)
    # tree-sitter-based hashing arrives in wave 6.
    return None


def _python_structural_hash(body: str) -> Optional[str]:
    if not body or not body.strip():
        return None
    dedented = textwrap.dedent(body)
    try:
        tree = ast.parse(dedented)
    except SyntaxError as exc:
        logger.debug("structural: failed to parse body: %s", exc)
        return None

    # Find the function definition (should be the first top-level statement).
    func_node = None
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_node = node
            break
    if func_node is None:
        return None

    normalized = _normalize_python_ast(func_node)
    canonical = ast.dump(normalized, annotate_fields=False)
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:_HASH_LEN]


class _PythonNormalizer(ast.NodeTransformer):
    """Replace identifiers, attribute names, and constant values with placeholders.

    What gets normalized:
        Name.id          -> '_'
        arg.arg          -> '_'   (parameter names dropped; annotations kept)
        Attribute.attr   -> '_'   (e.g., .json, .get all become '_')
        Constant.value   -> '_'   (numeric/string literals become '_')
        FunctionDef.name -> '_'   (function name doesn't affect shape)
        ClassDef.name    -> '_'
        keyword.arg      -> None  (keyword-argument names)
        alias.name       -> '_'   (import names)

    What stays:
        node types, control flow, operators, type annotations,
        call/attribute/subscript shape
    """

    def visit_Name(self, node: ast.Name) -> ast.AST:
        return ast.copy_location(ast.Name(id=_PLACEHOLDER, ctx=node.ctx), node)

    def visit_arg(self, node: ast.arg) -> ast.AST:
        ann = self.visit(node.annotation) if node.annotation else None
        return ast.copy_location(ast.arg(arg=_PLACEHOLDER, annotation=ann), node)

    def visit_Attribute(self, node: ast.Attribute) -> ast.AST:
        value = self.visit(node.value)
        return ast.copy_location(ast.Attribute(value=value, attr=_PLACEHOLDER, ctx=node.ctx), node)

    def visit_Constant(self, node: ast.Constant) -> ast.AST:
        # Preserve kind (str vs int vs None vs bool) via the placeholder type;
        # use a string '_' for everything since we only care about shape here.
        return ast.copy_location(ast.Constant(value=_PLACEHOLDER), node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> ast.AST:
        node = self.generic_visit(node)
        node.name = _PLACEHOLDER
        return node

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> ast.AST:
        node = self.generic_visit(node)
        node.name = _PLACEHOLDER
        return node

    def visit_ClassDef(self, node: ast.ClassDef) -> ast.AST:
        node = self.generic_visit(node)
        node.name = _PLACEHOLDER
        return node

    def visit_keyword(self, node: ast.keyword) -> ast.AST:
        value = self.visit(node.value)
        # arg=None preserves "is-kwarg-call" without binding the name.
        return ast.copy_location(ast.keyword(arg=None, value=value), node)

    def visit_alias(self, node: ast.alias) -> ast.AST:
        return ast.copy_location(ast.alias(name=_PLACEHOLDER, asname=_PLACEHOLDER if node.asname else None), node)


def _normalize_python_ast(node: ast.AST) -> ast.AST:
    """Apply _PythonNormalizer and return the transformed tree."""
    normalizer = _PythonNormalizer()
    return normalizer.visit(ast.parse(ast.unparse(node)))  # unparse + reparse for a fresh tree
