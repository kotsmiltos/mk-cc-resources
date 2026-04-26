> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-6-architect-skill.md
> **sprint:** 4
> **status:** planned
> **depends_on:** Task 1, Task 2, Task 3, Task 4, Task 5
> **estimated_size:** L
> **plan:** ../../PLAN.md
> **key_decisions:** D4, D9, D10
> **open_questions:** none

# Task 6: Architect Skill

## Goal
Build the architect skill (`skills/architect/`) — the planning and decomposition engine of the pipeline. The architect reads requirements from the research phase, spawns perspective agents to analyze from different technical angles, synthesizes findings into a plan with module boundaries and interface contracts, decomposes into sprints with detailed task specs, and runs adversarial QA after each sprint. This is the core orchestration skill.

## Context
Read these files before starting:
- `essence/MENTAL-MODEL.md` Section 2 (The Architect) — role definition, key principles
- `essence/BRIEF-PROTOCOL.md` Section 1 (phase-specific brief variations for architecture)
- `essence/BRIEF-PROTOCOL.md` Section 7 (Consistency Verification)
- `skills/research/SKILL.md` — pattern to follow for skill structure
- `skills/research/scripts/research-runner.js` — pattern for orchestration scripts
- `references/transitions.yaml` — architecture-related state transitions
- `skills/architect/templates/` — existing templates (architecture.md, task-spec.md, decision-record.md, qa-report.md, fitness-function.yaml)

The architect skill uses ALL Sprint 3+4 libs: brief-assembly, agent-output, synthesis, dispatch, consistency, transform.

## Interface Specification

### Inputs
- `.pipeline/requirements/REQ.md` — from research phase (FR-NNN, NFR-NNN)
- `.pipeline/config.yaml` — pipeline configuration
- `.pipeline/state.yaml` — current pipeline state

### Outputs
- `.pipeline/architecture/ARCH.md` — module boundaries, interfaces, dependency graph, decisions
- `.pipeline/sprints/sprint-N/tasks/TASK-NNN.md` — detailed task specs
- `.pipeline/sprints/sprint-N/tasks/TASK-NNN.agent.md` — generated from .md via transform (D4)
- `.pipeline/decisions/index.yaml` + `DEC-NNN.md` — architectural decisions
- `.pipeline/reviews/sprint-N/QA-REPORT.md` — post-sprint QA results

### Contracts with Other Tasks
- Reads research output (REQ.md) — contract defined in PLAN.md Interface Contracts
- Produces task specs consumed by build skill (Sprint 5) — contract: TASK-NNN.agent.md
- FR-NNN → TASK-NNN traceability mapping in ARCH.md (D10)
- State transitions: `requirements-ready → architecture → [decomposing →] sprinting`

## Pseudocode

```
MODULE architect-runner.js:

FUNCTION planArchitecture(reqPath, pluginRoot, config):
  1. Read REQ.md from reqPath
  2. Parse requirements: extract FR list, NFR list, constraints, risks
  3. Assemble perspective briefs for 4 architecture agents:
     - Infrastructure: module map, dependencies, layering
     - Interface: contracts, data flow, integration points
     - Testing: verification strategy, fitness functions, acceptance criteria
     - Security: threat surface, defensive patterns, quality gates
  4. (Dispatch handled by orchestrator — return briefs)

FUNCTION synthesizeArchitecture(agentOutputs, requirements, config):
  1. Parse outputs with agent-output lib
  2. Check quorum (architecture_perspective: n-1)
  3. Run consistency verifier on sibling outputs
  4. Synthesize with synthesis lib
  5. Build architecture document:
     a. Module map with boundaries and purposes
     b. Interface contracts between modules
     c. Dependency graph (for dispatch lib to validate as DAG)
     d. FR → module traceability (D10)
     e. Decisions log
     f. Fitness functions
  6. Return architecture document

FUNCTION decomposeIntoSprints(architecture, requirements, config):
  1. Build dependency graph from module dependencies
  2. Validate DAG with dispatch lib
  3. Construct waves — each wave becomes a sprint
  4. For each sprint:
     a. List tasks with file impacts
     b. Estimate size (S/M/L) based on interface count + pseudocode length
     c. Check sprint doesn't exceed context health limits
  5. Return sprint plan with task index

FUNCTION createTaskSpecs(sprint, architecture, config):
  1. For each task in the sprint:
     a. Extract relevant module from architecture
     b. Build task spec from template:
        - Goal, Context, Interface Spec, Pseudocode
        - Files Touched, Acceptance Criteria, Edge Cases
     c. Generate .agent.md via transform lib (D4)
     d. Verify .agent.md is under BRIEF_TOKEN_CEILING
  2. Return { specs, agentMds }

FUNCTION runQAReview(sprintN, taskSpecs, builtFiles, requirements, config):
  1. Assemble QA agent briefs (4 perspectives per BRIEF-PROTOCOL):
     - Task spec compliance
     - Requirements alignment
     - Fitness function verification
     - Adversarial edge cases
  2. (Dispatch handled by orchestrator — return briefs)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/architect/SKILL.md` | CREATE | Skill definition: role, responsibilities, workflows, constraints |
| `skills/architect/scripts/architect-runner.js` | CREATE | Orchestration: plan, synthesize, decompose, spec creation, QA |
| `skills/architect/workflows/plan.md` | CREATE | Planning workflow: req → perspectives → synthesis → architecture → sprints |
| `skills/architect/workflows/review.md` | CREATE | QA workflow: spawn QA agents → synthesize → report → next sprint |
| `skills/architect/workflows/decompose.md` | CREATE | Decomposition workflow: large modules → sub-modules → leaf tasks |
| `skills/architect/references/` | CHECK | Verify existing references are compatible |

## Acceptance Criteria

- [ ] SKILL.md defines the architect role with clear responsibilities and constraints
- [ ] `planArchitecture` assembles perspective briefs for 4 architecture agents
- [ ] `synthesizeArchitecture` produces ARCH.md with module map, interface contracts, and traceability
- [ ] `decomposeIntoSprints` uses dispatch lib to validate dependency graph and construct waves
- [ ] `createTaskSpecs` produces .md + .agent.md pairs for each task (D4)
- [ ] FR-NNN → TASK-NNN traceability exists in ARCH.md output (D10)
- [ ] `runQAReview` assembles briefs for 4 QA perspectives
- [ ] State transitions validated: requirements-ready → architecture → sprinting
- [ ] No cross-skill file access — reads only from `.pipeline/` and own skill directory
- [ ] Workflows document the step-by-step process for each operation

## Edge Cases

- **REQ.md has unresolved disagreements:** Architect must decide or escalate, not ignore
- **Requirements have no NFRs:** Architecture proceeds with FRs only, warns about missing quality criteria
- **Dependency graph has a cycle:** Report error, suggest which dependency to break
- **Task spec exceeds BRIEF_TOKEN_CEILING:** Flag for further decomposition (cascading decomposition model)
- **Quorum not met (1 of 4 agents fails):** Proceed with n-1 per architecture_perspective quorum rule

## Notes
This is the largest and most complex task in sprint 4. It's the "brain" of the pipeline — everything else (research, build, review) flows through the architect's plans. Follow the research skill pattern (SKILL.md + scripts/ + workflows/ + templates/) but with significantly more capability.
