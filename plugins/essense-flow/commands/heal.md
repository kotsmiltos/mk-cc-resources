---
name: heal
description: Interactive pipeline self-heal — infer correct phase from disk artifacts, walk forward via legal transitions on user confirmation.
---

# /heal

Interactive pipeline self-heal. When `state.pipeline.phase` is behind on-disk reality (artifacts indicate further progress), `/heal` infers the correct phase, presents the walk-forward proposal, and applies it after confirmation.

## What it does

1. Runs `lib/phase-inference.inferPhaseFromArtifacts(pipelineDir)` (pure scan)
2. If inferred phase matches current, reports "no heal needed" and exits
3. If ambiguous or no legal walk, reports the inference and exits without change
4. Otherwise presents the proposal via AskUserQuestion (per @present rule)
5. On confirm, walks forward via `state-machine.writeState` per leg (audited as `trigger: "heal-walk-forward"`)
6. Reports final phase + steps walked

## Instructions

1. Call `skills/heal/scripts/heal-runner.runHeal({pipelineDir, askFn: null})`. Production mode (askFn=null) returns `{status:"proposal", inference, proposal}` — orchestrator drives the AskUserQuestion loop.

2. Inspect the returned status:
   - **`no-heal-needed`** — phase already matches inferred. Report and exit.
   - **`ambiguous`** — inference cannot disambiguate. Report `inference.reason`, suggest user inspect `state-history.yaml` + `.pipeline/` manually, or run `/repair --apply` for backward-revert cases. Do NOT walk.
   - **`no-walk`** — inferred phase not reachable via transitions.yaml. Report and exit; manual `state-machine.writeState` may be needed.
   - **`proposal`** — present to user.

3. If status is `proposal`, render the summary:
   - Current phase, inferred phase
   - Walk path (e.g. `sprint-complete → reviewing → triaging → requirements-ready`)
   - Evidence list (which artifacts led to the inference)
   - Reason

   Then call AskUserQuestion with three options:
   - "Apply walk-forward" — walk via `state-machine.writeState` per leg
   - "Investigate first" — exit; user reviews state-history then re-runs /heal
   - "Leave alone" — exit; current phase is intentional

4. On "Apply walk-forward": iterate `inference.walk`, call `stateMachine.writeState(pipelineDir, targetPhase, {}, { command: "/heal", trigger: "heal-walk-forward" })` per phase. If any step returns `!ok`, halt the walk, report `partial` with the failed phase + completed steps so user can diagnose.

5. Final report:
   - Initial phase → final phase
   - Steps walked + number of state-history audit entries appended
   - Next recommended action: autopilot will auto-fire the new phase's command on next Stop hook (assuming autopilot enabled)

## Constraints

- Refuse to walk when `inference.ambiguous === true`
- Refuse to walk when `inference.walk === null` or empty
- Never edit sprint artifacts — only `state.yaml` + `state-history.yaml` (via writeState)
- Honors lockfile if present (defer to user)

## Notes

- `/repair` handles the BACKWARD direction (artifact missing for current phase → revert). `/heal` handles the FORWARD direction (artifacts beyond current phase → walk forward). Different shapes; both reuse `lib/state-machine.writeState` for atomic transitions.
- `/heal --apply` (CLI script) skips the question and walks immediately. Reserved for scripted/CI use; the orchestrator-driven path is the default.
