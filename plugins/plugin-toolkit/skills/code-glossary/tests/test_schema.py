"""Tests for the GLOSSARY.yaml schema validator.

Covers:
- happy path (minimal valid doc passes)
- schema_version mismatch caught
- missing required top-level keys caught
- metadata + scope + totals validation
- per-entry required fields
- extractable=True conditional requirements
- extractable=False notes requirement
- composite kind requires composed_of
- instance type + location field requirements
- duplicate gloss-ids caught
- variant_axis structure
"""

import pytest

from code_glossary.constants import SCHEMA_VERSION
from code_glossary.schema import ValidationError, validate_glossary


def _minimal_valid_doc() -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "metadata": {
            "generated_at": "2026-06-01T00:00:00Z",
            "scope": {"paths": ["."], "excludes": [], "include_tests": False},
            "totals": {"records_indexed": 1, "clusters": 1, "extractable": 0},
        },
        "glossary": [
            {
                "id": "gloss-001",
                "name": "init-thing",
                "description": "Initialize a thing.",
                "extractable": False,
                "notes": "single instance; no duplication detected",
                "instances": [
                    {
                        "instance_type": "function",
                        "source_location": {
                            "file": "src/thing.py",
                            "line": 1,
                            "function": "init_thing",
                        },
                        "body_excerpt": "def init_thing(): pass\n",
                    }
                ],
            }
        ],
    }


# --- Happy path ---

def test_minimal_valid_doc_passes():
    errors = validate_glossary(_minimal_valid_doc())
    assert errors == [], f"unexpected errors: {errors}"


def test_extractable_entry_with_full_required_fields_passes():
    doc = _minimal_valid_doc()
    doc["metadata"]["totals"] = {"records_indexed": 2, "clusters": 1, "extractable": 1}
    doc["glossary"] = [
        {
            "id": "gloss-001",
            "name": "compare-date-against-threshold",
            "description": "Check days delta against threshold.",
            "extractable": True,
            "extractability_confidence": "high",
            "canonical_signature": "def is_overdue(d, t, op): ...",
            "proposed_module": "src/utils/date_utils.py",
            "invariant_skeleton": "return (today()-d).days op t",
            "variant_axis": [
                {"parameter": "t", "instance_values": [20, 30], "inferred_type": "int"},
            ],
            "instances": [
                {
                    "instance_type": "function",
                    "source_location": {"file": "src/a.py", "line": 1, "function": "f"},
                    "body_excerpt": "def f(): return True\n",
                },
                {
                    "instance_type": "function",
                    "source_location": {"file": "src/b.py", "line": 1, "function": "g"},
                    "body_excerpt": "def g(): return False\n",
                },
            ],
        }
    ]
    errors = validate_glossary(doc)
    assert errors == [], f"unexpected errors: {errors}"


# --- schema_version ---

def test_schema_version_mismatch_caught():
    doc = _minimal_valid_doc()
    doc["schema_version"] = 999
    errors = validate_glossary(doc)
    assert any(e.path == "schema_version" and "mismatch" in e.message for e in errors)


def test_schema_version_missing_caught():
    doc = _minimal_valid_doc()
    del doc["schema_version"]
    errors = validate_glossary(doc)
    assert any(e.path == "schema_version" and "missing" in e.message for e in errors)


def test_schema_version_wrong_type_caught():
    doc = _minimal_valid_doc()
    doc["schema_version"] = "1"
    errors = validate_glossary(doc)
    assert any(e.path == "schema_version" and "must be int" in e.message for e in errors)


# --- Top-level required keys ---

def test_top_level_not_dict_caught():
    errors = validate_glossary([])
    assert any(e.path == "" and "mapping" in e.message for e in errors)


def test_metadata_missing_caught():
    doc = _minimal_valid_doc()
    del doc["metadata"]
    errors = validate_glossary(doc)
    assert any(e.path == "metadata" and "missing" in e.message for e in errors)


def test_glossary_missing_caught():
    doc = _minimal_valid_doc()
    del doc["glossary"]
    errors = validate_glossary(doc)
    assert any(e.path == "glossary" and "missing" in e.message for e in errors)


def test_glossary_not_list_caught():
    doc = _minimal_valid_doc()
    doc["glossary"] = "not a list"
    errors = validate_glossary(doc)
    assert any(e.path == "glossary" and "must be a list" in e.message for e in errors)


# --- Metadata sub-structure ---

def test_metadata_missing_generated_at_caught():
    doc = _minimal_valid_doc()
    del doc["metadata"]["generated_at"]
    errors = validate_glossary(doc)
    assert any(e.path == "metadata.generated_at" for e in errors)


def test_metadata_scope_missing_paths_caught():
    doc = _minimal_valid_doc()
    del doc["metadata"]["scope"]["paths"]
    errors = validate_glossary(doc)
    assert any(e.path == "metadata.scope.paths" for e in errors)


def test_metadata_totals_wrong_type_caught():
    doc = _minimal_valid_doc()
    doc["metadata"]["totals"]["records_indexed"] = "not-int"
    errors = validate_glossary(doc)
    assert any(e.path == "metadata.totals.records_indexed" and "int" in e.message for e in errors)


# --- Per-entry required fields ---

def test_entry_missing_id_caught():
    doc = _minimal_valid_doc()
    del doc["glossary"][0]["id"]
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].id" for e in errors)


def test_entry_missing_description_caught():
    doc = _minimal_valid_doc()
    del doc["glossary"][0]["description"]
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].description" for e in errors)


def test_entry_extractable_wrong_type_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["extractable"] = "yes"
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].extractable" and "bool" in e.message for e in errors)


def test_duplicate_entry_ids_caught():
    doc = _minimal_valid_doc()
    doc["glossary"].append(dict(doc["glossary"][0]))
    errors = validate_glossary(doc)
    assert any("duplicate id" in e.message for e in errors)


# --- Extractable=True conditional requirements ---

def test_extractable_missing_signature_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0] = {
        "id": "gloss-001",
        "name": "test",
        "description": "test",
        "extractable": True,
        "extractability_confidence": "high",
        # canonical_signature missing
        "proposed_module": "src/x.py",
        "invariant_skeleton": "...",
        "variant_axis": [{"parameter": "p", "instance_values": [1, 2]}],
        "instances": [
            {"instance_type": "function", "source_location": {"file": "a.py", "line": 1, "function": "f"}, "body_excerpt": "x"},
            {"instance_type": "function", "source_location": {"file": "b.py", "line": 1, "function": "g"}, "body_excerpt": "y"},
        ],
    }
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].canonical_signature" for e in errors)


def test_extractable_invalid_confidence_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0] = {
        "id": "gloss-001",
        "name": "test",
        "description": "test",
        "extractable": True,
        "extractability_confidence": "kinda-sure",
        "canonical_signature": "...",
        "proposed_module": "src/x.py",
        "invariant_skeleton": "...",
        "variant_axis": [{"parameter": "p", "instance_values": [1, 2]}],
        "instances": [
            {"instance_type": "function", "source_location": {"file": "a.py", "line": 1, "function": "f"}, "body_excerpt": "x"},
            {"instance_type": "function", "source_location": {"file": "b.py", "line": 1, "function": "g"}, "body_excerpt": "y"},
        ],
    }
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].extractability_confidence" for e in errors)


def test_extractable_with_one_instance_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0] = {
        "id": "gloss-001",
        "name": "test",
        "description": "test",
        "extractable": True,
        "extractability_confidence": "high",
        "canonical_signature": "...",
        "proposed_module": "src/x.py",
        "invariant_skeleton": "...",
        "variant_axis": [{"parameter": "p", "instance_values": [1]}],
        "instances": [
            {"instance_type": "function", "source_location": {"file": "a.py", "line": 1, "function": "f"}, "body_excerpt": "x"},
        ],
    }
    errors = validate_glossary(doc)
    assert any("requires >=2 instances" in e.message for e in errors)


# --- Extractable=False requirements ---

def test_extractable_false_without_notes_caught():
    doc = _minimal_valid_doc()
    del doc["glossary"][0]["notes"]
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].notes" for e in errors)


def test_extractable_false_with_blank_notes_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["notes"] = "   "
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].notes" for e in errors)


# --- Kind & composite ---

def test_kind_invalid_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["kind"] = "bogus"
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].kind" for e in errors)


def test_composite_without_composed_of_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["kind"] = "composite"
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].composed_of" for e in errors)


def test_composite_with_composed_of_passes():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["kind"] = "composite"
    doc["glossary"][0]["composed_of"] = ["gloss-099", "gloss-100"]
    errors = validate_glossary(doc)
    assert errors == [], f"unexpected errors: {errors}"


# --- Instance validation ---

def test_instance_missing_body_excerpt_caught():
    doc = _minimal_valid_doc()
    del doc["glossary"][0]["instances"][0]["body_excerpt"]
    errors = validate_glossary(doc)
    assert any("body_excerpt" in e.path for e in errors)


def test_instance_block_requires_parent_function_id_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["instances"][0] = {
        "instance_type": "block",
        "source_location": {"file": "src/a.py", "line": 1, "function": "f"},
        "body_excerpt": "x",
    }
    errors = validate_glossary(doc)
    assert any("parent_function_id" in e.path for e in errors)


def test_instance_spec_requires_task_id_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["instances"][0] = {
        "instance_type": "spec",
        "source_location": {"file": "tasks/x.yaml", "line": 1},
        "body_excerpt": "task body",
    }
    errors = validate_glossary(doc)
    assert any("task_id" in e.path for e in errors)


def test_instance_function_requires_function_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["instances"][0] = {
        "instance_type": "function",
        "source_location": {"file": "src/a.py", "line": 1},
        "body_excerpt": "x",
    }
    errors = validate_glossary(doc)
    assert any("source_location.function" in e.path for e in errors)


def test_instance_invalid_type_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["instances"][0]["instance_type"] = "weird"
    errors = validate_glossary(doc)
    assert any("instance_type" in e.path for e in errors)


# --- verification_status ---

def test_invalid_verification_status_caught():
    doc = _minimal_valid_doc()
    doc["glossary"][0]["verification_status"] = "made-up"
    errors = validate_glossary(doc)
    assert any(e.path == "glossary[0].verification_status" for e in errors)


def test_valid_verification_status_passes():
    for status in ("verified", "quote_drift_detected", "inconclusive"):
        doc = _minimal_valid_doc()
        doc["glossary"][0]["verification_status"] = status
        errors = validate_glossary(doc)
        assert errors == [], f"status {status!r} should pass; got: {errors}"


# --- ValidationError structure ---

def test_validation_error_is_frozen_dataclass():
    e = ValidationError(path="x.y", message="bad")
    assert e.path == "x.y"
    assert e.message == "bad"
    with pytest.raises(Exception):
        e.path = "z"  # type: ignore[misc]
