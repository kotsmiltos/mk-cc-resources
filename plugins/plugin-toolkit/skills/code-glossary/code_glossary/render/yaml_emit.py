"""Glossary -> YAML string.

Uses pyyaml's SafeDumper with a custom representer for multi-line
strings (body_excerpt, invariant_skeleton) so they emit as literal
block scalars (``|``) rather than escaped single-line scalars.

Output is schema-conformant by construction (entry_builder produces
schema-valid Glossary instances; the emitter just serializes).
Round-trip is verified in tests: emit -> parse -> validate.
"""

from __future__ import annotations

import dataclasses
from typing import Any

import yaml

from code_glossary.records import Glossary


class _GlossaryDumper(yaml.SafeDumper):
    """Custom dumper with literal block style for multi-line strings."""

    pass


def _represent_str(dumper: yaml.SafeDumper, data: str):
    """Use ``|`` (literal block scalar) for any string containing a newline."""
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


def _represent_none(dumper: yaml.SafeDumper, data):
    """Emit None as 'null' (default is empty) for clarity in output."""
    return dumper.represent_scalar("tag:yaml.org,2002:null", "null")


_GlossaryDumper.add_representer(str, _represent_str)
_GlossaryDumper.add_representer(type(None), _represent_none)


def emit_glossary_yaml(glossary: Glossary) -> str:
    """Serialize a Glossary to a YAML string.

    Returns:
        Multi-line YAML string ready to write to disk.
    """
    doc = _glossary_to_dict(glossary)
    return yaml.dump(
        doc,
        Dumper=_GlossaryDumper,
        sort_keys=False,
        default_flow_style=False,
        allow_unicode=True,
        width=120,
    )


def _glossary_to_dict(glossary: Glossary) -> dict[str, Any]:
    """Convert Glossary dataclass tree to a plain dict for YAML.

    dataclasses.asdict handles nested dataclasses recursively; we
    keep that simple path and only special-case empty containers
    (drop trailing-empty fields to keep output readable).
    """
    raw = dataclasses.asdict(glossary)
    # Reorder top-level keys for stable output: schema_version, generator,
    # generator_version, metadata, glossary.
    ordered: dict[str, Any] = {}
    for k in ("schema_version", "generator", "generator_version", "metadata", "glossary"):
        if k in raw:
            ordered[k] = raw[k]
    # Append any extra fields at the end (forward-compatible).
    for k, v in raw.items():
        if k not in ordered:
            ordered[k] = v
    return _drop_empty(ordered)


_DROP_IF_EMPTY = {
    "composed_of",
    "variant_axis",
    "related_functionalities",
    "notes",  # keep when non-empty; drop empty ones
    "signal_agreement",  # drop empty
    "variant_values",  # drop empty dicts on instances
}


def _drop_empty(node: Any) -> Any:
    """Recursively drop keys whose value is in _DROP_IF_EMPTY AND empty."""
    if isinstance(node, dict):
        cleaned: dict[str, Any] = {}
        for k, v in node.items():
            v_clean = _drop_empty(v)
            if k in _DROP_IF_EMPTY:
                if v_clean in ("", [], {}, None):
                    continue
            cleaned[k] = v_clean
        return cleaned
    if isinstance(node, list):
        return [_drop_empty(item) for item in node]
    return node
