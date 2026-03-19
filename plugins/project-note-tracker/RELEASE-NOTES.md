# project-note-tracker Release Notes

## v1.6.0 (2026-03-09)

### Bug Tracking & Meeting Capture

- Bug tracking workflow with `/note bug` and investigation via `/note investigate`
- Meeting capture workflow — record decisions and action items
- Decision log with "Decided" status
- Volume/config skill integration with alert-sounds

## v1.5.0 (2026-03-08)

### Excel Improvements

- Real Excel conditional formatting instead of manual cell painting
- Version displayed in help text

## v1.4.0 (2026-03-07)

### Quick Questions & Context

- `/note quick` for logging questions without background research
- Context-gathering mode — auto-detects relevant project files
- Excel styling improvements
- Help, doctor, and review commands

## v1.3.0 (2026-03-06)

### Auto-Detection & Filtering

- Auto-detect handler from question content
- Filtered meeting agendas (by handler, by status)
- `/note dump` for raw data export
- Auto-gitignore for tracker files

## v1.0.0 (2026-03-05)

### Initial Release

- Question tracking per handler/department with Excel backend
- Background research from project context
- Meeting agenda generation
- Runs via `uvx --with openpyxl`
