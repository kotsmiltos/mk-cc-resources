"""Stage 2 for spec mode — fingerprints for SpecRecords.

Specs aren't executable, so per DESIGN-V2.md §5 the signal table
reduces to:

    lexical      description + expected behavior + criteria token-set
    structural   N/A (None)
    signature    from declared inputs/outputs when present, else None
    behavioral   LLM (None here; the /organize skill layer fills it)
    abstraction  composite detection via mentions of OTHER task ids in
                 the spec text (a spec that orchestrates two other
                 tasks' functionality is a composite candidate)
"""

from __future__ import annotations

import hashlib
import re
from typing import Iterable

from code_glossary.records import SignalFingerprint, SpecRecord
from code_glossary.signals.lexical import tokenize_body, tokenize_label

_HASH_LEN = 16


def extract_spec_signals(records: Iterable[SpecRecord]) -> dict[str, SignalFingerprint]:
    """Compute SignalFingerprint per spec record.

    Mirrors signals.orchestrator.extract_signals for code mode; the
    abstraction pass needs the full record set (cross-referencing task
    id mentions), hence the materialized list.
    """
    record_list = list(records)
    if not record_list:
        return {}

    # task_id -> record id, for mention scanning. Word-boundary regex per
    # task id; ids are short ('BURST-02'), substring hits would be noise.
    id_patterns = {
        rec.task_id: (rec.id, re.compile(rf"(?<![\w-]){re.escape(rec.task_id)}(?![\w-])"))
        for rec in record_list
        if rec.task_id
    }

    out: dict[str, SignalFingerprint] = {}
    for rec in record_list:
        text = _spec_text(rec)
        mentioned = [
            other_rec_id
            for task_id, (other_rec_id, pattern) in id_patterns.items()
            if task_id != rec.task_id and pattern.search(text)
        ]
        out[rec.id] = SignalFingerprint(
            record_id=rec.id,
            lexical_tokens=tokenize_body(text),
            label_tokens=tokenize_label(rec.functionality_label),
            structural_hash=None,  # specs aren't executable
            signature_hash=_spec_signature_hash(rec),
            behavioral_statement=None,  # LLM populates later
            is_composite=bool(mentioned),
            composed_of_candidates=mentioned,
        )
    return out


def _spec_text(rec: SpecRecord) -> str:
    return "\n".join(
        [rec.description, rec.expected_behavior, *rec.acceptance_criteria]
    )


def _spec_signature_hash(rec: SpecRecord) -> str | None:
    """Contract fingerprint from declared inputs/outputs, when a spec
    has them (most real-world specs don't — then no signal, None)."""
    if not rec.inputs and not rec.outputs:
        return None
    normalized = "|".join(s.strip().lower() for s in rec.inputs)
    normalized += "->" + (rec.outputs or "").strip().lower()
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:_HASH_LEN]
