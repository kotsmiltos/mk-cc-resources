# Changelog

All notable changes to **kb** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.14.0] - 2026-09-09

### Changed
- Everything kb writes to its activity log now uses one shared line shape with the other plugins here, so "what did the knowledge base actually do this session" is answerable from one file instead of three formats. Nothing about queries, hints or the digest changed.

## [0.13.0] - 2026-09-09

### Fixed
- **The per-prompt injection could exceed what Claude Code will show inline** — past roughly 10 KB the platform replaces a hook's output with a truncation notice, so a long digest silently became nothing. The injection now stays inside that bound and, when the digest is cut, says the platform is why.
- A malformed `.claude/kb.json` used to throw before the digest was read. Now it is one visible line: hints off, digest still delivered.

### Changed
- **A hint is not repeated.** An entry hinted once this session is not hinted again; what stayed back is counted, with the query that reaches it — so a hint becomes a deliberate pull instead of wallpaper.
- A digest that has not changed since it was last injected this session is one pointer line. After a compaction you get the full text again.

## [0.12.0] - 2026-09-06

### Changed
- The hint block no longer fires inside the short-lived child sessions other plugins spawn to answer one question (40 of 78 such fires were paying for hints nobody could use), nor on machine-generated text.

### Removed
- The retired kb-scribe Stop hook is deleted. Session summaries are turn-end's `session-digest` duty now. If you configured `scribe.focus` in `.claude/kb.json`, move that list to `.claude/turn-end.json` under `duties.session-digest.important`.

## [0.11.0] - 2026-08-23

### Added
- Where an item stands in the steward's ledger (its status and group) is searchable like any other facet — "open questions" is now a normal query filter. A missing ledger changes nothing; a corrupt one says so out loud instead of quietly returning less.

## [0.10.3] - 2026-08-23

### Fixed
- **A shell sitting in a subdirectory read and rotated a different project's knowledge base.** Both hooks now anchor to the repository root, whichever directory the session is in.
