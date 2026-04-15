---
workflow: research-execute
skill: research
trigger: /research
phase_requires: idle
phase_transitions: idle → research → triaging → [routing]
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
- Set token budget using `lib/tokens.adaptiveBriefCeiling(specContent, config)` — scales ceiling to fit the spec, capped at `max_brief_ceiling`

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

### 10. Transition to Triaging

Use `lib/state-machine.transition()` to move from `research` to `triaging`. This auto-advances — triage runs immediately to categorize the research findings.

For Increment 1 (basic pipeline), triage defaults to routing all gaps as implementation tasks → `triaging -> requirements-ready`. Full triage categorization is Increment 2.

### 11. Auto-Advance: Triage

This transition auto-advances. After transitioning to `triaging`, immediately run triage categorization without waiting for user input:

1. Read the REQ.md just produced
2. Read SPEC.md if it exists
3. Call `triage-runner.categorizeItems()` with the research gaps
4. Call `triage-runner.determineRoute()` to get the target phase
5. Call `triage-runner.generateReport()` and `triage-runner.writeTriage()` to persist results
6. Transition from `triaging` to the determined target phase
7. If target is interactive (eliciting, architecture, requirements-ready): stop and report. User runs the next command.
8. If target is autonomous (research): continue chaining.

### 12. Report

Show the user:
- Summary of perspectives analyzed
- Count of FRs, NFRs, risks identified
- Any disagreements or escalations
- Triage result and next recommended action
