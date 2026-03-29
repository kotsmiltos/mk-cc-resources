# Task 1: Miltiaze Templates + Workflows

> **Sprint:** 2
> **Status:** planned
> **Depends on:** Sprint 1
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Add standardized metadata blocks and strengthen adversarial self-assessment sections in miltiaze's exploration and requirements templates. Ensure the corresponding workflows generate these sections. After this task, every miltiaze output includes machine-parseable metadata (type, output_path, key_decisions, open_questions) and an honest adversarial assessment.

## Context

Read first:
- `plugins/miltiaze/skills/miltiaze/templates/exploration-report.md` — current exploration template
- `plugins/miltiaze/skills/miltiaze/templates/requirements-report.md` — current requirements template
- `plugins/miltiaze/skills/miltiaze/workflows/full-exploration.md` — exploration workflow
- `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` — requirements workflow
- PLAN.md Decision #1 (metadata format: blockquote `> **field:** value`)
- PLAN.md Decision #5 (adversarial section naming: "Where This Can Fail" for explorations)

Design decisions that apply:
- D2: Standardized metadata — producer provides `type`, `output_path`, `key_decisions`, `open_questions`
- D5: Adversarial assessment is event-driven (only in assessment outputs)
- D10: Adversarial self-assessment is a core product principle — not optional, not boilerplate

## Interface Specification

### Inputs
- Current miltiaze templates (2 files)
- Current miltiaze workflows (2 files)

### Outputs
- Modified templates with metadata blocks and adversarial sections
- Modified workflows with steps to generate metadata and adversarial content

### Contracts with Other Tasks
- Sprint 1 established the metadata format (blockquote) and naming conventions
- Task 2 (Architect) and Task 3 (Ladder-Build) follow the same pattern — consistency is critical
- Sprint 3 Task 1 (Format-Agnostic Extraction) will parse these metadata blocks

## Pseudocode

```
1. MODIFY exploration-report.md template:
   a. ADD metadata block at the very top (before TL;DR):
      > **type:** exploration
      > **output_path:** artifacts/explorations/YYYY-MM-DD-[topic-slug]-exploration.md
      > **key_decisions:** [bullet list of decisions made in this exploration]
      > **open_questions:** [bullet list of unresolved questions, or "none"]

   b. CHECK "Where This Can Fail" section exists.
      If it exists: strengthen the instruction text.
      ADD instruction: "State 3+ specific ways this exploration's recommendations
      could fail. Name the failure mode, the trigger, and what the fallback is.
      Do NOT write generic hedging ('there may be risks'). Be specific and honest.
      If you can't find failure modes, the exploration isn't deep enough."

      If it doesn't exist: ADD section before Sources:
      ## Where This Can Fail
      [Instruction text as above]

2. MODIFY requirements-report.md template:
   a. ADD metadata block at the very top:
      > **type:** requirements
      > **output_path:** artifacts/explorations/YYYY-MM-DD-[topic-slug]-requirements.md
      > **key_decisions:** [bullet list of decisions made during requirements research]
      > **open_questions:** [bullet list of unresolved questions, or "none"]

   b. CHECK for adversarial section.
      Requirements reports should have "Implementation Risks" or equivalent.
      If missing: ADD section before Sources:
      ## Implementation Risks
      [State 3+ specific ways the recommended approach could fail during
      implementation. Name the risk, likelihood, and mitigation. Cross-reference
      with perspective agent disagreements — unresolved disagreements are risks.]

3. MODIFY full-exploration.md workflow:
   a. Find the step that assembles the final report (step_assemble or equivalent).
   b. ADD instruction to generate metadata block:
      "At the top of the report, before the TL;DR, include the metadata block:
      > **type:** exploration
      > **output_path:** artifacts/explorations/YYYY-MM-DD-[topic-slug]-exploration.md
      > **key_decisions:** [list key decisions from the exploration]
      > **open_questions:** [list unresolved questions]"
   c. ADD instruction to generate adversarial section:
      "The 'Where This Can Fail' section is mandatory. It must contain 3+
      specific failure modes with triggers and fallbacks. Review each
      recommended solution and actively look for how it breaks."

4. MODIFY requirements.md workflow:
   a. Find the step that assembles the final report (step_assemble_report).
   b. ADD instruction to generate metadata block (same pattern, type: requirements).
   c. Verify the adversarial/risk content is already covered by the
      perspective agents' risk sections. If the synthesis step doesn't
      aggregate risks into a dedicated section, ADD instruction to do so.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/miltiaze/skills/miltiaze/templates/exploration-report.md` | MODIFY | Add metadata block, strengthen adversarial section instructions |
| `plugins/miltiaze/skills/miltiaze/templates/requirements-report.md` | MODIFY | Add metadata block, add implementation risks section if missing |
| `plugins/miltiaze/skills/miltiaze/workflows/full-exploration.md` | MODIFY | Add metadata generation step, add adversarial generation instruction |
| `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` | MODIFY | Add metadata generation step, verify risk aggregation |

## Acceptance Criteria

- [ ] exploration-report.md has metadata block with type, output_path, key_decisions, open_questions in blockquote format
- [ ] exploration-report.md "Where This Can Fail" section has concrete instruction ("State 3+ specific ways...")
- [ ] requirements-report.md has metadata block with type: requirements
- [ ] requirements-report.md has implementation risks section with concrete instruction
- [ ] full-exploration.md workflow has step to generate metadata block
- [ ] full-exploration.md workflow has step to generate adversarial content (not optional, not boilerplate)
- [ ] requirements.md workflow has step to generate metadata block
- [ ] Metadata format matches Decision #1: blockquote (`> **field:** value`)
- [ ] No "For: [SkillName]" consumer-naming directive in any template (FF-4)

## Edge Cases

- **Exploration template already has "Where This Can Fail":** Don't duplicate — strengthen the existing section's instruction text. Read the current text first.
- **Requirements template may already have a "Risks" section from perspective agents:** Check what exists. If risks are scattered across perspective agent sections but not aggregated, the template should instruct aggregation. Don't duplicate risk coverage.
- **Old miltiaze outputs won't have metadata:** Only future outputs follow the new contract. No migration needed.

## Notes

- D10 (adversarial self-assessment as core principle) means the adversarial section must prompt for genuine failure modes, not boilerplate hedging. The instruction text matters — read the feedback memory about "no ego stroking" and "adversarial self-assessment."
- The metadata block must be parseable by Sprint 3's format-agnostic extraction. Keep it simple: one field per line, blockquote format, no nesting.
