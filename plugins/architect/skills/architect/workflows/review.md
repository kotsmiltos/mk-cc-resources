<required_reading>
Read these reference files NOW before proceeding:
1. references/sprint-management.md (reassessment section)
2. references/team-culture.md (QA principles)
3. templates/plan.md (for updating PLAN.md)
4. templates/task-spec.md (for creating next sprint's specs)
</required_reading>

<process>

<step_1_gather_sprint_output>
Identify the completed sprint and read all relevant artifacts:

1. **STATE.md** — Read `context/STATE.md` Pipeline Position `current_sprint` field to identify which sprint just completed.

If STATE.md doesn't exist: Tell the user — 'No STATE.md found. Run `/mk-flow-init` to set up state tracking.' Fall back to reading PLAN.md Sprint Tracking to identify the most recent sprint with task specs but no QA-REPORT.md.

2. **PLAN.md** — Read from `[cwd]/artifacts/designs/[slug]/PLAN.md` for the sprint's task specs and architecture context.

3. **Task specs** — Read all task specs for the completed sprint from `[cwd]/artifacts/designs/[slug]/sprints/sprint-N/`.

4. **Built artifacts** — Read the actual files that were created or modified during the sprint. Compare to what the task specs specified.

5. **Original requirements** — Re-read the source requirements/exploration to keep the overall goal in mind (path is in PLAN.md's Source field).

6. **Previous QA reports** — If this isn't sprint 1, check previous sprints' QA reports for recurring patterns or unresolved notes.

Assemble a clear picture of: what was PLANNED (task specs), what was BUILT (actual files), and what was PROMISED (original requirements).
</step_1_gather_sprint_output>

<step_2_spawn_qa_agents>
Launch these 4 QA agents in parallel using the Agent tool. Each verifies from a different angle.

Read references/team-culture.md for the team values block. QA agents carry the "test to BREAK it" principle.

**QA Agent 1 — Task Spec Compliance:**
```
You are a QA engineer verifying that completed work matches its specification.

SPRINT: [N]
TASK SPECS: [Paths to all task specs for this sprint]
BUILT FILES: [Paths to files created/modified during this sprint]

For EACH task spec in this sprint:
1. Read the task spec's Acceptance Criteria section
2. Read the actual files that were built
3. Check every acceptance criterion — does the built code satisfy it?
4. Check the Pseudocode section — was the specified logic implemented?
5. Check Files Touched — were all specified files actually created/modified?
6. Check Edge Cases — are they handled?

For each check, report:
- PASS: Criterion met
- FAIL: Criterion not met (describe what's wrong specifically)
- PARTIAL: Partially met (describe what's missing)
- SKIPPED: Criterion could not be verified (explain why)

Team values — follow these unconditionally:
- Test to BREAK it, not just confirm happy paths
- Be specific. "Doesn't work" is not a finding. "Function X in file Y returns Z when it should return W" IS
- Check EVERY criterion, not just the obvious ones
- If something was silently simplified or dropped from the spec, flag it

Return your findings in this structure:
## Task Spec Compliance

### Task [K]: [Name]
| Criterion | Result | Details |
|-----------|--------|---------|
| [From acceptance criteria] | PASS/FAIL/PARTIAL | [Specific details] |

### Summary
- Tasks checked: [N]
- Total criteria: [N]
- Passed: [N]
- Failed: [N]
- Partial: [N]
- Skipped: [N]
```

**QA Agent 2 — Requirements Alignment:**
```
You are a QA engineer verifying that sprint output serves the original requirements.

SPRINT: [N]
REQUIREMENTS: [Path to miltiaze requirements/exploration]
PLAN VISION: [The Vision section from PLAN.md]
BUILT FILES: [Paths to files created/modified during this sprint]

Check whether the sprint's output moves the project toward the stated goals:
1. Read the original requirements/exploration
2. Read the PLAN.md Vision section
3. Read what was actually built
4. For each requirement the sprint was supposed to address:
   - Does the built code serve this requirement?
   - Is the requirement fully addressed, partially addressed, or not addressed?
   - Was anything built that WASN'T in the requirements? (scope creep check)
   - Was anything in scope silently dropped? (scope reduction check)

Team values — follow these unconditionally:
- Scope reduction is a CRITICAL finding — never let it pass silently
- Check the spirit of the requirement, not just the letter
- If the requirement was ambiguous and the implementation chose one interpretation, note which interpretation was chosen

Return your findings in this structure:
## Requirements Alignment

### Requirements Addressed This Sprint
| Requirement | Status | Details |
|------------|--------|---------|
| [From requirements doc] | Fully/Partially/Not addressed | [Specifics] |

### Scope Check
- Scope additions (not in requirements): [List or "None"]
- Scope reductions (silently dropped): [List or "None"]

### Overall Alignment
[Does this sprint move the project toward the vision? Any drift?]
```

**QA Agent 3 — Fitness Function Verification:**
```
You are a QA engineer verifying architectural properties are preserved.

SPRINT: [N]
PLAN.MD: [Path to PLAN.md]
FITNESS FUNCTIONS: [List from PLAN.md Fitness Functions section]
BUILT FILES: [Paths to files created/modified during this sprint]
FULL CODEBASE CONTEXT: [Key structural information]

For each fitness function in PLAN.md:
1. Read the assertion
2. Check the built code against it
3. Report PASS or FAIL with evidence

Also check for NEW architectural violations not covered by existing fitness functions:
- Circular dependencies introduced
- Module boundary violations
- Convention deviations
- Hidden coupling
- Magic numbers or hardcoded values

If you discover a new architectural property that should be preserved, propose it as a new fitness function.

Team values — follow these unconditionally:
- Architecture violations are high-severity findings
- Check the WHOLE module, not just the changed files
- If a fitness function is poorly written (can't be verified), flag it for rewriting

Return your findings in this structure:
## Fitness Function Verification

### Existing Functions
| Function | Result | Evidence |
|----------|--------|----------|
| [Assertion] | PASS/FAIL | [Specific evidence] |

### New Violations Discovered
| Violation | Severity | Files | Recommended Fitness Function |
|-----------|----------|-------|------------------------------|
| [What's wrong] | High/Med/Low | [Paths] | [Proposed assertion] |

### Proposed New Fitness Functions
- [ ] [New assertion to add to PLAN.md]
```

**QA Agent 4 — Adversarial Edge Case Testing:**
```
You are an adversarial QA engineer. Your job is to BREAK things.

SPRINT: [N]
TASK SPECS: [Paths to all task specs — read the Edge Cases sections]
BUILT FILES: [Paths to files created/modified during this sprint]

Think like an attacker, a careless user, and a system under stress:

1. INPUT ABUSE: What happens with empty input? Malformed input? Extremely long input? Unicode? Special characters? Path traversal attempts?

2. MISSING DEPENDENCIES: What if a file doesn't exist? A config is missing? A referenced module isn't available?

3. RACE CONDITIONS: What if two processes run this simultaneously? What if the system is interrupted mid-operation?

4. STATE CORRUPTION: What if the persistent state (files on disk) is manually edited, partially written, or deleted?

5. INTEGRATION FAILURES: What if the module this depends on changes its output format? Returns unexpected data?

6. RESOURCE EXHAUSTION: What if there are thousands of items instead of tens? What if disk is full? What if the context window is near its limit?

For each test scenario:
- Describe the scenario specifically
- State what SHOULD happen (the correct behavior)
- State what you THINK will happen based on reading the code
- Rate severity if it fails: Critical/High/Medium/Low

Team values — follow these unconditionally:
- Your job is to FIND problems, not confirm things work
- The harder you try to break it, the better the eventual product
- Be creative — think of scenarios the developer wouldn't
- Every finding must be specific and reproducible

Return your findings in this structure:
## Adversarial Edge Case Testing

### Test Scenarios
| # | Scenario | Expected Behavior | Likely Actual Behavior | Severity | Verdict |
|---|----------|-------------------|----------------------|----------|---------|
| 1 | [Specific scenario] | [What should happen] | [What probably happens] | Crit/High/Med/Low | PASS/RISK/FAIL |

### Critical Risks
[Any scenario where the system would break badly or lose data]

### Recommendations
[Specific fixes or defensive patterns to add]
```

**IMPORTANT:** All 4 QA agents run in parallel. Wait for all to return before proceeding.
</step_2_spawn_qa_agents>

<step_3_synthesize_qa_results>
Read all 4 QA agents' findings. Produce a unified assessment:

**3a. Categorize findings by severity:**
- **Critical** — Must fix before proceeding. Blocks the next sprint.
- **High** — Should fix soon. Schedule as a task in the next sprint.
- **Medium** — Note for improvement. Add to Refactor Requests.
- **Low** — Nice to have. Add to Refinement Queue.

**3b. Check for autonomous corrective action:**
For findings that meet ALL of these criteria, fix them immediately without asking the user:
- The fix is obvious and unambiguous
- The fix is small (< 20 lines of code)
- The fix doesn't change any interface contract or behavior
- The fix doesn't require a design decision

Document every autonomous fix in the QA report: what was found, what was fixed, where.

**3c. Check for escalations:**
For Critical findings or findings that affect scope, escalate to the user via the ask workflow. Frame it clearly:
- "QA found [issue]. This affects [what]. Options: [A] or [B]. My recommendation: [X] because [Y]."

**3d. Write QA-REPORT.md:**
Save to `[cwd]/artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md`:

```markdown
> **type:** qa-report
> **output_path:** artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md
> **date:** YYYY-MM-DD
> **plan:** [Path to PLAN.md]
> **overall_result:** PASS | PASS (N notes) | FAIL (N issues)
> **key_decisions:** [decisions made during review, or "none"]
> **open_questions:** [items needing user input, or "none"]

# QA Report: Sprint [N]

## Summary
- Task spec compliance: [N/N] criteria passed
- Requirements alignment: [Status]
- Fitness functions: [N/N] passed
- Adversarial tests: [N] risks identified

## Critical Issues
[Issues that block the next sprint]

## High Priority
[Issues to fix in next sprint]

## Medium Priority
[Refactor requests]

## Low Priority
[Refinement items]

## Autonomous Fixes Applied
[What was fixed automatically during this review]

## Recommendations for Next Sprint
[What to include, what to change]
```
</step_3_synthesize_qa_results>

<step_4_reassess_and_plan_next>
Following the reassessment framework in references/sprint-management.md:

**4a. Update PLAN.md:**
- Sprint Tracking: Update PLAN.md Sprint Tracking for the completed sprint — fill in Completed count (e.g., 3/3), QA Result (e.g., PASS), and Key Changes summary. Do NOT write a Status column — sprint status lives in STATE.md only.
- Change Log: Record what changed and why
- Risk Register: Update based on QA findings
- Refactor Requests: Add any from QA
- Fitness Functions: Add any new ones proposed by QA agents

**4b. Check scope integrity:**
Compare what was built to what PLAN.md specified for this sprint. If anything was silently dropped or simplified, flag it. Scope reduction requires explicit user acknowledgment.

**4c. Surface QA improvements to the user:**
If QA found non-blocking improvements (Medium/Low priority — things that PASSED but could be better), present them explicitly to the user before planning the next sprint. Do NOT silently defer or silently include them.

Use AskUserQuestion with the list of improvements:
```
QA noted [N] non-blocking improvements:
1. [Finding ID]: [Brief description] — Effort: [S/M]
2. [Finding ID]: [Brief description] — Effort: [S/M]
3. [Finding ID]: [Brief description] — Effort: [S/M]

Add these to the next sprint?
```

Options:
- **Yes, add all** — Include every noted improvement as tasks in sprint N+1
- **Pick which ones** — I'll choose which to include
- **No, defer** — Skip them for now (they go to the Refinement Queue)

**If the user says yes (all or selected):**
For each accepted improvement, create a FULL task spec using templates/task-spec.md — not a one-liner, not a note. Each gets:
- Goal (what the improvement achieves)
- Context (which QA finding it addresses, the QA agent's specific recommendation)
- Pseudocode (the exact fix — specific enough to implement mechanically)
- Files Touched (which files change)
- Acceptance Criteria (how to verify the improvement is done)

Add these tasks to the next sprint's task index in PLAN.md. Update the sprint's task count. Save the task specs to the sprint directory alongside the other tasks.

**If the user says defer:**
Deferred items must NOT disappear into context. They stay in the pipeline:

1. Add each improvement to PLAN.md's **Refactor Requests** table (not Refinement Queue — Refactor Requests are tracked and scheduled):
   | From Sprint | What | Why | Scheduled In | Status |
   | N | [Description] | QA finding [ID] | TBD | deferred |

2. When planning ANY future sprint, the architect MUST check the Refactor Requests table and either:
   - Schedule deferred items into this sprint (update "Scheduled In" column)
   - Explicitly carry them forward (leave as "deferred" with a note in Change Log)
   - Never silently drop them — every deferred item must eventually be scheduled or explicitly cancelled by the user

3. If this is the FINAL sprint review and deferred items remain:
   - Surface them to the user: "There are [N] deferred improvements that were never scheduled. Address them now or close them?"
   - Do NOT mark the pipeline as complete with unaddressed deferred items unless the user explicitly says to close them

**4d. Plan next sprint:**
If more sprints remain:
- Review the next sprint's planned tasks in light of what was learned
- Include any QA improvements the user accepted (with full task specs, as above)
- Check PLAN.md Refactor Requests for deferred items — ask if any should be picked up this sprint
- Amend existing tasks if the completed sprint revealed new information
- Create detailed task specs for the next sprint using templates/task-spec.md
- Save task specs to `[cwd]/artifacts/designs/[slug]/sprints/sprint-(N+1)/`

If this was the final sprint:
- Verify all original requirements are addressed
- Check all fitness functions pass
- Surface any remaining deferred Refactor Requests to the user
- Produce a final completion summary
</step_4_reassess_and_plan_next>

<step_5_update_state>
If `context/STATE.md` exists, update the Pipeline Position section with exact values:

**If more sprints remain:**
```markdown
## Pipeline Position
- **Stage:** sprint-(N+1)
- **Requirements:** [keep existing value]
- **Audit:** [keep existing value]
- **Plan:** [keep existing value — path to PLAN.md]
- **Current sprint:** N+1
- **Build plan:** —
- **Task specs:** artifacts/designs/[slug]/sprints/sprint-(N+1)/
- **Completion evidence:** artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md
- **Last verified:** [today's date]
```
Update **Current Focus** to: "Sprint [N] reviewed. [QA result summary]. Sprint [N+1] scoped."
State description, not action. Pipeline Position handles routing.

**If this was the final sprint:**
```markdown
## Pipeline Position
- **Stage:** complete
- **Requirements:** [keep existing value]
- **Audit:** [keep existing value]
- **Plan:** [keep existing value]
- **Current sprint:** done
- **Build plan:** —
- **Task specs:** —
- **Completion evidence:** artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md
- **Last verified:** [today's date]
```
Update **Current Focus** to: "[Feature] pipeline complete. All sprints executed and reviewed."
State description, not action. Pipeline Position handles routing.
</step_5_update_state>

<step_6_present_summary>
Present a concise summary with the exact next command:

**If more sprints remain:**
```
Sprint [N] review complete.

QA Result: [PASS/FAIL] — [brief summary]

[If issues found:]
- Critical: [N] — [must fix before continuing]
- High: [N] — [scheduled for next sprint]
- Fixes applied: [N] — [auto-corrected during review]

Plan updated:
- [What changed in PLAN.md]
- [Any new risks or decisions]

Sprint [N+1]: [N] tasks ready at [sprint dir path].

To continue the pipeline, run:
   /ladder-build

You can /clear first to free up context — all state is on disk.
```

**If this was the final sprint:**
```
All sprints complete. QA passed.

Final deliverables:
- Plan: [PLAN.md path]
- [Key files created]

Pipeline complete. No further steps needed.
```

Use AskUserQuestion:
- **Continue to next sprint** — Start building sprint [N+1]
- **Review QA report** — I want to read the full QA findings
- **Discuss changes** — I want to adjust the plan before continuing
</step_6_present_summary>

</process>

<success_criteria>
- All sprint output was read (task specs, built files, requirements)
- 4 QA agents were spawned in parallel with adversarial mindset
- Every acceptance criterion was checked
- Scope integrity was verified (nothing silently dropped)
- Fitness functions were verified
- QA-REPORT.md was saved to disk
- PLAN.md was updated (sprint tracking, change log, risks, refactors)
- Autonomous fixes were documented
- Critical issues were escalated to user
- Next sprint task specs were created (if more sprints remain)
- User received a concise summary
</success_criteria>
