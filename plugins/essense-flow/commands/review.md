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
4. Use `skills/review/scripts/review-runner.js` (canonical /review path):
   - `assembleReviewBriefs(sprintNumber, taskSpecPaths, completionRecordPaths, specPath, pluginRoot, config)` — assemble adversarial briefs
   - Dispatch QA agents in parallel via the Agent tool
   - `parseReviewOutputs(rawOutputs)` — parse + classify per-agent output
   - `categorizeFindings(parsedOutputs)` — Phase A noise filter + tier into confidence/severity buckets
   - `runReview(parsedOutputs, sprintNumber, pipelineDir, config, validatorFns?, validatorRawOutputs?)` — full pipeline including validator round when raw outputs provided
   - `finalizeReview(pipelineDir, sprintNumber, reportContent)` — atomic QA-REPORT write + state transition `reviewing → triaging`
5. Report: QA results summary, findings by severity, next action based on result

Note: the legacy `skills/architect/scripts/architect-runner.runReview` is a separate sync implementation retained for the /architect skill's grounded review path and historical tests. Do not invoke it from /review — it bypasses the validator round and produces a different return shape.

## Constraints

- Do NOT run if not in `sprint-complete` phase — report and stop
- Do NOT modify sprint artifacts — only write to `.pipeline/reviews/`
- All QA briefs under `BRIEF_TOKEN_CEILING`
