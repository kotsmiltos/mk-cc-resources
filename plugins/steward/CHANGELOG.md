# Changelog

All notable changes to **steward** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-09-18

### Added
- **The garden: a nightly pass that deletes what is no longer valid.** Your ruling (2026-09-18): one live copy, a contradiction keeps the latest input, "keeping everything still sounds wrong." Once a day the session-open briefing prints `garden: DUE` with the exact command; `/steward:garden` runs it on demand.
- `bin/steward-garden.js` — the deterministic half. Deletes by date only: log entries past 14 days, archived digests past 7, inbox files integrated more than 7 days ago, all of `inbox/done/`. Reports the judgment candidates: questions open past 14 days, model files over their byte cap, captures new since the last run. `--json` for the agent brief, `--apply` to execute and stamp `.steward/garden-state.json`. Undated log entries are never deleted; without a healthy `status.json` the inbox is never touched (the `done/` copies ARE the history then).
- The steward agent's `garden` job — the judgment half, dispatched on sonnet: replace contradicted claims with the newer input and delete the older text, delete stale claims, resolve expired questions to their stated default, cut over-cap files to their cap, regenerate the briefing last. The diff opens with `kept N · replaced M · deleted K` and marks every line where a newer Claude note overwrote one of your statements.
- `.steward/garden.json` overrides any threshold or cap; `lib/garden.js` is the pure planner.

### Changed
- For the garden job the 2026-08-23 "files never move" rule is superseded: the ledger keeps the record, the file goes. Measured reason: log.md at 1669 / 1528 / 1255 / 529 lines across four projects, never rotated; a 452 KB live model here; nothing in the toolkit had a delete path.
- The SessionStart briefing carries a `garden: never run` / `garden: due (Nd since last)` instrument and the protocol line states the latest-wins law.

## [0.6.1] - 2026-09-12

### Fixed
- The briefing goes blind in a git worktree no longer. In a worktree `.git` is a FILE holding `gitdir: <path>`, not a directory; `instrGit` and `gitHeadMtime` both joined `.git/HEAD` blindly, threw ENOTDIR into their own catch, and returned nothing — so the `git:` instrument and the HEAD-staleness input vanished with no error and no clue. A `gitDir()` resolver follows the indirection. The root walk at the top of the same file had always probed `.git` with `existsSync` for exactly this reason; these two readers had not been taught the lesson. Flagged by the 2026-09-06 audit, uncaught by any test until now.

## [0.6.0] - 2026-09-11

### Fixed
- **Your captured thoughts stopped piling up unread.** Integration used to run at most once per sitting; across 88 sessions of one project the inbox still held 9 unintegrated items while the briefing sat five days behind its own log. It now runs whenever there is anything to integrate — still in the background, so you never wait, and each pass does the same careful work as before.
- **The briefing stopped truncating the part you need most.** A hard 900-character cap was deleting lines off the end — which is exactly where "what's next" and "what's waiting on you" live. The cap is now a runaway-file guard that says so when it fires.
- **A brand-new project model works on the first try.** Without a prior history the agent had no way to record what it had integrated and asked you to move files by hand; it now creates its ledger itself. A project with real history still adopts one with `bin/steward-backfill.js`.

### Changed
- A stale briefing now tells the session not to answer "where are we" from it, instead of quietly noting its age.

## [0.5.2] - 2026-09-09

### Added
- The briefing says when the steward code your session is RUNNING is older than the one you have installed, and tells you a restart loads it. Silent when they match.

## [0.5.1] - 2026-09-06

### Fixed
- One count of your inbox, everywhere. The briefing line, the instrument line and the fleet table used to disagree in the same injection ("8 UNINTEGRATED" beside "items: 4 new") — an already-integrated file was counted as new, and a dotfile counted as an item.

### Added
- The instrument line carries the age of your oldest unintegrated thought (`3 new (oldest 10d)`).

## [0.5.0] - 2026-08

### Added
- **A lifecycle ledger (`status.json`).** Every captured item's state is recorded rather than implied by which folder its file is in, so integrated files never move, rename, or leave tombstones behind — and the background pass can never race your session for the same file.
- The briefing's volatile facts (git position, item counts) are computed when it is injected instead of written into the file and going stale.
- `bin/steward-backfill.js` adopts a project that predates the ledger, in one idempotent run.

## [0.4.0] - 2026-08-23

### Fixed
- **The briefing no longer lies about its age.** Measured across four live projects, the one thing injected at every session open was stale in all four, silently. When anything is newer than the briefing, one line now names it.
- **A subdirectory shell no longer captures into a second, invisible `.steward/`.** The briefing, the inbox count and fleet registration all anchor to the repository root.
