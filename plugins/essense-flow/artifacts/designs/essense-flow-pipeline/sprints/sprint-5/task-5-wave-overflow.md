> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** Task 4
> **estimated_size:** M

# Task 5: Wave Dispatch + Overflow Detection

## Goal
Extend the build skill with wave-level dispatch tracking (persist state between waves for crash recovery) and overflow detection (flag files that exceed the size backstop, indicating the task needs further decomposition).

## Pseudocode

```
FUNCTION executeWave(state, waveIndex, waves, pipelineDir, config):
  1. Get tasks for this wave
  2. For each task: update state to RUNNING, persist
  3. (Dispatch happens at orchestrator level — return briefs)
  4. After agents return: parse outputs, update state to COMPLETE/FAILED
  5. Persist state after each agent completes (crash recovery)
  6. Check canAdvanceWave before proceeding

FUNCTION checkOverflow(completionRecord, config):
  1. For each file in files-written:
     a. Count lines
     b. If lines > config.overflow.file_lines_backstop:
        flag as overflow — task needs decomposition
  2. Return { overflows: [{ file, lines, backstop }] }

FUNCTION handleWaveFailure(state, waveIndex, waves):
  1. Check getWaveStatus for terminal state
  2. If terminal: return escalation with failed task details
  3. If still running: wait
  4. If complete: advance
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/build/scripts/build-runner.js` | MODIFY | Add `executeWave`, `checkOverflow`, `handleWaveFailure` |
| `tests/build.test.js` | CREATE | Tests for wave execution, overflow detection, failure handling |

## Acceptance Criteria

- [ ] Dispatch state persisted after each agent state change (crash recovery)
- [ ] Overflow detection flags files exceeding `file_lines_backstop`
- [ ] Terminal wave failure detected via `getWaveStatus().terminal`
- [ ] Wave advancement blocked until all agents COMPLETE and verifier done
