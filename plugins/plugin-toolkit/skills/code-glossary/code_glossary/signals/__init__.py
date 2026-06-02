"""Signals — Stage 2 of the code-glossary pipeline.

Per-record SignalFingerprint generation. Five signals total (per DESIGN-V2.md
piece 3); wave 3 builds the four deterministic ones:

    1. lexical    — body token-set + label token-tuple
    2. structural — AST shape hash (Python in wave 3; tree-sitter in wave 6)
    3. signature  — input/output type fingerprint
    5. abstraction — leaf vs composite + composed_of_candidates

The fifth signal (behavioral, "what does this compute?") requires LLM
judgment; it stays None in wave 3 and gets populated by the SKILL.md
orchestration layer (wave 7+) which dispatches Agent sub-agents.

Public API:

    from code_glossary.signals import extract_signals
    fingerprints = extract_signals(records)
"""

from code_glossary.signals.orchestrator import extract_signals

__all__ = ["extract_signals"]
