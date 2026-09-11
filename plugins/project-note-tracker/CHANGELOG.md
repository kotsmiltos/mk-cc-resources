# Changelog

All notable changes to **project-note-tracker** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - current

### Added
- Tracker files gitignore themselves, so a question log never lands in a commit by accident.

## [1.6.0] - 2026-03-09

### Added
- Bug tracking: `/note bug` to file one, `/note investigate` to dig into it.
- Meeting capture — decisions and action items recorded as you go, with a decision log.
- Volume and alert configuration shared with the alert-sounds plugin.

## [1.5.0] - 2026-03-08

### Changed
- Real Excel conditional formatting instead of hand-painted cells; the version now shows in `/note help`.

## [1.4.0] - 2026-03-07

### Added
- `/note quick` — log a question without waiting for background research.
- Context gathering: the tracker finds the project files a question relates to.
- `help`, `doctor` and `review` commands.

## [1.3.0] - 2026-03-06

### Added
- The handler for a question is detected from its content.
- Meeting agendas can be filtered by handler or status; `/note dump` exports the raw data.

## [1.0.0] - 2026-03-05

### Added
- Question tracking per handler and department, backed by an Excel workbook, with background research from project context and generated meeting agendas. Runs through `uvx --with openpyxl` — nothing to install into your project.
