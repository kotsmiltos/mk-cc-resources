---
name: heal
description: Interactive pipeline self-heal — infers correct phase from on-disk artifacts, presents walk-forward proposal to user, applies via legal transitions on confirmation.
version: 0.1.0
schema_version: 1
---

# heal — Pipeline Self-Heal

When `state.pipeline.phase` falls behind on-disk reality (e.g., sprint reviewed + triaged but phase still says `sprint-complete`), `/heal` infers the correct phase, presents the proposed walk-forward path with evidence, and applies it after user confirmation. Atomic per step via `state-machine.writeState` (audit-logged).

## When to use

- Autopilot halts with "phase persisted N iterations without state change — run /heal"
- Autopilot halts with "QA-REPORT.md already exists — pipeline likely stuck"
- Manual diagnosis: `state.yaml` says one phase but `.pipeline/` artifacts indicate further progress
- After a crashed orchestrator run that may have written artifacts before transitioning

For artifacts MISSING from current phase (e.g., phase=reviewing but no QA-REPORT.md), use `/repair` — its 5 backward-revert cases handle that direction.

## How it differs from `/repair`

| | `/repair` | `/heal` |
|---|---|---|
| Direction | Backward-revert when artifact missing for current phase | Forward-walk when artifacts exist beyond current phase |
| UX | CLI-style; dry-run by default; `--apply` to execute | Interactive; AskUserQuestion confirmation |
| Output | `repair/REPAIR-REPORT.md` | Inline summary + transition log |
| Audit | `repair-walk-forward` trigger in state-history (Case 6) | `heal-walk-forward` trigger in state-history |
| Decision | Fully scripted | Requires explicit user choice |

## Workflows

- `workflows/heal.md` — full /heal flow

## State Transitions

`/heal` does not have a fixed entry/exit phase — it walks through any legal transitions in `references/transitions.yaml` from `current_phase` to the inferred phase. Each step audit-logs as `trigger: "heal-walk-forward"`.

## Constraints

- Reads `lib/phase-inference.inferPhaseFromArtifacts` (pure)
- Walks via `lib/state-machine.writeState` (atomic, audited)
- Refuses to walk if `inference.ambiguous === true` or `inference.walk === null`
- Never edits sprint artifacts — only `state.yaml` + `state-history.yaml`
