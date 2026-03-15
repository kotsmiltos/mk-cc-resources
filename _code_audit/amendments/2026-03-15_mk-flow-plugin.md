---
mode: amend
slug: "mk-flow-plugin"
date: "2026-03-15T14:52:02.487281+00:00"
description: "Add mk-flow unified workflow plugin with intake, state, and init skills; intent classification hook; vocabulary system; enhance ladder-build and miltiaze"
snapshot_used: CLAUDE.md
patterns_used: _code_audit/patterns.md
patterns:
  - "P1"
  - "P2"
  - "P4"
  - "P5"
primary_files:
  - "plugins/mk-flow/.claude-plugin/plugin.json"
  - "plugins/mk-flow/hooks/hooks.json"
related_files_considered:
  - ".claude-plugin/marketplace.json"
  - "plugins/ladder-build/skills/ladder-build/workflows/build-milestone.md"
  - "plugins/ladder-build/skills/ladder-build/workflows/continue.md"
  - "plugins/ladder-build/skills/ladder-build/workflows/kickoff.md"
  - "plugins/miltiaze/skills/miltiaze/SKILL.md"
  - "plugins/miltiaze/skills/miltiaze/templates/exploration-report.md"
  - "plugins/miltiaze/skills/miltiaze/workflows/full-exploration.md"
updated_files:
  - ".claude-plugin/marketplace.json"
  - "plugins/mk-flow/.claude-plugin/plugin.json"
  - "plugins/mk-flow/hooks/hooks.json"
  - "plugins/mk-flow/intent-library/defaults.yaml"
  - "plugins/mk-flow/skills/state/templates/vocabulary.yaml"
not_updated_files:
  []
integrity_check_done: true
tests_updated:
  []
docs_updated:
  []
---

## Pre-Change Cross-Cutting Analysis

**Primary target:** plugins/mk-flow/ (new plugin), .claude-plugin/marketplace.json (registry)

**Pattern(s) involved:** P1 (plugin directory layout), P2 (SKILL.md convention), P4 (marketplace registration), P5 (skill alias files)

**Canonical implementation:** plugins/alert-sounds/ and plugins/miltiaze/ for P1 layout; all existing skills for P2 convention

**Related implementations found:**
- All plugins follow P1 layout — mk-flow follows the same structure (.claude-plugin/plugin.json, skills/*/SKILL.md)
- Marketplace registry (.claude-plugin/marketplace.json) — added mk-flow entry following existing pattern
- Skill alias files (skills/*) — added intake, state, mk-flow-init following existing pattern
- ladder-build and miltiaze workflows modified to integrate with mk-flow state system

**Shared helpers/utilities impacted:**
- None — mk-flow is self-contained. Enhancements to ladder-build and miltiaze are additive (new steps, not changed logic)

---

## Add mk-flow unified workflow plugin

New plugin with 3 skills (intake, state, mk-flow-init) plus a prompt-type UserPromptSubmit hook for automatic intent classification. Intake decomposes multi-issue input into structured items with assumption tables and temporal routing. State tracks project state across sessions via STATUS.md with pause/resume workflows. Init scans existing project context (GSD, ladder-build, miltiaze, note-tracker, git) to bootstrap state. Vocabulary system maps user terms to domain concepts for disambiguation.

Enhancements to existing skills:
- ladder-build: deviation rules, goal-backward verification, STATE.md updates, amendment scan, structured plan acceptance from miltiaze, flexible milestone counts, parallelization
- miltiaze: Build Plans output for ladder-build handoff, context awareness for previous explorations, flexible solution/dimension counts

---

## Cross-Cutting Integrity Check

- [x] Patterns reviewed: P1, P2, P4, P5 — mk-flow follows all conventions
- [x] Files updated: marketplace.json, plugin.json, hooks.json, defaults.yaml, vocabulary.yaml
- [x] Files NOT updated (with justification): N/A — all code/config files covered
- [x] Tests updated: N/A — skill/workflow files, no automated tests
- [x] Docs updated: N/A — SKILL.md files are self-documenting
- [x] CLAUDE.md needs update: yes — mk-flow should be added to architecture section
- [x] patterns.md needs update: no — existing patterns apply, no new patterns introduced
