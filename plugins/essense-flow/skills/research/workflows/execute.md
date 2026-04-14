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
- Problem statement provided by user, `.pipeline/elicitation/SPEC.md`, or `.pipeline/problem.md`

## Steps

### 1. Validate State

Read `.pipeline/state.yaml`. Verify phase is `idle`. If not, report current phase and exit.

### 2. Transition to Research

Use `lib/state-machine.transition()` to move from `idle` to `research`.

### 3. Read Input and Determine Mode

Check for `.pipeline/elicitation/SPEC.md`:

**If SPEC.md exists (rich input mode):**
- Read the file, strip YAML frontmatter (delimited by `---`), use body as `problemStatement`
- Log: "Using elicited design spec from `.pipeline/elicitation/SPEC.md`"
- Select adaptive perspectives based on the spec's domain and content (see SKILL.md Mode 2)
- Set token budget to accommodate full spec: `brief_ceiling = max(12000, countTokens(spec) + 2000)`

**If no SPEC.md (direct input mode):**
- Accept problem statement from user's direct input or `.pipeline/problem.md`
- If neither is available, ask the user for the problem statement
- Use default 4 perspectives and standard token budget

### 4. Assemble Perspective Briefs

Call `research-runner.assemblePerspectiveBriefs()` with:
- The problem statement (SPEC.md body or direct input)
- Plugin root path
- Pipeline config
- Custom lenses array (for rich input mode) or omit for defaults

For rich input mode, each agent brief instructs two-pass analysis:
1. Gap-finding: what the design missed from this perspective
2. Depth: what needs more detail in this perspective's domain

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
