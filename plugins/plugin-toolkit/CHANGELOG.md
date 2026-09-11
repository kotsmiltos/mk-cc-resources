# Changelog

All notable changes to **plugin-toolkit** are recorded here, newest first, in the terms that
matter to someone who installs it. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2026-09-11

### Fixed
- **`test-all` could not read node's own test counts.** It looked for the `# pass 13` summary; node 22 and later print `ℹ pass 13`. Every node test file in this repo — 30 of 35 suites — counted as zero checks, so the reported total (1,325) was short of the real one (1,443) and, worse, could not move: adding 16 real tests changed it by 0, and removing them changed it by 0.
- The same blind spot hid skipped suites. With it fixed, one suite is exposed as **"ran but CHECKED NOTHING"** — it had been reporting as a pass for as long as the gate has existed.
- `registry-check`'s `doc-version` claim went blind when a catalog table moved from `**name**` to `[name](link)` rows. It now reads either form, finds the version in any cell, and sweeps `plugins/*/README.md` and `CHANGELOG.md` as well as the root docs.

### Added
- **`plugin-docs`, an 8th registry-check claim.** Every plugin must have a README, a CHANGELOG whose newest entry is the version it ships, and a marketplace description of at most 200 characters — that description is the text `/plugin` prints at install time, and five plugins had no README at all while three descriptions had grown past 3,500 characters.

## [1.13.0] - 2026-09-11

### Added
- **`note-uptake`** — the scorecard now measures whether surfaced notes were actually USED, by comparing each note's distinctive terms against the answer that followed. The old readings said 0% in every project because they asked whether a file had been opened, of notes whose body is injected directly; real uptake is 71–81%. Unknowns are reported beside the ratio, never folded into it, and the report says on every reading that term overlap is a proxy.
- **Vintage annotation** — a zero from a recorder that was not installed yet is no longer mistaken for a dead mechanism. It happened three times in one audit, each time arguing to delete something that works; the run now names the install date.
- **`vendored-entrypoint`** — a registry check that resolves every vendored dependency's declared entry point against disk. It catches the defect that left essense-flow's CLI dead in every installed copy, silently.

### Changed
- The one-line `[instr]` summary leads with the uptake number instead of a byte count.

## [1.12.0] - 2026-09-09

### Added
- **`harness-stats`** — one run over every trace, ledger and transcript a project left behind, printed in the session: hook bytes per prompt, hints followed, nudges and blocks, judge cost and agreement, tail size, acted-on ratios, checks per sitting, hook spawns per prompt, and running-vs-installed drift. 13 metric sources, each a drop-in file. It reproduces the hand-run audit it was built from to the digit, and prints drift against those baselines.
- A shared **trace schema** every plugin here writes through, with a drift suite that validates each one's own examples — so a dropped field turns a test red instead of quietly changing the data.

## [1.11.0] - 2026-09-06

### Added
- **`repo-guard` detector: machine-guard drift.** The lists that stop hooks reacting to machine-generated text had grown into four different versions across the plugins, and none of them knew about `<system-reminder>`. The guard now blocks a push when the copies differ.

## [1.10.1] - 2026-08-27

### Fixed
- **Run `repo-guard` from the repository root.** From the toolkit's own directory it scans only the toolkit — 8 pre-existing findings elsewhere had been invisible since 08-23. The documentation now names the root-scoped invocation, and the allowlist covers the sanctioned Windows-path examples the first full run surfaced.

### Notes
- Two gate records in that sitting read a pipe's exit code instead of the guard's. Read the exit code directly, never after a pipe.
