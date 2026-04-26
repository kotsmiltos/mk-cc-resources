> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-1/task-4-templates.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** M
> **plan:** ../PLAN.md
> **key_decisions:** D2, D4, D8, D10, D13
> **open_questions:** none

# Task 4: Artifact Templates

## Goal
Create all artifact templates that define the schema for every document the pipeline produces. These templates are the contracts — every phase's output must conform to its template. Templates include YAML frontmatter with schema_version (D13) and the required sections for each artifact type.

## Context
The pipeline produces 10 artifact types. Each template lives in the skill that produces it. Per D4, only .md templates are hand-authored; .agent.md is generated via deterministic transform (implemented in Sprint 4). Per D8, brief assembly wraps inlined content in `<data-block>` delimiters. Per D10, architecture templates include FR → TASK traceability.

## Interface Specification

### Inputs
- None (defines schemas)

### Outputs
- 10 template files across skill directories

### Contracts with Other Tasks
- Sprint 3 Research skill uses requirements template
- Sprint 4 Architect skill uses architecture, task-spec, decision, fitness-function, QA templates
- Sprint 5 Build skill uses completion-report template
- Sprint 4 .md → .agent.md transform reads these templates to know which sections to strip

## Pseudocode

```
1. Create skills/research/templates/requirements.md:
   Frontmatter: artifact: requirements, schema_version: 1, produced_by: research, consumed_by: architecture
   Sections:
   - ## Project Intent (single paragraph)
   - ## Functional Requirements (FR-NNN: description + acceptance criteria as VERIFY checkboxes)
   - ## Non-Functional Requirements (NFR-NNN: same structure)
   - ## Constraints (positive-only phrasing)
   - ## Risks (RISK-NNN: description, severity, mitigation)
   - ## Unresolved Disagreements (from research synthesis — perspectives + why it matters)
   - ## Source Perspectives (which lenses contributed, what each uniquely surfaced)

2. Create skills/architect/templates/architecture.md:
   Frontmatter: artifact: architecture, schema_version: 1, produced_by: architecture, consumed_by: build+review
   Sections:
   - ## System Overview (paragraph + ASCII/mermaid diagram)
   - ## Module Definitions (name, responsibility, public interface signatures, dependencies)
   - ## Interface Contracts (caller, callee, method signature, input/output/error schemas, invariants)
   - ## Dependency Order (topological sort, tier labels)
   - ## Requirement Traceability (FR-NNN → TASK-NNN mapping per D10)
   - ## Sprint Plan (ordered sprints with task IDs and grouping rationale)
   - ## Decisions Referenced (DEC-IDs with one-line summaries)

3. Create skills/architect/templates/task-spec.md:
   Frontmatter: artifact: task-spec, schema_version: 1, id: TASK-NNN, sprint: NN, module: name,
                depends_on: [], decisions_applied: []
   Sections:
   - ## Objective (what "done" looks like)
   - ## Interfaces (exact typed function signatures)
   - ## Pseudocode (step-by-step, mechanical translation to code)
   - ## Constraints (positive-only, decisions inlined)
   - ## Acceptance Criteria (categorized: Functional, Error Path, Boundary, Contract, Fitness)
   - ## Edge Cases (specific scenarios with correct behavior)
   - ## Files to Create/Modify (explicit paths)
   NOTE: sections marked [RATIONALE] are stripped during .agent.md generation.
   Include: ## Rationale (why this approach), ## Alternatives Considered

4. Create skills/architect/templates/decision-record.md:
   Frontmatter: artifact: decision, schema_version: 1, id: DEC-NNN, status: decided,
                decided_at: ISO-8601, phase: which-phase, tags: []
   Sections:
   - ## Decision (one sentence)
   - ## Context (forcing function)
   - ## Alternatives Considered (name, pros, cons for each)
   - ## Rationale (why this choice won)
   - ## Consequences (what this enables/constrains)

5. Create skills/architect/templates/fitness-function.yaml:
   Schema:
     schema_version: 1
     id: FIT-NNN
     name: descriptive name
     type: static | runtime | structural
     assertion: machine-checkable statement
     check_command: shell command (MUST be from allowlist per D7)
     applies_to: [module names or "all"]
     created_by: DEC-NNN
     severity: blocking | warning

6. Create skills/architect/templates/qa-report.md:
   Frontmatter: artifact: qa-report, schema_version: 1, sprint: NN, verdict: pass|fail|pass-with-issues
   Sections:
   - ## Acceptance Criteria Verification (per-task, per-criterion: PASS/FAIL + evidence)
   - ## Requirements Alignment (FR/NFR IDs checked against code)
   - ## Fitness Function Results (FIT-ID: pass/fail + evidence)
   - ## Adversarial Findings (numbered: severity, description, reproduction, affected files)
   - ## Auto-Fixed Issues (before/after)
   - ## Escalations (issues requiring user decision)
   Sentinel: <!-- QA_SENTINEL sprint:NN verdict:X critical:N major:N minor:N -->

7. Create skills/build/templates/completion-report.md:
   Frontmatter: artifact: completion-report, schema_version: 1, sprint: NN
   Sections:
   - ## Tasks Completed (TASK-ID: files created/modified, acceptance pass/fail, deviations)
   - ## Tasks Blocked (TASK-ID: blocker, suggested resolution)
   - ## Overflow Detected (files exceeding threshold)
   - ## Fitness Function Self-Check (FIT-ID: pass/fail)
   Sentinel: <!-- COMPLETION_SENTINEL sprint:NN tasks_attempted:N completed:N blocked:N -->

8. Create skills/build/templates/task-completion.yaml:
   Schema:
     schema_version: 1
     task_id: TASK-NNN
     status: complete | blocked | overflow
     files_written: []
     acceptance_results:
       - criterion: "VERIFY: ..."
         result: pass | fail
         evidence: one-line
     deviations: []

9. Create skills/context/templates/rules.yaml:
   (Inherits structure from mk-flow's rules.yaml — what/why/when/check_for per rule)
   Frontmatter: schema_version: 1, _meta: {defaults_version, last_synced}

10. Create skills/context/templates/vocabulary.yaml + cross-references.yaml:
    (Inherits from mk-flow — terms map for vocab, rules map for cross-refs)
    Frontmatter: schema_version: 1
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `skills/research/templates/requirements.md` | CREATE | Requirements document template |
| `skills/architect/templates/architecture.md` | CREATE | Architecture document template |
| `skills/architect/templates/task-spec.md` | CREATE | Leaf task spec template |
| `skills/architect/templates/decision-record.md` | CREATE | Decision record template |
| `skills/architect/templates/fitness-function.yaml` | CREATE | Fitness function definition template |
| `skills/architect/templates/qa-report.md` | CREATE | QA report template |
| `skills/build/templates/completion-report.md` | CREATE | Sprint completion report template |
| `skills/build/templates/task-completion.yaml` | CREATE | Per-task completion evidence template |
| `skills/context/templates/rules.yaml` | CREATE | Behavioral rules template |
| `skills/context/templates/vocabulary.yaml` | CREATE | Term disambiguation template |
| `skills/context/templates/cross-references.yaml` | CREATE | Change coupling rules template |

## Acceptance Criteria

- [ ] All 11 template files exist at their specified paths
- [ ] Every template with YAML frontmatter parses without error
- [ ] Every template contains `schema_version: 1` in frontmatter
- [ ] Requirements template has FR-NNN and NFR-NNN patterns with VERIFY checkboxes
- [ ] Architecture template includes a Requirement Traceability section (D10)
- [ ] Task-spec template has categorized acceptance criteria (Functional, Error Path, Boundary, Contract, Fitness)
- [ ] Task-spec template marks rationale sections with [RATIONALE] tag for .agent.md stripping
- [ ] Fitness function template enforces `check_command` field with a comment about allowlist-only (D7)
- [ ] QA report template includes a sentinel format specification
- [ ] Completion report template includes a sentinel format specification
- [ ] Rules, vocabulary, and cross-references templates have the same field structure as mk-flow's originals
- [ ] No template contains hardcoded paths or project-specific values — all use placeholder tokens

## Edge Cases

- Template placeholders must use a consistent syntax (e.g., `{{PLACEHOLDER}}`) that the brief assembly can detect unresolved tokens
- YAML templates (.yaml) and Markdown templates (.md) need different frontmatter conventions — YAML uses inline comments, Markdown uses `---` fences
- Templates that include sentinel specifications must document the exact regex the parser will use
