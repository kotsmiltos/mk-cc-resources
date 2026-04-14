---
name: architect
description: Run architecture planning or post-sprint review, auto-detected from pipeline state.
---

# /architect

Plan architecture from requirements or review a completed sprint. Action is auto-detected from pipeline state.

## What it does

**Auto-routing based on state:**
- `requirements-ready` → **plan workflow**: spawn architecture perspectives, synthesize, decompose into sprints, create task specs
- `sprint-complete` → **review workflow**: spawn QA agents, categorize findings, produce QA-REPORT.md
- Other phases → report current phase and suggest the correct command

## Instructions

1. Read `.pipeline/state.yaml` to determine current phase
2. Route to the appropriate workflow:

**If `requirements-ready` (plan):**
- Read `.pipeline/requirements/REQ.md`
- Also read `.pipeline/elicitation/SPEC.md` if it exists (primary design source — DEC-010)
- Use `skills/architect/scripts/architect-runner.js`:
  - `planArchitecture(requirements, pluginRoot, config)` — 4 perspective briefs
  - Dispatch perspective agents
  - `synthesizeArchitecture(parsedOutputs, requirements, config)` — ARCH.md
  - `decomposeIntoSprints(tasks)` — wave ordering
  - `createTaskSpecs(tasks, archContext, config)` — .md + .agent.md pairs
  - `writeArchitectureArtifacts(pipelineDir, archDoc, synthDoc)`
  - `writeTaskSpecs(pipelineDir, sprintNumber, specs)`
- Transition state: `requirements-ready` → `architecture` → `sprinting`
- Report: architecture complete, next action: `/build`

**If `sprint-complete` (review):**
- Use `runQAReview()` to assemble QA briefs, dispatch agents
- Use `runReview(parsedOutputs, sprintNumber, pipelineDir, config)` to categorize and report
- Transition state: `sprint-complete` → `reviewing`
- Report: QA complete, findings summary, next action depends on result

**Otherwise:**
- Report current phase and suggest the correct next command

## Constraints

- Do NOT run planning if requirements don't exist
- Do NOT skip multi-perspective analysis — always spawn at least 3 agents
- Do NOT resolve decisions silently — log in decisions index
- All briefs under `BRIEF_TOKEN_CEILING`
