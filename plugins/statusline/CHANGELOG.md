# Changelog

All notable changes to **statusline** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-11

### Changed
- The steward anchor now reads `⚓N✱ ▲M`: **N** thoughts in the inbox the project model has not recorded yet, **✱** when the model's own charts are stale, **▲M** items recorded but not yet in your briefing. It counts from the project root, so a subdirectory shell shows the same numbers as the repo root.

### Fixed
- A corrupt or missing status ledger degrades to plain counting instead of breaking the statusline.

## [0.1.0] - 2026-07-22

### Added
- Segment statusline: model · current task · directory · steward anchor · context counter.
- The context counter is normalized — 100% means the usable window, with the ~16.5% autocompact buffer already accounted for; it turns yellow at 50%, orange at 65%, and shows 💀 past 80%.
- Each segment fails on its own without taking the line down; add a segment by dropping one function into `SEGMENTS`.
- Wiring is one `statusLine` line in settings — no hooks, no skills.
