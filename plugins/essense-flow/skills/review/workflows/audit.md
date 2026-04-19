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

Get the current sprint number from `state.pipeline.sprint`.

### 2. Transition to Reviewing

Use `lib/state-machine.transition()` to move from `sprint-complete` to `reviewing`.

### 3. Load Context

Gather all review inputs:

- **Task spec paths**: `review-runner.loadTaskSpecPaths(pipelineDir, sprintNumber)` — returns file paths, not content
- **Completion record paths**: `review-runner.loadCompletionRecordPaths(pipelineDir, sprintNumber)` — paths only
- **SPEC.md path**: `review-runner.loadSpecPath(pipelineDir)` — path or null
- **REQ.md**: `review-runner.loadRequirements()` if FR-NNN/NFR-NNN traceability is needed

Agents read the files on demand. Briefs carry paths, not content — this eliminates the re-embedding waste category and supports the verbatim-quote grounding requirement.

If task spec or completion record paths are empty, escalate to user and exit.

### 4. Assemble Review Briefs

Call `review-runner.assembleReviewBriefs(sprintNumber, taskSpecPaths, completionRecordPaths, specPath, pluginRoot, config)`. Each brief lists paths (not content) and the associated hard-constraint requiring a verbatim on-disk quote per finding — fabricated findings fail the grounding check and are auto-dropped at synthesis.

This produces one brief per review perspective (spec-compliance, edge-cases, integration, requirements).

### 5. Dispatch Review Agents

Spawn all review agents in parallel using the Agent tool. Each agent gets its assembled brief as the prompt. All agents are in the same batch — they run concurrently.

Each agent must:
1. Read every file listed in task specs and completion records
2. Check each acceptance criterion against built code
3. Try edge cases and boundary conditions
4. Report findings with confidence tier, file path, line number, reproduction steps
5. Follow the adversarial-brief template output format exactly

### 6. Collect and Parse Outputs

For each agent's raw output, call `review-runner.parseReviewOutputs()`. This:
- Parses the structured output (XML envelope or markdown sections)
- Detects the completion sentinel
- Extracts payload sections
- Classifies any failures

### 7. Check Quorum

Use `lib/agent-output.checkQuorum()` to verify review agents returned valid output. Review phase uses `n-1` quorum (tolerate one missing perspective).

If quorum is not met:
- For recoverable failures (missing sentinel, malformed output): retry the failed agent once
- For non-recoverable failures: escalate to user with the brief attached

### 8. Categorize Findings

Call `review-runner.categorizeFindings()` to:
- Group findings by confidence tier (CONFIRMED, LIKELY, SUSPECTED)
- Group findings by severity (critical, high, medium, low)
- Cross-reference tier and severity for routing decisions

### 9. Generate QA Report

Call `review-runner.generateQAReport()` to produce the full QA-REPORT.md content:
- YAML frontmatter with artifact type, sprint, verdict, timestamp
- Verdict logic: FAIL if any CONFIRMED critical findings, otherwise PASS
- Sections: Summary, Confirmed Findings, Likely Findings, Suspected Findings
- Per-Perspective Attribution table

### 10. Write Report

Call `review-runner.writeQAReport()` to write:
- `.pipeline/reviews/sprint-NN/QA-REPORT.md`

### 11. Transition to Triaging

Use `lib/state-machine.transition()` to move from `reviewing` to `triaging`.

This auto-advances — triage runs immediately to determine next action based on the QA verdict:
- **PASS**: route to next sprint or completion
- **FAIL**: route back to build with the confirmed critical findings as fix tasks

### 12. Auto-Advance: Triage

This transition auto-advances. After transitioning to `triaging`, immediately run triage categorization without waiting for user input:

1. Read the QA-REPORT.md just produced
2. Read SPEC.md if it exists
3. Call `triage-runner.categorizeItems()` with the review findings
4. Call `triage-runner.determineRoute()` to get the target phase
5. Call `triage-runner.generateReport()` and `triage-runner.writeTriage()` to persist results
6. Transition from `triaging` to the determined target phase
7. If target is interactive (eliciting, architecture, requirements-ready): stop and report. User runs the next command.
8. If target is autonomous (research): continue chaining.

### 13. Report

Show the user:
- **Verdict**: PASS or FAIL
- **Finding counts by confidence tier**: CONFIRMED / LIKELY / SUSPECTED
- **Finding counts by severity**: critical / high / medium / low
- **Critical issues** (if any): list each confirmed critical finding
- **Report location**: path to QA-REPORT.md
- **Next recommended action**: based on verdict
