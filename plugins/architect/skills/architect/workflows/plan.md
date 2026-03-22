<required_reading>
Read these reference files NOW before proceeding:
1. references/architecture-patterns.md
2. references/sprint-management.md
3. references/team-culture.md
4. templates/plan.md
5. templates/task-spec.md
</required_reading>

<process>

<step_1_gather_inputs>
Identify and read the architect's inputs. These come from one or more of:

1. **miltiaze exploration/requirements** — Check `[cwd]/artifacts/explorations/` for files related to this project. Read them. Extract:
   - Recommended solution (from the Solutions section)
   - Key components and their dependencies
   - Build Plans table (if present — these seed the sprint structure)
   - Risks and mitigations
   - Technical decisions already made
   - Constraints (platform, technology, existing system)

2. **Audit report** — Check `[cwd]/artifacts/audits/` for a recent audit. Read it. Extract:
   - Priority findings (Critical and High from Priority Matrix)
   - Recommended actions (these seed sprint tasks)
   - Architecture coherence findings (these inform structural decisions)

3. **Direct user request** — If neither exists, the user described what to build directly. Extract:
   - What they want built
   - Constraints and preferences
   - What "done" looks like

4. **Existing codebase** — Read the project's structure:
   - CLAUDE.md for architecture documentation and Change Impact Map
   - context/cross-references.yaml for coupling rules
   - Current file structure (what exists, what patterns to follow)
   - context/STATE.md for project state

Combine all inputs into a clear picture of: WHAT we're building, WHY, WITHIN what constraints, and ON TOP OF what existing foundation.
</step_1_gather_inputs>

<step_2_spawn_perspective_agents>
Launch these 4 agents in parallel using the Agent tool. Each agent reads the SAME inputs but analyzes from a different professional lens.

Read references/team-culture.md for the team values block to include in every prompt.

**Agent 1 — Infrastructure Perspective:**
```
You are an infrastructure architect reviewing a technical plan.

PROJECT: [Brief description of what we're building]
INPUTS: [Paths to requirements/exploration/audit report]
EXISTING CODEBASE: [Key structural details — file tree, patterns, conventions]

Read the input files listed above. Then analyze from an infrastructure perspective:

1. MODULE MAP: What modules/components are needed? What's the file structure? What existing patterns should this follow? What new directories or files need to be created?

2. DEPENDENCY RULES: What depends on what? Draw the dependency direction. Flag any potential circular dependencies. What should be the layering order?

3. PACKAGING & DEPLOYMENT: How is this packaged? What build steps? What configuration? Any environment concerns?

4. EXISTING PATTERN COMPLIANCE: Does the proposed structure follow the existing codebase conventions? Where does it deviate and why?

5. SCALABILITY CONCERNS: Will this structure hold up as the project grows? Any coupling that will become painful?

Team values — follow these unconditionally:
- Be thorough. Surface everything you find. Think beyond your assigned scope.
- Be direct. No filler, no hedging. State findings as facts or qualified assessments.
- If you see something relevant to another perspective (UX, testing, security), flag it.
- If your assessment conflicts with what you think another perspective might say, that's important — don't soften it.
- Nothing is too small to note or too big to attempt.

Return your findings in this structure:
## Infrastructure Perspective

### Module Map
[Your proposed module/file structure]

### Dependency Rules
[Dependency direction, layering, any cycle risks]

### Packaging & Deployment
[Build, config, environment concerns]

### Pattern Compliance
[How well this fits existing conventions]

### Scalability Concerns
[Growth risks, coupling concerns]

### Cross-Perspective Flags
[Anything you noticed that's relevant to other perspectives]
```

**Agent 2 — Interface Design Perspective:**
```
You are an API and interface designer reviewing a technical plan.

PROJECT: [Brief description]
INPUTS: [Paths to requirements/exploration/audit]
EXISTING CODEBASE: [Key structural details]

Read the input files. Then analyze from an interface design perspective:

1. CONTRACTS: What data flows between modules? What are the input/output contracts? What goes in, what comes out, in what format?

2. DATA FLOW: Trace the data from entry point to final output. Where does it transform? Where could it get lost or corrupted?

3. INTEGRATION POINTS: Where does this system connect to other systems (other skills, hooks, external tools)? What are the handoff contracts?

4. VERSION COMPATIBILITY: If this changes existing interfaces, what breaks? What needs migration?

5. API SURFACE: What's exposed to consumers? Is the surface area minimal? Are there unnecessary public APIs?

Team values — follow these unconditionally:
- Be thorough. Surface everything you find. Think beyond your assigned scope.
- Be direct. No filler, no hedging. State findings as facts or qualified assessments.
- If you see something relevant to another perspective, flag it.
- If your assessment conflicts with what you think another perspective might say, that's important — don't soften it.
- Nothing is too small to note or too big to attempt.

Return your findings in this structure:
## Interface Design Perspective

### Contracts
[Module-to-module data contracts]

### Data Flow
[Entry to output trace]

### Integration Points
[External system connections and handoffs]

### Version Compatibility
[Breaking change analysis]

### API Surface
[What's exposed and whether it should be]

### Cross-Perspective Flags
[Anything relevant to other perspectives]
```

**Agent 3 — Testing Strategy Perspective:**
```
You are a testing strategist reviewing a technical plan.

PROJECT: [Brief description]
INPUTS: [Paths to requirements/exploration/audit]
EXISTING CODEBASE: [Key structural details]

Read the input files. Then analyze from a testing perspective:

1. VERIFICATION STRATEGY: How do we verify each component works? What can be tested automatically vs. manually? What test infrastructure exists or needs to be created?

2. TESTABILITY: Is the proposed architecture testable? Can modules be verified in isolation? Are there components that resist testing?

3. EDGE CASES: What are the edge cases and failure modes? What happens with empty input, malformed data, missing dependencies, concurrent access?

4. FITNESS FUNCTIONS: What architectural properties should be preserved? Write them as machine-checkable assertions (e.g., "Module A never imports from Module B internals").

5. ACCEPTANCE CRITERIA: For each major component, what are the testable acceptance criteria? Write them as assertions.

Team values — follow these unconditionally:
- Be thorough. Surface everything you find. Think beyond your assigned scope.
- Be direct. No filler, no hedging. State findings as facts or qualified assessments.
- If you see something relevant to another perspective, flag it.
- If your assessment conflicts with what you think another perspective might say, that's important — don't soften it.
- Nothing is too small to note or too big to attempt.

Return your findings in this structure:
## Testing Strategy Perspective

### Verification Strategy
[How to verify each component]

### Testability Assessment
[Architecture testability, isolation concerns]

### Edge Cases & Failure Modes
[What could go wrong]

### Fitness Functions
[Architectural property assertions]

### Acceptance Criteria
[Per-component testable criteria]

### Cross-Perspective Flags
[Anything relevant to other perspectives]
```

**Agent 4 — Security & Quality Perspective:**
```
You are a security and quality reviewer analyzing a technical plan.

PROJECT: [Brief description]
INPUTS: [Paths to requirements/exploration/audit]
EXISTING CODEBASE: [Key structural details]

Read the input files. Then analyze from a security and quality perspective:

1. THREAT SURFACE: What could an attacker exploit? What could go wrong with untrusted input? Where is validation missing? (Consider prompt injection, file path traversal, information leakage, dependency vulnerabilities.)

2. ERROR HANDLING: Where can things fail? Is every failure handled explicitly? Are there silent catches, swallowed errors, or missing error paths?

3. CODE QUALITY RISKS: Where is complexity likely to accumulate? What magic numbers, hardcoded values, or hidden coupling could creep in?

4. DEFENSIVE PATTERNS: What defensive patterns should be in place? Input validation at boundaries, sanitization, principle of least privilege, fail-safe defaults.

5. QUALITY GATES: What checks should run before each sprint is considered done? What standards should the code meet?

Team values — follow these unconditionally:
- Be thorough. Surface everything you find. Think beyond your assigned scope.
- Be direct. No filler, no hedging. State findings as facts or qualified assessments.
- If you see something relevant to another perspective, flag it.
- If your assessment conflicts with what you think another perspective might say, that's important — don't soften it.
- Nothing is too small to note or too big to attempt.

Return your findings in this structure:
## Security & Quality Perspective

### Threat Surface
[Attack vectors, untrusted input, validation gaps]

### Error Handling
[Failure modes and handling gaps]

### Code Quality Risks
[Complexity, coupling, magic values]

### Defensive Patterns
[What protections to put in place]

### Quality Gates
[Per-sprint quality checks]

### Cross-Perspective Flags
[Anything relevant to other perspectives]
```

**IMPORTANT:** All 4 agents run in parallel. Each reads the same source files. Wait for all to return before proceeding.
</step_2_spawn_perspective_agents>

<step_3_synthesize>
Read all 4 agents' findings. Perform a structured synthesis:

**3a. Identify Agreements:**
Where do 2+ agents say the same thing? These are high-confidence findings. List them.
Example: "Infrastructure and Testing both flag that module X should be isolated for testability."

**3b. Identify Disagreements:**
Where do agents conflict? These are the IMPORTANT decisions — they need resolution.
Example: "Infrastructure wants a flat file structure; Interface Design wants nested modules for clearer contracts."
For each disagreement: state both positions, evaluate the tradeoff, make a recommendation, and log it as a decision.

**3c. Identify Unique Insights:**
What did only one agent catch? These are valuable — they're the things a single-perspective analysis would miss.
Example: "Security flagged that the template files could be used for path traversal if file paths aren't validated."

**3d. Build the Architecture Overview:**
From the infrastructure agent's module map, the interface agent's contracts, and the testing agent's fitness functions, construct:
- A Mermaid diagram showing the system structure
- A module map with purpose, key files, dependencies, and sprint ownership
- Interface contracts between modules
- Fitness functions (architectural assertions)

**3e. Resolve Decisions:**
For each disagreement or choice point, decide. Record in the Decisions Log with:
- What was decided
- What alternatives were considered
- Why this choice (tied to project constraints and requirements)

If a decision is unclear or important enough to warrant user input, DON'T decide — flag it for the ask workflow (step 5).
</step_3_synthesize>

<step_4_design_sprints>
Using references/sprint-management.md, break the work into sprints.

**4a. List all tasks:**
From the synthesis, list every piece of work needed. For each:
- What it delivers
- What files it touches (CREATE, MODIFY, CHECK)
- What it depends on
- Estimated size (S/M/L)

**4b. Group into sprints:**
- Keep coupled files in the same sprint
- Independent tasks can be in parallel sprints
- Each sprint is verifiable as a unit
- No sprint exceeds context health limits (see sprint-management.md)
- Foundation first, then core features, then supporting features, then polish

**If miltiaze provided Build Plans:** Use those as the sprint structure seed. Validate the ordering and dependencies, but don't re-decompose what the exploration already structured. Adjust only if the perspective agents identified issues the exploration missed.

**4c. Design sprint 1 in detail:**
Sprint 1 gets full task specs immediately. Later sprints get summary descriptions — they'll be detailed after the preceding sprint's review.

For each task in sprint 1, create a task spec using templates/task-spec.md:
- Goal (what and why)
- Context (what to read first)
- Interface specification (inputs, outputs, contracts with other tasks)
- Pseudocode (specific enough to implement mechanically)
- Files touched (CREATE/MODIFY/CHECK with specifics)
- Acceptance criteria (testable assertions)
- Edge cases (with correct behavior)

**4d. Write the PLAN.md:**
Using templates/plan.md, create the full plan document:
- Vision (from requirements/exploration)
- Architecture Overview (Mermaid diagram from synthesis)
- Module Map
- Sprint Tracking table (columns: Sprint, Tasks, Completed, QA Result, Key Changes. Do NOT add a Status column — sprint status is tracked in STATE.md only)
- Task Index (columns: Task, Sprint, File, Depends On. Do NOT add a Status column)
- Interface Contracts
- Decisions Log (populated from synthesis)
- Fitness Functions (from testing agent)
- Risk Register (from all agents' concerns)
- Change Log (initial entry)
</step_4_design_sprints>

<step_5_check_for_escalations>
Review the plan for decisions that need user input. Criteria for escalation:

- The decision significantly affects scope, timeline, or user experience
- Two viable options exist with genuinely different tradeoffs
- The correct answer depends on user preferences, priorities, or context you don't have
- The decision is hard to reverse later

For each escalation:
- Frame the decision clearly
- Present options with your recommendation
- Explain the tradeoff
- Use AskUserQuestion to get the user's call

Record all decisions (both architect-made and user-made) in the Decisions Log.
</step_5_check_for_escalations>

<step_6_present_plan>
Present a summary to the user — NOT the full PLAN.md (they can read it), but a concise overview:

```
Plan ready for [PROJECT NAME].

Architecture: [1-2 sentence summary — what modules, what structure]

Sprints:
1. [Name] (S/M/L) — [Goal]. [N] tasks.
2. [Name] (S/M/L) — [Goal]. [N] tasks.
...

Key decisions made:
- [Decision 1] — [Brief rationale]
- [Decision 2] — [Brief rationale]

Risks flagged:
- [Risk 1] — [Mitigation]

Sprint 1 is fully specified with [N] task specs. Ready to start?
```

Use AskUserQuestion:
- **Start building** — Proceed to sprint 1 execution
- **Review the plan** — I want to read PLAN.md and discuss before proceeding
- **Adjust something** — I want to change part of the plan
</step_6_present_plan>

<step_7_save_and_handoff>
**7a. Save artifacts:**
- Create directory: `[cwd]/artifacts/designs/[slug]/`
- Create sprints directory: `[cwd]/artifacts/designs/[slug]/sprints/sprint-1/`
- Save PLAN.md to `[cwd]/artifacts/designs/[slug]/PLAN.md`
- Save each sprint 1 task spec to `[cwd]/artifacts/designs/[slug]/sprints/sprint-1/task-K-[short-name].md`

**7b. Update STATE.md (if mk-flow is initialized):**
Update or add the Pipeline Position section with exact values:
```markdown
## Pipeline Position
- **Stage:** sprint-1
- **Requirements:** [path to requirements/exploration file]
- **Audit:** [path to audit report, or —]
- **Plan:** artifacts/designs/[slug]/PLAN.md
- **Current sprint:** 1
```
Also update **Current Focus** to: "Architect plan complete for [feature]. Sprint 1 ready for execution."

**7c. Handoff with exact next command:**
Present this to the user:
```
Plan complete. PLAN.md saved to [path].
Sprint 1: [N] tasks ready at [sprint dir path].

To continue the pipeline, run:
   /ladder-build

It will read the task specs and execute sprint 1.
You can /clear first to free up context — all state is on disk.
```

The architect's job for sprint 0 is done. Execution is ladder-build's responsibility. After the sprint completes, invoke the architect again with the review workflow.
</step_7_save_and_handoff>

</process>

<success_criteria>
- All available inputs were read (requirements, exploration, audit, codebase structure)
- 4 perspective agents were spawned in parallel with role-specific prompts
- Synthesis explicitly identified agreements, disagreements, and unique insights
- All disagreements were resolved (architect decision or user escalation)
- Every decision is recorded in the Decisions Log with alternatives and rationale
- PLAN.md is complete: vision, architecture, module map, sprints, tasks, contracts, decisions, fitness functions, risks
- Sprint 1 has full task specs with pseudocode and acceptance criteria
- All artifacts saved to disk at standardized locations
- User confirmed the plan before proceeding
- No scope was silently dropped or deferred
</success_criteria>
