# Task 7: Fix Stale References and Add Defensive Patterns (Sprint 1 QA)

> **Sprint:** 2
> **Status:** planned
> **Depends on:** None (independent of Tasks 5, 6)
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Fix 5 issues discovered during Sprint 1 QA review. Two files still reference BUILD-PLAN.md status fields that no longer exist. Two workflows lack STATE.md-missing fallbacks. One workflow doesn't specify where to find current milestone identity. One defaults file needs a version bump. All fixes are small and independent.

## Context

Read these files before starting:
- `artifacts/designs/state-consolidation/sprints/sprint-1/QA-REPORT.md` — findings H1, H2, H3, M2, L1
- The 5 files to fix (listed in Files Touched below)

Sprint 1 established STATE.md as the single source of truth, but QA found 5 files that weren't in Sprint 1's scope yet still reference the old status architecture.

## Interface Specification

### Inputs
- 5 files with stale references or missing defensive patterns

### Outputs
- 5 updated files, each with a small targeted fix

### Contracts with Other Tasks
- Independent of Tasks 5 and 6 (different files, no shared state)
- Can run in parallel with Tasks 5+6

## Pseudocode

```
# --- Fix 1 (H1): intake/parsing-rules.md stale reference ---
FILE: plugins/mk-flow/skills/intake/references/parsing-rules.md
LINE 51: "Read BUILD-PLAN.md (if exists) for milestone names and statuses"
CHANGE TO: "Read BUILD-PLAN.md (if exists) for milestone names and structure. Read STATE.md for current status"

# --- Fix 2 (H2): mk-flow-init SKILL.md verification protocol ---
FILE: plugins/mk-flow/skills/mk-flow-init/SKILL.md
LINE 218: Current Focus evidence:
    OLD: "Explicit status field in a BUILD-PLAN.md or ROADMAP.md showing 'current' or 'in progress'"
    NEW: "Explicit Pipeline Position in STATE.md, OR current milestone/sprint referenced in BUILD-PLAN.md or ROADMAP.md structure"
LINE 219: Done (Recent) evidence:
    OLD: "Milestone report file exists, OR plan status explicitly says 'completed' with a date, OR git commit directly relates to the current focus"
    NEW: "Milestone report file exists (artifacts/builds/*/milestones/), OR COMPLETION.md exists in sprint directory, OR git commit directly relates to the current focus"
LINE 221: Next Up evidence:
    OLD: "Plan file explicitly lists upcoming work with 'pending' or equivalent status"
    NEW: "Plan file explicitly lists upcoming work (next sprint in PLAN.md Sprint Tracking, or next milestone in BUILD-PLAN.md milestone order)"

# --- Fix 3 (H3): STATE.md-missing fallback in execute.md and review.md ---
FILE: plugins/ladder-build/skills/ladder-build/workflows/execute.md
AFTER the line that reads STATE.md (around line 19):
    ADD: "If STATE.md doesn't exist: Tell the user — 'No STATE.md found. Run `/mk-flow-init` to set up state tracking, then `/architect` to plan.' Do not proceed without knowing which sprint to execute."

FILE: plugins/architect/skills/architect/workflows/review.md
AFTER the line that reads STATE.md (around line 14):
    ADD: "If STATE.md doesn't exist: Tell the user — 'No STATE.md found. Run `/mk-flow-init` to set up state tracking.' Fall back to reading PLAN.md Sprint Tracking to identify the most recent sprint with task specs but no QA-REPORT.md."

# --- Fix 4 (M2): build-milestone.md step 1 milestone identity ---
FILE: plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md
IN step_1 (around line where it says "Identify the current milestone"):
    ADD before the existing line: "Read STATE.md Current Focus to identify the current milestone number. Then read BUILD-PLAN.md for that milestone's goal, 'done when' criteria, and dependencies."
    KEEP the existing "Identify the current milestone: Its goal and 'done when' criteria" line — just ensure the WHERE is clear.

# --- Fix 5 (L1): defaults/rules.yaml version bump ---
FILE: plugins/mk-flow/defaults/rules.yaml
LINE 9: defaults_version: "0.5.0"
CHANGE TO: defaults_version: "0.6.0"
# This matches the project's context/rules.yaml version and triggers stale-defaults nudge for other projects.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/intake/references/parsing-rules.md` | MODIFY | Line 51: "statuses" → "structure. Read STATE.md for current status" |
| `plugins/mk-flow/skills/mk-flow-init/SKILL.md` | MODIFY | Lines 218-221: Update verification protocol evidence sources from plan status fields to filesystem evidence |
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | Add STATE.md-missing fallback after step 1 STATE.md read |
| `plugins/architect/skills/architect/workflows/review.md` | MODIFY | Add STATE.md-missing fallback after step 1 STATE.md read |
| `plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md` | MODIFY | Step 1: Add "Read STATE.md Current Focus" before milestone identification |
| `plugins/mk-flow/defaults/rules.yaml` | MODIFY | Bump defaults_version from "0.5.0" to "0.6.0" |

## Acceptance Criteria

- [ ] intake/parsing-rules.md line 51 no longer references "statuses" — references "structure" and STATE.md
- [ ] mk-flow-init SKILL.md verification protocol does not reference "status field in a BUILD-PLAN.md" — references filesystem evidence (milestone reports, COMPLETION.md)
- [ ] execute.md has explicit handling for missing STATE.md (tells user to run `/mk-flow-init`)
- [ ] review.md has explicit handling for missing STATE.md (fallback to PLAN.md sprint analysis)
- [ ] build-milestone.md step 1 says to read STATE.md Current Focus for current milestone identity
- [ ] defaults/rules.yaml `defaults_version` is "0.6.0"
- [ ] `grep -r 'BUILD-PLAN.md.*status' plugins/mk-flow/skills/intake/ plugins/mk-flow/skills/mk-flow-init/` returns no matches (excluding prohibition language)

## Edge Cases

- mk-flow-init SKILL.md verification protocol table has 5 rows (Current Focus, Done, Blocked, Next Up, Decisions). Only update the 3 rows with evidence sources that reference plan status fields. Leave Blocked and Decisions rows unchanged.
- execute.md already has fallback for "no task specs found" but not for "no STATE.md." The new fallback should be BEFORE the task-spec lookup, since we need to know which sprint to look in.
- review.md's fallback (read PLAN.md to find sprint without QA-REPORT.md) is best-effort — it may find the wrong sprint if multiple sprints have no QA report. This is acceptable as a fallback; the primary path through STATE.md is authoritative.

## Notes

- These are all small, targeted fixes identified during Sprint 1 QA. They don't change any interfaces or architectural decisions — they bring 5 files into alignment with the state-consolidation architecture established in Sprint 1.
- Fix 5 (version bump) will cause a stale-defaults nudge for other projects using mk-flow. This is intentional — the rule text changed in Sprint 1, and other projects should pick up the new wording via `/mk-flow-update`.
