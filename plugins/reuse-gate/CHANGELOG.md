# Changelog

All notable changes to **reuse-gate** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - initial release

### Added
- One reuse-first reminder per message, at the moment code is first written (`Write` / `Edit` / `MultiEdit` / `NotebookEdit`): is this already implemented here, or served by a library you already have?
- Source files only — Markdown, JSON, YAML and other non-source writes never trigger it.
- **Never blocks.** The reminder is injected as context and the write proceeds on its normal permission path.
- Off by default. Turn it on with `REUSE_GATE_ENABLED=1` or `.claude/reuse-gate.json`; a project decision overrides the global one. Fails open on any error.
- Needs Claude Code v2.1.196+ (it de-duplicates on `prompt_id`); on older versions it stays inert.

### Notes
- Install it standalone — it carries a hook, so it is not part of the `mk-cc-all` bundle.
