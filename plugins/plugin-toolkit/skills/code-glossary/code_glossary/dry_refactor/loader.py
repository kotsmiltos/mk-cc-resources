"""Load + validate the glossary input and the refactor config block.

The glossary is the frozen-schema-v1 contract (DESIGN-V2.md Appendix A
"Schema requirements"): every field /dry-refactor consumes is guaranteed
by the schema, so a glossary that validates is a glossary this package
can work with.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from code_glossary.schema import validate_glossary

# Confidence ladder for the min_confidence gate (higher index = stronger).
CONFIDENCE_ORDER: tuple[str, ...] = ("low", "medium", "high")

# Appendix-A defaults for the refactor: config block.
DEFAULT_MIN_CONFIDENCE = "high"
DEFAULT_REQUIRE_VERIFICATION = "verified"
DEFAULT_COMMIT_GRANULARITY = "per_cluster"
DEFAULT_ON_TEST_FAILURE = "rollback_this_site"
DEFAULT_TEST_COMMAND = "auto"
DEFAULT_PAUSE_FOR_REVIEW = True


class GlossaryLoadError(Exception):
    """Input glossary missing, malformed, or schema-invalid."""


class ClusterSelectError(Exception):
    """Requested cluster absent or not an executable extraction."""


@dataclass
class RefactorConfig:
    min_confidence: str = DEFAULT_MIN_CONFIDENCE
    require_verification_status: str = DEFAULT_REQUIRE_VERIFICATION
    commit_granularity: str = DEFAULT_COMMIT_GRANULARITY
    on_test_failure: str = DEFAULT_ON_TEST_FAILURE
    test_command: str = DEFAULT_TEST_COMMAND
    pause_for_review: bool = DEFAULT_PAUSE_FOR_REVIEW


def load_glossary(path: Path | str) -> dict[str, Any]:
    """Read + schema-validate a GLOSSARY.yaml. Raises GlossaryLoadError."""
    p = Path(path)
    if not p.is_file():
        raise GlossaryLoadError(f"glossary not found: {p}")
    try:
        doc = yaml.safe_load(p.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise GlossaryLoadError(f"glossary is not valid YAML: {p}: {exc}") from exc
    if not isinstance(doc, dict) or "glossary" not in doc:
        raise GlossaryLoadError(f"no top-level 'glossary' key: {p}")
    errors = validate_glossary(doc)
    if errors:
        joined = "; ".join(f"{e.path}: {e.message}" for e in errors[:5])
        raise GlossaryLoadError(
            f"glossary fails frozen-schema validation ({len(errors)} error(s)): {joined}"
        )
    return doc


def select_cluster(doc: dict[str, Any], gloss_id: str) -> dict[str, Any]:
    """The entry to refactor. Raises ClusterSelectError when unusable.

    extractable=false entries are refused here (not a preflight gate):
    a non-extractable entry has no canonical_signature / skeleton to
    execute — there is nothing to dry-run.
    """
    entry = next((e for e in doc.get("glossary", []) if e.get("id") == gloss_id), None)
    if entry is None:
        known = [e.get("id") for e in doc.get("glossary", [])][:10]
        raise ClusterSelectError(
            f"no entry with id {gloss_id!r}; first known ids: {known}"
        )
    if not entry.get("extractable", False):
        raise ClusterSelectError(
            f"{gloss_id} is not extractable=true — nothing to execute. "
            "Re-run /code-glossary Pass B if this cluster should promote."
        )
    return entry


def select_all_high_confidence(doc: dict[str, Any]) -> list[dict[str, Any]]:
    """All extractable entries at high confidence (--all-high-confidence)."""
    return [
        e
        for e in doc.get("glossary", [])
        if e.get("extractable", False)
        and e.get("extractability_confidence") == "high"
    ]


def load_refactor_config(config_path: Path | str | None) -> RefactorConfig:
    """The refactor: block of glossary/config.yaml; defaults when absent.

    Unknown keys are ignored; known keys with wrong types fall back to
    defaults loudly via ValueError so a typo'd config never half-applies.
    """
    cfg = RefactorConfig()
    if config_path is None:
        return cfg
    p = Path(config_path)
    if not p.is_file():
        raise GlossaryLoadError(f"config file not found: {p}")
    doc = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    block = doc.get("refactor") or {}
    if not isinstance(block, dict):
        raise GlossaryLoadError(f"refactor: block must be a mapping in {p}")

    if "min_confidence" in block:
        value = block["min_confidence"]
        if value not in CONFIDENCE_ORDER:
            raise GlossaryLoadError(
                f"refactor.min_confidence must be one of {CONFIDENCE_ORDER}, got {value!r}"
            )
        cfg.min_confidence = value
    if "require_verification_status" in block:
        value = block["require_verification_status"]
        if value not in ("verified", "any"):
            raise GlossaryLoadError(
                f"refactor.require_verification_status must be 'verified' or 'any', got {value!r}"
            )
        cfg.require_verification_status = value
    if "commit_granularity" in block:
        cfg.commit_granularity = str(block["commit_granularity"])
    if "on_test_failure" in block:
        cfg.on_test_failure = str(block["on_test_failure"])
    if "test_command" in block:
        cfg.test_command = str(block["test_command"])
    if "pause_for_review" in block:
        cfg.pause_for_review = bool(block["pause_for_review"])
    return cfg


def confidence_at_least(actual: str, minimum: str) -> bool:
    """True when `actual` confidence meets the configured floor."""
    try:
        return CONFIDENCE_ORDER.index(actual) >= CONFIDENCE_ORDER.index(minimum)
    except ValueError:
        return False  # unknown confidence never satisfies a gate
