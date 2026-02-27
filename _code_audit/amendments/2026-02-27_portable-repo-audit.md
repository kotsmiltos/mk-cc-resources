---
mode: amend
slug: "portable-repo-audit"
date: "2026-02-27T00:03:08.609966+00:00"
description: "Make repo-audit a portable, marketplace-installable skill"
snapshot_used: CLAUDE.md
patterns_used: _code_audit/patterns.md
patterns:
  - "P1"
  - "P2"
  - "P4"
  - "P5"
primary_files:
  - "plugins/repo-audit/skills/repo-audit/SKILL.md"
related_files_considered:
  - "plugins/schema-scout/skills/schema-scout/SKILL.md"
  - "plugins/miltiaze/skills/miltiaze/SKILL.md"
  - "plugins/ladder-build/skills/ladder-build/SKILL.md"
  - "scripts/_audit_config.py"
  - "scripts/repo_audit.py"
  - "scripts/enforce_amendment_protocol.py"
updated_files:
  - "plugins/repo-audit/.claude-plugin/plugin.json"
  - "plugins/repo-audit/skills/repo-audit/SKILL.md"
  - "plugins/repo-audit/skills/repo-audit/scripts/_audit_config.py"
  - "plugins/repo-audit/skills/repo-audit/scripts/repo_audit.py"
  - "plugins/repo-audit/skills/repo-audit/scripts/enforce_amendment_protocol.py"
  - "plugins/repo-audit/skills/repo-audit/scripts/pre-commit-config.yaml"
  - "plugins/repo-audit/skills/repo-audit/scripts/enforce-amendment.yml"
  - ".pre-commit-config.yaml"
  - ".claude-plugin/marketplace.json"
  - ".claude-plugin/plugin.json"
  - "scripts/_audit_config.py"
  - "scripts/repo_audit.py"
  - "scripts/enforce_amendment_protocol.py"
  - "skills/repo-audit"
not_updated_files:
  - path: "plugins/schema-scout/skills/schema-scout/SKILL.md"
    reason: "Different skill — reviewed for portability pattern (uses ./tool/ relative path), no changes needed."
  - path: "plugins/miltiaze/skills/miltiaze/SKILL.md"
    reason: "Different skill — pure instruction-driven, no bundled files pattern to align."
  - path: "plugins/ladder-build/skills/ladder-build/SKILL.md"
    reason: "Different skill — pure instruction-driven, no bundled files pattern to align."
integrity_check_done: true
tests_updated:
  []
docs_updated:
  []
---

## Pre-Change Cross-Cutting Analysis

**Primary target:** plugins/repo-audit/skills/repo-audit/SKILL.md

**Pattern(s) involved:** P1 (plugin directory layout — adding enforcement/ subdirectory), P2 (SKILL.md convention — adding setup step and direct fallback)

**Canonical implementation:** P1 is defined by the standard plugins/*/skills/*/ layout. schema-scout established the precedent of bundling tool files alongside SKILL.md (tool/ directory). This change follows the same pattern with enforcement/.

**Related implementations found:**
- schema-scout: bundles `tool/` next to SKILL.md, installs via `uv tool install ./tool/`
- miltiaze, ladder-build: pure instruction-driven, no bundled files — no alignment needed
- scripts/_audit_config.py, scripts/repo_audit.py, scripts/enforce_amendment_protocol.py: this repo's own enforcement scripts — the bundled copies are independent templates

**Shared helpers/utilities impacted:**
None. The bundled enforcement/ files are copies of the repo-root scripts/ files, adapted for portability (dynamic branch detection, python3 default). The repo-root scripts are unchanged and continue to work for this repo's own enforcement.

---

## Make repo-audit a portable, marketplace-installable skill

The repo-audit SKILL.md previously told Claude to run `python scripts/repo_audit.py` — scripts that only exist in this repo. When someone installed the skill into a different project, those scripts wouldn't be there.

Changes:
1. Bundle enforcement scripts as `enforcement/` directory next to SKILL.md (5 files: _audit_config.py, repo_audit.py, enforce_amendment_protocol.py, pre-commit-config.yaml, enforce-amendment.yml)
2. Add Step 0 to audit workflow: copies bundled files into target repo's scripts/, merges pre-commit hook, adapts CI workflow branch
3. Add direct amendment creation fallback in AMEND mode so it works without the CLI installed
4. Pre-commit config merge instead of overwrite (preserves existing hooks)
5. Auto-detect default branch instead of hardcoding origin/main
6. Use python3 with fallback to python for cross-platform support
7. Explicit "relative to this SKILL.md" path resolution for the enforcement/ directory

---

## Cross-Cutting Integrity Check

- [x] Patterns reviewed: P1 (checked all plugin directory layouts), P2 (checked all SKILL.md conventions)
- [x] Files updated: plugin.json, SKILL.md, enforcement/_audit_config.py, enforcement/repo_audit.py, enforcement/enforce_amendment_protocol.py, enforcement/pre-commit-config.yaml, enforcement/enforce-amendment.yml
- [x] Files NOT updated (with justification): scripts/ (this repo's own copies, independent), other skills' SKILL.md files (different skills, no alignment needed)
- [x] Tests updated: N/A — no test suite exists for enforcement scripts
- [x] Docs updated: N/A — SKILL.md is both the skill definition and documentation
- [x] CLAUDE.md needs update: yes — architecture tree should show new repo-audit structure
- [x] patterns.md needs update: yes — P1 touch points should note enforcement/ as a variation
