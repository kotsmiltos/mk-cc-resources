---
workflow: architect-decompose
skill: architect
trigger: module-too-large
phase_requires: architecture
phase_transitions: decomposing → decomposing | decomposing → sprinting
---

# Cascading Decomposition Workflow

## Prerequisites

- Decomposing phase active (initialized by the plan workflow)
- DECOMPOSITION-STATE.yaml exists in `.pipeline/architecture/`

## Steps

### 1. Load State

Load DECOMPOSITION-STATE using `architect-runner.loadDecompositionState()`.
If no state exists, this is an error — decomposition should have been initialized by the plan workflow.

### 2. Resume Context

If resuming a session:
- Load exchange-log for "architecture" phase
- Show last exchange (question asked + user answer)
- Show convergence summary (nodes by state, resolution trend)

### 3. Process Wave

Call `architect-runner.decomposeWave()` for the current wave.

### 4. Surface Design Questions

For each question from the wave:
- Format via `architect-runner.createDesignQuestion()`
- Present via AskUserQuestion
- Apply answer via `architect-runner.applyAnswer()`
- Check for spec gaps via `architect-runner.detectSpecGap()`
- Record in exchange-log and decisions index

### 5. Save State

Call `architect-runner.saveDecompositionState()` after processing.

### 6. Check Completion

Call `architect-runner.isDecompositionComplete()`:
- **Complete**: Generate output (TREE.md, task specs), transition `decomposing → sprinting`
- **Not complete**: Continue to next wave (self-loop `decomposing → decomposing`)
- **After 10 waves**: Show convergence summary, ask user to continue or stop
