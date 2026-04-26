> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-4/task-3-dispatch.md
> **sprint:** 4
> **status:** planned
> **depends_on:** None
> **estimated_size:** L
> **plan:** ../../PLAN.md
> **key_decisions:** D9
> **open_questions:** none

# Task 3: Dispatch Library

## Goal
Build `lib/dispatch.js` — the dependency graph engine that manages wave-based parallel execution of agents. It constructs dependency graphs from task specs, groups independent tasks into waves, validates the graph is a DAG (no cycles), tracks agent states (PENDING/RUNNING/COMPLETE), and supports crash recovery by persisting dispatch state to disk.

## Context
Read `essence/BRIEF-PROTOCOL.md` Section 3 (Dispatch Patterns) for the full specification. The dispatch lib is used by the architect skill (to manage perspective agent batches and consistency verification) and the build skill (Sprint 5, to execute task waves). This is a pure-function lib (D9) — no LLM dependency.

Also read:
- `lib/state-machine.js` for coding patterns (error handling, file I/O via yaml-io)
- `lib/yaml-io.js` for safe state persistence
- `defaults/config.yaml` for timeout constants

## Interface Specification

### Inputs
- Task dependency graph: `{ taskId: { dependsOn: [taskId, ...] } }`
- Phase and batch context for state tracking

### Outputs
- Waves: ordered array of arrays, each inner array contains independent tasks
- Dispatch state: persisted YAML with agent states and timestamps
- Validation results: DAG check, cycle detection

### Contracts with Other Tasks
- Task 6 (Architect skill) uses `constructWaves` and `trackAgentState`
- Sprint 5 (Build skill) uses wave dispatch and crash recovery
- `lib/yaml-io.safeWrite` used for state persistence

## Pseudocode

```
FUNCTION buildDependencyGraph(tasks):
  1. For each task, extract dependsOn list
  2. Build adjacency list: taskId -> [dependents]
  3. Build reverse adjacency: taskId -> [dependencies]
  4. Return { adjacency, reverse, taskIds }

FUNCTION validateDAG(graph):
  1. Topological sort using Kahn's algorithm:
     a. Compute in-degree for each node
     b. Initialize queue with nodes having in-degree 0
     c. Process queue: for each node, decrement dependents' in-degree
     d. If processed count < total nodes, cycle exists
  2. If cycle found, identify the cycle nodes
  3. Return { valid: true/false, order, cycle? }

FUNCTION constructWaves(graph, dagOrder):
  1. Assign each task a "level" = max(levels of dependencies) + 1
     Tasks with no dependencies get level 0
  2. Group tasks by level — each group is a wave
  3. Return waves as array of arrays: [[wave0 tasks], [wave1 tasks], ...]

FUNCTION createDispatchState(phase, batchIndex):
  1. Return initial state: { phase, batch: batchIndex, agents: [], verifier: null }

FUNCTION updateAgentState(state, agentId, update):
  1. Find or create agent entry in state.agents
  2. Apply update (status, timestamps, output_path)
  3. Return updated state

FUNCTION persistDispatchState(state, pipelineDir):
  1. Use yamlIO.safeWrite to write to .pipeline/dispatch-state.yaml
  2. Round-trip verify (inherited from safeWrite)

FUNCTION loadDispatchState(pipelineDir):
  1. Use yamlIO.safeReadWithFallback to read .pipeline/dispatch-state.yaml
  2. Return state or null if not found

FUNCTION getWaveStatus(state, waveIndex, waves):
  1. Get tasks in the wave
  2. Count PENDING, RUNNING, COMPLETE agents
  3. Return { complete: boolean, pending, running, completed, failed }

FUNCTION canAdvanceWave(state, currentWave, waves):
  1. All agents in current wave must be COMPLETE
  2. If verifier exists and is PENDING, verifier must complete first
  3. Return boolean
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/dispatch.js` | CREATE | Dependency graph, DAG validation, wave construction, dispatch state management |
| `lib/index.js` | MODIFY | Add `dispatch` to barrel export |
| `tests/dispatch.test.js` | CREATE | Unit tests for graph building, DAG validation, wave construction, state management |

## Acceptance Criteria

- [ ] `buildDependencyGraph` correctly builds adjacency lists from task dependency specs
- [ ] `validateDAG` detects cycles and returns the cycle nodes
- [ ] `validateDAG` returns a valid topological order for acyclic graphs
- [ ] `constructWaves` groups independent tasks into the same wave
- [ ] `constructWaves` ensures dependent tasks are in later waves
- [ ] Dispatch state can be created, updated, persisted, and loaded via yaml-io
- [ ] `canAdvanceWave` returns false when any agent in the current wave is still RUNNING
- [ ] All functions are pure (D9) — no LLM dependency
- [ ] The dependency graph `A->B, B->C, A->C` produces waves `[[A], [B], [C]]` not `[[A], [B, C]]`
- [ ] The independent graph `A, B, C` (no dependencies) produces one wave `[[A, B, C]]`

## Edge Cases

- **Cycle detection:** A->B->C->A should report cycle `[A, B, C]`
- **Self-dependency:** A->A should be detected as a cycle
- **Empty graph:** Returns empty waves array
- **Single task:** Returns one wave with one task
- **Diamond dependency:** A->B, A->C, B->D, C->D produces `[[A], [B, C], [D]]`
- **Corrupt dispatch state on disk:** `loadDispatchState` falls back to `.bak` via `safeReadWithFallback`

## Notes
This is the largest task in sprint 4. The wave construction algorithm is the core value — it determines execution parallelism for the build skill (Sprint 5). Keep it pure and well-tested.
