"""Schema validator for GLOSSARY.yaml.

The frozen schema is documented in templates/glossary.schema.yaml (sibling
to this package, in the skill directory). That file is documentation;
this module is the authoritative validator.

Master uses this in Stage 4 (render) to reject sub-agent returns that
violate the schema BEFORE writing to disk. Drift becomes loud, not silent.

Usage:

    from code_glossary.schema import validate_glossary

    errors = validate_glossary(doc_as_dict)
    if errors:
        for err in errors:
            print(f"{err.path}: {err.message}")
        raise ValueError(f"glossary failed schema validation ({len(errors)} errors)")
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from code_glossary.constants import (
    CONFIDENCE_LEVELS,
    ENTRY_KINDS,
    INSTANCE_TYPES,
    SCHEMA_VERSION,
    VERIFICATION_STATUSES,
)


@dataclass(frozen=True)
class ValidationError:
    """One schema violation. Multiple violations collected per validation run."""

    path: str  # e.g. "glossary[2].instances[0].location.file"
    message: str  # human-readable reason


def validate_glossary(doc: Any) -> list[ValidationError]:
    """Validate a glossary document dict against the frozen schema.

    Returns a list of ValidationError. Empty list = valid.

    The validator is strict: extra fields are tolerated (forward compat
    for downstream consumers), but missing required fields, wrong types,
    and rule violations are reported.
    """
    errors: list[ValidationError] = []

    if not isinstance(doc, dict):
        errors.append(ValidationError(path="", message=f"top-level must be a mapping, got {type(doc).__name__}"))
        return errors

    # --- schema_version ---
    sv = doc.get("schema_version")
    if sv is None:
        errors.append(ValidationError(path="schema_version", message="required field missing"))
    elif not isinstance(sv, int):
        errors.append(ValidationError(path="schema_version", message=f"must be int, got {type(sv).__name__}"))
    elif sv != SCHEMA_VERSION:
        errors.append(
            ValidationError(
                path="schema_version",
                message=f"version mismatch: doc has {sv}, validator expects {SCHEMA_VERSION}",
            )
        )

    # --- metadata ---
    meta = doc.get("metadata")
    if meta is None:
        errors.append(ValidationError(path="metadata", message="required field missing"))
    elif not isinstance(meta, dict):
        errors.append(ValidationError(path="metadata", message=f"must be a mapping, got {type(meta).__name__}"))
    else:
        errors.extend(_validate_metadata(meta))

    # --- glossary ---
    g = doc.get("glossary")
    if g is None:
        errors.append(ValidationError(path="glossary", message="required field missing"))
    elif not isinstance(g, list):
        errors.append(ValidationError(path="glossary", message=f"must be a list, got {type(g).__name__}"))
    else:
        seen_ids: set[str] = set()
        for i, entry in enumerate(g):
            path = f"glossary[{i}]"
            if not isinstance(entry, dict):
                errors.append(ValidationError(path=path, message=f"entry must be a mapping, got {type(entry).__name__}"))
                continue
            entry_id = entry.get("id")
            if entry_id in seen_ids and entry_id is not None:
                errors.append(ValidationError(path=f"{path}.id", message=f"duplicate id {entry_id!r}"))
            if entry_id is not None:
                seen_ids.add(entry_id)
            errors.extend(_validate_entry(entry, path))

    return errors


# --- helpers ---

_METADATA_REQUIRED_KEYS = ("generated_at", "scope", "totals")
_METADATA_TOTALS_REQUIRED_KEYS = ("records_indexed", "clusters", "extractable")
_METADATA_SCOPE_REQUIRED_KEYS = ("paths", "excludes", "include_tests")


def _validate_metadata(meta: dict) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for k in _METADATA_REQUIRED_KEYS:
        if k not in meta:
            errors.append(ValidationError(path=f"metadata.{k}", message="required field missing"))
    scope = meta.get("scope")
    if isinstance(scope, dict):
        for k in _METADATA_SCOPE_REQUIRED_KEYS:
            if k not in scope:
                errors.append(ValidationError(path=f"metadata.scope.{k}", message="required field missing"))
    elif "scope" in meta:
        errors.append(ValidationError(path="metadata.scope", message="must be a mapping"))
    totals = meta.get("totals")
    if isinstance(totals, dict):
        for k in _METADATA_TOTALS_REQUIRED_KEYS:
            if k not in totals:
                errors.append(ValidationError(path=f"metadata.totals.{k}", message="required field missing"))
            elif not isinstance(totals[k], int):
                errors.append(
                    ValidationError(
                        path=f"metadata.totals.{k}",
                        message=f"must be int, got {type(totals[k]).__name__}",
                    )
                )
    elif "totals" in meta:
        errors.append(ValidationError(path="metadata.totals", message="must be a mapping"))
    return errors


_ENTRY_REQUIRED_KEYS = ("id", "name", "description", "extractable", "instances")
_EXTRACTABLE_REQUIRED_KEYS = (
    "canonical_signature",
    "proposed_module",
    "invariant_skeleton",
    "variant_axis",
    "extractability_confidence",
)


def _validate_entry(entry: dict, path: str) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for k in _ENTRY_REQUIRED_KEYS:
        if k not in entry:
            errors.append(ValidationError(path=f"{path}.{k}", message="required field missing"))

    if "id" in entry and not isinstance(entry["id"], str):
        errors.append(ValidationError(path=f"{path}.id", message="must be string"))
    if "name" in entry and not isinstance(entry["name"], str):
        errors.append(ValidationError(path=f"{path}.name", message="must be string"))
    if "description" in entry and not isinstance(entry["description"], str):
        errors.append(ValidationError(path=f"{path}.description", message="must be string"))

    extractable = entry.get("extractable")
    if extractable is not None and not isinstance(extractable, bool):
        errors.append(ValidationError(path=f"{path}.extractable", message=f"must be bool, got {type(extractable).__name__}"))

    kind = entry.get("kind", "leaf")
    if kind not in ENTRY_KINDS:
        errors.append(
            ValidationError(
                path=f"{path}.kind",
                message=f"must be one of {ENTRY_KINDS}; got {kind!r}",
            )
        )
    if kind == "composite":
        composed_of = entry.get("composed_of", [])
        if not isinstance(composed_of, list) or not composed_of:
            errors.append(
                ValidationError(
                    path=f"{path}.composed_of",
                    message="kind == composite requires non-empty composed_of list of gloss-ids",
                )
            )

    if extractable is True:
        for k in _EXTRACTABLE_REQUIRED_KEYS:
            v = entry.get(k)
            if v is None or (isinstance(v, (str, list)) and not v):
                errors.append(
                    ValidationError(
                        path=f"{path}.{k}",
                        message=f"required when extractable is True (got {v!r})",
                    )
                )
        conf = entry.get("extractability_confidence")
        if conf is not None and conf not in CONFIDENCE_LEVELS:
            errors.append(
                ValidationError(
                    path=f"{path}.extractability_confidence",
                    message=f"must be one of {CONFIDENCE_LEVELS}; got {conf!r}",
                )
            )
        va = entry.get("variant_axis")
        if isinstance(va, list):
            for j, ax in enumerate(va):
                errors.extend(_validate_variant_axis(ax, f"{path}.variant_axis[{j}]"))
    elif extractable is False:
        notes = entry.get("notes", "")
        if not isinstance(notes, str) or not notes.strip():
            errors.append(
                ValidationError(
                    path=f"{path}.notes",
                    message="required when extractable is False (explain why)",
                )
            )

    vs = entry.get("verification_status")
    if vs is not None and vs not in VERIFICATION_STATUSES:
        errors.append(
            ValidationError(
                path=f"{path}.verification_status",
                message=f"must be one of {VERIFICATION_STATUSES}; got {vs!r}",
            )
        )

    instances = entry.get("instances")
    if isinstance(instances, list):
        if not instances:
            errors.append(ValidationError(path=f"{path}.instances", message="must contain at least one instance"))
        for j, inst in enumerate(instances):
            errors.extend(_validate_instance(inst, f"{path}.instances[{j}]"))
        if extractable is True and len(instances) < 2:
            errors.append(
                ValidationError(
                    path=f"{path}.instances",
                    message=f"extractable=True requires >=2 instances; got {len(instances)}",
                )
            )
    elif instances is not None:
        errors.append(ValidationError(path=f"{path}.instances", message="must be a list"))

    return errors


_VARIANT_AXIS_REQUIRED_KEYS = ("parameter", "instance_values")


def _validate_variant_axis(ax: Any, path: str) -> list[ValidationError]:
    errors: list[ValidationError] = []
    if not isinstance(ax, dict):
        errors.append(ValidationError(path=path, message=f"must be a mapping, got {type(ax).__name__}"))
        return errors
    for k in _VARIANT_AXIS_REQUIRED_KEYS:
        if k not in ax:
            errors.append(ValidationError(path=f"{path}.{k}", message="required field missing"))
    if "instance_values" in ax and not isinstance(ax["instance_values"], list):
        errors.append(ValidationError(path=f"{path}.instance_values", message="must be a list"))
    return errors


_INSTANCE_LOCATION_REQUIRED_KEYS = ("file", "line")


def _validate_instance(inst: Any, path: str) -> list[ValidationError]:
    errors: list[ValidationError] = []
    if not isinstance(inst, dict):
        errors.append(ValidationError(path=path, message=f"must be a mapping, got {type(inst).__name__}"))
        return errors

    itype = inst.get("instance_type", "function")
    if itype not in INSTANCE_TYPES:
        errors.append(
            ValidationError(
                path=f"{path}.instance_type",
                message=f"must be one of {INSTANCE_TYPES}; got {itype!r}",
            )
        )

    loc = inst.get("source_location") or inst.get("location")
    if loc is None:
        # The schema doc allows top-level file/line as an alternative to nested location;
        # accept either, but require file + line somewhere.
        if "file" not in inst or "line" not in inst:
            errors.append(
                ValidationError(
                    path=f"{path}.source_location",
                    message="required field missing (or top-level file+line)",
                )
            )
    elif not isinstance(loc, dict):
        errors.append(ValidationError(path=f"{path}.source_location", message="must be a mapping"))
    else:
        for k in _INSTANCE_LOCATION_REQUIRED_KEYS:
            if k not in loc:
                errors.append(ValidationError(path=f"{path}.source_location.{k}", message="required field missing"))
        if "line" in loc and not isinstance(loc["line"], int):
            errors.append(ValidationError(path=f"{path}.source_location.line", message="must be int"))
        if itype == "function" and "function" not in loc:
            errors.append(
                ValidationError(
                    path=f"{path}.source_location.function",
                    message="required when instance_type == function",
                )
            )
        if itype == "block" and "parent_function_id" not in loc:
            errors.append(
                ValidationError(
                    path=f"{path}.source_location.parent_function_id",
                    message="required when instance_type == block",
                )
            )
        if itype == "spec" and "task_id" not in loc:
            errors.append(
                ValidationError(
                    path=f"{path}.source_location.task_id",
                    message="required when instance_type == spec",
                )
            )

    body_key = "body_excerpt" if "body_excerpt" in inst else ("verbatim_body" if "verbatim_body" in inst else None)
    if body_key is None:
        errors.append(
            ValidationError(
                path=f"{path}.body_excerpt",
                message="required field missing (body_excerpt or verbatim_body)",
            )
        )
    elif not isinstance(inst[body_key], str) or not inst[body_key].strip():
        errors.append(
            ValidationError(
                path=f"{path}.{body_key}",
                message="must be non-empty string",
            )
        )

    return errors
