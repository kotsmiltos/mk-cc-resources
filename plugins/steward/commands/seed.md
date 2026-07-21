---
description: Build a .steward/ living model for THIS existing project — reads docs/code/history, drafts the model, asks you 3-7 quick questions, turns the ambient loop on. Run once per project.
---

Follow the steward skill's seed workflow (`plugins/steward/skills/steward/workflows/seed.md`):
dispatch the `steward` agent (job: seed) over the current project, ask the owner the returned
questions conversationally (minutes, skippable), send answers back for integration, show the final
briefing, and offer the `.steward/inbox/` gitignore line. Never overwrite an existing `.steward/`.
