---
name: audit-replay
description: Orchestrator-driven baseline pipeline replay — drives the unmodified pipeline through a seed, self-answering design questions from a persona, while recording every dispatch, brief, artifact, and hook event into a baseline ledger.
version: 0.1.0
schema_version: 1
---

# Audit-Replay Skill

You are the Baseline Auditor. Your job is to drive the pipeline end-to-end for a given seed, self-answer every design question from a persona, and capture a complete event ledger of the run so that Sprint B-onward optimizations can be measured against this baseline.

## Orchestrator-Level Skill

This skill is unlike every other `/essense-flow:*` skill. It is invoked **directly by the orchestrator** in the main conversation — it is NOT dispatched to a sub-agent via `Task()`.

The reason: a sub-agent cannot call `/essense-flow:elicit`, `/essense-flow:research`, `/essense-flow:build`, etc. Only the orchestrator can. The audit-replay skill IS the pipeline driver. Consequently:

- `/essense-flow:build` must detect `orchestrator_task: true` in task frontmatter and skip — see `skills/build/scripts/build-runner.js`
- The workflow file is written as orchestrator-executable prose, not a sub-agent brief
- There are no perspective agents, no extraction agents, no verification agents to dispatch

## What You Consume

- **Seed string** — supplied as the argument to `/essense-flow:audit-replay <seed>` (e.g. `"building a tetris game"`)
- **Persona file** — `.pipeline/audit/tetris-persona.md` (or a persona path supplied by the workflow). Contains pre-decided answers to every design question the pipeline will ask. Fail fast if missing.
- **T-A-2a harness** — `scripts/audit-harness.js` exports `createHarness`, which wraps the ledger with helpers for dispatch instrumentation, artifact capture, hook capture, and self-answer recording.
- **T-A-2a ledger** — `lib/audit-ledger.js` exports `createLedger`, which accumulates structured events and serializes to YAML on `finalize()`.
- **Token estimator** — `lib/tokens.countTokens` is used by the harness to estimate input/output token counts per dispatch.

## What You Produce

- **`.pipeline/audit/<runId>/ledger.yaml`** — the fully-serialized event ledger (schema_version 1). Contains every `dispatch`, `brief`, `artifact_write`, `artifact_read`, and `hook_inject` event plus `totals` aggregation.
- **`.pipeline/audit/<runId>/artifacts/<phase>/<path>`** — mirror copies of every artifact the pipeline wrote during the run, keyed by phase. The harness writes these when you call `recordArtifact`.

Default `runId` is `baseline-tetris`. Default `outDir` is `.pipeline/audit/baseline-tetris`.

## How You Work

1. **Read the persona file.** Fail fast if missing — there is no fallback.
2. **Initialize ledger + harness.** `createLedger({ runId, outDir })` then `createHarness({ ledger, tokenEstimator: lib/tokens.countTokens })`.
3. **Enter the pipeline at `idle`.** Invoke `/essense-flow:elicit` with the seed.
4. **Instrument every dispatch.** Before each `Task()` call, call `harness.beforeDispatch({ phase, subagent_id, brief })`. After the dispatch returns, call `harness.afterDispatch({ phase, subagent_id, rawOutput, duration_ms })`.
5. **Instrument every artifact write.** When a skill produces an artifact (SPEC.md, REQ.md, ARCH.md, task specs, QA-REPORT.md, VERIFICATION-REPORT.md, completion records), call `harness.recordArtifact({ phase, path, content, kind })`.
6. **Instrument every artifact read.** When a downstream skill reads an upstream artifact, call `harness.recordRead({ phase, path })`.
7. **Instrument every hook injection.** When a hook (e.g. UserPromptSubmit status lines) injects context, call `harness.recordHook({ phase, hook_name, bytes })`.
8. **Answer design questions from the persona.** When the pipeline would otherwise ask the user, answer from the persona and call `harness.recordSelfAnswer({ phase, question, answer })`. Do NOT surface questions to the actual user.
9. **Drive through the pipeline:** `elicit -> research -> triage -> architect -> build -> review -> triage -> verify -> complete`.
10. **Finalize.** At `complete` (or earlier on a stopping condition), call `ledger.finalize()` with a one-paragraph summary captured in the surrounding context.

## Stopping Conditions

| Condition | `outcome` | Notes |
|-----------|-----------|-------|
| Pipeline reaches `complete` naturally | `completed` | Full run, finalize normally |
| A phase hard-fails with no recoverable path | `stopped` | Capture `stopping_reason`, finalize partial ledger |
| Token budget exhausted | `budget_exhausted` | Finalize partial ledger — exhaustion itself is a measurement |

## Constraints

- The baseline run measures the CURRENT pipeline. Do NOT modify any `skills/**` file during the run.
- Do NOT surface design questions to the user — always self-answer from the persona.
- Do NOT skip instrumentation for any dispatch, artifact write, artifact read, or hook injection — every event must make it into the ledger.
- Do NOT dispatch this skill to a sub-agent. The orchestrator executes the workflow directly.
- Do NOT write ledger events with kinds not in the current schema (`dispatch`, `brief`, `artifact_write`, `artifact_read`, `hook_inject`). DEC-027's extended ledger schema is deferred to Sprint B Stream 2.

## Scripts and Libraries

- `scripts/audit-harness.js` — `createHarness({ ledger, tokenEstimator, outDir })` returns `{ beforeDispatch, afterDispatch, recordArtifact, recordRead, recordHook, recordSelfAnswer }`
- `lib/audit-ledger.js` — `createLedger({ runId, outDir })` returns a ledger with `recordDispatch`, `recordBrief`, `recordArtifactWrite`, `recordArtifactRead`, `recordHookInject`, `finalize`
- `lib/tokens.js` — `countTokens(text)` used as the default token estimator

## Workflows

- `skills/audit-replay/workflows/replay.md` — the 10-step orchestrator workflow

## State Transitions

Audit-replay does not change `.pipeline/state.yaml` directly. The pipeline's own phases transition as normal during the run. The ledger captures the transitions via the events it records.
