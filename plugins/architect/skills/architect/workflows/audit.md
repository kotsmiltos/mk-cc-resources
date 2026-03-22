<required_reading>
Read these reference files NOW before proceeding:
1. references/architecture-patterns.md
2. references/team-culture.md
3. templates/audit-report.md
</required_reading>

<process>

<step_1_determine_scope>
What is being audited? Determine the scope:

1. **Full codebase audit** — The user wants a comprehensive assessment of the entire project. Read CLAUDE.md, the file structure, key source files, and any existing plans or state.

2. **Module-level audit** — The user wants a specific module or area assessed. Focus on that area and its immediate dependencies.

3. **Goal-alignment audit** — The user wants to know "where do we stand" relative to existing plans. Read STATE.md, BUILD-PLAN.md, and PLAN.md to understand goals, then assess actual state.

Determine which by analyzing the user's request:
- "Audit the codebase" / "assess the project" → full codebase
- "Audit the auth module" / "review plugins/architect/" → module-level
- "Where are we?" / "What's the status vs the plan?" → goal-alignment

Read all relevant files for the determined scope:
- CLAUDE.md (architecture documentation)
- context/STATE.md (project state)
- context/cross-references.yaml (coupling rules)
- Relevant source files (for the scope)
- Existing BUILD-PLAN.md or PLAN.md (if they exist — for goal alignment)
</step_1_determine_scope>

<step_2_spawn_assessment_agents>
Launch 6 assessment agents in parallel using the Agent tool. Each examines the codebase from a different professional lens.

Read references/team-culture.md for the team values block.

**Assessment Agent 1 — Implementation Quality:**
```
You are a senior code reviewer assessing implementation quality.

SCOPE: [What's being audited — full codebase or specific module]
FILES TO READ: [List of file paths to examine]
CONVENTIONS: [Key conventions from CLAUDE.md]

Assess these dimensions:
1. MODULARITY: Are modules well-separated? Clear boundaries? Single responsibility?
2. NAMING: Are variables, functions, files named clearly and consistently?
3. SEPARATION OF CONCERNS: Is business logic separated from I/O, presentation, configuration?
4. CODE CLARITY: Can you understand each function's purpose from its name and structure?
5. MAGIC VALUES: Are there hardcoded numbers, strings, or paths that should be constants?
6. DEAD CODE: Is there unreachable code, unused imports, commented-out blocks?
7. ERROR HANDLING: Are errors handled explicitly? Any silent catches or swallowed exceptions?
8. DUPLICATION: Is there copy-pasted logic that should be extracted?

For EVERY finding, be specific:
- BAD: "Code quality could be improved"
- GOOD: "Function `parse_config` in `config.py:45` has a bare except clause that silently swallows parse errors — should catch `json.JSONDecodeError` specifically and log the failure"

Team values — follow these unconditionally:
- Be thorough. Check every file in scope.
- Be specific. File path, line number, exact issue, exact recommendation.
- Flag cross-perspective concerns — if you see a security issue while reviewing quality, note it.

Return using the audit-report.md finding table format:
## Implementation Quality
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
```

**Assessment Agent 2 — Risk & Vulnerability:**
```
You are a security analyst assessing risk and vulnerability.

SCOPE: [What's being audited]
FILES TO READ: [List of file paths]
CONVENTIONS: [Key conventions from CLAUDE.md]

Assess these dimensions:
1. INPUT VALIDATION: Is untrusted input validated at system boundaries? Path traversal? Injection?
2. DEPENDENCY HEALTH: Are dependencies up to date? Known vulnerabilities? Unnecessary dependencies?
3. FAILURE MODES: What happens when things go wrong? Graceful degradation or catastrophic failure?
4. INFORMATION LEAKAGE: Do error messages expose internal details? Are secrets or paths hardcoded?
5. PERMISSION MODEL: Does the system follow principle of least privilege?
6. OWASP PATTERNS: Any patterns from the OWASP Top 10 applicable to this type of project?

Team values — follow these unconditionally:
- Be thorough. Think like an attacker.
- Be specific. File path, line number, exact vulnerability, exact fix.
- Distinguish theoretical risks from practical exploitable vulnerabilities.

Return using the audit-report.md finding table format:
## Risk & Vulnerability
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
```

**Assessment Agent 3 — Architecture Coherence:**
```
You are a software architect assessing architecture coherence.

SCOPE: [What's being audited]
FILES TO READ: [List of file paths]
ARCHITECTURE DOCS: [CLAUDE.md architecture section, any Change Impact Maps]

Assess these dimensions:
1. STRUCTURE vs INTENT: Does the file/module structure match the documented architecture? Are modules where they're supposed to be?
2. DEPENDENCY DIRECTION: Do dependencies flow in the right direction? Any circular imports or inverted dependencies?
3. MODULE BOUNDARIES: Are boundaries clean? Are internals leaking across modules?
4. CONVENTION CONSISTENCY: Does the codebase follow its own stated conventions? Where does it deviate?
5. COUPLING ANALYSIS: What's tightly coupled that shouldn't be? What changes would cascade?

Team values — follow these unconditionally:
- Be thorough. Read the architecture docs AND the actual code. Compare.
- Be specific. "Module X imports from Module Y's internals at line Z" — not "some coupling exists."
- If the documented architecture is wrong (doesn't match reality), flag THAT too.

Return using the audit-report.md finding table format:
## Architecture Coherence
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
```

**Assessment Agent 4 — Future-Proofing:**
```
You are a technical strategist assessing future-proofing and extensibility.

SCOPE: [What's being audited]
FILES TO READ: [List of file paths]
PROJECT GOALS: [From STATE.md or PLAN.md if available]

Assess these dimensions:
1. COUPLING THAT BLOCKS CHANGE: What parts of the system would be hard to change? What's the cost of adding a new feature?
2. HARDCODED ASSUMPTIONS: Are there assumptions about file paths, data formats, platform, or environment baked into the code?
3. EXTENSIBILITY: How easy is it to add a new [module/feature/plugin]? Is there a clear pattern to follow?
4. TECH DEBT TRAJECTORY: Is tech debt increasing or decreasing? Are there patterns that will get worse over time?
5. SCALABILITY: What happens when the project grows 10x in files, users, or complexity?

Team values — follow these unconditionally:
- Be thorough. Think about what happens in 6 months, not just today.
- Be specific. "Adding a new plugin requires changes in 5 places" — name them.
- Distinguish real extensibility concerns from theoretical ones.

Return using the audit-report.md finding table format:
## Future-Proofing
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
```

**Assessment Agent 5 — Practice Compliance:**
```
You are a standards compliance auditor assessing whether the project follows its own rules.

SCOPE: [What's being audited]
FILES TO READ: [List of file paths]
PROJECT RULES: [From CLAUDE.md conventions section, context/rules.yaml, context/cross-references.yaml]

Assess these dimensions:
1. CLAUDE.MD COMPLIANCE: Does the code follow every convention documented in CLAUDE.md?
2. CROSS-REFERENCE COMPLIANCE: Are the cross-reference rules being followed? When file X changes, was file Y updated?
3. SELF-CONSISTENCY: Does the codebase follow its own patterns? Are there files that deviate from the established convention without reason?
4. DOCUMENTATION ACCURACY: Does the documentation (CLAUDE.md, README, comments) match the actual code?
5. NAMING CONVENTIONS: Are naming patterns consistent across the codebase?

Team values — follow these unconditionally:
- Be thorough. Check every rule in CLAUDE.md against the actual code.
- Be specific. "CLAUDE.md says X, but `file.py:30` does Y."
- If the rules are wrong (outdated or counterproductive), flag that too.

Return using the audit-report.md finding table format:
## Practice Compliance
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
```

**Assessment Agent 6 — Goal Alignment:**
```
You are a project manager assessing goal alignment and progress.

SCOPE: [What's being audited]
STATE: [context/STATE.md content]
PLANS: [BUILD-PLAN.md and/or PLAN.md content, if they exist]
REQUIREMENTS: [Requirements/exploration content, if available]
ACTUAL FILES: [List of file paths that exist]

Assess these dimensions:
1. STATED vs ACTUAL: What does STATE.md/PLAN.md say is done? Is it actually done in the codebase?
2. REQUIREMENT COVERAGE: For each stated requirement, is it addressed in the code?
3. DRIFT: Has the implementation drifted from the original goals? Where and why?
4. SILENT SCOPE REDUCTION: Were any goals or features silently dropped without being recorded?
5. COMPLETION HONESTY: Are milestones/tasks marked "done" actually done?
6. MOMENTUM: What's the trajectory? Accelerating, steady, decelerating, stalled?

Team values — follow these unconditionally:
- Be thorough. Check EVERY claimed completion against reality.
- Be specific. "STATE.md says M3 is done, but `workflows/review.md` doesn't exist yet."
- Scope reduction is a CRITICAL finding — never let it pass.

Return using the audit-report.md finding table format:
## Goal Alignment
**Overall:** On Track | Minor Drift | Significant Drift | Off Track

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
```

**IMPORTANT:** All 6 agents run in parallel. Wait for all to return before proceeding.
</step_2_spawn_assessment_agents>

<step_3_synthesize_findings>
Read all 6 agents' findings. Perform a structured synthesis:

**3a. Cross-Perspective Agreements:**
Where did 2+ agents flag the same thing? These are high-confidence findings. Weight them heavily.

**3b. Cross-Perspective Disagreements:**
Where did agents see the same thing differently? These highlight tension points that need a decision.
Example: "Future-Proofing says the coupling is fine for now; Architecture Coherence says it will become a problem."

**3c. Build the Priority Matrix:**
Group ALL findings by urgency:
- **Fix Now (Critical):** Broken functionality, security vulnerabilities, data loss risks
- **Fix Soon (High):** Quality degradation, architecture violations, goal drift
- **Plan For (Medium):** Tech debt, extensibility concerns, convention deviations
- **Note (Low):** Minor improvements, nice-to-haves

**3d. Build Recommended Actions:**
Translate priority findings into architect-ready actions. Each action:
- Addresses specific finding IDs
- Has an estimated effort (S/M/L)
- Feeds directly into the plan workflow as sprint task seeds
</step_3_synthesize_findings>

<step_4_write_and_present>
**4a. Write AUDIT-REPORT.md:**
Using templates/audit-report.md, save to: `[cwd]/artifacts/audits/YYYY-MM-DD-[slug]-audit-report.md`

**4b. Present executive summary to user:**
```
Audit complete: [Project/Module Name]

Overall: [Brief 2-sentence assessment]

Findings: [N] total
- Critical: [N] — [one-line summary of most important]
- High: [N] — [one-line summary]
- Medium: [N]
- Low: [N]

Top recommendations:
1. [Most important action] — [effort estimate]
2. [Second most important] — [effort estimate]
3. [Third] — [effort estimate]

Full report: [path to AUDIT-REPORT.md]

Next step: `/architect` to plan improvements based on these findings.
```

Use AskUserQuestion:
- **Plan improvements** — Route to architect plan workflow using audit findings as input
- **Review full report** — I want to read the detailed findings first
- **Discuss findings** — I have questions about specific findings
</step_4_write_and_present>

</process>

<success_criteria>
- Scope was clearly determined (full codebase, module, or goal alignment)
- 6 assessment agents were spawned in parallel with distinct perspectives
- Every finding is specific: file path, line number, exact issue, exact recommendation
- Cross-perspective agreements and disagreements identified
- Priority matrix groups findings by urgency, not perspective
- Recommended actions are architect-ready (can become sprint tasks)
- AUDIT-REPORT.md saved to disk at standardized location
- Executive summary presented to user
- Handoff to plan workflow suggested
- No vague findings ("code quality needs improvement" is rejected)
</success_criteria>
