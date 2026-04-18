# mk-cc-resources

Custom Claude Code plugins — multi-agent architecture, workflow orchestration, data exploration, multi-dimensional research, incremental build pipelines, repo auditing, project question tracking, cross-platform alerts, and multi-phase development pipelines.

## Quick Start

```bash
# Add the marketplace (one time)
claude plugin marketplace add https://github.com/kotsmiltos/mk-cc-resources

# Install all skills (miltiaze, ladder-build, architect, schema-scout, etc.)
claude plugin install mk-cc-all

# Install hook-based plugins separately (they need their own plugin root)
claude plugin install mk-flow
claude plugin install alert-sounds
claude plugin install essense-flow
```

### Install skills individually

```bash
claude plugin install miltiaze
claude plugin install ladder-build
claude plugin install architect
claude plugin install schema-scout
claude plugin install safe-commit
claude plugin install project-structure
claude plugin install repo-audit
claude plugin install project-note-tracker
claude plugin install mk-flow          # has hooks — must be installed separately
claude plugin install alert-sounds     # has hooks — must be installed separately
claude plugin install essense-flow     # has hooks — must be installed separately
claude plugin install thorough-mode   # has hooks — must be installed separately
```

## mk-flow — Unified Workflow System

Automatic intent detection, project state tracking, and structured input decomposition. Makes Claude Code consistent across sessions by injecting project context into every message.

```bash
claude plugin install mk-flow
```

Then in any project:

```
/mk-flow-init
```

### What it does

A UserPromptSubmit hook runs on every message and injects 5 context files:

| File | Purpose |
|------|---------|
| `intents.yaml` | Intent definitions — Claude classifies your message (action, question, context addition, frustration, etc.) |
| `STATE.md` | Current project state — focus, done, blocked, next up |
| `vocabulary.yaml` | Term disambiguation — auto-populated when you clarify what terms mean |
| `cross-references.yaml` | "Change X, also check Y" — grows from corrections when Claude misses related files |
| `rules.yaml` | Hard behavioral rules — corrections that apply unconditionally every message |

### Skills

- `/intake` — Decompose dense multi-issue input into structured items with an assumption table, temporal routing, and amendment tracking
- `/state` — Status, pause, and resume workflows. Generates copy-paste handoff commands for fresh sessions
- `/mk-flow-init` — One-time project setup. Scans existing context (GSD, ladder-build, miltiaze, note-tracker, git), bootstraps state from what it finds

### Key features

- **Intent detection** — Classifies messages as action, question, context addition, thought, frustration, or status query. Routes behavior accordingly
- **State verification** — Before reporting status, verifies that plan milestones match actual codebase deliverables
- **Corrections persist** — When you correct a misclassification, it's recorded and injected as context for future accuracy
- **Rules survive sessions** — Behavioral corrections go in `rules.yaml` and are enforced every message, not forgotten between sessions
- **Extensible intents** — Add project-specific intents mid-conversation ("add an intent for deployment notifications")
- **Global intent library** — Intents you create are shared across projects via `~/.claude/mk-flow/intent-library.yaml`

## The Dev Team Pipeline

When all three core skills are installed (miltiaze + architect + ladder-build), they form an automated development pipeline:

```
NEW PROJECT:      /miltiaze → /architect → /ladder-build → /architect review → loop
EXISTING PROJECT: /architect audit → /architect → /ladder-build → /architect review → loop
```

| Stage | Command | What happens |
|-------|---------|-------------|
| Research | `/miltiaze` (requirements mode) | Perspective agents research the idea, produce REQUIREMENTS.md |
| Audit | `/architect audit` | 6 assessment agents analyze existing codebase, produce AUDIT-REPORT.md |
| Design | `/architect` | 4 perspective agents design architecture, produce PLAN.md + sprint task specs |
| Execute | `/ladder-build` (executor mode) | Reads task specs, parallelizes independent tasks, reports completion |
| Review | `/architect` (review) | 4 adversarial QA agents verify, produce QA-REPORT.md, plan next sprint |

With mk-flow installed, pipeline position is tracked in STATE.md and the hook automatically suggests the next skill based on where you are.

Each skill also works standalone — miltiaze for pure research, ladder-build for self-planned builds, architect for one-off audits.

## Alert Sounds (separate install)

Audio and visual alerts for Claude Code events. **Not included in `mk-cc-all`** — this is a hook-based plugin that must be installed on its own.

```bash
claude plugin install alert-sounds
```

That's it — hooks are registered automatically on install. No extra configuration needed.

### Platform support

- **Windows**: `[Console]::Beep` tones, balloon notifications with terminal focus, taskbar flash
- **WSL2**: Automatically detected — routes all audio/notifications through `powershell.exe` on the Windows host
- **macOS**: System sounds via `afplay`, Notification Center via `osascript`, dock icon bounce
- **Linux**: `paplay` / `ffplay` / `aplay` fallback chain, `notify-send` desktop notifications
- All platforms fall back to terminal bell (`\a`) if no audio tool is available

### Events

| Event | When | Sound |
|---|---|---|
| `stop` | Task finished | Rising three-tone chime |
| `permission` | Tool needs approval | Double-tap + high tone |
| `idle` | Waiting for input | Low double-pulse + rise |

### Configuration

Edit `config.json` in the plugin directory to toggle features per event:

```json
{
  "stop":       { "beep": true, "sound": null, "notify": true, "flash": true, "statusline": true },
  "permission": { "beep": true, "sound": null, "notify": true, "flash": true, "statusline": true },
  "idle":       { "beep": true, "sound": null, "notify": true, "flash": true, "statusline": true }
}
```

Set `"sound"` to a file path (mp3/wav/ogg/aiff) to use a custom sound instead of built-in tones. Set `"beep": false` to disable sounds for an event entirely.

## essense-flow — Multi-Phase Development Pipeline

Multi-phase AI development pipeline with state machine, context injection, and session orientation. **Not included in `mk-cc-all`** — this is a hook-based plugin that must be installed on its own.

```bash
claude plugin install essense-flow
```

Then in any project:

```
/init
```

### Pipeline phases

| Phase | Command | What happens |
|-------|---------|-------------|
| Research | `/research` | Perspective agents research the problem space, produce briefs |
| Architecture | `/architect` | Design architecture with decomposition, planning, and review workflows |
| Build | `/build` | Execute task specs with wave-based parallelization |
| Triage | (automatic) | Categorize findings, route to the correct phase |
| Review | `/review` | Validate deliverables against specs |
| Verify | `/verify` | Top-down spec compliance check before completing |
| Context | (automatic) | Context injection hook keeps pipeline state across sessions |

### Hooks

- **UserPromptSubmit** — Injects pipeline state, config, and rules into every message
- **PostToolUse** — Validates YAML files after Write/Edit operations
- **Notification** — Orients new sessions to current pipeline state

### Commands

`/init`, `/elicit`, `/research`, `/architect`, `/build`, `/review`, `/triage`, `/verify`, `/status`, `/next`, `/help`

## Skills Reference

### Schema Scout

CLI tool for exploring the schema and values of any data file (XLSX, CSV, JSON).

- Analyzes file structure and builds a schema tree with types, value distributions, and null analysis
- Auto-detects and expands JSON embedded in string columns
- Repairs double-encoded UTF-8 (common from Excel/ODBC pipelines)
- Prunes empty columns and XLSX overflow artifacts
- Saves reusable index files for instant re-exploration

```bash
scout index data.xlsx        # Analyze and save index
scout schema data.xlsx       # Show full schema tree
scout query data.xlsx -p "field.path"  # Drill into a field
scout list-paths data.xlsx   # List all field paths
```

If `scout` is not on PATH, install it from the bundled tool:

```bash
uv tool install <plugin-path>/plugins/schema-scout/skills/schema-scout/tool/ --force
```

### Miltiaze

Multi-dimensional idea exploration and requirements generation — decomposes any concept into research dimensions, investigates each angle thoroughly with verified sources, and presents multiple solutions with honest tradeoffs.

- Decomposes ideas into research dimensions (exploration) or professional perspectives (requirements)
- Researches each dimension in parallel using subagents
- Synthesizes findings into 2+ genuine solutions (no straw-men)
- **Exploration mode:** Produces a structured exploration report with sources
- **Requirements mode:** Produces REQUIREMENTS.md with acceptance criteria, user stories, and cross-perspective disagreements for the architect

Use `/miltiaze` to start. Routes automatically — build intent gets requirements mode, research intent gets exploration mode.

### Architect

Multi-agent technical leadership — the tech lead between research and execution.

- **Plan workflow:** Spawns 4 perspective agents (infrastructure, interface, testing, security) to design architecture, produce PLAN.md with sprint task specs containing pseudocode and acceptance criteria
- **Review workflow:** Spawns 4 adversarial QA agents post-sprint to verify against specs and requirements, produces QA-REPORT.md, plans next sprint
- **Ask workflow:** Escalates unclear decisions to the user with options and recommendations
- **Audit workflow:** Spawns 6 assessment agents (implementation quality, risk/vulnerability, architecture coherence, future-proofing, practice compliance, goal alignment) on existing codebases

Use `/architect` after miltiaze produces requirements, or `/architect audit` to assess an existing codebase.

### Ladder Build

Incremental build pipeline — decomposes projects into small, verifiable milestones, or executes architect-planned sprints.

- **Standalone mode:** Takes exploration outputs and decomposes into milestones. Each is built, tested, and verified before the next
- **Executor mode:** Reads architect's task specs, parallelizes independent tasks via subagents, reports per-task completion back to the architect
- Living build plan evolves as discoveries emerge, but the end goal stays fixed
- Produces milestone reports tracking what was built, verified, and discovered

Use `/ladder-build` to start. Automatically detects architect task specs and routes to executor mode.

### Project Structure

Generates and maintains a live annotated project structure map inside the project's CLAUDE.md.

- Scans the filesystem and builds an annotated file tree with purpose annotations
- Creates a "Frequently Used Locations" quick-lookup table
- Adds maintenance instructions so the structure stays current after every edit
- Uses `<!-- STRUCTURE:START -->` / `<!-- STRUCTURE:END -->` markers for targeted updates

Use the `/project-structure` command to generate or refresh the structure.

### Safe Commit

Secret scanning and identity verification before committing. Scans staged changes for API keys, tokens, credentials, and other secrets using pattern matching. Verifies git author identity matches expected config.

Use the `/safe-commit` command instead of regular git commit.

### Repo Audit

Read-only codebase analysis with a cross-cutting amendment protocol — enforced change workflow with snapshot and pattern lookup consultation.

### Project Note Tracker

Track questions per handler/department across projects. Claude auto-detects which handler should answer, researches from project context in the background, logs to an Excel tracker, and generates meeting agendas. Requires `uv` on PATH.

- `/note init` — set up `project-notes/` with handlers and tracker.xlsx (auto-gitignored)
- `/note <question>` — auto-detect handler, research in background, append to Excel
- `/note <handler> <question>` — explicitly assign handler (optional)
- `/note quick <question>` — log question without research (Pending, review later)
- `/note add <handler>` — add a new handler/department
- `/note agenda [handler]` — generate a meeting agenda (all or filtered by handler)
- `/note meeting` — interactive meeting capture with auto-linking to open questions
- `/note resolve <handler> "<question>" <answer>` — mark a question as completed
- `/note decide <handler> "<question>" <decision>` — mark as decided with rationale
- `/note dump` — remove all project-notes from the current project
- `/note review [row]` — re-review questions with fresh context
- `/note doctor` — upgrade tracker.xlsx to latest formatting
- `/note help` — show available commands

**Excel columns:** Handler | Question | Internal Review | Handler Answer | Status (color-coded dropdown)

**Status values:**
- **Answered Internally** — relevant context found in codebase (question still open)
- **Pending** — little or no context found, needs discussion
- **Completed** — confirmed by the handler
- **Decided** — decision made with rationale

Each handler has a `research.md` file where you define what files to search, what terminology matters, and what this handler cares about. The better your research.md files are, the better the auto-detection and research quality. See the [plugin README](plugins/project-note-tracker/README.md) for a full walkthrough.

## Thorough Mode — Prompt Modifiers (separate install)

Keyword triggers that inject behavioral rules into any prompt. **Not included in `mk-cc-all`** — this is a hook-based plugin.

```bash
claude plugin install thorough-mode
```

### Modifiers

| Keyword | What it does |
|---------|-------------|
| `++` or `@thorough` | Thorough mode — be careful and unhurried, read fully before acting, don't skip or take shortcuts, include rather than exclude |
| `@ship` | Pre-push checklist — verify README, CHANGELOG, version bumps, CLAUDE.md, and docs before pushing |
| `@present` | Interactive questions — force all choices through `AskUserQuestion` with arrow-key navigation |

Just add the keyword anywhere in your message. Modifiers stack — `++ @ship` fires both.

If you describe the intent without the keyword (e.g., "don't skip anything", "push it"), you'll get a one-line hint reminding you of the shorthand.

## Credits

Schema Scout inspired by [ckifonidis](https://github.com/ckifonidis). Plugin architecture inspired by [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources).

## License

[MIT](LICENSE)
