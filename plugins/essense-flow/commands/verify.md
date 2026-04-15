---
name: verify
description: Run spec compliance verification — compare implementation against SPEC.md top-down and produce a verdict per design decision.
---

# /verify

Spec compliance check. Available from any pipeline state. Compares the current implementation against `.pipeline/elicitation/SPEC.md` decision by decision and produces `VERIFICATION-REPORT.md`.

## What it does

1. Detects mode from `.pipeline/state.yaml`: `verifying` phase = gate mode (state-changing); any other phase = on-demand mode (diagnostic only)
2. Validates inputs and acquires a run lock via `preflight()`
3. Dispatches one extraction agent to parse every discrete claim out of SPEC.md into a structured item list
4. Groups items by spec section and dispatches one verification agent per group (in parallel)
5. Merges verdicts across groups using worst-verdict-wins
6. Writes `VERIFICATION-REPORT.md` with a scorecard summary and per-section item verdicts
7. Gate mode only: routes directly based on CONFIRMED gaps — no triage round-trip

## Instructions

1. Read `.pipeline/state.yaml` — check `state.pipeline.phase` to determine gate vs. on-demand mode
2. Call `verify-runner.preflight()` — validate SPEC.md exists, compute spec hash, acquire lock; exit on failure
3. Call `verify-runner.loadInputs()` — load SPEC.md content, project file tree, and `decisions/index.yaml`
4. Call `verify-runner.loadCheckpoint()` — resume from checkpoint if spec hash matches a prior partial run
5. Call `verify-runner.assembleExtractionBrief()` — build extraction agent brief
6. Dispatch extraction agent; call `verify-runner.processExtraction()` on its output — parse items, write `extracted-items.yaml`
7. Call `verify-runner.groupItems()` — group by section, split large sections into sub-groups of ~5 verifiable items
8. Call `verify-runner.buildFileContentCache()` — load all tagged implementation files once into a shared cache
9. For each group, call `verify-runner.assembleVerificationBrief()` — build per-group brief with items, file contents, and decision overrides
10. Dispatch all verification agents in parallel (one per group); call `verify-runner.processVerificationResponse()` on each output; save checkpoint after each successful group
11. Call `verify-runner.mergeAllVerdicts()` — worst-verdict-wins merge across groups
12. Call `verify-runner.assembleReport()` then `verify-runner.writeReport()` — produce and persist the report
13. Gate mode only: call `verify-runner.determineRouting()`, `verify-runner.checkLoopLimit()`, `verify-runner.updateVerifyState()`, then transition phase
14. Report: scorecard, CONFIRMED gaps (if any), report path, routing outcome or suggestions

See `skills/verify/SKILL.md` for full behavioral details and `skills/verify/workflows/execute.md` for the step-by-step workflow.

## Constraints

- Do NOT execute code or run tests — semantic comparison only
- Do NOT modify any project files — verify is read-only
- On-demand mode does NOT change pipeline state
- Gate mode routes directly — does NOT go through triage
- The extraction agent must NOT silently filter items — extract everything and tag verifiability
- Only CONFIRMED gaps trigger routing — LIKELY and SUSPECTED are informational only
- Always verifies against the latest SPEC.md — no version tracking
