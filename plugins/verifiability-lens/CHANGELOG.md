# Changelog

All notable changes to **verifiability-lens** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
