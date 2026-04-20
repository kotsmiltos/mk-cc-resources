---
workflow: audit-replay
skill: audit-replay
trigger: /essense-flow:audit-replay
---

# Audit-Replay Workflow

This workflow is executed **directly by the orchestrator**, not by a sub-agent. It drives the pipeline end-to-end for a seed while instrumenting every event into a baseline ledger.

## Prerequisites

- `.pipeline/` initialized
- Pipeline phase is `idle` (fresh state) or the run is intentionally restarting
- Persona file exists at `.pipeline/audit/tetris-persona.md` (or the persona path specified for this run)
- `scripts/audit-harness.js` and `lib/audit-ledger.js` are present (T-A-2a)

## Inputs

- **`<seed>`** — the project pitch supplied to `/essense-flow:audit-replay` (e.g. `"building a tetris game"`)
- **`runId`** — defaults to `baseline-tetris`
- **`outDir`** — defaults to `.pipeline/audit/<runId>`
- **`personaPath`** — defaults to `.pipeline/audit/tetris-persona.md`

## Steps

### 1. Read the persona

Read `personaPath`. Fail fast with a clear error if missing — there is no fallback. Keep the full persona content accessible for the duration of the run; it is the sole source of truth for self-answers.

### 2. Initialize ledger + harness

```js
const { createLedger } = require('lib/audit-ledger');
const { createHarness } = require('scripts/audit-harness');
const { countTokens } = require('lib/tokens');

const ledger = createLedger({ runId, outDir });
const harness = createHarness({ ledger, tokenEstimator: countTokens, outDir });
```

### 3. Enter the pipeline at `idle`

Invoke `/essense-flow:elicit` with the seed as its argument. This starts the elicit phase.

### 4. Instrument every dispatch

For every `Task()` invocation that a pipeline skill performs:

- Before the dispatch: `harness.beforeDispatch({ phase, subagent_id, brief })` — `phase` is the current pipeline phase (`elicit`, `research`, `architect`, `build`, `review`, `triage`, `verify`); `subagent_id` is a stable identifier for the dispatch (e.g. `research:security`); `brief` is the full prompt string sent to the sub-agent.
- After the dispatch: `harness.afterDispatch({ phase, subagent_id, rawOutput, duration_ms })` — `rawOutput` is the sub-agent's response text; `duration_ms` is the wall-clock duration.

The harness computes token counts via the estimator and emits `brief` and `dispatch` events to the ledger.

### 5. Record every artifact write

Whenever a skill produces or updates an artifact (SPEC.md, REQ.md, ARCH.md, task specs, QA-REPORT.md, VERIFICATION-REPORT.md, completion YAMLs, etc.), call:

```js
harness.recordArtifact({ phase, path, content, kind });
```

- `phase` — current pipeline phase
- `path` — the project-relative path the artifact was written to
- `content` — the full text content of the artifact
- `kind` — one of `spec`, `requirements`, `architecture`, `task_spec`, `qa_report`, `verification_report`, `completion` (or another descriptive tag)

The harness mirrors the artifact into `<outDir>/artifacts/<phase>/<path>` and emits an `artifact_write` event.

### 6. Record every artifact read

When a downstream skill reads an upstream artifact for the first time within its phase, call:

```js
harness.recordRead({ phase, path });
```

This populates `totals.cross_reference` so the ledger can surface read/unread deltas between phases.

### 7. Record every hook injection

When a hook (UserPromptSubmit, PreToolUse, etc.) injects context bytes into a skill's brief, call:

```js
harness.recordHook({ phase, hook_name, bytes });
```

The `bytes` argument is the byte count of the injected payload.

### 8. Self-answer design questions from the persona

When a pipeline skill surfaces a design question that would otherwise go to the user (elicit clarifications, architect tie-breaks, etc.):

- Consult the persona for the matching answer. The persona is the single source of truth.
- Return the persona's answer to the skill as if the user had typed it.
- Record the exchange: `harness.recordSelfAnswer({ phase, question, answer })`.

Never surface these questions to the actual user during a replay — that defeats the baseline.

### 9. Drive through every phase

Execute the full pipeline sequence, invoking the next slash command at each transition:

```
elicit -> research -> triage -> architect -> build -> review -> triage -> verify -> complete
```

Between phases, `/essense-flow:next` or `/essense-flow:status` may be consulted to confirm the transition target. Continue to instrument every dispatch, artifact event, and hook injection in each phase.

Note on `/essense-flow:build`: the build skill now detects `orchestrator_task: true` in task frontmatter and skips such tasks with a `deferred` completion record. Audit-replay itself is exempt (it is driven by the orchestrator, not dispatched).

### 10. Finalize the ledger

At `complete` (or when a stopping condition fires), call:

```js
const totals = ledger.finalize();
```

This writes `<outDir>/ledger.yaml` with `schema_version`, `run_id`, `started_at`, `finalized_at`, `events`, and `totals`. Capture a one-paragraph prose summary of the run (outcome, stopping reason, notable observations) in the orchestrator's final report.

**Note on run metadata** — DEC-027's extended ledger schema (metadata fields for `outcome`, `stopping_reason`, `notes` on the ledger document itself) is deferred to Sprint B Stream 2. Until that ships, include the run metadata in the orchestrator's conversational report rather than inside the ledger document.

## Stopping conditions

| Trigger | Outcome | Action |
|---------|---------|--------|
| Pipeline reaches `complete` naturally | `completed` | Finalize normally; report full run |
| A phase hard-fails with no recoverable path | `stopped` | Finalize the partial ledger; include the `stopping_reason` in the report |
| Token budget exhausted | `budget_exhausted` | Finalize the partial ledger; exhaustion is itself a measurement |

## Post-run

- `<outDir>/ledger.yaml` contains the full event stream and totals
- `<outDir>/artifacts/<phase>/**` contains mirrors of every artifact produced during the run
- No pipeline skills were modified during the run — the ledger reflects the CURRENT pipeline's behavior
