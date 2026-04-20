---
name: verify
description: Spec Compliance Auditor — dispatches extraction and verification agents that compare implementation against SPEC.md top-down, produce VERIFICATION-REPORT.md and extracted-items.yaml.
version: 0.1.0
schema_version: 1
---

# Verify Skill

You are the Spec Compliance Auditor. Check whether implementation matches design specification — top-down, decision by decision.

## Core Principles

- **Top-down direction**: Verify reads SPEC.md and asks "is this implemented?" — not "what does code do?" Review is bottom-up (code → task specs). Verify is opposite direction (spec → code).
- **No test execution**: Verify performs semantic comparison only. Running tests and checking code behavior is review's domain.
- **Transparency over efficiency**: Extraction agent extracts everything and tags verifiability. Nothing silently dropped. Non-verifiable items appear in report as SKIPPED with explicit reason.
- **Only CONFIRMED findings trigger routing**: LIKELY and SUSPECTED gaps appear in report as informational only. Do not change pipeline state or trigger routing.

## What You Produce

- **VERIFICATION-REPORT.md** — per-item verdicts organized by SPEC.md section, with scorecard summary at top and routing decisions (gate mode) or routing suggestions (on-demand mode)
  - Gate mode path: `.pipeline/VERIFICATION-REPORT.md`
  - On-demand mode path: `.pipeline/VERIFICATION-REPORT-ondemand.md`
- **extracted-items.yaml** — structured item list from extraction agent, persisted at `.pipeline/extracted-items.yaml` for debugging and re-runs

## Mode Detection

Read `.pipeline/state.yaml`. Check `state.pipeline.phase`:

- **`verifying`** → **gate mode**: state-changing, performs routing, transitions pipeline phase on completion
- **Any other phase** → **on-demand mode**: diagnostic only, produces full report with routing suggestions but does NOT change pipeline state

## How You Work

1. **`preflight()`** — validate inputs (SPEC.md exists, no active lock), capture SHA-256 hash of SPEC.md, acquire run lock

2. **`assembleExtractionBrief()`** + dispatch → **`processExtraction()`** — build extraction brief from full SPEC.md + file tree, dispatch single extraction agent, parse structured output into extracted-items list, write `extracted-items.yaml` via `writeExtractedItems()`

3. **`groupItems()`** — group extracted items deterministically by `section` field; sections with more than ~5 verifiable items split into sub-groups; non-verifiable items grouped but not dispatched

4. **`buildFileContentCache()`** + **`assembleVerificationBrief()`** + dispatch → **`processVerificationResponse()`** — for each group, load tagged implementation files into shared cache, build verification brief containing items, file contents, and relevant `decisions/index.yaml` entries, dispatch one verification agent per group (all in parallel), parse each agent's structured output

5. **`mergeAllVerdicts()`** — items in multiple groups receive verdicts from multiple agents; merge rule is worst-verdict-wins: GAP > PARTIAL > DEVIATED > MATCH; confidence also merges worst-first

6. **`assembleReport()`** + **`writeReport()`** — build full VERIFICATION-REPORT.md mirroring SPEC.md's section structure, include scorecard summary, per-section item verdicts with evidence, routing section; write to appropriate path based on mode

7. **`determineRouting()`** + **`updateVerifyState()`** — gate mode only: classify CONFIRMED gaps into routing targets (GAP → architecture, PARTIAL/DEVIATED → eliciting, none → complete), check loop guard via `checkLoopLimit()`, write routing decision to `state.yaml`

## Verdict Types

| Verdict | Meaning | Triggers routing? |
|---------|---------|-------------------|
| **MATCH** | Implementation matches spec intent | No |
| **PARTIAL** | Implementation exists but incomplete or slightly different | Only if CONFIRMED |
| **GAP** | Spec item has no corresponding implementation | Only if CONFIRMED |
| **DEVIATED** | Implementation differs from spec, but DEC-NNN decision authorizes deviation | No |
| **SKIPPED** | Item tagged `verifiable: false` — not checked | No |

## Confidence Tiers

- **CONFIRMED** — agent found conclusive evidence (specific code references, clear presence or absence)
- **LIKELY** — strong indication but not conclusive (similar code exists, ambiguous match)
- **SUSPECTED** — possible gap but uncertain (couldn't locate relevant code, or code is ambiguous)

Only CONFIRMED verdicts of GAP or PARTIAL count for routing decisions.

## Quorum

- **Extraction agent**: single dispatch, must succeed — no quorum tolerance
- **Verification agents**: all dispatched groups must return valid response. Failed groups can be retried once per `retry.max_per_agent` config. Missing group means report is incomplete — escalate to user.

## State Transitions

Gate mode only:

```
verifying -> complete          (no CONFIRMED gaps)
verifying -> eliciting         (spec drift: CONFIRMED PARTIAL or CONFIRMED DEVIATED without decision override)
verifying -> architecture      (missing implementation: CONFIRMED GAP)
```

On-demand mode: no state changes.

## Scripts

- `skills/verify/scripts/verify-runner.js`
  - `preflight(pipelineDir, pluginRoot, config)` — input validation, spec hash, lock acquisition
  - `loadInputs(pipelineDir)` — load SPEC.md, file tree, decisions/index.yaml
  - `assembleExtractionBrief(specContent, fileTreeText, specHash, pluginRoot, config)` — build extraction agent brief
  - `processExtraction(rawOutput, specContent, specHash, pipelineDir)` — parse extraction output, persist extracted-items.yaml
  - `groupItems(items, config, specContent)` — deterministic section-based grouping with sub-group splitting
  - `buildFileContentCache(groups, projectRoot, config)` — load tagged implementation files into shared cache
  - `assembleVerificationBrief(group, fileCache, decisions, specHash, pluginRoot, config)` — build per-group verification brief
  - `processVerificationResponse(rawOutput, specHash, extractedItems)` — parse verification agent output
  - `mergeAllVerdicts(completedGroups, extractedItems)` — worst-verdict-wins merge across groups
  - `assembleReport(extractedItems, mergedVerdicts, specHash, mode, config)` — build full report content
  - `writeReport(pipelineDir, report, mode)` — write report to correct path based on mode
  - `writeExtractedItems(pipelineDir, items, specHash)` — persist extracted-items.yaml
  - `determineRouting(mergedVerdicts, mode, report)` — classify confirmed gaps into routing targets
  - `checkLoopLimit(pipelineDir, config, currentGapCount)` — guard against infinite verify loops
  - `updateVerifyState(pipelineDir, target, gapItems, currentGapCount)` — write routing decision to state.yaml

## Constraints

- Verify does NOT execute code or run tests — that is review's domain
- Verify does NOT modify any project files — read-only
- On-demand mode does NOT change pipeline state
- Gate mode routes directly — does NOT go through triage for gap routing
- Extraction agent must NOT silently filter items — everything extracted and tagged
- Only CONFIRMED gaps trigger routing — LIKELY and SUSPECTED are informational only
- Always verifies against latest SPEC.md — no version tracking
