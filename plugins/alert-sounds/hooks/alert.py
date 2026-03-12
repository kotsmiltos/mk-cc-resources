"""
Cross-platform audio + visual alerts for Claude Code events.

Usage: python3 alert.py <stop|permission|idle|clear>

Features:
  - Plays a distinct built-in tone per event (no dependencies)
  - Plays a custom sound file if configured in config.json
  - Adjustable volume (0-100) with mute/unmute support
  - Shows a desktop notification with event-specific message
  - Flashes the taskbar (Windows/macOS) to grab attention
  - Writes event state to a file for the status line to pick up

Config: edit config.json next to this script.
  Global settings:
  - "volume": 0-100 to control sound level (default: 100)
  - "muted": true/false to suppress all sounds (default: false)
  Per-event toggles (stop, permission, idle):
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

# Detect WSL2 — reports as Linux but should route audio/notifications to Windows
IS_WSL = False
if SYSTEM == "Linux":
    try:
        IS_WSL = "microsoft" in Path("/proc/version").read_text().lower()
    except OSError:
        pass

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


def get_volume(config: dict) -> float:
    """Return normalized volume (0.0-1.0) from config. Default: 1.0."""
    raw = config.get("volume", 100)
    try:
        clamped = max(0, min(100, int(raw)))
    except (TypeError, ValueError):
        clamped = 100
    return clamped / 100.0


def is_muted(config: dict) -> bool:
    """Return True if sounds are globally muted."""
    return bool(config.get("muted", False))


# ---------------------------------------------------------------------------
# Sound: custom file playback
# ---------------------------------------------------------------------------
def _play_file_windows(path: str, volume: float = 1.0) -> None:
    """Play audio file on Windows via PowerShell MediaPlayer."""
    abs_path = str(Path(path).resolve()).replace("'", "''")
    cmd = (
        "Add-Type -AssemblyName PresentationCore; "
        "$p = New-Object System.Windows.Media.MediaPlayer; "
        f"$p.Open([Uri]'{abs_path}'); "
        f"$p.Volume = {volume}; "
        "$p.Play(); "
        "Start-Sleep -Milliseconds 3000; "
        "$p.Close()"
    )
    subprocess.Popen(
        ["powershell", "-NoProfile", "-Command", cmd],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _play_file_macos(path: str, volume: float = 1.0) -> None:
    """Play audio file on macOS via afplay."""
    try:
        subprocess.Popen(
            ["afplay", "-v", str(volume), path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print("\a", end="", flush=True)


def _play_file_linux(path: str, volume: float = 1.0) -> None:
    """Play audio file on Linux — try paplay, ffplay, aplay in order."""
    pa_vol = str(int(volume * 65536))
    ff_vol = str(int(volume * 100))
    players = [
        ["paplay", f"--volume={pa_vol}", path],
        ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-volume", ff_vol, path],
        ["aplay", path],  # aplay has no volume flag — uses system volume
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


def _play_file_wsl(path: str, volume: float = 1.0) -> None:
    """Play audio file from WSL2 via powershell.exe on the Windows host."""
    try:
        win_path = subprocess.check_output(
            ["wslpath", "-w", path], text=True
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        print(f"alert: wslpath conversion failed for: {path}", file=sys.stderr)
        return
    abs_path = win_path.replace("'", "''")
    cmd = (
        "Add-Type -AssemblyName PresentationCore; "
        "$p = New-Object System.Windows.Media.MediaPlayer; "
        f"$p.Open([Uri]'{abs_path}'); "
        f"$p.Volume = {volume}; "
        "$p.Play(); "
        "Start-Sleep -Milliseconds 3000; "
        "$p.Close()"
    )
    try:
        subprocess.Popen(
            ["powershell.exe", "-NoProfile", "-Command", cmd],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print("alert: powershell.exe not found in WSL PATH", file=sys.stderr)


def play_file(path: str, volume: float = 1.0) -> None:
    """Play a sound file using platform-native tools."""
    if not Path(path).is_file():
        resolved = SCRIPT_DIR / path
        if resolved.is_file():
            path = str(resolved)
        else:
            print(f"alert: sound file not found: {path}", file=sys.stderr)
            return

    if IS_WSL:
        _play_file_wsl(path, volume)
    elif SYSTEM == "Windows":
        _play_file_windows(path, volume)
    elif SYSTEM == "Darwin":
        _play_file_macos(path, volume)
    else:
        _play_file_linux(path, volume)


# ---------------------------------------------------------------------------
# Sound: built-in tones (no external files needed)
# ---------------------------------------------------------------------------
def _builtin_windows(tones: list[tuple[int, int]]) -> None:
    """Play built-in tones on Windows. Console::Beep has no volume control."""
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


def _builtin_macos(event: str, volume: float = 1.0) -> None:
    """Play built-in macOS system sound with volume control."""
    sound = MACOS_SOUNDS.get(event, MACOS_SOUNDS["stop"])
    try:
        subprocess.Popen(
            ["afplay", "-v", str(volume), sound],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print("\a", end="", flush=True)


def _builtin_linux(event: str, volume: float = 1.0) -> None:
    """Play built-in Linux freedesktop sound with volume control."""
    sound = LINUX_SOUNDS.get(event, LINUX_SOUNDS["stop"])
    pa_vol = str(int(volume * 65536))
    ff_vol = str(int(volume * 100))
    players = [
        ["paplay", f"--volume={pa_vol}", sound],
        ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-volume", ff_vol, sound],
        ["aplay", sound],
    ]
    for cmd in players:
        try:
            subprocess.Popen(
                cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            return
        except FileNotFoundError:
            continue
    print("\a", end="", flush=True)  # fallback terminal bell


def _builtin_wsl(tones: list[tuple[int, int]]) -> None:
    """Play built-in tones from WSL2 via powershell.exe. No volume control."""
    parts = []
    for freq, dur in tones:
        if freq == 0:
            parts.append(f"Start-Sleep -Milliseconds {dur}")
        else:
            parts.append(f"[Console]::Beep({freq},{dur})")
    try:
        subprocess.Popen(
            ["powershell.exe", "-NoProfile", "-Command", "; ".join(parts)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print("\a", end="", flush=True)  # fallback terminal bell


def play_builtin(event: str, volume: float = 1.0) -> None:
    """Play built-in tone pattern for the event.

    Volume is supported on macOS (afplay) and Linux (paplay/ffplay).
    Windows/WSL Console::Beep uses system volume — volume param is ignored.
    """
    if IS_WSL:
        _builtin_wsl(BUILTIN_TONES.get(event, BUILTIN_TONES["stop"]))
    elif SYSTEM == "Windows":
        _builtin_windows(BUILTIN_TONES.get(event, BUILTIN_TONES["stop"]))
    elif SYSTEM == "Darwin":
        _builtin_macos(event, volume)
    else:
        _builtin_linux(event, volume)


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
    # Escape backslashes and double quotes to prevent AppleScript injection
    safe_title = title.replace("\\", "\\\\").replace('"', '\\"')
    safe_body = body.replace("\\", "\\\\").replace('"', '\\"')
    script = f'display notification "{safe_body}" with title "{safe_title}"'
    try:
        subprocess.Popen(
            ["osascript", "-e", script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass  # osascript not available


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


def _notify_wsl(title: str, body: str) -> None:
    """Show a Windows notification from WSL2 via powershell.exe."""
    script = SCRIPT_DIR / "notify_windows.ps1"
    try:
        win_script = subprocess.check_output(
            ["wslpath", "-w", str(script)], text=True
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return
    try:
        subprocess.Popen(
            [
                "powershell.exe",
                "-ExecutionPolicy", "Bypass",
                "-WindowStyle", "Hidden",
                "-File", win_script,
                "-Title", title,
                "-Body", body,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass  # powershell.exe not in WSL PATH


def notify(event: str) -> None:
    """Show a desktop notification for the event."""
    title = NOTIFICATION_TITLES.get(event, "Claude Code")
    body = NOTIFICATION_BODIES.get(event, "")

    if IS_WSL:
        _notify_wsl(title, body)
    elif SYSTEM == "Windows":
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
    try:
        subprocess.Popen(
            [
                "osascript", "-e",
                'tell application "System Events" to set frontmost of '
                'first application process whose frontmost is true to true',
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass  # osascript not available


def _flash_taskbar_wsl() -> None:
    """Flash the Windows Terminal taskbar button from WSL2 via PowerShell."""
    # Uses FlashWindow via Add-Type since we can't use ctypes from WSL
    ps_cmd = (
        "Add-Type -TypeDefinition '"
        "using System; using System.Runtime.InteropServices;"
        "public class WFlash {"
        "  [DllImport(\"user32.dll\")] public static extern bool FlashWindow(IntPtr hwnd, bool invert);"
        "  [DllImport(\"kernel32.dll\")] public static extern IntPtr GetConsoleWindow();"
        "}"
        "'; "
        "$h = [WFlash]::GetConsoleWindow(); "
        "if ($h -ne [IntPtr]::Zero) { "
        "  for ($i=0; $i -lt 6; $i++) { "
        "    [WFlash]::FlashWindow($h, $true); "
        "    Start-Sleep -Milliseconds 400 "
        "  } "
        "}"
    )
    try:
        subprocess.Popen(
            ["powershell.exe", "-NoProfile", "-Command", ps_cmd],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass  # powershell.exe not in WSL PATH


def flash_taskbar() -> None:
    """Flash the taskbar/dock to grab attention (platform-dispatched)."""
    try:
        if IS_WSL:
            _flash_taskbar_wsl()
        elif SYSTEM == "Windows":
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
    volume = get_volume(config)
    muted = is_muted(config)

    # Write state for the status line to pick up
    if ecfg["statusline"]:
        write_state(event)

    # Play sound — skip entirely when muted
    if not muted:
        if ecfg["sound"]:
            play_file(ecfg["sound"], volume)
        elif ecfg["beep"]:
            play_builtin(event, volume)

    # Desktop notification (not affected by mute — mute is audio only)
    if ecfg["notify"]:
        notify(event)

    # Taskbar flash — blinks until user focuses the terminal
    if ecfg["flash"]:
        flash_taskbar()



if __name__ == "__main__":
    main()
