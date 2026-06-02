"""Render — Stage 4 of the code-glossary pipeline.

Turns CandidateClusters into GlossaryEntry objects, validates them
against the frozen schema, and emits the two artifact files:

    <output_dir>/GLOSSARY.yaml   (machine, schema_version: 1)
    <output_dir>/GLOSSARY.md     (human, sorted by extractability)

Wave 5 baseline: all entries emit as extractable=false with notes
explaining LLM enrichment is still required. The SKILL.md layer
(wave 7+) dispatches Agent sub-agents to fill canonical_signature,
proposed_module, invariant_skeleton, variant_axis, and only then
flips extractable=true on confirmed clusters.

Public API:

    from code_glossary.render import build_glossary, render_glossary
"""

from code_glossary.render.entry_builder import build_glossary
from code_glossary.render.markdown_emit import emit_glossary_markdown
from code_glossary.render.orchestrator import (
    GLOSSARY_MD_FILENAME,
    GLOSSARY_YAML_FILENAME,
    render_glossary,
)
from code_glossary.render.yaml_emit import emit_glossary_yaml

__all__ = [
    "build_glossary",
    "emit_glossary_markdown",
    "emit_glossary_yaml",
    "render_glossary",
    "GLOSSARY_MD_FILENAME",
    "GLOSSARY_YAML_FILENAME",
]
