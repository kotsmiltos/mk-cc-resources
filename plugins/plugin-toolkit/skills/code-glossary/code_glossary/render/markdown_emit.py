"""Glossary -> human-readable Markdown.

Structure per DESIGN-V2.md section 11:

    # Code glossary - <project>
    ## Summary               (metrics table)
    ## Top 3 actions         (highest-score clusters, one-line each)
    ## Extractable clusters  (sorted by score; details for each)
    ## Pending-enrichment clusters  (deterministically clustered, awaiting LLM)
    ## Watchlist             (single-instance entries; might recur later)
    ## Failures              (only if any errors recorded)

Wave 5 baseline: nothing reaches 'extractable: true' (LLM enrichment
is wave 7+); all clusters land in the 'Pending-enrichment' section.
That section IS the value for the human reader in this wave.
"""

from __future__ import annotations

from io import StringIO
from typing import Iterable

from code_glossary.records import Glossary, GlossaryEntry, Instance


_TOP_ACTIONS_COUNT = 3


def emit_glossary_markdown(glossary: Glossary, *, target_path: str = "") -> str:
    """Render the Glossary as a Markdown document."""
    buf = StringIO()
    _emit_header(buf, glossary, target_path)
    _emit_summary(buf, glossary)
    _emit_top_actions(buf, glossary)
    _emit_extractable_section(buf, glossary)
    _emit_pending_enrichment_section(buf, glossary)
    _emit_watchlist(buf, glossary)
    _emit_next_steps(buf)
    return buf.getvalue()


# --- Header / summary ---

def _emit_header(buf: StringIO, g: Glossary, target_path: str) -> None:
    label = target_path or g.metadata.get("scope", {}).get("paths", ["(unknown)"])[0]
    buf.write(f"# Code glossary - {label}\n\n")
    generated_at = g.metadata.get("generated_at", "")
    if generated_at:
        buf.write(f"Generated: {generated_at}\n")
    buf.write(f"Generator: {g.generator} {g.generator_version}\n")
    buf.write(f"Schema version: {g.schema_version}\n\n")


def _emit_summary(buf: StringIO, g: Glossary) -> None:
    totals = g.metadata.get("totals", {})
    lang_mix = g.metadata.get("language_or_format_mix", {})
    mix_str = ", ".join(f"{lang}: {pct:.1%}" for lang, pct in sorted(lang_mix.items()))

    buf.write("## Summary\n\n")
    buf.write("| Metric | Value |\n")
    buf.write("|---|---|\n")
    buf.write(f"| Functions indexed | {totals.get('records_indexed', 0)} |\n")
    buf.write(f"| Canonical clusters | {totals.get('clusters', 0)} |\n")
    buf.write(f"| Extractable (LLM-confirmed) | {totals.get('extractable', 0)} |\n")
    pending = totals.get("pending_high_confidence", 0)
    buf.write(f"| High-confidence pending LLM enrichment | {pending} |\n")
    buf.write(f"| Language mix | {mix_str or 'n/a'} |\n")
    buf.write("\n")


# --- Top 3 actions ---

def _emit_top_actions(buf: StringIO, g: Glossary) -> None:
    extractables = [e for e in g.glossary if e.extractable]
    pending = [e for e in g.glossary if not e.extractable and len(e.instances) >= 2]

    buf.write("## Top actions\n\n")
    if extractables:
        buf.write("Highest-score clusters confirmed extractable by LLM Pass B:\n\n")
        for i, e in enumerate(extractables[:_TOP_ACTIONS_COUNT], start=1):
            buf.write(f"{i}. **{e.id} - {e.name}** "
                      f"({len(e.instances)} instances, score {e.extractability_score:.2f})\n")
        buf.write("\n")
    elif pending:
        buf.write("LLM enrichment has not yet promoted any clusters to extractable=true. ")
        buf.write("The highest-score deterministically-clustered candidates (pending enrichment):\n\n")
        for i, e in enumerate(pending[:_TOP_ACTIONS_COUNT], start=1):
            buf.write(f"{i}. **{e.id} - {e.name}** "
                      f"({len(e.instances)} instances, score {e.extractability_score:.2f}, "
                      f"confidence {e.extractability_confidence})\n")
        buf.write("\n")
    else:
        buf.write("No clusters found - codebase has no detectable duplication at this granularity.\n\n")


# --- Extractable details ---

def _emit_extractable_section(buf: StringIO, g: Glossary) -> None:
    extractables = [e for e in g.glossary if e.extractable]
    buf.write("## Extractable clusters\n\n")
    if not extractables:
        buf.write("_None yet. LLM enrichment (Pass B in SKILL.md layer, wave 7+) "
                  "promotes pending-enrichment clusters to this section by adding "
                  "canonical_signature, proposed_module, invariant_skeleton, "
                  "and variant_axis._\n\n")
        return
    for e in extractables:
        _emit_entry_details(buf, e, show_full=True)


# --- Pending enrichment ---

def _emit_pending_enrichment_section(buf: StringIO, g: Glossary) -> None:
    pending = [
        e for e in g.glossary
        if not e.extractable and len(e.instances) >= 2
    ]
    buf.write("## Pending-enrichment clusters\n\n")
    if not pending:
        buf.write("_None._\n\n")
        return
    buf.write("Deterministically clustered (Stage 3 Pass A); awaiting LLM Pass B "
              "to add canonical_signature + proposed_module + invariant_skeleton + variant_axis "
              "before promotion to extractable.\n\n")
    for e in pending:
        _emit_entry_details(buf, e, show_full=False)


# --- Watchlist (single-instance) ---

def _emit_watchlist(buf: StringIO, g: Glossary) -> None:
    singletons = [e for e in g.glossary if len(e.instances) <= 1]
    buf.write("## Watchlist\n\n")
    buf.write(f"Single-instance entries ({len(singletons)} total). ")
    buf.write("Watch for second instances in future runs.\n\n")
    if not singletons:
        buf.write("_None._\n\n")
        return
    buf.write("<details><summary>Show all single-instance entries</summary>\n\n")
    for e in sorted(singletons, key=lambda x: x.name):
        if not e.instances:
            continue
        inst = e.instances[0]
        func_str = f" - `{inst.location.function}`" if inst.location.function else ""
        buf.write(f"- **{e.id} - {e.name}** at `{inst.location.file}:{inst.location.line}`{func_str}\n")
    buf.write("\n</details>\n\n")


def _emit_entry_details(buf: StringIO, e: GlossaryEntry, *, show_full: bool) -> None:
    buf.write(f"### {e.id} - {e.name}\n\n")
    buf.write(f"**Description:** {e.description}\n\n")
    buf.write(f"**Instances:** {len(e.instances)}")
    if e.extractability_confidence:
        buf.write(f" | **Confidence:** {e.extractability_confidence}")
    buf.write(f" | **Score:** {e.extractability_score:.2f}\n\n")

    if show_full:
        if e.canonical_signature:
            buf.write(f"**Proposed signature:**\n\n```\n{e.canonical_signature}\n```\n\n")
        if e.proposed_module:
            buf.write(f"**Proposed module:** `{e.proposed_module}`\n\n")
        if e.invariant_skeleton:
            buf.write(f"**Invariant skeleton:**\n\n```\n{e.invariant_skeleton}\n```\n\n")
        if e.variant_axis:
            buf.write("**Variant axis:**\n\n")
            for ax in e.variant_axis:
                values_str = ", ".join(str(v) for v in ax.instance_values)
                buf.write(f"- `{ax.parameter}` ({ax.inferred_type}): {values_str}\n")
            buf.write("\n")

    buf.write("**Call sites:**\n\n")
    for inst in e.instances:
        func_str = f" - `{inst.location.function}`" if inst.location.function else ""
        buf.write(f"- `{inst.location.file}:{inst.location.line}`{func_str}\n")
    buf.write("\n")

    if e.signal_agreement:
        agreeing = [s for s, v in e.signal_agreement.items() if v >= 0.5]
        if agreeing:
            buf.write(f"**Signals agreeing:** {', '.join(sorted(agreeing))}\n\n")

    if e.notes:
        buf.write(f"**Notes:** {e.notes}\n\n")

    buf.write("---\n\n")


def _emit_next_steps(buf: StringIO) -> None:
    buf.write("## Next steps\n\n")
    buf.write("1. **Review Pending-enrichment clusters** - decide which deserve LLM enrichment.\n")
    buf.write("2. **Run LLM Pass B** (SKILL.md layer, wave 7+) to promote candidates to extractable.\n")
    buf.write("3. **Spot-check body_excerpts in GLOSSARY.yaml** against the cited file:line.\n")
    buf.write("4. **Extract** - either manually or via the future `/dry-refactor <gloss-id>` skill.\n")
    buf.write("5. **Re-run /code-glossary** post-extraction to confirm the cluster collapses.\n")
