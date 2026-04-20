---
name: architect
description: Plan architecture from requirements or review completed sprint — auto-detected from state.
---

# /architect

Plan architecture or review sprint. Action auto-detected from pipeline state.

## What it does

**Auto-routing:**
- `requirements-ready` → **plan**: spawn perspective agents, synthesize, decompose into sprints, create task specs
- `sprint-complete` → **review**: spawn QA agents, categorize findings, produce QA-REPORT.md
- Other phases → report current phase, suggest correct command

## Instructions

1. Read `.pipeline/state.yaml`, determine phase
2. Route:

**If `requirements-ready` (plan):**
- Read `.pipeline/requirements/REQ.md`
- Read `.pipeline/elicitation/SPEC.md` if exists (primary design source — DEC-010)
- Use `skills/architect/scripts/architect-runner.js`:
  - `planArchitecture(requirements, pluginRoot, config)` — 4 perspective briefs
  - Dispatch perspective agents
  - `synthesizeArchitecture(parsedOutputs, requirements, config)` — ARCH.md
  - `decomposeIntoSprints(tasks)` — wave ordering
  - `createTaskSpecs(tasks, archContext, config)` — .md + .agent.md pairs
  - `writeArchitectureArtifacts(pipelineDir, archDoc, synthDoc)`
  - `writeTaskSpecs(pipelineDir, sprintNumber, specs)`
- Transition: `requirements-ready` → `architecture` → `sprinting`
- Report: architecture complete, next: `/build`

**If `sprint-complete` (review):**
- Use `runQAReview()` to assemble QA briefs, dispatch agents
- Use `runReview(parsedOutputs, sprintNumber, pipelineDir, config)` to categorize and report
- Transition: `sprint-complete` → `reviewing`
- Report: QA complete, findings summary, next action depends on result

**Otherwise:**
- Report current phase, suggest correct next command

## Constraints

- Do NOT run planning if requirements don't exist
- Do NOT skip multi-perspective analysis — always spawn at least 3 agents
- Do NOT resolve decisions silently — log in decisions index
- All briefs under `BRIEF_TOKEN_CEILING`
