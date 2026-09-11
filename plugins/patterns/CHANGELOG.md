# Changelog

All notable changes to **patterns** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-06

### Fixed
- The guard that keeps the hooks from reacting to machine-generated text now matches the same markers as every other plugin here, so a command's own output can never trigger the pattern menu.

## [0.1.0] - 2026-08-27

### Added
- A catalog of **41 design patterns** — GoF, Fowler/PoEAA, POSA, Microsoft Learn (MVVM + DI), Nystrom's Game Programming Patterns, Head First and SOLID — each with the trigger that should make you reach for it, the seam it creates, a drop-in test, examples in C#/Python/TypeScript, and its cautions.
- **Pattern menu** on design-shaped prompts: the trigger→pattern shortlist, rendered when you are actually deciding a shape.
- **Pattern gate** on the first source write of a message: one advisory nudge, never a block.
- `/patterns` browses the catalog; `/patterns <id>` prints one entry in full.
- On by default; turn it off per project or globally via `.claude/patterns.json`, or by environment variable. Fails open everywhere.

### Notes
- Install standalone — the catalog travels only with its own install, not with the `mk-cc-all` bundle.
- Two attributions were corrected before release: Object Pool is not a GoF pattern, and Registry is Fowler's, not GoF's.
