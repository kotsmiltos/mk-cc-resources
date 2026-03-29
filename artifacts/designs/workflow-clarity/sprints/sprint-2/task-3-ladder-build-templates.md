# Task 3: Ladder-Build Templates + Workflows

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Sprint 1
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Add standardized metadata blocks and dual verification (AC checklist + prose) to ladder-build's build-plan and milestone-report templates. Add adversarial self-assessment to completion outputs. Fix execute.md Current Focus to use state-descriptive language (QA M5). Add "state description, not action" instruction to build-milestone.md (QA L2). After this task, every ladder-build output has metadata, every milestone report has structured + prose verification, and the executor writes state-descriptive status.

## Context

Read first:
- `plugins/ladder-build/skills/ladder-build/templates/build-plan.md` — build plan template
- `plugins/ladder-build/skills/ladder-build/templates/milestone-report.md` — milestone report template
- `plugins/ladder-build/skills/ladder-build/workflows/kickoff.md` — kickoff workflow
- `plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md` — build workflow
- `plugins/ladder-build/skills/ladder-build/workflows/execute.md` — pipeline executor
- `plugins/ladder-build/skills/ladder-build/workflows/continue.md` — continue workflow
- QA-REPORT.md findings M5 (execute.md Current Focus) and L2 (build-milestone.md instruction)
- PLAN.md Decision #1 (metadata format), Decision #4 (dual verification), Decision #5 (adversarial naming: "What Could Be Wrong" for milestones)

Design decisions that apply:
- D2: Standardized metadata (type, output_path, key_decisions, open_questions)
- D4: Dual verification — AC checklist + verification prose in milestone reports
- D5: Adversarial section named "What Could Be Wrong" for milestone context
- D10: Adversarial self-assessment in completion outputs

## Interface Specification

### Inputs
- Current ladder-build templates (2 files)
- Current ladder-build workflows (4 files)

### Outputs
- Modified templates with metadata, dual verification, adversarial sections
- Modified workflows with generation steps and QA fix integration

### Contracts with Other Tasks
- Tasks 1, 2, 4 follow the same metadata pattern
- execute.md's Pipeline Position was already fixed by Sprint 1 QA autonomous fix (4 enrichment fields added)
- Sprint 3 Task 1 (Format-Agnostic Extraction) will parse these metadata blocks

## Pseudocode

```
1. MODIFY templates/build-plan.md:
   a. ADD metadata block at top:
      > **type:** build-plan
      > **output_path:** artifacts/builds/[project-name]/BUILD-PLAN.md
      > **key_decisions:** [from Decisions Log]
      > **open_questions:** [unresolved items, or "none"]

   b. No adversarial section needed for build plans (they evolve as milestones complete).

2. MODIFY templates/milestone-report.md:
   a. ADD metadata block at top:
      > **type:** milestone-report
      > **output_path:** artifacts/builds/[project-name]/milestones/milestone-N-[name].md
      > **key_decisions:** [decisions made during this milestone]
      > **open_questions:** [unresolved items, or "none"]

   b. ADD/MODIFY verification section for dual verification (D4):
      The milestone report should have BOTH:

      ## Acceptance Criteria
      - [x] [Criterion from the milestone's acceptance criteria — checked or unchecked]
      - [x] [Each criterion listed explicitly as a checkbox]

      ## Verification Notes
      [Prose describing HOW each criterion was verified. Not just "checked" —
      describe what was tested, what was observed, what edge cases were tried.
      If a criterion passed with caveats, explain here. The checklist is the
      minimum bar; this prose adds the context checklists can't capture.]

      If an existing "Verification" section exists, keep it and ensure it has
      both the checklist AND the prose. Don't replace one with the other.

   c. ADD adversarial section (D5, D10):
      ## What Could Be Wrong
      [State 3+ specific things that could be wrong with this milestone's
      output despite passing verification. What did verification NOT test?
      What assumptions were made? Where could the implementation be subtly
      wrong in ways the acceptance criteria don't catch?]

3. MODIFY workflows/kickoff.md:
   a. Find the step that creates BUILD-PLAN.md.
   b. ADD instruction: "Include metadata block at the top of BUILD-PLAN.md."

4. MODIFY workflows/build-milestone.md:
   a. Find the step that creates the milestone report.
   b. ADD instruction for dual verification:
      "The milestone report must include BOTH an Acceptance Criteria checklist
      (each criterion as a checkbox) AND a Verification Notes prose section
      (describing HOW each criterion was verified, not just that it passed)."
   c. ADD instruction for adversarial section:
      "Include a 'What Could Be Wrong' section with 3+ specific concerns."
   d. Find the step that writes Current Focus.
      ADD instruction: "Write Current Focus as a state description — what IS,
      not what to DO. Pipeline Position handles routing."
      (QA L2 fix)

5. MODIFY workflows/execute.md:
   a. Find the Current Focus instruction (around line 201).
      OLD: "Sprint N executed for [feature]. Awaiting architect QA review."
      NEW: "Sprint N executed for [feature]. Architect QA review pending."
      Note: "pending" is state-descriptive; "Awaiting" implies action.
      Also ADD instruction: "Write Current Focus as a state description —
      what IS, not what to DO."
      (QA M5 fix)

   b. Find the sprint completion report template.
      ADD metadata block instruction:
      "Include metadata at the top of the COMPLETION.md:
      > **type:** completion-report
      > **output_path:** artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md
      > **key_decisions:** [decisions or deviations during execution]
      > **open_questions:** [flags for architect review]"

6. MODIFY workflows/continue.md:
   a. Find the presentation text that says "Next up:" (around line 37).
      Change to "Upcoming:" or "Next milestone:" — state-descriptive phrasing.
      (QA L3 fix)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/ladder-build/skills/ladder-build/templates/build-plan.md` | MODIFY | Add metadata block |
| `plugins/ladder-build/skills/ladder-build/templates/milestone-report.md` | MODIFY | Add metadata block, add dual verification (AC checklist + prose), add adversarial section |
| `plugins/ladder-build/skills/ladder-build/workflows/kickoff.md` | MODIFY | Add metadata generation instruction |
| `plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md` | MODIFY | Add dual verification instruction, add adversarial instruction, add "state description" instruction (L2) |
| `plugins/ladder-build/skills/ladder-build/workflows/execute.md` | MODIFY | Fix Current Focus wording (M5), add metadata instruction for COMPLETION.md |
| `plugins/ladder-build/skills/ladder-build/workflows/continue.md` | MODIFY | Fix "Next up:" presentation text (L3) |

## Acceptance Criteria

- [ ] build-plan.md template has metadata block (type: build-plan) in blockquote format
- [ ] milestone-report.md template has metadata block (type: milestone-report) in blockquote format
- [ ] milestone-report.md template has BOTH AC checklist section AND Verification Notes prose section
- [ ] milestone-report.md template has "What Could Be Wrong" adversarial section with concrete instruction
- [ ] kickoff.md workflow instructs metadata generation for BUILD-PLAN.md
- [ ] build-milestone.md workflow instructs dual verification (checklist + prose)
- [ ] build-milestone.md workflow instructs adversarial "What Could Be Wrong" section
- [ ] build-milestone.md Current Focus step has "state description, not action" instruction (L2)
- [ ] execute.md Current Focus uses state-descriptive language ("pending" not "Awaiting") (M5)
- [ ] execute.md sprint completion includes metadata block instruction
- [ ] continue.md presentation text uses state-descriptive phrasing (no "Next up:") (L3)
- [ ] No "For: [SkillName]" consumer-naming directive in any template (FF-4)
- [ ] Metadata format matches Decision #1: blockquote (`> **field:** value`)

## Edge Cases

- **milestone-report.md may already have a verification section:** Read it first. If it has prose but no checklist, add the checklist. If it has a checklist but no prose, add the prose. If it has both, strengthen the instructions.
- **execute.md was already autonomously fixed in Sprint 1 QA (Pipeline Position enrichment fields):** This task makes additional changes to the same file (Current Focus wording). Read the current state — don't lose the Sprint 1 QA fix.
- **Old milestone reports won't have metadata or dual verification:** Only future outputs follow the new contract. No migration needed.

## Notes

- D4 (dual verification) is the most impactful change here. The AC checklist provides structure; the verification prose prevents mechanical checkbox-ticking. QA agents should flag any milestone report where the checklist is all checked but the prose is generic.
- The "What Could Be Wrong" section name follows Decision #5 (contextual naming). This matches the milestone context better than "Adversarial Assessment."
