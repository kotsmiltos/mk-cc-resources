<required_reading>
Read these reference files before proceeding:
1. references/research-dimensions.md
2. references/presentation-standards.md
</required_reading>

<process>

<step_identify>
The user wants to go deeper on a specific aspect from a previous exploration. Determine:
- **Which dimension?** (from the original exploration, or a new angle)
- **What specifically?** (a tool, an approach, a comparison, a concern)
- **Previous context?** Check for existing exploration files in `artifacts/explorations/` that relate to this topic. Read them if they exist.

If the user's request is clear (e.g., "drill deeper into the WebSocket approach from the voice interface exploration"), proceed directly.

If unclear, ask using AskUserQuestion:

Question: "What aspect do you want to investigate further?"

Options:
1. **A specific tool or library** — Deep dive into one technology
2. **Compare specific options** — Side-by-side comparison of 2-3 approaches
3. **Feasibility of a specific approach** — Can we actually do X?
4. **Implementation details** — How would we build the [specific part]?
</step_identify>

<step_research>
This is narrower than full exploration. Research one thing thoroughly:

- Use Context7 for library/framework documentation
- Use WebSearch for recent discussions, benchmarks, known issues
- Look for code examples, tutorials, migration guides
- Find community opinions (GitHub issues, Stack Overflow, blog posts)

Verification is paramount here. Since the user is making a deeper commitment, every claim needs a source. If a library claims to support X, find the actual documentation page or release notes — don't infer from the name.
</step_research>

<step_present>
Format as an addendum to the original exploration:

```markdown
# Drill-Down: [Specific Aspect]

> **Context:** Follow-up to [original exploration title/date]

> **TL;DR:** [2-3 sentences on what was found]

## Findings

[Detailed findings. Use the same formatting standards as the full exploration — tables for comparisons, bold for key points, "Bottom line" callouts.]

## Impact on Original Exploration

[How does this new information change or refine the original findings? Does it change the recommendation?]

## Updated Next Steps

1. **[Action]** — [Why]
2. **[Action]** — [Why]

## Sources

- [Source] — [URL] — accessed [YYYY-MM-DD]
```
</step_present>

<step_save>
- Save to the same `artifacts/explorations/` directory
- Filename: `YYYY-MM-DD-[topic-slug]-drill-[aspect-slug].md`
- Tell the user where it's saved and how it relates to the original exploration
</step_save>

</process>

<success_criteria>
- The specific aspect was researched thoroughly (not just more of the same)
- All claims are sourced
- Findings are connected back to the original exploration
- Updated next steps reflect the deeper understanding
- Saved to artifacts/explorations/
</success_criteria>
