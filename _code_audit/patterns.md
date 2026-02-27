# Pattern Index

Structural patterns, touch points, and semantic map for the mk-cc-resources repository.

## Patterns

### P1: Plugin Directory Layout

Every plugin follows a standard directory structure:

```
plugins/<name>/
  .claude-plugin/
    plugin.json              # Minimal metadata (name, description, version)
  skills/
    <skill-name>/
      SKILL.md               # Skill definition (YAML frontmatter + XML sections)
      references/            # Background/framework documents (optional)
      templates/             # Output templates (optional)
      workflows/             # Step-by-step execution workflows (optional)
```

**Touch points:**
- `plugins/schema-scout/.claude-plugin/plugin.json`
- `plugins/miltiaze/.claude-plugin/plugin.json`
- `plugins/ladder-build/.claude-plugin/plugin.json`
- `plugins/repo-audit/.claude-plugin/plugin.json`

**Anomaly:** `plugins/project-structure/` lacks `.claude-plugin/plugin.json` — it has only `skills/project-structure/SKILL.md`. This means it cannot be installed as a standalone plugin through the marketplace; it's only available via the root `mk-cc-all` bundle.

---

### P2: SKILL.md Convention

All skill definitions use a consistent format:

```yaml
---
name: skill-name
description: One-line purpose
---
```

Followed by XML-like section tags:

| Section | Purpose | Present in |
|---------|---------|-----------|
| `<essential_principles>` | Philosophy and rules | miltiaze, ladder-build, schema-scout, repo-audit |
| `<intake>` | How to gather context from the user | miltiaze, ladder-build, repo-audit |
| `<routing>` | Decision logic for workflow selection | miltiaze, ladder-build, repo-audit |
| `<reference_index>` | Table of reference documents | miltiaze, ladder-build, repo-audit |
| `<workflows_index>` | Table of workflow files | miltiaze, ladder-build, repo-audit |
| `<templates_index>` | Table of template files | miltiaze, ladder-build, repo-audit |
| `<scripts_index>` | Table of bundled portable scripts | repo-audit |

**Observation:** schema-scout's SKILL.md is tool-oriented (setup instructions, command reference). miltiaze, ladder-build, and repo-audit are process-oriented (routing to workflow files via `<routing>` section). repo-audit additionally bundles portable enforcement scripts listed in `<scripts_index>`. project-structure is the simplest — a single-step workflow embedded in SKILL.md.

---

### P3: Workflow Routing

miltiaze, ladder-build, and repo-audit all use a routing pattern in their SKILL.md:

**miltiaze routes to:**
- `workflows/full-exploration.md` — Complete multi-dimensional research
- `workflows/drill-deeper.md` — Focused deep-dive into a specific dimension

**ladder-build routes to:**
- `workflows/kickoff.md` — New project, define end goal and milestones
- `workflows/build-milestone.md` — Build and verify one milestone
- `workflows/continue.md` — Resume an existing build plan

**repo-audit routes to:**
- `workflows/audit.md` — Full repo audit (setup enforcement, inventory, reports, snapshot)
- `workflows/amend.md` — Code change with cross-cutting documentation and amendment record

The routing section contains decision logic (if/then conditions) that Claude evaluates at runtime based on user intent and context.

---

### P4: Marketplace Registration

`.claude-plugin/marketplace.json` is the central registry:

```json
{
  "plugins": [
    { "name": "schema-scout",  "source": "./plugins/schema-scout" },
    { "name": "miltiaze",      "source": "./plugins/miltiaze" },
    { "name": "ladder-build",  "source": "./plugins/ladder-build" },
    { "name": "repo-audit",   "source": "./plugins/repo-audit" },
    { "name": "mk-cc-all",    "source": "./" }
  ]
}
```

The `mk-cc-all` entry uses `"./"` as its source, meaning it resolves to the repo root which has its own `.claude-plugin/plugin.json` and the `skills/` alias layer.

---

### P5: Skill Alias Files

The root `skills/` directory contains lightweight alias files:

| File | Content | Type |
|------|---------|------|
| `skills/ladder-build` | `../plugins/ladder-build/skills/ladder-build` | Text file (relative path) |
| `skills/miltiaze` | `../plugins/miltiaze/skills/miltiaze` | Text file (relative path) |
| `skills/schema-scout` | `../plugins/schema-scout/skills/schema-scout` | Text file (relative path) |
| `skills/repo-audit` | `../plugins/repo-audit/skills/repo-audit` | Text file (relative path) |
| `skills/project-structure/` | Contains `SKILL.md` directly | Directory |

This alias layer allows the root `mk-cc-all` plugin to expose all skills without duplicating content. The inconsistency (project-structure is a directory while others are text files) reflects its lack of a standalone plugin wrapper.

---

## Semantic Map

```
marketplace.json
  └─ registers plugins
       ├─ schema-scout  ──> Python CLI tool (analyzer, readers, models, CLI, index_io)
       ├─ miltiaze       ──> Research framework (dimensions → exploration → report)
       ├─ ladder-build   ──> Build framework (goal → milestones → verify → report)
       ├─ repo-audit     ──> Enforcement framework (audit → patterns → amend → validate)
       │     ├─ scripts/_audit_config.py    (shared constants)
       │     ├─ scripts/repo_audit.py       (CLI: audit + amend)
       │     └─ scripts/enforce_amendment_protocol.py  (validator)
       └─ mk-cc-all      ──> Alias bundle (skills/ directory)
            └─ skills/
                 ├─ alias → schema-scout
                 ├─ alias → miltiaze
                 ├─ alias → ladder-build
                 ├─ alias → repo-audit
                 └─ direct: project-structure
```

## Cross-Cutting Observations

1. **No shared code between skills** — each plugin is fully self-contained
2. **No tests** — schema-scout has no test suite despite being the only plugin with executable Python code
3. **No linting/formatting config** — no ruff, black, mypy, or similar tooling configured
4. **CI added** — amendment enforcer is the first and currently only CI workflow
5. **Version alignment** — root package is v1.2.0, individual plugins are v1.0.0
