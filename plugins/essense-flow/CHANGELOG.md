# Changelog

All notable changes to **essense-flow** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.27.0] - 2026-09-11

### Changed
- **The `DEGRADED` banner appears once, at session start, instead of on every prompt.** Measured over 196 sessions: 535 copies of the same eight lines, in a repo carrying one dead `.pipeline/`. The healthy phase block still appears on every prompt — it changes as the pipeline advances.
- **A degraded state no longer pushes `/heal` at the end of every turn.** On a stale `.pipeline/` that suggestion would move you to a phase you are not in. Every other next-step suggestion is unchanged.

### Fixed
- Both hooks read the project you are in, not the directory your shell happens to sit in. From a subdirectory they used to read — and warn about — a different project's pipeline.

## [0.26.3] - 2026-09-11

### Fixed
- **`essense-flow-tools` could not run in any installed copy.** The vendored YAML library was missing the file its own manifest points imports at, so the CLI behind `/status`, `/heal` and `state-reconcile` failed on load — silently, while the degraded banner told you to run exactly that command. Now shipped whole and guarded by a check that resolves every vendored entry point against disk.

## [0.26.2] - 2026-09-06

### Changed
- In a repo that never ran the pipeline, the hooks now exit before loading anything (~150 ms → ~100 ms per fire, and they fire on every prompt and every turn end in every repo). Behaviour is identical.

## [0.26.1] - 2026-07

### Fixed
- **A repo with no pipeline is silent.** It used to warn `DEGRADED (missing)` on every prompt — about 40 times a session in projects that never ran the pipeline.
- **A corrupt `state.yaml` is now visible.** A YAML parse failure (a duplicate key, an empty file) was written to stderr only, so the session inherited a broken state file and saw nothing. It renders the full degraded block with the parse diagnostic.

## [0.26.0] - 2026-07

### Added
- **The generativity protocol** — when a design fork appears ("X or Y?") on an axis you have said will keep growing, `/architect` resolves it to an open contract with drop-in variants instead of picking one narrow model, and `/build` routes a fork discovered mid-task the same way.
- `/elicit` now records **declared growth axes** in the SPEC, in your own words, so the checks downstream read a stated signal instead of guessing from prose. Declaring none is a valid answer and keeps everything closed.
