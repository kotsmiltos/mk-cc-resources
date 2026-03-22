# Task 1: Pipeline Stage Canonicalization

> **Sprint:** 4
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Extract pipeline stage names into a single canonical reference and add a cross-reference rule so future changes to stage names are coordinated. Currently stage names are a distributed constant across 7+ files with no enforcement — adding or renaming a stage requires finding and updating every reference. Also remove the dead `design-complete` stage that is checked but never set. Addresses FP-1 and FP-4.

## Context

Read these files to see current stage name usage:
- `plugins/mk-flow/hooks/intent-inject.sh` — routing conditions (lines ~161-167)
- `plugins/mk-flow/skills/state/templates/state.md` — Pipeline Position template with stage enum
- `plugins/architect/skills/architect/SKILL.md` — routing on stage values
- `plugins/ladder-build/skills/ladder-build/SKILL.md` — routing on stage values
- `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` — sets `requirements-complete`
- `plugins/architect/skills/architect/workflows/plan.md` — sets `sprint-1`
- `plugins/architect/skills/architect/workflows/review.md` — sets next sprint stage
- `plugins/ladder-build/skills/ladder-build/workflows/execute.md` — sets `sprint-N-complete`
- `context/cross-references.yaml` — the existing `pipeline-routing` rule

## Pseudocode

```
FIX 1 — Create canonical stage reference:
  In plugins/mk-flow/skills/state/templates/state.md, ensure the Pipeline Position
  section has a clear, complete stage enum as a comment block:

  ## Pipeline Position
  # Canonical pipeline stages (update ALL consumers when changing):
  #   requirements-complete  — miltiaze finished, architect next
  #   audit-complete         — architect audit done, plan next
  #   sprint-N               — architect planned sprint N, ladder-build executes
  #   sprint-N-complete      — ladder-build finished sprint N, architect reviews
  # Consumers: intent-inject.sh, architect/SKILL.md, ladder-build/SKILL.md,
  #            miltiaze/workflows/requirements.md, architect/workflows/*.md,
  #            ladder-build/workflows/execute.md
  stage: [current stage]

FIX 2 — Remove dead design-complete stage:
  In plugins/mk-flow/hooks/intent-inject.sh:
  Find the routing condition that checks for "design-complete" (line ~167)
  Remove it — this stage is never set by any workflow.
  The fallback condition ("or a PLAN.md exists with task specs") handles the same case.

  In plugins/mk-flow/skills/state/templates/state.md:
  If "design-complete" appears in the stage enum, remove it.

FIX 3 — Add cross-reference rule for stage names:
  In context/cross-references.yaml, update the existing pipeline-routing rule
  or add a new stage-names rule:

  stage-names:
    when: "Adding, removing, or renaming a pipeline stage name"
    check:
      - "plugins/mk-flow/hooks/intent-inject.sh — routing conditions"
      - "plugins/mk-flow/skills/state/templates/state.md — canonical stage enum"
      - "plugins/architect/skills/architect/SKILL.md — routing guidance"
      - "plugins/ladder-build/skills/ladder-build/SKILL.md — routing guidance"
      - "plugins/miltiaze/skills/miltiaze/workflows/requirements.md — sets stage"
      - "plugins/architect/skills/architect/workflows/plan.md — sets stage"
      - "plugins/architect/skills/architect/workflows/review.md — sets stage"
      - "plugins/ladder-build/skills/ladder-build/workflows/execute.md — sets stage"
    why: "Stage names are a distributed constant — all consumers must agree on the exact strings"

FIX 4 — Fix basename stderr noise in drift-check.sh:
  In plugins/mk-flow/skills/state/scripts/drift-check.sh:
  Find the line: basename=$(basename "$expanded_path")
  Change to: basename=$(basename -- "$expanded_path")
  This prevents the "unknown option" error when paths start with hyphens.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/templates/state.md` | MODIFY | Add canonical stage enum comment block |
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | Remove dead `design-complete` check |
| `context/cross-references.yaml` | MODIFY | Add/update stage-names cross-reference rule |
| `plugins/mk-flow/skills/state/scripts/drift-check.sh` | MODIFY | Fix basename -- path handling |

## Acceptance Criteria

- [ ] `state.md` template has a comment block listing all canonical stages with their consumers
- [ ] `design-complete` does not appear in `intent-inject.sh` routing logic
- [ ] `cross-references.yaml` has a stage-names rule listing all 8 consumer files
- [ ] `basename --` fix applied in drift-check.sh
- [ ] All existing stage references in other files still work (no regression)

## Edge Cases

- The `design-complete` removal must not break the routing fallback. Verify the adjacent condition ("or a PLAN.md exists with task specs") still covers the same case.
- The cross-reference rule check list should use the plugin paths (not skills/ mirrors) since mk-flow is hook-bearing.
