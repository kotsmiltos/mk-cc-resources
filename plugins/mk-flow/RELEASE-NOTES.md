# mk-flow Release Notes

## v0.5.0 (2026-03-19)

### Plugin Update Workflow

- **Unified `/mk-flow-update` skill** — syncs all context files (rules, intents, cross-references) with plugin defaults using key-based merge. Replaces `/mk-flow-update-rules`.
- **`_meta.defaults_version` tracking** — context files now record which mk-flow version they were synced from. Enables stale detection.
- **Stale detection nudge** — hook detects when project context files are behind the installed mk-flow version and shows a one-line nudge on the first message per session.
- **Default cross-references** — plugin now ships `defaults/cross-references.yaml` with common mk-flow consistency rules.
- `/mk-flow-init` updated to write `_meta` sections when creating new project context files.
- `/mk-flow-update-rules` deprecated — redirects to `/mk-flow-update`.

## v0.4.0 (2026-03-15)

### Architecture-Aware Builds Integration

- ladder-build now reads cross-references.yaml for impact analysis during milestone planning
- drift-check CLI script for mechanical state verification — `bash plugins/mk-flow/skills/state/scripts/drift-check.sh`
- New rule: `no-laziness` — catch everything, never make the user ask twice

### Rule Improvements

- `verify-before-reporting` now requires running drift-check as the sole data source for status reports
- verify-before-reporting checks untracked files, not just git log

## v0.3.0 (2026-03-15)

### Auto-Fix Stale State

- Status workflow now auto-fixes stale state files when drift is detected (BUILD-PLAN.md, STATE.md, ROADMAP.md)
- `/mk-flow-update-rules` skill for syncing default rules across projects
- Hook reads both plugin default rules and project-specific rules, lower minimum message length for classification

## v0.2.0 (2026-03-14)

### Rules & Skill Routing

- Hook-injected behavioral rules — `context/rules.yaml` read and injected every message
- Default rules shipped with plugin (`defaults/rules.yaml`)
- Skill routing: intake auto-fires for dense input, miltiaze/ladder-build suggested for exploration/build intents
- `verify-before-reporting` rule made procedural with required verification block

## v0.1.0 (2026-03-12)

### Initial Release

- Unified workflow plugin with intent detection, dense input decomposition, and per-project state tracking
- UserPromptSubmit hook with bash context injection and multi-parser detection (jq/python3/python fallback)
- Intake skill — SKILL.md with parsing rules and assumption tables
- State skill — status, pause, resume workflows with 4 templates
- mk-flow-init skill — scans existing project context, bootstraps STATE.md with verification protocol
- Extensible intent system — global intent library, per-project intents, add/modify via hook instructions
- Cross-reference system replacing amendment protocol
