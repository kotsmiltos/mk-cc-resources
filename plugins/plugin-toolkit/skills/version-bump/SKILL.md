---
name: version-bump
description: Cascade a version bump across plugin.json + marketplace.json plugin entry + mk-cc-all bundle (if affected) + marketplace.json metadata + CHANGELOG.md entry. Accepts patch/minor/major bump type. Validates semver consistency across all touch points. Use when shipping changes to any plugin. Composable — @ship references this; /plugin-scaffold creates v1.0.0 directly (doesn't call this).
disable-model-invocation: true
argument-hint: "<plugin-name> <patch|minor|major> [release notes text]"
---

<objective>
Bump a plugin's version consistently across all 4 touch points (plugin.json, marketplace.json entry, mk-cc-all bundle, marketplace metadata) + add a CHANGELOG entry. No drift between docs and reality.
</objective>

## Current state

```!
ROOT="${CLAUDE_PROJECT_DIR}"; [ -d "$ROOT/plugins" ] || ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"; grep -E '"name"|"version"' "$ROOT/.claude-plugin/marketplace.json"
```

<instructions>

## 1. Parse arguments

`$ARGUMENTS` format: `<plugin-name> <patch|minor|major> [release notes text...]`

If args missing, ask via `AskUserQuestion`:
1. Which plugin? (offer list of plugins on disk)
2. Bump type? (patch / minor / major)
3. Release notes text? (one paragraph; optional, can fill later)

Validate:
- Plugin exists at `plugins/<plugin-name>/.claude-plugin/plugin.json`
- Bump type ∈ {patch, minor, major}

## 2. Read current version

From `plugins/<plugin-name>/.claude-plugin/plugin.json` field `version`. Parse as semver `MAJOR.MINOR.PATCH`.

Compute new version:
- patch: MAJOR.MINOR.(PATCH+1)
- minor: MAJOR.(MINOR+1).0
- major: (MAJOR+1).0.0

Report old → new before applying.

## 3. Update plugin.json

Edit `plugins/<plugin-name>/.claude-plugin/plugin.json`:
- `version`: new version

## 4. Update marketplace.json plugin entry

Edit `.claude-plugin/marketplace.json`:
- Find the entry with matching `name`
- Update its `version` field to new version

## 5. Check if plugin is in mk-cc-all bundle

Read `.claude-plugin/plugin.json` (root). If `skills` array contains `./plugins/<plugin-name>/skills/`, the plugin is bundled.

If bundled AND bump type is minor or major, the bundle version lives in TWO files — each is its own write, verified separately (the observed failure this guards: the root file gets bumped, the marketplace entry silently lags behind; it drifted 2 versions before this became explicit):
1. `.claude-plugin/plugin.json` (root) `version` — bump minor (e.g. 2.2.0 → 2.3.0).
2. `.claude-plugin/marketplace.json` → the `mk-cc-all` entry's `version` — set to the SAME value as write 1.

If bundled AND bump type is patch: no bundle bump (patches don't cascade).

If not bundled: skip the bump — but still run the equality check in step 8; the two bundle-version fields must be equal whether or not this ship touched them.

## 6. Bump marketplace.json metadata

Edit `.claude-plugin/marketplace.json`:
- `metadata.version`: bump matching the dominant change (use minor if any plugin had minor/major; else patch)

## 7. Add CHANGELOG entry

Path: `plugins/<plugin-name>/CHANGELOG.md` (Keep a Changelog format — the file a person who
INSTALLS the plugin reads; engineering detail belongs in the commit and in
`design/notes/<plugin>-history.md`).

Prepend a new section (after the intro paragraph, before existing entries):

```markdown
## [<new-version>] - <YYYY-MM-DD>

### Added | Changed | Fixed | Removed | Deprecated | Security
- <what a user of this plugin now sees, does, or no longer suffers — not what the code does>
```

Rules that make the difference between a changelog and a commit log:
- Group under the standard headings; drop the ones with nothing in them.
- Lead with the user-visible effect, then the measurement or reason if there is one.
- Name the version's date; an unreleased entry may use `## [Unreleased]`.
- No internal ids, task numbers, or file-level narration.

If CHANGELOG.md doesn't exist, create it with the standard header:
`# Changelog` + the Keep a Changelog / SemVer sentence, then the entry.

## 8. Verify all touch points

Run grep-style checks:
- `plugins/<plugin-name>/.claude-plugin/plugin.json` version matches new version
- `marketplace.json` entry for plugin matches new version
- If bundled: mk-cc-all bundle version updated
- ALWAYS (bundled or not): root `.claude-plugin/plugin.json` version == marketplace.json `mk-cc-all` entry version — if unequal, a prior ship dropped one write; fix now, don't carry the drift
- marketplace.json metadata.version updated
- CHANGELOG.md has a new entry at top, under a standard heading

Report each check with file path + observed version.

## 9. Report

```
Version bump: <plugin-name> <old> → <new> (<type>)

Updated:
- plugins/<plugin-name>/.claude-plugin/plugin.json
- .claude-plugin/marketplace.json (entry)
- .claude-plugin/marketplace.json (metadata: <old> → <new>)
- mk-cc-all bundle: <bumped to X.Y.Z | unchanged | not bundled>
- plugins/<plugin-name>/CHANGELOG.md (new entry at top)

Next: commit + push (or invoke @ship to verify all pre-push checks).
```

## Composition

- Called by @ship (thorough-mode modifier) when user is preparing to push and version bump is appropriate
- Called by /plugin-scaffold? No — scaffold creates v1.0.0 directly
- Followed by /docs-audit if cross-doc drift suspected

## Constraints

- DO NOT commit or push. Just modifies files; user decides when to commit.
- DO NOT bump major version without explicit user confirmation (breaking-change implication).
- DO NOT proceed if any touch point fails to update — abort and report which step failed.

</instructions>
