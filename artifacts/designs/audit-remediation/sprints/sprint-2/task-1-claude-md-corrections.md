# Task 1: CLAUDE.md Corrections

> **Sprint:** 2
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** `../../PLAN.md`

## Goal

Fix 6 documented inaccuracies in CLAUDE.md that create a gap between what the documentation says and what the code actually does. These corrections address AC-2, AC-5, AC-6, PC-1, PC-2, and PC-8 from the audit.

## Context

Read `CLAUDE.md` alongside these source files to confirm the correct values:
- `plugins/mk-flow/hooks/intent-inject.sh` — for hook threshold (line 27) and mk-flow-update skill
- `plugins/alert-sounds/hooks/hooks.json` — for hook event type
- `plugins/mk-flow/skills/state/scripts/drift-check.sh` — for state/scripts directory existence
- `plugins/mk-flow/skills/mk-flow-update/SKILL.md` — for the replacement skill

## Pseudocode

```
FIX 1 — Hook threshold (AC-5, PC-2, GA-1):
  In CLAUDE.md mk-flow Context Injection section, find "skips short messages (<10 chars)"
  Change to "skips short messages (<2 chars)" to match intent-inject.sh line 27

FIX 2 — mk-flow-update-rules → mk-flow-update (AC-2, PC-1):
  In CLAUDE.md architecture tree under mk-flow/skills/:
  - Change "mk-flow-update-rules/" entry to "mk-flow-update/"
  - Update its description to: "Sync latest plugin defaults (rules, intents, cross-references) into project"
  - Add "mk-flow-update-rules/ # Deprecated redirect to mk-flow-update" below it

FIX 3 — Alert-sounds hook event (AC-6):
  In CLAUDE.md alert-sounds hook description, find "Stop, Permission, UserPromptSubmit (clear state) hooks"
  Change to "Stop, Notification (permission_prompt + idle_prompt matchers), UserPromptSubmit (clear state) hooks"

FIX 4 — State scripts directory (PC-8):
  In CLAUDE.md architecture tree under mk-flow/skills/state/:
  After "templates/" add: "scripts/           # drift-check.sh"

FIX 5 — Add mk-flow-update documentation:
  Ensure the mk-flow skills list in the architecture tree includes mk-flow-update/

FIX 6 — Update the skills/ comment:
  In the "# mk-flow skills NOT here" comment, ensure mk-flow-update is in the list
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `CLAUDE.md` | MODIFY | 6 corrections: threshold, skill name, hook event, scripts dir, update docs |

## Acceptance Criteria

- [ ] CLAUDE.md hook threshold says `<2 chars` (not `<10`)
- [ ] CLAUDE.md lists `mk-flow-update/` as active skill, `mk-flow-update-rules/` as deprecated
- [ ] CLAUDE.md alert-sounds hook description says `Notification` not `Permission`
- [ ] CLAUDE.md mk-flow architecture tree includes `scripts/` under `state/`
- [ ] `grep -c "<10 chars" CLAUDE.md` returns 0
- [ ] `grep -c "mk-flow-update-rules/" CLAUDE.md` returns only the deprecated annotation line

## Edge Cases

- Ensure the threshold change is only in the mk-flow Context Injection section, not elsewhere.
- The `mk-flow-update-rules/` entry should remain as a deprecated redirect note (it still exists in the plugin) — do not delete it entirely.
