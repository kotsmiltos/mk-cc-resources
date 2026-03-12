      ---
      mode: amend
      slug: "alert-volume-mute-note-bugs"
      date: "2026-03-12T23:49:27.021325+00:00"
      description: "Add volume/mute/config skill to alert-sounds plugin and bug tracking to project-note-tracker"
      snapshot_used: CLAUDE.md
      patterns_used: _code_audit/patterns.md
      patterns:
        - "P1"
        - "P2"
        - "P3"
        - "P4"
      primary_files:
        - "plugins/alert-sounds/hooks/alert.py"
        - "plugins/project-note-tracker/skills/note/scripts/tracker.py"
      related_files_considered:
        - "plugins/alert-sounds/hooks/config.json"
        - "plugins/alert-sounds/hooks/statusline.sh"
        - "plugins/project-note-tracker/skills/note/SKILL.md"
      updated_files:
        - ".claude-plugin/marketplace.json"
        - ".claude-plugin/plugin.json"
        - "plugins/alert-sounds/.claude-plugin/plugin.json"
        - "plugins/alert-sounds/hooks/alert.py"
        - "plugins/alert-sounds/hooks/config.json"
        - "plugins/alert-sounds/hooks/statusline.sh"
        - "plugins/alert-sounds/skills/alert-sounds/SKILL.md"
        - "plugins/project-note-tracker/skills/note/SKILL.md"
        - "plugins/project-note-tracker/skills/note/scripts/tracker.py"
        - "plugins/project-note-tracker/skills/note/workflows/bug.md"
        - "plugins/project-note-tracker/skills/note/workflows/bugs.md"
        - "plugins/project-note-tracker/skills/note/workflows/investigate.md"
        - "plugins/safe-commit/.claude-plugin/plugin.json"
        - "plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh"
      not_updated_files:
        []
      integrity_check_done: true
      tests_updated:
        []
      docs_updated:
        []
      ---

      ## Pre-Change Cross-Cutting Analysis

      **Primary target:** plugins/alert-sounds/hooks/alert.py, plugins/project-note-tracker/skills/note/scripts/tracker.py

      **Pattern(s) involved:** P1, P2, P3, P4

      **Canonical implementation:** alert-sounds follows hooks-only plugin layout (P1); project-note-tracker follows skill+script pattern (P1, P2, P3). New alert-sounds skill follows P2 (SKILL.md convention) and P5 (no alias file needed since it lives inside the plugin).

      **Related implementations found:**
      - All plugin.json files follow P1 layout — alert-sounds plugin.json updated with new description
      - SKILL.md convention (P2) — new alert-sounds SKILL.md and updated note SKILL.md both use YAML frontmatter + XML sections
      - Workflow routing (P3) — note SKILL.md routing table extended with bug/bugs/investigate entries, matching existing pattern
      - Marketplace registry (P4) — marketplace.json already had safe-commit entry staged from prior work

      **Shared helpers/utilities impacted:**
      - tracker.py is the shared Excel I/O layer for the note skill — extended with Bugs sheet support (new constants, helpers, commands) without changing existing Questions sheet behavior

      ---

      ## Add volume/mute/config skill to alert-sounds plugin and bug tracking to project-note-tracker

      **Alert Sounds plugin:** Added volume control (0-100 config field, threaded as 0.0-1.0 float through all playback functions on all platforms), mute/unmute toggle (suppresses audio only, visual alerts still fire), and a configuration skill (SKILL.md) that lets users modify config.json via natural language. Statusline updated to show [MUTED] indicator. Volume works with custom sounds on all platforms; built-in tones support volume on macOS (afplay -v) and Linux (paplay --volume) but not Windows/WSL Console::Beep (system volume only).

      **Project Note Tracker:** Added bug tracking as a second sheet ("Bugs") in tracker.xlsx. New tracker.py commands: add-bug, list-bugs, update-bug, resolve-bug. Bugs sheet auto-created on first bug (backward compatible — no init change needed). Dark red headers, color-coded severity (Critical/High/Medium/Low) and status (Open/Investigating/Reproduced/Fixed/Closed) with conditional formatting and dropdowns. Three new workflows: bug.md (log with auto-detected severity), bugs.md (list/extract grouped by severity), investigate.md (background codebase research for reproduction hints). cmd_doctor upgraded to also format the Bugs sheet.

      ---

      ## Cross-Cutting Integrity Check

      - [x] Patterns reviewed: P1 (plugin layout — both plugins follow convention), P2 (SKILL.md — new and updated skills use YAML+XML), P3 (workflow routing — note routing table extended consistently), P4 (marketplace — registry includes safe-commit from prior work)
      - [x] Files updated: .claude-plugin/marketplace.json, .claude-plugin/plugin.json, plugins/alert-sounds/.claude-plugin/plugin.json, plugins/alert-sounds/hooks/alert.py, plugins/alert-sounds/hooks/config.json, plugins/alert-sounds/hooks/statusline.sh, plugins/alert-sounds/skills/alert-sounds/SKILL.md, plugins/project-note-tracker/skills/note/SKILL.md, plugins/project-note-tracker/skills/note/scripts/tracker.py, plugins/project-note-tracker/skills/note/workflows/bug.md, plugins/project-note-tracker/skills/note/workflows/bugs.md, plugins/project-note-tracker/skills/note/workflows/investigate.md, plugins/safe-commit/.claude-plugin/plugin.json, plugins/safe-commit/skills/safe-commit/scripts/scan-secrets.sh
      - [x] Files NOT updated (with justification): N/A — all changed files are listed
      - [x] Tests updated: N/A — no test infrastructure in this repo
      - [x] Docs updated: N/A — README updates deferred; SKILL.md help text updated inline
      - [x] CLAUDE.md needs update: no — architecture section still accurate, alert-sounds and note-tracker already documented
      - [x] patterns.md needs update: no — no new patterns introduced, existing patterns followed
