"""Shared fixture builders for the dry_refactor test files.

Builds a minimal schema-v1-valid glossary plus a matching on-disk
project tree, so preflight/substrate tests exercise the real contract
(the loader schema-validates — invalid fixtures would fail load).
"""

from __future__ import annotations

from pathlib import Path

import yaml

# Two clone sites the extractable fixture entry points at.
SITE_A_BODY = "def fetch_user(uid):\n    result = api.get('/users/' + uid)\n    return result.json()"
SITE_B_BODY = "def fetch_account(key):\n    payload = api.get('/accounts/' + key)\n    return payload.json()"

SITE_A_LINE = 3
SITE_B_LINE = 3


def make_project(root: Path, crlf: bool = False) -> Path:
    """A tiny target project whose files contain the fixture bodies.

    crlf=True writes Windows line endings to disk — the critical
    substrate case (excerpts are LF; disk may be CRLF; must MATCH).
    """
    src = root / "proj"
    src.mkdir(parents=True, exist_ok=True)
    newline = "\r\n" if crlf else "\n"
    for name, body in (("a.py", SITE_A_BODY), ("b.py", SITE_B_BODY)):
        # Two filler lines above put the def at the recorded line 3.
        content = ("# header" + newline) * 2 + body.replace("\n", newline) + newline
        (src / name).write_bytes(content.encode("utf-8"))
    return src


def make_entry(
    extractable: bool = True,
    confidence: str = "high",
    verification: str = "verified",
    proposed_module: str = "shared/helpers.py",
) -> dict:
    entry: dict = {
        "id": "gloss-001",
        "name": "fetch-entity-from-api",
        "description": "Fetches an entity by key from the API.",
        "kind": "leaf",
        "extractable": extractable,
        "extractability_confidence": confidence,
        "verification_status": verification,
        "canonical_signature": "fetch_entity(path_prefix, key)",
        "proposed_module": proposed_module,
        "invariant_skeleton": "result = api.get({path_prefix} + key)\nreturn result.json()",
        "variant_axis": [
            {
                "parameter": "path_prefix",
                "instance_values": ["'/users/'", "'/accounts/'"],
                "inferred_type": "str",
            }
        ],
        "instances": [
            {
                "instance_type": "function",
                "location": {"file": "a.py", "line": SITE_A_LINE, "function": "fetch_user"},
                "body_excerpt": SITE_A_BODY,
                "variant_values": {"path_prefix": "'/users/'"},
                "language_or_format": "python",
            },
            {
                "instance_type": "function",
                "location": {"file": "b.py", "line": SITE_B_LINE, "function": "fetch_account"},
                "body_excerpt": SITE_B_BODY,
                "variant_values": {"path_prefix": "'/accounts/'"},
                "language_or_format": "python",
            },
        ],
    }
    if not extractable:
        entry["notes"] = "Not extractable in this fixture."
    return entry


def make_glossary_doc(entries: list[dict]) -> dict:
    return {
        "schema_version": 1,
        "generator": "code-glossary",
        "generator_version": "2.2.0",
        "metadata": {
            "generated_at": "2026-06-06T00:00:00Z",
            "mode": "code",
            "scope": {"paths": ["."], "excludes": [], "include_tests": False},
            "totals": {
                "records_indexed": 2,
                "clusters": 1,
                "extractable": sum(1 for e in entries if e.get("extractable")),
            },
        },
        "glossary": entries,
    }


def write_glossary(path: Path, entries: list[dict]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(make_glossary_doc(entries), sort_keys=False, width=4096),
        encoding="utf-8",
    )
    return path
