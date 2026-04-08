<template>

Use this structure for the system-map artifact — the top-level architecture overview produced by the Level 0 agent. The system-map defines module boundaries, tiers, ownership, and hard constraints. It is consumed by the brief assembly algorithm (Step 3) and is the source of truth for what modules exist and how they relate.

Save to: `architecture/system-map.md` + `architecture/system-map.agent.md` (relative to scope root)

## Human-facing format (system-map.md)

```markdown
> **type:** system-map
> **scope_root:** artifacts/scope/
> **modules:** [count]
> **created_at:** level-0
> **key_decisions:** [decision IDs from architecture phase, e.g., D001, D003]

# System Map: [Project Name]

## Architecture Overview

<!-- High-level description of the system. How modules connect. What the system does.
     This section grounds every downstream agent in the project's purpose and structure.
     Keep it to 1-2 paragraphs — dense, factual, no filler. -->

[What the system does, who it serves, how the major pieces connect. Include the primary
data flow or interaction pattern that defines the system's architecture.]

## Module Definitions

<!-- One entry per module. These become the INDEX.md module status table rows.
     Tier determines build order: Tier 1 first, Tier 2 after, Tier 3 last.
     Owns list becomes the scope boundary for Level 1 decomposition agents. -->

### [module-name]

- **Tier:** [1/2/3]
- **Purpose:** [What this module does — one sentence]
- **Owns:**
  - [Responsibility 1 — becomes child scope boundary]
  - [Responsibility 2]
- **Estimated lines:** [Implementation estimate — informs min size gate and scope conservation]
- **Dependencies:** [Other modules this module depends on, or "none"]

### [module-name-2]

- **Tier:** [1/2/3]
- **Purpose:** [What this module does]
- **Owns:**
  - [Responsibility 1]
- **Estimated lines:** [estimate]
- **Dependencies:** [dependencies]

## Architecture Constraints

<!-- Hard rules that every module must follow. These get injected into every agent brief's
     <context> section by the assembly algorithm. Keep them concrete and testable. -->

- [Constraint 1 — e.g., "All inter-module communication uses typed interface contracts"]
- [Constraint 2 — e.g., "Python 3.10+, stdlib + approved dependency list only"]
- [Constraint 3 — e.g., "Every public function has type annotations"]

## Technology Stack

<!-- Languages, frameworks, key libraries. Agents must use only what's listed here.
     Be specific about versions where it matters. -->

- **Language:** [e.g., Python 3.10+]
- **Framework:** [e.g., none / FastAPI / Django]
- **Key libraries:** [e.g., openpyxl, typer, rich]
- **Build system:** [e.g., hatchling, setuptools]
- **Testing:** [e.g., pytest]

## Design Rationale

<!-- Why the system is structured this way. Reference specific decisions (D001, D002, ...)
     from architecture/decisions/. This section is for human reviewers — the .agent.md
     counterpart omits it (agents receive decisions by ID, not rationale). -->

[Key architectural choices and why they were made. Reference decision IDs.]
```

## Agent-facing format (system-map.agent.md)

```
---
type: system-map
scope_root: "artifacts/scope/"
modules: [count]
source_hash: "[SHA-256 of system-map.md]"
---

<architecture_constraints>
- [Hard constraint 1 — injected into every agent brief's <context> section]
- [Hard constraint 2]
- [Hard constraint 3]
</architecture_constraints>

<modules>
  <module name="[module-name]" tier="[1/2/3]">
    <purpose>[One sentence — what this module does]</purpose>
    <owns>
      - [Responsibility 1]
      - [Responsibility 2]
    </owns>
    <estimated_lines>[number]</estimated_lines>
    <dependencies>[comma-separated module names, or "none"]</dependencies>
  </module>

  <module name="[module-name-2]" tier="[1/2/3]">
    <purpose>[What this module does]</purpose>
    <owns>
      - [Responsibility 1]
    </owns>
    <estimated_lines>[number]</estimated_lines>
    <dependencies>[dependencies]</dependencies>
  </module>
</modules>

<technology>
- language: [e.g., Python 3.10+]
- framework: [e.g., none]
- libraries: [e.g., openpyxl, typer, rich]
- build: [e.g., hatchling]
- testing: [e.g., pytest]
</technology>
```

</template>

<conventions>
- **Dual representation.** The .md contains rationale and human-readable details. The .agent.md contains only structured data consumed by the assembly algorithm. source_hash links them for drift detection.
- **Module Owns list is the scope contract.** Each item in a module's Owns list becomes a boundary for Level 1 decomposition. The consistency check (CHECK 2) verifies every Owns item maps to child components. Be precise — vague Owns items create vague decompositions.
- **Architecture Constraints are injected everywhere.** The assembly algorithm reads `<architecture_constraints>` and copies them into every agent brief's `<context>` section. Keep constraints concrete, testable, and minimal. Every constraint competes for agent attention.
- **Tier assignment drives build order.** Tier 1 modules are decomposed and built first. Tier 2 after Tier 1 is complete. Tier 3 last. The tier in the system-map feeds directly into the INDEX.md Module Status table and Step 3 (tier planning) of the scope-decompose workflow.
- **Estimated lines inform gates.** The min size gate (300 lines), contract overhead ratio (30%), and scope conservation check (20% tolerance) all read estimated_lines. Underestimating causes over-decomposition; overestimating causes under-decomposition.
- **Dependencies field enables tier assignment validation.** The orchestrator cross-references module dependencies against tier assignments — a Tier 1 module listing a Tier 2 dependency is a tier inversion error caught at QG4/consistency check.
- **Technology section constrains the entire project.** Agents receive this in their brief context. Importing a library not listed here is a constraint violation. Keep the list accurate and complete.
</conventions>
