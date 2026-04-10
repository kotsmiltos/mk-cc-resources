---
workflow: research-execute
skill: research
trigger: /research
phase_requires: idle
phase_transitions: idle → research → requirements-ready
---

# Research Execution Workflow

## Prerequisites

- Pipeline initialized (`.pipeline/state.yaml` exists)
- State phase is `idle`
- Problem statement provided by user or in `.pipeline/problem.md`

## Steps

### 1. Validate State

Read `.pipeline/state.yaml`. Verify phase is `idle`. If not, report current phase and exit.

### 2. Transition to Research

Use `lib/state-machine.transition()` to move from `idle` to `research`.

### 3. Read Problem Statement

Accept the problem statement from:
- User's direct input (preferred)
- `.pipeline/problem.md` if it exists

If neither is available, ask the user for the problem statement.

### 4. Assemble Perspective Briefs

Call `research-runner.assemblePerspectiveBriefs()` with:
- The problem statement
- Plugin root path
- Pipeline config

This produces one brief per perspective lens (security, infrastructure, UX, testing).

### 5. Dispatch Perspective Agents

Spawn all perspective agents in parallel using the Agent tool. Each agent gets its assembled brief as the prompt. All agents are in the same batch — they run concurrently.

### 6. Collect and Parse Outputs

For each agent's raw output, call `research-runner.parseAgentOutputs()`. This:
- Detects the completion sentinel
- Parses the XML envelope
- Extracts payload sections
- Classifies any failures

### 7. Check Quorum

Use `lib/agent-output.checkQuorum()` to verify all agents returned valid output. Research phase requires ALL agents (quorum: "all").

If quorum is not met:
- For recoverable failures (missing sentinel, malformed XML): retry the failed agent once
- For non-recoverable failures: escalate to user with the brief attached

### 8. Synthesize

Call `research-runner.synthesizeAndGenerate()` to:
- Extract entities from all agent payloads
- Build alignment matrix
- Classify positions (consensus, majority, split, unique)
- Compose synthesis document
- Generate REQ.md

### 9. Write Output

Call `research-runner.writeRequirements()` to write:
- `.pipeline/requirements/REQ.md` — the structured requirements
- `.pipeline/requirements/synthesis.md` — the full synthesis (for reference)

### 10. Transition to Requirements-Ready

Use `lib/state-machine.transition()` to move from `research` to `requirements-ready`.

### 11. Report

Show the user:
- Summary of perspectives analyzed
- Count of FRs, NFRs, risks identified
- Any disagreements or escalations
- Suggested next step: `/architect`
