# Changelog

All notable changes to **steward** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-10-02

Numbered 0.8.0, not 0.7.0: 0.7.0 and 0.7.1 shipped the nightly garden and were withdrawn by 0.6.2, so this release sits above both (Claude's choice).

### Added
- **The claim finder** (`bin/steward-find-claim.js`, `lib/claim-finder.js`). Given the phrases of a withdrawn or corrected claim, it lists every line that still states it, in every store the knowledge base serves, with what to do by store: kb notes and saved prompts — fix or delete; the model — recompute; `log.md`, the inbox (finished items included) and `.claude/handoffs/` — history, annotated with a dated "Withdrawn YYYY-MM-DD: what is true now" line and never rewritten; the project's `CLAUDE.md` — reported. Matching ignores case, emphasis, arrow style, a `%` before an arrow and line wraps; a line with the same numbers in other words is listed as a candidate to read. A hit with a dated note beside it counts as resolved, so the check is "0 open hits". `--item` leaves the withdrawal item itself out (and says so); a missing root exits 2, reading 0 notes exits 3 and says it is NOT a check; `--delete` removes only a committed, unmodified kb or prompts note. Why: a claim withdrawn on 23 Sep was served again on 25–27 Sep from copies nobody had touched; fed the withdrawal's own words, the finder now finds all of them.
- The integrate job runs the finder on every withdrawal or correction and acts on each hit by its store. If the finder cannot run, the steward searches the same stores with Grep, says so in one diff line, and records the check as NOT CHECKED.

### Changed
- **The steward's diff names the notes it changed in plain words, never as file paths** — what kind of note, its subject, what it now says. Your rule, 2026-09-08: "this cannot be poitning me to files". `path:line` stays in `status.json`'s `check` field, which is not shown to you.
- **Captures are silent**: a stray thought filed to the inbox gets no "→ inbox" line in the reply; the inbox file is the record.
- The steward agent may run Bash, limited by its instructions to this plugin's own scripts.
- Internal: the git-root walk moved to `lib/project-root.js`.

## [0.6.2] - 2026-09-23

### Changed
- The steward agent declares `model: sonnet` in its frontmatter — integrate and brief are bookkeeping over a text model, not design. Measured 2026-09-17: one integrate pass on the session model (Fable) cost 214k tokens and 14.6 minutes for two notes. Override per dispatch with the Agent tool's `model` parameter. Claude's call under your 2026-09-17 delegation ("take responsibility").

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
