> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-1/task-3-state-schema.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../PLAN.md
> **key_decisions:** D1, D11, D13
> **open_questions:** none

# Task 3: State Schema + Transition Table

## Goal
Define the pipeline state schema (state.yaml) and the explicit state machine transition table. This is the single source of truth for pipeline position (D11). Every skill reads it to know where the pipeline is; every skill writes it to record progress. The transition table prevents invalid state changes.

## Context
Per D1, essense-flow subsumes mk-flow. The state file replaces `context/STATE.md` as the pipeline position authority. Per D11, there is one state file: `.pipeline/state.yaml`. The state machine must have no unreachable states and no dead-ends other than `complete` (fitness function). The schema needs versioning (D13).

## Interface Specification

### Inputs
- None (defines the schema)

### Outputs
- `defaults/state.yaml` — default state template (copied to `.pipeline/state.yaml` during init)
- `references/transitions.yaml` — the explicit state machine transition table

### Contracts with Other Tasks
- Task 5 (lib/core) will implement state machine transition validation using transitions.yaml
- Sprint 2 context skill reads/writes state.yaml
- Sprint 2 hooks read state.yaml for injection and orientation

## Pseudocode

```
1. Define the state.yaml schema:

   schema_version: 1
   last_updated: ""                    # ISO-8601, updated on every write

   pipeline:
     phase: "idle"                     # Current phase (from transition table)
     sprint: null                      # Current sprint number (null if not sprinting)
     wave: null                        # Current build wave (null if not building)
     task_in_progress: null            # Current task ID (null if between tasks)

   phases_completed:                   # Map of phase → completion evidence
     research: null                    # {completed_at, artifact_path} or null
     architecture: null
     # sprints tracked separately below

   sprints: {}                         # Map of sprint-NN → sprint state
     # sprint-01:
     #   status: pending | building | reviewing | complete | failed
     #   tasks_total: N
     #   tasks_complete: N
     #   tasks_blocked: N
     #   qa_verdict: null | pass | fail | pass-with-issues

   blocked_on: null                    # Description of blocker, or null
   next_action: ""                     # Exact command suggestion

   decisions_count: 0                  # Number of recorded decisions
   last_decision_id: null              # Most recent DEC-NNN

   session:
     last_verified: null               # ISO-8601 timestamp of last drift-check
     continue_from: null               # Resume context if paused

2. Define the transition table (references/transitions.yaml):

   transitions:
     idle:
       valid_next: [research]
       requires: null
     research:
       valid_next: [requirements-ready]
       requires: null
     requirements-ready:
       valid_next: [architecture]
       requires: ".pipeline/requirements/REQ.md exists"
     architecture:
       valid_next: [decomposing, sprinting]
       requires: ".pipeline/requirements/REQ.md exists"
     decomposing:
       valid_next: [decomposing, sprinting]
       requires: null
     sprinting:
       valid_next: [sprint-complete]
       requires: "at least one task spec exists in current sprint dir"
     sprint-complete:
       valid_next: [reviewing]
       requires: "completion report exists for current sprint"
     reviewing:
       valid_next: [sprinting, complete, reassessment]
       requires: "QA report exists for current sprint"
     reassessment:
       valid_next: [architecture, research]
       requires: "user approval"
     complete:
       valid_next: [idle]
       requires: null

3. For each transition, document:
   - What triggers it (which skill/workflow)
   - What artifacts must exist (requires field)
   - What state fields change
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `defaults/state.yaml` | CREATE | Default state with all fields, initial phase "idle" |
| `references/transitions.yaml` | CREATE | Explicit transition table with requires/triggers |

## Acceptance Criteria

- [ ] `defaults/state.yaml` parses as valid YAML
- [ ] State contains `schema_version: 1`
- [ ] State contains `pipeline.phase: "idle"` as default
- [ ] All numeric fields default to 0 or null (not undefined)
- [ ] `references/transitions.yaml` defines every state listed in the pipeline.phase enum
- [ ] Every state (except `complete`) has at least one valid_next transition
- [ ] Every state is reachable from `idle` via some sequence of transitions
- [ ] `complete` transitions only to `idle` (new pipeline cycle)
- [ ] `reassessment` explicitly requires "user approval" — never auto-entered
- [ ] Every transition has a `requires` field (artifact existence check or null)
- [ ] The sprints map structure supports arbitrary sprint counts (not hardcoded)
- [ ] The session section includes `last_verified` for drift-check tracking

## Edge Cases

- Sprint numbers may not be sequential (e.g., sprint-01, sprint-03 if sprint-02 was removed during reassessment) — use string keys, not array indices
- Phase "decomposing" can transition to itself (recursive decomposition) — this is intentional, tracked by overflow.max_decomposition_depth in config
- User wants to go backward (e.g., from `sprinting` back to `architecture`) — only possible via `reassessment`, which requires explicit user approval
- State file is empty or corrupted — lib/core must handle this gracefully (bootstrap to idle)
