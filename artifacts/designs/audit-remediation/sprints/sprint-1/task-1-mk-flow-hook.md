# Task 1: mk-flow Hook Hardening

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** `../../PLAN.md`

## Goal

Make the mk-flow UserPromptSubmit hook functional on Windows and portable across install configurations. Currently, the hook has never fired on this Windows machine (AC-1), uses unquoted variable expansion that breaks on paths with spaces (RV-6), references relative paths that only work for mk-cc-all installs (AC-4), and leaks `$HOME` into Claude's context (RV-5). This task fixes all four issues so the hook works reliably on any platform and install type.

## Context

Read these files first:
- `.planning/debug/mk-flow-hook-not-firing.md` — full diagnosis of the Windows hook failure
- `plugins/mk-flow/hooks/intent-inject.sh` — the hook script (focus on lines 27, 104-111, 143, 174, 182)
- `plugins/mk-flow/hooks/hooks.json` — hook registration config
- `~/.claude/settings.json` — where the Windows workaround must be applied

The `.planning/debug/` file documents that the fix requires: (1) adding the hook to `~/.claude/settings.json` with an absolute forward-slash path, and (2) converting `intent-inject.sh` to LF line endings.

## Interface Specification

### Inputs
- `plugins/mk-flow/hooks/intent-inject.sh` — the hook script to fix
- `plugins/mk-flow/hooks/hooks.json` — hook registration to fix
- `~/.claude/settings.json` — user settings to update (outside repo)

### Outputs
- `intent-inject.sh` with LF line endings, `${CLAUDE_PLUGIN_ROOT}` paths in INSTRUCTION text, version extraction priority inverted, `$HOME` replaced with `~`
- `hooks.json` with quoted `${CLAUDE_PLUGIN_ROOT}` expansion
- `~/.claude/settings.json` with UserPromptSubmit hook entry (manual step, outside repo)

### Contracts with Other Tasks
- None — this task is fully independent. Other tasks in Sprint 1 do not touch mk-flow files.

## Pseudocode

```
FIX 1 — Line endings (AC-1):
  1. Convert intent-inject.sh from CRLF to LF
     Command: sed -i 's/\r$//' plugins/mk-flow/hooks/intent-inject.sh
  2. Verify: file plugins/mk-flow/hooks/intent-inject.sh should report "ASCII text" not "ASCII text, with CRLF line terminators"

FIX 2 — Quote variable in hooks.json (RV-6):
  1. In plugins/mk-flow/hooks/hooks.json, find the "command" value
  2. Change: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/intent-inject.sh"
     To:     "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/intent-inject.sh\""

FIX 3 — Replace relative paths in INSTRUCTION text (AC-4):
  1. In intent-inject.sh, find all references to "plugins/mk-flow/" in the INSTRUCTION heredoc
  2. Before the heredoc, capture the expanded path:
     INTAKE_SKILL_PATH="${CLAUDE_PLUGIN_ROOT}/skills/intake"
     STATE_SCRIPT_PATH="${CLAUDE_PLUGIN_ROOT}/skills/state/scripts/drift-check.sh"
  3. In the heredoc, replace:
     "plugins/mk-flow/skills/intake/" → "${INTAKE_SKILL_PATH}/"
     "bash plugins/mk-flow/skills/state/scripts/drift-check.sh" → "bash ${STATE_SCRIPT_PATH}"

FIX 4 — Replace $HOME leak in INSTRUCTION text (RV-5):
  1. Find the reference to "${HOME}/.claude/mk-flow/intent-library.yaml"
  2. Replace with "~/.claude/mk-flow/intent-library.yaml"
     Note: This is instruction text read by Claude, not executed by shell.
     The tilde is human-readable without disclosing the actual home path.

FIX 5 — Invert version extraction priority (FP-9):
  1. Find the version extraction block (lines ~104-111)
  2. Current: regex on path first, plugin.json fallback
  3. Change to: read plugin.json first, path regex as fallback
     New logic:
       INSTALLED_VERSION=""
       PLUGIN_JSON="${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"
       if [ -f "$PLUGIN_JSON" ]; then
         INSTALLED_VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$PLUGIN_JSON" 2>/dev/null)
       fi
       if [ -z "$INSTALLED_VERSION" ]; then
         INSTALLED_VERSION=$(grep -oP 'mk-flow/\K[0-9]+\.[0-9]+\.[0-9]+' <<< "$CLAUDE_PLUGIN_ROOT" 2>/dev/null)
       fi

FIX 6 — Apply Windows workaround (AC-1, manual step):
  1. Add hook entry to ~/.claude/settings.json under "hooks"
  2. Use an absolute forward-slash path to intent-inject.sh
  3. This is a user-specific, machine-specific action — document but do not commit
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/mk-flow/hooks/intent-inject.sh` | MODIFY | LF line endings, INSTRUCTION paths use CLAUDE_PLUGIN_ROOT, $HOME replaced with ~, version extraction inverted |
| `plugins/mk-flow/hooks/hooks.json` | MODIFY | Quote ${CLAUDE_PLUGIN_ROOT} in command value |
| `~/.claude/settings.json` | MODIFY | Add UserPromptSubmit hook entry (outside repo, manual) |
| `plugins/mk-flow/.claude-plugin/plugin.json` | CHECK | Version may need bump after all mk-flow changes are complete (coordinate with Sprint 2) |

## Acceptance Criteria

- [ ] `intent-inject.sh` has LF line endings (verify: `file intent-inject.sh` reports no CRLF)
- [ ] `hooks.json` command value has quoted `${CLAUDE_PLUGIN_ROOT}` expansion
- [ ] INSTRUCTION heredoc references `${CLAUDE_PLUGIN_ROOT}/skills/intake/` not `plugins/mk-flow/skills/intake/`
- [ ] INSTRUCTION heredoc references `${CLAUDE_PLUGIN_ROOT}/skills/state/scripts/drift-check.sh` not the relative path
- [ ] No `${HOME}` reference in the INSTRUCTION output text (replaced with `~`)
- [ ] Version extraction reads `plugin.json` first, path regex as fallback
- [ ] After applying the settings.json workaround: send a prompt (>2 chars, non-slash) in a live session and confirm `<rules>` and `<project_state>` tags appear in system-reminder
- [ ] Send a single-character prompt — confirm no context injection (skip fires correctly)

## Edge Cases

- **CLAUDE_PLUGIN_ROOT not set:** The hook already uses this variable elsewhere (line 71). If it's unset, the hook fails entirely — not a new failure mode. No additional guard needed.
- **plugin.json not found at expected path:** The version extraction fallback to path regex handles this. `INSTALLED_VERSION` may be empty, which disables the stale nudge — acceptable degradation.
- **Path with spaces in CLAUDE_PLUGIN_ROOT:** The quoting fix (RV-6) specifically addresses this. The INSTRUCTION text variables are expanded inside a heredoc, so shell word-splitting does not apply there.

## Notes

- The `~/.claude/settings.json` change is machine-specific and cannot be committed. The implementer should document what was added in a comment or in `.planning/debug/mk-flow-hook-not-firing.md` resolution section.
- The `INSTRUCTION` text is a heredoc that gets injected into Claude's context. Variable expansion happens in the shell before the text reaches Claude, so `${INTAKE_SKILL_PATH}` will be expanded to the actual path at runtime.
- Version bump for mk-flow plugin.json is deferred to Sprint 2 (coordinate with other mk-flow fixes).
