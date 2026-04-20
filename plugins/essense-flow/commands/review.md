---
name: review
description: Post-sprint QA review — spawn adversarial agents, categorize findings, produce QA report.
---

# /review

Post-sprint QA review. Alternative to `/architect` auto-routing when triggering review directly.

## What it does

1. Verifies pipeline is in `sprint-complete` phase
2. Gathers task specs and built files from completed sprint
3. Spawns 4 QA perspective agents (compliance, alignment, fitness, adversarial)
4. Categorizes findings by severity
5. Writes QA-REPORT.md
6. Transitions: `sprint-complete` → `reviewing`

## Instructions

1. Read `.pipeline/state.yaml`, verify phase is `sprint-complete`
2. Get sprint number from `state.pipeline.sprint`
3. Gather inputs:
   - Task spec paths from `.pipeline/sprints/sprint-N/tasks/*.md`
   - Built file paths from completion records in `.pipeline/sprints/sprint-N/completion/`
   - Requirements path: `.pipeline/requirements/REQ.md`
4. Use `skills/architect/scripts/architect-runner.js`:
   - `runQAReview(sprintNumber, taskSpecPaths, builtFilePaths, requirementsPath, pluginRoot, config)` — assemble QA briefs
   - Dispatch QA agents
   - `runReview(parsedOutputs, sprintNumber, pipelineDir, config)` — categorize and write report
5. Report: QA results summary, findings by severity, next action based on result

## Constraints

- Do NOT run if not in `sprint-complete` phase — report and stop
- Do NOT modify sprint artifacts — only write to `.pipeline/reviews/`
- All QA briefs under `BRIEF_TOKEN_CEILING`
