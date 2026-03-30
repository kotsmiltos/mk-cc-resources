> **type:** task-spec
> **output_path:** artifacts/designs/instruction-adherence/sprints/sprint-1/task-0-miltiaze-quickstart.md
> **sprint:** 1
> **status:** complete
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../PLAN.md
> **key_decisions:** D1
> **open_questions:** none

# Task 0: Fix miltiaze quick_start routing gate

## Goal
Replace miltiaze's quick_start with an imperative gate that checks for upstream context (STATE.md pipeline position, existing explorations) BEFORE defaulting to "what do you want to explore?" A bare `/miltiaze` when context exists should use that context, not ask again.

## Context
The proven pattern from ladder-build: numbered checklist with STOP gates at the top of quick_start. miltiaze's current quick_start is a single paragraph that says "if invoked without context, ask." The routing table below has more conditions but gets skimmed.

Read the current quick_start at `plugins/miltiaze/skills/miltiaze/SKILL.md` line 10-12.

## Pseudocode

```
REPLACE quick_start content with:

<quick_start>
BEFORE ANYTHING ELSE — check for existing context:
1. Read context/STATE.md Pipeline Position — if stage is "research", use the current focus as input. STOP asking.
2. Glob artifacts/explorations/ for existing explorations. If the user's input references one, route to workflows/drill-deeper.md. STOP.
3. If the user said "requirements", "spec", or "build" — route to workflows/requirements.md. STOP.

Only if NO upstream context matches:
4. If user provided an idea with their invocation, extract and route to workflows/full-exploration.md
5. If bare invocation with no input, ask: "What idea, concept, or question do you want to explore?"
</quick_start>
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/miltiaze/skills/miltiaze/SKILL.md` | MODIFY | Replace quick_start section (lines 10-12) |
| `plugins/miltiaze/.claude-plugin/plugin.json` | MODIFY | Bump version |

## Acceptance Criteria

- [ ] quick_start is a numbered checklist, not a paragraph
- [ ] Step 1 checks STATE.md pipeline position before anything else
- [ ] Step 2 checks for existing explorations
- [ ] Steps 4-5 are conditional on "NO upstream context"
- [ ] The word STOP appears after each routing decision
- [ ] Plugin version bumped
