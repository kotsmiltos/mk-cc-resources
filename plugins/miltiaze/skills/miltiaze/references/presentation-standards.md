<presentation_standards>

## Output Quality Standards

The output must work for three types of readers:
1. **First-timer:** Seeing this topic for the first time. Needs jargon explained, context provided, the "why" before the "how."
2. **Returner:** Read this months ago, coming back to refresh. Needs the TL;DR and quick navigation to the section they care about.
3. **Expert skimmer:** Knows the domain, wants to see if you found anything they missed. Needs dense, well-organized information they can scan fast.

### Formatting Rules

**Structure hierarchy:**
- TL;DR at the very top (2-4 sentences max)
- Key Terms glossary immediately after (only if the topic has jargon)
- Dimension sections with clear headers
- Comparison tables where 3+ things are compared
- Next Steps at the bottom
- Sources at the very end

**Key Terms glossary:**
When a topic involves terminology that a non-specialist wouldn't know, include a short glossary right after the TL;DR. Format:

```
### Key Terms
- **STT (Speech-to-Text):** Converting spoken audio into written text. Also called "speech recognition" or "ASR."
- **VAD (Voice Activity Detection):** Software that detects when someone is speaking vs silence. Used for automatic cutoff.
```

Rules for the glossary:
- Only include terms that actually appear in the exploration
- Keep definitions to one sentence
- Include common synonyms/aliases in the definition
- Skip terms that are self-explanatory from context

**Within each dimension section:**
- Start with a 1-2 sentence summary of the finding for that dimension
- Bold key takeaways
- Use tables for comparisons (don't describe in prose what a table shows better)
- Use bullet lists for discrete items, paragraphs for narratives
- Include a "Bottom line" callout at the end of complex sections

**Comparison tables:**
Use these whenever comparing 3+ options. Always include:
- A clear header row
- Consistent rating/evaluation format across rows
- A "Best when..." row at the bottom

**Things to NEVER do:**
- Don't pad sections to make them look more thorough
- Don't include a dimension section that just says "not applicable" — omit it
- Don't use vague qualifiers ("somewhat," "relatively," "fairly") without a reference point
- Don't list 10 options when 3-4 cover the meaningful space
- Don't repeat information across sections — reference back instead
- Don't include sources you didn't actually use in the research

**Verification markers:**
When stating a fact, use these markers in the source-heavy parts:
- Verified claims need no marker (they have sources at the bottom)
- Unverified reasoning: prefix with "Based on general understanding:" or "Reasoning from first principles:"
- Uncertain claims: prefix with "Unverified:" and flag for follow-up

**Next Steps section:**
Every exploration must end with 2-5 concrete, actionable next steps aimed at a **full production-quality solution** — not a throwaway prototype. Format:

```
### Next Steps — Toward the Full Solution
1. **[Action verb] [specific thing]** — [why this is the logical next move] *(Starting now)*
2. **[Action verb] [specific thing]** — [why this matters]

**Recommended path:** [What the finished product looks like and how we get there.]
```

Bad: "Consider the options and decide."
Bad: "Try prototyping this to see if it works."
Good: "Build the audio capture module with VAD-based silence detection using Silero VAD — this becomes the input layer for the full voice interface. Starting with a clean, tested module that slots into the final architecture."

The mindset: research leads to building. Don't stop at findings and ask "what now?" — propose the path to the real thing and start moving.

</presentation_standards>
