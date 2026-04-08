<template>

Use this structure for decomposition agent briefs — the machine-optimized contract given to agents that break modules or components into smaller units. Co-authored alongside the human-facing .md in a single pass (per D4).

Format: YAML frontmatter for structured data (17%+ accuracy advantage over prose), XML section tags for boundaries (Anthropic-recommended). Constraints are front-loaded for primacy bias.

Save to: `artifacts/scope/modules/[module]/[module].agent.md` (module-level)
     or: `artifacts/scope/modules/[module]/components/[component]/[component].agent.md` (component-level)

Sibling file: A corresponding `.md` with the same name contains human-facing rationale and context. The `source_hash` field links them for drift detection.

```
---
# === YAML FRONTMATTER — structured data, parsed by downstream consumers ===
type: agent-brief
purpose: decompose-module  # one of: decompose-module | decompose-component
target: "[module or component name]"
level: 1  # decomposition depth — 0 = system, 1 = module, 2+ = component
scope_root: "artifacts/scope"  # path to scope/ directory root
source_hash: "[SHA-256 of the corresponding .md file — validates brief has not drifted from rationale doc]"
---

<!-- Section order is deliberate: constraints/context first (primacy bias), task last -->

<context>
<!-- PURPOSE: Ground the agent in what the project is and what constraints apply.
     FILL IN: 1-3 sentence project summary from project-brief.agent.md,
     then architecture constraints from system-map.agent.md.
     CONSUMERS: Read by the agent to understand its operating environment. -->

Project summary: [1-3 sentences — what the project does, who it serves, core value proposition]

Architecture constraints:
- [Constraint from system-map — e.g., "All modules communicate through typed interface contracts"]
- [Constraint — e.g., "Python 3.10+, no runtime dependencies outside stdlib + approved list"]
</context>

<scope name="[target module or component name]">
<!-- PURPOSE: Define exact boundaries — what this unit owns and what it does not.
     FILL IN: Ownership list, boundary definition, and explicit exclusions.
     CONSUMERS: Agent uses this to decide what belongs inside vs outside decomposition. -->

Owns:
- [Responsibility 1 — e.g., "All file I/O operations for data import"]
- [Responsibility 2 — e.g., "Validation of input formats against schema"]

Boundaries:
- [Boundary — e.g., "Receives parsed config from config module, does not read config files directly"]

Excluded from scope (owned by other modules):
- [Exclusion — e.g., "UI rendering — owned by display module"]
- [Exclusion — e.g., "Network requests — owned by transport module"]
</scope>

<interfaces>
<!-- PURPOSE: Define how this module connects to adjacent modules.
     FILL IN: One entry per interface contract. Direction is from this module's perspective.
     CONSUMERS: Agent uses these to define sub-component boundaries that preserve contracts.
     NOTE: If this module has no cross-module interfaces, write:
           "No cross-module interfaces — this module is self-contained." -->

- name: "[contract name — e.g., parsed-input]"
  direction: provides  # one of: provides | consumes
  signature: "[function or data shape — e.g., parse(raw: bytes) -> ParsedInput]"
  guarantees: "[what the consumer can rely on — e.g., ParsedInput always has non-empty .fields list]"

- name: "[contract name]"
  direction: consumes
  signature: "[what this module receives]"
  guarantees: "[what this module can rely on from the provider]"
</interfaces>

<patterns>
<!-- PURPOSE: Inject only the cross-cutting patterns relevant to THIS module.
     FILL IN: Pattern name + concrete code example showing usage.
     CONSUMERS: Agent applies these patterns when defining sub-components.
     RULE: Only include patterns this module touches — not the full pattern catalog. -->

- pattern: "[pattern name — e.g., Result Wrapper]"
  example: |
    # Concrete usage example — not abstract description
    result = Result.ok(parsed_data)
    if result.is_err:
        return Result.err(f"Parse failed: {result.error}")
</patterns>

<decisions>
<!-- PURPOSE: Inject decisions that constrain this module's decomposition.
     FILL IN: Decision ID + outcome only. No rationale (agents don't need "why", just "what").
     CONSUMERS: Agent checks these before making structural choices.
     SOURCE: architecture/decisions/ directory. -->

- id: D1
  outcome: "[What was decided — e.g., All modules use explicit dependency injection]"
- id: D4
  outcome: "[What was decided — e.g., Decomposition agents co-author .md and .agent.md in one pass]"
</decisions>

<task>
<!-- PURPOSE: The actual instruction — what to decompose and when to stop.
     FILL IN: Target, decomposition criteria, stopping conditions, output paths.
     CONSUMERS: This is what the agent executes. Everything above is context for THIS section. -->

Decompose "[target]" into sub-components.

Stopping criteria:
- A unit estimated at <=250 lines of implementation = LEAF (produce a leaf task spec directly)
- A unit scoring >=5 on complexity scale = DECOMPOSE (break it down one more level)
- Maximum depth: 5 levels (current level: [N])

Output location: artifacts/scope/modules/[module]/components/
Naming: [component-slug]/[component-slug].md + [component-slug]/[component-slug].agent.md
</task>

<output_format>
<!-- PURPOSE: Remind the agent to produce BOTH representations and specify exact locations.
     FILL IN: Paths for each output file.
     CONSUMERS: Orchestrator validates these files exist after agent completes.
     CRITICAL: Both files MUST be written — the .md contains rationale for humans,
               the .agent.md contains the contract for downstream agents. -->

For EACH sub-component identified, produce two files:

1. [component-slug].md — Human-facing specification
   - Contains: rationale, design discussion, tradeoff analysis, open questions
   - Audience: human reviewers, future architects

2. [component-slug].agent.md — Agent-facing contract
   - Contains: YAML frontmatter + XML sections (use THIS template's format recursively)
   - Audience: downstream decomposition or implementation agents
   - source_hash: must contain SHA-256 of the sibling .md file

Also update: Report results to the orchestrator for INDEX.md update.
</output_format>
```

</template>

<conventions>
- **Section order is load-bearing.** Context and scope come first (primacy bias). Task comes last. Reordering degrades agent compliance.
- **YAML frontmatter for data, XML tags for sections.** Do not mix — YAML fields are parsed programmatically; XML sections are read sequentially by the agent.
- **source_hash links .md and .agent.md.** If the .md changes, the hash mismatches, and the brief is flagged stale. This is the drift detection mechanism (per Adversarial #2 in PLAN.md).
- **Positive framing only in agent briefs.** No "DO NOT", "never", "avoid" — these trigger the pink elephant effect. State what the agent SHOULD do. Exception: SECURITY: prefix allows negation (per D7).
- **Minimal content per section.** Every token competes for attention. If a section exceeds 10 lines, consider whether every line earns its place.
- **Interfaces can be empty.** Write "No cross-module interfaces — this module is self-contained." for standalone modules.
- **Downstream consumers parse these tags by name.** The consistency check (T6) validates `<scope>`, `<interfaces>`, `<decisions>`. The assembly algorithm (T4) reads `<context>`, `<patterns>`, `<decisions>`. Tag names are part of the contract — renaming them breaks downstream consumers.
</conventions>
