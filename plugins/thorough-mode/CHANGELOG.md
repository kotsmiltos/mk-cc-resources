# Changelog

All notable changes to **thorough-mode** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.0] - 2026-09-12

### Added
- `@fc` (fewer clicks) — a ninth modifier, asked for in the owner's words: "doing everything it can on its own instead of telling me to do things ... so I have to put in the least effort to see what it is you wanna show me". It names its failure as OUTSOURCING and runs SPLIT (what only you can do — short and justified) -> DO your whole side -> DELIVER IN-ENVIRONMENT (a path is a machine address, cited after the content, never instead of it) -> MINIMIZE the clicks left (one-keystroke questions, paste-ready one-liners) -> STILL CONFIRM. Step 5 is load-bearing: `@fc` compresses a destructive or outward-facing confirmation into one keystroke, it never removes it.
- A smart hint for the same intent without the keyword ("stop telling me to...", "don't point me to...", "least clicks"), suppressed once `@fc` is active.

## [1.11.3] - 2026-09-11

### Changed
- `@ship` and `@prompt` name `CHANGELOG.md` — every plugin in this marketplace now ships one, and `RELEASE-NOTES.md` is retired.

## [1.11.2] - 2026-09-06

### Fixed
- The guard that keeps modifiers from firing on machine-generated text now matches the same markers as every other plugin here, drift-tested so they cannot diverge again.

## [1.11.1] - 2026-09

### Fixed
- `@ship` told every project to run a repo-guard path that only exists inside this marketplace's own checkout. It now checks whether the file is there and says "not present — skipping" when it is not.

## [1.11.0] - 2026-09

### Added
- `@ship` now names the pre-push guard that catches machine-specific absolute paths, silently-failing injected shell, and fix-the-fix commit chains — the one item on its checklist that is not a memory exercise.

## [1.10.0] - 2026-07

### Fixed
- **Modifiers no longer fire on machine-generated text.** A trigger keyword quoted inside a task notification, hook feedback, a command transcript or a system reminder used to inject the full protocol — observed twice in one turn. A genuine message that merely mentions a keyword still works.

### Added
- In a project with a `.steward/` model, `@prompt` renders the kickoff prompt FROM the model instead of re-deriving the project's state.
- A test suite: 21 checks covering every keyword, the machine-text fixtures, and both `@prompt` variants.

## [1.9.1] - 2026-07

### Fixed
- `@prompt` was documented as carrying the full protocol shape but shipped without it; it now names the failure it guards (stale, unchecked citations inherited as fact by the next session) and its anti-signals.
- The saved-prompt ledger line no longer contains an escaping artifact that could be copied into the index file.
