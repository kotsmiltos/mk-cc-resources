> **type:** task-spec
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-1/task-1-scaffold.md
> **sprint:** 1
> **status:** planned
> **depends_on:** None
> **estimated_size:** S
> **plan:** ../PLAN.md
> **key_decisions:** D2, D3, D12
> **open_questions:** none

# Task 1: Plugin Scaffold

## Goal
Create the essense-flow plugin's directory structure and manifest files so Claude Code can discover and load it. This is the skeleton that every other task builds on.

## Context
Claude Code plugins require `.claude-plugin/plugin.json` at the plugin root (D3). The plugin structure follows the convention: skills/, hooks/, commands/, lib/, defaults/, references/. The plugin will be developed at a path that can later be registered as a marketplace plugin or local plugin.

## Interface Specification

### Inputs
- None (greenfield)

### Outputs
- `.claude-plugin/plugin.json` — plugin manifest with name, version, description, author
- `hooks/hooks.json` — hook registration skeleton (empty hooks object, filled in Sprint 2)
- Complete directory tree with placeholder `.gitkeep` files where needed

### Contracts with Other Tasks
- Task 2 (Config) will write to `defaults/config.yaml`
- Task 3 (State) will write to `defaults/state.yaml`
- Task 4 (Templates) will write to `skills/*/templates/`
- Task 5 (lib/core) will write to `lib/`

## Pseudocode

```
1. Create the plugin root directory structure:
   essense-flow-plugin/
   ├── .claude-plugin/
   ├── skills/
   │   ├── research/
   │   │   ├── workflows/
   │   │   └── templates/
   │   ├── architect/
   │   │   ├── workflows/
   │   │   ├── templates/
   │   │   └── references/
   │   ├── build/
   │   │   ├── workflows/
   │   │   └── templates/
   │   └── context/
   │       ├── workflows/
   │       ├── templates/
   │       └── scripts/
   ├── hooks/
   │   └── scripts/
   ├── commands/
   ├── lib/
   ├── defaults/
   └── references/

2. Write .claude-plugin/plugin.json:
   {
     "name": "essense-flow",
     "version": "0.1.0",
     "description": "Multi-phase AI development pipeline: Research → Architecture → Build → Review → Context",
     "author": { "name": "mkots" }
   }

3. Write hooks/hooks.json skeleton:
   {
     "hooks": {}
   }

4. Write a root README.md with one-line description and directory purpose map
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `.claude-plugin/plugin.json` | CREATE | Plugin manifest |
| `hooks/hooks.json` | CREATE | Empty hook registration (filled Sprint 2) |
| `skills/research/` | CREATE | Directory structure only |
| `skills/architect/` | CREATE | Directory structure only |
| `skills/build/` | CREATE | Directory structure only |
| `skills/context/` | CREATE | Directory structure only |
| `hooks/scripts/` | CREATE | Directory for hook scripts |
| `commands/` | CREATE | Directory for slash commands |
| `lib/` | CREATE | Directory for pure function modules |
| `defaults/` | CREATE | Directory for default config/state templates |
| `references/` | CREATE | Directory for shared references |

## Acceptance Criteria

- [ ] `.claude-plugin/plugin.json` exists and parses as valid JSON
- [ ] `plugin.json` contains name "essense-flow", version "0.1.0", description, and author fields
- [ ] `hooks/hooks.json` exists and parses as valid JSON with a `hooks` key
- [ ] All 4 skill directories exist: `skills/research/`, `skills/architect/`, `skills/build/`, `skills/context/`
- [ ] Each skill directory has `workflows/` and `templates/` subdirectories
- [ ] `skills/architect/` has a `references/` subdirectory
- [ ] `skills/context/` has a `scripts/` subdirectory
- [ ] `hooks/scripts/`, `commands/`, `lib/`, `defaults/`, `references/` directories exist
- [ ] No files are placed in wrong locations (e.g., no plugin.json at root level)

## Edge Cases

- Directory already partially exists from a previous attempt — the scaffold should be idempotent (create only what's missing, never overwrite)
- Plugin root path may need to be configurable for development vs. installation — use relative paths only, no hardcoded absolutes
