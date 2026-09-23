# Changelog

All notable changes to **plain** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-23

### Added
- **The plain reply style** (`output-styles/plain.md`): short answers in plain words; before long, costly or hard-to-undo work, the first sentence says how your words were read and what it will cost; one plain yes-or-correct question instead of menus; plain names instead of folder labels and symbols; show the thing instead of pointing to a file; "done" means what you will see in your own sessions. The text is the version measured on 2026-09-23 (below), unchanged. `force-for-plugin: true` makes it the active style wherever the plugin is enabled, over a local Concise setting.
- **`/plain:check-setup`**: checks whether the machine it runs on has the rest of your setup, fixes what it can after one yes (every changed file backed up first under `~/.claude/backups/plain-check-setup/`), and gives the exact step for the rest. Eight checks, one file each in `lib/checks/` (add one by adding a file): the style plugin on · plugins from this marketplace up to date, and whether this folder holds unpushed fixes · caveman off · no Co-Authored-By trailer on commits · no generalize-first hook · the verification-rules hook quiet on `++` and on sub-agent hand-backs · personal CLAUDE.md free of `++` and with Generalize-First limited to code · no memory still carrying the rejected "six classes" frame. Runs only when you ask; no hook.
- Why: replayed on six of your real messages and judged blind, 0 of 54 replies passed under the old setup and 29 of 54 under this style; after rewording two lines, 21 of 27 passed on the three messages that had failed (0 of 27 before).
