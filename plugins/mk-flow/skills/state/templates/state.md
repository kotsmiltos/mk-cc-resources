> **type:** state
> **output_path:** context/STATE.md
> **key_decisions:** see Decisions Made section below
> **open_questions:** see Blocked / Open Questions section below

# Project State: [project-name]
> Last updated: [YYYY-MM-DD]

## Current Focus
[Current project state — what's been done, what's in progress. State description, not action instruction.]

## Done (Recent)
- [x] [Milestone/plan completed — key outcome]

## Blocked / Open Questions
- [ ] [Blocker description — what's needed to unblock]

## Planned Work
- [ ] [Scoped work — what's planned, not what to do next]

## Decisions Made
| Decision | Reasoning | Date |
|----------|-----------|------|

## Amendments
| ID | Target | What Changed | Status | Added |
|----|--------|-------------|--------|-------|

## Pipeline Position
_(Updated by pipeline skills on state change. Canonical stage list below is the authoritative definition — all consumers reference it.)_

### Canonical Pipeline Stages
```yaml
# Update ALL consumers when changing this list
stages:
  - idle                   # No active pipeline work
  - research               # miltiaze exploration in progress
  - requirements-complete  # miltiaze finished, architect next
  - audit-complete         # architect audit done, plan next
  - scope-L0               # architecture decomposition in progress
  - scope-L0-complete      # architecture decomposition done, ready for review
  - scope-LN               # module/component decomposition at level N (replace N)
  - scope-LN-complete      # level N decomposition done, ready for review
  - sprint-N               # sprint N in progress (ladder-build executing)
  - sprint-N-complete      # sprint N done (architect reviews)
  - reassessment           # mid-pipeline re-evaluation triggered
  - complete               # pipeline cycle finished
consumers:
  - plugins/mk-flow/hooks/intent-inject.sh
  - plugins/architect/skills/architect/SKILL.md
  - plugins/ladder-build/skills/ladder-build/SKILL.md
  - plugins/miltiaze/skills/miltiaze/workflows/requirements.md
  - plugins/architect/skills/architect/workflows/plan.md
  - plugins/architect/skills/architect/workflows/review.md
  - plugins/ladder-build/skills/ladder-build/workflows/execute.md
  - plugins/architect/skills/architect/workflows/audit.md
  - plugins/architect/skills/architect/workflows/scope-decompose.md
  - plugins/mk-flow/skills/state/workflows/status.md
  - plugins/mk-flow/skills/state/workflows/pause.md
```

- **Stage:** idle | research | requirements-complete | audit-complete | scope-L0 | scope-LN | scope-L0-complete | scope-LN-complete | sprint-N | sprint-N-complete | reassessment | complete
- **Requirements:** [path to requirements or exploration file, if applicable]
- **Audit:** [path to audit report, if applicable]
- **Plan:** [path to architect PLAN.md, if applicable]
- **Current sprint:** [N, if applicable]
- **Build plan:** [path to ladder-build BUILD-PLAN.md, if standalone mode]
- **Scope root:** [path to scope root directory, e.g., artifacts/scope/, if scope decomposition active]
- **Task specs:** [path to current sprint's task spec directory, e.g., artifacts/designs/[slug]/sprints/sprint-1/]
- **Completion evidence:** [path to most recent COMPLETION.md or milestone report]
- **Last verified:** [date when drift-check last passed, e.g., 2026-03-29]

## Context for Future Me
[Anything that would take 5+ minutes to re-derive. Architecture constraints, gotchas found, approaches tried and rejected.]
