"""Tests for render orchestrator + end-to-end pipeline dogfood."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from code_glossary.cluster import cluster_records
from code_glossary.indexer import index_directory
from code_glossary.records import (
    FunctionRecord,
    SignalFingerprint,
    SourceLocation,
)
from code_glossary.render import (
    GLOSSARY_MD_FILENAME,
    GLOSSARY_YAML_FILENAME,
    render_glossary,
)
from code_glossary.schema import validate_glossary
from code_glossary.signals import extract_signals


SCOPE = {"paths": ["src"], "excludes": [], "include_tests": False}


def _rec(rec_id: str, file: str = "x.py", func_name: str = "f") -> FunctionRecord:
    return FunctionRecord(
        id=rec_id,
        location=SourceLocation(file=file, line=1, function=func_name),
        signature=f"def {func_name}()",
        body=f"def {func_name}():\n    x = 1\n    return x\n",
        language="python",
        functionality_label="",
        description="",
        notable_calls=[],
        notable_inputs=[],
        notable_outputs=None,
        helper_home_hint=None,
        inline_constants=[],
    )


def _fp(rec_id: str) -> SignalFingerprint:
    return SignalFingerprint(record_id=rec_id)


# --- Basic ---

def test_render_writes_both_files(tmp_path: Path):
    yaml_path, md_path = render_glossary(
        records=[], fingerprints={}, clusters=[], scope_metadata=SCOPE, output_dir=tmp_path
    )
    assert yaml_path.exists()
    assert md_path.exists()
    assert yaml_path.name == GLOSSARY_YAML_FILENAME
    assert md_path.name == GLOSSARY_MD_FILENAME


def test_render_creates_output_dir_if_missing(tmp_path: Path):
    out_dir = tmp_path / "deeply" / "nested" / "dir"
    yaml_path, md_path = render_glossary(
        records=[], fingerprints={}, clusters=[], scope_metadata=SCOPE, output_dir=out_dir
    )
    assert yaml_path.parent == out_dir.resolve()


def test_render_yaml_parses_and_validates(tmp_path: Path):
    rec = _rec("fn-1", "a.py")
    yaml_path, _ = render_glossary(
        records=[rec],
        fingerprints={"fn-1": _fp("fn-1")},
        clusters=[],
        scope_metadata=SCOPE,
        output_dir=tmp_path,
    )
    parsed = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    errors = validate_glossary(parsed)
    blocking = [e for e in errors if "missing" in e.message or "must be" in e.message]
    assert blocking == [], f"unexpected schema errors: {blocking}"


def test_render_md_contains_required_sections(tmp_path: Path):
    rec = _rec("fn-1", "a.py")
    _, md_path = render_glossary(
        records=[rec],
        fingerprints={"fn-1": _fp("fn-1")},
        clusters=[],
        scope_metadata=SCOPE,
        output_dir=tmp_path,
    )
    md = md_path.read_text(encoding="utf-8")
    for section in ("# Code glossary", "## Summary", "## Top actions",
                    "## Extractable clusters", "## Pending-enrichment clusters",
                    "## Watchlist", "## Next steps"):
        assert section in md, f"missing section: {section}"


def test_render_overwrites_existing_files(tmp_path: Path):
    """Wave 5 baseline: fresh each time per piece 9 lock."""
    yaml_path, _ = render_glossary(
        records=[], fingerprints={}, clusters=[], scope_metadata=SCOPE, output_dir=tmp_path
    )
    initial_content = yaml_path.read_text(encoding="utf-8")

    # Render again with different scope.
    new_scope = {"paths": ["different"], "excludes": [], "include_tests": True}
    yaml_path2, _ = render_glossary(
        records=[], fingerprints={}, clusters=[], scope_metadata=new_scope, output_dir=tmp_path
    )
    assert yaml_path == yaml_path2
    new_content = yaml_path2.read_text(encoding="utf-8")
    assert new_content != initial_content
    assert "different" in new_content


# --- Full pipeline dogfood ---

def test_dogfood_full_pipeline_against_own_source(tmp_path: Path):
    """End-to-end: indexer + signals + cluster + render against the
    engine's own Python source. Produces a real GLOSSARY.yaml + .md
    that exercises every stage."""
    engine_root = Path(__file__).resolve().parent.parent / "code_glossary"

    records = index_directory(engine_root)
    fingerprints = extract_signals(records)
    clusters = cluster_records(records, fingerprints)

    yaml_path, md_path = render_glossary(
        records=records,
        fingerprints=fingerprints,
        clusters=clusters,
        scope_metadata={"paths": [str(engine_root)], "excludes": [], "include_tests": False},
        output_dir=tmp_path,
        target_path="code_glossary engine (dogfood)",
    )

    # YAML should be schema-valid.
    parsed = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    errors = validate_glossary(parsed)
    blocking = [e for e in errors if "missing" in e.message or "must be" in e.message]
    assert blocking == [], f"unexpected schema errors: {blocking}"

    # Metadata totals should match what we computed in Stage 1.
    assert parsed["metadata"]["totals"]["records_indexed"] == len(records)
    assert parsed["metadata"]["totals"]["clusters"] == len(clusters)

    # Markdown should mention the engine target path.
    md = md_path.read_text(encoding="utf-8")
    assert "code_glossary engine (dogfood)" in md
    # Summary numbers should appear.
    assert str(len(records)) in md
