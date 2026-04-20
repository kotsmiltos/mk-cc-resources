---
name: verify
description: Spec compliance verification — compare implementation against SPEC.md and produce verdict per design decision.
---

# /verify

Spec compliance check. Available from any pipeline state. Compares implementation against `.pipeline/elicitation/SPEC.md` decision by decision, produces `VERIFICATION-REPORT.md`.

## What it does

1. Detects mode from `.pipeline/state.yaml`: `verifying` phase = gate mode (state-changing); any other phase = on-demand mode (diagnostic only)
2. Validates inputs, acquires run lock via `preflight()`
3. Dispatches one extraction agent to parse every discrete claim from SPEC.md into structured item list
4. Groups items by spec section, dispatches one verification agent per group (parallel)
5. Merges verdicts across groups using worst-verdict-wins
6. Writes `VERIFICATION-REPORT.md` with scorecard summary and per-section item verdicts
7. Gate mode only: routes directly based on CONFIRMED gaps — no triage round-trip

## Instructions

1. Read `.pipeline/state.yaml` — check `state.pipeline.phase` to determine gate vs. on-demand mode
2. Call `verify-runner.preflight()` — validate SPEC.md exists, compute spec hash, acquire lock; exit on failure
3. Call `verify-runner.loadInputs()` — load SPEC.md content, project file tree, `decisions/index.yaml`
4. Call `verify-runner.loadCheckpoint()` — resume from checkpoint if spec hash matches prior partial run
5. Call `verify-runner.assembleExtractionBrief()` — build extraction agent brief
6. Dispatch extraction agent; call `verify-runner.processExtraction()` on output — parse items, write `extracted-items.yaml`
7. Call `verify-runner.groupItems()` — group by section, split large sections into sub-groups of ~5 verifiable items
8. Call `verify-runner.buildFileContentCache()` — load all tagged implementation files into shared cache
9. For each group, call `verify-runner.assembleVerificationBrief()` — build per-group brief with items, file contents, decision overrides
10. Dispatch all verification agents in parallel (one per group); call `verify-runner.processVerificationResponse()` on each output; save checkpoint after each successful group
11. Call `verify-runner.mergeAllVerdicts()` — worst-verdict-wins merge across groups
12. Call `verify-runner.assembleReport()` then `verify-runner.writeReport()` — produce and persist report
13. Gate mode only: call `verify-runner.determineRouting()`, `verify-runner.checkLoopLimit()`, `verify-runner.updateVerifyState()`, then transition phase
14. Report: scorecard, CONFIRMED gaps (if any), report path, routing outcome or suggestions

See `skills/verify/SKILL.md` for full behavioral details and `skills/verify/workflows/execute.md` for step-by-step workflow.

## Constraints

- Do NOT execute code or run tests — semantic comparison only
- Do NOT modify any project files — verify is read-only
- On-demand mode does NOT change pipeline state
- Gate mode routes directly — does NOT go through triage
- Extraction agent must NOT silently filter items — extract everything and tag verifiability
- Only CONFIRMED gaps trigger routing — LIKELY and SUSPECTED are informational only
- Always verifies against latest SPEC.md — no version tracking
