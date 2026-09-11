# Changelog

All notable changes to **essense-autopilot** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-09-11

### Changed
- The `no .pipeline/ directory` halt is now **silent**. It fired 305 times over 196 sessions in repos that have no pipeline and never will, drowning the halts that actually mean something. Every other halt reason — disabled, missing `state.yaml`, a real blocker, a human gate, a terminal phase, no flow mapping, no progress, an agent still running, a missing QA report — still says so on stderr.

## [0.4.2] - 2026-09-11

### Fixed
- The vendored copy of js-yaml was missing the file its own package manifest points ESM imports at. Nothing was failing yet, but the first `import` anywhere in the tree would have — the way it already had in essense-flow. Now shipped whole, and guarded by a registry check that resolves every vendored entry point against disk.

## [0.4.1] - 2026-09-06

### Changed
- A repo with no pipeline now pays node startup and nothing else per turn (measured 236–346 ms → ~100 ms): the YAML library loads only after a pipeline is found, and the hook runs node directly instead of through a shell wrapper.

### Fixed
- Inside a real pipeline project, a missing YAML library is reported instead of exiting quietly.

## [0.4.0] - 2026-08

### Fixed
- **The autopilot was silently doing nothing on every current pipeline.** It looked for the old nested state shape and halted with "no pipeline block" on every fire; it also watched a blocker field the live schema had replaced. Both shapes are now accepted, and both blocker fields.

### Changed
- Human gates and terminal phases are read from essense-flow's own state machine when it is installed alongside, so the two can no longer disagree. Built-in defaults remain as a fallback, and your project config still overrides both.
