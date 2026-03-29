# Task 3: Hook Routing Expansion + Continue-Here Injection

> **Sprint:** 1
> **Status:** planned
> **Depends on:** Task 1
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Expand intent-inject.sh to cover all 8 canonical pipeline stages with routing suggestions, and add first-message-only injection of `.continue-here.md` for session resume context. After this task, no pipeline stage is a routing dead zone, and fresh sessions that follow an explicit pause get resume context without manual file I/O.

## Context

Read first:
- `plugins/mk-flow/hooks/intent-inject.sh` — the current hook (209 lines)
- Audit findings MF-3 (3/7 stage coverage), MF-6 (.continue-here.md not injected), CC-3 (`complete` not in canonical list)
- Task 1 output: the canonical stage list with all 8 stages

The hook currently has routing rules for 3 stages: `requirements-complete`, `audit-complete`, and `sprint-N-complete` (lines 172-183). It has no routing for `idle`, `research`, `sprint-N` (mid-sprint without `-complete`), `reassessment`, or `complete`. This means 5 of 8 pipeline states produce no routing suggestion.

The `.continue-here.md` injection reuses the existing stale-nudge flag pattern (lines 120-129): a flag file in `$FLAG_DIR` tracks whether the injection has fired this session.

**Platform constraint:** This hook runs on Windows via Git Bash. File age comparison must use portable methods — `test file1 -nt file2` is POSIX and works everywhere, no GNU stat required.

## Interface Specification

### Inputs
- STATE.md (already injected — the hook reads it to build `$CONTEXT`)
- `context/.continue-here.md` — optional file created by `/state pause`
- Canonical stage list from Task 1

### Outputs
- Modified `intent-inject.sh` with expanded routing rules and .continue-here.md injection

### Contracts with Other Tasks
- Task 1 provides the canonical stage list (8 stages) that routing rules must match
- Task 4 ensures SKILL.md routing sections align with hook routing
- Sprint 3 Task 3 adds a smoke test for the hook

## Pseudocode

```
1. Open plugins/mk-flow/hooks/intent-inject.sh

2. EXPAND pipeline-aware routing section (currently lines 172-183).
   Replace the current routing block with one that covers all 8 canonical stages:

   Pipeline-aware routing — if STATE.md has a Pipeline Position section, use it:
     If stage is "idle":
       Suggest: "No active pipeline. Explore with /miltiaze or assess with /architect audit."
     If stage is "research":
       Suggest: "Miltiaze exploration in progress. Continue with /miltiaze."
     If stage is "requirements-complete" and no PLAN.md exists in artifacts/designs/:
       Suggest: "/architect to plan the implementation from the requirements."
       (existing rule — keep as-is)
     If stage is "audit-complete" and no PLAN.md exists:
       Suggest: "/architect to plan improvements from the audit findings."
       (existing rule — keep as-is)
     If stage matches "sprint-" followed by a number but does NOT end with "-complete":
       Suggest: "Sprint [N] in progress. Continue execution with /ladder-build."
     If stage contains "sprint-" and ends with "-complete":
       Suggest: "/architect for QA review and next sprint planning."
       (existing rule — keep as-is)
     If stage is "reassessment":
       Suggest: "Mid-pipeline reassessment. Run /architect to evaluate."
     If stage is "complete":
       Suggest: "Pipeline cycle complete. Start new work with /miltiaze or /architect audit."
     If a PLAN.md exists with task specs in artifacts/designs/:
       Suggest: "/ladder-build to execute the current sprint's task specs."
       (existing rule — keep as-is)
     If the user says "assess", "audit", or "where do we stand on the code":
       Suggest: "/architect audit to assess the codebase."
       (existing rule — keep as-is)
     If stage is set but matches none of the above:
       Suggest: "Pipeline Position shows stage '[stage]' — no routing rule for this stage. Check STATE.md."
     These are suggestions, not mandates — the user may have a different intent.

3. ADD .continue-here.md injection block.
   Place this AFTER the existing context file reads (after line 92, before the
   "if no context" check) but wrapped in a first-message-only gate.

   CONTINUE_HERE_FILE="context/.continue-here.md"
   if [ -f "$CONTINUE_HERE_FILE" ]; then
     # First-message-only gate — reuse stale-nudge flag pattern
     PROJECT_HASH already computed above (or compute it the same way: md5sum of $PWD)
     RESUME_FLAG_FILE="${FLAG_DIR}/${PROJECT_HASH}-resume"
     if [ ! -f "$RESUME_FLAG_FILE" ]; then
       mkdir -p "$FLAG_DIR" 2>/dev/null
       # Staleness check: is .continue-here.md newer than STATE.md?
       STALE_RESUME=""
       if [ -f "$STATE_FILE" ] && [ "$STATE_FILE" -nt "$CONTINUE_HERE_FILE" ]; then
         STALE_RESUME=" (note: this resume context may be stale — STATE.md was updated more recently)"
       fi
       CONTEXT="${CONTEXT}
   <resume_context${STALE_RESUME}>
   $(cat "$CONTINUE_HERE_FILE")
   </resume_context>"
       echo "$(date +%s)" > "$RESUME_FLAG_FILE" 2>/dev/null
     fi
   fi

   Key details:
   - PROJECT_HASH computation: reuse the same $PROJECT_HASH from the stale-nudge
     section. Move the PROJECT_HASH computation before both uses (before line 120).
   - FLAG_DIR: same as stale-nudge ($TMPDIR:-/tmp}/mk-flow-nudge)
   - Staleness: uses `test -nt` (POSIX, portable — works on Windows Git Bash)
   - If stale: still inject but add staleness note in the XML tag attribute
   - If not first message: skip (flag file exists)

4. REFACTOR PROJECT_HASH computation to avoid duplication:
   Move the PROJECT_HASH, FLAG_DIR, and mkdir logic to a shared section BEFORE
   both the stale-nudge check (line 120) and the new .continue-here.md check.

   # Session flag infrastructure (shared by nudge and resume injection)
   PROJECT_HASH=$(echo "$PWD" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "default")
   FLAG_DIR="${TMPDIR:-/tmp}/mk-flow-nudge"
   mkdir -p "$FLAG_DIR" 2>/dev/null

   Then the stale-nudge section uses $PROJECT_HASH and $FLAG_DIR directly (remove
   the duplicate computation currently at lines 121-123).
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | Expand routing rules (8 stages + fallback), add .continue-here.md injection with staleness check, refactor flag infrastructure |

## Acceptance Criteria

- [ ] Hook has routing rules for all 8 canonical stages: idle, research, requirements-complete, audit-complete, sprint-N, sprint-N-complete, reassessment, complete
- [ ] Each routing rule produces a meaningful, actionable suggestion
- [ ] Unknown/unrecognized stages produce a fallback message ("no routing rule for this stage")
- [ ] Existing routing rules for requirements-complete, audit-complete, sprint-N-complete, PLAN.md existence, and audit keywords are preserved
- [ ] `.continue-here.md` is injected as `<resume_context>` on first session message only
- [ ] Staleness check uses `test -nt` (POSIX portable, no GNU stat)
- [ ] Stale .continue-here.md is still injected but with staleness warning attribute
- [ ] Missing .continue-here.md is silently skipped (no error)
- [ ] PROJECT_HASH computation is shared (not duplicated) between stale-nudge and resume injection
- [ ] Hook total line count stays under 260
- [ ] Existing behavior (skip short messages, skip slash commands, context injection, stale nudge) is unchanged

## Edge Cases

- **No .continue-here.md exists:** Silently skip the injection block. Most sessions won't have one.
- **.continue-here.md exists but is empty:** `cat` of an empty file injects empty `<resume_context>` tags. Harmless — Claude sees an empty section and ignores it.
- **STATE.md doesn't exist but .continue-here.md does:** Skip staleness check (can't compare). Inject without staleness warning.
- **Two Claude Code instances in same project:** Flag file is per-project (PROJECT_HASH). Second instance won't get first-message injection because the flag was already created by the first. Acceptable — the resume context is in conversation history after the first injection.
- **FLAG_DIR ($TMPDIR) not writable:** mkdir -p will fail silently (2>/dev/null). echo to flag file will fail silently. Injection will fire every message instead of first-only. This is a graceful degradation — more context is better than none.
- **md5sum not available (fallback "default"):** All projects share the same flag file prefix. The resume flag file includes `-resume` suffix, stale-nudge includes version. They won't collide. But on systems without md5sum, the first project's flag will prevent injection for other projects. This is a pre-existing limitation from the stale-nudge code.

## Notes

- The routing rules are part of the heredoc that gets injected as natural language instructions to Claude. They are NOT executable code — they are guidance text. Claude interprets them during intent classification. This means the routing "rules" are advisory, not enforced. QA for Sprint 3 should verify Claude follows them by testing with various Pipeline Position values.
- The hook is the most critical infrastructure in the system (runs every message). Changes must be conservative and backward-compatible. Every new code path must handle failure gracefully.
- Plan Decision #7 accepts ~259 lines (209 + ~50 for new code). If the routing expansion pushes beyond 260, condense the existing routing text.
