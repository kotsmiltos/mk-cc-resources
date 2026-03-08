"""
Cross-platform audio + visual alerts for Claude Code events.

Usage: python3 alert.py <stop|permission|idle|clear>

Features:
  - Plays a distinct built-in tone per event (no dependencies)
  - Plays a custom sound file if configured in config.json
  - Shows a desktop notification with event-specific message
  - Flashes the taskbar (Windows/macOS) to grab attention
  - Writes event state to a file for the status line to pick up

Config: edit config.json next to this script. Per-event toggles:
  - "beep": true/false to enable built-in tones (default: true)
  - "sound": path to mp3/wav/ogg/aiff file, or null for built-in tones
  - "notify": true/false to enable desktop notifications (default: true)
  - "flash": true/false to flash taskbar button (default: true)
  - "statusline": true/false to enable status line color indicator (default: true)
"""

import json
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path

SYSTEM = platform.system()
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
EVENTS = ("stop", "permission", "idle")

# ---------------------------------------------------------------------------
# Built-in tone definitions: list of (frequency_hz, duration_ms) pairs
# freq=0 means silence (a pause between tones)
# ---------------------------------------------------------------------------
BUILTIN_TONES = {
    "stop": [(880, 120), (1100, 120), (1320, 160)],
    "permission": [(1000, 150), (0, 80), (1000, 150), (0, 80), (1200, 200)],
    "idle": [(520, 250), (0, 100), (520, 250), (0, 100), (660, 300)],
}

# Built-in macOS system sounds (used when no custom sound is set)
MACOS_SOUNDS = {
    "stop": "/System/Library/Sounds/Glass.aiff",
    "permission": "/System/Library/Sounds/Sosumi.aiff",
    "idle": "/System/Library/Sounds/Tink.aiff",
}

# Built-in Linux freedesktop sounds
LINUX_SOUNDS = {
    "stop": "/usr/share/sounds/freedesktop/stereo/complete.oga",
    "permission": "/usr/share/sounds/freedesktop/stereo/dialog-warning.oga",
    "idle": "/usr/share/sounds/freedesktop/stereo/message.oga",
}

# Notification messages per event
NOTIFICATION_TITLES = {
    "stop": "Claude Code — Done",
    "permission": "Claude Code — Permission Needed",
    "idle": "Claude Code — Waiting",
}

NOTIFICATION_BODIES = {
    "stop": "Task finished. Ready for input.",
    "permission": "A tool needs your approval.",
    "idle": "Claude has been waiting for your input.",
}


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
def load_config() -> dict:
    """Load user config, falling back to defaults if missing or broken."""
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def get_event_config(config: dict, event: str) -> dict:
    """Return config dict for an event with defaults applied."""
    defaults = {
        "beep": True,
        "sound": None,
        "notify": True,
        "flash": True,
        "statusline": True,
    }
    entry = config.get(event, {})
    return {**defaults, **entry}


# ---------------------------------------------------------------------------
# Sound: custom file playback
# ---------------------------------------------------------------------------
def _play_file_windows(path: str) -> None:
    """Play audio file on Windows via PowerShell MediaPlayer."""
    abs_path = str(Path(path).resolve()).replace("'", "''")
    cmd = (
        "Add-Type -AssemblyName PresentationCore; "
        "$p = New-Object System.Windows.Media.MediaPlayer; "
        f"$p.Open([Uri]'{abs_path}'); "
        "$p.Play(); "
        "Start-Sleep -Milliseconds 3000; "
        "$p.Close()"
    )
    subprocess.Popen(
        ["powershell", "-NoProfile", "-Command", cmd],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _play_file_macos(path: str) -> None:
    """Play audio file on macOS via afplay."""
    subprocess.Popen(
        ["afplay", path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _play_file_linux(path: str) -> None:
    """Play audio file on Linux — try paplay, ffplay, aplay in order."""
    players = [
        ["paplay", path],
        ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", path],
        ["aplay", path],
    ]
    for cmd in players:
        try:
            subprocess.Popen(
                cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            return
        except FileNotFoundError:
            continue
    print("\a", end="", flush=True)


def play_file(path: str) -> None:
    """Play a sound file using platform-native tools."""
    if not Path(path).is_file():
        resolved = SCRIPT_DIR / path
        if resolved.is_file():
            path = str(resolved)
        else:
            print(f"alert: sound file not found: {path}", file=sys.stderr)
            return

    if SYSTEM == "Windows":
        _play_file_windows(path)
    elif SYSTEM == "Darwin":
        _play_file_macos(path)
    else:
        _play_file_linux(path)


# ---------------------------------------------------------------------------
# Sound: built-in tones (no external files needed)
# ---------------------------------------------------------------------------
def _builtin_windows(tones: list[tuple[int, int]]) -> None:
    parts = []
    for freq, dur in tones:
        if freq == 0:
            parts.append(f"Start-Sleep -Milliseconds {dur}")
        else:
            parts.append(f"[Console]::Beep({freq},{dur})")
    subprocess.Popen(
        ["powershell", "-NoProfile", "-Command", "; ".join(parts)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _builtin_macos(event: str) -> None:
    sound = MACOS_SOUNDS.get(event, MACOS_SOUNDS["stop"])
    subprocess.Popen(
        ["afplay", sound], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def _builtin_linux(event: str) -> None:
    sound = LINUX_SOUNDS.get(event, LINUX_SOUNDS["stop"])
    try:
        subprocess.Popen(
            ["paplay", sound], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    except FileNotFoundError:
        print("\a", end="", flush=True)


def play_builtin(event: str) -> None:
    """Play built-in tone pattern for the event."""
    if SYSTEM == "Windows":
        _builtin_windows(BUILTIN_TONES.get(event, BUILTIN_TONES["stop"]))
    elif SYSTEM == "Darwin":
        _builtin_macos(event)
    else:
        _builtin_linux(event)


# ---------------------------------------------------------------------------
# Desktop notifications
# ---------------------------------------------------------------------------
def _notify_windows(title: str, body: str) -> None:
    """Show a balloon notification that focuses the terminal on click."""
    script = SCRIPT_DIR / "notify_windows.ps1"
    subprocess.Popen(
        [
            "powershell.exe",
            "-ExecutionPolicy", "Bypass",
            "-WindowStyle", "Hidden",
            "-File", str(script),
            "-Title", title,
            "-Body", body,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=0x08000000,  # CREATE_NO_WINDOW
    )


def _notify_macos(title: str, body: str) -> None:
    """Show a Notification Center notification via osascript."""
    script = f'display notification "{body}" with title "{title}"'
    subprocess.Popen(
        ["osascript", "-e", script],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _notify_linux(title: str, body: str) -> None:
    """Show a desktop notification via notify-send."""
    try:
        subprocess.Popen(
            ["notify-send", title, body],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass  # notify-send not installed — skip silently


def notify(event: str) -> None:
    """Show a desktop notification for the event."""
    title = NOTIFICATION_TITLES.get(event, "Claude Code")
    body = NOTIFICATION_BODIES.get(event, "")

    if SYSTEM == "Windows":
        _notify_windows(title, body)
    elif SYSTEM == "Darwin":
        _notify_macos(title, body)
    else:
        _notify_linux(title, body)


# ---------------------------------------------------------------------------
# Taskbar flash — makes the taskbar button blink to grab attention
# ---------------------------------------------------------------------------
def _flash_taskbar_windows() -> None:
    """Flash the Windows Terminal taskbar button using FlashWindowEx.

    Walks the process tree from the current PID upward to find
    WindowsTerminal.exe, then locates its top-level window and flashes it.
    Falls back to GetConsoleWindow() for cmd.exe / conhost.
    """
    import ctypes
    import ctypes.wintypes

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    ntdll = ctypes.windll.ntdll

    # --- FLASHWINFO for FlashWindowEx ---
    class FLASHWINFO(ctypes.Structure):
        _fields_ = [
            ("cbSize", ctypes.wintypes.UINT),
            ("hwnd", ctypes.wintypes.HWND),
            ("dwFlags", ctypes.wintypes.DWORD),
            ("uCount", ctypes.wintypes.UINT),
            ("dwTimeout", ctypes.wintypes.DWORD),
        ]

    FLASHW_ALL = 0x03  # flash both caption bar and taskbar button
    FLASHW_TIMERNOFG = 0x0C  # keep flashing until window is foregrounded

    # --- Process tree walk to find WindowsTerminal.exe ---
    class PROCESS_BASIC_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("Reserved1", ctypes.c_void_p),
            ("PebBaseAddress", ctypes.c_void_p),
            ("Reserved2_0", ctypes.c_void_p),
            ("Reserved2_1", ctypes.c_void_p),
            ("UniqueProcessId", ctypes.c_void_p),
            ("InheritedFromUniqueProcessId", ctypes.c_void_p),
        ]

    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    MAX_TREE_DEPTH = 32

    def _get_parent_pid(pid: int) -> int:
        handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return -1
        try:
            pbi = PROCESS_BASIC_INFORMATION()
            ret_len = ctypes.c_ulong()
            status = ntdll.NtQueryInformationProcess(
                handle, 0, ctypes.byref(pbi),
                ctypes.sizeof(pbi), ctypes.byref(ret_len),
            )
            if status == 0 and pbi.InheritedFromUniqueProcessId:
                return int(pbi.InheritedFromUniqueProcessId)
            return -1
        except (OSError, ValueError):
            return -1
        finally:
            kernel32.CloseHandle(handle)

    def _get_process_name(pid: int) -> str:
        handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return ""
        try:
            buf = ctypes.create_unicode_buffer(260)
            size = ctypes.wintypes.DWORD(260)
            if kernel32.QueryFullProcessImageNameW(handle, 0, buf, ctypes.byref(size)):
                return buf.value.rsplit("\\", 1)[-1].lower()
            return ""
        except OSError:
            return ""
        finally:
            kernel32.CloseHandle(handle)

    def _find_window_for_pid(pid: int) -> int:
        """Use EnumWindows to find the first visible top-level window for a PID."""
        WNDENUMPROC = ctypes.WINFUNCTYPE(
            ctypes.wintypes.BOOL, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM,
        )
        found = [None]

        def callback(hwnd, _lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
            w_pid = ctypes.wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(w_pid))
            if w_pid.value == pid:
                found[0] = hwnd
                return False  # stop enumerating
            return True

        user32.EnumWindows(WNDENUMPROC(callback), 0)
        return found[0]

    # Walk up from our PID to find WindowsTerminal.exe
    hwnd = None
    pid = os.getpid()
    for _ in range(MAX_TREE_DEPTH):
        name = _get_process_name(pid)
        if name == "windowsterminal.exe":
            hwnd = _find_window_for_pid(pid)
            break
        parent = _get_parent_pid(pid)
        if parent <= 0 or parent == pid:
            break
        pid = parent

    # Fallback: use the console window (works for cmd.exe / conhost)
    if not hwnd:
        hwnd = kernel32.GetConsoleWindow()
    if not hwnd:
        return

    fi = FLASHWINFO()
    fi.cbSize = ctypes.sizeof(FLASHWINFO)
    fi.hwnd = hwnd
    fi.dwFlags = FLASHW_ALL | FLASHW_TIMERNOFG
    fi.uCount = 0  # flash until the user focuses the window
    fi.dwTimeout = 0
    user32.FlashWindowEx(ctypes.byref(fi))


def _flash_taskbar_macos() -> None:
    """Bounce the Terminal/iTerm2 dock icon on macOS."""
    # AppleScript 'activate' on the current terminal app bounces its dock icon
    subprocess.Popen(
        [
            "osascript", "-e",
            'tell application "System Events" to set frontmost of '
            'first application process whose frontmost is true to true',
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def flash_taskbar() -> None:
    """Flash the taskbar/dock to grab attention (platform-dispatched)."""
    try:
        if SYSTEM == "Windows":
            _flash_taskbar_windows()
        elif SYSTEM == "Darwin":
            _flash_taskbar_macos()
        # Linux: no reliable cross-desktop taskbar flash mechanism
    except Exception:
        pass  # best-effort — never let flash failure break the hook


# ---------------------------------------------------------------------------
# State file — bridge between hooks and the status line script
# The status line reads this file to know the current alert state.
# Stored in the system temp dir so it works cross-platform without config.
# ---------------------------------------------------------------------------
STATE_FILE = Path(tempfile.gettempdir()) / "claude-alert-state"


def write_state(event: str) -> None:
    """Write the current event to the state file."""
    try:
        STATE_FILE.write_text(event, encoding="utf-8")
    except OSError:
        pass


def clear_state() -> None:
    """Remove the state file (user is back, no alert needed)."""
    try:
        STATE_FILE.unlink(missing_ok=True)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <{'|'.join(EVENTS)}|clear>", file=sys.stderr)
        sys.exit(1)

    event = sys.argv[1]

    # Special case: clear state (called by UserPromptSubmit hook)
    if event == "clear":
        clear_state()
        return

    if event not in EVENTS:
        print(f"Unknown event: {event}. Use: {', '.join(EVENTS)}", file=sys.stderr)
        sys.exit(1)

    config = load_config()
    ecfg = get_event_config(config, event)

    # Write state for the status line to pick up
    if ecfg["statusline"]:
        write_state(event)

    # Play sound — custom file takes priority, then built-in tones
    if ecfg["sound"]:
        play_file(ecfg["sound"])
    elif ecfg["beep"]:
        play_builtin(event)

    # Desktop notification
    if ecfg["notify"]:
        notify(event)

    # Taskbar flash — blinks until user focuses the terminal
    if ecfg["flash"]:
        flash_taskbar()



if __name__ == "__main__":
    main()
