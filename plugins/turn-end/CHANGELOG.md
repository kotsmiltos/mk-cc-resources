# Changelog

All notable changes to **turn-end** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.16.0] - 2026-10-08

### Added
- **The reviewer is handed your standing rules.** Asked on 8 Oct ("do these instructions of mine exist in the reviewers … would it help to add there?", then "ok, let's do that."). Its brief gains a part, right after your words for the request: every section of your personal instructions whose heading ends "(his words)" (today tests before code and logic before code), each named with where its words are and with the facts the record has. The reviewer is told to judge each one kept, broken or cannot tell, and a broken rule means that point is not done. The rules are read from your file, so a rule you add later in that shape is handed over with no change here. Without such sections the brief is exactly what it was.
- **A new fact: was the logic written before the code?** It records whether a logic map was written or updated before the first code change of the request: yes, or no (it changed only after the code), or no (no logic map changed). A logic map is a file named like one, a Markdown file holding a "C0" heading (the map-the-logic form), or a path the project lists under `duties["quality-lens"].logicMaps` in `.claude/turn-end.json`. What counts as code is self-check's own answer.
- Nothing new blocks: the reviewer stays a second opinion, per your "trying to gate this is a lost cause".

## [0.15.0] - 2026-10-02

### Added
- **`test-integrity` — every test change in your request, shown in plain lines.** When tests change while Claude works on a message of yours, you get one line per change, worst first: a test that now expects the opposite; a test switched off (a whole class or file included, or one that no longer runs or now passes before it checks anything); a widened limit or a weaker check; a check taken out or made unable to fail; a check that now reads something else (a rename, grouped as one line); a changed expectation. It reads git across the project and its worktrees, so a copy made in a shell or by a helper is caught, and only files touched during your request count. Claude's answer must say whether it made each change rather than guess why. `advise`, on by default. Your words, 2026-10-01: "tests were bent to pass. This is unacceptable."
- **`locked-tests` — a test that holds your words cannot change quietly.** List it in `.claude/turn-end.json` under `duties["test-integrity"].locked` with the words it holds; if it changes, Claude puts it back or asks you in one plain question quoting your words. Your typed yes approves that exact version and is remembered across sessions (`.claude/turn-end/test-integrity-locks.json`); any later change locks it again. A reply like "ok put it back" or "keep the old one" is never read as a yes. `block`; does nothing without a locked list.
- A project can declare its own assertion helpers (`duties["test-integrity"].assertHeads`); `check(name, condition)` is read by default.
- A duty can now send words to you directly (the Stop hook's `systemMessage`), not only to Claude — test-integrity uses it. Whether that text appears on your screen is not yet confirmed.
- Trace lines carry more: one `test-integrity` measurement line per fire whose request changed code or tests (changes, flips, switch-offs, removed and loosened checks, locked changes, whether a test changed before the code) — plugin-toolkit 1.24.0's scorecard reads it; every hook line names the request it served and what woke it (your message's id, helper wakes, your messages in the span, helpers given up on, background tasks by type and status, never their text); recall lines name the notes held back (`held_ids`, `written_ids`).

### Changed
- **One request = one message from you, however many helpers report back.** Each background helper's report wakes the session as a new prompt (twice per helper since Claude Code 2.1.271), and every wake used to re-arm every duty, so reminders came back over work that was already closed. Duties now remember what they asked per message of yours; a helper's report, another session's message or a task notice is never read as you speaking and never stands in for your request. Replayed on 2026-10-02 over two projects' real turn ends since 19 Sep (498 yields): helper wakes re-armed the duties 191 times before and 0 times now, and 0 of 98 requests took a helper's report for yours.
- **Two windows on one project keep separate memory.** The ledger is one file per window (`.claude/turn-end/ledger/<session>.json`); one shared file meant two windows wiped each other's state at every turn end.
- **Waiting for helpers is bounded.** Duties wait while a helper started in your request is still running, for up to 60 minutes after its launch. Background shells, monitors, MCP tasks, teammates and cloud sessions never hold the wait (teammates and cloud sessions stay alive after their job).
- **"This window runs old plugin code" left Claude's text.** It was prepended to every turn-end message, and Claude then talked to you about hook versions. turn-end now writes `.claude/turn-end/running/<session>.json` (only in projects where it already keeps state), and statusline 0.3.0 shows "plugins updated — reopen this window or type /reload-plugins".
- **The reviewer (`quality-lens`) checks every message of yours that changed something** — keyed on the last change, so a new edit after a review asks again — instead of once per sitting. You said yes to that on 2026-10-01. It is handed what comes from the record, under fixed headings: OWNER WORDS (your words from the transcript, what you typed while Claude worked first and whole; where they disagree the newer words win — your rule, 2026-09-17: "if we have contradictions we keep the latest input on them"; a key you pasted is redacted), PLAN ITEMS, WHAT CHANGED, RUNS (what ran after the last change) and TEST CHANGES (old → new, only this message's). Its report ends with the counts the recorder reads, then a plain FOR HIM: list (Done / Not done / Claimed without a check / Tests changed / What may confuse you), delivered whole in its hand-back. At most three reviews per message (Claude's choice); a change after the third is named to you as unchecked. A review that was stopped or never started is not a review. Still opt-in: `.claude/verifiability-lens.json` `{"enabled": true}`.
- **`request-closure` no longer quotes "The user originally asked: «…»" at every span that woke or dispatched agents.** It compared nothing, and the quote was a helper's report 12 times out of 29 (measured 2026-10-01). Your words now reach the reviewer instead. The duty speaks only when the latest review refuted claims (restate the corrected answer in full) or ended without a verdict (say the work is unchecked).
- **`self-check` ("check your own work") judges what actually ran.** For code, only a run that finished after the last change counts, and order is read inside one command too: `sed -i … && npm run build` is an edit followed by its check. A review dispatch is no longer a check. Prose and docs still need a named re-read, in a reply written after the last change; data files (.json, .csv, .yaml) are checked by a named look like docs, while package.json, tsconfig and pyproject stay code. What a check prints (its log, a tee'd copy, any .log or .out file) and a file written then deleted are not new work. If you, auto mode or a safety check refused the check, it never asks to run it again. It waits while a check started after the last change is still running, never for a server. Installs, formatters that write, editors, curl and inline `-c` scripts are never checks; syntax checks, `py -m`, LaTeX builds and test runners behind `bash -c` / `powershell -Command` / `cmd /c` are. A failure is read from a runner's summary line only (a project can add patterns: `evidence.failurePatterns`). PowerShell commands are read as PowerShell.
- **Bookkeeping stays out of your answers.** `context-recall` counts a note as already handed over only while its full text is still in the conversation after the last compaction. `session-digest` records "nothing to keep" in `.claude/turn-end/nothing-to-keep.txt` instead of writing a marker into kb's digest, so kb does not re-send the digest for it. `fewer-clicks` also catches "Once it is merged you can run …", an offer that bundles work with a push, and a `Check:` line that leaves the check to you; an offer that is only a push, publish, deploy or merge still gets no flag.

### Fixed
- The run ledger (`.claude/turn-end/checks.jsonl`) no longer keeps credentials: a key held in a short variable and sent as a credential, JSON keys, flag values, URL passwords and more token prefixes are redacted. Redaction no longer slows with output size (1 MB of output: 95 s before, 1 ms now).
- After a compaction, notes handed over before it can be brought back; a note seen only as a one-line pointer, or cut for length, can be handed over in full later.

## [0.14.2] - 2026-09-23

### Changed
- **The `page` duty runs only where a project asks for it**: `.claude/turn-end.json` → `{"duties":{"page":{"enabled":true}}}`. A `PROJECT.md` alone no longer stops anything. In 0.14.0 the file's presence was the on-switch, so every turn that changed a file in any project holding a `PROJECT.md` was blocked until the page was rewritten — after every message, not once a sitting. The 2026-09-23 review found the page in this repo was rewritten 18 times 09-18..21 with no page check installed.

### Fixed
- **Rewriting `PROJECT.md` or `DECISIONS.md` is no longer a change `self-check` asks you to test.** Before, a page rewrite that came after a green test counted as the turn's last change, and `self-check` blocked the turn again. Both duties now read the same definition of the project's written record (`lib/record-files.js`), including a page file the project renamed with `duties.page.path`.
- 0.14.0 said the page folds `self-check` into one demand. It does not: `self-check` stays its own duty and keeps running.

## [0.14.1] - 2026-09-20

### Fixed
- **self-check's ask now says what to do when nothing can run.** Measured in the with/without eval (no shell granted, Unity code, sonnet): two runs in three complied on the first nudge — re-read the files, named the check, done — but the third read "RUN the check… execute what you wrote" literally, searched the tool list for a Bash tool eleven times, dispatched three agents to compile C# for it, and hit the 900 s timeout, blocked twice on the way. The named-check escape hatch (`Check: re-read <file> vs <what>; result: …`) had existed in the detector since 0.4.0; the ask never offered it. It does now, for the no-shell case only: re-read what you changed against what it must satisfy, trace one non-happy path by hand, name that.

## [0.14.0] - 2026-09-18

### Added
- **The `page` duty — the one Stop question of a subtracted project.** Owner ruling 2026-09-18 (`subtract`): one page per project, `PROJECT.md`, rewritten WHOLE at the end of every sitting (what it is, where we are with the check that proved this turn's work, next three with their checks, open decisions with defaults; under 100 lines), plus one `DECISIONS.md` of dated one-liners. A turn that changed real files may not yield until the page is rewritten. Presence-gated: no `PROJECT.md`, no question — creating the file is the whole setup. Satisfied by a disk fact (the page's mtime against this request's start, or a tool target naming it). Rewriting the page or `DECISIONS.md` is never itself "work". Bash mutations count; writes under `.claude/`, `.steward/`, `.pipeline/` and temp do not. `duties.page.path` names a different page file.
- Why: a rewritten page cannot accumulate, so it cannot contradict itself, so it needs no garden, ledger, inbox or status contract. It folds `session-digest` (the page is the recap), `steward-sync` (the page is the model) and `self-check` (the page carries the check) into one demand. Shipped defaults are UNCHANGED in this release — a project turns the others off in `.claude/turn-end.json`; the toolkit's own repo runs that way now, and the defaults follow once it has held for five sittings.

## [0.13.1] - 2026-09-18

### Added
- `context-recall` takes an `engine`: `judge` (default, unchanged) or `ranker` — `.claude/turn-end.json` → `{"duties":{"context-recall":{"engine":"ranker"}}}`. The ranker is the same deterministic term-overlap picker the judge's death already fell back to; it spawns nothing, costs nothing, and the supplied material says `[recall via RANKER … not judged]`. Trace lines carry `engine: ranker`.
- Why the default did NOT move: your 2026-08-23 ruling ("we go for quality, not necessarily speed") keeps the judge. The measurement that argued for the ranker (empty picks 81% of 21 fires on one project after the 300 s cap, median 34 s) shows cost, not quality — an empty pick can be right, and the two engines agree on only 17% of picks (n=8), so they choose different notes, not provably worse ones. The switch lets a project run ranker-only so `note-uptake` can score the two side by side; the default follows that number.

### Fixed
- **The duty's config never reached it.** `supply()` was called without its options, so every documented `duties.context-recall` knob (`maxChosen`, `maxTotalChars`, `maxContentChars`, `maxIndexEntries`) was silently ignored since 0.6.0. The hook now passes the block.
- The four-line "Read this before doing anything" preamble every toolkit note carries is stripped from the fetched body before injection — the file is untouched. Measured 2026-09-17: 50 notes carry it; every recall re-injected the same ~330 bytes per note.

## [0.13.0] - 2026-09-14

### Changed
- The context-recall judge's budget goes **60 s -> 300 s**, and the Stop hook's ceiling **90 s -> 420 s** to clear it. Owner ruling, verbatim: *"extend the timeout if it's in our hands make it 5 times longer i don't care."*
- It was always in our hands. **PROBED 2026-09-14 (decisive):** a Stop `command` hook declaring `"timeout": 300` ran for **75 seconds** to completion under `claude -p` — exit 0, marker file written. So the platform does not cap a Stop hook at 60 s, and the "platform default 60 s" recorded in capture `20260731-1950` is **REFUTED**. The docs put the `command` default at 600 s and lower it only for UserPromptSubmit / PreModelSwitch / PostModelSwitch, MessageDisplay and SessionEnd — Stop is not on that list. The probe, not the docs, is the authority here: this repo has measured two hooks-reference drifts in three days.
- Consequence: every 60,615 ms ceiling ever seen in the Stop durations was **our own constant**, never a platform kill. The 12 ETIMEDOUTs measured in real sittings were long deliberations hitting it.
- Two new checks lock the pair together, because the old config had a 60 s judge inside a 90 s hook and nothing said so: the judge cap is asserted, and the hook ceiling must exceed it with at least 60 s spare for the duties that run around it. A caller-supplied `timeoutMs` still wins.

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
