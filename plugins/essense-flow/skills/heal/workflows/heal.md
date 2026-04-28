---
workflow: heal
skill: heal
status: dynamic
trigger: /heal
phase_requires: any
phase_transitions: any → any (legal forward walk via transitions.yaml)
---

# Heal Workflow

## Steps

### 1. Run inference

Call `heal-runner.runHeal({pipelineDir, askFn})` (or invoke skill via `node skills/heal/scripts/heal-runner.js`). The runner:

1. Calls `lib/phase-inference.inferPhaseFromArtifacts(pipelineDir)`
2. Compares `current_phase` to `inferred_phase`
3. If equal: report "no heal needed" and exit
4. If `ambiguous=true` or `walk=null`: report inference + reason, suggest `/repair --apply` (which has narrower deterministic cases) or manual `state-machine.writeState`, exit without walking
5. Otherwise: present the proposal (current/inferred/walk/evidence) and call AskUserQuestion

### 2. Surface the proposal via AskUserQuestion

Present three options (per @present rule — never inline A/B/C text):

- **"Apply walk-forward"** — execute the walk via `state-machine.writeState` per leg
- **"Investigate first"** — exit without walking; user inspects `state-history.yaml` + `.pipeline/` then re-runs /heal
- **"Leave alone"** — exit without changes (e.g., user knows the apparent stuck-state is intentional mid-debug)

### 3. Apply the walk (option A only)

For each phase in `inference.walk`:

```js
const r = stateMachine.writeState(pipelineDir, targetPhase, {}, {
  command: "/heal",
  trigger: "heal-walk-forward",
});
```

If any step returns `!ok`, halt the walk, record `partial: true`, the failed `target_phase`, and the steps completed so far. Phase ends at last successful step. User can re-run /heal to continue (next inference will start from the new phase).

### 4. Report

Inline summary of:
- Initial phase, final phase
- Steps walked
- Audit entries appended to state-history.yaml
- Next recommended action (autopilot will pick up the new phase on next Stop hook)

## Constraints

- Never walk when `ambiguous=true`
- Never walk when `walk=null`
- Each walk step uses `state-machine.writeState` (atomic + audited)
- Honors lockfile if present — defer to `/repair` if pipeline is locked by another process
