<process>

Research runs in the background. The agent gathers context only (Read, Glob, Grep) — it does NOT try to answer the question. It documents what the codebase currently says about the topic. The main conversation writes to Excel after the agent completes — this avoids Bash access issues in background agents.

<step_1_parse_and_detect>
The entire input is the question. The handler is auto-detected.

Explicit handler override: If the first word (case-insensitive) matches a known handler directory in `project-notes/`, treat it as an explicit handler and the rest as the question. Example: `/note operations What is the reversal timeout?` → handler=operations, question="What is the reversal timeout?"

Auto-detection (default): If the first word does NOT match a known handler:
1. List handler directories in `project-notes/` (just read the directory — no Bash needed)
2. Read each handler's `research.md` to understand their focus areas
3. Pick the handler whose focus areas best match the question's topic
4. If unclear, pick the closest match and note it in the Internal Review

Normalize the handler name to lowercase (e.g., "Operations" → "operations").
</step_1_parse_and_detect>

<step_2_launch_agent>
Use the Agent tool with `run_in_background: true` and pass it these instructions:

---

Agent instructions:

You are gathering context for a question in the project-note-tracker. Do NOT write to Excel or run Bash commands. Do NOT try to answer the question — your job is to document what the codebase currently says about this topic.

Handler: {{handler}}
Question: {{question}}

1. Read research instructions:
   Read `project-notes/{{handler}}/research.md` to understand WHERE to look and WHAT matters for this handler.

2. Read project context (if exists):
   Read `project-notes/config.md` for project-wide context, including output language preferences.

3. Gather context about the topic:
   Based on the research instructions:
   - Use Glob to find relevant files (docs, configs, code, scout indexes)
   - Use Grep to search for keywords from the question
   - Read the most relevant files (limit to 5-8 files max)
   - Document what currently exists: implementations, configurations, code paths, behaviors

4. Determine status:
   - `"Answered Internally"` = the codebase has clear, relevant context about this topic (existing code, docs, configs that relate directly to the question)
   - `"Pending"` = little or no relevant context found in project files

5. Format the Internal Review:
   Frame as "here's what exists in the codebase", NOT as an answer to the question. The question remains open for the handler.
   - Document current implementations with file paths and line numbers
   - Include relevant code snippets or quotes from docs
   - Note what IS implemented vs what IS NOT
   - Flag any gaps, conflicts, or missing pieces
   - If auto-detected, note which handler was assigned and why

6. Return your findings in this exact format:

```
HANDLER: {{handler}}
QUESTION: {{question}}
STATUS: <Answered Internally or Pending>
INTERNAL_REVIEW:
<your context documentation here>
```

That's it — do NOT run Bash, do NOT write to Excel, do NOT write files. Just gather context and return findings.

---
</step_2_launch_agent>

<step_3_confirm>
Tell the user: "Researching in the background (auto-assigned to {{handler}}) — I'll notify you when done."

If the handler was explicitly provided, just say: "Researching in the background — I'll notify you when done."
</step_3_confirm>

<step_4_write_to_excel>
When the background agent returns, parse its findings and write to Excel:

```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" add project-notes "{{handler}}" "{{question}}" "{{internal_review}}" "{{status}}"
```

IMPORTANT: Quote all arguments properly. The internal review may contain special characters — use a heredoc or temp file if needed.

Then briefly tell the user: logged to tracker.xlsx as {{status}} under {{handler}}.
</step_4_write_to_excel>

</process>

<success_criteria>
Research is complete when:
- [ ] Handler was identified (auto-detected or explicit)
- [ ] Research instructions were read
- [ ] Project files were scanned based on those instructions
- [ ] Agent returned structured findings (no Bash used by agent)
- [ ] Main conversation wrote the row to tracker.xlsx
- [ ] Status reflects whether relevant context was found (not whether the question is "answered")
- [ ] Internal Review documents existing state, not an answer
</success_criteria>
