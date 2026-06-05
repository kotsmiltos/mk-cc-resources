"""Abstraction-level signal — leaf vs composite detection.

For each record, scan its notable_calls for names that match other
indexed records' function names. Records that call 2+ other indexed
records get is_composite=True; the matching record IDs go into
composed_of_candidates.

Per DESIGN-V2.md piece 2 (the tree-shaped glossary):
- leaf: does atomic work; does not call other glossary entries
- composite: wraps 2+ glossary entries (the (fetch + extract + compare)
  pattern from the user's intro example)

Per the threshold rule: a single wrapped helper isn't a composite
(it's a trivial wrapper or a renaming). MIN_COMPOSED_OF_LEAVES = 2.

Call-name resolution:
    'foo'           -> match against function_name == 'foo'
    'self.foo'      -> match against function_name == 'foo'
    'requests.get'  -> match against function_name == 'get' (rarely matches)
    'Foo.bar'       -> match against function_name == 'bar'
"""

from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from code_glossary.call_names import leaf_name
from code_glossary.records import FunctionRecord


# A record needs to call at least this many other indexed records to
# qualify as a composite. 2 is the minimum that still distinguishes
# real composites from trivial single-wrapper redirects.
MIN_COMPOSED_OF_LEAVES = 2


def compute_abstraction(records: list[FunctionRecord]) -> dict[str, tuple[bool, list[str]]]:
    """Map each record ID to (is_composite, composed_of_candidates).

    Args:
        records: all FunctionRecords indexed in this run

    Returns:
        Dict keyed by record_id with:
            is_composite: bool
            composed_of_candidates: list of OTHER record IDs this one calls
    """
    # Build name -> [record_id] index, then resolve each record's calls
    # against it. Duplicate names get multiple candidates per call.
    name_to_ids: dict[str, list[str]] = defaultdict(list)
    for rec in records:
        if rec.location.function:
            name_to_ids[rec.location.function].append(rec.id)

    out: dict[str, tuple[bool, list[str]]] = {}
    for rec in records:
        called_ids = _resolve_calls(rec, name_to_ids)
        is_composite = len(called_ids) >= MIN_COMPOSED_OF_LEAVES
        out[rec.id] = (is_composite, called_ids)
    return out


def _resolve_calls(rec: FunctionRecord, name_to_ids: dict[str, list[str]]) -> list[str]:
    """Resolve rec.notable_calls to other indexed record IDs (excludes self)."""
    seen: set[str] = set()
    ordered: list[str] = []
    for call in rec.notable_calls:
        name = leaf_name(call)
        if not name:
            continue
        for candidate_id in name_to_ids.get(name, ()):
            if candidate_id == rec.id:
                continue  # don't count self-call (recursion)
            if candidate_id in seen:
                continue
            seen.add(candidate_id)
            ordered.append(candidate_id)
    return ordered
