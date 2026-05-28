# Release notes — plugin-toolkit

## 1.0.0 — Initial release

Plugin/skill development + maintenance toolkit. Four composable skills:

- **skill-heal** — audit a plugin's skill set against current best practices. Dispatches parallel review agents (one per skill), scores against rubric (Anthropic best practices + token efficiency + architecture coherence), produces per-skill scorecard + systemic-issue summary. Diagnostic only — never applies changes.
- **plugin-scaffold** — bootstrap a new mk-cc-resources plugin. Generates directory tree + plugin.json + SKILL.md skeletons + marketplace.json entry + mk-cc-all bundle update + README/CLAUDE.md additions + RELEASE-NOTES.md. Mechanical 9-step chain in one invocation.
- **version-bump** — cascade version updates across plugin.json + marketplace.json entry + mk-cc-all bundle (if affected) + marketplace metadata + RELEASE-NOTES.md. Validates semver consistency. Composable — @ship references this.
- **docs-audit** — cross-document drift audit. Compares CLAUDE.md + README + marketplace.json against disk state. Finds version mismatches, stale references, missing entries. Proposes targeted edits per file for user approval. Broader scope than session-lifecycle's /claude-md-sync (which covers CLAUDE.md only).

Designed for composability: skills invoke each other where appropriate, @ship references /version-bump + /docs-audit, /skill-heal hints at /docs-audit when description quality is weak.
