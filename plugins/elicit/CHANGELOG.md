# Changelog

All notable changes to **elicit** are recorded here, newest first, in the terms that matter to
someone who installs it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-11

### Added
- `/elicit:elicit` — brainstorm a vision to completion: it questions the gaps you leave and guides you through the parts you do not fully understand yet.
- **Reads what is already settled first** (the project knowledge base and the `.steward/` model) and says what it found, so it never asks you something your project already decided.
- Keeps the open threads as a **visible queue** — core idea, who it serves, the thrust, invariants, non-goals, growth axes, constraints, risks, open decisions — and recurses on the deeper gap when an answer opens one, saying out loud what that queued.
- **Teaches before it asks** when a choice involves a process you have not worked with, sourced from your docs rather than from vibes.
- Sends genuine forks to a `prism` panel instead of answering them for you.
- Lands conclusions as a **steward inbox capture in your own words** — it never edits the model directly; the steward agent integrates it and shows you the diff.
- No preconditions: every dependency (kb, steward, prism, a `.steward/` model at all) degrades to one named line.

### Notes
- The gap-recursion engine comes from essense-flow's pipeline `/elicit`, retargeted at a project's direction instead of a build SPEC. The pipeline version is unchanged and still there for pipeline runs.
