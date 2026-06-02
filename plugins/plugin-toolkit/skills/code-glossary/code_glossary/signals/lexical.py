"""Lexical signal — body token-set + label kebab-tokens.

The lexical signal is the cheapest-to-compute proxy for "do these
functions talk about the same thing?". Stage 3 clustering walks the
token sets for Jaccard/cosine similarity to find candidate pairs.

Body tokens come from regex word-splitting, filtered to:
    - alphabetic-or-mixed identifier-like tokens of length >= MIN_TOKEN_LEN
    - lowercased for case-insensitive matching
    - Python keywords + common stopwords removed (don't carry signal)
    - identifiers used purely as syntax (self, cls) removed

Label tokens come from kebab-case split of the functionality_label.
Tuple ordering preserved (the verb's position matters semantically).
"""

from __future__ import annotations

import keyword
import re
from typing import Iterable


# Token must be at least this long. 3 catches 'get'/'set'/'add' verbs while
# filtering noise like 'a'/'i'/'x'.
MIN_TOKEN_LEN = 3

# Identifier-like token regex: starts with letter/underscore, followed by
# word chars. Excludes pure-numeric tokens (numerics matter for variant
# detection but live in inline_constants, not the lexical fingerprint).
_TOKEN_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]{1,}\b")

# Tokens to drop because they carry no semantic signal in code.
# Includes Python keywords + common syntax-only identifiers + the most
# universal builtin types/functions whose presence doesn't distinguish
# one functionality from another.
_BASE_STOPWORDS = frozenset({
    # Python syntax identifiers (not in keyword.kwlist but always present)
    "self", "cls",
    # Common parameter conventions
    "args", "kwargs",
    # Builtin types (Python)
    "int", "str", "bool", "float", "bytes", "list", "dict", "tuple",
    "set", "frozenset", "type", "object", "none",
    # Builtin functions that appear everywhere
    "len", "print", "range", "isinstance", "hasattr", "getattr",
    "setattr", "repr", "str", "int", "float", "bool", "list", "dict",
    # Common typing names
    "optional", "any", "union", "callable", "iterable", "iterator",
    "sequence", "mapping",
    # Common boilerplate
    "return", "yield", "raise", "assert",
})

# Python keywords are a built-in stopword source. keyword.kwlist returns
# True/False/None capitalized; lowercase them to match tokenized tokens.
_PY_KEYWORDS = frozenset(k.lower() for k in keyword.kwlist) | frozenset(k.lower() for k in keyword.softkwlist)

STOPWORDS: frozenset[str] = _BASE_STOPWORDS | _PY_KEYWORDS


def tokenize_body(body: str, *, extra_stopwords: Iterable[str] = ()) -> frozenset[str]:
    """Extract the lexical token-set for a function body.

    Returns a frozenset (order-insensitive comparison; Stage 3 uses set ops).
    All tokens are lowercased; stopwords + python keywords are removed.
    """
    if not body:
        return frozenset()
    tokens: set[str] = set()
    extra = frozenset(s.lower() for s in extra_stopwords)
    for match in _TOKEN_RE.findall(body):
        lower = match.lower()
        if len(lower) < MIN_TOKEN_LEN:
            continue
        if lower in STOPWORDS or lower in extra:
            continue
        tokens.add(lower)
    return frozenset(tokens)


def tokenize_label(label: str) -> tuple[str, ...]:
    """Split a kebab-case label into its ordered token tuple.

    Empty label -> empty tuple. Labels are pre-normalized (all-lowercase,
    kebab-case) by the indexer, so this is a simple split.
    """
    if not label:
        return ()
    return tuple(label.split("-"))
