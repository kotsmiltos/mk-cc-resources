> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** Task 1
> **estimated_size:** M

# Task 3: Review Workflow Runner

## Goal
Add `runReview()` and `categorizeFindings()` to `skills/architect/scripts/architect-runner.js` to orchestrate the post-sprint QA review process: gather sprint output, synthesize QA agent results by severity, produce a QA-REPORT.md.

## Context
Read `skills/architect/workflows/review.md` for the full review workflow. The `runQAReview()` function (built in Sprint 5) assembles QA briefs. This task adds the functions that process QA results after agents return. Read `lib/agent-output.js` for output parsing and `lib/synthesis.js` for entity extraction.

## Interface Specification

### Inputs
- `parsedQAOutputs` — array of parsed QA agent outputs (from `agentOutput.parseOutput`)
- `sprintNumber` — completed sprint number
- `pipelineDir` — `.pipeline/` path
- `config` — pipeline config

### Outputs
- `{ ok, report, findings, summary }` where:
  - `report` — full QA-REPORT.md content
  - `findings` — categorized findings `{ critical: [], high: [], medium: [], low: [] }`
  - `summary` — `{ totalFindings, critical, high, medium, low, pass }`

## Pseudocode

```
FUNCTION categorizeFindings(parsedQAOutputs):
  1. Initialize findings = { critical: [], high: [], medium: [], low: [] }
  2. For each agent output:
     a. Extract payload sections (analysis, findings, risks, recommendations)
     b. Split each section into individual items
     c. For each item, detect severity keywords:
        - "critical", "must fix", "blocks", "crash", "data loss" → critical
        - "high", "should fix", "important", "significant" → high
        - "medium", "consider", "improvement", "refactor" → medium
        - "low", "minor", "nice to have", "cosmetic" → low
        - Default (no keyword): medium
     d. Add to the appropriate category with source agentId
  3. Return findings

FUNCTION generateQAReport(sprintNumber, findings, parsedQAOutputs):
  1. Count findings per category
  2. Determine overall result:
     - If critical.length > 0: "FAIL (N critical issues)"
     - If high.length > 0: "PASS (N notes)"
     - Else: "PASS"
  3. Build markdown report following QA-REPORT.md format:
     - Frontmatter with type, date, plan path, overall_result
     - Summary section
     - Critical/High/Medium/Low sections
     - Source perspectives
  4. Return report string

FUNCTION runReview(parsedQAOutputs, sprintNumber, pipelineDir, config):
  1. categorize = categorizeFindings(parsedQAOutputs)
  2. report = generateQAReport(sprintNumber, categorize, parsedQAOutputs)
  3. Write report to pipelineDir/reviews/sprint-N/QA-REPORT.md
  4. Return { ok: true, report, findings: categorize, summary }
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/architect/scripts/architect-runner.js` | MODIFY | Add `categorizeFindings`, `generateQAReport`, `runReview` functions + export |
| `tests/architecture-integration.test.js` | MODIFY | Add tests for `categorizeFindings` and `runReview` |

## Acceptance Criteria

- [ ] `categorizeFindings` correctly categorizes by severity keywords
- [ ] `generateQAReport` produces valid markdown with frontmatter
- [ ] `runReview` writes QA-REPORT.md to the correct path
- [ ] Overall result is FAIL when critical findings exist
- [ ] Overall result is PASS when no critical findings
- [ ] Findings include source agent attribution
- [ ] Integration tests verify categorization and report generation
