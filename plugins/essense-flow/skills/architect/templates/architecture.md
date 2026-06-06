---
schema_version: 1
sprints_planned: {{sprints_planned}}
abstractions_introduced: {{abstractions_introduced}}
decisions_closed: {{decisions_closed}}
existing_functionality_considered: {{existing_functionality_considered}}   # count of reuse-ledger rows from the decide-step map consult; 0 when no functionality map existed at design time
canon_files: {{canon_files}}   # v0.13.4 L4: array of project-canonical doc paths that mirror decisions.yaml (e.g. ["docs/DECISIONS-INDEX.md", "docs/MASTER-DECISIONS.md"]). Empty array [] is allowed and means "no project-canon mirrors beyond decisions.yaml." Architect's pack step reads this; if non-empty AND any decisions closed this round, master MUST emit a T-CANON-<round> task per "Canon-tax emission" in skills/architect/SKILL.md "How you work".
---

# Architecture — {{project_name}}

## Module boundaries

{{module_boundaries}}

## Data flow

{{data_flow}}

## Abstractions introduced

{{abstractions_introduced_table}}

## Existing functionality considered

{{existing_functionality_considered_table}}

<!-- Reuse ledger from the decide-step functionality-map consult:
     | glossary_id | label | module | reuse / not-reuse | rationale |
     Every not-reuse row MUST carry a rationale (re-implementation
     without one is forbidden). When no map existed at design time,
     write: "No functionality map present at design time (greenfield
     or pre-glossary)." -->

## Decisions table

See `decisions.yaml` for the canonical record. Summary:

{{decisions_summary}}

### Project-canon mirrors (v0.13.4 L4)

`canon_files:` (frontmatter) lists project-specific canon documents that
mirror `decisions.yaml`. Set during initial architect run; preserved across
rounds. When non-empty, architect's pack step (see `SKILL.md` "How you work"
→ "Canon-tax emission") MUST emit a `T-CANON-<round>` task in the sprint
manifest whose `file_write_contract.allowed` covers every listed canon path;
the task appends one row per closed-this-round master decision into each
listed file. Empty array `[]` is allowed and means "decisions.yaml is the
sole canon mirror; no additional project-canon files exist." Do NOT set
this to `null` — the field must be explicitly an array (empty or
populated).

## Seams between components

{{seams}}

## Sprint plan

{{sprint_plan_summary}}
