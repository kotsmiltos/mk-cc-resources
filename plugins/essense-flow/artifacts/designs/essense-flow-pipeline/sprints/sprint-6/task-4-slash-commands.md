> **type:** task-spec
> **sprint:** 6
> **status:** planned
> **depends_on:** Task 3
> **estimated_size:** M

# Task 4: Slash Commands

## Goal
Create 6 slash command files (`/research`, `/architect`, `/build`, `/review`, `/status`, `/next`) following the pattern established by the existing `/init` command. Each command routes to the appropriate skill or reads state to provide information.

## Context
Read `commands/init.md` for the existing command format. Per D12, commands have no prefix. Each command is a `.md` file with YAML frontmatter and instructions for Claude to follow.

## Pseudocode

```
FOR EACH command in [research, architect, build, review, status, next]:
  1. Create commands/{command}.md with:
     - YAML frontmatter: name, description, arguments (if any)
     - Description of what the command does
     - Instructions section routing to the right skill/action
     - Constraints section

SPECIFIC COMMANDS:

/research:
  - Routes to research skill
  - Reads state, verifies phase is idle or allows research
  - Runs research-runner to assemble perspective briefs
  - Argument: problem-statement (required)

/architect:
  - Routes to architect skill
  - Auto-detects action from state:
    - requirements-ready → plan workflow
    - sprint-N-complete → review workflow
    - Other → ask user
  - No arguments

/build:
  - Routes to build skill
  - Reads state, verifies phase allows building (sprinting)
  - Runs build-runner to plan and execute
  - No arguments

/review:
  - Routes to architect review workflow
  - Reads state, verifies sprint-complete
  - Explicit alternative to /architect auto-routing
  - No arguments

/status:
  - Reads .pipeline/state.yaml
  - Reports: current phase, sprint number, last action, next recommended action
  - Does NOT modify state
  - No arguments

/next:
  - Reads .pipeline/state.yaml
  - Suggests the next command based on current phase:
    - idle → /research
    - requirements-ready → /architect
    - sprinting → /build
    - sprint-complete → /review or /architect
    - complete → "Pipeline complete"
  - Does NOT modify state
  - No arguments
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `commands/research.md` | CREATE | Research command routing |
| `commands/architect.md` | CREATE | Architect command with auto-routing |
| `commands/build.md` | CREATE | Build command routing |
| `commands/review.md` | CREATE | Review command routing |
| `commands/status.md` | CREATE | Status display command |
| `commands/next.md` | CREATE | Next action suggestion command |

## Acceptance Criteria

- [ ] All 6 command files created with valid YAML frontmatter
- [ ] Each command has a description, instructions, and constraints section
- [ ] `/status` reads state without modifying it
- [ ] `/next` maps each phase to the correct next command
- [ ] `/architect` auto-detects action from pipeline state
- [ ] Every command maps to exactly one skill (fitness function)
- [ ] Command format matches existing `/init` pattern
