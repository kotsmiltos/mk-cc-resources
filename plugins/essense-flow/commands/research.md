---
name: research
description: Start multi-perspective research to produce structured requirements from a problem statement.
arguments:
  - name: problem-statement
    description: The problem or project idea to research (optional if SPEC.md exists from elicitation)
    required: false
---

# /research

Run multi-perspective research on a problem statement, producing structured requirements.

## What it does

1. Validates pipeline state is `idle` (research is the first phase)
2. Assembles perspective briefs (Security, Infrastructure, UX, Testing)
3. Dispatches 4 parallel perspective agents
4. Synthesizes findings into alignment matrix
5. Generates `.pipeline/requirements/REQ.md` with FR-NNN/NFR-NNN entries
6. Transitions state: `idle` → `research` → `requirements-ready`

## Instructions

1. Read `.pipeline/state.yaml` and verify phase is `idle`

2. Determine input mode:

   **If `.pipeline/elicitation/SPEC.md` exists** (rich input from elicitation):
   - Read SPEC.md, strip YAML frontmatter, use body as `problemStatement`
   - Select adaptive perspectives based on the spec's content and domain (see SKILL.md for guidance)
   - Use adaptive token budget: `brief_ceiling` scales to accommodate the full spec plus perspective instructions
   - If user also provided a problem-statement argument, prefer SPEC.md (log a note)

   **If no SPEC.md** (direct problem statement):
   - Use the `problem-statement` argument directly
   - Use default 4 perspectives (Security, Infrastructure, UX, Testing)
   - Use standard token budget (12K brief_ceiling)

3. Run the research skill:

Use `skills/research/scripts/research-runner.js` to:
- `assemblePerspectiveBriefs(problemStatement, pluginRoot, config, lenses)` — produces briefs (adaptive lenses for rich input, default for direct input)
- Dispatch each brief to a perspective agent
- `parseAgentOutputs(rawOutputs)` — parse XML envelopes
- `synthesizeAndGenerate(parsedOutputs, pluginRoot, vocabulary)` — produce REQ.md

4. Write REQ.md to `.pipeline/requirements/REQ.md`
5. Report: requirements generated, next action: `/architect`

## Constraints

- Do NOT run if pipeline is not in `idle` phase — report current phase and stop
- Do NOT skip any perspective — quorum requires all active perspectives
- Do NOT resolve disagreements — surface them for the architect
- Token budget is adaptive when SPEC.md is present (DEC-007); standard 12K for direct input
