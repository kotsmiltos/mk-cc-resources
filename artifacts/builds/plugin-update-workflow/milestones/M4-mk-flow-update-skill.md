# Milestone 4: mk-flow-update skill — rules + intents

> **Status:** Completed — 2026-03-19
> **Build plan:** ../BUILD-PLAN.md

## What Was Built

Created the unified `/mk-flow-update` skill that syncs all three context files (rules, intents, cross-references) using key-based merge. Replaced the old `/mk-flow-update-rules` with a redirect.

## Files Changed

- `plugins/mk-flow/skills/mk-flow-update/SKILL.md` — created unified update skill with 6-step process: find defaults, merge rules, merge intents, merge cross-references, show diff, apply with _meta update
- `plugins/mk-flow/skills/mk-flow-update-rules/SKILL.md` — replaced with deprecation notice pointing to /mk-flow-update

## Verification

- New SKILL.md covers all three file types with distinct merge strategies per file
- Rules: key-based merge, plugin defaults win for shared keys
- Intents: key-based merge, corrections list never touched
- Cross-references: source-tag-aware merge, only `source: "plugin-default"` entries updated
- Old skill redirects cleanly

## Next

Milestone 5: cross-references merge + full UX.
