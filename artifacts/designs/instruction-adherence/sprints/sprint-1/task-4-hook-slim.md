> **type:** task-spec
> **output_path:** artifacts/designs/instruction-adherence/sprints/sprint-1/task-4-hook-slim.md
> **sprint:** 1
> **status:** complete
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../PLAN.md
> **key_decisions:** D2
> **open_questions:** none

# Task 4: Shorten hook injection directive text

## Goal
The hook currently injects 80+ lines of directive text (routing instructions, skill suggestions, pipeline routing, intent classification). Lines 30+ get skimmed. Reduce the directive portion to under 40 lines while keeping all context files (STATE.md, intents, rules, etc.) at full size.

## Context
The hook has two parts: (1) directive text that tells Claude how to behave, and (2) context files that provide project state. The context files are fine — Claude reads STATE.md, intents, rules as data. The problem is the directive text that wraps them — it's too long and Claude skims the tail end.

Read the current hook at `plugins/mk-flow/hooks/intent-inject.sh`.

The directive text is in the heredoc starting at the `cat <<INSTRUCTION` blocks. The context files are in the `$CONTEXT` variable.

## What to keep (essential directives)
1. Status line: `[mk-flow] Context loaded (N files): ...`
2. Next-action directive (every response ends with **Next:** command)
3. First-message session context block
4. Intent classification instruction (1 line: "classify using intents_config")
5. Rules instruction (1 line: "follow rules unconditionally")
6. Cross-reference instruction (1 line: "check cross_references on action intent")

## What to shorten or remove
1. Skill routing suggestions (lines 254-289) — 35 lines of "if multi-issue input, suggest intake; if exploration, suggest miltiaze..." This is redundant with skill quick_starts. Replace with 3-line summary.
2. Pipeline-aware routing (lines 291-322) — 30 lines of stage-based suggestions. Replace with: "Check Pipeline Position in STATE.md for next action. Use it for the **Next:** line."
3. Status query instructions (lines 325-330) — 6 lines. Keep but condense to 2.
4. Intent management instructions (lines 332-337) — 6 lines about adding/modifying intents. Keep as-is (already short).

## Pseudocode

```
REWRITE the INSTRUCTION heredoc sections:

CURRENT (80+ lines of directive):
  [status line]
  [next-action block - 13 lines]
  [first-message block - conditional]
  [classify intent - 5 lines]
  [skill routing - 35 lines of if/then suggestions]
  [pipeline routing - 30 lines of stage-based routing]
  [status query - 6 lines]
  [intent management - 6 lines]
  [stale nudge - conditional]

NEW (under 40 lines of directive):
  [status line - 1 line]
  [next-action block - 8 lines, condensed]
  [first-message block - conditional, 5 lines]
  [core directives - 10 lines]:
    - Classify intent using intents_config. Don't mention classification.
    - Follow rules unconditionally.
    - On action intent, check cross_references.
    - On bug_report, investigate before fixing (read code, find root cause, propose fix).
    - On status_query, run drift-check first.
    - On multi-issue input (3+ items), decompose with assumption table before acting.
    - Check Pipeline Position in STATE.md for the **Next:** command.
    - On vocabulary ambiguity, use vocabulary section to disambiguate.
  [intent management - 4 lines]
  [stale nudge - conditional]
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | Rewrite INSTRUCTION heredoc — condense 80+ lines to under 40 |
| `plugins/mk-flow/defaults/rules.yaml` | MODIFY | Bump defaults_version to 0.8.0 |
| `plugins/mk-flow/.claude-plugin/plugin.json` | MODIFY | Bump plugin version |
| `.claude-plugin/plugin.json` | MODIFY | Bump mk-cc-all version |

## Acceptance Criteria

- [ ] Total directive text (excluding context file contents) is under 40 lines
- [ ] Status line still present: `[mk-flow] Context loaded...`
- [ ] Next-action directive still present on every response
- [ ] First-message session context still fires on first message only
- [ ] Intent classification still works (classify, don't mention)
- [ ] Rules still referenced as unconditional
- [ ] Cross-reference check still triggered on action intent
- [ ] Bug investigation protocol still referenced (but condensed)
- [ ] Status query still references drift-check
- [ ] Pipeline routing condensed to "check STATE.md" instead of 30 lines of stage mapping
- [ ] Hook test passes: `echo '{"prompt":"test"}' | CLAUDE_PLUGIN_ROOT="plugins/mk-flow" bash plugins/mk-flow/hooks/intent-inject.sh 2>&1 | wc -l` outputs less than previous

## Edge Cases

- If skill routing suggestions are removed and Claude stops suggesting skills: the skill quick_starts now handle their own routing (Tasks 0, 1). The hook doesn't need to duplicate that logic.
- If pipeline routing is too condensed and Claude can't figure out the **Next:** command: the hook still injects STATE.md content. Claude reads Pipeline Position directly and uses it. The 30 lines of "if stage is X, suggest Y" were doing what STATE.md already tells Claude.
