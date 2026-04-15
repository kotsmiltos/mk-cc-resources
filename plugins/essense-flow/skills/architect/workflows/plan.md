---
workflow: architect-plan
skill: architect
trigger: /architect
phase_requires: requirements-ready
phase_transitions: requirements-ready → architecture → decomposing → sprinting
---

# Architecture Planning Workflow

## Prerequisites

- Pipeline initialized with `.pipeline/state.yaml`
- Research complete: `.pipeline/requirements/REQ.md` exists
- State phase is `requirements-ready`
- Optional: `.pipeline/elicitation/SPEC.md` exists (from elicitation phase)

## Steps

### 1. Validate State
Read `.pipeline/state.yaml`. Verify phase is `requirements-ready`. If not, report current phase.

### 2. Transition to Architecture
Use `lib/state-machine.transition()` to move from `requirements-ready` to `architecture`.

### 3. Read Input Sources

**Always read:** `.pipeline/requirements/REQ.md` — extract FR list, NFR list, constraints, risks.

**If exists, also read:** `.pipeline/elicitation/SPEC.md` — the comprehensive design spec with feature mechanics, flows, and structured dependency map. When present, this is the primary source for decomposition. Use its dependency map to inform sprint structure and task ordering.

Combine both into the context provided to perspective agents.

### 4. Assemble Perspective Briefs
Call `architect-runner.planArchitecture()` with requirements content (and SPEC.md content if available). Produces 4 briefs (infrastructure, interface, testing, security). When SPEC.md is present, token budget adapts to accommodate the larger context.

### 5. Dispatch Perspective Agents
Spawn all 4 agents in parallel using the Agent tool. Each gets its assembled brief.

### 6. Parse and Verify Outputs
Parse with `lib/agent-output`. Check quorum (architecture_perspective: n-1). Run consistency verifier.

### 7. Synthesize Architecture
Call `architect-runner.synthesizeArchitecture()` to produce:
- ARCH.md with module map, contracts, traceability
- Synthesis document
- Consistency verification result

### 8. Begin Wave-Based Decomposition

Transition from `architecture` to `decomposing`.

Initialize DECOMPOSITION-STATE using `architect-runner.initDecompositionState()`.

Create initial nodes from the synthesized architecture — one node per top-level module/system identified in step 7.

### 9. Decomposition Loop

For each wave:

1. Call `architect-runner.decomposeWave(state, specContent, reqContent, config)` to process unresolved nodes
2. If there are questions to surface (`questionsToSurface` is non-empty):
   - For each question, use `architect-runner.createDesignQuestion()` to format it
   - Present to user via AskUserQuestion (one at a time)
   - For each answer:
     - Call `architect-runner.applyAnswer(state, nodeId, answer)`
     - Call `architect-runner.detectSpecGap(answer, nodeName)` — if spec gap detected, offer pause/continue
     - Record decision in `.pipeline/decisions/index.yaml`
   - Persist exchange via `lib/exchange-log.appendExchange()`
3. Save DECOMPOSITION-STATE after each wave
4. Check `architect-runner.isDecompositionComplete(state)`:
   - If complete → proceed to step 10
   - If not complete → continue next wave
5. **Convergence check**: After each wave, check `if (state.current_wave >= CONVERGENCE_CHECK_WAVE)`:
   - Call `formatConvergenceSummary(getConvergenceSummary(state), state.current_wave)` and display to user
   - Present via AskUserQuestion with three options:
     - **"Continue decomposition"** — proceed with more waves (next check at current_wave + 10)
     - **"Stop and create tasks from current leaves"** — end decomposition, generate task specs from resolved leaf nodes only, note skipped nodes in ARCH.md
     - **"Escalate blocked nodes"** — surface each blocked node with its blocking reason, pause for user resolution
   - On **Continue**: proceed to next wave iteration
   - On **Stop**: skip to step 10 (Generate Output), excluding unresolved/blocked nodes from task specs
   - On **Escalate**: for each blocked node, show what is blocking it and what information is needed. User resolves or defers.

### 10. Generate Output

When all nodes are leaves or blocked:

1. Generate TREE.md from DECOMPOSITION-STATE using `architect-runner.generateTreeMd()`
2. Create task specs for all leaf nodes (TASK-NNN.md + TASK-NNN.agent.md)
3. Write ARCH.md with module map and interface contracts
4. Save all artifacts to `.pipeline/`

### 11. Transition to Sprinting

Use `lib/state-machine.transition()` to move from `decomposing` to `sprinting` (auto-advances to build).

### 12. Report

Show the user:
- Decomposition summary (total nodes, leaves, blocked, waves taken)
- Decisions made during decomposition
- Task spec count and sprint structure
- Blocked items (if any) with reasons
- Next: `/build` (auto-advances)
