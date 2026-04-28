---
workflow: architect-plan
skill: architect
trigger: /architect
phase_requires: requirements-ready | architecture
phase_transitions: requirements-ready → architecture → decomposing → sprinting | architecture (resume) → decomposing → sprinting
---

# Architecture Planning Workflow

## Prerequisites

- Pipeline initialized with `.pipeline/state.yaml`
- Research complete: `.pipeline/requirements/REQ.md` exists
- State phase is `requirements-ready` (canonical fresh start) **or** `architecture` (resume — phase already set by triage routing, verify routing back, or interrupted prior run)
- Optional: `.pipeline/elicitation/SPEC.md` exists

## Steps

### 1. Validate State
Read `.pipeline/state.yaml`. Accept phase `requirements-ready` (canonical fresh start) OR `architecture` (resume — happens when /triage routed via `triaging → architecture`, /verify routed back via `verifying → architecture`, or a prior /architect run was interrupted before transitioning to decomposing).

If phase is anything else, report current phase and exit.

### 2. Transition to Architecture (skip if already there)
If current phase is `requirements-ready`, use `lib/state-machine.transition()` to move from `requirements-ready` to `architecture`.

If current phase is `architecture`, skip the transition (already at target — the state machine has no `architecture → architecture` self-loop, so a redundant transition would fail and stall the pipeline).

### 3. Read Input Sources

**Always read:** `.pipeline/requirements/REQ.md` — extract FR list, NFR list, constraints, risks.

**If exists, also read:** `.pipeline/elicitation/SPEC.md` — comprehensive design spec with feature mechanics, flows, structured dependency map. When present, primary source for decomposition. Use its dependency map to inform sprint structure and task ordering.

Combine both into context provided to perspective agents.

### 4. Classify the plan: design-bearing vs mechanical

Before dispatching perspective agents, judge the plan:

- **Design-bearing** — input has open design decisions: new architecture, novel module boundaries, multiple viable approaches. Run full perspective swarm.
- **Mechanical** — input is fix sprint for cited bugs, re-plan of already-specced tasks, or spec-addendum cleanup. Structure is prescribed; nothing for perspectives to disagree about. Skip swarm; run synthesis inline.

Record choice in `.pipeline/state.yaml` under `phases_completed.architecture.perspective_swarm: invoked|skipped` with one-line `rationale_decision` (e.g., DEC-NNN) so absence is auditable.

### 5. Assemble Perspective Briefs (swarm path only)
If design-bearing, call `architect-runner.planArchitecture(requirementsContent, pluginRoot, config, specContent, complexity)`.

- `complexity` is the parsed block from SPEC.md frontmatter (returned from `loadSpec(pipelineDir)` as `spec.complexity`).
- Produces perspective briefs (default lenses: infrastructure, interface, testing, security; count adapts if registry shifts). Token budget adapts when SPEC.md present.
- Returns `{ ok, briefs, depthRecommendation }`. The `depthRecommendation` carries the scope-aware depth label (`flat | standard | high-care | full`) and is INJECTED into every brief so each perspective agent adapts its analysis to scope. Logged on stdout for visibility.
- Use `depthRecommendation.depth` to inform your decomposition decisions in step 8 — `flat` scopes skip multi-wave; `full` scopes get the full decomposition tree.

### 6. Dispatch Perspective Agents (swarm path only)
Spawn all perspective agents in parallel using Agent tool. Each gets assembled brief.

### 7. Parse and Verify Outputs (swarm path only)
Parse with `lib/agent-output`. Check quorum (architecture_perspective: n-1). Run consistency verifier.

### 8. Synthesize Architecture
**Swarm path**: call `architect-runner.synthesizeArchitecture()` over parsed perspective outputs.
**Mechanical path**: produce ARCH.md inline, citing source SPEC.md/REQ.md sections and mechanical-plan rationale decision.

Either path produces:
- ARCH.md with module map, contracts, traceability
- Synthesis document (skip for mechanical path if already implicit in ARCH.md)
- Consistency verification result

### 9. Finalize architecture → decomposing (atomic write + transition)

**MANDATORY single call:** `architect-runner.finalizeArchitecture(pipelineDir, archDoc, synthDoc, "decomposing")`. Atomically persists the prelim ARCH.md (+ synthesis.md) AND transitions `architecture → decomposing`. Do NOT split into separate `writeArchitectureArtifacts` + `transition` steps — same B2 failure family closed for the lightweight flow in `commands/architect.md`.

The prelim ARCH.md persisted here is overwritten by `finalizeDecompose` at step 11 with the final decomposition-aware ARCH.md. Persisting at this boundary lets a crashed orchestrator resume from disk instead of re-running the perspective swarm.

Initialize DECOMPOSITION-STATE using `architect-runner.initDecompositionState()`.

Create initial nodes from synthesized architecture — one node per top-level module/system from step 8.

### 10. Decomposition Loop

For each wave:

1. Call `architect-runner.decomposeWave(state, specContent, reqContent, config)` to process unresolved nodes
2. If questions to surface (`questionsToSurface` non-empty):
   - For each question, use `architect-runner.createDesignQuestion()` to format
   - Present via AskUserQuestion (one at a time)
   - For each answer:
     - Call `architect-runner.applyAnswer(state, nodeId, answer)`
     - Call `architect-runner.detectSpecGap(answer, nodeName)` — if spec gap detected, offer pause/continue
     - Record decision in `.pipeline/decisions/index.yaml`
   - Persist exchange via `lib/exchange-log.appendExchange()`
3. Save DECOMPOSITION-STATE after each wave
4. Check `architect-runner.isDecompositionComplete(state)`:
   - Complete → proceed to step 11
   - Not complete → continue next wave
5. **Convergence check**: derive the adaptive threshold from SPEC complexity:
   - `const threshold = convergenceCheckWaveFor(spec.complexity)` — replaces the static `CONVERGENCE_CHECK_WAVE`
   - Threshold scales with complexity assessment (bug-fix: 3, new-feature: 7, partial-rewrite: 10, new-project: 15; +3 for `touch_surface: broad`)
   - When SPEC has no complexity block, falls back to default `CONVERGENCE_CHECK_WAVE` (10)
   - After each wave, check `if (state.current_wave >= threshold)`:
   - Call `formatConvergenceSummary(getConvergenceSummary(state), state.current_wave)` and display
   - Present via AskUserQuestion with three options:
     - **"Continue decomposition"** — proceed (next check at current_wave + threshold-step)
     - **"Stop and create tasks from current leaves"** — end decomposition, generate task specs from resolved leaf nodes only, note skipped nodes in ARCH.md
     - **"Escalate blocked nodes"** — surface each blocked node with blocking reason, pause for user resolution
   - On **Continue**: next wave iteration
   - On **Stop**: skip to step 11, excluding unresolved/blocked nodes from task specs
   - On **Escalate**: show each blocked node, what blocks it, what info is needed. User resolves or defers.

### 11. Generate Output and Finalize

When all nodes are leaves or blocked:

1. Generate TREE.md from DECOMPOSITION-STATE using `architect-runner.generateTreeMd()`
2. Create task specs for all leaf nodes (TASK-NNN.md + TASK-NNN.agent.md)
3. Compose final ARCH.md with module map and interface contracts

**MANDATORY single call:** `architect-runner.finalizeDecompose(pipelineDir, sprintNumber, specs, treeMd, archDoc, synthDoc, "sprinting")`. Atomically writes task specs + TREE.md + final ARCH.md AND transitions `decomposing → sprinting`. Do NOT split into separate `writeTaskSpecs` + `transition` steps — phase=decomposing must not persist after task specs have been produced, otherwise autopilot loops /architect against an existing decomposition (same failure mode B2 closed for /review).

### 12. Report

Show user:
- Decomposition summary (total nodes, leaves, blocked, waves taken)
- Decisions made during decomposition
- Task spec count and sprint structure
- Blocked items (if any) with reasons
- Next: `/build` (auto-advances)
