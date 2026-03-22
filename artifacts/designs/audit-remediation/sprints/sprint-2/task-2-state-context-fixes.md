# Task 2: State, Context, and Version Fixes

> **Sprint:** 2
> **Status:** planned
> **Depends on:** None
> **Estimated size:** S
> **Plan:** `../../PLAN.md`

## Goal

Fix stale state, missing metadata, incorrect vocabulary, version mismatches, and cross-reference rule gaps. Addresses AC-3, AC-8, PC-3, PC-4, PC-9, PC-10, IQ-3, FP-6, and GA-2.

## Pseudocode

```
FIX 1 — Add _meta to context/rules.yaml (AC-3):
  At the top of context/rules.yaml, before the "rules:" key, add:
  _meta:
    defaults_version: "0.6.0"
  Use "0.6.0" per Decision 2 in PLAN.md (avoids misleading stale nudge)

FIX 2 — Fix STATE.md architect version (AC-8, PC-3):
  In context/STATE.md "Context for Future Me" section, change:
  "architect 0.1.0" → "architect 0.2.0"

FIX 3 — Align note version (IQ-3, PC-4, Decision 4):
  In plugins/project-note-tracker/.claude-plugin/plugin.json:
  Change "version": "1.6.0" → "version": "1.7.0"
  Per Decision 4: SKILL.md help text reflects shipped features

FIX 4 — Fix vocabulary alias definition (PC-9):
  In context/vocabulary.yaml, find the "alias" entry
  Change its "means" field from "A text file in skills/ that points to the real skill directory"
  To: "A full copy of a plugin's skill directory, placed in skills/ so mk-cc-all can serve it directly"

FIX 5 — Add exception to skill-aliases rule (PC-10):
  In context/cross-references.yaml, find the "skill-aliases" rule
  Add a note field:
  note: "Excludes hook-bearing plugins (mk-flow, alert-sounds) — installed separately, not in skills/"

FIX 6 — Add defaults_version documentation comment (FP-6):
  In plugins/mk-flow/defaults/rules.yaml, add a comment above _meta:
  "# defaults_version advances only when defaults CONTENT changes, not on every plugin version bump."

FIX 7 — Create architect RELEASE-NOTES.md (GA-2):
  Create plugins/architect/RELEASE-NOTES.md with v0.1.0 and v0.2.0 entries
  Copy to skills/architect/RELEASE-NOTES.md (mirror sync)

FIX 8 — Version bumps for Sprint 1 changed plugins:
  Bump these plugin.json versions (files were changed in Sprint 1 + QA):
  - plugins/mk-flow/.claude-plugin/plugin.json: 0.6.0 → 0.7.0
  - plugins/alert-sounds/.claude-plugin/plugin.json: 1.0.0 → 1.1.0
  - plugins/schema-scout/.claude-plugin/plugin.json: 1.1.0 → 1.2.0
  - plugins/repo-audit/.claude-plugin/plugin.json: 1.1.0 → 1.2.0
  - plugins/safe-commit/.claude-plugin/plugin.json: no change (Sprint 1 didn't touch safe-commit)
  Update .claude-plugin/marketplace.json versions to match
  Bump .claude-plugin/plugin.json (mk-cc-all) version: 1.14.0 → 1.15.0

FIX 9 — Sync marketplace.json descriptions (AC-7):
  Copy descriptions from individual plugin.json files to marketplace.json for:
  alert-sounds, miltiaze, mk-flow, repo-audit
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `context/rules.yaml` | MODIFY | Add `_meta: { defaults_version: "0.6.0" }` |
| `context/STATE.md` | MODIFY | architect 0.1.0 → 0.2.0 |
| `context/vocabulary.yaml` | MODIFY | Fix alias definition |
| `context/cross-references.yaml` | MODIFY | Add note to skill-aliases rule |
| `plugins/project-note-tracker/.claude-plugin/plugin.json` | MODIFY | version 1.6.0 → 1.7.0 |
| `plugins/mk-flow/.claude-plugin/plugin.json` | MODIFY | version 0.6.0 → 0.7.0 |
| `plugins/alert-sounds/.claude-plugin/plugin.json` | MODIFY | version 1.0.0 → 1.1.0 |
| `plugins/schema-scout/.claude-plugin/plugin.json` | MODIFY | version 1.1.0 → 1.2.0 |
| `plugins/repo-audit/.claude-plugin/plugin.json` | MODIFY | version 1.1.0 → 1.2.0 |
| `plugins/mk-flow/defaults/rules.yaml` | MODIFY | Add documentation comment for defaults_version |
| `.claude-plugin/marketplace.json` | MODIFY | Update versions + sync 4 descriptions |
| `.claude-plugin/plugin.json` | MODIFY | mk-cc-all version 1.14.0 → 1.15.0 |
| `plugins/architect/RELEASE-NOTES.md` | CREATE | Retroactive v0.1.0 + v0.2.0 entries |
| `skills/architect/RELEASE-NOTES.md` | CREATE | Mirror copy |

## Acceptance Criteria

- [ ] `context/rules.yaml` has `_meta: { defaults_version: "0.6.0" }` at top
- [ ] `context/STATE.md` says `architect 0.2.0` (not 0.1.0)
- [ ] `plugins/project-note-tracker/.claude-plugin/plugin.json` version is `1.7.0`
- [ ] `context/vocabulary.yaml` alias definition says "full copy" not "text file"
- [ ] `context/cross-references.yaml` skill-aliases rule has exception note for hook-bearing plugins
- [ ] `plugins/mk-flow/defaults/rules.yaml` has documentation comment above `_meta`
- [ ] `plugins/architect/RELEASE-NOTES.md` exists with v0.1.0 and v0.2.0 entries
- [ ] `skills/architect/RELEASE-NOTES.md` is an identical copy
- [ ] All 4 changed plugin.json files have bumped versions
- [ ] `.claude-plugin/marketplace.json` versions match individual plugin.json files
- [ ] `.claude-plugin/marketplace.json` descriptions match for alert-sounds, miltiaze, mk-flow, repo-audit

## Edge Cases

- The `_meta` block in rules.yaml must be valid YAML. Place it before the `rules:` key with a blank line separator.
- When bumping marketplace.json versions, also update the mk-cc-all version entry.
- Architect RELEASE-NOTES.md: check other plugins' RELEASE-NOTES.md for format conventions.
