---
description: Seed the knowledge base from THIS existing project — sweep docs, git history, and code; extract decisions, conventions, and findings into .claude/kb/extracted/ (owner confirms before anything is written).
---

Invoke the `kb-seed` skill for this project. Target hint from the owner (optional): $ARGUMENTS

Follow the skill exactly: inventory → distill → **confirm with the owner** → write dated,
sourced files with frontmatter → verify via `kb stat` + one probe query, and report both.
