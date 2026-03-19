# Milestone 6: Stale Detection Nudge

> **Status:** Completed — 2026-03-19
> **Build plan:** ../BUILD-PLAN.md

## What Was Built

Enhanced the mk-flow hook (`intent-inject.sh`) to detect when project context files are behind the installed mk-flow version. Shows a one-line nudge on the first message per session when stale.

## Files Changed

- `plugins/mk-flow/hooks/intent-inject.sh` — added stale detection block:
  - Extracts installed mk-flow version from `CLAUDE_PLUGIN_ROOT` path or plugin.json
  - Extracts `_meta.defaults_version` from project's rules.yaml
  - Compares versions; if different, checks a temp flag file
  - If no flag file exists (first time this session), injects nudge in `<mk_flow_nudge>` tag
  - Flag file prevents repeating nudge every message (keyed by project hash + version)
  - Added instruction for Claude to surface the nudge at the end of responses

## Verification

- Hook reads `CLAUDE_PLUGIN_ROOT` for version extraction (primary: path parsing, fallback: plugin.json grep)
- Flag file at `${TMPDIR}/mk-flow-nudge/<project-hash>-<version>` prevents repeat nudges
- Nudge format: `[mk-flow] Defaults updated (X -> Y). Run /mk-flow-update to sync your project context files.`
- Instruction tells Claude to mention the nudge briefly at the END of responses

## Discoveries

- `grep -oP` (Perl regex) is used for version extraction — works on Git Bash for Windows but may need adjustment for pure POSIX shells
- The nudge flag is per-session via temp dir — cleared on reboot or tmp cleanup, which is the right behavior

## Next

All milestones complete. Bump mk-flow version and commit.
