"""Spec-mode Stage 1 adapter — architect task specs -> SpecRecord.

Used by /organize (post-architect, pre-build): clusters task specs from
parallel sub-architects to catch design-level duplication BEFORE build.

Input shape: essense-flow task spec YAML at
`.pipeline/architecture/sprints/<sprint>/tasks/*.yaml`. Two real-world
variants exist in the corpora this was designed against (Scalable
Crowd: 16 sprints; BiananceRepo: 3 sprints) and BOTH are handled:

    variant A (dict contract):           variant B (list contract):
        title: ...                           goal: |
        goal: ...                              multi-line
        test_completion_contract:            test_completion_contract:
          criteria:                            - id: AC-1
            - id: ...                            description: ...
              check: ...                         check: {type: ..., spec: ...}

Specs aren't executable: structural + signature signals are N/A
(DESIGN-V2.md §5 stage 2 table). The lexical/behavioral material is the
description + expected behavior + acceptance criteria text.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Optional

import yaml

from code_glossary.indexer.common import make_record_id, relative_path
from code_glossary.records import SourceLocation, SpecRecord

logger = logging.getLogger(__name__)

# Task spec files live under sprint dirs at this glob, per essense-flow
# architect layout.
TASKS_GLOB = "*/tasks/*.yaml"

# Record IDs use line 1 — a spec file is one unit, there is no
# sub-file position to encode.
_SPEC_LINE = 1


def parse_spec_file(path: Path, *, rel_to: Path | None = None) -> Optional[SpecRecord]:
    """Parse one task spec YAML into a SpecRecord.

    Returns None (logged) when the file is unreadable, not YAML, or has
    no recognizable task identity — Stage 1 is best-effort, the caller's
    report carries the failure count.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        logger.warning("spec_parser: cannot read %s: %s", path, exc)
        return None
    try:
        # Some corpora (BiananceRepo sprint 2+) write task specs as
        # frontmatter + body — a multi-document YAML stream. Merge all
        # mapping documents shallowly (later documents win on conflict).
        documents = [d for d in yaml.safe_load_all(text) if isinstance(d, dict)]
    except yaml.YAMLError as exc:
        logger.warning("spec_parser: invalid YAML %s: %s", path, exc)
        return None
    if not documents:
        logger.warning("spec_parser: %s has no mapping documents", path)
        return None
    doc: dict[str, Any] = {}
    for d in documents:
        doc.update(d)

    task_id = str(doc.get("task_id") or "").strip()
    if not task_id:
        logger.warning("spec_parser: %s has no task_id", path)
        return None

    rel_path = relative_path(path, rel_to)
    description = _derive_description(doc)
    expected_behavior = _derive_expected_behavior(doc)
    criteria = _derive_acceptance_criteria(doc)

    return SpecRecord(
        id=f"spec-{make_record_id(rel_path, _SPEC_LINE)[3:]}",  # fn- prefix -> spec-
        task_id=task_id,
        location=SourceLocation(file=rel_path, line=_SPEC_LINE, task_id=task_id),
        description=description,
        expected_behavior=expected_behavior,
        acceptance_criteria=criteria,
        functionality_label="",  # LLM fills later (organize labeling step)
        inputs=_string_list(doc.get("inputs")),
        outputs=_first_string(doc.get("outputs")),
    )


def index_sprint_specs(
    root: Path | str,
    *,
    rel_to: Path | None = None,
) -> tuple[list[SpecRecord], list[tuple[str, str]]]:
    """Walk a sprints dir (or one sprint dir) and parse every task spec.

    Args:
        root: either `.pipeline/architecture/sprints` (all sprints) or a
              single sprint dir containing `tasks/`
        rel_to: path-normalization root for record locations (defaults
                to root itself)

    Returns:
        (records, failures) — failures as (path, reason) pairs so the
        caller can surface them (never silent).
    """
    root_path = Path(root).resolve()
    if not root_path.is_dir():
        raise NotADirectoryError(f"spec root is not a directory: {root_path}")
    rel_root = Path(rel_to).resolve() if rel_to is not None else root_path

    # Single-sprint dirs have tasks/ directly; multi-sprint roots match
    # the sprint/tasks glob.
    candidates = sorted(root_path.glob(TASKS_GLOB)) or sorted(root_path.glob("tasks/*.yaml"))

    records: list[SpecRecord] = []
    failures: list[tuple[str, str]] = []
    seen_ids: dict[str, str] = {}
    for path in candidates:
        rec = parse_spec_file(path, rel_to=rel_root)
        if rec is None:
            failures.append((str(path), "unparseable or missing task_id"))
            continue
        if rec.id in seen_ids:  # same rel path twice cannot happen; defensive
            failures.append((str(path), f"duplicate record id with {seen_ids[rec.id]}"))
            continue
        seen_ids[rec.id] = str(path)
        records.append(rec)
    return records, failures


# --- field derivation (variant-tolerant) ---


def _derive_description(doc: dict[str, Any]) -> str:
    """title when present (variant A), else the goal's first line."""
    title = doc.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()
    goal = doc.get("goal")
    if isinstance(goal, str) and goal.strip():
        return goal.strip().splitlines()[0].strip()
    return ""


def _derive_expected_behavior(doc: dict[str, Any]) -> str:
    """goal + behavioral_pseudocode (when real, not the 'none' marker)."""
    parts: list[str] = []
    goal = doc.get("goal")
    if isinstance(goal, str) and goal.strip():
        parts.append(goal.strip())
    pseudo = doc.get("behavioral_pseudocode")
    if isinstance(pseudo, str) and pseudo.strip() and not pseudo.strip().startswith("(none"):
        parts.append(pseudo.strip())
    return "\n\n".join(parts)


def _derive_acceptance_criteria(doc: dict[str, Any]) -> list[str]:
    """Flatten both contract shapes to one string per criterion."""
    contract = doc.get("test_completion_contract")
    if isinstance(contract, dict):  # variant A: {criteria: [{id, check}]}
        items = contract.get("criteria", [])
    elif isinstance(contract, list):  # variant B: [{id, description, check{...}}]
        items = contract
    else:
        return []

    out: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        text = _criterion_text(item)
        if text:
            out.append(text)
    return out


def _criterion_text(item: dict[str, Any]) -> str:
    """One human-readable line per criterion, whatever the shape."""
    parts: list[str] = []
    desc = item.get("description")
    if isinstance(desc, str) and desc.strip():
        parts.append(desc.strip())
    check = item.get("check")
    if isinstance(check, str) and check.strip():
        parts.append(check.strip())
    elif isinstance(check, dict):  # variant B: {type, spec}
        spec = check.get("spec")
        if isinstance(spec, str) and spec.strip():
            parts.append(f"[{check.get('type', 'check')}] {spec.strip()}")
    return " — ".join(parts)


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value if isinstance(v, (str, int, float))]
    return []


def _first_string(value: Any) -> Optional[str]:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, list) and value:
        return "; ".join(str(v) for v in value)
    return None
