"""Structural signal — AST shape hash.

Two functions with structurally-identical bodies (differing only in
variable names, attribute names, and literal constants) produce the
same hash. This is the signal that catches "same logic, renamed" —
clone Type 2 in the code-clone literature.

The structural fingerprint complements the lexical signal:
- lexical: do these talk about the same domain words?
- structural: do these have the same control flow shape?

Both agreeing -> strong cluster signal. Only one agreeing -> weak signal.

Python: stdlib-ast normalize-then-hash (wave 3).
TypeScript/JavaScript/C#: tree-sitter shape hash (wave 6) — the parse
tree is serialized as nested node TYPES only (never node text), so
identifier/literal renames cannot change the hash, while keywords and
operators (anonymous nodes whose type IS their text) are preserved.
Literal nodes additionally collapse to one canonical leaf so '5' vs
"'five'" don't differ (parity with the Python normalizer).

Returns None for unsupported languages.
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
    if language in ("typescript", "javascript", "csharp"):
        return _treesitter_structural_hash(body, language)
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


# --- tree-sitter (TypeScript / JavaScript / C#) ---


# A FunctionRecord.body is a snippet ripped out of its file; it may not be
# valid at the top level of a compilation unit (class methods, C# methods
# with access modifiers). Each wrapper re-establishes a legal context.
# Attempt order is fixed, so identical-shape bodies always succeed at the
# same stage and hash identically. {body} is the substitution point.
_SNIPPET_WRAPPERS: dict[str, tuple[str, ...]] = {
    "typescript": ("{body}", "class _W {{ {body} }}", "const _w = {body};"),
    "javascript": ("{body}", "class _W {{ {body} }}", "const _w = {body};"),
    # The property wrapper makes bare accessor bodies ('get { ... }')
    # parse as accessor_declaration — accessors index as records since
    # v2.1 and would otherwise silently lose their structural signal.
    "csharp": ("{body}", "class _W {{ {body} }}", "class _W {{ int _p {{ {body} }} }}"),
}

# Grammar attempt order per language. TSX bodies (JSX syntax) fail under
# the plain typescript grammar, so it is retried with tsx.
_GRAMMAR_ATTEMPTS: dict[str, tuple[str, ...]] = {
    "typescript": ("typescript", "tsx"),
    "javascript": ("typescript", "tsx"),
    "csharp": ("csharp",),
}

# Canonical leaf emitted for every literal node (see module docstring).
_LITERAL_LEAF = "(lit)"


def _treesitter_structural_hash(body: str, language: str) -> Optional[str]:
    """Shape-hash a TS/JS/C# function body via its tree-sitter parse tree."""
    if not body or not body.strip():
        return None
    # Deferred import keeps pure-Python codepaths free of tree-sitter cost
    # and avoids an import cycle at module load (indexer imports signals'
    # consumers; signals importing indexer at call time is safe).
    from code_glossary.indexer.treesitter_parser import (
        FUNCTION_NODE_TYPES,
        LITERAL_NODE_TYPES,
        get_parser,
    )

    function_types = FUNCTION_NODE_TYPES[language]
    literal_types = LITERAL_NODE_TYPES[language]
    source_body = textwrap.dedent(body).strip()

    for grammar in _GRAMMAR_ATTEMPTS[language]:
        try:
            parser = get_parser(grammar)
        except ImportError as exc:  # grammar package missing on this install
            logger.warning("structural: tree-sitter grammar %s unavailable: %s", grammar, exc)
            return None
        for wrapper in _SNIPPET_WRAPPERS[language]:
            snippet = wrapper.format(body=source_body).encode("utf-8")
            func_node = _find_clean_function(parser.parse(snippet).root_node, function_types)
            if func_node is not None:
                canonical = _serialize_shape(func_node, literal_types)
                return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:_HASH_LEN]

    logger.debug("structural: no clean parse for %s body (len=%d)", language, len(body))
    return None


def _find_clean_function(root, function_types: frozenset[str]):
    """First function-defining node whose subtree parsed without errors.

    A wrapper attempt 'succeeds' only when the located function subtree is
    error-free — ERROR/missing nodes inside it mean this parse context was
    wrong and the next wrapper should be tried.
    """
    stack = [root]
    while stack:
        node = stack.pop()
        if node.type in function_types:
            return node if not _has_parse_errors(node) else None
        stack.extend(reversed(node.children))
    return None


def _has_parse_errors(node) -> bool:
    stack = [node]
    while stack:
        n = stack.pop()
        if n.type == "ERROR" or n.is_missing:
            return True
        stack.extend(n.children)
    return False


def _serialize_shape(node, literal_types: frozenset[str]) -> str:
    """Nested-parens serialization of node TYPES (no text).

    Named identifier-ish nodes contribute only their type, so renames
    can't change the hash. Anonymous nodes' type IS their text, which
    keeps operators ('+', '==') and keywords structural. Comments are
    dropped; literal nodes collapse to _LITERAL_LEAF without descending
    (a template string's fragment count must not affect shape).
    """
    if node.type == "comment":
        return ""
    if node.type in literal_types:
        return _LITERAL_LEAF
    if not node.children:
        return f"({node.type})"
    inner = "".join(_serialize_shape(c, literal_types) for c in node.children)
    return f"({node.type}{inner})"
