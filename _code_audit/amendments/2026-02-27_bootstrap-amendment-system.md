---
mode: amend
slug: "bootstrap-amendment-system"
date: "2026-02-27T00:00:00+00:00"
description: "Bootstrap the repo-audit skill, cross-cutting amendment protocol, and all enforcement tooling"
snapshot_used: CLAUDE.md
patterns_used: _code_audit/patterns.md
patterns:
  - "P1"
  - "P2"
  - "P4"
  - "P5"
primary_files:
  - "scripts/_audit_config.py"
  - "scripts/repo_audit.py"
  - "scripts/enforce_amendment_protocol.py"
related_files_considered:
  - "plugins/miltiaze/.claude-plugin/plugin.json"
  - "plugins/ladder-build/.claude-plugin/plugin.json"
  - "plugins/schema-scout/.claude-plugin/plugin.json"
  - "plugins/miltiaze/skills/miltiaze/SKILL.md"
  - "plugins/ladder-build/skills/ladder-build/SKILL.md"
  - "plugins/schema-scout/skills/schema-scout/SKILL.md"
  - "skills/ladder-build"
  - "skills/miltiaze"
  - "skills/schema-scout"
  - ".claude-plugin/marketplace.json"
  - ".claude-plugin/plugin.json"
updated_files:
  - "scripts/_audit_config.py"
  - "scripts/repo_audit.py"
  - "scripts/enforce_amendment_protocol.py"
  - ".pre-commit-config.yaml"
  - ".github/workflows/enforce-amendment.yml"
  - ".claude-plugin/marketplace.json"
  - ".claude-plugin/plugin.json"
  - "plugins/repo-audit/.claude-plugin/plugin.json"
  - "skills/repo-audit"
not_updated_files:
  - path: "plugins/miltiaze/.claude-plugin/plugin.json"
    reason: "Read-only — consulted for P1 pattern consistency, no changes needed"
  - path: "plugins/ladder-build/.claude-plugin/plugin.json"
    reason: "Read-only — consulted for P1 pattern consistency, no changes needed"
  - path: "plugins/schema-scout/.claude-plugin/plugin.json"
    reason: "Read-only — consulted for P1 pattern consistency, no changes needed"
  - path: "plugins/schema-scout/skills/schema-scout/tool/pyproject.toml"
    reason: "Schema-scout package config unchanged — audit is read-only for existing code"
integrity_check_done: true
tests_updated:
  []
docs_updated:
  - "_code_audit/README.md"
  - "_code_audit/index.md"
  - "_code_audit/patterns.md"
  - "_code_audit/plan.md"
  - "_code_audit/tooling.md"
  - "_code_audit/test_hints.md"
  - "CLAUDE.md"
---

## Pre-Change Cross-Cutting Analysis

**Primary target:** `scripts/` directory (new enforcement tooling)

**Pattern(s) involved:**
- P1 (Plugin directory layout) — new `plugins/repo-audit/` follows the same structure
- P2 (SKILL.md convention) — new `SKILL.md` follows YAML frontmatter + XML sections
- P4 (Marketplace registration) — added repo-audit to `marketplace.json`
- P5 (Skill alias files) — added `skills/repo-audit` alias file

**Canonical implementation:** `plugins/miltiaze/` (most complete plugin with all sub-directories)

**Related implementations found:**
- All 3 existing plugins follow P1 — checked each has `.claude-plugin/plugin.json`
- All 4 SKILL.md files follow P2 — checked YAML frontmatter + XML section format
- `marketplace.json` follows P4 — added new entry consistent with existing format
- `skills/` alias files follow P5 — added new alias consistent with existing format

**Shared helpers/utilities impacted:** None — this is net-new tooling

---

## Bootstrap the repo-audit skill and cross-cutting amendment protocol

This is the first commit introducing the enforcement system. It adds:

1. **Skill:** `plugins/repo-audit/` with SKILL.md defining AUDIT and AMEND modes
2. **Scripts:** `_audit_config.py` (constants), `repo_audit.py` (CLI), `enforce_amendment_protocol.py` (validator)
3. **Enforcement:** `.pre-commit-config.yaml` (local hook), `.github/workflows/enforce-amendment.yml` (CI)
4. **Audit artifacts:** `_code_audit/` directory with README, index, plan, tooling, test hints, patterns, per-file reports
5. **Snapshot:** `CLAUDE.md` with architecture map, patterns, and cross-cutting change policy
6. **Registration:** Added to `marketplace.json`, updated root `plugin.json` to v1.2.0

---

## Cross-Cutting Integrity Check

- [x] Patterns reviewed: P1, P2, P3, P4, P5
- [x] Files updated: all new files listed in updated_files above
- [x] Files NOT updated: existing plugin configs and SKILL.md files (read-only consultation)
- [x] Tests updated: N/A (no test framework exists yet)
- [x] Docs updated: CLAUDE.md, _code_audit/README.md, and all audit artifacts
- [x] CLAUDE.md needs update: yes — rewritten with full architecture and cross-cutting policy
- [x] patterns.md needs update: yes — created with 5 patterns and semantic map
