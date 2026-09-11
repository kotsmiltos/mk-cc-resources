# Changelog

All notable changes to **alert-sounds** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-04-21

### Changed
- Shorter skill prompt — same behaviour, fewer tokens to load.

## [1.0.0] - 2026-03-09

### Added
- Sound alerts when Claude Code stops or asks permission.
- Desktop notifications on Windows (toast), macOS (osascript) and Linux (notify-send); Windows also flashes the taskbar.
- Volume, mute/unmute and per-event toggles via `/alert-sounds`.
- WSL2 support through a PowerShell bridge.
