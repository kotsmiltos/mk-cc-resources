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

Read `.pipeline/state.yaml`. Check pipeline phase, elicitation state, and `.pipeline/triage/queued-findings.yaml`.

**Branch A — Initial elicitation** (no queued findings or no prior SPEC.md):
- Phase `idle` with seed → initSession, transition to `eliciting`
- Phase `idle` without seed → resume or prompt for seed
- Phase `eliciting` → loadSession + loadExchanges, continue from last exchange

**Branch B — Spec-expansion** (queued-findings.yaml has items AND SPEC.md exists):
- Triggered when triage routed here due to blocked build, spec gap mid-sprint, or verify gap. See DEC-025 / DEC-026.
- Skip initial-seed flow. Read each queued finding's `kind` and `description`.
- For each finding, classify block type in-conversation (do NOT hardcode sub-workflows):
  - **execution-model-mismatch** — task assumed capability that doesn't exist (e.g., sub-agent trying to invoke slash command). Resolution typically mutates task spec (split, change orchestrator_task flag, etc.).
  - **missing-data** — SPEC is silent on required design decision (e.g., ledger schema field, replacement policy). Resolution appends SPEC.md and records DEC-NNN.
  - **ambiguous-spec** — SPEC has two readings; which is load-bearing unclear. Resolution picks one in conversation, appends SPEC.md addendum disambiguating, records DEC-NNN.
- Present targeted questions sized to block type (one focused topic per turn, via AskUserQuestion).
- For every resolution, pick appropriate output(s):
  - Mutate task spec(s) in `.pipeline/sprints/sprint-N/tasks/`
  - Append SPEC.md with Addendum section dated today
  - Record DEC-NNN in `.pipeline/decisions/index.yaml`
  - Route to `/architect` if tasks need to be added or waves restructured
- Exit criteria: all queued-findings items resolved. Write updated SPEC.md (if appended), update task specs (if mutated), and transition:
  - Only task specs changed → back to `sprinting`
  - SPEC.md appended or architect re-plan needed → to `requirements-ready`
  - Otherwise → back to phase that routed in

### 2. Explore

Run conversation loop. Each turn:

1. **Read context**: current explored map, deferred list, decisions, full exchange history
2. **Determine approach**: based on what's been covered, what's missing, what user just said — choose most effective approach (question, options, flow walkthrough, gap identification)
3. **Present**: deliver contribution following SKILL.md behavioral rules
4. **Receive user response**
5. **Persist**: call `elicit-runner.appendExchange(pipelineDir, { round, timestamp, system, user, areas_touched, decisions_made })` and `elicit-runner.saveState(pipelineDir, updatedState)`
6. **Check for signals**:
   - User says wrap up / produce spec / done / let's build → go to Step 3
   - User says defer → record deferral, continue
   - User revises prior decision → full ripple analysis, then continue
   - Otherwise → continue loop

### 3. Wrap Up

When user signals readiness or completeness recognized:

1. **Revisit deferred items**: present list, offer to address any now
2. **Present final summary**: comprehensive overview of design as currently understood
3. **Get confirmation**: "Does this capture everything? Anything to change or add?"
4. **If corrections**: incorporate, update state, re-present
5. **Write SPEC.md**: compose document following SKILL.md authoring instructions, call `elicit-runner.writeSpec(pipelineDir, content)`
6. **Transition state**: update `elicitation.status` to `"complete"`, transition `eliciting` -> `idle`
7. **Report**: "Design spec written to `.pipeline/elicitation/SPEC.md`. Next: `/research`"

### 4. Special Commands

**`/elicit --wrap-up`**: Jump to Step 3 immediately, produce SPEC.md from current state.

**`/elicit --abandon`**: Set `elicitation.status` to `"abandoned"`, transition to `idle`. No SPEC.md produced.

**`/elicit --restart`**: Clear `.pipeline/elicitation/` directory, start fresh session (requires seed).
