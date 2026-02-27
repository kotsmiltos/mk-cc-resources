---
name: repo-audit
description: Repo audit and cross-cutting amendment protocol. Two modes — AUDIT (read-only analysis, generates codebase snapshot + pattern index + per-file reports) and AMEND (change workflow requiring snapshot and pattern lookup consultation, producing amendment records). Enforced mechanically via pre-commit hooks and CI.
---

<essential_principles>

Every code change ripples. A fix in one file may have siblings, cousins, and dependents elsewhere. The amendment protocol forces you to look before you leap — read the codebase snapshot, consult the pattern index, find all related implementations, then change what needs changing and document what you left alone (and why).

1. **Audit is read-only.** AUDIT mode inspects, documents, and indexes. It never modifies source code. The outputs are documentation artifacts, not code patches.

2. **Amendments are mandatory.** Any commit touching code-like files must include a valid amendment record. Enforced by pre-commit hooks and CI — not by honor system.

3. **Read before writing.** AMEND mode requires reading `CLAUDE.md` (codebase snapshot) and `_code_audit/patterns.md` (pattern index) before proposing changes.

4. **Cross-cutting analysis first.** Before changing code, identify the primary target, find all related implementations via the pattern index, and document what you found.

5. **Justify what you don't change.** If the cross-cutting search finds related files you chose not to update, state why in the amendment's `not_updated_files` section.

6. **Integrity check is non-optional.** Every amendment must declare `integrity_check_done: true`.

7. **Outputs are deterministic and re-runnable.** Running audit mode twice produces the same structure. Amendment records are append-only.

8. **Zero external dependencies.** All enforcement scripts use Python stdlib only.

</essential_principles>

<intake>

Determine which mode the user needs:

If the user says "audit", "analyze", "document the repo", "generate snapshot", or invokes without specifying a change target:
- They want **AUDIT mode**

If the user says "amend", "change", "fix", "add", "modify", "update", or names specific files to change:
- They want **AMEND mode**

If unclear, ask:
"Do you want to audit the repo (read-only analysis) or amend it (make a code change with cross-cutting documentation)?"

</intake>

<routing>

| Signal | Mode | Workflow |
|--------|------|----------|
| "audit", "analyze", "document", "snapshot", "index the repo" | AUDIT | workflows/audit.md |
| "amend", "change", "fix", "add", "update", names files to change | AMEND | workflows/amend.md |

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
