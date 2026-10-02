# Changelog

All notable changes to **verifiability-lens** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-10-02

### Fixed
- **Reviews are counted again.** Since Claude Code 2.1.274 (first seen 2026-09-17) a background helper delivers its report in a SubagentHandback tool call, and its last plain text is an undelivered afterword. The recorder read only the afterword, so every review since was logged `unparsed` with no counts (22 of 22). It now reads every hand-back from the agent's transcript, newest first, then the final text, and keeps the first that carries the rollup. Replaying the 22 real reviews gives 22/22 parsed.
- A short follow-up hand-back no longer hides the report.
- A comma inside a quoted list item no longer counts as two items; lists after the rollup's closing fence are no longer counted; a `rollup:` label followed by a fenced block parses.
- `/verifiability` addresses the agent by the id that works (`verifiability-lens:verifiability-lens`).
- The agent-file checks work on a Windows (CRLF) checkout.

### Added
- Trace fields `rollup_source` (handback / final_text / none), `handback_bytes` (all hand-backs summed) and `for_him`.
- One extra sample per new rollup source per project, holding the rollup block the parser read, with every machine path replaced by `<path>`.

### Changed
- **The reviewer judges the work against your words**, handed to it as OWNER WORDS together with the plan items, what changed, what ran and the test changes (turn-end 0.15.0 sends these). Claude's own design documents are not the reference, and Claude-written text you pasted counts as Claude's design.
- **Every test that was flipped, switched off, removed or loosened is ALWAYS flagged to you**, with the default "restore it unless you say otherwise"; where your words seem to ask for the change, they are quoted beside it so you can confirm in one word.
- **Its report ends with a plain FOR HIM: section** of five short lists — Done / Not done / Claimed without a check / Tests changed / What may confuse you — after the machine-readable rollup, and the whole report goes in the hand-back. A section the dispatcher marked `none` is not mentioned; one it never sent costs one plain line about what could not be checked.
- What you will notice with turn-end: lens lines carry real counts again, so turn-end's "restate the answer in full" ask comes back after a review that refuted claims, and the acted-on lens numbers reappear in harness-stats.

## [0.7.0] - 2026-09-11

### Fixed
- **A review that never ran no longer looks like a clean one.** One dispatch in 13 came back as nothing but "You've hit your session limit" — 61 characters. The lens read no code, the turn went unchecked, and nothing said so. Such a dispatch is now recorded as `aborted` and surfaced as an explicit UNCHECKED warning at the end of the turn.
- The judgement is made on substrate (no verdict block AND too little work to have produced one), not on a list of platform error strings, and it is deliberately conservative: a short verdict backed by real work still counts as a verdict, because mislabelling one would hide a finding.

## [0.6.0] - 2026-09-09

### Added
- **Every dispatch now leaves a record** — one line per run with the model, duration, cost, what it verified and what it refuted, and how many items it escalated. Before this, 27 dispatches had produced zero telemetry: there was no way to say whether the lens was doing anything.

### Notes
- The recorder never blocks and never speaks; automatic firing remains turn-end's `quality-lens` duty. The plugin carries this one hook, so install it standalone.

## [0.5.1] - 2026-09-06

### Removed
- The Stop hook retired in 0.5.0 and its tests are deleted, and the docs no longer describe it as live. Contract tests over the shipped files replace them.

## [0.5.0] - 2026-07-27

### Changed
- **This plugin no longer carries a Stop hook.** Automatic firing comes from the `quality-lens` duty in the turn-end plugin. The agent, the rubric, the recipient profile and `/verifiability` are unchanged.
- Severity is now **advise** rather than block, because a fire count does not tell a pass that is still finding real defects from one repairing its own earlier remarks. Set `severity: "block"` in `.claude/turn-end.json` if you want it enforced.

### Fixed
- The old "fire exactly once" guard bounded consecutive blocks, not total fires — simulated over ten work turns it fired five times, unbounded — and it keyed on the text of a turn, so it never recognised the same request twice.

## [0.4.0] - 2026-07

### Added
- **Per-project profiles**: drop a tuned copy at `<project>/.claude/verifiability-lens/profile.yaml`, with an optional `focus:` list defining what "best achievable" means here. Ready-made presets ship for game projects, plugin repos and research/data work.

### Changed
- The profile is read once per dispatch instead of once per item (up to 90 re-reads were measured in a single session).
