---
name: audit-replay
description: Replay the pipeline end-to-end for a seed, self-answering design questions from a persona, and record every dispatch/brief/artifact/hook event into a baseline ledger.
arguments:
  - name: seed
    description: The project pitch used to drive the replay (e.g. "building a tetris game")
    required: true
---

# /audit-replay

Orchestrator-driven baseline run. Drives the unmodified pipeline through the supplied `seed` end-to-end, self-answering design questions from a persona file, while the T-A-2a harness captures every dispatch, brief, artifact write/read, and hook injection into a baseline ledger.

The orchestrator IS the pipeline driver — a sub-agent cannot invoke `/essense-flow:*` skills, so this command is executed directly by the orchestrator in conversation, not via Task() dispatch.

## What it does

1. Loads the persona file (default: `.pipeline/audit/tetris-persona.md`) — the source of truth for self-answered design questions
2. Initializes a ledger + harness pair via `lib/audit-ledger.createLedger` and `scripts/audit-harness.createHarness`
3. Enters the pipeline at `idle` and invokes `/essense-flow:elicit` with the seed
4. For every skill invocation that triggers `Task()` dispatches, wraps the dispatch with `harness.beforeDispatch` / `harness.afterDispatch`
5. For every artifact write (SPEC.md, REQ.md, ARCH.md, task specs, QA-REPORT.md, VERIFICATION-REPORT.md, completion YAMLs), calls `harness.recordArtifact({ phase, path, content, kind })`
6. For every artifact read, calls `harness.recordRead`
7. For every hook-injected context (UserPromptSubmit status lines), calls `harness.recordHook`
8. When a pipeline skill asks a design question that would otherwise surface to the user, answers from the persona and calls `harness.recordSelfAnswer`
9. Drives the pipeline through `elicit -> research -> triage -> architect -> build -> review -> triage -> verify -> complete`
10. Finalizes the ledger with run metadata (outcome, stopping reason, notes)

## Instructions

1. Resolve the seed argument. Exit if not supplied.
2. Follow `skills/audit-replay/workflows/replay.md` for the full 10-step replay flow
3. Reference `skills/audit-replay/SKILL.md` for identity, constraints, and stopping conditions

## Constraints

- Do NOT modify any pipeline skill during the baseline run — the run is a measurement of the CURRENT pipeline
- Do NOT dispatch this command to a sub-agent — `/essense-flow:*` skills require orchestrator invocation
- Do NOT skip harness instrumentation for any dispatch, artifact write, artifact read, or hook injection
- Do NOT surface design questions to the user — answer from the persona and record via `harness.recordSelfAnswer`
- If a phase hard-fails with no recoverable path, finalize the partial ledger with `outcome: "stopped"` and a `stopping_reason`
- If the token budget is exhausted, finalize the partial ledger with `outcome: "budget_exhausted"`
