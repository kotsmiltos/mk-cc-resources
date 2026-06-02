"""Canonical verb vocabulary loader and validator.

The indexer's job (Stage 1) is to assign every function a
functionality_label of the form ``<verb>-<object>[-<qualifier>]``.
The verb MUST come from this controlled vocabulary; this single rule
removes the bulk of the label drift observed in v1's Scalable Crowd
dogfood.

This module loads the vocabulary at import time and exposes:

    - load_vocab(path: Path | None) -> dict[verb, description]
    - is_valid_verb(verb: str, vocab: dict | None = None) -> bool
    - extract_verb(label: str) -> str | None
    - normalize_label(label: str, vocab: dict) -> str  (lowercased + kebab-validated)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import yaml


# Sentinel verb meaning the indexer could not fit a unit into any verb.
# Allowed even when validation is strict; downstream clustering treats it
# as a "needs human review" signal.
UNCLEAR_VERB = "unclear"

# Default vocab ships alongside this module.
_DEFAULT_VOCAB_PATH = Path(__file__).parent / "canonical_verbs.yaml"


@dataclass(frozen=True)
class Vocabulary:
    """Loaded canonical verb vocabulary."""

    version: int
    verbs: dict[str, str]  # verb -> description

    def __contains__(self, verb: str) -> bool:
        return verb in self.verbs or verb == UNCLEAR_VERB

    def describe(self, verb: str) -> Optional[str]:
        return self.verbs.get(verb)


def load_vocab(path: Optional[Path] = None) -> Vocabulary:
    """Load a canonical verb vocabulary from YAML.

    Defaults to the shipped vocabulary if path is None. Raises ValueError
    on malformed input or missing required keys (verb_vocab_version, verbs).
    """
    src_path = path if path is not None else _DEFAULT_VOCAB_PATH
    raw = yaml.safe_load(src_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"vocab file at {src_path} is not a mapping")
    if "verb_vocab_version" not in raw:
        raise ValueError(f"vocab at {src_path} missing required key 'verb_vocab_version'")
    if "verbs" not in raw or not isinstance(raw["verbs"], dict):
        raise ValueError(f"vocab at {src_path} missing required mapping 'verbs'")

    verbs: dict[str, str] = {}
    for verb, desc in raw["verbs"].items():
        if not isinstance(verb, str) or not verb:
            raise ValueError(f"vocab at {src_path} has non-string or empty verb key")
        if not verb.islower() or "-" in verb or " " in verb:
            raise ValueError(
                f"vocab at {src_path} verb {verb!r} must be lowercase and contain no spaces or hyphens"
            )
        if not isinstance(desc, str):
            raise ValueError(f"vocab at {src_path} verb {verb!r} description must be a string")
        verbs[verb] = desc

    return Vocabulary(version=int(raw["verb_vocab_version"]), verbs=verbs)


def is_valid_verb(verb: str, vocab: Optional[Vocabulary] = None) -> bool:
    """Return True iff verb is in the vocab (or is the UNCLEAR sentinel)."""
    if verb == UNCLEAR_VERB:
        return True
    v = vocab if vocab is not None else load_vocab()
    return verb in v.verbs


def extract_verb(label: str) -> Optional[str]:
    """Pull the first kebab-case token from a label.

    Returns None for empty or non-string input. Does NOT validate the
    verb against any vocab (use is_valid_verb for that).
    """
    if not isinstance(label, str) or not label:
        return None
    return label.split("-", 1)[0].lower() if "-" in label else label.lower()


# Real-world labels (Scalable Crowd dogfood) often legitimately need 5-6 tokens
# to capture the full functionality (e.g. "resolve-spatial-hash-grid-geometry").
# Raised from 4 to 6 in v2 after dogfood evidence. Tighter than 7+ keeps the
# label scannable; 6 covers ~92% of observed domain labels.
MAX_LABEL_TOKENS = 6


def normalize_label(label: str, vocab: Vocabulary) -> str:
    """Lowercase + kebab-validate a label.

    Returns the label unchanged on success. Raises ValueError if:
    - empty or non-string
    - contains uppercase, whitespace, underscores, or any non-kebab char
    - verb (first token) is not in vocab
    - label exceeds MAX_LABEL_TOKENS kebab tokens
    """
    if not isinstance(label, str) or not label:
        raise ValueError(f"label must be a non-empty string, got {label!r}")
    if label != label.lower():
        raise ValueError(f"label {label!r} must be lowercase")
    if any(c.isspace() or c == "_" for c in label):
        raise ValueError(f"label {label!r} must not contain whitespace or underscores")
    tokens = label.split("-")
    if len(tokens) > MAX_LABEL_TOKENS:
        raise ValueError(
            f"label {label!r} exceeds {MAX_LABEL_TOKENS} kebab tokens (got {len(tokens)})"
        )
    if any(not t for t in tokens):
        raise ValueError(f"label {label!r} has empty kebab tokens")
    verb = tokens[0]
    if not is_valid_verb(verb, vocab):
        raise ValueError(
            f"label {label!r}: verb {verb!r} not in vocabulary (v{vocab.version}); "
            f"use one of the {len(vocab.verbs)} canonical verbs or the {UNCLEAR_VERB!r} sentinel"
        )
    return label
