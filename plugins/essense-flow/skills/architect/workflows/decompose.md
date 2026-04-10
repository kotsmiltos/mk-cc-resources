---
workflow: architect-decompose
skill: architect
trigger: module-too-large
phase_requires: architecture
phase_transitions: architecture → decomposing → architecture
---

# Cascading Decomposition Workflow

## Prerequisites

- Architecture phase active
- A module or task exceeds the file size backstop or token ceiling

## Steps

### 1. Identify Oversized Module
Check which module or task exceeds limits:
- File lines backstop (from config.overflow.file_lines_backstop)
- Brief token ceiling (from config.token_budgets.brief_ceiling)
- Max decomposition depth (from config.overflow.max_decomposition_depth)

### 2. Spawn Decomposition Agents
For the oversized module, spawn parallel agents to break it into sub-components:
- Each agent focuses on a logical sub-boundary
- Interface contracts between sub-components are defined

### 3. Verify Sub-Components
Run consistency verifier on the sub-component outputs.

### 4. Update Architecture
Add sub-components to the module map. Update dependency graph. Regenerate waves.

### 5. Check Depth
If any sub-component still exceeds limits and depth < max_decomposition_depth, recurse.
If depth reached, escalate to user.

### 6. Regenerate Task Specs
Create .md + .agent.md for the new leaf tasks.
