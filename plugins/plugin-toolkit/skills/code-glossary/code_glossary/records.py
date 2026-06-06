"""Dataclasses for the code-glossary engine.

Pipeline stages flow data through these record types:

    Stage 1 (index)   produces FunctionRecord (code mode) or SpecRecord (spec mode)
    Stage 2 (signal)  attaches SignalFingerprint to each record
    Stage 3 (cluster) groups records into GlossaryEntry
    Stage 4 (render)  writes Glossary to YAML/Markdown

See DESIGN-V2.md section 6 (frozen schema) and section 5 (pipeline).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SourceLocation:
    """Where in the codebase a unit lives.

    For instance_type == 'function': file + line + function
    For instance_type == 'block': file + line + function + parent_function_id
    For instance_type == 'spec': file + line + task_id
    """

    file: str  # relative path from project root
    line: int  # 1-indexed
    function: Optional[str] = None
    parent_function_id: Optional[str] = None  # set when instance is a block under a known function
    task_id: Optional[str] = None  # set when instance is a task spec


@dataclass
class FunctionRecord:
    """Stage 1 output (code mode): one indexed function.

    The indexer emits one of these per function/method discovered in
    a batch of source files. The body is verbatim — downstream stages
    (signal extraction, clustering, verification) read it as evidence.
    """

    id: str  # e.g. "fn-batch01-file03-func05"
    location: SourceLocation
    signature: str  # one-line, includes params + return type if present
    body: str  # verbatim source, indentation preserved
    language: str  # python | typescript | javascript | csharp | ...
    functionality_label: str  # kebab-case via controlled vocab
    description: str  # one sentence: what this DOES
    notable_calls: list[str] = field(default_factory=list)
    notable_inputs: list[str] = field(default_factory=list)
    notable_outputs: Optional[str] = None
    helper_home_hint: Optional[str] = None  # detected existing helper dir candidate
    inline_constants: list[str] = field(default_factory=list)


@dataclass
class SpecRecord:
    """Stage 1 output (spec mode): one task spec from an architect sprint.

    Used by /organize. Task specs describe intended behavior; they aren't
    executable, so signals 2 (structural) and 3 (signature) get N/A — only
    lexical, behavioral, and abstraction-level signals apply.
    """

    id: str  # e.g. "spec-sprint01-task042"
    task_id: str  # the architect's task ID
    location: SourceLocation
    description: str
    expected_behavior: str
    acceptance_criteria: list[str] = field(default_factory=list)
    functionality_label: str = ""
    inputs: list[str] = field(default_factory=list)
    outputs: Optional[str] = None


@dataclass
class SignalFingerprint:
    """Stage 2 output: per-record fingerprint across the five clustering signals.

    Each signal field may be None when the signal doesn't apply (e.g.
    structural_hash is None for spec records since specs aren't executable;
    signature_hash may be None when the language doesn't surface signatures).

    Clustering decisions in Stage 3 walk these in priority order
    (lexical, structural, signature, behavioral, abstraction) and the
    cluster confidence is the count of agreeing signals.
    """

    record_id: str
    lexical_tokens: frozenset[str] = field(default_factory=frozenset)  # body tokens for TF-IDF
    label_tokens: tuple[str, ...] = ()  # kebab-case label tokens
    structural_hash: Optional[str] = None  # AST-shape hash if available
    signature_hash: Optional[str] = None  # input/output type fingerprint
    behavioral_statement: Optional[str] = None  # LLM-extracted "what this computes"
    is_composite: bool = False
    composed_of_candidates: list[str] = field(default_factory=list)  # other record IDs called


@dataclass
class VariantAxisEntry:
    """One axis along which instances of a cluster differ.

    Example for the gloss-001 register-build-factory cluster:
        parameter = "build_id"
        instance_values = ["AStarReynolds", "Aggregate", "ContinuumCPU", ...]
        inferred_type = "BuildId enum"
    """

    parameter: str
    instance_values: list[Any]
    inferred_type: str = ""


@dataclass
class Instance:
    """One occurrence of a glossary entry's pattern in the codebase.

    instance_type controls which SourceLocation fields are populated:
        function -> location.function set
        block    -> location.function + location.parent_function_id set
        spec     -> location.task_id set
    """

    instance_type: str  # function | block | spec
    location: SourceLocation
    body_excerpt: str  # verbatim, the substrate-verify evidence
    variant_values: dict[str, Any] = field(default_factory=dict)
    language_or_format: str = ""


@dataclass
class GlossaryEntry:
    """One canonical functionality.

    When extractable is True:
        canonical_signature, proposed_module, invariant_skeleton,
        variant_axis, and extractability_confidence MUST be populated.
        Enforced by the schema validator before emit.

    When extractable is False:
        notes MUST explain why (single-instance, semantics differ,
        language-idiomatic, framework hook, etc.).
        Enforced by the schema validator before emit.

    kind == 'composite' implies composed_of is non-empty (references to
    leaf gloss-ids). A composite entry can itself be extractable
    (becomes its own wrapper helper) or not (let the call sites
    compose the leaves inline).
    """

    id: str  # gloss-NNN
    name: str  # kebab-case canonical
    description: str  # one sentence
    kind: str = "leaf"  # leaf | composite
    composed_of: list[str] = field(default_factory=list)  # non-empty when kind == composite
    extractable: bool = False
    extractability_score: float = 0.0  # 0-1, deterministic
    extractability_confidence: Optional[str] = None  # high | medium | low
    canonical_signature: Optional[str] = None
    proposed_module: Optional[str] = None
    invariant_skeleton: Optional[str] = None
    variant_axis: list[VariantAxisEntry] = field(default_factory=list)
    instances: list[Instance] = field(default_factory=list)
    related_functionalities: list[str] = field(default_factory=list)
    verification_status: str = "inconclusive"  # verified | quote_drift_detected | inconclusive
    signal_agreement: dict[str, float] = field(default_factory=dict)
    notes: str = ""


@dataclass
class Glossary:
    """Top-level document. Stage 4 writes one of these per run."""

    schema_version: int = 1
    generator: str = "code-glossary"
    generator_version: str = "2.3.0"
    metadata: dict[str, Any] = field(default_factory=dict)
    glossary: list[GlossaryEntry] = field(default_factory=list)


@dataclass
class BlockRecord:
    """Stage 1 output (--scan-blocks, v2.1): one duplicated-block candidate.

    Produced by indexer.block_scanner for the two MVP window shapes
    (function_prologue, loop_prologue). Lives in its own artifact
    (block_records.yaml) and clusters in its own pass — never mixed into
    the function pipeline. location.parent_function_id ties the window
    back to its enclosing function (schema requires it for
    instance_type == 'block').
    """

    id: str  # blk-<sha8>
    location: SourceLocation  # file + first-window-statement line + function + parent_function_id
    block_kind: str  # function_prologue | loop_prologue
    body: str  # verbatim window text, LF-normalized
    language: str
    shape_hash: str  # node-type serialization hash (structural-signal parity)
    window_size: int  # statements captured


@dataclass
class CandidateCluster:
    """Stage 3 output: a group of records that share at least one signal.

    Intermediate form between Stage 2 (signals) and Stage 4 (render).
    Stage 4 turns one CandidateCluster into one GlossaryEntry by adding
    canonical_signature, proposed_module, invariant_skeleton, variant_axis
    (which require LLM judgment via Pass B).

    primary_signal indicates which signal seeded the cluster — the
    one with highest priority for grouping (structural > signature > label).
    signal_agreement records which OTHER signals also confirm the cluster.
    """

    id: str  # cluster-NNN
    member_record_ids: list[str]
    primary_signal: str  # structural | signature | label | fuzzy_label
    signal_agreement: dict[str, bool] = field(default_factory=dict)
    extractability_score: float = 0.0
    extractability_confidence: str = "low"  # high | medium | low
    notes: str = ""
