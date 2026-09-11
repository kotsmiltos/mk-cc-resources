# Changelog

All notable changes to **schema-scout** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - current

### Added
- Auto-cleanup on index: null-only columns pruned, XLSX overflow columns trimmed, sparse `_col_N` columns dropped.
- Encoding repair for double-encoded UTF-8 — the shape Excel/ODBC exports usually arrive in.

## [1.1.0] - 2026-03-08

### Changed
- Skill definition moved to the repo's standard structure; no change to the CLI.

## [1.0.0] - 2026-03-01

### Added
- `scout index`, `scout schema`, `scout query --path`, `scout list-paths` for XLSX, CSV and JSON files.
- JSON inside cells is detected and shown as nested structure.
- Index saved next to the source as `<filename>.scout-index.json`.
- Installable with `uv tool install`; needs Python 3.10+.
