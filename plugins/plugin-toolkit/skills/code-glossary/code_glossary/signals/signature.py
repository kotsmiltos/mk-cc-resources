"""Signature signal — hash of normalized input/output type shape.

Two functions with the same contract (same number of params with same types,
same return type) produce the same hash. Catches "same role" overlap — e.g.
two `fetch_X_by_id(id: str) -> Optional[X]` style accessors that look
contractually identical even if their bodies differ.

The signature is normalized before hashing:
    - lowercased
    - whitespace stripped
    - common type aliases collapsed (Optional[X] -> x|none, List[X] -> list[x],
      Tuple[X, ...] -> tuple[x,...], etc.)
    - parameter names dropped (only types matter for the contract)
    - untyped parameters contribute as 'untyped'
    - varargs marked as '*' / '**'
"""

from __future__ import annotations

import hashlib
import re
from typing import Optional

from code_glossary.records import FunctionRecord


_HASH_LEN = 16

# Whitespace collapse.
_WS = re.compile(r"\s+")

# Collapse typing.X to X (e.g., typing.List -> list).
_TYPING_PREFIX_RE = re.compile(r"\btyping\.")


def signature_hash(rec: FunctionRecord) -> Optional[str]:
    """Compute the contract fingerprint for a function record.

    Returns:
        Hex string (length _HASH_LEN). None if the record has neither
        annotated inputs nor an annotated return (no signature signal).
    """
    inputs_norm = _normalize_inputs(rec.notable_inputs)
    output_norm = _normalize_type(rec.notable_outputs) if rec.notable_outputs else "untyped"

    # If everything is untyped, the signature carries no signal.
    if all(p.endswith("untyped") for p in inputs_norm) and output_norm == "untyped":
        return None

    parts = "|".join(inputs_norm) + "->" + output_norm
    return hashlib.sha1(parts.encode("utf-8")).hexdigest()[:_HASH_LEN]


def _normalize_inputs(inputs: list[str]) -> list[str]:
    """Drop parameter names, normalize types, preserve order.

    Inputs come from FunctionRecord.notable_inputs as 'name: Type' strings
    (or 'name' for unannotated, '*name' for varargs, '**name' for kwargs).
    """
    out: list[str] = []
    for raw in inputs:
        out.append(_normalize_input(raw))
    return out


def _normalize_input(raw: str) -> str:
    """Normalize one parameter spec: drop name, keep type marker."""
    raw = raw.strip()
    if not raw:
        return "untyped"
    # Vararg markers.
    if raw.startswith("**"):
        return "**"
    if raw.startswith("*"):
        return "*"
    # "name: Type" -> drop name, normalize type.
    if ":" in raw:
        _name, _, type_part = raw.partition(":")
        return _normalize_type(type_part.strip())
    # Bare name (unannotated).
    return "untyped"


def _normalize_type(type_str: str) -> str:
    """Apply type-name canonicalization."""
    if not type_str:
        return "untyped"
    s = type_str.strip().lower()
    s = _WS.sub("", s)
    s = _TYPING_PREFIX_RE.sub("", s)
    # Expand Optional[...] -> ...|none and Union[...] -> ...| ... | ...
    # using a bracket-balanced rewriter (regex can't handle nested brackets).
    for _ in range(10):
        new_s = _expand_optional(s)
        new_s = _expand_union(new_s)
        if new_s == s:
            break
        s = new_s
    return s


def _find_balanced(s: str, start: int) -> int:
    """Given s[start] == '[', return the index of the matching ']'.

    Returns -1 if not balanced.
    """
    assert s[start] == "["
    depth = 0
    for i in range(start, len(s)):
        c = s[i]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return i
    return -1


def _expand_optional(s: str) -> str:
    """Replace optional[X] -> x|none for any depth of brackets."""
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        # Look for the substring 'optional[' at position i.
        if s.startswith("optional[", i):
            bracket_start = i + len("optional")  # points at '['
            end = _find_balanced(s, bracket_start)
            if end == -1:
                # Unbalanced; bail out and append the rest verbatim.
                out.append(s[i:])
                break
            inner = s[bracket_start + 1:end]
            out.append(inner + "|none")
            i = end + 1
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def _expand_union(s: str) -> str:
    """Replace union[X,Y,Z] -> x|y|z for any depth of brackets."""
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        if s.startswith("union[", i):
            bracket_start = i + len("union")
            end = _find_balanced(s, bracket_start)
            if end == -1:
                out.append(s[i:])
                break
            inner = s[bracket_start + 1:end]
            # Split inner on top-level commas (not commas inside nested brackets).
            parts = _split_top_level_commas(inner)
            out.append("|".join(parts))
            i = end + 1
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def _split_top_level_commas(s: str) -> list[str]:
    """Split on commas that are not inside [] or ()."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for c in s:
        if c in "[(":
            depth += 1
            current.append(c)
        elif c in "])":
            depth -= 1
            current.append(c)
        elif c == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(c)
    if current:
        parts.append("".join(current).strip())
    return parts
