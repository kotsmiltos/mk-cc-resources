param(
    [string]$Title = "Claude Code",
    [string]$Body  = "Ready for input."
)

# --- Win32 helpers: process-tree walk, window focus ---
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Text;

public class TermFocus {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int processId);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder buf, int max);

    public const int SW_RESTORE = 9;

    // --- Parent PID via NtQueryInformationProcess (no WMI, no admin) ---
    [StructLayout(LayoutKind.Sequential)]
    struct PBI {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2_0;
        public IntPtr Reserved2_1;
        public IntPtr UniqueProcessId;
        public IntPtr ParentPid;
    }

    [DllImport("ntdll.dll")]
    static extern int NtQueryInformationProcess(
        IntPtr handle, int cls, ref PBI info, int size, out int ret);

    static int GetParentPid(int pid) {
        try {
            var p = Process.GetProcessById(pid);
            var pbi = new PBI();
            int sz;
            if (NtQueryInformationProcess(p.Handle, 0, ref pbi,
                    Marshal.SizeOf(pbi), out sz) == 0)
                return pbi.ParentPid.ToInt32();
        } catch {}
        return -1;
    }

    // Walk up from startPid to find WindowsTerminal.exe
    public static int FindTerminalPid(int startPid) {
        int cur = startPid;
        for (int i = 0; i < 32; i++) {
            try {
                var p = Process.GetProcessById(cur);
                if (string.Equals(p.ProcessName, "WindowsTerminal",
                        StringComparison.OrdinalIgnoreCase))
                    return cur;
                int parent = GetParentPid(cur);
                if (parent <= 0 || parent == cur) break;
                cur = parent;
            } catch { break; }
        }
        return -1;
    }

    // Find the first visible top-level window for a PID
    public static IntPtr GetWindowForPid(int pid) {
        IntPtr result = IntPtr.Zero;
        EnumWindows((hWnd, _) => {
            if (!IsWindowVisible(hWnd)) return true;
            int wPid;
            GetWindowThreadProcessId(hWnd, out wPid);
            if (wPid == pid) { result = hWnd; return false; }
            return true;
        }, IntPtr.Zero);
        return result;
    }
}
"@

# --- Find the terminal window ---
$termHwnd = [IntPtr]::Zero

# Strategy 1: Walk the process tree to find WindowsTerminal.exe
$termPid = [TermFocus]::FindTerminalPid($PID)
if ($termPid -gt 0) {
    $termHwnd = [TermFocus]::GetWindowForPid($termPid)
}

# Strategy 2: ConPTY detaches the tree — find WindowsTerminal by process name
if ($termHwnd -eq [IntPtr]::Zero) {
    $wtProcs = Get-Process -Name WindowsTerminal -ErrorAction SilentlyContinue
    if ($wtProcs) {
        # If there's only one WT window, use it directly
        if ($wtProcs.Count -eq 1) {
            $termHwnd = [TermFocus]::GetWindowForPid($wtProcs[0].Id)
        } else {
            # Multiple WT windows — pick the one whose title contains "Claude"
            foreach ($wt in $wtProcs) {
                if ($wt.MainWindowTitle -match "Claude") {
                    $termHwnd = [TermFocus]::GetWindowForPid($wt.Id)
                    break
                }
            }
            # Still nothing? Just use the first one
            if ($termHwnd -eq [IntPtr]::Zero) {
                $termHwnd = [TermFocus]::GetWindowForPid($wtProcs[0].Id)
            }
        }
    }
}

# Strategy 3: Fallback for plain cmd/conhost
if ($termHwnd -eq [IntPtr]::Zero) {
    $termHwnd = [TermFocus]::GetConsoleWindow()
}

# --- Show notification ---
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon    = [System.Drawing.SystemIcons]::Information
$n.Visible = $true
$n.BalloonTipTitle = $Title
$n.BalloonTipText  = $Body
$n.BalloonTipIcon  = [System.Windows.Forms.ToolTipIcon]::Info

$script:hwnd = $termHwnd

$focusAndCleanup = {
    if ($script:hwnd -ne [IntPtr]::Zero) {
        [TermFocus]::ShowWindow($script:hwnd, [TermFocus]::SW_RESTORE) | Out-Null
        [TermFocus]::SetForegroundWindow($script:hwnd) | Out-Null
    }
    $n.Visible = $false
    $n.Dispose()
    [System.Windows.Forms.Application]::ExitThread()
}

$cleanup = {
    $n.Visible = $false
    $n.Dispose()
    [System.Windows.Forms.Application]::ExitThread()
}

Register-ObjectEvent $n BalloonTipClicked -Action $focusAndCleanup | Out-Null
Register-ObjectEvent $n BalloonTipClosed  -Action $cleanup         | Out-Null
Register-ObjectEvent $n Click             -Action $focusAndCleanup | Out-Null

$n.ShowBalloonTip(5000)

# Auto-exit after 10 seconds if the user doesn't click or dismiss.
# Prevents zombie PowerShell processes from accumulating.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000
$timer.Add_Tick({
    $timer.Stop()
    $n.Visible = $false
    $n.Dispose()
    [System.Windows.Forms.Application]::ExitThread()
})
$timer.Start()

# Pump messages until user clicks, balloon closes, or timer fires
[System.Windows.Forms.Application]::Run()
