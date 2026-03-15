---
name: repo-audit
description: Repo audit and cross-cutting amendment protocol. Two modes — AUDIT (read-only analysis, generates codebase snapshot + pattern index + per-file reports) and AMEND (change workflow requiring snapshot and pattern lookup consultation, producing amendment records). Enforced mechanically via pre-commit hooks and CI. Use when onboarding a new repo or when making any code change that must be tracked for cross-cutting impact.
---

<objective>
Provides two-mode repo governance: AUDIT generates a codebase snapshot and pattern index from scratch; AMEND enforces cross-cutting awareness for every code change via mechanical pre-commit and CI validation. Every commit touching code-like files must include a valid amendment record.
</objective>

<quick_start>
To audit a repo: say "audit" — routes to workflows/audit.md.
To make a tracked code change: say "amend" — routes to workflows/amend.md.
If unclear which mode, ask the user.
</quick_start>

<essential_principles>

<constraints>
1. AUDIT mode MUST NOT modify source code. It inspects, documents, and indexes only. Outputs are documentation artifacts.
2. Any commit touching code-like files MUST include a valid amendment record. Enforced by pre-commit hooks and CI.
3. AMEND mode MUST read `CLAUDE.md` (codebase snapshot) and `_code_audit/patterns.md` (pattern index) before proposing changes.
4. Before changing code, identify the primary target, find all related implementations via the pattern index, and document what you found.
5. If the cross-cutting search finds related files you chose not to update, state why in the amendment's `not_updated_files` section.
6. Every amendment MUST declare `integrity_check_done: true`.
7. Outputs are deterministic and re-runnable. Running audit mode twice produces the same structure. Amendment records are append-only.
8. Zero external dependencies. All enforcement scripts use Python stdlib only.
</constraints>

</essential_principles>

<routing>

| Signal | Mode | Workflow |
|--------|------|----------|
| "audit", "analyze", "document", "snapshot", "index the repo" | AUDIT | workflows/audit.md |
| "amend", "change", "fix", "add", "update", names files to change | AMEND | workflows/amend.md |

If unclear, ask: "Do you want to audit the repo (read-only analysis) or amend it (make a code change with cross-cutting documentation)?"

After reading the workflow, follow it exactly.

</routing>

<workflows_index>

All in `workflows/`:

| Workflow | Purpose |
|----------|---------|
| audit.md | Full repo audit — setup enforcement, inventory, scaffold, generate reports, patterns, snapshot |
| amend.md | Code change with cross-cutting documentation and amendment record |

</workflows_index>

<reference_index>

All in `references/`:

| Reference | Purpose |
|-----------|---------|
| enforcement-spec.md | How enforcement works — pre-commit hook, CI check, exclusions |
| amendment-fields.md | Required and recommended YAML fields for amendment records |

</reference_index>

<templates_index>

All in `templates/`:

| Template | Purpose |
|----------|---------|
| amendment-record.md | Full YAML + markdown structure for amendment records |

</templates_index>

<scripts_index>

Bundled enforcement files in `scripts/` (relative to this SKILL.md). These are portable templates — copied to target repos during audit setup.

| Script | Destination in target repo |
|--------|---------------------------|
| _audit_config.py | scripts/_audit_config.py |
| repo_audit.py | scripts/repo_audit.py |
| enforce_amendment_protocol.py | scripts/enforce_amendment_protocol.py |
| pre-commit-config.yaml | .pre-commit-config.yaml |
| enforce-amendment.yml | .github/workflows/enforce-amendment.yml |

</scripts_index>

<success_criteria>
The repo-audit skill succeeds when:
- AUDIT mode: all artifacts are generated (per-file reports, patterns.md, CLAUDE.md, supporting files) and enforcement is installed
- AMEND mode: a valid amendment record is committed alongside the code change, with all required fields populated and pre-commit/CI validation passing
</success_criteria>
