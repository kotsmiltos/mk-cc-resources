"""Render orchestration — Stage 4 public API.

Public function:

    render_glossary(records, fingerprints, clusters, scope_metadata,
                    output_dir, target_path='') -> tuple[Path, Path]

Wires entry_builder + yaml_emit + markdown_emit; writes both files
to output_dir; returns (yaml_path, md_path).

Output paths default to:
    <output_dir>/GLOSSARY.yaml
    <output_dir>/GLOSSARY.md

The output_dir is created if missing. Pre-existing files are
overwritten (wave 5 baseline: fresh each time, per piece 9 lock).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

from code_glossary.records import (
    BlockRecord,
    CandidateCluster,
    FunctionRecord,
    SignalFingerprint,
)
from code_glossary.render.entry_builder import build_block_entries, build_glossary
from code_glossary.render.markdown_emit import emit_glossary_markdown
from code_glossary.render.yaml_emit import emit_glossary_yaml


GLOSSARY_YAML_FILENAME = "GLOSSARY.yaml"
GLOSSARY_MD_FILENAME = "GLOSSARY.md"


def render_glossary(
    records: Iterable[FunctionRecord],
    fingerprints: dict[str, SignalFingerprint],
    clusters: Iterable[CandidateCluster],
    scope_metadata: dict[str, Any],
    output_dir: Path | str,
    *,
    target_path: str = "",
    enrichments: dict[str, Any] | None = None,
    block_clusters: list[CandidateCluster] | None = None,
    block_records: list[BlockRecord] | None = None,
) -> tuple[Path, Path]:
    """Render the glossary artifacts to disk.

    Args:
        records: Stage 1 output
        fingerprints: Stage 2 output
        clusters: Stage 3 output (sorted by score)
        scope_metadata: dict with at least 'paths', 'excludes', 'include_tests';
                        extra keys (dispatch_count, runtime_seconds, etc.) flow through
        output_dir: where to write GLOSSARY.yaml + GLOSSARY.md
        target_path: optional human-friendly label for the markdown header
                     (e.g., 'my-project'); defaults to the first scope path
        enrichments: Pass B returns keyed by cluster id (wave 7); None =
                     deterministic baseline (all entries extractable=false)

    Returns:
        (yaml_path, md_path) - absolute paths of the written files.
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    glossary = build_glossary(
        records, fingerprints, clusters, scope_metadata, enrichments=enrichments
    )

    # Block findings (v2.1 --scan-blocks): advisory entries appended after
    # the function pipeline — own ids (gloss-blk-NNN), own markdown section.
    if block_clusters and block_records is not None:
        block_entries = build_block_entries(block_clusters, block_records)
        glossary.glossary.extend(block_entries)
        glossary.metadata["block_findings"] = len(block_entries)

    yaml_text = emit_glossary_yaml(glossary)
    md_text = emit_glossary_markdown(glossary, target_path=target_path)

    yaml_path = (out_dir / GLOSSARY_YAML_FILENAME).resolve()
    md_path = (out_dir / GLOSSARY_MD_FILENAME).resolve()

    yaml_path.write_text(yaml_text, encoding="utf-8")
    md_path.write_text(md_text, encoding="utf-8")

    return yaml_path, md_path
