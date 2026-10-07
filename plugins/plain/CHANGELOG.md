# Changelog

All notable changes to **plain** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-08

### Added
- **`/plain:map-the-logic`: logic first, by component, then tests, then code.** It is the method your twin-game words set on 7 Oct, carried to every project, as you asked on 8 Oct ("let's pull that, see what it is and how we can utilize it here, like the check my setup thing"). Claude uses it by itself whenever you ask for a feature, a change in how something behaves, or a "proper fix":
  - it pulls out your wants in your words and shows them back to you in plain words;
  - it writes the whole logic for itself before any test or code: controllers on top handing values down, one job per part, every part swappable with its numbers in one central place, and results like wheelies or corners left to come out of the parts instead of being coded;
  - it tests first from your words, then builds;
  - it never asks you to review the map;
  - each window ends with the next one's starting note.
  
  The map has a fixed form (`references/map-form.md`) with the same seven sections on every part. In twin-game, the map's layout is what held the rules; a written line alone did not.
- **Check 15, logic before code:** your personal instructions, which every project on the machine loads, carry your five 7 Oct messages word for word and then Claude's reading, which points at the how-to. It is added after your yes, right after your tests-first section. It is found even when quoted or wrapped over lines, and a section you edited yourself is never overwritten.

### Changed
- Check 9 (tests before code) and check 15 now share one piece of code (`lib/his-words-section.js`), so another rule of yours carried this way is a few lines, not a copy. Check 9 says and does exactly what it did before.

## [0.2.0] - 2026-10-02

### Added
- **"check my setup" now sets up the rest of a machine**, as you asked on 1 Oct ("i wanna be able to replicate this setup in my other machines"). Six new lines:
  - **Tests before code:** your personal instructions, which every project on the machine loads, carry your 10 Sep sentence and your 1 Oct "tests were bent to pass. This is unacceptable.", then Claude's reading of them. Added after your yes, inside your Rules part. It is found even when quoted or wrapped over lines.
  - **patterns and reuse-gate stay off** (your 1 Oct "feel free to turn them off"), for you and in the current project.
  - **The second-opinion reviewer is on for you**, and the line says how often it really runs, read from the turn-end you have installed: with turn-end 0.15.0 that is after each of your messages that changed something — what you said yes to on 1 Oct; an older turn-end checks once per sitting, and the line says that instead.
  - **The reviewer in this project:** a separate line, so you can say yes for the machine and no for a project. If the project's settings record that it was switched off on purpose, the change says so, and applying it adds a dated line to that record.
  - **Helper reports reach Claude without your hooks adding text:** a count from this project's sessions of the last week, naming the hooks that still do it. Nothing to type; with no reports yet it says so and never calls that fine.
  - **Windows Terminal** (Windows only): reads Windows' "Default terminal application" setting, so a window Windows hands to Windows Terminal counts. It names a program like herdr when Claude Code runs inside one. Exact steps are given; nothing is changed from here. It is not offered as the fix for pasted text arriving in pieces — that cause is still unknown.

### Fixed
- The verification-rules hook check now tests your hook with the message shapes it really receives (`<agent-message…` from a helper, `<cross-session-message…` from another session). The 24 Sep version tested the saved shape and said "fine" while the hook spoke on 133 of 133 helper reports. The fix writes the full shared list into your hook; on an older hook with no list, it inserts the list right after the line that reads your message. It is offered only when the edited copy passes.
- What the check shows you no longer contains file paths; only a step you would do by hand names its file, from your home folder or the project.
- A plugin installed for this project only is reported as that, not as "not installed".

## [0.1.0] - 2026-09-23

### Added
- **The plain reply style** (`output-styles/plain.md`): short answers in plain words; before long, costly or hard-to-undo work, the first sentence says how your words were read and what it will cost; one plain yes-or-correct question instead of menus; plain names instead of folder labels and symbols; show the thing instead of pointing to a file; "done" means what you will see in your own sessions. The text is the version measured on 2026-09-23 (below), unchanged. `force-for-plugin: true` makes it the active style wherever the plugin is enabled, over a local Concise setting.
- **`/plain:check-setup`**: checks whether the machine it runs on has the rest of your setup, fixes what it can after one yes (every changed file backed up first under `~/.claude/backups/plain-check-setup/`), and gives the exact step for the rest. Eight checks, one file each in `lib/checks/` (add one by adding a file): the style plugin on · plugins from this marketplace up to date, and whether this folder holds unpushed fixes · caveman off · no Co-Authored-By trailer on commits · no generalize-first hook · the verification-rules hook quiet on `++` and on sub-agent hand-backs · personal CLAUDE.md free of `++` and with Generalize-First limited to code · no memory still carrying the rejected "six classes" frame. Runs only when you ask; no hook.
- Why: replayed on six of your real messages and judged blind, 0 of 54 replies passed under the old setup and 29 of 54 under this style; after rewording two lines, 21 of 27 passed on the three messages that had failed (0 of 27 before).
