# alert-sounds Release Notes

## v1.1.1 (2026-04-21)

- Trim skill prompt — caveman pass removes filler, articles, verbose phrasing; behavior unchanged

## v1.0.0 (2026-03-09)

### Initial Release

- Cross-platform audio alerts for Claude Code events (Stop, Permission prompt)
- Desktop notifications via platform-native APIs (Windows toast, macOS osascript, Linux notify-send)
- Windows taskbar flash on events
- Status line integration
- Volume control and per-event mute/unmute via `/alert-sounds` config skill
- Config stored in `hooks/config.json` within plugin directory
- WSL2 supported via PowerShell bridge
