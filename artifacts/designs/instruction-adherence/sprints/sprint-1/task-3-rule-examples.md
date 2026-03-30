> **type:** task-spec
> **output_path:** artifacts/designs/instruction-adherence/sprints/sprint-1/task-3-rule-examples.md
> **sprint:** 1
> **status:** complete
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../PLAN.md
> **key_decisions:** none
> **open_questions:** none

# Task 3: Add verification examples to behavioral rules

## Goal
Rules with concrete tools ("run drift-check.sh") get ~90% adherence. Rules with behavioral guidelines ("be thorough") get ~65%. Add concrete `check_for` criteria to behavioral rules so Claude can evaluate whether the rule applies instead of guessing.

## Context
`plugins/mk-flow/defaults/rules.yaml` has 8 rules. Some have concrete actions (verify-before-reporting: "run drift-check.sh"). Others are behavioral (no-laziness: "apply yourself fully"). The behavioral ones need executable checks.

## Rules to update

Only rules that lack concrete verification criteria:
1. `never-drop-scope` — add: "Before removing any item from a plan, search for the user's explicit approval in conversation or STATE.md amendments"
2. `no-laziness` — add: "After completing work, count: how many files were touched? Were ALL instances fixed, not just the first? Did you check related files?"
3. `ask-for-specifics` — add: "Check: does the message use vague terms? Could it mean 2+ things? If YES to either, ask ONE question before proceeding"
4. `no-therapy-speak` — add: "Check: does your draft response start with agreement, validation, or praise? If yes, delete that sentence and start with the action or fact"

Rules that already have concrete criteria (no changes):
- `verify-before-reporting` — has "run drift-check.sh"
- `never-assume-always-confirm` — has verification protocol
- `self-verify-before-done` — has concrete checklist
- `context-awareness` — has specific checks
- `investigate-before-fixing` — has concrete steps

## Pseudocode

```
FOR EACH rule in [never-drop-scope, no-laziness, ask-for-specifics, no-therapy-speak]:
  1. Read current rule content
  2. Add a "check_for" field after the "when" field:

  CURRENT:
    rule-name:
      what: "..."
      why: "..."
      when: "..."

  NEW:
    rule-name:
      what: "..."
      why: "..."
      when: "..."
      check_for: |
        Before responding, verify:
        - [concrete check 1]
        - [concrete check 2]
        Example:
          Input: [example input]
          Wrong: [what Claude would do without the rule]
          Right: [what Claude should do with the rule]
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/defaults/rules.yaml` | MODIFY | Add check_for to 4 rules |

## Acceptance Criteria

- [ ] never-drop-scope has a check_for with concrete verification step
- [ ] no-laziness has a check_for with countable verification ("how many files?")
- [ ] ask-for-specifics has a check_for with decision criteria ("does it mean 2+ things?")
- [ ] no-therapy-speak has a check_for with draft-review step
- [ ] All check_for sections include at least one wrong/right example
- [ ] defaults_version NOT bumped (done in task 4 along with hook changes)
