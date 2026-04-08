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

**Scope mode detection:**
- scope_mode = TRUE if the user's input contains "scope", "decompose", or "cascading"
  OR if context/STATE.md Pipeline Position stage is "idle" and user explicitly requests the scope pipeline
- If scope_mode is TRUE, outputs will go to `artifacts/scope/brief/` instead of `artifacts/explorations/`
- Feature flow: if the user describes adding to an existing codebase, set feature_mode = TRUE and use `artifacts/scope/features/{slug}/brief/` path

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
1. **Generate the metadata block.** At the very top of the report, before the title and TL;DR, include:
   > **type:** requirements
   > **output_path:** artifacts/explorations/YYYY-MM-DD-[topic-slug]-requirements.md
   > **key_decisions:** [list decisions made during requirements research — technology choices, approach selections, constraint resolutions]
   > **open_questions:** [list questions that remain unresolved, or "none"]

   The metadata block must use blockquote format (`> **field:** value`), one field per line, no nesting.

   **If scope_mode is TRUE**, adjust the output process:

   1a. **Ensure directory exists:** Create the scope output directory (mkdir -p equivalent).

   1b. **Set output directory:**
      - Greenfield: `artifacts/scope/brief/`
      - Feature flow (feature_mode TRUE): `artifacts/scope/features/{slug}/brief/`

   1c. **Write the human-readable brief** (`project-brief.md` or `feature-brief.md`):
      Same content as the standard requirements report, but saved to the scope output directory.
      Update metadata `output_path` accordingly.

   1d. **Co-author the agent brief** (per D4 — dual representation):
      Write `{output_dir}/project-brief.agent.md` (or `feature-brief.agent.md`) with:

      ```yaml
      ---
      type: agent-brief
      purpose: project-brief
      project: "{project name from requirements}"
      scope_root: "artifacts/scope/"
      source_hash: "{SHA-256 of the sibling .md file}"
      ---
      ```

      ```xml
      <context>
        <project>{3-5 sentence project summary}</project>
        <target_users>{who uses this}</target_users>
      </context>

      <requirements>
        <functional>
          {MUST requirements as bullet items}
        </functional>
        <non_functional>
          {NFR items}
        </non_functional>
        <constraints>
          {Implementation constraints — positive framing only, per D7}
        </constraints>
      </requirements>

      <use_cases>
        {Each use case as a <case name="..."> block}
      </use_cases>

      <acceptance_criteria>
        {Testable assertions from the requirements}
      </acceptance_criteria>

      <risks>
        {Aggregated risks with likelihood and mitigation}
      </risks>
      ```

      Rules for agent brief:
      - Positive framing only — convert "MUST NOT" to "USE ONLY" equivalents (F3 compliance)
      - Front-load constraints before use cases (primacy bias)
      - source_hash must match SHA-256 of the sibling .md file

   1e. **Create INDEX.md:**
      If `{scope_root}/INDEX.md` already exists: warn the user: "INDEX.md already exists at {scope_root}/INDEX.md. Previous decomposition state (module status, level history, decisions) will be overwritten. Existing scope/ artifacts remain on disk but may be orphaned." Proceed with overwrite — the user invoked requirements mode explicitly.

      Read `plugins/architect/skills/architect/templates/index.md` for structure.
      Write `{scope_root}/INDEX.md` with:
      - Project name from requirements
      - Phase: `brief-complete`
      - Module Status: empty table (populated at Level 0)
      - Decomposition Config: max_depth=5, leaf_size_target=250, overflow_threshold=300, parallel_batch_size=5, next_decision_id=1
      - File Inventory: list both .md and .agent.md brief files (or feature-brief variants)
      - Level History: empty (Level 0 not started)

   Then continue with steps 2-11 using the scope output path instead of the explorations path.

   **If scope_mode is FALSE** (legacy mode): proceed with steps 1-11 exactly as they are now — no changes to legacy behavior.

2. Write the TL;DR — what we're building, recommended approach, key constraint
3. Write "What We're Building" with user stories
4. Write Research Findings with each perspective's analysis
5. Write Cross-Perspective Agreements and Disagreements
6. Write Recommended Solution with alternatives if they exist
7. Write Acceptance Criteria (testable assertions)
8. Write Implementation Constraints
9. **Generate the "Implementation Risks" section.** Aggregate risks from ALL perspective agents into a single section. Each risk must name the component, the failure mode, the likelihood (H/M/L), and the mitigation. Cross-reference with cross-perspective disagreements — any unresolved disagreement is a risk. Do NOT scatter risks across perspective sections without also aggregating them here. The architect needs a single view of all risks.
10. Write Build Plans table
11. Compile sources

Use the templates/requirements-report.md structure exactly.
</step_assemble_report>

<step_verify>
Before presenting, check:
- Metadata block is present at the very top (before title), uses blockquote format (`> **field:** value`), and includes all 4 fields: type, output_path, key_decisions, open_questions
- Every factual claim has a source or is explicitly qualified
- No fabricated libraries, APIs, or tools
- Acceptance criteria are all testable (not vague)
- Disagreements are surfaced, not smoothed over
- "Implementation Risks" section is present with 3+ specific risks aggregated from all perspective agents, each with likelihood and mitigation
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
   If scope_mode: save to `{scope_output_dir}/project-brief.md` (or feature-brief.md) instead of `artifacts/explorations/`.
   The agent brief and INDEX.md were already written in step_assemble_report.

3. **Update STATE.md** (if mk-flow initialized):
   Update or add the Pipeline Position section with exact values:
   ```markdown
   ## Pipeline Position
   - **Stage:** requirements-complete
   - **Requirements:** artifacts/explorations/YYYY-MM-DD-[topic-slug]-requirements.md
   - **Audit:** —
   - **Plan:** —
   - **Current sprint:** —
   - **Build plan:** —
   - **Task specs:** —
   - **Completion evidence:** —
   - **Last verified:** —
   ```
   Stage name `requirements-complete` is from the canonical pipeline stages spec
   (`plugins/mk-flow/skills/state/templates/state.md`, Canonical Pipeline Stages section).

   If scope_mode, update Pipeline Position with:
   ```markdown
   ## Pipeline Position
   - **Stage:** requirements-complete
   - **Requirements:** {path to project-brief.md in scope/}
   - **Audit:** —
   - **Plan:** —
   - **Current sprint:** —
   - **Build plan:** —
   - **Scope root:** artifacts/scope/
   - **Task specs:** —
   - **Completion evidence:** —
   - **Last verified:** —
   ```

   Also update **Current Focus** to describe what was just researched.
   Write Current Focus as a state description — what IS, not what to DO. Pipeline Position handles routing.

4. **Handoff with exact next command:**

   If scope_mode, present:
   ```
   Requirements complete and saved to {scope_root}/brief/.
   INDEX.md created at {scope_root}/INDEX.md.

   To start architecture decomposition, run:
      /architect scope level-0

   You can /clear first — all state is on disk.
   ```

   If legacy mode, present:
   ```
   Requirements complete and saved to [path].

   To continue the pipeline, run:
      /architect

   The architect will read the requirements and plan sprints.
   You can /clear first to free up context — all state is on disk.
   ```

NEVER stop at "here's the requirements." Always show the exact next command.
</step_present_and_save>

</process>

<success_criteria>
- Metadata block present at top with type, output_path, key_decisions, open_questions in blockquote format
- Project need was analyzed with appropriate professional perspectives
- Each perspective agent carried a distinct professional role (not just a topic)
- All factual claims are sourced or qualified
- Cross-perspective agreements and disagreements explicitly surfaced
- Disagreements are presented for the architect to resolve, not resolved by miltiaze
- "Implementation Risks" section present with 3+ specific risks aggregated from all perspectives (not boilerplate)
- Acceptance criteria are all testable assertions
- Build Plans table feeds directly into architect sprint planning
- Requirements use MUST/SHOULD/MUST NOT language
- Report saved to artifacts/explorations/ with -requirements suffix
- Architect handoff suggested with clear next step
- No filler, every section earns its place
</success_criteria>
