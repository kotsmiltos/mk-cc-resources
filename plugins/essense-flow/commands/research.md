---
name: research
description: Start multi-perspective research to produce structured requirements from a problem statement.
arguments:
  - name: problem-statement
    description: The problem or project idea to research
    required: true
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
2. Run the research skill:

```bash
# Assemble briefs and dispatch agents
```

Use `skills/research/scripts/research-runner.js` to:
- `assemblePerspectiveBriefs(problemStatement, pluginRoot, config)` — produces 4 briefs
- Dispatch each brief to a perspective agent
- `parseAgentOutputs(rawOutputs)` — parse XML envelopes
- `synthesizeAndGenerate(parsedOutputs, pluginRoot, vocabulary)` — produce REQ.md

3. Write REQ.md to `.pipeline/requirements/REQ.md`
4. Report: requirements generated, next action: `/architect`

## Constraints

- Do NOT run if pipeline is not in `idle` phase — report current phase and stop
- Do NOT skip any perspective — quorum requires all 4
- Do NOT resolve disagreements — surface them for the architect
- All briefs must stay under `BRIEF_TOKEN_CEILING` (12K tokens)
