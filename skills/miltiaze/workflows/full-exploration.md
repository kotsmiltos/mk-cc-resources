<required_reading>
Read these reference files before proceeding:
1. references/research-dimensions.md
2. references/presentation-standards.md
3. templates/exploration-report.md
</required_reading>

<process>

<step_analyze>
Parse what the user said. Extract:
- **Core idea:** What is the thing they want to explore?
- **Hinted dimensions:** Did they mention feasibility, UX, implementation, specific tools, etc.?
- **Implicit constraints:** Platform, language, existing system, skill level, etc.
- **Apparent goal:** Are they exploring to build? To decide? To learn? To evaluate?

**Context check before exploring:**
- Check `artifacts/explorations/` — has this topic been explored before? If so, read the previous exploration and offer: "You explored [similar topic] on [date]. Want to build on that or start fresh?"
- Check `context/STATE.md` (if it exists) — is there active work related to this topic? Surface it.

Do NOT ask clarifying questions unless there is genuine ambiguity about what the idea IS. If the user gave a rich description, you have enough — proceed.
</step_analyze>

<step_select_dimensions>
Using the research-dimensions.md framework, select every dimension that is relevant to THIS idea. There is no fixed count — some ideas need 3 angles, some need 8 or more. Let the idea dictate the scope. Consider:
- What dimensions did the user's own prompt touch on? Those are important to them.
- What dimensions are objectively important for this type of idea?
- What dimensions would a thoughtful person want explored even if they didn't think to ask?

Present the selected dimensions to the user briefly:

"I'll explore [idea] across these angles:
1. **[Dimension]** — [why this matters for this idea]
2. **[Dimension]** — [why]
3. **[Dimension]** — [why]
..."

Then ask using AskUserQuestion:

Question: "These are the angles I'll investigate. Want to adjust?"

Options:
1. **Go ahead** — These cover what I need
2. **Add an angle** — There's something I want explored that's not listed
3. **Remove an angle** — Some of these aren't relevant
4. **Let me reframe** — I want to adjust the scope of the exploration

If "Go ahead" -> proceed to research.
If "Add an angle" -> receive input, add to dimension list, ask again.
If "Remove an angle" -> receive input, remove, ask again.
If "Let me reframe" -> receive input, re-analyze from step_analyze.
</step_select_dimensions>

<step_research>
For each selected dimension, determine the right research approach from the research-dimensions.md table.

Launch parallel research using Task subagents for dimensions that are independent of each other. Each subagent should:
- Focus on ONE dimension
- Use the tools specified in the research-dimensions.md table for that dimension
- Use Context7 (resolve-library-id -> query-docs) for any specific library or framework mentioned
- Use WebSearch for current information, trends, or state-of-the-art
- Return structured findings with source URLs

Example subagent prompt pattern:
```
Research the [DIMENSION NAME] dimension of this idea: "[IDEA SUMMARY]"

Context: [relevant constraints, existing system details, user preferences]

Investigate:
- [specific questions for this dimension from research-dimensions.md]

Requirements:
- Use WebSearch for current information (it's [current year])
- Use Context7 (resolve-library-id then query-docs) for any specific libraries or frameworks
- Include source URLs for every factual claim
- If you cannot verify something, explicitly say so
- Be specific: name real tools, real libraries, real version numbers
- Do NOT fabricate library names, APIs, or capabilities

Return your findings in this structure:
## [Dimension Name]: [One-Line Summary]
[Your findings]
**Bottom line:** [1-2 sentence takeaway]
**Sources used:** [list with URLs]
```

Use sequential research for dimensions that depend on earlier findings (e.g., Implementation Approaches may depend on Technical Landscape results).
</step_research>

<step_formulate_solutions>
After all dimension research returns, synthesize into as many distinct solutions as genuinely exist. Sometimes there's one clear winner, sometimes there are several viable paths. Present what's real — don't force a second option when one approach is clearly right, but don't collapse to one when multiple genuinely compete.

For each solution:
- Combine findings across dimensions into a coherent approach
- Mix and match components from different tools/libraries/patterns when it makes sense
- Explicitly document: what it is, why it works, dependencies, pitfalls, hard limits, and effort estimate (S/M/L/XL)
- NEVER straw-man or pad — every solution presented MUST be a genuine contender. If only one approach makes sense, present one. If five compete, present five

Consider hybrid approaches: Solution A's backend with Solution B's UX pattern. The best answer is often a mix.

Build a comparison table across all solutions covering: effort, dependencies, performance, maintainability, biggest risk, and "best when."

Recommend one (or a hybrid) with clear reasoning tied to the specific context.
</step_formulate_solutions>

<step_assemble_report>
1. Cross-reference findings. Do dimensions contradict each other? (e.g., best UX approach requires a library that's poorly maintained) Flag these tensions explicitly.

2. Write the TL;DR. Synthesize everything into 2-4 sentences that answer: What is this? Does it work? What's the recommended solution?

3. Build the Key Terms glossary. Scan all dimension findings for jargon. If there are 3+ non-obvious terms, include the glossary.

4. Assemble the report using the templates/exploration-report.md structure. Dimensions first, then Solutions section, then Next Steps.

5. Write Next Steps. Based on the recommended solution, what are the concrete steps toward the full production implementation? Be specific and actionable — no fixed count, include as many as are genuinely needed.

   **If the exploration leads to building:** Add a "Build Plans" subsection with a structured table (Plan | Goal | Milestones | Effort | Depends On). This table feeds directly into ladder-build's kickoff — it accepts these plans as milestones without re-decomposing. Include recommended build order. See the exploration-report template for the format.

6. Compile sources. Merge all sources from all dimensions. Remove duplicates. Ensure every source was actually used.
</step_assemble_report>

<step_verify>
Before presenting, check:
- Every factual claim has a source or is explicitly marked as reasoning/unverified
- No fabricated library names, APIs, or tools
- No empty or filler sections
- Key Terms glossary included if jargon is present (omitted if not needed)
- TL;DR actually summarizes the key findings
- At least 2 genuine solutions presented (no straw-men)
- Each solution has: dependencies, pitfalls, hard limits, effort estimate
- Solutions comparison table included
- Next Steps are specific and actionable (not "consider your options")
- All sources list URLs and access dates
- No dimension section just restates what another said
</step_verify>

<step_present_and_save>
1. Present the full exploration report to the user in the conversation.

2. Save to file:
   - Create directory if needed: `[current-working-directory]/artifacts/explorations/`
   - Filename: `YYYY-MM-DD-[topic-slug]-exploration.md`
   - Tell the user where it's saved.

3. Propose the handoff to ladder-build. The exploration is done — building is ladder-build's job. The exploration report is the handoff artifact. Frame it:
   - "Based on this exploration, the recommended next step is to start building with `/ladder-build`. The exploration report at [path] has everything needed for the kickoff."
   - If a key decision is needed first: Present the decision with your recommendation, ask for the call, then reference ladder-build.

   NEVER stop at "here are some options, let me know." Always have a recommended path and momentum toward the real thing.
</step_present_and_save>

</process>

<success_criteria>
- Idea was decomposed into every relevant dimension — no artificial limits
- Each dimension was researched with appropriate tools (not just reasoning)
- All factual claims are sourced or explicitly qualified
- Zero fabricated information
- Solutions match reality — as many as genuinely exist, each with dependencies, pitfalls, limits, and effort estimate
- No straw-man options or padding — every solution is a real contender
- Solutions comparison table included
- Output follows the exploration-report template
- TL;DR would make sense to someone who reads nothing else
- Key Terms glossary included when needed
- Next Steps target a full production solution, not a throwaway prototype
- The recommended next step is proposed with clear intent to proceed
- Report saved to artifacts/explorations/
- No filler, no padding, every section earns its place
</success_criteria>
