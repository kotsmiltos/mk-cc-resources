# Changelog

All notable changes to **reuse-gate** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-14

### Changed
- The reminder becomes a **four-rung ladder**, climbed cheapest-first: **0. can it be DELETED** -> 1. already implemented HERE -> **2. in the RUNTIME you already run** -> 3. a maintained PACKAGE. Writing anyway must name which rung was rejected and why.
- Rungs 0 and 2 come from comparing this gate against `ponytail`, the prior art the owner named (delete -> reuse -> stdlib -> platform feature -> write). The gap was not theoretical: measured in this repo the same day, **17 test files carry a hand-written `check()` counter while `node:test` ships in the Node we already run**, and CLI flags are parsed by hand where `util.parseArgs` exists. Neither is a "package/library", so the old rung 2 read straight past them. A runtime you are already running is the cheapest dependency there is.
- The reminder is now built as an ARRAY joined at load. This file has twice been mangled by shell-heredoc editing turning an escape into a raw control byte; an array of plain lines has no escapes to lose.

### Note
- This plugin is opt-in OFF and, measured 2026-09-14, **had never once fired** — no project config, no global config, for its entire life. That is the direct explanation for the hand-rolled code above. A guard that is built and left off is worse than no guard: it makes the repo look covered.

## [0.1.0] - initial release

### Added
- One reuse-first reminder per message, at the moment code is first written (`Write` / `Edit` / `MultiEdit` / `NotebookEdit`): is this already implemented here, or served by a library you already have?
- Source files only — Markdown, JSON, YAML and other non-source writes never trigger it.
- **Never blocks.** The reminder is injected as context and the write proceeds on its normal permission path.
- Off by default. Turn it on with `REUSE_GATE_ENABLED=1` or `.claude/reuse-gate.json`; a project decision overrides the global one. Fails open on any error.
- Needs Claude Code v2.1.196+ (it de-duplicates on `prompt_id`); on older versions it stays inert.

### Notes
- Install it standalone — it carries a hook, so it is not part of the `mk-cc-all` bundle.
