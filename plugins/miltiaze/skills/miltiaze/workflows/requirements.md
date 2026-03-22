<required_reading>
Read these reference files before proceeding:
1. references/research-dimensions.md
2. references/presentation-standards.md
3. templates/requirements-report.md
</required_reading>

<context>
This workflow produces REQUIREMENTS documents — the input to the architect skill. It's a variant of full-exploration with two key differences:
1. Research agents carry professional PERSPECTIVE assignments (not just dimension names)
2. Output is framed for implementation (acceptance criteria, constraints, disagreements) not just understanding

Use this workflow when the user's intent is to BUILD something. Use full-exploration.md when the intent is to UNDERSTAND or DECIDE.
</context>

<process>

<step_analyze>
Parse what the user said. Extract:
- **Core need:** What are they trying to build or achieve?
- **Hinted perspectives:** Did they mention feasibility, UX, operations, security, etc.?
- **Implicit constraints:** Platform, language, existing system, skill level, timeline
- **Target users:** Who will use the finished product?
- **Success criteria:** What does "done" look like to them?

**Context check:**
- Check `artifacts/explorations/` — has this topic been explored before? If so, read the previous exploration and build on it rather than starting from scratch.
- Check `context/STATE.md` (if it exists) — is there active work related to this topic?
- Check the existing codebase — what patterns, conventions, and constraints does the project already have?

Do NOT ask clarifying questions unless there is genuine ambiguity about WHAT they want to build. If the user gave a rich description, proceed.
</step_analyze>

<step_select_perspectives>
Select research perspectives based on what this project needs. Unlike exploration dimensions (which are topic-driven), perspectives are role-driven — each agent acts as a professional analyzing the same problem.

**Standard perspectives for most build projects:**
- **Technical feasibility** — Can this work? Hard constraints? Technology maturity?
- **User experience** — How does this feel to use? Interaction flow? Edge cases?
- **Operations & maintenance** — How do we keep this running? What breaks at scale?
- **Integration** — How does this connect to existing systems? Compatibility?

**Add when relevant:**
- **Security** — Threat surface, input validation, data protection
- **Performance** — Latency, throughput, resource usage
- **Domain-specific** — Compliance, accessibility, i18n, etc.

Present the selected perspectives briefly:

"I'll research this from these professional perspectives:
1. **[Perspective]** — [why this matters for this project]
2. **[Perspective]** — [why]
..."

Then ask using AskUserQuestion:
- **Go ahead** — These cover what I need
- **Add a perspective** — There's an angle I want covered
- **Remove one** — Some aren't relevant
</step_select_perspectives>

<step_research>
Launch parallel research using Agent subagents. Each agent carries a PROFESSIONAL PERSPECTIVE — they're not just researching a topic, they're analyzing it through a specific professional lens.

**Agent prompt pattern:**
```
You are a [PROFESSIONAL ROLE] analyzing requirements for a new project.

PROJECT: "[PROJECT SUMMARY]"
TARGET USERS: [Who uses this]
CONSTRAINTS: [Known constraints]
EXISTING SYSTEM: [Relevant codebase context]

Analyze this project from your professional perspective:

1. [PERSPECTIVE-SPECIFIC QUESTIONS — derived from research-dimensions.md but framed through the professional role]

2. REQUIREMENTS: Based on your analysis, what requirements should the implementation meet? Frame them as testable assertions:
   - "The system MUST [specific behavior]"
   - "The system SHOULD [preferred behavior]"
   - "The system MUST NOT [forbidden behavior]"

3. RISKS: What could go wrong from your perspective? Be specific — name the risk, the likelihood, and the mitigation.

4. CROSS-PERSPECTIVE FLAGS: If you see something that another perspective should consider (e.g., you're analyzing UX but notice a security concern), flag it explicitly.

Research requirements:
- Use WebSearch for current information (it's [current year])
- Use Context7 (resolve-library-id then query-docs) for specific libraries or frameworks
- Include source URLs for every factual claim
- Be specific: name real tools, versions, APIs
- Do NOT fabricate anything

Return your findings in this structure:
## [Perspective Name]: [One-Line Summary]
**Agent:** [Your professional role]

[Your analysis]

### Requirements from This Perspective
- MUST: [requirement]
- SHOULD: [requirement]
- MUST NOT: [requirement]

### Risks
- [Risk] — Likelihood: [H/M/L] — Mitigation: [approach]

### Cross-Perspective Flags
- [Flag for other perspectives]

**Bottom line:** [1-2 sentence takeaway]
**Sources used:** [list with URLs]
```

Use sequential research for perspectives that depend on earlier findings. Use parallel for independent perspectives.
</step_research>

<step_synthesize_requirements>
After all perspective research returns, synthesize into a requirements document:

**1. Identify cross-perspective patterns:**
- **Agreements** — Multiple perspectives flagged the same thing → high confidence requirement
- **Disagreements** — Perspectives conflict → important decision for the architect (surface clearly, do NOT resolve)
- **Unique insights** — Only one perspective caught this → flag it prominently

**2. Build unified requirements:**
Merge all perspectives' MUST/SHOULD/MUST NOT requirements into a unified list. Deduplicate. Group by category (functional, non-functional, constraints).

**3. Derive acceptance criteria:**
From the user stories and unified requirements, write testable acceptance criteria. Each criterion must be verifiable by reading code and running it.

**4. Write the recommended solution:**
From the research, identify the best approach. If multiple viable approaches exist, present them with tradeoffs. Lead with a recommendation.

**5. Build the Build Plans table:**
Decompose the recommended solution into plans that feed the architect's sprint planning. Same format as exploration Build Plans.

**Key difference from exploration synthesis:** Don't present findings as "things to consider." Frame everything as "things the architect needs to plan for." Requirements, not options. Constraints, not suggestions.
</step_synthesize_requirements>

<step_assemble_report>
1. Write the TL;DR — what we're building, recommended approach, key constraint
2. Write "What We're Building" with user stories
3. Write Research Findings with each perspective's analysis
4. Write Cross-Perspective Agreements and Disagreements
5. Write Recommended Solution with alternatives if they exist
6. Write Acceptance Criteria (testable assertions)
7. Write Implementation Constraints
8. Write Build Plans table
9. Compile sources

Use the templates/requirements-report.md structure exactly.
</step_assemble_report>

<step_verify>
Before presenting, check:
- Every factual claim has a source or is explicitly qualified
- No fabricated libraries, APIs, or tools
- Acceptance criteria are all testable (not vague)
- Disagreements are surfaced, not smoothed over
- Build Plans table is actionable for the architect
- Requirements use MUST/SHOULD/MUST NOT language
- Every section earns its place — no filler
</step_verify>

<step_present_and_save>
1. Present the full requirements report in the conversation.

2. Save to file:
   - Directory: `[cwd]/artifacts/explorations/`
   - Filename: `YYYY-MM-DD-[topic-slug]-requirements.md`
   - Tell the user where it's saved.

3. **Handoff to architect:**
   "Requirements complete. The recommended next step is `/architect` to plan the implementation. The requirements at [path] have everything needed — acceptance criteria, constraints, build plans, and unresolved disagreements for the architect to decide on."

4. **Update STATE.md** (if mk-flow initialized):
   If a Pipeline Position section exists, update stage to `requirements-complete`.

NEVER stop at "here's the requirements." Always push toward the architect handoff — the pipeline keeps moving.
</step_present_and_save>

</process>

<success_criteria>
- Project need was analyzed with appropriate professional perspectives
- Each perspective agent carried a distinct professional role (not just a topic)
- All factual claims are sourced or qualified
- Cross-perspective agreements and disagreements explicitly surfaced
- Disagreements are presented for the architect to resolve, not resolved by miltiaze
- Acceptance criteria are all testable assertions
- Build Plans table feeds directly into architect sprint planning
- Requirements use MUST/SHOULD/MUST NOT language
- Report saved to artifacts/explorations/ with -requirements suffix
- Architect handoff suggested with clear next step
- No filler, every section earns its place
</success_criteria>
