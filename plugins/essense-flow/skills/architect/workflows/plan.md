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

### 4. Classify the plan: design-bearing vs mechanical

Before dispatching any perspective agents, judge the plan:

- **Design-bearing** — input has open design decisions: new architecture, novel module boundaries, multiple viable approaches. Run the full 4-perspective swarm.
- **Mechanical** — input is a fix sprint for cited bugs, re-plan of already-specced tasks, or spec-addendum cleanup. The structure is prescribed; there is nothing for 4 perspectives to disagree about. Skip the swarm; run synthesis inline.

Record the choice in `.pipeline/state.yaml` under `phases_completed.architecture.perspective_swarm: invoked|skipped` with a one-line `rationale_decision` (e.g., DEC-NNN) so the absence is auditable.

### 5. Assemble Perspective Briefs (swarm path only)
If design-bearing, call `architect-runner.planArchitecture()` with requirements content (and SPEC.md if available). Produces 4 briefs (infrastructure, interface, testing, security). Token budget adapts when SPEC.md is present.

### 6. Dispatch Perspective Agents (swarm path only)
Spawn all 4 agents in parallel using the Agent tool. Each gets its assembled brief.

### 7. Parse and Verify Outputs (swarm path only)
Parse with `lib/agent-output`. Check quorum (architecture_perspective: n-1). Run consistency verifier.

### 8. Synthesize Architecture
**Swarm path**: call `architect-runner.synthesizeArchitecture()` over the parsed perspective outputs.
**Mechanical path**: produce ARCH.md inline, citing the source SPEC.md/REQ.md sections and the mechanical-plan rationale decision.

Either path produces:
- ARCH.md with module map, contracts, traceability
- Synthesis document (skip for mechanical path if already implicit in ARCH.md)
- Consistency verification result

### 9. Begin Wave-Based Decomposition

Transition from `architecture` to `decomposing`.

Initialize DECOMPOSITION-STATE using `architect-runner.initDecompositionState()`.

Create initial nodes from the synthesized architecture — one node per top-level module/system identified in step 8.

### 10. Decomposition Loop

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
   - If complete → proceed to step 11
   - If not complete → continue next wave
5. **Convergence check**: After each wave, check `if (state.current_wave >= CONVERGENCE_CHECK_WAVE)`:
   - Call `formatConvergenceSummary(getConvergenceSummary(state), state.current_wave)` and display to user
   - Present via AskUserQuestion with three options:
     - **"Continue decomposition"** — proceed with more waves (next check at current_wave + 10)
     - **"Stop and create tasks from current leaves"** — end decomposition, generate task specs from resolved leaf nodes only, note skipped nodes in ARCH.md
     - **"Escalate blocked nodes"** — surface each blocked node with its blocking reason, pause for user resolution
   - On **Continue**: proceed to next wave iteration
   - On **Stop**: skip to step 11 (Generate Output), excluding unresolved/blocked nodes from task specs
   - On **Escalate**: for each blocked node, show what is blocking it and what information is needed. User resolves or defers.

### 11. Generate Output

When all nodes are leaves or blocked:

1. Generate TREE.md from DECOMPOSITION-STATE using `architect-runner.generateTreeMd()`
2. Create task specs for all leaf nodes (TASK-NNN.md + TASK-NNN.agent.md)
3. Write ARCH.md with module map and interface contracts
4. Save all artifacts to `.pipeline/`

### 12. Transition to Sprinting

Use `lib/state-machine.transition()` to move from `decomposing` to `sprinting` (auto-advances to build).

### 13. Report

Show the user:
- Decomposition summary (total nodes, leaves, blocked, waves taken)
- Decisions made during decomposition
- Task spec count and sprint structure
- Blocked items (if any) with reasons
- Next: `/build` (auto-advances)
