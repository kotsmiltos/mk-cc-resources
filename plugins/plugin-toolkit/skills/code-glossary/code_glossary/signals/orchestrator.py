"""Signal orchestration — Stage 2 public API.

Given the FunctionRecords from Stage 1, computes a SignalFingerprint per
record by running each of the four deterministic signal extractors:

    1. lexical    (lexical.tokenize_body + tokenize_label)
    2. structural (structural.structural_hash)
    3. signature  (signature.signature_hash)
    5. abstraction (abstraction.compute_abstraction)

Signal 4 (behavioral, "what does this compute?") needs LLM judgment;
it stays None here and gets populated by the orchestration layer
(SKILL.md / Agent dispatch) in a later wave.

Public API:

    from code_glossary.signals import extract_signals
    fingerprints = extract_signals(records)
    # fingerprints[record.id] -> SignalFingerprint
"""

from __future__ import annotations

from typing import Iterable

from code_glossary.records import FunctionRecord, SignalFingerprint
from code_glossary.signals.abstraction import compute_abstraction
from code_glossary.signals.lexical import tokenize_body, tokenize_label
from code_glossary.signals.signature import signature_hash
from code_glossary.signals.structural import structural_hash


def extract_signals(records: Iterable[FunctionRecord]) -> dict[str, SignalFingerprint]:
    """Compute SignalFingerprint per record.

    The abstraction signal needs the full record set up front (it
    cross-references calls against the indexed function names). We
    materialize records into a list to allow the cross-reference pass
    without re-iterating.

    Returns:
        Dict mapping record.id -> SignalFingerprint. Empty input -> empty dict.
    """
    record_list = list(records)
    if not record_list:
        return {}

    abstraction_map = compute_abstraction(record_list)

    out: dict[str, SignalFingerprint] = {}
    for rec in record_list:
        is_composite, composed = abstraction_map.get(rec.id, (False, []))
        fingerprint = SignalFingerprint(
            record_id=rec.id,
            lexical_tokens=tokenize_body(rec.body),
            label_tokens=tokenize_label(rec.functionality_label),
            structural_hash=structural_hash(rec.body, rec.language),
            signature_hash=signature_hash(rec),
            behavioral_statement=None,  # LLM populates later
            is_composite=is_composite,
            composed_of_candidates=composed,
        )
        out[rec.id] = fingerprint
    return out
