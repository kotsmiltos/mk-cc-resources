---
workflow: elicit-session
skill: elicit
trigger: /elicit
phase_requires: idle | eliciting
phase_transitions: idle -> eliciting -> idle
---

# Elicitation Session Workflow

## Prerequisites

- Pipeline initialized (`.pipeline/state.yaml` exists)
- State phase is `idle` (new session) or `eliciting` (resume)

## Steps

### 1. Determine Session Mode

Read `.pipeline/state.yaml`. Check pipeline phase and elicitation state.

**If phase is `idle` and no seed argument:**
- Check for existing elicitation state (`.pipeline/elicitation/state.yaml`)
- If exists with `status: "complete"`: load session and resume (re-entry per DEC-008)
- If exists with `status: "active"` or `"paused"`: load session and resume
- If no existing state: report to user: "No active session found. Start one with `/elicit \"your project idea\"`" — then stop

**If phase is `idle` with seed argument:**
- Check for existing elicitation state
- If exists: resume existing session (ignore seed, warn user)
- If no existing state: call `elicit-runner.initSession(pipelineDir, seed, config)`
- Transition state: `idle` -> `eliciting`

**If phase is `eliciting`:**
- Call `elicit-runner.loadSession(pipelineDir)` and `elicit-runner.loadExchanges(pipelineDir)`
- Present summary of where the conversation stands
- Continue from last exchange

### 2. Explore

Run the conversation loop. Each turn:

1. **Read context**: current explored map, deferred list, decisions, full exchange history
2. **Determine approach**: based on what's been covered, what's missing, and what the user just said — choose the most effective approach (question, options, flow walkthrough, gap identification)
3. **Present**: deliver your contribution following SKILL.md behavioral rules
4. **Receive user response**
5. **Persist**: call `elicit-runner.appendExchange(pipelineDir, { round, timestamp, system, user, areas_touched, decisions_made })` and `elicit-runner.saveState(pipelineDir, updatedState)`
6. **Check for signals**:
   - User says wrap up / produce spec / done / let's build -> go to Step 3
   - User says defer -> record deferral, continue
   - User revises prior decision -> full ripple analysis, then continue
   - Otherwise -> continue loop

### 3. Wrap Up

When the user signals readiness or you recognize completeness:

1. **Revisit deferred items**: present list of deferred items, offer to address any now
2. **Present final summary**: comprehensive overview of the design as currently understood
3. **Get confirmation**: "Does this capture everything? Anything to change or add?"
4. **If corrections**: incorporate, update state, re-present
5. **Write SPEC.md**: compose the document following SKILL.md authoring instructions, call `elicit-runner.writeSpec(pipelineDir, content)`
6. **Transition state**: update `elicitation.status` to `"complete"`, transition `eliciting` -> `idle`
7. **Report**: "Design spec written to `.pipeline/elicitation/SPEC.md`. Next: `/research`"

### 4. Special Commands

**`/elicit --wrap-up`**: Jump to Step 3 immediately, producing SPEC.md from current state.

**`/elicit --abandon`**: Set `elicitation.status` to `"abandoned"`, transition to `idle`. No SPEC.md produced.

**`/elicit --restart`**: Clear `.pipeline/elicitation/` directory, start fresh session (requires seed).
