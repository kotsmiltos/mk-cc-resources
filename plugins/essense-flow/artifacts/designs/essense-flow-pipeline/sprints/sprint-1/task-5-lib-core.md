> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-1/task-5-lib-core.md
> **sprint:** 1
> **status:** planned
> **depends_on:** Task 3 (state schema for transition table)
> **estimated_size:** M
> **plan:** ../PLAN.md
> **key_decisions:** D5, D9, D11
> **open_questions:** none

# Task 5: lib/core Utilities

## Goal
Implement the pure-function library layer that every other component depends on. These are the testable building blocks (D9): state machine transitions, YAML safe IO with backup, token counting, and path sandboxing. Written in Node.js (D5) for testability — hook scripts and skills will call these functions.

## Context
Per D9, orchestration logic must be in a testable lib/ layer, not embedded in skills. Per D5, complex logic uses Node.js for unit testability. Per D11, state.yaml is the single authority. The lib/ layer has zero Claude Code dependencies — it reads/writes files and returns data. It does NOT spawn agents or interact with the LLM.

## Interface Specification

### Inputs
- `references/transitions.yaml` — the state machine definition (from Task 3)
- `defaults/config.yaml` — config with token budgets and thresholds (from Task 2)

### Outputs
- `lib/state-machine.js` — state transition logic
- `lib/yaml-io.js` — safe YAML read/write with backup
- `lib/tokens.js` — token counting and budget checking
- `lib/paths.js` — path resolution and sandboxing
- `lib/index.js` — unified export

### Contracts with Other Tasks
- Sprint 2 context skill calls state-machine.js for transitions
- Sprint 2 hooks call yaml-io.js for safe reads
- Sprint 3 brief assembly calls tokens.js for budget enforcement
- Sprint 3 brief assembly calls paths.js for sandbox validation
- All components import via `lib/index.js`

## Pseudocode

```
=== lib/state-machine.js ===

FUNCTION loadTransitions(transitionsFilePath):
    1. Read transitions.yaml using yaml-io
    2. Parse into map: state -> {valid_next, requires}
    3. Return the transition map

FUNCTION validateTransition(currentPhase, nextPhase, transitionMap):
    1. Look up currentPhase in transitionMap
    2. If currentPhase not found: return {valid: false, error: "Unknown state"}
    3. If nextPhase not in valid_next: return {valid: false, error: "Invalid transition from X to Y. Valid: [...]"}
    4. Return {valid: true, requires: transitionMap[currentPhase].requires}

FUNCTION checkRequirements(requires, pipelineDir):
    1. If requires is null: return {met: true}
    2. If requires is a file existence check (contains "exists"):
       a. Extract path from requires string
       b. Resolve path relative to pipelineDir
       c. Check file exists
       d. Return {met: exists, detail: "file path"}
    3. If requires is "user approval": return {met: false, detail: "Requires user approval"}

FUNCTION transition(stateFilePath, nextPhase, transitionMap, pipelineDir):
    1. Read state.yaml
    2. Get currentPhase from state.pipeline.phase
    3. Validate transition(currentPhase, nextPhase, transitionMap)
    4. If invalid: throw with error message
    5. Check requirements(requires, pipelineDir)
    6. If requirements not met: throw with detail
    7. Update state.pipeline.phase = nextPhase
    8. Update state.last_updated = ISO-8601 now
    9. Write state.yaml using yaml-io (with backup)
    10. Return updated state

=== lib/yaml-io.js ===

FUNCTION safeRead(filePath):
    1. If file does not exist: return null
    2. Read file contents
    3. Parse with safe YAML loader (no object instantiation)
    4. If parse fails: throw with line number and error detail
    5. Return parsed object

FUNCTION safeWrite(filePath, data):
    1. Serialize data to YAML string (sorted keys for determinism)
    2. If filePath already exists:
       a. Copy current file to filePath + ".bak" (last-known-good)
    3. Write to a temp file (filePath + ".tmp")
    4. Read back temp file and re-parse to verify (round-trip check)
    5. If verification fails: delete temp, throw error, .bak is preserved
    6. Rename temp to filePath (atomic on most filesystems)

FUNCTION safeReadWithFallback(filePath):
    1. Try safeRead(filePath)
    2. If fails and filePath + ".bak" exists:
       a. Log warning: "Primary file corrupt, using backup"
       b. Return safeRead(filePath + ".bak")
    3. If both fail: return null

=== lib/tokens.js ===

FUNCTION countTokens(text):
    1. Use conservative estimation: Math.ceil(text.length / 4)
       (Character-based approximation — replace with actual tokenizer if available)
    2. Return count

FUNCTION checkBudget(sections, config):
    1. Load budget values from config.token_budgets
    2. Apply safety_margin_pct: effective_ceiling = ceiling * (1 - margin/100)
    3. For each section in sections:
       a. Count tokens
       b. If section exceeds its per-section budget: return {ok: false, section: name, tokens: count, budget: limit}
    4. Sum all section token counts
    5. If total exceeds effective_ceiling: return {ok: false, total: sum, ceiling: effective_ceiling}
    6. Return {ok: true, total: sum, ceiling: effective_ceiling, sections: per-section counts}

=== lib/paths.js ===

FUNCTION resolve(basePath, relativePath):
    1. Join basePath and relativePath
    2. Canonicalize (resolve .., symlinks)
    3. If resolved path does not start with basePath:
       a. Throw: "Path traversal detected: {relativePath} resolves outside {basePath}"
    4. Return resolved path

FUNCTION ensureDir(dirPath):
    1. If directory exists: return
    2. Create directory recursively (mkdir -p equivalent)

FUNCTION isWithinSandbox(path, sandboxRoot):
    1. Canonicalize both paths
    2. Return whether path starts with sandboxRoot

=== lib/index.js ===

Export all modules:
  stateMachine: require('./state-machine')
  yamlIO: require('./yaml-io')
  tokens: require('./tokens')
  paths: require('./paths')
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/state-machine.js` | CREATE | State machine transition logic |
| `lib/yaml-io.js` | CREATE | Safe YAML read/write with backup and fallback |
| `lib/tokens.js` | CREATE | Token counting and budget checking |
| `lib/paths.js` | CREATE | Path resolution and sandboxing |
| `lib/index.js` | CREATE | Unified module exports |
| `references/transitions.yaml` | CHECK | Read by state-machine.js (produced by Task 3) |
| `defaults/config.yaml` | CHECK | Read by tokens.js (produced by Task 2) |

## Acceptance Criteria

- [ ] `lib/state-machine.js` — validates all legal transitions from transitions.yaml (every valid_next pair accepted)
- [ ] `lib/state-machine.js` — rejects all illegal transitions with clear error messages naming the current state, attempted state, and valid options
- [ ] `lib/state-machine.js` — checks file-existence requirements before allowing transition
- [ ] `lib/state-machine.js` — "user approval" requirements return unmet (never auto-approved)
- [ ] `lib/yaml-io.js` — safeWrite creates .bak before overwriting
- [ ] `lib/yaml-io.js` — safeWrite round-trip verifies (write then read-back then compare)
- [ ] `lib/yaml-io.js` — safeRead with malformed YAML throws with parse error line number
- [ ] `lib/yaml-io.js` — safeReadWithFallback uses .bak when primary is corrupt
- [ ] `lib/tokens.js` — countTokens returns a positive integer for non-empty text
- [ ] `lib/tokens.js` — checkBudget applies safety margin (10% by default)
- [ ] `lib/tokens.js` — checkBudget returns per-section breakdown and total
- [ ] `lib/paths.js` — resolve() rejects paths containing `..` that escape the sandbox
- [ ] `lib/paths.js` — resolve() rejects absolute paths when a sandbox root is specified
- [ ] All modules export via `lib/index.js`
- [ ] No module has any Claude Code dependency (no Agent tool, no Task tool, no skill imports)
- [ ] All functions are synchronous or return Promises (no callbacks)

## Edge Cases

- State file doesn't exist yet (first run) — state-machine.js must handle null state as "idle"
- YAML file with valid syntax but wrong schema (e.g., missing required fields) — yaml-io reads it, state-machine validates structure separately
- Token count of empty string — should return 0, not error
- Path with Windows backslashes on Windows — paths.js must normalize to forward slashes before comparison
- Concurrent writes to same YAML file — the .tmp → rename pattern provides best-effort atomicity but is not a full lock. Acceptable for Claude Code's single-session model.

## Notes
The token counter uses chars/4 as a conservative approximation. If a more accurate tokenizer becomes available (e.g., via an npm package), it can be swapped in without changing the interface. The `countTokens` function is the single point of change.
