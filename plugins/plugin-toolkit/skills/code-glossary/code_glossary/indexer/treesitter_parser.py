"""Tree-sitter-based function extractor for TypeScript/JavaScript and C#.

Parses one source file using tree-sitter grammars. Returns one
FunctionRecord per discovered function/method, mirroring the semantics
of python_parser so downstream stages treat all languages uniformly:

    - file:line, function name, signature, verbatim body
    - notable_calls (function calls inside the body)
    - notable_inputs (parameter names + types, "name: Type" format —
      the same shape signature.signature_hash expects)
    - notable_outputs (return type if present)
    - inline_constants (literal numbers/strings in the body)

functionality_label and description are left empty (LLM fills later).

Grammar selection: the typescript grammar parses .ts and .js; the tsx
grammar parses .tsx and .jsx (JSX syntax needs it). C# has its own.

Edge cases (mirroring python_parser):
    - Anonymous functions (arrow/function expressions not bound to a
      name) are skipped — same rule as Python lambdas.
    - The body-size floor counts SIGNIFICANT nodes recursively (see the
      counted-set comment below), not top-level statements — fat
      one-liners (`try {...} catch {}`, `return new Config(...)`) index;
      bare assignments/field reads stay out.
    - Expression-bodied members (C# `=> expr`, TS `=> expr` arrows) index
      when the expression contains at least one significant node (call,
      construction, operator); bare field reads (`=> _max`) are skipped.
    - C# property/event accessors index as '<Property>.<kind>' records;
      auto-properties (`get;`) have no body and are skipped.
    - Unreadable files return an empty list (logged, not raised).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterator, Optional

from code_glossary.indexer.common import make_record_id, relative_path
from code_glossary.records import FunctionRecord, SourceLocation

logger = logging.getLogger(__name__)


# Same floor as python_parser.MIN_BODY_STATEMENTS — kept as a separate
# constant so the two parsers can diverge later without coupling.
MIN_BODY_STATEMENTS = 2

# --- significant-statement counting (v2.1 floor rework) ---
#
# The floor is applied to a RECURSIVE count of "significant" nodes in the
# body subtree, not the top-level statement count. Rationale: fat one-liners
# (`try { Register(...); } catch {}`, `return new Config(a, b, c);`) carry
# real logic in their subtree and were the largest recall loss in the
# Scalable Crowd A/B, while bare one-liners (`_x = true;`, `return _max;`)
# stay below the floor because assignments and field reads are deliberately
# NOT in the counted sets. `binary_expression` is the documented tuning
# knob: counting it indexes one-line arithmetic; drop it from the sets if
# corpus noise grows.

_COUNTED_STATEMENTS_TS = frozenset(
    {
        "expression_statement",
        "return_statement",
        "if_statement",
        "for_statement",
        "for_in_statement",
        "while_statement",
        "do_statement",
        "switch_statement",
        "try_statement",
        "throw_statement",
        "lexical_declaration",
        "variable_declaration",
        "labeled_statement",
        "break_statement",
        "continue_statement",
    }
)
_COUNTED_EXPRESSIONS_TS = frozenset(
    {
        "call_expression",
        "new_expression",
        "await_expression",
        "binary_expression",
        "ternary_expression",
    }
)
_COUNTED_TS = _COUNTED_STATEMENTS_TS | _COUNTED_EXPRESSIONS_TS

_COUNTED_STATEMENTS_CS = frozenset(
    {
        "expression_statement",
        "return_statement",
        "if_statement",
        "for_statement",
        "foreach_statement",
        "while_statement",
        "do_statement",
        "switch_statement",
        "try_statement",
        "throw_statement",
        "using_statement",
        "lock_statement",
        "local_declaration_statement",
        "local_function_statement",
        "break_statement",
        "continue_statement",
        "yield_statement",
    }
)
_COUNTED_EXPRESSIONS_CS = frozenset(
    {
        "invocation_expression",
        "object_creation_expression",
        "await_expression",
        "binary_expression",
        "conditional_expression",
    }
)
_COUNTED_CS = _COUNTED_STATEMENTS_CS | _COUNTED_EXPRESSIONS_CS

# C# accessor kinds recognized when indexing accessor_declaration nodes.
_CSHARP_ACCESSOR_KINDS = frozenset({"get", "set", "init", "add", "remove"})

# Trim long literal constants to this many chars (parity with python_parser).
_CONSTANT_MAX_CHARS = 40

# Cap on the callee text we record for one call (defensive: an IIFE's
# callee is the whole function body; that's noise, not a call name).
_CALLEE_MAX_CHARS = 80

# --- node-type tables (verified against tree-sitter-typescript
#     and tree-sitter-c-sharp grammars by parsing real samples) ---

# Function-defining node types that carry their own `name` field.
_TS_NAMED_FUNCTION_TYPES = frozenset(
    {"function_declaration", "generator_function_declaration", "method_definition"}
)
# Function-expression node types that take their name from the binding site.
_TS_EXPRESSION_FUNCTION_TYPES = frozenset({"arrow_function", "function_expression"})

_CSHARP_FUNCTION_TYPES = frozenset(
    {
        "method_declaration",
        "constructor_declaration",
        "local_function_statement",
        # v2.1: property/event accessors index as "<Property>.<kind>" records
        # (e.g. "Agents.get") — guarded getters were a whole missed cluster
        # family (n=7) in the Scalable Crowd A/B.
        "accessor_declaration",
    }
)

# Literal node types collected as inline_constants.
_TS_LITERAL_TYPES = frozenset(
    {"string", "template_string", "number", "true", "false", "null", "undefined", "regex"}
)
_CSHARP_LITERAL_TYPES = frozenset(
    {
        "integer_literal",
        "real_literal",
        "string_literal",
        "verbatim_string_literal",
        "raw_string_literal",
        "character_literal",
        "boolean_literal",
        "null_literal",
    }
)

# Call-expression node types -> the field holding the callee.
_TS_CALL_TYPES = {"call_expression": "function", "new_expression": "constructor"}
_CSHARP_CALL_TYPES = {"invocation_expression": "function", "object_creation_expression": "type"}

# Public: all function-defining node types per record language. Consumed by
# signals.structural to locate the function inside a parsed body snippet
# (including anonymous expressions, whose binding context is lost there).
FUNCTION_NODE_TYPES: dict[str, frozenset[str]] = {
    "typescript": _TS_NAMED_FUNCTION_TYPES | _TS_EXPRESSION_FUNCTION_TYPES,
    "javascript": _TS_NAMED_FUNCTION_TYPES | _TS_EXPRESSION_FUNCTION_TYPES,
    "csharp": _CSHARP_FUNCTION_TYPES,
}

# Public: literal node types per record language. signals.structural
# collapses these to one canonical leaf so literal values never affect
# the shape hash (parity with the Python normalizer's Constant -> '_').
LITERAL_NODE_TYPES: dict[str, frozenset[str]] = {
    "typescript": _TS_LITERAL_TYPES,
    "javascript": _TS_LITERAL_TYPES,
    "csharp": _CSHARP_LITERAL_TYPES,
}


# --- grammar loading (lazy, cached) ---

_parser_cache: dict[str, "object"] = {}


def get_parser(grammar: str):
    """Return a cached tree_sitter.Parser for 'typescript' | 'tsx' | 'csharp'.

    Imports are deferred so that pure-Python codepaths never pay the
    tree-sitter import cost. Raises ImportError loudly if the grammar
    package is missing — the orchestrator treats that as a parse error
    for the file (never a silent skip).
    """
    if grammar in _parser_cache:
        return _parser_cache[grammar]

    import tree_sitter

    if grammar == "typescript":
        import tree_sitter_typescript as ts_ts

        language = tree_sitter.Language(ts_ts.language_typescript())
    elif grammar == "tsx":
        import tree_sitter_typescript as ts_ts

        language = tree_sitter.Language(ts_ts.language_tsx())
    elif grammar == "csharp":
        import tree_sitter_c_sharp as ts_cs

        language = tree_sitter.Language(ts_cs.language())
    else:
        raise ValueError(f"treesitter_parser: unknown grammar {grammar!r}")

    parser = tree_sitter.Parser(language)
    _parser_cache[grammar] = parser
    return parser


def grammar_for(language: str, suffix: str) -> Optional[str]:
    """Map (record language, file extension) -> grammar name, or None."""
    if language == "csharp":
        return "csharp"
    if language in ("typescript", "javascript"):
        # JSX syntax needs the tsx grammar; plain TS/JS uses typescript.
        return "tsx" if suffix in (".tsx", ".jsx") else "typescript"
    return None


# --- public API ---


def parse_file(
    path: Path,
    language: str,
    *,
    rel_to: Path | None = None,
    min_statements: int = MIN_BODY_STATEMENTS,
) -> list[FunctionRecord]:
    """Parse a TS/JS/C# file and return one FunctionRecord per function.

    Args:
        path: absolute path to the source file
        language: 'typescript' | 'javascript' | 'csharp'
        rel_to: if provided, FunctionRecord.location.file is recorded
                relative to this root; otherwise the absolute path is used

    Returns:
        List of FunctionRecord. Empty list if the file cannot be read
        (errors are logged, not raised — Stage 1 is best-effort).
    """
    grammar = grammar_for(language, path.suffix.lower())
    if grammar is None:
        logger.warning("treesitter_parser: unsupported language %r for %s", language, path)
        return []

    try:
        source = path.read_bytes()
    except OSError as exc:
        logger.warning("treesitter_parser: cannot read %s: %s", path, exc)
        return []

    parser = get_parser(grammar)
    tree = parser.parse(source)

    rel_path = relative_path(path, rel_to)
    records: list[FunctionRecord] = []
    for func_node, name in _iter_functions(tree.root_node, source, language):
        rec = _build_record(func_node, name, source, rel_path, language, min_statements)
        if rec is not None:
            records.append(rec)
    return records


def find_function_nodes(root, source: bytes, language: str) -> list[tuple["object", str]]:
    """Expose (node, name) discovery for reuse (structural hashing)."""
    return list(_iter_functions(root, source, language))


# --- discovery ---


def _iter_functions(root, source: bytes, language: str) -> Iterator[tuple["object", str]]:
    """Yield (function_node, name) for every named function in the tree.

    Includes nested functions and class methods (parity with python_parser's
    ast.walk). Anonymous function expressions are skipped unless bound to
    a name at the assignment/property site.
    """
    is_csharp = language == "csharp"
    stack = [root]
    while stack:
        node = stack.pop()
        # Reverse keeps traversal roughly source-ordered with a stack.
        stack.extend(reversed(node.children))

        if is_csharp:
            if node.type in _CSHARP_FUNCTION_TYPES:
                if node.type == "accessor_declaration":
                    name = _accessor_name(node, source)
                else:
                    name = _field_text(node, "name", source)
                if name:
                    yield node, name
        else:
            if node.type in _TS_NAMED_FUNCTION_TYPES:
                name = _field_text(node, "name", source)
                if name:
                    yield node, name
            elif node.type in _TS_EXPRESSION_FUNCTION_TYPES:
                name = _binding_name(node, source)
                if name:  # anonymous expressions skipped (lambda rule)
                    yield node, name


def _accessor_name(node, source: bytes) -> Optional[str]:
    """Synthetic name for a C# accessor: '<Property>.<kind>' (e.g. 'Agents.get').

    The accessor node itself carries no name field — the kind is an
    anonymous keyword child ('get'/'set'/...), and the property name lives
    two levels up: accessor_declaration -> accessor_list ->
    property_declaration / indexer_declaration / event_declaration.
    Returns None when either part cannot be resolved (defensive: grammar
    variations must skip, never crash Stage 1).
    """
    kind = next((c.type for c in node.children if c.type in _CSHARP_ACCESSOR_KINDS), None)
    if kind is None:
        return None
    accessor_list = node.parent
    holder = accessor_list.parent if accessor_list is not None else None
    if holder is None:
        return None
    prop = _field_text(holder, "name", source)
    if not prop:
        return None
    return f"{prop}.{kind}"


def _binding_name(func_node, source: bytes) -> Optional[str]:
    """Name for an arrow/function expression from its binding site.

    Recognized sites:
        const f = () => {...}        variable_declarator.name
        {f: () => {...}}             pair.key
        class C { f = () => {...} }  public_field_definition / field_definition.property
    Everything else (IIFE, inline callback) is anonymous -> None.
    """
    parent = func_node.parent
    if parent is None:
        return None
    if parent.type == "variable_declarator":
        return _field_text(parent, "name", source)
    if parent.type == "pair":
        return _field_text(parent, "key", source)
    if parent.type in ("public_field_definition", "field_definition"):
        return _field_text(parent, "property", source)
    return None


# --- record construction ---


def _count_significant(body_node, counted: frozenset[str]) -> int:
    """Count significant nodes in a body subtree (see counted-set comment)."""
    return sum(1 for n in _walk(body_node) if n.type in counted)


def _resolve_body_node(node, is_csharp: bool):
    """Return (body_node, is_expression_body) for a function-ish node.

    C# expression-bodied members (`=> expr;`) attach an
    arrow_expression_clause — sometimes via the 'body' field, sometimes as
    a plain child (accessors). TS arrows with expression bodies expose the
    expression directly in the 'body' field.
    """
    body_node = node.child_by_field_name("body")
    if body_node is not None and body_node.type in ("statement_block", "block"):
        return body_node, False
    if is_csharp:
        arrow = body_node if body_node is not None and body_node.type == "arrow_expression_clause" else None
        if arrow is None:
            arrow = next((c for c in node.children if c.type == "arrow_expression_clause"), None)
        return arrow, True
    # TS/JS: a non-block body field is the bare expression of an arrow.
    return body_node, True


def _build_record(
    node,
    name: str,
    source: bytes,
    rel_path: str,
    language: str,
    min_statements: int = MIN_BODY_STATEMENTS,
) -> Optional[FunctionRecord]:
    """Construct a FunctionRecord for one function node, or None if skipped."""
    is_csharp = language == "csharp"
    body_node, is_expression_body = _resolve_body_node(node, is_csharp)
    if body_node is None:
        # No body at all (auto-property accessor `get;`, abstract member).
        return None
    if is_expression_body:
        # Expression bodies use a fixed floor of 1 significant EXPRESSION
        # node: `=> SafeDispose()` (a call) indexes; `=> _max` (bare field
        # read) stays out. Independent of --min-statements by design.
        expr_counted = _COUNTED_EXPRESSIONS_CS if is_csharp else _COUNTED_EXPRESSIONS_TS
        if _count_significant(body_node, expr_counted) < 1:
            return None
    else:
        counted = _COUNTED_CS if is_csharp else _COUNTED_TS
        if _count_significant(body_node, counted) < min_statements:
            return None

    verbatim = _node_text(node, source)
    if not verbatim.strip():
        return None

    line = node.start_point[0] + 1  # tree-sitter rows are 0-indexed
    func_id = make_record_id(rel_path, line)
    location = SourceLocation(file=rel_path, line=line, function=name)

    signature = _build_signature(node, name, body_node, source)
    notable_calls = _collect_calls(body_node, source, is_csharp)
    notable_inputs = _collect_inputs(node, source, is_csharp)
    notable_outputs = _return_type(node, source, is_csharp)
    inline_constants = _collect_constants(body_node, source, is_csharp)

    return FunctionRecord(
        id=func_id,
        location=location,
        signature=signature,
        body=verbatim,
        language=language,
        functionality_label="",  # LLM fills later
        description="",  # LLM fills later
        notable_calls=notable_calls,
        notable_inputs=notable_inputs,
        notable_outputs=notable_outputs,
        helper_home_hint=None,  # populated by indexer orchestrator with project context
        inline_constants=inline_constants,
    )


def _build_signature(node, name: str, body_node, source: bytes) -> str:
    """One-line signature: the header text from declaration start to body start.

    For declarations/methods this is the natural header
    ('public static string Load(BuildId id, ...)'). For bound function
    expressions the header lacks the name, so we prefix it
    ('fetchUser = async (id: string): Promise<User>').
    """
    if node.type == "accessor_declaration":
        # Accessor headers are just the bare keyword ('get') — the synthetic
        # '<Property>.<kind>' name is the most useful signature we have.
        return name
    header = source[node.start_byte : body_node.start_byte].decode("utf-8", errors="replace")
    header = " ".join(header.split()).rstrip()  # collapse newlines + runs of spaces
    # Drop a trailing arrow TOKEN only (rstrip with a char-set would eat
    # the '>' of a generic return type like Promise<User>).
    if header.endswith("=>"):
        header = header[: -len("=>")].rstrip()
    if node.type in _TS_EXPRESSION_FUNCTION_TYPES:
        return f"{name} = {header}"
    return header


def _collect_calls(body_node, source: bytes, is_csharp: bool) -> list[str]:
    """List unique callee names appearing in the body, in first-seen order."""
    call_types = _CSHARP_CALL_TYPES if is_csharp else _TS_CALL_TYPES
    seen: set[str] = set()
    ordered: list[str] = []
    for child in _walk(body_node):
        field = call_types.get(child.type)
        if field is None:
            continue
        callee_node = child.child_by_field_name(field)
        if callee_node is None:
            continue
        callee = _node_text(callee_node, source)
        if "\n" in callee or len(callee) > _CALLEE_MAX_CHARS:
            continue  # IIFE or pathological callee — noise, not a name
        if child.type in ("new_expression", "object_creation_expression"):
            callee = f"new {callee}"
        if callee not in seen:
            seen.add(callee)
            ordered.append(callee)
    return ordered


def _collect_inputs(node, source: bytes, is_csharp: bool) -> list[str]:
    """List parameters as 'name: Type' / 'name' / '*name' strings.

    The format intentionally matches python_parser output so
    signature.signature_hash treats all languages the same.
    """
    params_node = node.child_by_field_name("parameters")
    if params_node is None:
        return []
    if is_csharp:
        return _collect_csharp_inputs(params_node, source)
    return _collect_ts_inputs(params_node, source)


def _collect_ts_inputs(params_node, source: bytes) -> list[str]:
    out: list[str] = []
    for child in params_node.children:
        if child.type not in ("required_parameter", "optional_parameter"):
            continue
        pattern_node = child.child_by_field_name("pattern")
        if pattern_node is None:
            continue
        if pattern_node.type == "rest_pattern":
            # '...rest' -> '*rest' (python_parser's vararg convention).
            inner = _node_text(pattern_node, source).lstrip(".")
            out.append(f"*{inner}")
            continue
        name = _node_text(pattern_node, source)
        type_node = child.child_by_field_name("type")
        if type_node is not None:
            # type_annotation text is ': string' — strip the leading colon.
            type_text = _node_text(type_node, source).lstrip(": ").strip()
            out.append(f"{name}: {type_text}")
        else:
            out.append(name)
    return out


def _collect_csharp_inputs(params_node, source: bytes) -> list[str]:
    """Handle both shapes the C# grammar produces:

    - regular: parameter(type, name) wrapper nodes
    - `params object[] args`: the grammar flattens this to an anonymous
      'params' keyword + a type node + an identifier directly under
      parameter_list (observed against tree-sitter-c-sharp on real input)
    """
    out: list[str] = []
    pending_params = False  # saw the 'params' keyword, vararg follows
    pending_type: Optional[str] = None  # loose type node awaiting its identifier
    for child in params_node.children:
        if not child.is_named:
            if child.type == "params":
                pending_params = True
            continue
        if child.type == "parameter":
            name = _field_text(child, "name", source) or ""
            type_text = _field_text(child, "type", source)
            # A 'params' modifier may also appear inside the wrapper node.
            has_params_kw = any(c.type == "params" for c in child.children)
            if has_params_kw or pending_params:
                out.append(f"*{name}")
            elif type_text:
                out.append(f"{name}: {type_text}")
            else:
                out.append(name)
            pending_params = False
            pending_type = None
        elif child.type == "identifier" and (pending_params or pending_type is not None):
            name = _node_text(child, source)
            if pending_params:
                out.append(f"*{name}")
            else:
                out.append(f"{name}: {pending_type}")
            pending_params = False
            pending_type = None
        elif child.type != "comment":
            # A loose type node (array_type, predefined_type, ...) whose
            # identifier follows as the next named sibling.
            pending_type = _node_text(child, source)
    return out


def _return_type(node, source: bytes, is_csharp: bool) -> Optional[str]:
    if is_csharp:
        # method_declaration uses field 'returns'; local_function_statement
        # exposes the return type via 'type'. Constructors have neither.
        text = _field_text(node, "returns", source) or _field_text(node, "type", source)
        return text
    type_node = node.child_by_field_name("return_type")
    if type_node is None:
        return None
    return _node_text(type_node, source).lstrip(": ").strip() or None


def _collect_constants(body_node, source: bytes, is_csharp: bool) -> list[str]:
    """List literal constants in the body, first-seen order, trimmed."""
    literal_types = _CSHARP_LITERAL_TYPES if is_csharp else _TS_LITERAL_TYPES
    seen: set[str] = set()
    ordered: list[str] = []
    for child in _walk(body_node):
        if child.type not in literal_types:
            continue
        # Skip container literals' children double-count: template_string
        # contains string fragments but is itself the literal we record.
        text = _node_text(child, source)
        if len(text) > _CONSTANT_MAX_CHARS:
            text = text[:_CONSTANT_MAX_CHARS] + "..."
        if text not in seen:
            seen.add(text)
            ordered.append(text)
    return ordered


# --- small node helpers ---


def _walk(node) -> Iterator:
    stack = [node]
    while stack:
        n = stack.pop()
        stack.extend(reversed(n.children))
        yield n


def _node_text(node, source: bytes) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _field_text(node, field: str, source: bytes) -> Optional[str]:
    child = node.child_by_field_name(field)
    if child is None:
        return None
    return _node_text(child, source)
