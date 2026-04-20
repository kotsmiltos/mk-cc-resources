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
- Read file, strip YAML frontmatter (delimited by `---`), use body as `problemStatement`
- Log: "Using elicited design spec from `.pipeline/elicitation/SPEC.md`"
- Select adaptive perspectives based on spec's domain and content (see SKILL.md Mode 2)
- Set token budget using `lib/tokens.adaptiveBriefCeiling(specContent, config)` — scales ceiling to fit spec, capped at `max_brief_ceiling`

**If no SPEC.md (direct input mode):**
- Accept problem statement from user's direct input or `.pipeline/problem.md`
- If neither available, ask user for problem statement
- Use default 4 perspectives and standard token budget

### 4. Assemble Perspective Briefs

Call `research-runner.assemblePerspectiveBriefs()` with:
- Problem statement (SPEC.md body or direct input)
- Plugin root path
- Pipeline config
- Custom lenses array (for rich input mode) or omit for defaults

For rich input mode, each agent brief instructs two-pass analysis:
1. Gap-finding: what design missed from this perspective
2. Depth: what needs more detail in this perspective's domain

### 5. Dispatch Perspective Agents

Spawn all perspective agents in parallel using Agent tool. Each agent gets assembled brief as prompt. All agents in same batch — run concurrently.

### 6. Collect and Parse Outputs

For each agent's raw output, call `research-runner.parseAgentOutputs()`. This:
- Detects completion sentinel
- Parses XML envelope
- Extracts payload sections
- Classifies any failures

### 7. Check Quorum

Use `lib/agent-output.checkQuorum()` to verify all agents returned valid output. Research requires ALL agents (quorum: "all").

If quorum not met:
- For recoverable failures (missing sentinel, malformed XML): retry failed agent once
- For non-recoverable failures: escalate to user with brief attached

### 8. Synthesize

Call `research-runner.synthesizeAndGenerate()` to:
- Extract entities from all agent payloads
- Build alignment matrix
- Classify positions (consensus, majority, split, unique)
- Compose synthesis document
- Generate REQ.md

### 9. Write Output

Call `research-runner.writeRequirements()` to write:
- `.pipeline/requirements/REQ.md` — structured requirements
- `.pipeline/requirements/synthesis.md` — full synthesis (for reference)

### 10. Transition to Triaging

Use `lib/state-machine.transition()` to move from `research` to `triaging`. Auto-advances — triage runs immediately.

For Increment 1, triage defaults to routing all gaps as implementation tasks → `triaging -> requirements-ready`. Full categorization is Increment 2.

### 11. Auto-Advance: Triage

After transitioning to `triaging`, immediately run triage without waiting for user input:

1. Read REQ.md just produced
2. Read SPEC.md if exists
3. Call `triage-runner.categorizeItems()` with research gaps
4. Call `triage-runner.determineRoute()` to get target phase
5. Call `triage-runner.generateReport()` and `triage-runner.writeTriage()` to persist
6. Transition from `triaging` to determined target phase
7. If target is interactive (eliciting, architecture, requirements-ready): stop and report. User runs next command.
8. If target is autonomous (research): continue chaining.

### 12. Report

Show user:
- Summary of perspectives analyzed
- Count of FRs, NFRs, risks identified
- Any disagreements or escalations
- Triage result and next recommended action
