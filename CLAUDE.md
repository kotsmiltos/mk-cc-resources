# mk-cc-resources — Codebase Snapshot

> Claude Code plugin marketplace: skills distributed as installable plugins.

## Architecture

```
.claude-plugin/
  marketplace.json          # Marketplace registry — lists all plugins
  plugin.json               # Root plugin metadata (mk-cc-all) — uses custom `skills` paths
                            # to discover skills inside plugins/ (no root skills/ duplication)

plugins/
  essense-flow/             # Multi-phase AI development pipeline (headline plugin)
    .claude-plugin/plugin.json
    lib/                    # 25 Node.js modules (state-machine, brief-assembly, dispatch, etc.)
    hooks/                  # context-inject.js, review-guard.js, yaml-validate.js, session-orient.js
    skills/
      elicit/               # Pitch → SPEC.md through collaborative ideation
      research/             # Multi-perspective analysis → REQ.md
      triage/               # Categorize findings, route to correct phase
      architect/            # Decide → delegate → synthesize → pack. Produces ARCH.md + task specs
      build/                # Execute task specs in dependency-ordered waves
      review/               # Adversarial QA — bug-finding + drift-finding
      verify/               # Top-down spec compliance audit
      context/              # State plumbing — init, status, next-step
      heal/                 # Pipeline self-heal from any degraded state
    commands/               # 12 slash commands (/init, /elicit, /research, etc.)
    defaults/               # config.yaml, state.yaml templates
    references/             # transitions.yaml, phase-command-map.yaml

  essense-autopilot/        # Stop-hook autopilot for essense-flow
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # Stop hook config
      autopilot.js          # Phase → command mapping, halt conditions

  session-lifecycle/        # Session continuity + workflow improvement
    .claude-plugin/plugin.json
    skills/
      handoff/              # Capture session state → .claude/handoff.md
      resume/               # Restore context from handoff, validate state
      claude-md-sync/       # Propose CLAUDE.md updates for stale sections
      retro/                # Metrics-driven retrospective (gaps before strengths)
      meta-review/          # Diagnose session friction → multi-step chains + skill friction + coverage gaps

  plugin-toolkit/           # Plugin/skill dev + maintenance toolkit
    .claude-plugin/plugin.json
    skills/
      skill-heal/           # Audit plugin's skill set against best practices
      plugin-scaffold/      # Bootstrap new plugin: dirs + cross-refs in one invocation
      version-bump/         # Cascade version updates across plugin.json + marketplace + bundle + RELEASE-NOTES
      docs-audit/           # Cross-check CLAUDE.md + README + marketplace.json vs disk state

  schema-scout/             # Data file schema exploration CLI
    .claude-plugin/plugin.json
    skills/schema-scout/
      SKILL.md
      tool/                 # Standalone Python CLI package (typer + openpyxl + rich)

  thorough-mode/            # Prompt modifiers (++, @thorough, @ship, @present)
    .claude-plugin/plugin.json
    skills/thorough-mode/
      SKILL.md

  project-note-tracker/     # Question + bug tracker with Excel backend
    .claude-plugin/plugin.json
    skills/note/
      SKILL.md
      workflows/            # init, research-question, bug, agenda, meeting, resolve, etc.
      scripts/              # tracker.py — Excel I/O via uvx --with openpyxl

  alert-sounds/             # Cross-platform audio + visual alerts
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # Stop, Notification, UserPromptSubmit hooks
      alert.py              # Platform-native beeps, notifications, taskbar flash
      config.json           # Per-event toggles (beep, sound, notify, flash)
    skills/alert-sounds/
      SKILL.md              # /alert-sounds config skill
```

Benched plugins (miltiaze, ladder-build, architect, mk-flow, safe-commit, project-structure, repo-audit) preserved on `archive/benched-plugins` branch.

## essense-flow Pipeline

The headline plugin. State machine + per-phase skills + verification discipline.

```
/init → /elicit → /research → /triage → /architect → /build → /review → /verify → complete
```

| Phase | Command | Output | Next |
|-------|---------|--------|------|
| Elicit | `/elicit` | `.pipeline/elicitation/SPEC.md` | `/research` |
| Research | `/research` | `.pipeline/requirements/REQ.md` | `/triage` or `/architect` |
| Triage | `/triage` | `.pipeline/triage/TRIAGE-REPORT.md` | Routes to earliest needed phase |
| Architecture | `/architect` | `.pipeline/architecture/ARCH.md` + task specs + sprint manifest | `/build` |
| Build | `/build` | `.pipeline/sprints/sprint-N/` completion records | `/review` |
| Review | `/review` | `.pipeline/reviews/QA-REPORT.md` | `/triage` or `/verify` |
| Verify | `/verify` | `VERIFICATION-REPORT.md` | `complete` or `/triage` |
| Heal | `/heal` | State recovery via legal transitions | Returns to correct phase |

### Hooks (all fail-soft — never block tool calls)

| Hook | Event | Purpose |
|------|-------|---------|
| context-inject.js | UserPromptSubmit + SessionStart | Surfaces phase, sprint, canonical paths, degradation warnings |
| review-guard.js | PreToolUse (Write/Edit/Bash) | Gates file modifications during review/verify phases |
| yaml-validate.js | PostToolUse (Write/Edit) | Validates YAML integrity after writes |
| session-orient.js | SessionStart | Drift check, suggests next command |

## Session Lifecycle

Five skills for cross-session continuity and workflow self-improvement.

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `/handoff` | Session end | Captures what was done, what remains, critical context, blockers → `.claude/handoff.md`. Triggers `/claude-md-sync` if CLAUDE.md stale. |
| `/resume` | Session start | Reads handoff, validates branch/pipeline state, reports discrepancies, suggests first action. Archives consumed handoffs. |
| `/claude-md-sync` | After changes | Scans git diff, identifies stale CLAUDE.md sections, proposes edits for approval. Callable standalone or by handoff. |
| `/retro` | After sprint/session | Metrics-driven retrospective. Gaps before strengths. Accepts `sprint-N`, `session`, or `all`. |
| `/meta-review` | Periodically | Diagnose session friction — multi-step workflow chains, skill friction, plugin coverage gaps. Diagnostic only. |

## Plugin Toolkit

Four composable skills for working ON plugins (not within them).

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `/skill-heal <plugin>` | Reviewing a plugin's skill quality | Dispatches parallel review agents, scores skills against rubric (Anthropic best practices + token efficiency + architecture coherence), produces per-skill scorecard + ranked fixes. Diagnostic only. |
| `/plugin-scaffold <name> <skills>` | Starting a new plugin | Generates directory tree + plugin.json + SKILL.md skeletons + marketplace.json entry + bundle update + README/CLAUDE.md additions + RELEASE-NOTES. |
| `/version-bump <plugin> <type>` | Shipping changes | Cascades version updates across plugin.json + marketplace.json + bundle + metadata + RELEASE-NOTES. Composable with `@ship`. |
| `/docs-audit [plugin\|all]` | Verifying doc consistency | Cross-checks CLAUDE.md + README + marketplace.json against disk. Finds drift, proposes fixes per file. |

Composition: `@ship` references `/version-bump` + `/docs-audit`. `/skill-heal` hints at `/docs-audit` when description quality is weak across skills.

## Cross-Reference Patterns

When changing files that follow these patterns, CHECK the related files for consistency.

| Pattern | When Triggered | Check These | Why |
|---------|---------------|-------------|-----|
| Plugin layout | Changing FORMAT of plugin.json | All `plugins/*/.claude-plugin/plugin.json` | All plugins must use same metadata format |
| SKILL.md convention | Changing section structure (XML tags, frontmatter fields) | All `plugins/*/skills/*/SKILL.md` | Shared convention across all skills |
| Marketplace registry | Adding, removing, or renaming a plugin | `.claude-plugin/marketplace.json` | Must list every plugin in `plugins/` |
| mk-cc-all bundle | Adding a new bundled plugin | `.claude-plugin/plugin.json` skills array + description | Bundle must reference new skills path |
| Workflow routing | Adding a workflow file to a skill | The skill's SKILL.md `<routing>` section | Routing table must reference new workflow |
| essense-flow hooks | Adding/changing context injection | `plugins/essense-flow/hooks/` | All 4 hooks must stay consistent |
| Session-lifecycle interop | Changing handoff output format | `plugins/session-lifecycle/skills/resume/SKILL.md` | Resume reads what handoff writes |

## Dependency Highlights

| Component | Dependencies |
|-----------|-------------|
| essense-flow | Node.js (CommonJS modules in `lib/`) |
| essense-autopilot | Node.js (reads essense-flow state) |
| session-lifecycle | None (pure SKILL.md + `!`command`` shell injection) |
| schema-scout (CLI tool) | Python >= 3.10, openpyxl >= 3.1, typer >= 0.9, rich >= 13.0 |
| thorough-mode | None (pure SKILL.md) |
| project-note-tracker | Python >= 3.10, openpyxl (via uvx) |
| alert-sounds | Python >= 3.10, stdlib only (platform-native audio/notifications) |
| Build system | hatchling (schema-scout packaging) |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags (`<objective>`, `<context>`, `<instructions>`)
- **Python source** (schema-scout) requires Python >= 3.10, uses openpyxl + typer + rich
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Metadata convention** — pipeline template outputs include a blockquote metadata block as first content. Core fields: `type`, `output_path`, `key_decisions`, `open_questions`. Format: `> **field_name:** value`
- **Session artifacts** — handoff writes to `.claude/handoff.md`, retro writes to `.planning/retros/` or `.claude/retros/`
