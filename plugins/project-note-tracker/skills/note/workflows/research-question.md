<process>

## Research a question and log it

This workflow MUST run in the background using the Agent tool so the user can keep working.

### Step 1: Parse input and detect handler

The entire input is the question. The handler is auto-detected.

**Explicit handler override:** If the first word (case-insensitive) matches a known handler directory in `project-notes/`, treat it as an explicit handler and the rest as the question. Example: `/note operations What is the reversal timeout?` → handler=operations, question="What is the reversal timeout?"

**Auto-detection (default):** If the first word does NOT match a known handler:
1. List handler directories in `project-notes/`
2. Read each handler's `research.md` to understand their focus areas
3. Pick the handler whose focus areas best match the question's topic
4. If unclear, pick the closest match and note it in the Internal Review

To list handlers:
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" list-handlers project-notes
```

Normalize the handler name to **lowercase** (e.g., "Operations" → "operations").

### Step 2: Launch background research agent
Use the Agent tool with `run_in_background: true` and pass it these instructions:

---

**Agent instructions:**

1. **Find tracker.py:**
   ```bash
   TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
   ```

2. **Read research instructions:**
   Read `project-notes/<handler>/research.md` to understand WHERE to look and WHAT matters for this handler.

3. **Read project context (if exists):**
   Read `project-notes/config.md` for project-wide context.

4. **Research the question:**
   Based on the research instructions:
   - Use Glob to find relevant files (docs, configs, code, scout indexes)
   - Use Grep to search for keywords from the question
   - Read the most relevant files (limit to 5-8 files max)
   - Synthesize findings with specific source references

5. **Determine status:**
   - If you found strong, clear evidence that answers the question → `"Answered Internally"`
   - If evidence is partial, conflicting, or uncertain → `"Pending"`

6. **Format the Internal Review:**
   Include:
   - Which handler was auto-assigned and why (if auto-detected)
   - Source file paths with line numbers where applicable
   - Key quotes or data points
   - Your synthesized answer or partial findings
   - Any conflicts or gaps in the evidence

7. **Append to tracker:**
   ```bash
   uvx --with openpyxl python3 "$TRACKER_PY" add project-notes "<handler>" "<question>" "<internal_review>" "<status>"
   ```
   IMPORTANT: Quote all arguments properly. The internal review may contain special characters — use a heredoc or temp file if needed.

8. **Report back:** Summarize what you found and what status you assigned.

---

### Step 3: Confirm to user
Tell the user: "Researching in the background (auto-assigned to **<handler>**) — I'll notify you when done."

If the handler was explicitly provided, just say: "Researching in the background — I'll notify you when done."

</process>

<success_criteria>
Research is complete when:
- [ ] Handler was identified (auto-detected or explicit)
- [ ] Research instructions were read
- [ ] Project files were scanned based on those instructions
- [ ] A row was appended to tracker.xlsx
- [ ] Status accurately reflects confidence level
- [ ] Internal Review includes source paths and evidence
</success_criteria>
