# Changelog

All notable changes to **turn-end** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.1] - 2026-09-12

### Fixed
- The exec ledger no longer truncates silently. `tool-record.js` cut `cmd` at 300 chars and file lists at 10 with no marker, while its own `truncateSample` had always marked its cut with `…[+N]`. A gate invoked at the TAIL of a long compound command therefore read as never run to every consumer — and on 2026-09-12 that silence was used to refute two gates that had in fact run and passed. A ledger that drops evidence without saying so manufactures false negatives, the exact mirror of the false-clean it exists to catch. `cmd` is now marked, and `files.dropped` counts what fell off the cap (absent when nothing did). `classify()` always read the full command, so `kind` was never affected.
- `session-digest` can now observe branch (3) of its own ask. The ask offered "if the turn genuinely produced nothing worth keeping, say so in one line", but `satisfied()` had exactly two arms and both required the digest FILE to be written or touched — so a turn that correctly took that branch re-armed the duty and escalated to a `block`, leaving a no-op bullet as the only way out. `NO_OP_MARKERS` (an open registry, so a new phrasing is one entry) makes the stated no-op checkable. Same class as the 09-11 `ask()` finding: a duty's ask is executable instruction, so every branch it offers must be answerable by its own check.

## [0.12.0] - 2026-09-12

### Added
- Duty `fewer-clicks` (`advise`, default ON) — the owner's 2026-09-09 law checked at turn end: an answer must not hand the owner work the session could have done. Ruled by the owner on 2026-09-12, answering Q25: the `@fc` keyword (thorough-mode 1.12.0) stays on demand **and** the bar is folded into a duty.
- It costs **zero bytes on a clean turn**: `applies` is false unless the final message actually carries an outsourcing tell, so it is a conditional check, never a standing injection.
- The extension surface is `TELLS` — outsourcing is a category, not one shape: `run-it-yourself`, `pointer-instead-of-content`, `offer-instead-of-doing`, `todo-for-the-owner`, `wrote-without-showing`. A newly-observed shape is one entry, never a runner change. `EXCUSES` is the matching surface for work that genuinely belongs to the owner (credentials, a login, an owner-gated push) — naming why is step 1 of the protocol, so it *satisfies* the duty.
- Guards that decide whether it nags: fenced code blocks and quoted text are stripped before scanning (a paste-ready command in a fence is delivery, the opposite of outsourcing), a message under 200 chars is an acknowledgement rather than a deliverable, and a request that ASKED for instructions ("how do I…") disables it entirely. Severity is `advise` and cannot harden: every tell is a prose heuristic with no one-sentence escape hatch, unlike `self-check`.

## [0.11.0] - 2026-09-12

### Fixed
- **The "did the answer use this note?" verdict credited shared boilerplate.** Each of a note's distinctive words counted equally, so the four-instruction preamble every `.steward/` file carries scored as evidence of use against notes the answer never touched. Words are now weighted by how rare they are among the notes that span had in hand — a word common to many notes counts for little. Measured on this repo: two of eleven "used" verdicts were boilerplate-only hits.

## [0.10.0] - 2026-09-11

### Fixed
- **The quality lens was not being dispatched on some turns, and this plugin's own wording was why.** It asked for the reviewer by a name that does not resolve: 3 attempts, 3 "Agent type not found" failures, against 11 successes for the correct name.
- **And then a turn that did dispatch it correctly was blocked for doing the right thing** — the check that looks for the dispatch compared the old name. One address and one tolerant matcher now serve every place that names it.
- **"Did the session act on what was surfaced?" was answered wrong in every project.** It asked whether a file had been opened, of notes whose text is handed to the session directly — nothing to open, so it always read 0%. Measured by content instead: 65 of 96 notes (68%) were visibly carried into the answer.
- A refuted or escalated review verdict arrives after the answer it judges, so closing the request now requires the **answer restated in full with the correction marked** — a summary leaves you holding the wrong version plus a footnote. A review that never ran emits an UNCHECKED warning.
- Steward integration is dispatched whenever there is something to integrate; its old wording ended with "otherwise let them accumulate", an instruction to skip — it fired 30 times while nine items sat unintegrated.

## [0.9.0] - 2026-09-09

### Added
- A per-fire activity record, one line per duty that ran and one per closed request, so "did this layer do anything, and did it help" is answerable from disk instead of by reading transcripts.

## [0.8.0] - 2026-09-09

### Added
- **File changes made from the shell are now seen.** An in-place `sed`, a redirect, a `tee`, a heredoc, a `cp`/`mv` destination — all count as changes, so the self-check duty can no longer be satisfied by a turn that edited files invisibly.
- **A named check has to name something real**: a pass/fail count, a file it touched, or the command that ran. "Verified by inspection" satisfies nothing.
- The ask is phrased for what you actually changed — prose gets "re-read this section against that, what should the owner be seeing?", a scene file gets "open it and say what is on screen", code keeps run/look/break.
- A record of every shell command's result, which is what makes "a check ran after the last change" checkable.
- Optional `duties.self-check.requireGreen: true` in `.claude/turn-end.json` — the last recorded check for the request must have exited 0.

## [0.7.1] - 2026-09-09

### Added
- Every record says which version of the code is RUNNING, and the tail says so when your session is running an older one than you have installed — with the remedy (restart; `/clear` does not reload plugins). This repo ran a two-day-old version with no symptom.

## [0.7.0] - 2026-09-06

### Changed
- **The reviewer child session is spawned lean** — 33.0 s → 3.9 s on a one-word probe, with no hook fires inside it. If the lean spawn fails for an argument reason it retries the ordinary way, and the record says which was used.
- The end-of-turn message is capped below the size past which Claude Code replaces a hook's output with a truncation notice, shows demands before material, and substitutes a short pointer form when the full text will not fit — saying that it did.
- A note already handed over this sitting comes back as one pointer line instead of its full text.

### Added
- Duties **defer** instead of nudging while background agents are still running, or in plan mode.
- The "out of budget" note is emitted once and then stays quiet; before, it continued the turn six times until the platform's own cap.
