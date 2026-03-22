# mk-cc-resources — Codebase Snapshot

> Claude Code plugin marketplace: skills distributed as installable plugins.

## Architecture

```
.claude-plugin/
  marketplace.json          # Marketplace registry — lists all plugins
  plugin.json               # Root plugin metadata (mk-cc-all) — uses custom `skills` paths
                            # to discover skills inside plugins/ (no root skills/ duplication)

plugins/
  schema-scout/             # Data file schema exploration CLI
    .claude-plugin/plugin.json
    skills/schema-scout/
      SKILL.md
      tool/                 # Standalone Python CLI package
        pyproject.toml
        schema_scout/
          __init__.py       # Package version
          analyzer.py       # Core schema analysis engine
          cli.py            # Typer CLI entrypoint
          index_io.py       # Index serialization (JSON)
          models.py         # SchemaNode, FieldStats dataclasses
          readers.py        # XLSX / CSV / JSON file readers

  miltiaze/                 # Multi-dimensional idea exploration
    .claude-plugin/plugin.json
    skills/miltiaze/
      SKILL.md
      references/           # research-dimensions.md, presentation-standards.md
      templates/            # exploration-report.md
      workflows/            # full-exploration.md, drill-deeper.md

  ladder-build/             # Incremental build pipeline
    .claude-plugin/plugin.json
    skills/ladder-build/
      SKILL.md
      references/           # milestone-design.md, verification-standards.md, impact-analysis.md
      templates/            # build-plan.md, milestone-report.md
      workflows/            # kickoff.md, build-milestone.md, continue.md

  mk-flow/                  # Unified workflow system — intent detection, state, intake
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # UserPromptSubmit hook config
      intent-inject.sh      # Reads stdin JSON, injects context (intents, state, vocab, xrefs, rules)
    defaults/
      rules.yaml            # Default behavioral rules shipped with plugin
    intent-library/
      defaults.yaml         # Default intents shipped with mk-flow
    skills/
      intake/               # Dense input decomposition + assumption tables
        SKILL.md
        references/         # parsing-rules.md
        templates/          # assumption-table.md
      state/                # Per-project state tracking + session continuity
        SKILL.md
        workflows/          # status.md, pause.md, resume.md
        templates/          # state.md, continue-here.md, vocabulary.yaml, cross-references.yaml
        scripts/            # drift-check.sh — detects state/codebase drift
      mk-flow-init/         # Project setup with context scanning
        SKILL.md
      mk-flow-update/       # Sync latest plugin defaults (rules, intents, cross-references) into project
        SKILL.md
      mk-flow-update-rules/ # DEPRECATED — superseded by mk-flow-update/
        SKILL.md

  alert-sounds/             # Cross-platform audio + visual alerts for Claude Code events
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # Stop, Notification (permission_prompt + idle_prompt matchers), UserPromptSubmit (clear state) hooks
      alert.py              # Main hook script — beeps, notifications, taskbar flash
      config.json           # User config — volume, mute, per-event toggles
      statusline.sh         # Status line integration
      notify_windows.ps1    # Windows notification helper
    skills/alert-sounds/
      SKILL.md              # /alert-sounds config skill

  safe-commit/              # Secret scanning + identity verification before commits
    .claude-plugin/plugin.json
    skills/safe-commit/
      SKILL.md
      references/           # commit-checks.md, secret-patterns.md
      scripts/              # scan-secrets.sh

  project-note-tracker/     # Question + bug tracker with Excel backend
    .claude-plugin/plugin.json
    skills/note/
      SKILL.md
      workflows/            # init, research-question, bug, bugs, investigate, agenda,
                            # meeting, review, resolve, quick, add-handler, dump, doctor
      scripts/              # tracker.py — Excel I/O via uvx --with openpyxl

  project-structure/        # Project structure mapping
    .claude-plugin/plugin.json
    skills/project-structure/
      SKILL.md

  repo-audit/               # Repo audit (distributable skill for other repos)
    .claude-plugin/plugin.json
    skills/repo-audit/
      SKILL.md
      workflows/            # audit.md, amend.md
      references/           # enforcement-spec.md, amendment-fields.md
      templates/            # amendment-record.md
      scripts/              # Portable enforcement files (copied to target repos)

  architect/                # Multi-agent technical leadership
    .claude-plugin/plugin.json
    skills/architect/
      SKILL.md
      workflows/            # plan.md, review.md, ask.md, audit.md
      templates/            # plan.md, task-spec.md, audit-report.md
      references/           # architecture-patterns.md, sprint-management.md, team-culture.md

context/                    # Per-project mk-flow context (created by /mk-flow-init)
  STATE.md                  # Living project state — current focus, done, blocked, next
  rules.yaml                # Behavioral corrections — injected every message by hook
  vocabulary.yaml           # Term disambiguation — auto-populated from corrections
  cross-references.yaml     # "Change X, also check Y" — grows from corrections
  notes/                    # Auto-saved analysis and forward-notes
```

## mk-flow Context Injection

The mk-flow hook (`intent-inject.sh`) runs on every UserPromptSubmit and injects 5 context files into the conversation as a system-reminder:

| File | Tag | Purpose |
|------|-----|---------|
| `.claude/mk-flow/intents.yaml` | `<intents_config>` | Intent definitions + corrections for classification |
| `context/STATE.md` | `<project_state>` | Current project state |
| `context/vocabulary.yaml` | `<vocabulary>` | Term disambiguation |
| `context/cross-references.yaml` | `<cross_references>` | Change consistency rules |
| `context/rules.yaml` | `<rules>` | Hard behavioral rules — unconditional |

The hook reads the prompt from stdin JSON, skips short messages (<2 chars) and slash commands. Classification is done inline by the main Claude, not by a separate API call.

## Pipeline: miltiaze → architect → ladder-build

The full automated dev team pipeline:

```
NEW PROJECT:      /miltiaze (requirements mode) → /architect (plan) → /ladder-build (execute) → /architect (review) → loop
EXISTING PROJECT: /architect audit → /architect (plan) → /ladder-build (execute) → /architect (review) → loop
STANDALONE:       /miltiaze (exploration) → /ladder-build (kickoff) — existing standalone flow, still works
```

| Stage | Skill | Mode | Output | Next |
|-------|-------|------|--------|------|
| Research | miltiaze | `workflows/requirements.md` | `artifacts/explorations/*-requirements.md` | /architect |
| Audit | architect | `workflows/audit.md` | `artifacts/audits/*-audit-report.md` | /architect |
| Design | architect | `workflows/plan.md` | `artifacts/designs/[slug]/PLAN.md` + sprint task specs | /ladder-build |
| Execute | ladder-build | `workflows/execute.md` | `artifacts/designs/[slug]/sprints/sprint-N/COMPLETION.md` | /architect |
| Review | architect | `workflows/review.md` | `artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md` | /ladder-build (next sprint) |

mk-flow tracks pipeline position in STATE.md and suggests the next skill based on the current stage.

## Cross-Reference Patterns

When changing files that follow these patterns, CHECK the related files for consistency. Only modify them if actually broken by your change.

| Pattern | When Triggered | Check These | Why |
|---------|---------------|-------------|-----|
| Plugin layout | Changing the FORMAT of plugin.json | All `plugins/*/.claude-plugin/plugin.json` | All plugins must use same metadata format |
| SKILL.md convention | Changing section structure (adding/removing XML tags) | All `plugins/*/skills/*/SKILL.md` | Shared convention across all skills |
| Marketplace registry | Adding, removing, or renaming a plugin | `.claude-plugin/marketplace.json` | Must list every plugin in `plugins/` |
| Workflow routing | Adding a workflow file to a skill | The skill's SKILL.md `<routing>` section | Routing table must reference the new workflow |
| mk-flow hook | Adding a new context file type (like rules.yaml) | `plugins/mk-flow/hooks/intent-inject.sh` | Hook script must read and inject the new file |
| mk-flow init | Adding a new context file type | `plugins/mk-flow/skills/mk-flow-init/SKILL.md` | Init must create the new file |

Per-project cross-references live in `context/cross-references.yaml` (created by mk-flow init, grows from corrections).

## Dependency Highlights

| Component | Dependencies |
|-----------|-------------|
| schema-scout (CLI tool) | Python >= 3.10, openpyxl >= 3.1, typer >= 0.9, rich >= 13.0 |
| miltiaze, ladder-build, project-structure, mk-flow, architect | None (pure SKILL.md + markdown workflows) |
| mk-flow hook | bash, one of: jq / python3 / python (for JSON parsing) |
| alert-sounds | Python >= 3.10, stdlib only (platform-native audio/notifications) |
| project-note-tracker | Python >= 3.10, openpyxl (via uvx) |
| safe-commit | bash |
| repo-audit (enforcement scripts) | Python >= 3.10, stdlib only |
| Build system | hatchling (schema-scout packaging) |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags
- **Python source** (schema-scout) requires Python >= 3.10, uses openpyxl + typer + rich
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Behavioral corrections** go in `context/rules.yaml` (hook-injected), not auto-memory files

## Adopting Architecture-Aware Builds in Your Projects

ladder-build now traces cross-file dependencies and protects against context degradation. mk-flow-init can bootstrap cross-references from your CLAUDE.md. Here's how to get these working.

### New project (mk-flow not yet initialized)

Just run `/mk-flow-init`. It will:
1. Scan your CLAUDE.md for a **Change Impact Map** section (tables with "Touch" / "Also update" columns)
2. Convert those tables into `context/cross-references.yaml` rules automatically
3. Set up STATE.md, vocabulary, rules — the full mk-flow context

Then use `/ladder-build` to start building. The kickoff workflow will read your impact map and cross-references, build a file manifest, and shape milestones around coupled files.

### Existing project (mk-flow already initialized)

If you already ran `/mk-flow-init` before this update, your `context/cross-references.yaml` exists but doesn't have rules from your CLAUDE.md Change Impact Map. Two options:

**Option A — Re-init (recommended if cross-references.yaml has few manual rules):**
Delete `context/cross-references.yaml` and run `/mk-flow-init` again. It's idempotent — it won't overwrite your STATE.md, intents, or other context files. It will only recreate missing files, and cross-references.yaml will now include rules parsed from your CLAUDE.md.

**Option B — Manual merge (if cross-references.yaml has valuable manual rules you want to keep):**
The init won't overwrite existing cross-references.yaml. To get the impact map rules added:
1. Open your CLAUDE.md and find the Change Impact Map section
2. For each concern table, add a rule to `context/cross-references.yaml` following this format:
   ```yaml
   rules:
     concern-slug:
       when: "description of what triggers this rule"
       check:
         - "file/path.py — reason"
       source: "CLAUDE.md Change Impact Map"
   ```

### Project with no Change Impact Map in CLAUDE.md

Everything still works — the impact analysis falls back to manual import/consumer discovery per-milestone. To get the full benefit, add a Change Impact Map to your CLAUDE.md:

```markdown
## Change Impact Map

### Concern Name
| Touch | Also update |
|---|---|
| `path/file.py` — what it does | `path/coupled.py` (reason), `path/other.py` (reason) |
```

Then re-run `/mk-flow-init` (delete cross-references.yaml first) to bootstrap the rules.

### What changes in ladder-build behavior

After this update, `/ladder-build` automatically:
- **Kickoff**: Reads your impact map, builds a full file manifest, ensures coupled files stay in the same milestone
- **Each milestone**: Traces impact before building, checks context health before verifying, verifies all coupled files were updated
- **Completion**: Reassembly verification — checks every file in the manifest, re-verifies original intent, detects silent scope reduction
- **Context fatigue**: If the session is getting stale, saves progress and hands off cleanly instead of producing degraded work
