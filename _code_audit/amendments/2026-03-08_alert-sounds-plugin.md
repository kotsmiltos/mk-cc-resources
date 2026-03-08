      ---
      mode: amend
      slug: "alert-sounds-plugin"
      date: "2026-03-08T22:22:57.278315+00:00"
      description: "Add alert-sounds hooks-only plugin with cross-platform sound, notification, and status line alerts for Claude Code events"
      snapshot_used: CLAUDE.md
      patterns_used: _code_audit/patterns.md
      patterns:
        - P1
        - P4
      primary_files:
        - "plugins/alert-sounds/hooks/alert.py"
      related_files_considered:
        - "plugins/schema-scout/.claude-plugin/plugin.json"
        - "plugins/miltiaze/.claude-plugin/plugin.json"
        - "plugins/ladder-build/.claude-plugin/plugin.json"
        - "plugins/repo-audit/.claude-plugin/plugin.json"
      updated_files:
        - ".claude-plugin/marketplace.json"
        - "plugins/alert-sounds/.claude-plugin/plugin.json"
        - "plugins/alert-sounds/hooks/alert.py"
        - "plugins/alert-sounds/hooks/config.json"
        - "plugins/alert-sounds/hooks/hooks.json"
        - "plugins/alert-sounds/hooks/notify_windows.ps1"
        - "plugins/alert-sounds/hooks/statusline.sh"
      not_updated_files:
        []
      integrity_check_done: true
      tests_updated:
        []
      docs_updated:
        []
      ---

      ## Pre-Change Cross-Cutting Analysis

      **Primary target:** plugins/alert-sounds/hooks/alert.py

      **Pattern(s) involved:** P1 (plugin directory layout), P4 (marketplace registration)

      **Canonical implementation:** Follows P1 with `.claude-plugin/plugin.json` and hooks directory. Registered in marketplace.json per P4.

      **Related implementations found:**
      - All existing plugins follow P1 (schema-scout, miltiaze, ladder-build, repo-audit). This plugin differs by having hooks instead of skills, but the directory layout convention is the same.

      **Shared helpers/utilities impacted:**
      None — this is a standalone hooks-only plugin with no shared code dependencies.

      ---

      ## Add alert-sounds hooks-only plugin with cross-platform sound, notification, and status line alerts for Claude Code events

      New plugin that hooks into Stop, Notification (permission_prompt, idle_prompt), and UserPromptSubmit events. Provides cross-platform audio alerts (built-in tones or custom sound files), desktop notifications (Windows balloon via PowerShell, macOS osascript, Linux notify-send), and a status line state file bridge for colored indicators. All features are independently toggleable per event via config.json.

      ---

      ## Cross-Cutting Integrity Check

      - [x] Patterns reviewed: P1, P4
      - [x] Files updated: .claude-plugin/marketplace.json, plugins/alert-sounds/.claude-plugin/plugin.json, plugins/alert-sounds/hooks/alert.py, plugins/alert-sounds/hooks/config.json, plugins/alert-sounds/hooks/hooks.json, plugins/alert-sounds/hooks/notify_windows.ps1, plugins/alert-sounds/hooks/statusline.sh
      - [x] Files NOT updated (with justification): N/A — new plugin, no existing files affected
      - [x] Tests updated: N/A — hooks-only plugin, no testable code beyond manual verification
      - [x] Docs updated: N/A
      - [x] CLAUDE.md needs update: yes
      - [x] patterns.md needs update: no
