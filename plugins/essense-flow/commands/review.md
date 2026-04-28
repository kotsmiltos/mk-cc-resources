---
name: review
description: Post-sprint QA review — spawn adversarial agents, categorize findings, produce QA report.
---

# /review

Post-sprint QA review. Alternative to `/architect` auto-routing when triggering review directly.

## What it does

1. Verifies pipeline is in `sprint-complete` phase, atomically transitions to `reviewing`
2. Gathers task specs and built files from completed sprint
3. Spawns QA perspective agents (compliance, alignment, fitness, adversarial — count adapts to scope)
4. Categorizes findings by severity
5. Writes QA-REPORT.md
6. Transitions: `reviewing` → `triaging` (atomic via `finalizeReview`)

## Instructions

1. Read `.pipeline/state.yaml`, verify phase is `sprint-complete` OR `reviewing` (resume after crash). Get sprint number from `state.pipeline.sprint`. **Atomic entry transition (MANDATORY single call):** `review-runner.enterReview(pipelineDir, sprintNumber)`. Phase=sprint-complete advances to reviewing + state-history audit; phase=reviewing returns `alreadyEntered:true` (idempotent resume). If `!ok`, abort and report — do not run validators against an inconsistent state. Closes the last open B-class boundary (B5): without atomic entry, an early /review crash left phase=sprint-complete and autopilot would re-fire /review on every Stop.
2. (entry transition handled in step 1 — proceed)
3. Gather inputs:
   - Task spec paths from `.pipeline/sprints/sprint-N/tasks/*.md`
   - Built file paths from completion records in `.pipeline/sprints/sprint-N/completion/`
   - Requirements path: `.pipeline/requirements/REQ.md`
4. Use `skills/review/scripts/review-runner.js` (canonical /review path):
   - `enterReview(pipelineDir, sprintNumber)` — atomic entry transition `sprint-complete → reviewing` (idempotent on resume). MANDATORY single call before any validator dispatch.
   - `assembleReviewBriefs(sprintNumber, taskSpecPaths, completionRecordPaths, specPath, pluginRoot, config)` — assemble adversarial briefs
   - Dispatch QA agents in parallel via the Agent tool
   - `parseReviewOutputs(rawOutputs)` — parse + classify per-agent output
   - `categorizeFindings(parsedOutputs)` — Phase A noise filter + tier into confidence/severity buckets
   - `runReview(parsedOutputs, sprintNumber, pipelineDir, config, validatorFns?, validatorRawOutputs?)` — full pipeline including validator round when raw outputs provided
   - `finalizeReview(pipelineDir, sprintNumber, reportContent)` — atomic QA-REPORT write + state transition `reviewing → triaging`
5. Report: QA results summary, findings by severity, next action based on result

### Hook scope during reviewing phase

`hooks/scripts/review-guard.js` restricts Write/Edit during `reviewing` to: `.pipeline/reviews/<sprint>/`, `.pipeline/triage/`, and `.pipeline/state.yaml`. Bash is unrestricted. Subagents bypass entirely (`CLAUDE_SUBAGENT=1` env). Source code is not in the allowlist by design — do not edit production code during review; if a finding requires a code fix, it routes to /triage → /architect or back to /build.

Note: the legacy `skills/architect/scripts/architect-runner.runReview` is a separate sync implementation retained for the /architect skill's grounded review path and historical tests. Do not invoke it from /review — it bypasses the validator round and produces a different return shape.

## Constraints

- Do NOT run if not in `sprint-complete` OR `reviewing` phase — report and stop
- Do NOT modify sprint artifacts — only write to `.pipeline/reviews/`
- All QA briefs under `BRIEF_TOKEN_CEILING`
