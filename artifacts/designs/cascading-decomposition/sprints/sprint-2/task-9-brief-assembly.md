> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-2/task-9-brief-assembly.md
> **sprint:** 2
> **status:** planned
> **depends_on:** T2, T4
> **estimated_size:** M
> **plan:** ../../PLAN.md
> **key_decisions:** D4, D6, D7, D9
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 9: Brief Assembly Logic + System-Map Template

## Goal
Implement the brief assembly algorithm from scope-decomposition.md as a concrete, step-by-step procedure in the workflow, and create the system-map template that the assembly reads from. The assembly takes many small files on disk and produces a single, self-contained agent brief for each spawned agent. Also fixes the required XML section validation list to be complete.

## Context
- The assembly algorithm is already specified in `references/scope-decomposition.md` (Sprint 1 T4, Steps 1-9)
- This task translates that algorithm into executable workflow instructions
- The system-map template is a Sprint 1 gap: the assembly reads `system-map.agent.md` but no template defines its format
- Read `templates/agent-brief-decompose.md` (Sprint 1 T2) — this is the target format
- Per D6: this must work for both scope/ and designs/ (backward compatibility)
- Per D4: assembly produces briefs for agents that co-author .md + .agent.md

**Bundled QA improvement:** Fix required XML section validation list in `references/scope-decomposition.md` Step 2 to include all non-optional sections.

## Interface Specification

### Inputs
- Target module/component name
- scope_root path
- Current decomposition level
- Reserved decision ID block

### Outputs
- Single assembled brief (markdown text) ready for agent spawning
- Validation report (pass/fail with details)

### Contracts with Other Tasks
- T7 calls this as Step 4 of the workflow
- T8 uses the assembled briefs to construct agent prompts
- T2 (agent brief templates) defines the output format
- T4 (scope-decomposition reference) defines the algorithm

## Pseudocode

```
SYSTEM-MAP TEMPLATE (templates/system-map.md):

Create a new template file for the system-map artifact. This is produced by the
Level 0 architecture agent and consumed by the assembly algorithm.

Template structure:

> **type:** system-map
> **scope_root:** [artifacts/scope/]
> **modules:** [count]
> **created_at:** level-0
> **key_decisions:** [decision IDs from architecture]

# System Map: [Project Name]

## Architecture Overview
[High-level description of the system. How modules connect. What the system does.]

## Module Definitions
For each module:
### [module-name]
- **Tier:** [1/2/3]
- **Purpose:** [What this module does]
- **Owns:** [Responsibilities — these become the scope for Level 1 decomposition]
- **Estimated lines:** [Implementation estimate]

## Architecture Constraints
[Hard rules that every module must follow. These get injected into every agent brief.]
- [Constraint 1]
- [Constraint 2]

## Technology Stack
[Languages, frameworks, key libraries. Agents must use only what's listed here.]

---

SYSTEM-MAP AGENT BRIEF (templates/system-map.agent.md — the .agent.md counterpart):

---
type: system-map
scope_root: "[artifacts/scope/]"
modules: [count]
source_hash: "[SHA-256 of system-map.md]"
---

<architecture_constraints>
- [Hard constraint 1]
- [Hard constraint 2]
</architecture_constraints>

<modules>
  <module name="[module-name]" tier="[1/2/3]">
    <owns>[responsibilities]</owns>
    <estimated_lines>[number]</estimated_lines>
  </module>
</modules>

<technology>
- [Language/framework/library]
</technology>

---

BRIEF ASSEMBLY PROCEDURE (embedded in workflows/scope-decompose.md Step 4):

The procedure follows scope-decomposition.md Steps 1-9 exactly.
Each step includes the specific Read/Glob commands to use.

STEP 1: Read INDEX.md
  Read {scope_root}/INDEX.md
  Extract: project name, phase, decomposition config

STEP 2: Read project brief
  Read {scope_root}/brief/project-brief.agent.md
  (Feature flow: read {scope_root}/brief/feature-brief.agent.md instead)
  Extract first 3-5 sentences as project summary

STEP 3: Read system map
  Read {scope_root}/architecture/system-map.agent.md
  Extract <architecture_constraints> section content

STEP 4: Find relevant contracts
  Glob {scope_root}/architecture/contracts/*--{target}.md
  Glob {scope_root}/architecture/contracts/{target}--*.md
  (Note: exact suffix match on first pattern to prevent false matches per QA fix)
  Read each matching file, extract interface definitions

STEP 5: Find relevant patterns
  Read each file in {scope_root}/architecture/patterns/*.md
  Check applies_to field in metadata
  Include if applies_to is "all" OR includes {target}
  If no patterns match: omit <patterns> section entirely

STEP 6: Find relevant decisions
  Read each file in {scope_root}/architecture/decisions/D*.md
  SKIP decisions with status starting with "superseded-by-" (per QA fix)
  Check modules_affected field
  Include if {target} is listed
  Extract decision ID + outcome only (no rationale)

STEP 7: Read parent scope (level > 0)
  Level 1: read {scope_root}/modules/{parent}/overview.agent.md
  Level 2: read {scope_root}/modules/{parent-module}/components/{parent}/spec.agent.md
  Level 3+: follow the recursive components/ path

STEP 8: Assemble in section order
  a. YAML frontmatter (type, purpose, target, level, scope_root, source_hash)
  b. <context> (project summary + architecture constraints)
  c. <scope> (from parent or system-map entry)
  d. <interfaces> (from contracts)
  e. <patterns> (from pattern files, omit if empty)
  f. <decisions> (from decision files, omit if empty)
  g. <task> (decomposition instructions with stopping criteria)
  h. <output_format> (file paths and naming conventions)

STEP 9: Validate
  - All decision IDs referenced exist in architecture/decisions/
  - All contract modules exist in INDEX.md
  - source_hash of each referenced .agent.md matches its sibling .md
  - No orphaned references
  If validation fails: report error, do not spawn agent
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/architect/skills/architect/templates/system-map.md` | CREATE | System-map template (human-facing + .agent.md format) |
| `plugins/architect/skills/architect/workflows/scope-decompose.md` | MODIFY | Fill in Step 4 (brief assembly) section with the assembly procedure |
| `plugins/architect/skills/architect/references/scope-decomposition.md` | MODIFY | Fix required XML section validation list in Step 2: decomposition briefs require `<context>`, `<scope>`, `<interfaces>`, `<patterns>`, `<decisions>`, `<task>`, `<output_format>`; implementation briefs require `<constraint>`, `<read_first>`, `<interface>`, `<files>`, `<verify>`, `<contract>` |

## Acceptance Criteria
- [ ] System-map template exists at `templates/system-map.md`
- [ ] System-map template includes both human (.md) and agent (.agent.md) format definitions
- [ ] System-map .agent.md format includes `<architecture_constraints>`, `<modules>`, `<technology>` sections
- [ ] Each module in system-map has: name, tier, owns, estimated_lines
- [ ] Brief assembly procedure is embedded in scope-decompose.md Step 4
- [ ] Assembly follows all 9 steps from scope-decomposition reference
- [ ] Step 4 glob uses exact suffix match (`*--{target}.md` not `*--{target}*`)
- [ ] Step 6 filters superseded decisions (status check)
- [ ] Step 9 validates source_hash of referenced .agent.md files
- [ ] Required XML section validation list in scope-decomposition.md is updated to include all non-optional sections for both brief types
- [ ] Assembly handles feature flow (reads feature-brief.agent.md instead of project-brief.agent.md)
- [ ] Assembly handles level 0 differently (reads from system-map, not parent module)

## Edge Cases
- No contracts for target module: `<interfaces>` section says "No cross-module interfaces"
- No patterns apply: `<patterns>` section omitted entirely (not empty)
- No decisions apply: `<decisions>` section omitted entirely
- Feature flow: reads feature-brief.agent.md, falls back to project-brief.agent.md
- Level 0: Step 7 skipped (no parent scope to read)
- source_hash mismatch: report stale .agent.md, do not assemble

## Notes
- The system-map template fills a Sprint 1 gap flagged by QA Agent 4 (adversarial scenario #19).
- The required section list fix addresses QA finding M3 — currently 3 sections listed, should be 7 for decomposition and 6 for implementation.
