      ---
      mode: amend
      slug: "version-bump-xml-migration"
      date: "2026-03-10T21:47:32.813408+00:00"
      description: "Bump versions for all skills after pure XML structure migration"
      snapshot_used: CLAUDE.md
      patterns_used: _code_audit/patterns.md
      patterns:
        - "P4"
      primary_files:
        - ".claude-plugin/marketplace.json"
        - ".claude-plugin/plugin.json"
      related_files_considered:
        - "plugins/project-note-tracker/skills/note/SKILL.md"
      updated_files:
        - ".claude-plugin/marketplace.json"
        - ".claude-plugin/plugin.json"
        - "plugins/project-note-tracker/skills/note/SKILL.md"
      not_updated_files:
        []
      integrity_check_done: true
      tests_updated:
        []
      docs_updated:
        []
      ---

      ## Pre-Change Cross-Cutting Analysis

      **Primary target:** .claude-plugin/marketplace.json, .claude-plugin/plugin.json

      **Pattern(s) involved:** P4 (Marketplace registration)

      **Canonical implementation:** .claude-plugin/marketplace.json

      **Related implementations found:**
      - .claude-plugin/plugin.json (root plugin metadata, mirrors mk-cc-all version)
      - plugins/project-note-tracker/skills/note/SKILL.md (help text contains version string)

      **Shared helpers/utilities impacted:**
      None

      ---

      ## Bump versions for all skills after pure XML structure migration

      Version bumps for all 6 skills that were migrated to pure XML structure. All skills with markdown headings inside XML bodies were converted to semantic XML sub-tags, missing required tags were added, and non-standard tags were removed or renamed. This is a structural quality improvement with no behavioral changes.

      ---

      ## Cross-Cutting Integrity Check

      - [x] Patterns reviewed: P4 (Marketplace registration)
      - [x] Files updated: .claude-plugin/marketplace.json, .claude-plugin/plugin.json, plugins/project-note-tracker/skills/note/SKILL.md
      - [x] Files NOT updated (with justification): N/A
      - [x] Tests updated: N/A
      - [x] Docs updated: N/A
      - [x] CLAUDE.md needs update: no
      - [x] patterns.md needs update: no
