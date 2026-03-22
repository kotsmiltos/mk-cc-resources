# Task 2: alert-sounds Security Fix

> **Sprint:** 1
> **Status:** planned
> **Depends on:** None
> **Estimated size:** M
> **Plan:** `../../PLAN.md`

## Goal

Close the PowerShell injection vulnerability in alert-sounds (RV-1) by replacing string interpolation with parameterized invocation for sound file paths. Extract hardcoded Win32 constants and magic numbers to named module-level constants (IQ-5, IQ-6). Add diagnostic logging to silent exception handlers (IQ-8, IQ-9). The security fix is the priority — the constant extraction and logging improvements are done in the same pass since they touch the same file.

## Context

Read these files first:
- `plugins/alert-sounds/hooks/alert.py` — the entire hook script. Focus on:
  - `_play_file_windows` (lines ~128-143) — PowerShell injection via path interpolation
  - `_play_file_wsl` (lines ~179-205) — same pattern, WSL variant
  - `_notify_windows` (lines ~320-335) — uses `-File` with `-ArgumentList` (the CORRECT pattern to follow)
  - `flash_taskbar` (lines ~578-586) — bare `except Exception: pass`
  - `_notify_wsl` (lines ~363-371) — silent wslpath failure
- `plugins/alert-sounds/hooks/notify_windows.ps1` — reference implementation of parameterized PowerShell invocation
- `plugins/alert-sounds/hooks/config.json` — where sound paths come from (user-editable)

**Decision 5 from PLAN.md:** Use the `-ArgumentList` pattern from `notify_windows.ps1` as the reference for the RV-1 fix.

## Interface Specification

### Inputs
- `plugins/alert-sounds/hooks/alert.py` — the file to modify
- Sound file path (string) from `config.json` — this is the untrusted input that must be sanitized via parameterization

### Outputs
- Modified `alert.py` with:
  - Parameterized PowerShell invocation (no path in `-Command` string)
  - Named constants for Win32 flags and timing values
  - Diagnostic logging on silent exception paths
  - Extracted `_run_powershell_media()` helper (refactor request from PLAN.md)

### Contracts with Other Tasks
- None — alert-sounds is fully independent from other plugins.
- The `skills/alert-sounds/` directory does NOT exist in `skills/` (hook-bearing plugin, installed separately). No mirror sync needed.

## Pseudocode

```
CONSTANTS EXTRACTION (IQ-5, IQ-6):
  1. At module level, near the existing FLASHW_ALL and FLASHW_TIMERNOFG constants, add:
     MEDIA_PLAYER_WAIT_MS = 3000
     CREATE_NO_WINDOW = 0x08000000
  2. Also elevate PROCESS_QUERY_LIMITED_INFORMATION from _flash_taskbar_windows function scope to module level
  3. Replace all inline uses:
     - "Start-Sleep -Milliseconds 3000" → f"Start-Sleep -Milliseconds {MEDIA_PLAYER_WAIT_MS}"
     - creationflags=0x08000000 → creationflags=CREATE_NO_WINDOW
     - (already at function scope) PROCESS_QUERY_LIMITED_INFORMATION → module-level constant

SECURITY FIX (RV-1) — Create a shared helper:
  1. Define a new function _run_powershell_media(path: str, volume: float, is_wsl: bool = False):
     """Play a media file via PowerShell MediaPlayer with parameterized path.

     The path is NEVER interpolated into the -Command string.
     It is passed via -ArgumentList to prevent injection.
     """

     # Build the PowerShell script as an inline scriptblock
     # The path comes in as $args[0], volume is embedded (it's a float from Python, not user input)
     ps_script = f"""
     param($SoundPath)
     Add-Type -AssemblyName presentationCore
     $p = New-Object System.Windows.Media.MediaPlayer
     $p.Volume = {volume}
     $p.Open([Uri]$SoundPath)
     $p.Play()
     Start-Sleep -Milliseconds {MEDIA_PLAYER_WAIT_MS}
     $p.Stop()
     $p.Close()
     """

     # Determine the powershell command
     if is_wsl:
       # Convert path to Windows format first
       try:
         win_path = subprocess.check_output(["wslpath", "-w", path], text=True).strip()
       except (FileNotFoundError, subprocess.CalledProcessError):
         print(f"alert: wslpath conversion failed for: {path}", file=sys.stderr)
         return
       sound_path_arg = win_path
       ps_cmd = "powershell.exe"
     else:
       sound_path_arg = str(Path(path).resolve())
       ps_cmd = "powershell"

     # Execute with -Command and pass path via -ArgumentList
     # Note: PowerShell -Command with a scriptblock and -ArgumentList
     # requires the scriptblock to use param() to receive arguments
     try:
       subprocess.Popen(
         [ps_cmd, "-NoProfile", "-Command", ps_script, sound_path_arg],
         stdout=subprocess.DEVNULL,
         stderr=subprocess.DEVNULL,
         creationflags=CREATE_NO_WINDOW if not is_wsl else 0
       )
     except (FileNotFoundError, OSError) as e:
       print(f"alert: powershell invocation failed: {e}", file=sys.stderr)

  2. Replace _play_file_windows body:
     def _play_file_windows(path: str, volume: float):
       _run_powershell_media(path, volume, is_wsl=False)

  3. Replace _play_file_wsl body:
     def _play_file_wsl(path: str, volume: float):
       _run_powershell_media(path, volume, is_wsl=True)

LOGGING FIX (IQ-8):
  1. In flash_taskbar(), replace:
     except Exception:
       pass
     With:
     except Exception as e:
       if os.environ.get("CLAUDE_ALERT_DEBUG"):
         print(f"alert: flash error: {e}", file=sys.stderr)

LOGGING FIX (IQ-9):
  1. In _notify_wsl(), at the wslpath failure catch, add:
     print(f"alert: wslpath conversion failed for notify script: {script}", file=sys.stderr)
     (Matching the pattern already used in _play_file_wsl)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `plugins/alert-sounds/hooks/alert.py` | MODIFY | New constants (MEDIA_PLAYER_WAIT_MS, CREATE_NO_WINDOW), new _run_powershell_media() helper, refactored _play_file_windows and _play_file_wsl, diagnostic logging in flash_taskbar and _notify_wsl |
| `plugins/alert-sounds/.claude-plugin/plugin.json` | CHECK | Version bump needed after this change (coordinate at end of Sprint 1) |

## Acceptance Criteria

- [ ] `_play_file_windows` and `_play_file_wsl` do NOT build a `-Command` string with the sound file path interpolated
- [ ] Sound file path is passed via process argument list, never inside a PowerShell command string
- [ ] `MEDIA_PLAYER_WAIT_MS = 3000` defined at module level, used in PowerShell script (not inline `3000`)
- [ ] `CREATE_NO_WINDOW = 0x08000000` defined at module level, used in Popen calls (not inline hex)
- [ ] `PROCESS_QUERY_LIMITED_INFORMATION` elevated to module level (consistent with other Win32 constants)
- [ ] `flash_taskbar` catches exceptions with debug logging when `CLAUDE_ALERT_DEBUG` env var is set
- [ ] `_notify_wsl` logs wslpath failure to stderr (matching `_play_file_wsl` pattern)
- [ ] A config.json sound path containing `$(Remove-Item *)` does NOT execute PowerShell code
- [ ] A config.json sound path containing backticks, semicolons, and `$()` plays no sound but causes no injection
- [ ] Normal sound paths (e.g., `C:\Users\user\sounds\alert.mp3`) still play correctly
- [ ] Volume control still works (value passed from Python, not from user input)

## Edge Cases

- **Path with single quotes:** The old code escaped single quotes with `replace("'", "''")`. The new parameterized approach does not need this — the path is never in a quoted string context. Single quotes in filenames should work natively.
- **Path with spaces:** Common on Windows (e.g., `C:\Program Files\...`). The parameterized approach handles this natively since the path is a separate process argument.
- **WSL path conversion failure:** Handled by the existing try/except in `_run_powershell_media`. Logs to stderr and returns without playing sound.
- **PowerShell not found:** `FileNotFoundError` from `subprocess.Popen` is caught and logged. The hook continues without sound.
- **Volume as float interpolation:** Volume is a Python float (0.0-1.0) derived from config.json's integer volume (0-100) divided by 100. This is safe to interpolate into the script string because it's a numeric value, not user text. The `f-string` interpolation of `{volume}` produces a decimal like `0.75`.

## Notes

- The `notify_windows.ps1` script is the reference implementation for parameterized PowerShell invocation in this codebase. It uses `-File` with `-ArgumentList`. The sound player uses `-Command` with a scriptblock + positional arg instead, because the MediaPlayer logic is more complex than a notification.
- The `_builtin_windows` and `_builtin_wsl` functions (which generate beep tones) are safe — they interpolate only integer values from the hardcoded `BUILTIN_TONES` dict, never user input. No changes needed there.
- The `load_config()` function returns `{}` on corrupt JSON (line ~93). This is a separate, lower-priority issue (noted by Security agent) — not in scope for this task.
