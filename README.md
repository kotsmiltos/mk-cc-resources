# mk-cc-resources

Custom Claude Code plugins centered on **essense-flow** — a multi-phase AI development pipeline (Elicit → Research → Triage → Architecture → [Organize] → Build → [Glossary] → Review → Verify) — plus supporting tools for data exploration, prompt modifiers, project question tracking, and cross-platform alerts.

## Active plugins

| Plugin | Version | What it does |
|---|---|---|
| **essense-flow** | 0.21.0 | Multi-phase AI development pipeline. Eleven skills (elicit, research, triage, architect, organize, build, glossary, review, verify, context, heal) drive a state machine from project pitch to shipped code. /glossary renders a functionality map (MAP.md) + per-sprint drift; /architect consults the map before deciding; /build dispatches carry existing-helper + neighbor context; /dry-refactor previews surfaced. `references/code-conventions.md` leads with one rule — **build decoupled** (agents write blind, so units bind only to declared contracts); task specs carry `exposes`/`consumes` interface contracts and the review `coupling` lens blocks cross-boundary reach-ins. Closed contracts, evidence-bound review, fail-soft hooks, no resource caps. Every agent self-report re-validated against disk. |
| **essense-autopilot** | 0.4.0 | Stop-hook autopilot for essense-flow pipelines. Drives the pipeline forward across phases without manual re-invocation. Halts at human gates (eliciting, organizing, glossarying, verifying), real blockers, iteration cap, context threshold. Diagnostic stderr on every halt. Opt-in per project. |
| **session-lifecycle** | 1.1.1 | Session lifecycle tools — handoff (capture session state), resume (restore context), claude-md-sync (update CLAUDE.md), retro (metrics-driven retrospective), meta-review (diagnose session friction). |
| **plugin-toolkit** | 1.5.1 | Plugin/skill dev + maintenance — skill-heal (audit skills against best practices), plugin-scaffold (bootstrap new plugin), version-bump (cascade version updates), docs-audit (cross-doc drift check), code-glossary v2 (deterministic engine + in-session sub-agents; functionality glossary + DRY audit + drift diff + functionality map for Python/TS/JS/C# and beyond), dry-refactor MVP (preflight + dry-run refactor plans, zero source writes). Composable with @ship. |
| **schema-scout** | 1.2.1 | CLI tool for exploring schema and values of any data file (XLSX, CSV, JSON). Auto-detects embedded JSON, repairs double-encoded UTF-8, prunes empty columns. |
| **thorough-mode** | 1.6.0 | Prompt modifiers — `++`, `@thorough`, `@ship`, `@present`, `@debug`, `@verify`, `@fresh`, `@prompt` (next-session kickoff prompt), `@build` (plan → review → build). Inject behavioral rules; smart hints suggest a modifier when you describe the intent without the keyword. `@ship` integrates with plugin-toolkit (`/version-bump` + `/docs-audit`) when in mk-cc-resources plugin repo. |
| **project-note-tracker** | 1.8.0 | Track questions per handler/department. Auto-detects handler, researches in background, logs to Excel, generates meeting agendas. |
| **alert-sounds** | 1.1.1 | Cross-platform alerts for Claude Code events — sound, desktop notifications, status line colors, taskbar flash. |
| **mk-cc-all** | 2.13.0 | Bundle install — essense-flow, schema-scout, thorough-mode, project-note-tracker, session-lifecycle, plugin-toolkit. essense-autopilot and alert-sounds carry hooks and must be installed separately. |

## Benched plugins

The following plugins were active in earlier marketplace versions and are now preserved on the **`archive/benched-plugins`** branch — not shipped in `main` but recoverable any time:

`miltiaze` · `ladder-build` · `architect` · `safe-commit` · `project-structure` · `repo-audit` · `mk-flow`

To inspect or restore one:

```bash
git fetch origin archive/benched-plugins
git checkout archive/benched-plugins -- plugins/<name>
```

Or browse the branch directly on GitHub.

## Quick Start

```bash
# Add the marketplace (one time)
claude plugin marketplace add https://github.com/kotsmiltos/mk-cc-resources

# Bundle install — essense-flow, schema-scout, thorough-mode, project-note-tracker, session-lifecycle
claude plugin install mk-cc-all

# Install hook-based plugins separately
claude plugin install essense-autopilot
claude plugin install alert-sounds

# Or install session-lifecycle standalone
claude plugin install session-lifecycle
```

### Install plugins individually

```bash
claude plugin install essense-flow
claude plugin install essense-autopilot
claude plugin install schema-scout
claude plugin install thorough-mode
claude plugin install project-note-tracker
claude plugin install alert-sounds
```

## essense-flow — Multi-Phase Development Pipeline

The headline plugin. State machine + per-phase skills + verification discipline.

```bash
claude plugin install essense-flow
```

Then in any project:

```
/essense-flow:init
```

### Pipeline phases

| Phase | Command | What happens |
|---|---|---|
| Elicit | `/elicit` | Collaborative ideation — produces SPEC.md from a project pitch |
| Research | `/research` | Multi-perspective research — produces REQ.md with testable acceptance criteria |
| Triage | `/triage` | Categorizes findings, routes to the correct phase |
| Architecture | `/architect` | Decide → decompose → package. Closes every design decision before build starts. Produces ARCH.md + decisions index + closed task specs + sprint manifest. Every task spec is unambiguous — no "TBD," no "agent decides X." |
| Organize *(optional)* | `/organize` | Spec-level DRY pass. Clusters the sprint's task specs across sub-architects, proposes consolidations of overlapping functionality before any code is written. Propose-with-confirm; originals archived. Powered by the code-glossary engine (spec mode). |
| Build | `/build` | Executes task specs in dependency-ordered waves. **No concurrency cap.** Re-validates every agent's completion record against disk via `lib/verify-disk.js`; drift surfaces loudly. |
| Glossary *(optional)* | `/glossary` | Code-level DRY audit. Indexes every function the sprint produced, clusters duplicate implementations, scores extraction candidates. Propose-only — writes `.pipeline/glossary/GLOSSARY.{yaml,md}`, never touches source. Renders `MAP.md` — the functionality map /architect consults at DECIDE and /build slices into task dispatches. Re-runs snapshot the prior glossary and emit a `DIFF.md` drift report (`grown` = duplication this sprint added); exit cue surfaces `/dry-refactor` for zero-write extraction previews. Powered by the code-glossary engine (code mode). |
| Review | `/review` | Adversarial QA. Findings carry verbatim path evidence; quotes re-validated against disk. Deterministic gate: `confirmed_unacknowledged_criticals == 0` advances; non-zero blocks. False-positive ledger remembers prior rejections. |
| Verify | `/verify` | Top-down spec compliance audit. Every spec decision verified against implementation by reading code at the locator hint. `confirmed_gaps == 0` advances to complete. |
| Heal | `/heal` | Pipeline self-heal. Picks up from any prior state — fresh project, mid-flight, prior tool's artifacts, code-without-spec. Walks artifacts, infers phase, proposes walk-forward via legal transitions on user confirm. |

### Hooks

Two advisory hooks. Both fail-soft — never block tool calls.

- **UserPromptSubmit + SessionStart — context-inject** — surfaces phase, sprint, canonical artifact paths, any degradation warning. Continues on missing/corrupt state with a visible warning.
- **Stop — next-step** — suggests the recommended next slash command for the current phase. Suggestion only; user is the gatekeeper.

### Commands

`/init`, `/elicit`, `/research`, `/triage`, `/architect`, `/organize`, `/build`, `/glossary`, `/review`, `/verify`, `/heal`, `/status`, `/next`, `/help`

## essense-autopilot — Stop-Hook Autopilot

Drives essense-flow pipelines forward without manual re-invocation between phases. Reads `.pipeline/state.yaml` against a phase → command map. If the pipeline is mid-flight in an autonomous phase, the Stop hook returns `{decision: "block", reason: "...invoke /cmd..."}` and Claude continues.

**Opt-in per project.** In `.pipeline/config.yaml`:

```yaml
autopilot:
  enabled: true
```

Halts on:

| Condition | Why |
|---|---|
| `.pipeline/` not found | nothing to drive |
| `autopilot.enabled: false` | not opted in (default) |
| `state.blocked_on` set | real blocker — needs human |
| phase ∈ human_gates (idle, eliciting, organizing, glossarying, verifying) | needs dialogue |
| phase ∈ terminal (complete) | done |
| no flow mapping for phase | unknown phase — fail-safe halt |
| iteration cap (default 30) | infinite-loop safety |
| context threshold (default 60%) | preserve context for human work |
| `/build` against un-decomposed sprint | tasks empty — needs `/architect` first |

Every halt path emits a one-line stderr diagnostic. No more silent failures.

## Schema Scout

CLI tool for exploring the schema and values of any data file.

- Analyzes structure and builds a schema tree with types, value distributions, null analysis
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

If `scout` is not on PATH, install from the bundled tool:

```bash
uv tool install <plugin-path>/plugins/schema-scout/skills/schema-scout/tool/ --force
```

## Thorough Mode — Prompt Modifiers

Keyword triggers that inject behavioral rules into any prompt.

```bash
claude plugin install thorough-mode
```

### Modifiers

| Keyword | What it does |
|---|---|
| `++` or `@thorough` | Be careful and unhurried; read fully before acting; don't skip or take shortcuts; include rather than exclude |
| `@ship` | Pre-push checklist — verify README, CHANGELOG, version bumps, CLAUDE.md, docs |
| `@present` | Force all choices through `AskUserQuestion` with arrow-key navigation |
| `@debug` | Root cause investigation — read code first, trace to origin, check patterns, propose fix with rationale before implementing |
| `@verify` | Paranoid verification — prove every claim, run tests after each change, state verifiable check not "done" |
| `@fresh` | Context refresh — re-read key files, don't trust compressed reads, verify each constraint against current disk |

Add the keyword anywhere in your message. Modifiers stack — `++ @verify` fires both. If you describe the intent without the keyword ("root cause", "prove it", "re-read the file"), you get a one-line hint reminding you of the shorthand.

## Project Note Tracker

Track questions per handler/department across projects. Claude auto-detects which handler should answer, researches from project context in the background, logs to an Excel tracker, generates meeting agendas. Requires `uv` on PATH.

- `/note init` — set up `project-notes/` with handlers and tracker.xlsx (auto-gitignored)
- `/note <question>` — auto-detect handler, research, append to Excel
- `/note <handler> <question>` — explicitly assign handler
- `/note quick <question>` — log without research (Pending, review later)
- `/note add <handler>` — add a new handler/department
- `/note agenda [handler]` — generate a meeting agenda
- `/note meeting` — interactive meeting capture with auto-linking
- `/note resolve <handler> "<question>" <answer>` — mark completed
- `/note decide <handler> "<question>" <decision>` — mark decided with rationale
- `/note dump` — remove all project-notes
- `/note review [row]` — re-review with fresh context
- `/note doctor` — upgrade tracker.xlsx formatting
- `/note help` — show commands

**Excel columns:** Handler | Question | Internal Review | Handler Answer | Status (color-coded dropdown)

**Status values:**
- **Answered Internally** — relevant context found in codebase (still open)
- **Pending** — little or no context found, needs discussion
- **Completed** — confirmed by the handler
- **Decided** — decision made with rationale

Each handler has a `research.md` file defining what files to search, what terminology matters, and what the handler cares about. Better research.md = better auto-detection and research quality. See the [plugin README](plugins/project-note-tracker/README.md) for a full walkthrough.

## Alert Sounds

Audio and visual alerts for Claude Code events. Hook-based — install separately.

```bash
claude plugin install alert-sounds
```

Hooks register automatically on install. No extra configuration needed.

### Platform support

- **Windows**: `[Console]::Beep` tones, balloon notifications with terminal focus, taskbar flash
- **WSL2**: routes audio/notifications through `powershell.exe` on the Windows host
- **macOS**: System sounds via `afplay`, Notification Center via `osascript`, dock icon bounce
- **Linux**: `paplay` / `ffplay` / `aplay` fallback, `notify-send` desktop notifications
- All platforms fall back to terminal bell (`\a`)

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

Set `"sound"` to a file path (mp3/wav/ogg/aiff) for a custom sound. `"beep": false` disables sounds for an event.

## Session Lifecycle — Cross-Session Continuity

Five skills for maintaining context across sessions and improving your workflow over time.

```bash
claude plugin install session-lifecycle
```

### Skills

| Skill | Command | What it does |
|---|---|---|
| **handoff** | `/handoff` | Capture session state at end of work — what was done, what remains, critical context, blockers. Triggers `/claude-md-sync` if CLAUDE.md is stale. Saves to `.claude/handoff.md`. |
| **resume** | `/resume` | Restore context from previous handoff. Validates branch/pipeline state match, reports discrepancies, suggests first action. Archives consumed handoffs. |
| **claude-md-sync** | `/claude-md-sync` | Scan git diff, identify stale CLAUDE.md sections (impact map, modules, file locations), propose specific edits. Approve each change individually. Callable by handoff or standalone. |
| **retro** | `/retro` | Metrics-driven retrospective from git + pipeline + QA data. Gaps before strengths. Accepts `sprint-N`, `session`, or `all` scope. |
| **meta-review** | `/meta-review` | Analyze session patterns to find automation opportunities. Proposes improvements to existing skills or specs for new ones, ranked by value/effort. |

### Workflow

```
Session end:    /handoff → saves .claude/handoff.md (optionally triggers /claude-md-sync)
Session start:  /resume  → restores context, validates state, suggests first action
After sprint:   /retro   → metrics-driven retrospective with concrete recommendations
Periodically:   /meta-review → find workflow patterns worth automating into skills
```

## Plugin Toolkit — Skill Dev + Maintenance

Six composable skills for working ON plugins (and the codebases they ship in).

```bash
claude plugin install plugin-toolkit
```

### Skills

| Skill | Command | What it does |
|---|---|---|
| **skill-heal** | `/skill-heal <plugin>` | Audit a plugin's skill set against best practices. Dispatches parallel review agents, scores against rubric (Anthropic guides + token efficiency + architecture coherence), produces per-skill scorecard + ranked fixes. Diagnostic only. |
| **plugin-scaffold** | `/plugin-scaffold <name> <skills>` | Bootstrap a new plugin: directory tree + plugin.json + SKILL.md skeletons + marketplace.json + bundle + README + CLAUDE.md + RELEASE-NOTES. 9-step chain in one invocation. |
| **version-bump** | `/version-bump <plugin> <patch\|minor\|major>` | Cascade version updates across plugin.json + marketplace.json entry + mk-cc-all bundle + metadata + RELEASE-NOTES. Validates semver consistency. |
| **docs-audit** | `/docs-audit [plugin\|all]` | Cross-check CLAUDE.md + README + marketplace.json against disk. Find version mismatches, stale references, missing entries. Propose fixes per file. |
| **code-glossary** | `/code-glossary [path]` | Build a functionality glossary + DRY audit for any codebase (v2). Deterministic Python engine (Python/TS/JS/C# via stdlib AST + tree-sitter) indexes every function, fingerprints 5 signals, clusters duplicates; in-session sub-agents label against a 147-verb controlled vocabulary, review clusters (Pass B), substrate-verify instances (Pass C). Writes GLOSSARY.yaml (frozen schema, /dry-refactor input) + GLOSSARY.md; `runner diff` tracks duplication drift between runs. Also powers essense-flow's /organize + /glossary phases. Glossary-only — does not execute refactors. |
| **dry-refactor** | `/dry-refactor <glossary.yaml> <gloss-id>` | Turn an extractable glossary cluster into a reviewable refactor plan (v3 MVP). 7 pre-flight gates (baseline tests, git-clean, target module, verification, confidence, substrate-verify, gitignore) + dry-run output: synthesized helper + per-site edit list. Zero source writes; live execution ships later behind its own gate. |

### Composition

- `@ship` (thorough-mode modifier) → references `/version-bump` and `/docs-audit` in its pre-push checklist
- `/skill-heal` → hints at `/docs-audit` when descriptions are weak across skills
- `/plugin-scaffold` → creates v1.0.0 directly (doesn't call `/version-bump`)
- Standalone use is the most common pattern

## Credits

Schema Scout inspired by [ckifonidis](https://github.com/ckifonidis). Plugin architecture inspired by [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources).

## License

[MIT](LICENSE)
