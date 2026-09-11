# Changelog

All notable changes to **session-lifecycle** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-08

### Fixed
- Outside a git repository, `/resume` and `/retro` rendered an empty branch and empty history that read exactly like a clean repo on `main` — and then reasoned from it. Both now say "(not a git repo)" instead of showing nothing.

## [1.3.0] - 2026-08

### Changed
- `/handoff`'s **Critical Context** section — the reason the skill exists — now has to earn its place: at least one rejected approach, gotcha or discovered constraint *with the why*, or an explicit "no non-obvious context" and the reason for it. An empty section used to pass. `/resume` benefits automatically; it can only surface what the handoff captured.

## [1.2.0] - 2026-07

### Added
- **Handoffs are now a history you can look back through.** Each `/handoff` writes a permanent `.claude/handoffs/handoff-<timestamp>.md` and prepends a line to `.claude/handoffs/INDEX.md`.

### Fixed
- Handoffs were being lost: every run overwrote one file, and `/resume` deleted all but the last three. `/resume` now preserves the history and migrates a pre-1.2.0 single-file handoff into it instead of discarding it. `.claude/handoff.md` still points at the latest one, so nothing downstream changes.

## [1.1.1] - 2026-06

### Fixed
- `/meta-review` no longer leaks a machine-specific absolute path, and no longer assumes it is running inside this marketplace's own repo — it reads the installed plugins instead.
- `/handoff` and `/resume` referenced two pipeline state fields that do not exist; they now read the real ones and ask essense-flow for the recommended next command.

### Changed
- `/resume` surfaces the handoff's Notes verbatim and compares its branch-state claims (tests passing, uncommitted changes) against reality, flagging any drift.

## [1.1.0] - 2026-06

### Changed
- `/meta-review` is diagnostic only — it identifies friction, root causes and where the fix belongs, and never applies changes. Added scope modes (`session`, `wide`, or a named topic) and a check for which installed plugins fit the session's work but never fired, and why.
- All five skill descriptions sharpened so they are found by natural questions instead of exact names.
