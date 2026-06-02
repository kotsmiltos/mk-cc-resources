"""Smoke tests for the engine dataclasses.

Constructs each record type with minimal args, confirms defaults,
exercises the cross-field invariants. Catches typos and field-renames
before downstream stages (signal extraction, clustering) are built.
"""

import pytest

from code_glossary import (
    SCHEMA_VERSION,
    GENERATOR_NAME,
    GENERATOR_VERSION,
    SourceLocation,
    FunctionRecord,
    SpecRecord,
    SignalFingerprint,
    VariantAxisEntry,
    Instance,
    GlossaryEntry,
    Glossary,
)
from code_glossary.constants import (
    CONFIDENCE_LEVELS,
    VERIFICATION_STATUSES,
    INSTANCE_TYPES,
    ENTRY_KINDS,
    EXTENSION_TO_LANGUAGE,
    FIRST_CLASS_LANGUAGES,
)


# --- Constants sanity ---

def test_schema_version_is_int():
    assert isinstance(SCHEMA_VERSION, int)
    assert SCHEMA_VERSION >= 1


def test_generator_identity_set():
    assert GENERATOR_NAME == "code-glossary"
    assert GENERATOR_VERSION


def test_confidence_levels_match_design():
    # DESIGN-V2.md piece 3: high | medium | low.
    assert CONFIDENCE_LEVELS == ("high", "medium", "low")


def test_verification_statuses_match_design():
    # DESIGN-V2.md section 8.
    assert set(VERIFICATION_STATUSES) == {"verified", "quote_drift_detected", "inconclusive"}


def test_instance_types_match_schema():
    # DESIGN-V2.md section 6 schema.
    assert set(INSTANCE_TYPES) == {"function", "block", "spec"}


def test_entry_kinds_match_design():
    # DESIGN-V2.md piece 2.
    assert set(ENTRY_KINDS) == {"leaf", "composite"}


def test_first_class_languages_match_design():
    # DESIGN-V2.md piece 6.
    assert "python" in FIRST_CLASS_LANGUAGES
    assert "typescript" in FIRST_CLASS_LANGUAGES
    assert "csharp" in FIRST_CLASS_LANGUAGES


def test_extension_map_covers_first_class_languages():
    extensions_for_lang: dict[str, list[str]] = {}
    for ext, lang in EXTENSION_TO_LANGUAGE.items():
        extensions_for_lang.setdefault(lang, []).append(ext)
    for lang in FIRST_CLASS_LANGUAGES:
        assert lang in extensions_for_lang, f"first-class lang {lang} has no file extension mapping"


# --- SourceLocation ---

def test_source_location_minimal():
    loc = SourceLocation(file="src/foo.py", line=42)
    assert loc.file == "src/foo.py"
    assert loc.line == 42
    assert loc.function is None
    assert loc.parent_function_id is None
    assert loc.task_id is None


def test_source_location_function_instance():
    loc = SourceLocation(file="src/foo.py", line=42, function="bar")
    assert loc.function == "bar"


def test_source_location_block_instance():
    loc = SourceLocation(
        file="src/foo.py", line=42, function="bar", parent_function_id="fn-001"
    )
    assert loc.parent_function_id == "fn-001"


def test_source_location_spec_instance():
    loc = SourceLocation(file="tasks/task-042.yaml", line=1, task_id="task-042")
    assert loc.task_id == "task-042"


# --- FunctionRecord ---

def test_function_record_minimal():
    loc = SourceLocation(file="src/foo.py", line=10, function="parse_date")
    rec = FunctionRecord(
        id="fn-001",
        location=loc,
        signature="def parse_date(s: str) -> date",
        body="def parse_date(s: str) -> date:\n    return date.fromisoformat(s)",
        language="python",
        functionality_label="parse-iso-date-string",
        description="Parse an ISO 8601 date string into a date object.",
    )
    assert rec.id == "fn-001"
    assert rec.location.function == "parse_date"
    assert rec.functionality_label == "parse-iso-date-string"
    assert rec.notable_calls == []
    assert rec.notable_inputs == []
    assert rec.notable_outputs is None
    assert rec.helper_home_hint is None
    assert rec.inline_constants == []


# --- SpecRecord ---

def test_spec_record_minimal():
    loc = SourceLocation(file=".pipeline/architecture/sprints/1/tasks/task-042.yaml", line=1, task_id="task-042")
    rec = SpecRecord(
        id="spec-001",
        task_id="task-042",
        location=loc,
        description="Fetch a user by ID from the database.",
        expected_behavior="Returns User or None if not found.",
    )
    assert rec.task_id == "task-042"
    assert rec.acceptance_criteria == []
    assert rec.functionality_label == ""
    assert rec.inputs == []
    assert rec.outputs is None


# --- SignalFingerprint ---

def test_signal_fingerprint_defaults():
    sig = SignalFingerprint(record_id="fn-001")
    assert sig.record_id == "fn-001"
    assert sig.lexical_tokens == frozenset()
    assert sig.label_tokens == ()
    assert sig.structural_hash is None
    assert sig.signature_hash is None
    assert sig.behavioral_statement is None
    assert sig.is_composite is False
    assert sig.composed_of_candidates == []


def test_signal_fingerprint_populated():
    sig = SignalFingerprint(
        record_id="fn-001",
        lexical_tokens=frozenset({"def", "parse", "date"}),
        label_tokens=("parse", "iso", "date", "string"),
        structural_hash="abc123",
        signature_hash="def456",
        behavioral_statement="converts ISO string to date object",
        is_composite=False,
    )
    assert sig.label_tokens == ("parse", "iso", "date", "string")
    assert "parse" in sig.lexical_tokens


# --- VariantAxisEntry ---

def test_variant_axis_entry():
    ax = VariantAxisEntry(
        parameter="threshold_days",
        instance_values=[20, 30],
        inferred_type="int",
    )
    assert ax.parameter == "threshold_days"
    assert ax.instance_values == [20, 30]


# --- Instance ---

def test_instance_function_type():
    loc = SourceLocation(file="src/foo.py", line=10, function="bar")
    inst = Instance(
        instance_type="function",
        location=loc,
        body_excerpt="def bar(): pass",
    )
    assert inst.instance_type == "function"
    assert inst.variant_values == {}


def test_instance_block_type():
    loc = SourceLocation(file="src/foo.py", line=12, function="bar", parent_function_id="fn-001")
    inst = Instance(
        instance_type="block",
        location=loc,
        body_excerpt="for x in xs:\n    process(x)",
        variant_values={"target": "xs"},
    )
    assert inst.location.parent_function_id == "fn-001"


# --- GlossaryEntry ---

def test_glossary_entry_minimal_leaf():
    entry = GlossaryEntry(
        id="gloss-001",
        name="parse-iso-date-string",
        description="Parse ISO date strings",
    )
    assert entry.kind == "leaf"
    assert entry.composed_of == []
    assert entry.extractable is False
    assert entry.extractability_score == 0.0
    assert entry.extractability_confidence is None
    assert entry.verification_status == "inconclusive"


def test_glossary_entry_composite():
    entry = GlossaryEntry(
        id="gloss-099",
        name="compare-date-from-api-against-threshold",
        description="Composite: fetch + extract + compare",
        kind="composite",
        composed_of=["gloss-001", "gloss-002", "gloss-003"],
    )
    assert entry.kind == "composite"
    assert "gloss-002" in entry.composed_of


def test_glossary_entry_extractable_signaling():
    """Schema validator (later wave) will enforce required fields when
    extractable=True; here we just confirm the fields can be populated."""
    entry = GlossaryEntry(
        id="gloss-001",
        name="parse-iso-date-string",
        description="Parse ISO date strings",
        extractable=True,
        extractability_score=0.85,
        extractability_confidence="high",
        canonical_signature="def parse_iso_date(s: str) -> date",
        proposed_module="src/utils/date_utils.py",
        invariant_skeleton="return date.fromisoformat(s)",
        variant_axis=[VariantAxisEntry(parameter="strict", instance_values=[True, False])],
        verification_status="verified",
    )
    assert entry.extractable is True
    assert entry.canonical_signature == "def parse_iso_date(s: str) -> date"
    assert entry.extractability_confidence in CONFIDENCE_LEVELS
    assert entry.verification_status in VERIFICATION_STATUSES


# --- Glossary ---

def test_glossary_document_minimal():
    g = Glossary()
    assert g.schema_version == SCHEMA_VERSION
    assert g.generator == GENERATOR_NAME
    assert g.glossary == []
    assert g.metadata == {}


def test_glossary_document_populated():
    g = Glossary(
        metadata={
            "mode": "code",
            "scope": {"paths": ["."], "excludes": [], "include_tests": False},
            "totals": {"records_indexed": 0, "clusters": 0, "extractable": 0},
        },
        glossary=[
            GlossaryEntry(id="gloss-001", name="test", description="test entry"),
        ],
    )
    assert g.metadata["mode"] == "code"
    assert len(g.glossary) == 1
    assert g.glossary[0].id == "gloss-001"


# --- Pipeline integration sanity (smoke) ---

def test_pipeline_dataclass_chain_smoke():
    """Build a tiny end-to-end record chain to confirm types compose.

    function indexed -> signal extracted -> instance attached to entry.
    """
    loc = SourceLocation(file="src/foo.py", line=42, function="check_overdue")
    fn = FunctionRecord(
        id="fn-001",
        location=loc,
        signature="def check_overdue(target_date: date) -> bool",
        body="def check_overdue(target_date: date) -> bool:\n    return (date.today() - target_date).days >= 20",
        language="python",
        functionality_label="compare-current-date-against-threshold",
        description="Check if today is >= 20 days past target date.",
        inline_constants=["20"],
    )
    sig = SignalFingerprint(
        record_id=fn.id,
        lexical_tokens=frozenset({"def", "check_overdue", "target_date", "days"}),
        label_tokens=tuple(fn.functionality_label.split("-")),
        behavioral_statement="returns true when today is at least 20 days after target_date",
    )
    inst = Instance(
        instance_type="function",
        location=fn.location,
        body_excerpt=fn.body,
        variant_values={"threshold_days": 20, "comparison": ">="},
        language_or_format=fn.language,
    )
    entry = GlossaryEntry(
        id="gloss-001",
        name="compare-current-date-against-threshold",
        description="Check days-since-given-date against a threshold.",
        instances=[inst],
        signal_agreement={"lexical": 1.0, "behavioral": 1.0},
    )
    g = Glossary(glossary=[entry])

    assert g.glossary[0].instances[0].location.file == "src/foo.py"
    assert sig.label_tokens[0] == "compare"
