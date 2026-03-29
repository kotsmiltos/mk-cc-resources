# Task 2: Architect Templates + Workflows

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Sprint 1
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Add standardized metadata blocks, boundary rationale to sprint tracking, and strengthen adversarial assessment sections in architect's plan, task-spec, and audit-report templates. Ensure corresponding workflows generate these sections. After this task, every architect output is self-describing (metadata), every sprint boundary explains WHY it exists (D8/D12), and every assessment has genuine adversarial scrutiny (D10).

## Context

Read first:
- `plugins/architect/skills/architect/templates/plan.md` — plan template
- `plugins/architect/skills/architect/templates/task-spec.md` — task spec template
- `plugins/architect/skills/architect/templates/audit-report.md` — audit report template
- `plugins/architect/skills/architect/workflows/plan.md` — plan workflow
- `plugins/architect/skills/architect/workflows/review.md` — review workflow
- `plugins/architect/skills/architect/workflows/audit.md` — audit workflow
- PLAN.md Decision #1 (metadata format), Decision #5 (adversarial naming), Decision #8 (sprint boundary rationale)

Design decisions that apply:
- D2: Standardized metadata (type, output_path, key_decisions, open_questions)
- D4: Dual verification (AC checklist + verification prose) in completion-like outputs
- D8/D12: Sprint boundaries must explain WHY they exist
- D10: Adversarial assessment in plan and audit outputs

## Interface Specification

### Inputs
- Current architect templates (3 files)
- Current architect workflows (3 relevant files: plan.md, review.md, audit.md)

### Outputs
- Modified templates with metadata, boundary rationale, adversarial sections
- Modified workflows with steps to generate new sections

### Contracts with Other Tasks
- Task 1 (Miltiaze) and Task 3 (Ladder-Build) follow the same metadata pattern
- Task 3 (Ladder-Build) will consume the boundary rationale column in Sprint Tracking
- Sprint 3 Task 1 (Format-Agnostic Extraction) will parse these metadata blocks

## Pseudocode

```
1. MODIFY templates/plan.md:
   a. ADD metadata block at top of template:
      > **type:** plan
      > **output_path:** artifacts/designs/[slug]/PLAN.md
      > **key_decisions:** [from Decisions Log — list decision IDs]
      > **open_questions:** [unresolved items, or "none"]

   b. CHECK Sprint Tracking table columns.
      The table should already have: Sprint, Tasks, Completed, QA Result, Key Changes.
      ADD column: "Boundary Rationale"
      This column captures WHY the sprint breaks where it does:
      "Decision gate: [what must be verified before continuing]"
      "Context limit: [why context health requires a break here]"
      "Scope boundary: [what independently verifiable capability this sprint delivers]"

   c. CHECK "Adversarial Assessment" section exists.
      If it exists: strengthen instruction text.
      ADD instruction: "State 3+ specific ways this plan could fail.
      For each: name the failure mode, which sprint it affects,
      and what the mitigation is. Include at least one scenario where
      the plan's own assumptions are wrong."

      If it doesn't exist: ADD section before the end of the template.

2. MODIFY templates/task-spec.md:
   a. ADD metadata block at top of template:
      > **type:** task-spec
      > **output_path:** artifacts/designs/[slug]/sprints/sprint-N/task-K-[short-name].md
      > **key_decisions:** [decisions this task implements or is constrained by]
      > **open_questions:** [unresolved items, or "none"]

   b. Task specs don't need adversarial sections (they have Edge Cases already).
      No other changes needed.

3. MODIFY templates/audit-report.md:
   a. ADD metadata block at top of template:
      > **type:** audit-report
      > **output_path:** artifacts/audits/YYYY-MM-DD-[slug]-audit-report.md
      > **key_decisions:** [key findings that require decisions]
      > **open_questions:** [unresolved items from the audit]

   b. CHECK for adversarial section. Audit reports should have one.
      ADD/STRENGTHEN section:
      ## Adversarial Assessment
      [State 3+ ways this audit's findings could be wrong, incomplete,
      or misleading. Where might the audit have blind spots? What patterns
      could the audit methodology miss? If the audit gives a clean bill
      of health, what could still be broken?]

4. MODIFY workflows/plan.md:
   a. Find step 4 (design sprints). ADD instruction:
      "For each sprint in the Sprint Tracking table, fill in the Boundary Rationale
      column explaining WHY the sprint breaks where it does. Use one of:
      'Decision gate: [what]', 'Context limit: [why]', 'Scope boundary: [what]'.
      If you can't name the rationale, the boundary is arbitrary — reconsider it."

   b. Find step 7a (save artifacts). ADD instruction:
      "Include metadata block at the top of PLAN.md when saving."

   c. Find step 3 (synthesize). Verify it already generates the Adversarial Assessment.
      If not, ADD instruction to generate it.

5. MODIFY workflows/review.md:
   a. Find step 3d (write QA-REPORT.md). The QA report template in the workflow
      should include a metadata block:
      > **type:** qa-report
      > **output_path:** artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md
      > **key_decisions:** [decisions made during review]
      > **open_questions:** [items needing user input]

6. MODIFY workflows/audit.md:
   a. Find step 4a (write AUDIT-REPORT.md). ADD instruction:
      "Include metadata block at the top of the audit report."
   b. Verify audit agents generate adversarial content. If the audit workflow
      doesn't explicitly instruct agents to self-assess their findings,
      ADD instruction in the synthesis step.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/plan.md` | MODIFY | Add metadata block, add Boundary Rationale column to Sprint Tracking, strengthen Adversarial Assessment |
| `plugins/architect/skills/architect/templates/task-spec.md` | MODIFY | Add metadata block |
| `plugins/architect/skills/architect/templates/audit-report.md` | MODIFY | Add metadata block, add/strengthen Adversarial Assessment section |
| `plugins/architect/skills/architect/workflows/plan.md` | MODIFY | Add boundary rationale instruction, add metadata generation step |
| `plugins/architect/skills/architect/workflows/review.md` | MODIFY | Add metadata to QA report template |
| `plugins/architect/skills/architect/workflows/audit.md` | MODIFY | Add metadata instruction, verify adversarial content generation |

## Acceptance Criteria

- [ ] plan.md template has metadata block (type: plan) in blockquote format
- [ ] plan.md template Sprint Tracking table has "Boundary Rationale" column
- [ ] plan.md template has Adversarial Assessment section with concrete instruction ("State 3+ specific ways...")
- [ ] task-spec.md template has metadata block (type: task-spec) in blockquote format
- [ ] audit-report.md template has metadata block (type: audit-report) in blockquote format
- [ ] audit-report.md template has Adversarial Assessment section with concrete instruction
- [ ] plan.md workflow instructs boundary rationale for every sprint
- [ ] plan.md workflow instructs metadata generation when saving
- [ ] review.md workflow QA report template includes metadata block
- [ ] audit.md workflow instructs metadata and adversarial content generation
- [ ] No "For: [SkillName]" consumer-naming directive in any template (FF-4)
- [ ] Metadata format matches Decision #1: blockquote (`> **field:** value`)

## Edge Cases

- **plan.md template already has an Adversarial Assessment section:** Read it first. Strengthen the instruction, don't duplicate the section.
- **Existing PLAN.md artifacts (like this one) won't have metadata:** Only future outputs follow the new contract. The current PLAN.md for this project doesn't need retroactive metadata.
- **Sprint Tracking table width may become wide:** The Boundary Rationale column adds text. Keep rationale concise (one sentence per sprint). This is already the convention from this project's PLAN.md.

## Notes

- The Boundary Rationale column is the key structural implementation of D8/D12. It forces the architect to explain every sprint break. This transforms the Sprint Tracking table from a progress tracker into a decision record.
- The adversarial section instruction must prompt for genuine failure analysis, not boilerplate hedging. Read the PLAN.md's own Adversarial Assessment section as an example of the target quality.
