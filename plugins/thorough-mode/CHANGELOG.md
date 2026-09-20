# Changelog

All notable changes to **thorough-mode** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2026-09-20

### Added
- **Kickoff contract on `@prompt` (both variants).** A generated kickoff now opens with three fixed lines: `OWNER ASKED (verbatim): "…"` (the owner's own words, quoted, never paraphrased), `THIS PROMPT ADDS: …` (every scope, phase or agent the prompt carries beyond those words, or "nothing") and `COST: <phases> · <expected sub-agent dispatches> · <expected hours>`. "Ask nothing" / "never stop early" may appear only inside the verbatim quote — a kickoff never grants itself the right to run unquestioned. Why: on 2026-09-20 a generated kickoff turned the owner's "test building a simple webapp, with and without the plugins" into a ten-phase pipeline in the session's voice, forbade questions, and the receiving session spent 2h40m and ~50 opus sub-agents before the owner intervened. The owner reviews three lines, not a page.
- **`[kickoff-guard]` (receiving side).** When a prompt forbids questions ("ask me nothing", "never stop early", "no AskUserQuestion", "don't ask me questions") and carries no `OWNER ASKED (verbatim)` line, the hook injects a guard: before the first sub-agent dispatch or any multi-phase run, print the COST line and take ONE keystroke. The prompt's own "ask nothing" does not waive it. Stands down on machine-authored text like every other injection. 12 new test checks (49 total).

## [1.13.0] - 2026-09-20

### Removed
- **`++` / `@thorough`.** The enumerate-first injection is retired; the token now injects nothing, and the "add `++`" hint is gone with it. Why: measured twice on the same real task (a Unity manager in the owner's house style, sonnet, 3 runs per arm) and it changed nothing — graded on "named a verified check" it read 0/3 with vs 2/3 without; graded on the very shape it promised (an enumerated list before the first write, items closed one by one) it read 0/3 vs 0/3. The model went straight to code with or without it and closed items in bullets with or without it. A mechanism measured to change nothing is text. The other eight modifiers are untouched; `@prompt` now cites `@verify`/`@fc` as the working style to carry forward.

## [1.12.2] - 2026-09-14

### Changed
- `@prompt` now makes the next session name its END STATE, not only its first step — what "done" means for the whole sitting, and where the work must land: committed, pushed, or explicitly "stays local because X". A census of 23 real sessions found the relay itself works (opening on a kickoff file produced 1.7× the commits per owner message, measured within a single project so difficulty is held constant), but it carried no landing: 15 of the 23 sessions never pushed, and one project sat ~40 commits local-only for a month while its model believed the work was backed up. An unnamed landing is how finished work ends up on one disk only.

## [1.12.1] - 2026-09-12

### Fixed
- The hook registration's own description still read "Detects ++ or @thorough" — written when there were two modifiers. There are nine.

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
