---
name: review
description: Post-sprint QA review — spawn adversarial agents, categorize findings, produce QA report.
---

# /review

Post-sprint QA review. Alternative to `/architect` auto-routing when triggering review directly.

## What it does

1. Verifies pipeline is in `sprint-complete` phase, atomically transitions to `reviewing`
2. Gathers task specs and built files from completed sprint
3. Spawns 4 QA perspective agents (compliance, alignment, fitness, adversarial)
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

### Hook contract — post-enterReview JS calls MUST use Agent dispatch

Once `enterReview` transitions phase to `reviewing`, `hooks/scripts/review-guard.js` activates a Bash safe-list (`cat, ls, echo, pwd, head, tail, grep, wc, diff, find` + `git log/show/status/diff` only — see `lib/bash-guard.js`). **`node` is NOT on the safe-list.** Trying to invoke any post-enterReview JS function from the main session via `node -e "require('review-runner').assembleReviewBriefs(...)"` will be hook-blocked by design.

The canonical path: dispatch every post-enterReview runner call (assembleReviewBriefs, parseReviewOutputs, categorizeFindings, runReview, finalizeReview) via the **Agent tool**. Subagents inherit `CLAUDE_SUBAGENT=1`, which review-guard.js detects (line 6) and exits early — bypass intentional, not accidental. The Write/Edit hook also matches Tool=Bash|Write|Edit only; Agent-tool dispatch is not matched, so subagents can run node, write artifacts, and call the runner freely within the canonical paths the runner enforces.

Do not improvise around the hook block (no inline `node -e`, no patching `bash-guard.js`, no unsetting `CLAUDE_SUBAGENT`). The hook is the contract; subagent dispatch is the intended path. Reproducible orchestrator confusion in the field — see `.planning/v0.7.0-backlog.md` I-12 — comes from main-session `node -e` attempts after enterReview. Don't.

Note: the legacy `skills/architect/scripts/architect-runner.runReview` is a separate sync implementation retained for the /architect skill's grounded review path and historical tests. Do not invoke it from /review — it bypasses the validator round and produces a different return shape.

## Constraints

- Do NOT run if not in `sprint-complete` OR `reviewing` phase — report and stop
- Do NOT modify sprint artifacts — only write to `.pipeline/reviews/`
- All QA briefs under `BRIEF_TOKEN_CEILING`
