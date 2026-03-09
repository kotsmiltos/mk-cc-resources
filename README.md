# mk-cc-resources

Custom Claude Code plugins — data exploration, multi-dimensional research, incremental build pipelines, repo auditing, project question tracking, and cross-platform alerts.

## Quick Start

```bash
# Add the marketplace (one time)
claude plugin marketplace add https://github.com/kotsmiltos/mk-cc-resources

# Install all skills
claude plugin install mk-cc-all
```

### Install skills individually

```bash
claude plugin install schema-scout
claude plugin install miltiaze
claude plugin install ladder-build
claude plugin install project-structure
claude plugin install repo-audit
claude plugin install project-note-tracker
```

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

Multi-dimensional idea exploration — decomposes any concept into research dimensions, investigates each angle thoroughly with verified sources, and presents multiple solutions with honest tradeoffs.

- Decomposes ideas into 3-6 research dimensions
- Researches each dimension in parallel using subagents
- Synthesizes findings into 2+ genuine solutions (no straw-men)
- Produces a structured exploration report with sources

Use the `/miltiaze` command to start an exploration.

### Ladder Build

Incremental build pipeline — decomposes projects into small, verifiable milestones.

- Takes exploration outputs (from Miltiaze or freeform) and decomposes into 4-8 milestones
- Each milestone is built, tested, and verified before moving to the next
- Living build plan evolves as discoveries emerge, but the end goal stays fixed
- Produces milestone reports tracking what was built, verified, and discovered

Use the `/ladder-build` command to start a build.

### Project Structure

Generates and maintains a live annotated project structure map inside the project's CLAUDE.md.

- Scans the filesystem and builds an annotated file tree with purpose annotations
- Creates a "Frequently Used Locations" quick-lookup table
- Adds maintenance instructions so the structure stays current after every edit
- Uses `<!-- STRUCTURE:START -->` / `<!-- STRUCTURE:END -->` markers for targeted updates

Use the `/project-structure` command to generate or refresh the structure.

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

## Credits

Schema Scout inspired by [ckifonidis](https://github.com/ckifonidis). Plugin architecture inspired by [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources).

## License

[MIT](LICENSE)
