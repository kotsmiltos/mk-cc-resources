# Task 4: mk-flow Templates + Migration

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Sprint 1
> **Estimated size:** S
> **Plan:** ../../PLAN.md

## Goal

Add standardized metadata blocks to mk-flow's continue-here and state templates. Add "Next Up" to "Planned Work" migration logic to the mk-flow-update skill so existing projects get the rename automatically. After this task, mk-flow outputs have metadata and existing projects can be upgraded cleanly.

## Context

Read first:
- `plugins/mk-flow/skills/state/templates/continue-here.md` — continue-here template (Sprint 1 already updated structure)
- `plugins/mk-flow/skills/state/templates/state.md` — STATE.md template (Sprint 1 already overhauled)
- `plugins/mk-flow/skills/mk-flow-update/SKILL.md` — update skill
- QA-REPORT.md finding M4 ("Next Up" → "Planned Work" migration)
- PLAN.md Decision #1 (metadata format: blockquote)

Design decisions that apply:
- D2: Standardized metadata
- QA M4: Backward compatibility migration for section rename

## Interface Specification

### Inputs
- Current mk-flow templates (2 files, already modified in Sprint 1)
- mk-flow-update SKILL.md

### Outputs
- Modified templates with metadata blocks
- Modified mk-flow-update with migration step

### Contracts with Other Tasks
- Tasks 1, 2, 3 follow the same metadata pattern
- Sprint 3 Task 1 (Format-Agnostic Extraction) will parse these metadata blocks
- The migration step ensures other projects using mk-flow get the rename

## Pseudocode

```
1. MODIFY templates/continue-here.md:
   a. ADD metadata block at top (before the existing header):
      > **type:** continue-here
      > **output_path:** context/.continue-here.md
      > **key_decisions:** [decisions made this session]
      > **open_questions:** [blockers or unresolved items]

   b. No adversarial section needed (handoff document, not assessment).

2. MODIFY templates/state.md:
   a. ADD metadata block at very top (before the `# Project State` header):
      > **type:** state
      > **output_path:** context/STATE.md
      > **key_decisions:** see Decisions Made section below
      > **open_questions:** see Blocked / Open Questions section below

   b. Note: The state template is special — its key_decisions and open_questions
      point to existing sections rather than inline values. This avoids
      duplication while maintaining the metadata contract.

   c. No adversarial section needed (living state document, not assessment).

3. MODIFY mk-flow-update/SKILL.md:
   a. Read the current skill to understand the update process.
   b. Find the section that handles file-by-file syncing or migration.
   c. ADD migration step for "Next Up" → "Planned Work":
      "After syncing defaults, check if `context/STATE.md` contains a
      `## Next Up` section. If found:
      1. Rename the section header to `## Planned Work`
      2. Report: 'Migrated: ## Next Up → ## Planned Work in STATE.md'
      This handles projects initialized before the state template overhaul
      (workflow-clarity Sprint 1, 2026-03-29)."

   d. The migration should be safe:
      - Only rename if exact match `## Next Up` exists
      - Don't rename if `## Planned Work` already exists (idempotent)
      - Report what was changed
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/templates/continue-here.md` | MODIFY | Add metadata block |
| `plugins/mk-flow/skills/state/templates/state.md` | MODIFY | Add metadata block (points to existing sections for key_decisions and open_questions) |
| `plugins/mk-flow/skills/mk-flow-update/SKILL.md` | MODIFY | Add "Next Up" → "Planned Work" migration step |

## Acceptance Criteria

- [ ] continue-here.md template has metadata block (type: continue-here) in blockquote format
- [ ] state.md template has metadata block (type: state) in blockquote format
- [ ] state.md metadata key_decisions references "Decisions Made section below"
- [ ] state.md metadata open_questions references "Blocked / Open Questions section below"
- [ ] mk-flow-update SKILL.md includes migration step for "Next Up" → "Planned Work"
- [ ] Migration is idempotent — doesn't break if run twice or if "Planned Work" already exists
- [ ] Migration reports what it changed
- [ ] Metadata format matches Decision #1: blockquote (`> **field:** value`)
- [ ] No "For: [SkillName]" consumer-naming directive in any template (FF-4)

## Edge Cases

- **state.md template already has extensive Sprint 1 changes:** Read it carefully before modifying. The metadata block goes ABOVE the `# Project State` header. Don't displace the canonical stage spec or enrichment fields.
- **mk-flow-update might not have a file-by-file migration section:** Read the current SKILL.md. If the update process is high-level, add the migration step as a new step in the process, not buried inside an existing step.
- **Projects with both "Next Up" and "Planned Work" sections:** The migration should only rename "Next Up" if "Planned Work" doesn't already exist. If both exist (unlikely but possible from a partial manual migration), report the conflict and skip.

## Notes

- This is the smallest Sprint 2 task. The metadata additions are straightforward, and the migration logic is simple (find and rename a section header).
- The state.md metadata block is unique in that it references other sections rather than duplicating content. This is the right pattern — STATE.md already has structured sections for decisions and blockers.
