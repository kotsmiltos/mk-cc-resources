"""Tests for dry_refactor.loader — glossary load gate + cluster selection
+ refactor config block."""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.dry_refactor.loader import (
    ClusterSelectError,
    GlossaryLoadError,
    RefactorConfig,
    confidence_at_least,
    load_glossary,
    load_refactor_config,
    select_all_high_confidence,
    select_cluster,
)
from tests.dr_fixtures import make_entry, write_glossary


def test_load_valid_glossary(tmp_path: Path):
    p = write_glossary(tmp_path / "GLOSSARY.yaml", [make_entry()])
    doc = load_glossary(p)
    assert doc["glossary"][0]["id"] == "gloss-001"


def test_load_missing_file_raises(tmp_path: Path):
    with pytest.raises(GlossaryLoadError, match="not found"):
        load_glossary(tmp_path / "ghost.yaml")


def test_load_invalid_yaml_raises(tmp_path: Path):
    p = tmp_path / "broken.yaml"
    p.write_text("glossary: [unclosed", encoding="utf-8")
    with pytest.raises(GlossaryLoadError, match="not valid YAML"):
        load_glossary(p)


def test_load_schema_invalid_raises(tmp_path: Path):
    p = tmp_path / "bad.yaml"
    # Has the glossary key but violates the frozen schema (no metadata etc).
    p.write_text("glossary: []\n", encoding="utf-8")
    with pytest.raises(GlossaryLoadError, match="frozen-schema"):
        load_glossary(p)


def test_select_cluster_by_id(tmp_path: Path):
    p = write_glossary(tmp_path / "GLOSSARY.yaml", [make_entry()])
    entry = select_cluster(load_glossary(p), "gloss-001")
    assert entry["name"] == "fetch-entity-from-api"


def test_select_unknown_id_raises(tmp_path: Path):
    p = write_glossary(tmp_path / "GLOSSARY.yaml", [make_entry()])
    with pytest.raises(ClusterSelectError, match="gloss-999"):
        select_cluster(load_glossary(p), "gloss-999")


def test_select_non_extractable_raises(tmp_path: Path):
    p = write_glossary(tmp_path / "GLOSSARY.yaml", [make_entry(extractable=False)])
    with pytest.raises(ClusterSelectError, match="not extractable"):
        select_cluster(load_glossary(p), "gloss-001")


def test_select_all_high_confidence_filters(tmp_path: Path):
    medium = make_entry(confidence="medium")
    medium["id"] = "gloss-002"
    not_extractable = make_entry(extractable=False)
    not_extractable["id"] = "gloss-003"
    p = write_glossary(
        tmp_path / "GLOSSARY.yaml", [make_entry(), medium, not_extractable]
    )
    selected = select_all_high_confidence(load_glossary(p))
    assert [e["id"] for e in selected] == ["gloss-001"]


def test_refactor_config_defaults():
    cfg = load_refactor_config(None)
    assert cfg == RefactorConfig()
    assert cfg.min_confidence == "high"
    assert cfg.require_verification_status == "verified"
    assert cfg.test_command == "auto"
    assert cfg.pause_for_review is True


def test_refactor_config_block_overrides(tmp_path: Path):
    p = tmp_path / "config.yaml"
    p.write_text(
        "refactor:\n"
        "  min_confidence: medium\n"
        "  require_verification_status: any\n"
        "  test_command: pytest tests/\n"
        "  pause_for_review: false\n",
        encoding="utf-8",
    )
    cfg = load_refactor_config(p)
    assert cfg.min_confidence == "medium"
    assert cfg.require_verification_status == "any"
    assert cfg.test_command == "pytest tests/"
    assert cfg.pause_for_review is False


def test_refactor_config_bad_confidence_raises(tmp_path: Path):
    p = tmp_path / "config.yaml"
    p.write_text("refactor:\n  min_confidence: enormous\n", encoding="utf-8")
    with pytest.raises(GlossaryLoadError, match="min_confidence"):
        load_refactor_config(p)


def test_confidence_ladder():
    assert confidence_at_least("high", "high")
    assert confidence_at_least("high", "medium")
    assert not confidence_at_least("medium", "high")
    assert not confidence_at_least("bogus", "low")  # unknown never satisfies
