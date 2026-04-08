> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/task-16-cross-references-update.md
> **sprint:** 3
> **status:** planned
> **depends_on:** T7, T12, T13
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D6
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 16: Cross-References Update

## Goal
Add scope-pipeline-specific cross-reference rules to `context/cross-references.yaml` and update the CLAUDE.md Cross-Reference Patterns table. These rules ensure that when someone changes a scope-related file, they get prompted to check coupled files for consistency — preventing the kind of drift that the Sprint 2 QA caught (parent filename convention, routing disambiguation, etc.).

## Context
- Cross-references file: `context/cross-references.yaml` — defines "change X, also check Y" rules
- CLAUDE.md Cross-Reference Patterns table — high-level summary of cross-reference patterns
- Sprint 2 QA caught several inconsistencies between scope-related files (template vs reference vs workflow disagreements). Cross-reference rules prevent these from recurring.
- The scope pipeline introduces new coupled files: INDEX.md template, agent brief templates, scope-decompose workflow, scope-decomposition reference, system-map template, consistency-check template
- D6 (backward compatibility): scope/ and designs/ coexist, so cross-references must cover both pathways

## Interface Specification

### Inputs
- Current `context/cross-references.yaml` (existing rules to extend)
- Current `CLAUDE.md` Cross-Reference Patterns table
- Knowledge of scope-related file couplings from Sprint 1-2 experience

### Outputs
- Extended `context/cross-references.yaml` with scope-specific rules
- Updated `CLAUDE.md` Cross-Reference Patterns table with scope entries

### Contracts with Other Tasks
- T7 (scope-decompose) established the files that are coupled → this task documents those couplings
- T12 (miltiaze scope output) introduced miltiaze-to-scope coupling → cross-reference needed
- T13 (ladder-build scope integration) introduced ladder-build-to-scope coupling → cross-reference needed

## Pseudocode

```
1. ADD scope-related rules to context/cross-references.yaml:

  scope-template-reference-sync:
    when: "Changing section structure in any scope template (index.md, agent-brief-decompose.md, agent-brief-implement.md, decision-record.md, interface-contract.md, cross-cutting-pattern.md, consistency-check.md, system-map.md)"
    check:
      - "plugins/architect/skills/architect/references/scope-decomposition.md — references template structures"
      - "plugins/architect/skills/architect/workflows/scope-decompose.md — assembles briefs from templates"
    why: "Templates, reference, and workflow must agree on section names, required fields, and file structure. Sprint 2 QA caught 3 inconsistencies from this coupling."

  scope-decompose-workflow-consumers:
    when: "Changing the scope-decompose workflow output format (what files it produces, where it writes them)"
    check:
      - "plugins/ladder-build/skills/ladder-build/workflows/execute.md — reads scope/ leaf tasks"
      - "plugins/architect/skills/architect/workflows/review.md — reviews scope/ output"
      - "plugins/architect/skills/architect/templates/index.md — INDEX.md tracks scope/ files"
    why: "Downstream consumers read scope-decompose output. Format changes break the pipeline."

  scope-index-template:
    when: "Changing INDEX.md template fields or structure"
    check:
      - "plugins/architect/skills/architect/workflows/scope-decompose.md — reads and writes INDEX.md"
      - "plugins/miltiaze/skills/miltiaze/workflows/requirements.md — creates initial INDEX.md"
      - "plugins/ladder-build/skills/ladder-build/workflows/execute.md — reads INDEX.md for scope detection"
    why: "Three skills read/write INDEX.md. Field additions or renames break consumers."

  scope-agent-brief-format:
    when: "Changing agent brief YAML frontmatter fields or required XML sections"
    check:
      - "plugins/architect/skills/architect/workflows/scope-decompose.md — assembles and validates agent briefs"
      - "plugins/architect/skills/architect/templates/consistency-check.md — validates agent brief content"
      - "plugins/architect/skills/architect/references/scope-decomposition.md — lists required fields"
    why: "Brief format is validated at assembly, consistency check, and reference level. All three must agree."

  miltiaze-scope-output:
    when: "Changing miltiaze requirements workflow output path or format for scope mode"
    check:
      - "plugins/architect/skills/architect/workflows/scope-decompose.md — reads project-brief.agent.md at Level 0"
      - "plugins/architect/skills/architect/templates/index.md — INDEX.md File Inventory format"
    why: "miltiaze creates the brief that scope-decompose consumes. Path or format changes break the handoff."

  scope-stages:
    when: "Adding or changing scope-specific pipeline stages (scope-L0, scope-LN, etc.)"
    check:
      - "plugins/mk-flow/skills/state/templates/state.md — canonical stage list"
      - "plugins/architect/skills/architect/SKILL.md — routing by stage"
      - "plugins/architect/skills/architect/workflows/scope-decompose.md — sets scope stages"
      - "plugins/ladder-build/skills/ladder-build/SKILL.md — routing by stage"
    why: "Scope stages are referenced by routing in multiple skills. Adding or renaming breaks routing."
    note: "The existing stage-names rule covers general stage changes. This rule is specific to scope stage semantics."

2. UPDATE CLAUDE.md Cross-Reference Patterns table:
   ADD new rows:

  | Scope templates | Changing section structure in scope templates | `references/scope-decomposition.md`, `workflows/scope-decompose.md` | Templates, reference, and workflow must agree on structure |
  | INDEX.md template | Changing INDEX.md fields or structure | `workflows/scope-decompose.md`, `miltiaze/workflows/requirements.md`, `ladder-build/workflows/execute.md` | Three skills read/write INDEX.md |
  | Agent brief format | Changing agent brief YAML/XML structure | `workflows/scope-decompose.md`, `templates/consistency-check.md`, `references/scope-decomposition.md` | Brief format validated at assembly, check, and reference |
  | Scope output path | Changing where miltiaze writes scope briefs | `workflows/scope-decompose.md`, `templates/index.md` | miltiaze output is scope-decompose input |
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `context/cross-references.yaml` | MODIFY | Add 6 scope-specific cross-reference rules |
| `CLAUDE.md` | MODIFY | Add 4 rows to the Cross-Reference Patterns table |

## Acceptance Criteria
- [ ] `context/cross-references.yaml` contains rule `scope-template-reference-sync` with correct check targets
- [ ] `context/cross-references.yaml` contains rule `scope-decompose-workflow-consumers` with correct check targets
- [ ] `context/cross-references.yaml` contains rule `scope-index-template` referencing all 3 skills that read/write INDEX.md
- [ ] `context/cross-references.yaml` contains rule `scope-agent-brief-format` with correct check targets
- [ ] `context/cross-references.yaml` contains rule `miltiaze-scope-output` linking miltiaze to scope-decompose
- [ ] `context/cross-references.yaml` contains rule `scope-stages` referencing canonical stage list and routing consumers
- [ ] All cross-reference rules have `when`, `check`, and `why` fields (mandatory format)
- [ ] CLAUDE.md Cross-Reference Patterns table has 4 new scope-related rows
- [ ] No duplicate rules — scope-stages doesn't duplicate the existing stage-names rule (it adds scope-specific semantics)
- [ ] All file paths in check fields point to files that exist on disk

## Edge Cases
- Existing stage-names rule overlaps with scope-stages — both are valid. stage-names covers the canonical list; scope-stages covers scope-specific stage semantics and the additional consumers that only care about scope stages.
- CLAUDE.md table formatting — ensure new rows match existing column alignment (Pattern, When Triggered, Check These, Why)
- cross-references.yaml is injected by mk-flow hook — verify the file stays parseable as YAML after additions
