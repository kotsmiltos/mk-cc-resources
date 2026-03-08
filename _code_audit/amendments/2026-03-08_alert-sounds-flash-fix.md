      ---
      mode: amend
      slug: "alert-sounds-flash-fix"
      date: "2026-03-08T23:08:42.544505+00:00"
      description: "Add taskbar flash implementation (FlashWindowEx via ctypes), hooks manifest field for marketplace install, and flash config option"
      snapshot_used: CLAUDE.md
      patterns_used: _code_audit/patterns.md
      patterns:
        - "P1"
      primary_files:
        - "plugins/alert-sounds/hooks/alert.py"
      related_files_considered:
        - "plugins/alert-sounds/.claude-plugin/plugin.json"
        - "plugins/alert-sounds/hooks/config.json"
      updated_files:
        - "plugins/alert-sounds/hooks/alert.py"
        - "plugins/alert-sounds/.claude-plugin/plugin.json"
        - "plugins/alert-sounds/hooks/config.json"
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

      **Pattern(s) involved:** P1 (plugin directory layout)

      **Canonical implementation:** plugins/alert-sounds/.claude-plugin/plugin.json — plugin manifest for hooks-based plugin

      **Related implementations found:**
      - plugins/schema-scout/.claude-plugin/plugin.json — skills-based plugin (no hooks field needed)
      - plugins/miltiaze/.claude-plugin/plugin.json — skills-based plugin
      - plugins/ladder-build/.claude-plugin/plugin.json — skills-based plugin
      - plugins/repo-audit/.claude-plugin/plugin.json — skills-based plugin
      - No other hooks-based plugins exist in the repo; alert-sounds is the only one.

      **Shared helpers/utilities impacted:**
      None — alert-sounds is self-contained with no shared code dependencies.

      ---

      ## Add taskbar flash implementation (FlashWindowEx via ctypes), hooks manifest field for marketplace install, and flash config option

      Three changes:

      1. **plugin.json** — Added `"hooks": "./hooks/hooks.json"` field. Without this, the marketplace install failed with "Plugin not found" because Claude Code couldn't discover the plugin's hooks.

      2. **alert.py** — Implemented `flash_taskbar()` which was documented in the docstring but never coded. Windows implementation uses ctypes to call FlashWindowEx, walking the process tree via NtQueryInformationProcess to find WindowsTerminal.exe's window handle (falls back to GetConsoleWindow for cmd/conhost). macOS implementation bounces the dock icon via osascript. Added `"flash"` to config defaults (default: true).

      3. **config.json** — Added `"flash": true` to all three event configs (stop, permission, idle).

      ---

      ## Cross-Cutting Integrity Check

      - [x] Patterns reviewed: P1 — checked all other plugin.json files; none need a hooks field since they are skills-based, not hooks-based
      - [x] Files updated: plugins/alert-sounds/hooks/alert.py, plugins/alert-sounds/.claude-plugin/plugin.json, plugins/alert-sounds/hooks/config.json
      - [x] Files NOT updated (with justification): No other plugins affected — alert-sounds is the only hooks-based plugin
      - [x] Tests updated: N/A — no test infrastructure for this plugin
      - [x] Docs updated: N/A — docstring in alert.py updated inline
      - [x] CLAUDE.md needs update: no
      - [x] patterns.md needs update: no
