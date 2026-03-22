# Build Plan: Architect Plugin

> **End Goal:** A fully functional `architect` plugin for cc-marketplace that provides technical leadership between miltiaze (research) and ladder-build (execution). The architect skill spawns parallel perspective agents (infrastructure, interfaces, testing, security) to produce PLAN.md documents with sprint task specs, runs adversarial QA via review workflows, escalates unclear decisions to the user, and audits existing codebases. It follows the same SKILL.md + workflow + template + reference pattern as every other plugin in the marketplace.

> **Source:** artifacts/explorations/2026-03-22-architecture-design-step-exploration.md

---

## Status

- **Current milestone:** Complete
- **Completed:** 6 of 6 milestones
- **Last updated:** 2026-03-22

---

## Milestones

### Milestone 1: Plugin scaffold + SKILL.md + templates + references (M)
**Goal:** Create the full plugin directory structure with plugin.json, SKILL.md (routing for all 4 workflows), all 3 templates (plan.md, task-spec.md, audit-report.md), and all 3 references (architecture-patterns.md, sprint-management.md, team-culture.md).
**Done when:**
- `plugins/architect/.claude-plugin/plugin.json` exists with correct metadata format
- `plugins/architect/skills/architect/SKILL.md` has frontmatter, objective, essential_principles, intake, routing table for plan/review/ask/audit workflows, reference_index, workflows_index, templates_index, and success_criteria
- All 3 templates exist with complete section structures
- All 3 references exist with substantive content
- Team culture principles are in team-culture.md and referenced from SKILL.md
**Status:** completed | 2026-03-22 — All 8 files verified: plugin.json (4 required fields), SKILL.md (9 XML sections), 3 templates (plan: 7 sections, task-spec: 6 sections, audit-report: 6 perspectives + priority matrix), 3 references (team-culture, architecture-patterns, sprint-management)

### Milestone 2: Plan workflow — sprint 0 (L)
**Goal:** The core workflow that reads requirements/audit → spawns perspective agents → synthesizes into PLAN.md → creates sprint task specs. This is the hardest piece — getting the agent prompts right.
**Done when:**
- `workflows/plan.md` exists with complete step-by-step process
- Includes 4 perspective agent spawn instructions (infrastructure, interface, testing, security/quality) with role-specific prompts
- Includes synthesis step that identifies agreements, disagreements, unique insights
- Includes PLAN.md generation using the plan template
- Includes sprint task spec generation using the task-spec template
- Includes user confirmation gate before proceeding
**Depends on:** Milestone 1
**Status:** completed | 2026-03-22 — 7-step workflow with 4 parallel agent prompts (infrastructure, interface, testing, security/quality), structured synthesis (agreements/disagreements/unique insights), sprint design, escalation check, user confirmation gate, artifact save + handoff

### Milestone 3: Review workflow — post-sprint QA + reassessment (M)
**Goal:** The post-sprint workflow that reads completed work → spawns adversarial QA agents → compares to PLAN.md and requirements → amends plan → plans next sprint.
**Done when:**
- `workflows/review.md` exists with complete process
- Includes 4 QA verification agent spawn instructions (vs task specs, vs requirements, fitness functions, adversarial edge cases)
- Includes QA-REPORT.md guidance (pass/fail, issues, severity, recommended action)
- Includes autonomous corrective action for clear fixes
- Includes escalation path for critical issues
- Includes PLAN.md update step (sprint tracking, change log, risk register)
- Includes next sprint planning step
**Depends on:** Milestone 1
**Status:** completed | 2026-03-22 — 5-step workflow with 4 parallel QA agents (spec compliance, requirements alignment, fitness functions, adversarial edge cases), QA-REPORT.md structure, autonomous fix criteria, scope integrity check, reassessment + next sprint planning

### Milestone 4: Ask workflow — escalation (S)
**Goal:** The escalation workflow for unclear decisions — surface the decision, present options with recommendation, wait for user input, record in Decisions Log.
**Done when:**
- `workflows/ask.md` exists with complete process
- Identifies the unclear decision and frames it clearly
- Presents options with recommendation and rationale
- Records decision in PLAN.md Decisions Log
- Updates affected task specs
**Depends on:** Milestone 1
**Status:** completed | 2026-03-22 — 4-step workflow: identify decision, frame with options + recommendation, get user input via AskUserQuestion, record in Decisions Log + update affected artifacts

### Milestone 5: Audit workflow — existing codebase entry point (M)
**Goal:** Parallel assessment workflow for existing codebases. The entry point when there's no miltiaze exploration — assess what exists, produce actionable findings for the architect.
**Done when:**
- `workflows/audit.md` exists with complete process
- Includes 6 perspective agent spawn instructions (implementation quality, risk/vulnerability, architecture coherence, future-proofing, practice compliance, goal alignment)
- Produces AUDIT-REPORT.md using the audit-report template
- Each finding is specific and actionable (file, line, issue, recommendation)
- Includes handoff to architect plan workflow
**Depends on:** Milestone 1
**Status:** completed | 2026-03-22 — 4-step workflow with 6 parallel assessment agents, 3-scope detection (full/module/goal-alignment), cross-perspective synthesis, priority matrix, architect-ready recommended actions, handoff to plan workflow

### Milestone 6: Integration — marketplace, aliases, CLAUDE.md (S)
**Goal:** Register the architect plugin in the marketplace, create skill aliases, update CLAUDE.md architecture section.
**Done when:**
- `.claude-plugin/marketplace.json` lists the architect plugin
- `skills/architect/` exists as a copy of `plugins/architect/skills/architect/`
- CLAUDE.md architecture section updated with architect plugin entry
- `context/cross-references.yaml` updated with architect-specific rules
**Depends on:** Milestones 1-5
**Status:** completed | 2026-03-22 — marketplace.json updated (architect v0.1.0), skills/architect/ copy verified identical, CLAUDE.md architecture + dependency sections updated, cross-references.yaml has 2 new architect-specific rules

---

## Architecture Impact Summary

### Concerns touched:
- **New plugin** — `plugins/architect/` (all new files, follows existing plugin conventions)
- **Marketplace registry** — `.claude-plugin/marketplace.json` must list new plugin
- **Skill aliases** — `skills/architect/` must mirror `plugins/architect/skills/architect/`
- **Codebase documentation** — `CLAUDE.md` architecture section needs new entry
- **Cross-references** — `context/cross-references.yaml` needs architect-specific rules

### Full file manifest:
- [x] `plugins/architect/.claude-plugin/plugin.json` — plugin metadata (Milestone 1)
- [x] `plugins/architect/skills/architect/SKILL.md` — main skill definition (Milestone 1)
- [x] `plugins/architect/skills/architect/templates/plan.md` — PLAN.md template (Milestone 1)
- [x] `plugins/architect/skills/architect/templates/task-spec.md` — task spec template (Milestone 1)
- [x] `plugins/architect/skills/architect/templates/audit-report.md` — audit report template (Milestone 1)
- [x] `plugins/architect/skills/architect/references/architecture-patterns.md` — module decomposition, dependency rules (Milestone 1)
- [x] `plugins/architect/skills/architect/references/sprint-management.md` — sprint sizing, reassessment (Milestone 1)
- [x] `plugins/architect/skills/architect/references/team-culture.md` — operating principles for agent prompts (Milestone 1)
- [x] `plugins/architect/skills/architect/workflows/plan.md` — sprint 0 workflow (Milestone 2)
- [x] `plugins/architect/skills/architect/workflows/review.md` — post-sprint QA + reassessment (Milestone 3)
- [x] `plugins/architect/skills/architect/workflows/ask.md` — escalation workflow (Milestone 4)
- [x] `plugins/architect/skills/architect/workflows/audit.md` — existing codebase assessment (Milestone 5)
- [x] `.claude-plugin/marketplace.json` — add architect plugin entry (Milestone 6)
- [x] `skills/architect/` — skill alias copy (Milestone 6)
- [x] `CLAUDE.md` — architecture section update (Milestone 6)
- [x] `context/cross-references.yaml` — architect-specific rules (Milestone 6)

---

## Discovered Work

_(Items found during building that weren't in the original plan.)_

---

## Refinement Queue

_(Polish and improvement items for after core milestones.)_

---

## Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-03-22 | Solution C (architect + enhanced automation, no orchestrator) | Best balance of automation and modularity. Near-automatic via mk-flow hook routing without orchestrator complexity. Per exploration analysis. |
| 2026-03-22 | Audit lives under architect plugin, not separate | Different purpose from repo-audit (assessment vs governance). Architect uses audit findings as input. Keeps related workflows together. |
| 2026-03-22 | QA embedded in review workflow, not separate skill | QA agents get their own prompts (independence) but are orchestrated by architect. Simpler than separate skill. |
| 2026-03-22 | 6 milestones organized by verifiable capability | Following declarative-config pattern: each milestone delivers a complete capability, not individual file types. |

---

## Context Notes

- 2026-03-22: This is a declarative-config project — all deliverables are SKILL.md, workflow .md, template .md, and reference .md files. No executable code, no scripts, no dependencies.
- 2026-03-22: Existing plugin conventions: plugin.json has name/version/description/author fields. SKILL.md uses YAML frontmatter + XML section tags (objective, quick_start, essential_principles, intake, routing, reference_index, workflows_index, templates_index, success_criteria).
- 2026-03-22: The architect plugin will be the largest skill in the marketplace by file count (4 workflows vs typical 2-3). The SKILL.md routing table must handle 4 workflows clearly.
- 2026-03-22: Team culture principles from the exploration (Section 4) are the soul of the agent prompts. They must be in a reference file and explicitly included in every workflow's agent spawn instructions.
