# QA Report: Sprint 1

> **Date:** 2026-03-22
> **Plan:** `../../PLAN.md`
> **Overall Result:** PASS (4 fixes applied during review)

## Summary
- Task spec compliance: 27/27 criteria checked, 24 PASS, 1 FAIL (message format), 2 PARTIAL (PS ordering, missing $p.Stop)
- Requirements alignment: 17/17 findings addressed — 16 fully fixed, 1 partial (AC-1 needs manual settings.json step)
- Fitness functions: 7/13 PASS (Sprint 1 scope), 6/13 pre-existing failures (Sprint 2-4 scope)
- Adversarial tests: 2 critical risks identified and fixed during review, 1 high risk fixed

## Autonomous Fixes Applied

### Fix A: PowerShell invocation pattern (Critical)
**Found:** `param($SoundPath)` in a `-Command` string doesn't bind positional args on PS 5.1. PowerShell concatenates all args after `-Command` into one string — `$SoundPath` would be `$null`, silently producing no sound.
**Fixed:** Replaced with PowerShell single-quoted string assignment (`$SoundPath = '<escaped>'`). Single-quoted strings have NO interpolation in PS — `$`, backtick, `$()` are all literal. Only `'` needs escaping (doubled). Also added `$p.Stop()` before `$p.Close()`, and set Volume before Open (per spec). Added `try/except` around the Windows Popen call (was missing). Unified both branches into a single Popen call.
**Files:** `plugins/alert-sounds/hooks/alert.py`

### Fix B: Backslash sanitization in description (High)
**Found:** `safe_description` escaped `"` and `\n` but not `\`. A description containing `\n` or `\t` as literal characters would be interpreted as escape sequences by YAML parsers.
**Fixed:** Added `.replace('\\', '\\\\')` before quote and newline escaping.
**Files:** `plugins/repo-audit/skills/repo-audit/scripts/repo_audit.py`, `skills/repo-audit/scripts/repo_audit.py`

### Fix C: NDJSON warning message format (Medium)
**Found:** Built message was `Warning: {name} — skipped N line(s) that could not be parsed as JSON.` Spec required `scout: warning: skipped N malformed NDJSON line(s) in {name}`.
**Fixed:** Updated to match spec format.
**Files:** `plugins/schema-scout/…/readers.py`, `skills/schema-scout/…/readers.py`

## Critical Issues
None remaining after autonomous fixes.

## High Priority
- **AC-1 settings.json manual step:** The mk-flow hook is fixed in code (LF endings, portable paths) but the `~/.claude/settings.json` workaround must still be applied manually for the hook to fire on Windows. This is outside the repo and requires user action.
- **IQ-2 not in Sprint 1 scope:** `DEFAULT_MAX_ROWS` constant extraction for cli.py was in the PLAN.md module map for Sprint 1 but was not included in the task spec. Must be addressed in Sprint 2.

## Medium Priority
- Variable naming deviation: `DRIFT_CHECK_SCRIPT` vs spec's `STATE_SCRIPT_PATH`. Cosmetic only — no action needed.
- hooks.json inner-quote behavior: Depends on Claude Code's hook runner implementation. If paths with spaces fail, the fallback is to use `bash -c '...'` wrapping.
- Magic numbers `400` and `6` in `_flash_taskbar_wsl` were not extracted to constants (new finding, not in audit scope).

## Low Priority
- `CLAUDE_PLUGIN_ROOT` unset produces slightly worse degradation after FIX 3 (empty prefix vs old relative path). Pre-existing condition, not a regression.
- Malformed JSON array (not NDJSON) raises uncaught `JSONDecodeError`. Pre-existing gap.

## Recommendations for Next Sprint
- Apply AC-1 settings.json workaround (manual, user action)
- Include IQ-2 (`DEFAULT_MAX_ROWS`) in Sprint 2 with other magic number fixes
- Version bump all changed plugins in Sprint 2
- Add proposed fitness functions FF-14 through FF-18 from QA
