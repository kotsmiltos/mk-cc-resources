"""Cluster — Stage 3 of the code-glossary pipeline.

Groups records that share signal evidence into CandidateCluster objects.
Stage 4 turns each cluster into a GlossaryEntry (adding canonical_signature
+ proposed_module + invariant_skeleton + variant_axis via Pass B LLM).

Wave 4 ships Pass A only (deterministic bucketing + scoring). Pass B
(LLM per-cluster review) is in the SKILL.md layer; Pass C (master
substrate-verify) is in the rendering wave (5).

Public API:

    from code_glossary.cluster import cluster_records
    clusters = cluster_records(records, fingerprints)
"""

from code_glossary.cluster.orchestrator import cluster_records

__all__ = ["cluster_records"]
