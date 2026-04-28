---
workflow: architect-decompose
skill: architect
trigger: module-too-large
phase_requires: decomposing
phase_transitions: decomposing → decomposing | decomposing → sprinting
---

# Cascading Decomposition Workflow

## Prerequisites

- Decomposing phase active (initialized by plan workflow)
- DECOMPOSITION-STATE.yaml exists in `.pipeline/architecture/`

## Steps

### 1. Load State

Load DECOMPOSITION-STATE using `architect-runner.loadDecompositionState()`.
If no state exists, error — decomposition must be initialized by plan workflow.

### 2. Resume Context

If resuming:
- Load exchange-log for "architecture" phase
- Show last exchange (question asked + user answer)
- Show convergence summary (nodes by state, resolution trend)

### 3. Process Wave

Call `architect-runner.decomposeWave()` for current wave.

### 4. Surface Design Questions

For each question from wave:
- Format via `architect-runner.createDesignQuestion()`
- Present via AskUserQuestion
- Apply answer via `architect-runner.applyAnswer()`
- Check for spec gaps via `architect-runner.detectSpecGap()`
- Record in exchange-log and decisions index

### 5. Save State

Call `architect-runner.saveDecompositionState()` after processing.

### 6. Check Completion

Call `architect-runner.isDecompositionComplete()`:
- **Complete**: Generate TREE.md via `architect-runner.generateTreeMd()` and create task specs from leaf nodes. Then **MANDATORY single call:** `architect-runner.finalizeDecompose(pipelineDir, sprintNumber, specs, treeMd, archDoc, synthDoc, "sprinting")`. Atomically writes task specs + TREE.md (+ optional final ARCH.md) AND transitions `decomposing → sprinting`. Do NOT split into separate `writeTaskSpecs` + `transition` steps — phase=decomposing must not persist after task specs have been produced, otherwise autopilot loops /architect against an existing decomposition (same failure mode B2 closed for /review).
- **Not complete**: Continue to next wave (self-loop `decomposing → decomposing`, handled by `saveDecompositionState` — NOT by `finalizeDecompose`)
- **After 10 waves**: Show convergence summary, ask user to continue or stop
