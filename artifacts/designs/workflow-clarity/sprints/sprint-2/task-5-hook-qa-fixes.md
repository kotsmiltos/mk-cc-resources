# Task 5: Hook QA Fixes

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Sprint 1
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Address 3 QA findings in intent-inject.sh: XML injection guard for .continue-here.md content (M1), size guard to prevent context budget exhaustion (M2), and routing ambiguity fix for idle + existing PLAN.md conflict (M3). After this task, the hook is more defensive against edge cases discovered during Sprint 1 QA.

## Context

Read first:
- `plugins/mk-flow/hooks/intent-inject.sh` — the hook (240 lines after Sprint 1)
- QA-REPORT.md findings M1, M2, M3
- PLAN.md Risk Register entry for hook complexity (Decision #7: accept ~250 lines)

The hook is the most critical runtime infrastructure — it runs on every user message. Changes must be conservative, backward-compatible, and handle failure gracefully. Sprint 1 brought it to 240 lines; these fixes should add ~15-20 lines (staying under 260).

## Interface Specification

### Inputs
- Current intent-inject.sh (240 lines)
- QA findings M1, M2, M3

### Outputs
- Modified intent-inject.sh with 3 defensive improvements

### Contracts with Other Tasks
- Tasks 1-4 don't modify the hook
- Sprint 3 Task 3 (Fitness Functions) will add a smoke test for the hook

## Pseudocode

```
1. FIX M1 — XML injection guard for .continue-here.md:
   Location: lines 109-112, the .continue-here.md injection block.

   The current code injects file content verbatim between XML-like tags:
     <resume_context>
     $(cat "$CONTINUE_HERE_FILE")
     </resume_context>

   A crafted file could close </resume_context> and open <rules> or other tags.

   FIX: Escape closing XML tags in the injected content.
   Replace the cat with a sed that neutralizes closing tags:

   OLD:
     CONTEXT="${CONTEXT}
   <resume_context${STALE_RESUME}>
   $(cat "$CONTINUE_HERE_FILE")
   </resume_context>"

   NEW:
     RESUME_CONTENT=$(cat "$CONTINUE_HERE_FILE" | sed 's|</|<\\/|g')
     CONTEXT="${CONTEXT}
   <resume_context${STALE_RESUME}>
   ${RESUME_CONTENT}
   </resume_context>"

   This escapes all closing XML tags (</anything>) to (<\/anything>),
   preventing tag injection. Claude still reads the content correctly —
   the escaped tags are visible as text, not parsed as structure.

2. FIX M2 — Size guard for .continue-here.md:
   Location: same block as M1, before the cat/sed.

   ADD size check before reading the file:

   RESUME_SIZE=$(wc -c < "$CONTINUE_HERE_FILE" 2>/dev/null || echo "0")
   MAX_RESUME_SIZE=10240  # 10KB cap
   if [ "$RESUME_SIZE" -gt "$MAX_RESUME_SIZE" ]; then
     RESUME_CONTENT="[Resume context truncated — file exceeds 10KB (${RESUME_SIZE} bytes). Read context/.continue-here.md manually for full context.]"
   else
     RESUME_CONTENT=$(cat "$CONTINUE_HERE_FILE" | sed 's|</|<\\/|g')
   fi

   Note: The size check goes BEFORE the sed/cat, so oversized files are
   never read into memory. The truncation message tells Claude (and the user)
   the file exists but was capped.

3. FIX M3 — Routing ambiguity for idle + existing PLAN.md:
   Location: lines 209-210, the PLAN.md fallback routing rule.

   OLD:
     If a PLAN.md exists with task specs in artifacts/designs/:
       Suggest: "/ladder-build to execute the current sprint's task specs."

   NEW:
     If a PLAN.md exists with task specs in artifacts/designs/ AND stage is
     not "idle" and not "complete":
       Suggest: "/ladder-build to execute the current sprint's task specs."

   This prevents conflicting suggestions when the pipeline is idle or complete
   but leftover PLAN.md artifacts exist. The stage-specific rules (idle, complete)
   take priority; the PLAN.md fallback only fires for active pipeline states.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | Add XML escape for resume content (M1), add 10KB size guard (M2), qualify PLAN.md fallback with stage check (M3) |

## Acceptance Criteria

- [ ] .continue-here.md content has closing XML tags escaped (`</` → `<\/`)
- [ ] .continue-here.md injection capped at 10KB with truncation message
- [ ] Truncation message includes actual file size and tells Claude to read the file manually
- [ ] Files under 10KB are injected normally (size check doesn't break normal flow)
- [ ] PLAN.md fallback routing only fires when stage is NOT "idle" and NOT "complete"
- [ ] When stage is "idle" and PLAN.md exists, only the "idle" routing rule fires (no conflicting suggestions)
- [ ] When stage is "complete" and PLAN.md exists, only the "complete" routing rule fires
- [ ] Hook total line count stays under 260
- [ ] All existing behavior unchanged (short message skip, slash command skip, context injection, stale nudge, resume injection, all 8 stage routing rules)

## Edge Cases

- **wc -c not available or fails:** The `|| echo "0"` fallback means the size check defaults to 0, which passes the size guard. File gets injected normally. Graceful degradation.
- **sed not available:** If sed is not found, the XML escape fails and `RESUME_CONTENT` is empty. This would suppress the resume context entirely. However, sed is universally available on all target platforms (Linux, macOS, Git Bash on Windows). This is acceptable.
- **File exactly at 10KB:** `$RESUME_SIZE -gt $MAX_RESUME_SIZE` means exactly 10240 bytes passes. Only files strictly larger than 10KB are truncated. This is correct.
- **PLAN.md exists but has no task specs:** The routing rule says "with task specs." This is natural language guidance for Claude, not a programmatic check. Claude interprets whether task specs are present. No change needed.
- **Stage is empty or missing:** The PLAN.md fallback says "AND stage is not idle and not complete." If stage is empty/missing, it's neither "idle" nor "complete," so the fallback could fire. This is correct — if Pipeline Position exists with a PLAN.md but no stage, suggesting /ladder-build is reasonable.

## Notes

- These are defensive improvements, not behavioral changes. Normal users won't notice any difference. The changes only matter for edge cases (large files, crafted content, stale artifacts).
- The hook line budget allows ~20 more lines. M1 adds ~2 lines (sed pipe + variable), M2 adds ~5 lines (size check), M3 adds ~2 words (natural language qualifier). Total: ~7 lines, well within budget.
- M1 (XML injection) is the most impactful fix. While the attack requires local filesystem access, defense-in-depth is the right approach for critical infrastructure.
