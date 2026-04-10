---
workflow: architect-plan
skill: architect
trigger: /architect
phase_requires: requirements-ready
phase_transitions: requirements-ready → architecture → sprinting
---

# Architecture Planning Workflow

## Prerequisites

- Pipeline initialized with `.pipeline/state.yaml`
- Research complete: `.pipeline/requirements/REQ.md` exists
- State phase is `requirements-ready`

## Steps

### 1. Validate State
Read `.pipeline/state.yaml`. Verify phase is `requirements-ready`. If not, report current phase.

### 2. Transition to Architecture
Use `lib/state-machine.transition()` to move from `requirements-ready` to `architecture`.

### 3. Read Requirements
Read `.pipeline/requirements/REQ.md`. Extract FR list, NFR list, constraints, risks.

### 4. Assemble Perspective Briefs
Call `architect-runner.planArchitecture()` with requirements content. Produces 4 briefs (infrastructure, interface, testing, security).

### 5. Dispatch Perspective Agents
Spawn all 4 agents in parallel using the Agent tool. Each gets its assembled brief.

### 6. Parse and Verify Outputs
Parse with `lib/agent-output`. Check quorum (architecture_perspective: n-1). Run consistency verifier.

### 7. Synthesize Architecture
Call `architect-runner.synthesizeArchitecture()` to produce:
- ARCH.md with module map, contracts, traceability
- Synthesis document
- Consistency verification result

### 8. Decompose into Sprints
Call `architect-runner.decomposeIntoSprints()` using dispatch lib:
- Build dependency graph from architecture
- Validate as DAG
- Construct waves → sprints

### 9. Create Sprint 1 Task Specs
Call `architect-runner.createTaskSpecs()` for the first sprint:
- Produce .md specs with all required sections
- Generate .agent.md via transform (D4)
- Verify token budgets

### 10. Write Artifacts
Write to `.pipeline/`:
- `architecture/ARCH.md`
- `sprints/sprint-1/tasks/*.md` and `*.agent.md`
- `decisions/` if any

### 11. Transition to Sprinting
Use `lib/state-machine.transition()` to move from `architecture` to `sprinting`.

### 12. Report
Show the user:
- Architecture summary
- Sprint count and structure
- Decisions made
- Suggested next step: `/build`
