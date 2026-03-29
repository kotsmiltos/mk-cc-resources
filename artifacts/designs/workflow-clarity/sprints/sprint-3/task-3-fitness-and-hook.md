# Task 3: Fitness Functions + Hook Fixes

> **type:** task-spec
> **output_path:** artifacts/designs/workflow-clarity/sprints/sprint-3/task-3-fitness-and-hook.md
> **sprint:** 3
> **status:** planned
> **depends_on:** Sprint 2
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D9 (sprints serve product), QA H1 (routing fallback scope), QA L6 (pause.md FF-17)
> **open_questions:** none

## Goal

Create a fitness function verification script that checks all 20 fitness functions from PLAN.md. Fix the PLAN.md fallback routing ambiguity in intent-inject.sh (QA H1). Add the missing FF-17 instruction to pause.md (QA L6). After this task, architectural properties are machine-verifiable, the routing is unambiguous, and all workflows have the "state description" instruction.

## Context

Read first:
- PLAN.md Fitness Functions section (FF-1 through FF-20)
- `plugins/mk-flow/hooks/intent-inject.sh` lines 199-222 (routing rules — H1 fix target)
- `plugins/mk-flow/skills/state/workflows/pause.md` lines 47-53 (L6 fix target)
- Sprint 2 QA-REPORT.md H1 (routing conflict) and L6 (pause.md FF-17)
- Sprint 1 QA-REPORT.md for context on the original M3 fix

**QA H1 — PLAN.md fallback routing conflict:**
The M3 fix in Sprint 2 added "AND stage is not 'idle' and not 'complete'" to the PLAN.md fallback (line 216). But stages with their own specific rules (`sprint-N-complete` → /architect, `reassessment` → /architect) also trigger the fallback, producing conflicting suggestions (/architect + /ladder-build). The fix must make the PLAN.md fallback a true catch-all that only fires when no stage-specific rule matched.

**QA L6 — pause.md missing FF-17:**
pause.md writes Current Focus (line 49) without the "state description, not action" instruction. audit.md and requirements.md were fixed autonomously in Sprint 2 QA. pause.md was not in Sprint 2 scope.

## Interface Specification

### Inputs
- All files referenced by fitness functions (templates, workflows, hook, drift-check, SKILL.md files)
- PLAN.md Fitness Functions section

### Outputs
- `plugins/mk-flow/skills/state/scripts/verify-templates.sh` — fitness function verification script
- Modified `intent-inject.sh` with routing fix
- Modified `pause.md` with FF-17 instruction

### Contracts with Other Tasks
- Task 1 (Metadata Normalization) must complete first for FF-1/FF-18/FF-19 to pass
- Task 2 (Drift-Check) adds new validation that fitness functions can reference
- Task 4 (Version Bumps) will increment hook version

## Pseudocode

```
1. FIX H1 — PLAN.md fallback routing in intent-inject.sh:

   Location: line 216 of intent-inject.sh

   OLD (current):
     If a PLAN.md exists with task specs in artifacts/designs/ AND stage is not "idle" and not "complete":
       Suggest: "/ladder-build to execute the current sprint's task specs."

   NEW:
     If a PLAN.md exists with task specs in artifacts/designs/ AND none of the
     stage-specific routing rules above have already provided a suggestion:
       Suggest: "/ladder-build to execute the current sprint's task specs."

   Implementation: restructure the line to say:
     "If a PLAN.md exists with task specs in artifacts/designs/ AND stage does not
     match any of: idle, research, requirements-complete, audit-complete, sprint-N
     (active), sprint-N-complete, reassessment, complete:"

   This makes the PLAN.md fallback truly a fallback — it only fires for stages
   not covered by any specific rule. In practice this means only "unknown" stages
   would trigger it, which is correct (unknown stage + PLAN.md exists = probably
   should continue execution).

2. FIX L6 — pause.md FF-17 instruction:

   Location: plugins/mk-flow/skills/state/workflows/pause.md, step_3 (line 48-53)

   After line 49 ("Current Focus → what was in progress when paused"), ADD:
     "Write Current Focus as a state description — what IS, not what to DO.
     Pipeline Position handles routing."

3. CREATE verify-templates.sh — Fitness Function Verification:

   Location: plugins/mk-flow/skills/state/scripts/verify-templates.sh
   (alongside drift-check.sh — same script directory, same conventions)

   STRUCTURE:
   #!/usr/bin/env bash
   # verify-templates.sh — Check architectural fitness functions from PLAN.md.
   # Exit 0 = all pass, Exit 1 = failures found.

   Use same color/formatting conventions as drift-check.sh.

   IMPLEMENT checks for each fitness function:

   FF-1: Every pipeline template has standardized metadata block
     - ENUMERATE the 10 pipeline template files (hardcoded paths)
     - For each: grep for `> **type:**`, `> **output_path:**`,
       `> **key_decisions:**`, `> **open_questions:**`
     - PASS if all 4 found, FAIL if any missing

   FF-2: Every assessment/completion template has adversarial section
     - CHECK: exploration-report → "Where This Can Fail"
     - CHECK: requirements-report → "Implementation Risks"
     - CHECK: plan.md → "Adversarial Assessment"
     - CHECK: audit-report → "Adversarial Assessment"
     - CHECK: milestone-report → "What Could Be Wrong"

   FF-3: Every completion template has BOTH AC checklist AND verification prose
     - CHECK: milestone-report → "Acceptance Criteria" AND "Verification Notes"

   FF-4: No template contains "For: [SkillName]" directive
     - GREP across all template files for "For: [" pattern
     - PASS if zero matches

   FF-5: STATE.md template has "Planned Work" not "Next Up"
     - GREP state.md template for "## Planned Work" (must exist)
     - GREP state.md template for "## Next Up" (must NOT exist)

   FF-6: Canonical stage list includes all 8 stages
     - GREP state.md template for each: idle, research, requirements-complete,
       audit-complete, sprint-N, sprint-N-complete, reassessment, complete

   FF-7: intent-inject.sh has routing rules for all 8 stages
     - GREP intent-inject.sh routing section for each stage name

   FF-8: Pipeline Position has all required fields
     - GREP state.md template for: Stage, Requirements, Audit, Plan,
       Current sprint, Build plan, Task specs, Completion evidence, Last verified

   FF-9: Current Focus instructions use state-descriptive language
     - GREP all workflows that write Current Focus for "state description"
       or "what IS, not what to DO"
     - Files to check: plan.md, review.md, execute.md, build-milestone.md,
       audit.md, requirements.md, pause.md

   FF-10: No ladder-build workflow hardcodes miltiaze section names
     - GREP ladder-build workflows for miltiaze-specific section patterns
     - PASS if zero matches for hardcoded section references

   FF-11: Every SKILL.md routing references canonical stage spec
     - CHECK architect/SKILL.md, ladder-build/SKILL.md for canonical reference

   FF-12: sprint-management.md doesn't use task count as primary split
     - GREP for "task count" — must be "secondary signal" or similar

   FF-13: .continue-here.md injection has staleness + first-message gate
     - GREP intent-inject.sh for staleness check pattern and flag file pattern

   FF-14: drift-check validates both plan types
     - GREP drift-check.sh for "BUILD-PLAN" and "PLAN.md" handling

   FF-15: Workflows writing Pipeline Position include all 9 fields
     - For each workflow that writes Pipeline Position, count the field lines
     - Files: plan.md, review.md, execute.md, audit.md, requirements.md

   FF-16: Consumer list includes all stage readers/writers
     - GREP state.md for consumer list section
     - Cross-check with known consumers

   FF-17: Current Focus writers have "state description" instruction
     - Same as FF-9 (they overlap — FF-9 checks the language, FF-17 checks
       the explicit instruction)

   FF-18: Inline templates include core 4 metadata fields
     - CHECK execute.md completion-report template
     - CHECK review.md QA-report template

   FF-19: All metadata field names use snake_case
     - GREP all templates for `> **` fields
     - Check each field name contains only lowercase + underscores

   FF-20: PLAN.md fallback only fires when no stage rule matched
     - GREP intent-inject.sh for the PLAN.md fallback text
     - Verify it excludes all 8 specific stages (or uses "none matched" language)

   SUMMARY:
     Print: [N/20] fitness functions passed
     List failures with details
     Exit 0 if all pass, 1 if any fail
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | Expand PLAN.md fallback routing exclusion (H1 fix) |
| `plugins/mk-flow/skills/state/workflows/pause.md` | MODIFY | Add "state description, not action" instruction (L6/FF-17 fix) |
| `plugins/mk-flow/skills/state/scripts/verify-templates.sh` | CREATE | Fitness function verification script checking all 20 FFs |

## Acceptance Criteria

- [ ] intent-inject.sh PLAN.md fallback only fires when no stage-specific rule above matched
- [ ] When stage is "sprint-N-complete" and PLAN.md exists, only the sprint-complete rule fires (no /ladder-build conflict)
- [ ] When stage is "reassessment" and PLAN.md exists, only the reassessment rule fires
- [ ] pause.md has "state description, not action" instruction in step_3
- [ ] verify-templates.sh exists and is executable
- [ ] verify-templates.sh checks all 20 fitness functions (FF-1 through FF-20)
- [ ] verify-templates.sh reports PASS/FAIL per function with specific evidence
- [ ] verify-templates.sh exits 0 when all pass, 1 when any fail
- [ ] verify-templates.sh uses same formatting conventions as drift-check.sh (colors, [PASS]/[FAIL])
- [ ] verify-templates.sh is portable (bash, no GNU-specific, CRLF-safe)
- [ ] Hook total line count stays under 260 after the routing fix
- [ ] All existing hook behavior unchanged (only the PLAN.md fallback condition changes)

## Edge Cases

- **New fitness functions added after this sprint:** verify-templates.sh should be easy to extend (one function per FF, clear structure). Document the extension pattern.
- **Template files not found:** verify-templates.sh should report "SKIP: [file] not found" rather than failing the whole run. Some fitness functions reference files that might not exist in all installations.
- **intent-inject.sh format changes between Task 1 and Task 3 execution:** Task 1 doesn't modify the hook. Task 3 is the only Sprint 3 task touching intent-inject.sh. No conflict.
- **Fitness functions that are also checked by drift-check (FF-14, FF-8):** verify-templates.sh checks static properties of the script files. drift-check validates runtime state. They complement, not duplicate.

## Notes

- The fitness function script is a smoke test for architectural properties — it checks that the right patterns exist in the right files. It doesn't run the skills or generate output. This makes it fast and safe to run anytime.
- The H1 routing fix is the most impactful change. The current ambiguity doesn't cause failures (Claude resolves conflicting suggestions by specificity), but it's a code smell that could cause confusion in edge cases.
- Keep verify-templates.sh under 200 lines. Each fitness function is a simple grep check — don't over-engineer.
