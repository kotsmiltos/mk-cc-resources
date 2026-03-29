# Task 1: STATE.md Template Overhaul

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** ../../PLAN.md

## Goal

Establish the STATE.md template as the ground truth for all state operations. Fix D1 violations (free-text action fields), promote the canonical stage spec from a hidden comment to a visible reference, and add the missing `complete` stage. After this task, every consumer of STATE.md has an authoritative, machine-parseable stage list to reference, and no section encourages action-oriented prose.

## Context

Read first:
- `plugins/mk-flow/skills/state/templates/state.md` — the current template (52 lines)
- Audit findings MF-1, MF-2, MF-5, CC-3 in `artifacts/audits/2026-03-29-coherence-audit-report.md`
- Design decisions D1, D3, D7 in `artifacts/explorations/2026-03-29-workflow-clarity-exploration.md`

The template is the leaf node of the dependency graph — every other change in this sprint and the next two sprints depends on the template being correct first. Changes here propagate to: the hook (Task 3), all SKILL.md routing sections (Task 4), all workflow completion steps (Sprint 2), and drift-check (Sprint 3).

Plan Decisions #2, #3, and #4 apply:
- Decision #2: Canonical stage spec stays in the template as a promoted visible fenced code block (not moved to cross-references.yaml).
- Decision #3: Include all 4 Pipeline Position enrichment fields (build_plan, task_specs, completion_evidence, last_verified). D7 relaxed per user.
- Decision #4: "Next Up" is renamed to "Planned Work" with state-descriptive framing, not removed.

## Interface Specification

### Inputs
- Current `state.md` template at `plugins/mk-flow/skills/state/templates/state.md`

### Outputs
- Modified `state.md` template with 4 changes: renamed section, redefined instruction, promoted spec, added stage

### Contracts with Other Tasks
- Task 3 (Hook Routing) consumes the canonical stage list to implement routing rules
- Task 4 (Consumer Updates) references the canonical spec location in SKILL.md routing sections
- Sprint 2 tasks consume the section names for their workflow completion steps

## Pseudocode

```
1. Open plugins/mk-flow/skills/state/templates/state.md

2. RENAME "## Next Up" section:
   OLD: "## Next Up"
        "- [ ] [Next milestone — brief description]"
   NEW: "## Planned Work"
        "- [ ] [Scoped work — what's planned, not what to do next]"
   Note: This is a state-descriptive section. Content describes what IS scoped,
   not what the user SHOULD do. Pipeline Position handles routing.

3. REDEFINE Current Focus instruction:
   OLD: "[What you're actively working on — 1-2 sentences]"
   NEW: "[Current project state — what's been done, what's in progress. State description, not action instruction.]"
   Note: Skills that write this field (architect plan.md, review.md) will be
   updated in Task 4 to use state-descriptive language.

4. PROMOTE canonical stage comment block:
   OLD: HTML comment block (lines 27-42) starting with "<!-- Canonical pipeline stages"
   NEW: Visible fenced code block section ABOVE the Pipeline Position fields.
   Format:
   ```
   ### Canonical Pipeline Stages
   ```yaml
   # Update ALL consumers when changing this list
   stages:
     - idle                   # No active pipeline work
     - research               # miltiaze exploration in progress
     - requirements-complete  # miltiaze finished, architect next
     - audit-complete         # architect audit done, plan next
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
   ```
   Note: The fenced YAML block is parseable by drift-check and grep.
   Keep the consumer list current — add files when they start reading this list.

5. ADD "complete" to the Stage field's enum:
   OLD: "- **Stage:** idle | research | requirements-complete | audit-complete | sprint-N | sprint-N-complete | reassessment"
   NEW: "- **Stage:** idle | research | requirements-complete | audit-complete | sprint-N | sprint-N-complete | reassessment | complete"

5b. ADD 4 enrichment fields to Pipeline Position:
   After the existing 5 fields (Stage, Requirements, Audit, Plan, Current sprint),
   add:
   - **Build plan:** [path to ladder-build BUILD-PLAN.md, if standalone mode]
   - **Task specs:** [path to current sprint's task spec directory, e.g., artifacts/designs/[slug]/sprints/sprint-1/]
   - **Completion evidence:** [path to most recent COMPLETION.md or milestone report]
   - **Last verified:** [date when drift-check last passed, e.g., 2026-03-29]

   These enable skills to auto-discover artifact paths without filesystem search
   or fallback questions. They are validated by drift-check, not by individual skills.

   Mark as "if applicable" to match existing field pattern — not all fields are
   relevant for all stages (e.g., build_plan only for standalone mode, task_specs
   only during sprint execution).

6. UPDATE Pipeline Position section intro text:
   OLD: "_(Updated automatically by miltiaze, architect, and ladder-build when in pipeline mode. Remove this section if not using the full pipeline.)_"
   NEW: "_(Updated by pipeline skills on state change. Canonical stage list above is the authoritative definition — all consumers reference it.)_"

7. REMOVE the HTML comment block (lines 27-42) since it's now a visible section.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/skills/state/templates/state.md` | MODIFY | Rename Next Up → Planned Work, redefine Current Focus, promote canonical stages, add complete stage, remove HTML comment |

## Acceptance Criteria

- [ ] Template has `## Planned Work` section with state-descriptive instruction ("what's scoped"), no `## Next Up`
- [ ] Current Focus instruction says "state description" — no action verbs (ready, execute, run, start)
- [ ] Canonical pipeline stages section is a visible `### Canonical Pipeline Stages` with YAML fenced code block
- [ ] Stage list includes exactly 8 stages: idle, research, requirements-complete, audit-complete, sprint-N, sprint-N-complete, reassessment, complete
- [ ] Consumer list includes all 7 known consumer files
- [ ] Stage field enum in Pipeline Position includes `complete`
- [ ] HTML comment block (old canonical stages) is removed — no duplication
- [ ] Pipeline Position intro text references the canonical spec
- [ ] Pipeline Position has 9 fields: Stage, Requirements, Audit, Plan, Current sprint, Build plan, Task specs, Completion evidence, Last verified

## Edge Cases

- **Existing STATE.md files in projects:** Template changes don't auto-update existing STATE.md files. mk-flow-init handles upgrades. Existing files will have "Next Up" until the user re-runs init or manually updates. This is acceptable — the template is the contract, not the instance.
- **The YAML code block could be mistakenly edited by users:** The `### Canonical Pipeline Stages` section is clearly marked as a reference definition. The intro text says "all consumers reference it." Adding a warning comment inside the YAML is unnecessary — the fenced block itself signals "don't edit casually."

## Notes

- Design Decision #4 chose rename over removal. User confirmed this is fine.
- Design Decision #3 includes all 4 Pipeline Position enrichment fields. D7 relaxed per user — not a hard constraint.
- The live `context/STATE.md` in this project will be updated as part of STATE.md consumer updates (Task 4) or during Sprint 1 review. The template change comes first.
