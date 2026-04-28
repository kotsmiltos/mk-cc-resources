---
workflow: review-audit
skill: review
trigger: /review
phase_requires: sprint-complete
phase_transitions: sprint-complete -> reviewing -> triaging
---

# Review Audit Workflow

## Prerequisites

- Pipeline initialized (`.pipeline/state.yaml` exists)
- State phase is `sprint-complete`
- Sprint has task specs in `.pipeline/sprints/sprint-N/tasks/`
- Sprint has completion records in `.pipeline/sprints/sprint-N/completion/`

## Steps

### 1. Validate State

Read `.pipeline/state.yaml`. Verify phase is `sprint-complete`. If not, report current phase and exit.

Get sprint number from `state.pipeline.sprint`.

### 2. Transition to Reviewing

Use `lib/state-machine.transition()` to move from `sprint-complete` to `reviewing`.

### 3. Load Context

Gather review inputs:

- **Task spec paths**: `review-runner.loadTaskSpecPaths(pipelineDir, sprintNumber)` — file paths, not content
- **Completion record paths**: `review-runner.loadCompletionRecordPaths(pipelineDir, sprintNumber)` — paths only
- **SPEC.md path**: `review-runner.loadSpecPath(pipelineDir)` — path or null
- **REQ.md**: `review-runner.loadRequirements()` if FR-NNN/NFR-NNN traceability needed

Agents read files on demand. Briefs carry paths, not content — eliminates re-embedding waste and supports verbatim-quote grounding requirement.

If task spec or completion record paths empty, escalate to user and exit.

### 4. Assemble Review Briefs

Call `review-runner.assembleReviewBriefs(sprintNumber, taskSpecPaths, completionRecordPaths, specPath, pluginRoot, config)`. Each brief lists paths (not content) and associated hard-constraint requiring verbatim on-disk quote per finding — fabricated findings fail grounding check and are auto-dropped at synthesis.

Produces one brief per review perspective (spec-compliance, edge-cases, integration, requirements).

### 5. Dispatch Review Agents

Spawn all review agents in parallel using Agent tool. Each gets assembled brief as prompt. All agents in same batch — run concurrently.

Each agent must:
1. Read every file listed in task specs and completion records
2. Check each acceptance criterion against built code
3. Try edge cases and boundary conditions
4. Report findings with confidence tier, file path, line number, reproduction steps
5. Follow adversarial-brief template output format exactly

### 6. Collect and Parse Outputs

For each agent's raw output, call `review-runner.parseReviewOutputs()`. This:
- Parses structured output (XML envelope or markdown sections)
- Detects completion sentinel
- Extracts payload sections
- Classifies any failures

### 7. Check Quorum

Use `lib/agent-output.checkQuorum()`. Review phase uses `n-1` quorum (tolerate one missing perspective).

If quorum not met:
- For recoverable failures (missing sentinel, malformed output): retry failed agent once
- For non-recoverable failures: escalate to user with brief attached

### 8. Categorize Findings

Call `review-runner.categorizeFindings()` to:
- Group by confidence tier (CONFIRMED, LIKELY, SUSPECTED)
- Group by severity (critical, high, medium, low)
- Cross-reference tier and severity for routing decisions

### 9. Generate QA Report

Call `review-runner.generateQAReport()` to produce full QA-REPORT.md content:
- YAML frontmatter with artifact type, sprint, verdict, timestamp
- Verdict logic: FAIL if any CONFIRMED critical findings, otherwise PASS
- Sections: Summary, Confirmed Findings, Likely Findings, Suspected Findings
- Per-Perspective Attribution table

### 10. Finalize Review (Atomic — Write Report + Transition to Triaging)

**MANDATORY single call.** Do not split. Do not stop between writing the
report and transitioning state — phase=reviewing must not persist after
QA-REPORT.md has been produced, otherwise autopilot will not know whether
to fire /review (resume) or /triage (advance).

Call `review-runner.finalizeReview(pipelineDir, sprintNumber, reportContent)`.
This:

1. Writes `.pipeline/reviews/sprint-NN/QA-REPORT.md` (same as `writeQAReport`).
2. Calls `lib/state-machine.writeState` to transition `reviewing → triaging`
   atomically. The transition is recorded in `state-history.yaml` with
   trigger `review-skill` and the QA-REPORT path as the triggering artifact.

Returns `{ ok, qaReportPath, transitioned, error? }`:
- `ok: true` → continue to step 12 (auto-advance triage)
- `ok: false` → QA-REPORT was written but state transition failed (e.g.
  phase was not `reviewing`). Surface the error to the user and stop;
  do not proceed to step 12 against unknown state.

### 12. Auto-Advance: Triage

After transitioning to `triaging`, immediately run triage without waiting for user input:

1. Read QA-REPORT.md just produced
2. Read SPEC.md if exists
3. Call `triage-runner.categorizeItems()` with review findings
4. Call `triage-runner.routeFinal(qaReportPath, categorized)` to determine target phase.
   - `routeFinal` reads `blocks_advance_count` from QA-REPORT.md frontmatter as the deterministic primary signal:
     - `count === 0` → routes directly to `verifying` (no blockers)
     - `count > 0` or count missing → falls back to `determineRoute(categorized)` for category-based routing
   - The returned `{ route, signal }` includes the provenance (`source: blocks_advance | category | missing`) — log this for audit visibility.
5. Call `triage-runner.generateReport()` and `triage-runner.writeTriage()` to persist
6. Transition from `triaging` to determined target phase
7. If target is interactive (eliciting, architecture, requirements-ready): stop and report. User runs next command.
8. If target is autonomous (research): continue chaining.

### 13. Report

Show user:
- **Verdict**: PASS or FAIL
- **Finding counts by confidence tier**: CONFIRMED / LIKELY / SUSPECTED
- **Finding counts by severity**: critical / high / medium / low
- **Critical issues** (if any): list each confirmed critical finding
- **Report location**: path to QA-REPORT.md
- **Next recommended action**: based on verdict
