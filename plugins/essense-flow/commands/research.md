---
name: research
description: Multi-perspective research producing structured requirements from problem statement.
arguments:
  - name: problem-statement
    description: Problem or project idea to research (optional if SPEC.md exists)
    required: false
---

# /research

Multi-perspective research on problem statement, producing structured requirements.

## What it does

1. Validates pipeline state is `idle`
2. Assembles perspective briefs (Security, Infrastructure, UX, Testing)
3. Dispatches 4 parallel perspective agents
4. Synthesizes findings into alignment matrix
5. Generates `.pipeline/requirements/REQ.md` with FR-NNN/NFR-NNN entries
6. Transitions: `idle` → `research` → `requirements-ready`

## Instructions

1. Read `.pipeline/state.yaml`, verify phase is `idle`

2. Determine input mode:

   **If `.pipeline/elicitation/SPEC.md` exists (rich input):**
   - Read SPEC.md, strip YAML frontmatter, use body as `problemStatement`
   - Select adaptive perspectives based on spec's content and domain (see SKILL.md)
   - Use adaptive token budget: `brief_ceiling` scales to fit full spec plus perspective instructions
   - If user also provided problem-statement argument, prefer SPEC.md (log note)

   **If no SPEC.md (direct input):**
   - Use `problem-statement` argument directly
   - Use `DEFAULT_LENSES` (Security, Infrastructure, UX, Testing — count adapts if registry changes)
   - Use standard token budget (12K brief_ceiling)

3. Use `skills/research/scripts/research-runner.js`:
   - `assemblePerspectiveBriefs(problemStatement, pluginRoot, config, lenses)` — briefs (adaptive lenses for rich input, default for direct)
   - Dispatch each brief to perspective agent
   - `parseAgentOutputs(rawOutputs)` — parse XML envelopes
   - `synthesizeAndGenerate(parsedOutputs, pluginRoot, vocabulary)` — produce REQ.md

4. Write REQ.md to `.pipeline/requirements/REQ.md`
5. Report: requirements generated, next: `/architect`

## Constraints

- Do NOT run if not in `idle` phase — report current phase and stop
- Do NOT skip any perspective — quorum requires all active perspectives
- Do NOT resolve disagreements — surface for architect
- Token budget is adaptive when SPEC.md present (DEC-007); standard 12K for direct input
